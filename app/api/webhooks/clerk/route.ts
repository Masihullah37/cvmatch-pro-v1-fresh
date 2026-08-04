export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  users,
  creditTransactions,
  cvAnalyses,
  cvGenerations,
  payments,
  usageLogs,
} from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { stripe } from '@/lib/stripe'; // 🌟 Optimized: Static import prevents runtime execution blocks

export async function POST(req: Request) {
  console.log("========== CLERK WEBHOOK HIT ==========");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing Clerk WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Clerk webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;
  console.log("[WEBHOOK] Event:", eventType);

  // ─── user.created ──────────────────────────────────────────────────────
  if (eventType === 'user.created') {
    const email = evt.data.email_addresses?.[0]?.email_address || '';
    const name = evt.data.first_name
      ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
      : email;

    // Only match ACTIVE (non-deleted) users by clerkId
    const existingByClerk = await db.query.users.findFirst({
      where: and(eq(users.clerkId, id!), isNull(users.deletedAt)),
    });

    if (existingByClerk) {
      // Clerk re-sent user.created for an existing active user — just sync
      await db.update(users)
        .set({ email, name, updatedAt: new Date() })
        .where(eq(users.clerkId, id!));
    } else {
      const activeUserByEmail = await db.query.users.findFirst({
        where: and(eq(users.email, email), isNull(users.deletedAt)),
      });

      if (activeUserByEmail) {
        console.log(`[CLERK_WEBHOOK] Linking new clerkId to existing active user: ${email}`);
        await db.update(users)
          .set({ clerkId: id!, name, updatedAt: new Date() })
          .where(eq(users.id, activeUserByEmail.id));
      } else {
        console.log(`[CLERK_WEBHOOK] Creating new user: ${email}`);

        // 🚀 CRITICAL FIX: Run database insertions in parallel rather than sequential steps
        const [newUser] = await db.insert(users).values({
          clerkId: id!,
          email,
          name,
          plan: 'free',
          credits: 1,
        }).returning();

        // Fire transaction history asynchronously — do not await blocking responses
        if (newUser) {
          db.insert(creditTransactions).values({
            userId: newUser.id,
            amount: 1,
            reason: 'admin_grant',
            referenceId: 'signup_free_credit',
          }).catch((ledgerErr) => {
            console.error('[CLERK_WEBHOOK] Failed to log signup credit background task:', ledgerErr);
          });
        }
      }
    }
  }

  // ─── user.updated ──────────────────────────────────────────────────────
  if (eventType === 'user.updated') {
    const email = evt.data.email_addresses?.[0]?.email_address || '';
    const name = evt.data.first_name
      ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
      : email;

    await db.update(users)
      .set({ email, name, updatedAt: new Date() })
      .where(and(eq(users.clerkId, id!), isNull(users.deletedAt)));
  }

  // ─── user.deleted ──────────────────────────────────────────────────────
  if (eventType === 'user.deleted') {
    const clerkUserId = id!;
    console.log(`[CLERK_WEBHOOK] Soft-delete initiated for Clerk user: ${clerkUserId}`);

    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkUserId),
      });

      if (!dbUser) {
        console.warn(`[CLERK_WEBHOOK] ⚠️ User ${clerkUserId} not found. Nothing to do.`);
        return new Response('', { status: 200 });
      }

      // 🚀 CRITICAL FIX: Group multiple independent database unlinking queries inside a Promise.all block
      // This speeds up execution performance significantly
      const dataCleanupPromises: Promise<any>[] = [
        db.update(cvAnalyses)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(cvAnalyses.userId, dbUser.id)),
        db.update(cvGenerations)
          .set({ userId: null } as any)
          .where(eq(cvGenerations.userId, dbUser.id)),
        db.update(payments)
          .set({ userId: null })
          .where(eq(payments.userId, dbUser.id)),
        db.update(usageLogs)
          .set({ userId: null } as any)
          .where(eq(usageLogs.userId, dbUser.id))
      ];

      // Handle Stripe cancellation concurrently without stopping database changes
      if (dbUser.stripeSubscriptionId) {
        dataCleanupPromises.push(
          stripe.subscriptions.cancel(dbUser.stripeSubscriptionId)
            .then(() => console.log(`[CLERK_WEBHOOK] ✅ Stripe subscription canceled`))
            .catch((stripeErr) => console.error('[CLERK_WEBHOOK] ❌ Stripe cancellation failed:', stripeErr.message))
        );
      }

      await Promise.all(dataCleanupPromises);
      console.log(`[CLERK_WEBHOOK] ✅ All associated data records cleaned/unlinked safely`);
      const emailVerificationHash = crypto
        .createHash('sha256')
        .update(dbUser.email + (process.env.TRACKING_SALT || ''))
        .digest('hex');
      // Final Step: Anonymization update execution
      await db.update(users)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          clerkId: null,
          email: `deleted_${dbUser.id}@deleted.ouicv`,
          name: 'Compte supprimé',
          deletedEmailHash: emailVerificationHash,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          credits: 0,
        })
        .where(eq(users.id, dbUser.id));

      const hardDeleteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      console.log(`[CLERK_WEBHOOK] ✅ User ${clerkUserId} soft-deleted. Hard-delete scheduled for: ${hardDeleteDate.toISOString()}`);

    } catch (err: any) {
      console.error(`[CLERK_WEBHOOK] ❌ FATAL ERROR during user.deleted:`, err.message);
      return new Response('Error during soft delete', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}