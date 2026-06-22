// // export const dynamic = 'force-dynamic';
// // export const runtime = 'nodejs';

// // import { Webhook } from 'svix';
// // import { headers } from 'next/headers';
// // import { WebhookEvent } from '@clerk/nextjs/server';
// // import { db } from '@/lib/db';
// // import { users } from '@/lib/db/schema';
// // import { eq } from 'drizzle-orm';

// // export async function POST(req: Request) {
// //   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

// //   if (!WEBHOOK_SECRET) {
// //     throw new Error('Missing Clerk WEBHOOK_SECRET');
// //   }

// //   const headerPayload = await headers();

// //   const svix_id = headerPayload.get('svix-id');
// //   const svix_timestamp = headerPayload.get('svix-timestamp');
// //   const svix_signature = headerPayload.get('svix-signature');

// //   if (!svix_id || !svix_timestamp || !svix_signature) {
// //     return new Response('Missing svix headers', { status: 400 });
// //   }

// //   const payload = await req.json();
// //   const body = JSON.stringify(payload);

// //   const wh = new Webhook(WEBHOOK_SECRET);

// //   let evt: WebhookEvent;

// //   try {
// //     evt = wh.verify(body, {
// //       'svix-id': svix_id,
// //       'svix-timestamp': svix_timestamp,
// //       'svix-signature': svix_signature,
// //     }) as WebhookEvent;
// //   } catch (err) {
// //     console.error('❌ Clerk webhook verification failed:', err);
// //     return new Response('Invalid signature', { status: 400 });
// //   }

// //   const { id } = evt.data;
// //   const eventType = evt.type;

// //   if (eventType === 'user.created') {
// //     const email = evt.data.email_addresses?.[0]?.email_address || '';
// //     const name =
// //       evt.data.first_name
// //         ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
// //         : email;

// //     // Find user by clerkId first
// //     const existingByClerk = await db.query.users.findFirst({
// //       where: eq(users.clerkId, id!)
// //     });

// //     if (existingByClerk) {
// //       await db.update(users).set({
// //         email,
// //         name,
// //         updatedAt: new Date(),
// //       }).where(eq(users.clerkId, id!));
// //     } else {
// //       // Check if email already exists (maybe from a different clerkId or manual sync)
// //       const existingByEmail = await db.query.users.findFirst({
// //         where: eq(users.email, email)
// //       });

// //       if (existingByEmail) {
// //         // Link the existing email to this new clerkId
// //         await db.update(users).set({
// //           clerkId: id!,
// //           name,
// //           updatedAt: new Date(),
// //         }).where(eq(users.email, email));
// //       } else {
// //         // New user
// //         await db.insert(users).values({
// //           clerkId: id!,
// //           email,
// //           name,
// //           plan: 'free',
// //         });
// //       }
// //     }
// //   }

// //   if (eventType === 'user.updated') {
// //     const email = evt.data.email_addresses?.[0]?.email_address || '';
// //     const name =
// //       evt.data.first_name
// //         ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
// //         : email;

// //     await db.update(users)
// //       .set({
// //         email,
// //         name,
// //         updatedAt: new Date(),
// //       })
// //       .where(eq(users.clerkId, id!));
// //   }

// //   if (eventType === 'user.deleted') {
// //     const userId = id!;
// //     console.log(`[CLERK_WEBHOOK] Attempting deletion for user: ${userId}`);

// //     try {
// //       const dbUser = await db.query.users.findFirst({
// //         where: eq(users.clerkId, userId)
// //       });

// //       if (dbUser) {
// //         console.log(`[CLERK_WEBHOOK] Found user in DB: ${dbUser.email} (UUID: ${dbUser.id})`);

// //         // 1. Cancel Stripe Subscription if active
// //         if (dbUser.stripeSubscriptionId) {
// //           try {
// //             const { stripe } = await import('@/lib/stripe');
// //             await stripe.subscriptions.cancel(dbUser.stripeSubscriptionId);
// //             console.log(`[CLERK_WEBHOOK] ✅ Stripe subscription canceled: ${dbUser.stripeSubscriptionId}`);
// //           } catch (stripeErr: any) {
// //             console.error('[CLERK_WEBHOOK] ❌ Failed to cancel Stripe subscription:', stripeErr.message);
// //             // We continue anyway to ensure the DB row is deleted (GDPR)
// //           }
// //         }

// //         // 2. Delete user row (cascades to analyses, templates, generations)
// //         const deleteResult = await db.delete(users).where(eq(users.clerkId, userId));
// //         console.log(`[CLERK_WEBHOOK] ✅ User ${userId} deleted from Neon. GDPR Cleanup complete.`);
// //       } else {
// //         console.warn(`[CLERK_WEBHOOK] ⚠️ User ${userId} not found in database. Nothing to delete.`);
// //       }
// //     } catch (err: any) {
// //       console.error(`[CLERK_WEBHOOK] ❌ FATAL ERROR during user.deleted:`, err.message);
// //       return new Response('Error deleting user', { status: 500 });
// //     }
// //   }

// //   return new Response('', { status: 200 });
// // }




// export const dynamic = 'force-dynamic';
// export const runtime = 'nodejs';

// import { Webhook } from 'svix';
// import { headers } from 'next/headers';
// import { WebhookEvent } from '@clerk/nextjs/server';
// import { db } from '@/lib/db';
// import { users, creditTransactions, cvAnalyses, cvGenerations, payments, usageLogs, userTemplateUnlocks } from '@/lib/db/schema'; // Import all relevant schemas
// import { eq, and, isNull } from 'drizzle-orm';

// export async function POST(req: Request) {
//   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

//   if (!WEBHOOK_SECRET) {
//     throw new Error('Missing Clerk WEBHOOK_SECRET');
//   }

//   const headerPayload = await headers();

//   const svix_id = headerPayload.get('svix-id');
//   const svix_timestamp = headerPayload.get('svix-timestamp');
//   const svix_signature = headerPayload.get('svix-signature');

//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return new Response('Missing svix headers', { status: 400 });
//   }

//   const payload = await req.json();
//   const body = JSON.stringify(payload);

//   const wh = new Webhook(WEBHOOK_SECRET);

//   let evt: WebhookEvent;

//   try {
//     evt = wh.verify(body, {
//       'svix-id': svix_id,
//       'svix-timestamp': svix_timestamp,
//       'svix-signature': svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error('❌ Clerk webhook verification failed:', err);
//     return new Response('Invalid signature', { status: 400 });
//   }

//   const { id } = evt.data;
//   const eventType = evt.type;

//   if (eventType === 'user.created') {
//     const email = evt.data.email_addresses?.[0]?.email_address || '';
//     const name =
//       evt.data.first_name
//         ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
//         : email;

//     // Find user by clerkId first, ensuring they are not soft-deleted.
//     const existingByClerk = await db.query.users.findFirst({
//       where: and(eq(users.clerkId, id!), isNull(users.deletedAt))
//     });

//     if (existingByClerk) {
//       // This handles cases where a user might already exist but needs syncing.
//       await db.update(users).set({
//         email,
//         name,
//         updatedAt: new Date(),
//       }).where(eq(users.clerkId, id!));
//     } else {
//       // Check if an ACTIVE user with this email already exists.
//       // A soft-deleted user should NOT be found here.
//       const activeUserByEmail = await db.query.users.findFirst({
//         where: and(eq(users.email, email), isNull(users.deletedAt))
//       });

//       if (activeUserByEmail) {
//         // An active user with this email already exists.
//         // Link this new clerkId to that existing active user.
//         console.log(`[CLERK_WEBHOOK] Found active user for email ${email}. Linking new clerkId.`);
//         await db.update(users).set({
//           clerkId: id!,
//           name,
//           updatedAt: new Date(),
//         }).where(eq(users.id, activeUserByEmail.id));
//       } else {
//         // This is a genuinely new user, or a re-signup from a user who previously deleted their account.
//         // In either case, create a new, separate user record.
//         console.log(`[CLERK_WEBHOOK] Creating new user for email ${email}.`);
//         const [newUser] = await db.insert(users).values({
//           clerkId: id!,
//           email,
//           name,
//           plan: 'free',
//           credits: 1, // Grant one free credit for new signups
//         }).returning();

//         // Log the free credit grant in the audit ledger for consistency.
//         if (newUser) {
//           try {
//             await db.insert(creditTransactions).values({
//               userId: newUser.id,
//               amount: 1,
//               reason: 'admin_grant',
//               referenceId: 'signup_free_credit',
//             });
//           } catch (ledgerErr) {
//             // Non-blocking: If the ledger insert fails, we log it but don't fail the webhook.
//             console.error('[CLERK_WEBHOOK] Failed to log signup credit in creditTransactions:', ledgerErr);
//           }
//         }
//       }
//     }
//   }

//   if (eventType === 'user.updated') {
//     const email = evt.data.email_addresses?.[0]?.email_address || '';
//     const name =
//       evt.data.first_name
//         ? `${evt.data.first_name} ${evt.data.last_name || ''}`.trim()
//         : email;

//     await db.update(users)
//       .set({
//         email,
//         name,
//         updatedAt: new Date(),
//       })
//       .where(and(eq(users.clerkId, id!), isNull(users.deletedAt)));
//   }

//   if (eventType === 'user.deleted') {
//     const userId = id!;
//     console.log(`[CLERK_WEBHOOK] Attempting deletion for user: ${userId}`);

//     try {
//       const dbUser = await db.query.users.findFirst({
//         where: eq(users.clerkId, userId) // Find user regardless of their deletedAt status
//       });

//       if (dbUser) {
//         console.log(`[CLERK_WEBHOOK] Found user in DB: ${dbUser.email} (UUID: ${dbUser.id})`);

//         // 1. Cancel Stripe Subscription if active
//         if (dbUser.stripeSubscriptionId) {
//           try {
//             const { stripe } = await import('@/lib/stripe');
//             await stripe.subscriptions.cancel(dbUser.stripeSubscriptionId);
//             console.log(`[CLERK_WEBHOOK] ✅ Stripe subscription canceled: ${dbUser.stripeSubscriptionId}`);
//           } catch (stripeErr: any) {
//             console.error('[CLERK_WEBHOOK] ❌ Failed to cancel Stripe subscription:', stripeErr.message);
//             // We continue anyway to ensure the DB row is deleted (GDPR)
//           }
//         }

//         // 2. Soft Delete associated data in tables that have a `deletedAt` column
//         //    (cvAnalyses is the only one currently)
//         await db.update(cvAnalyses)
//           .set({ deletedAt: new Date(), updatedAt: new Date() })
//           .where(eq(cvAnalyses.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All CV analyses for user ${userId} marked as deleted.`);

//         // 3. Unlink associated data in tables that do NOT have a `deletedAt` column
//         //    but have a nullable `userId` (set userId to NULL)
//         await db.update(creditTransactions)
//           .set({ userId: null })
//           .where(eq(creditTransactions.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All credit transactions for user ${userId} unlinked.`);

//         await db.update(cvGenerations)
//           .set({ userId: null })
//           .where(eq(cvGenerations.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All CV generations for user ${userId} unlinked.`);

//         await db.update(payments)
//           .set({ userId: null })
//           .where(eq(payments.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All payments for user ${userId} unlinked.`);

//         await db.update(usageLogs)
//           .set({ userId: null })
//           .where(eq(usageLogs.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All usage logs for user ${userId} unlinked.`);

//         await db.update(userTemplateUnlocks)
//           .set({ userId: null })
//           .where(eq(userTemplateUnlocks.userId, dbUser.id));
//         console.log(`[CLERK_WEBHOOK] ✅ All user template unlocks for user ${userId} unlinked.`);

//         // 4. Soft Delete user row
//         await db.update(users)
//           .set({ deletedAt: new Date(), updatedAt: new Date() })
//           .where(eq(users.clerkId, userId));

//         console.log(`[CLERK_WEBHOOK] ✅ User ${userId} marked as deleted. GDPR Retention started (30 days).`);
//       } else {
//         console.warn(`[CLERK_WEBHOOK] ⚠️ User ${userId} not found in database. Nothing to delete.`);
//       }
//     } catch (err: any) {
//       console.error(`[CLERK_WEBHOOK] ❌ FATAL ERROR during user.deleted:`, err.message);
//       return new Response('Error deleting user', { status: 500 });
//     }
//   }

//   return new Response('', { status: 200 });
// }


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

export async function POST(req: Request) {
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
      // Only look for ACTIVE users by email.
      // Soft-deleted users have their email anonymized to
      // 'deleted_UUID@deleted.ouicv' so this will never match them.
      const activeUserByEmail = await db.query.users.findFirst({
        where: and(eq(users.email, email), isNull(users.deletedAt)),
      });

      if (activeUserByEmail) {
        // Link new Clerk account to existing active DB user
        console.log(`[CLERK_WEBHOOK] Linking new clerkId to existing active user: ${email}`);
        await db.update(users)
          .set({ clerkId: id!, name, updatedAt: new Date() })
          .where(eq(users.id, activeUserByEmail.id));
      } else {
        // Genuinely new user OR re-signup after soft-deletion.
        // Both cases create a completely fresh DB row.
        console.log(`[CLERK_WEBHOOK] Creating new user: ${email}`);
        const [newUser] = await db.insert(users).values({
          clerkId: id!,
          email,
          name,
          plan: 'free',
          credits: 1, // One free download credit for every new signup
        }).returning();

        // Log the free credit grant in the audit ledger
        if (newUser) {
          try {
            await db.insert(creditTransactions).values({
              userId: newUser.id,
              amount: 1,
              reason: 'admin_grant',
              referenceId: 'signup_free_credit',
            });
          } catch (ledgerErr) {
            // Non-blocking — credits value on user row is already set correctly
            console.error('[CLERK_WEBHOOK] Failed to log signup credit:', ledgerErr);
          }
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

    // Only update ACTIVE users — never update a soft-deleted row
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

      console.log(`[CLERK_WEBHOOK] Found user: ${dbUser.email} (UUID: ${dbUser.id})`);

      // STEP 1: Cancel Stripe subscription immediately.
      // Financial cleanup happens now, not after 30 days.
      if (dbUser.stripeSubscriptionId) {
        try {
          const { stripe } = await import('@/lib/stripe');
          await stripe.subscriptions.cancel(dbUser.stripeSubscriptionId);
          console.log(`[CLERK_WEBHOOK] ✅ Stripe subscription canceled`);
        } catch (stripeErr: any) {
          // Non-fatal — still proceed with soft delete
          console.error('[CLERK_WEBHOOK] ❌ Stripe cancellation failed:', stripeErr.message);
        }
      }

      // STEP 2: Soft-delete cv_analyses (the only related table with deleted_at).
      // cv_templates and cv_generations cascade from cv_analyses cleanup.
      await db.update(cvAnalyses)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(cvAnalyses.userId, dbUser.id));
      console.log(`[CLERK_WEBHOOK] ✅ CV analyses soft-deleted`);

      // STEP 3: Unlink user from records that must be retained for legal reasons.
      // Payment records must be kept for 10 years (French accounting law).
      // CV generations and usage logs are unlinked but not deleted.
      // userTemplateUnlocks and creditTransactions: left linked — they will
      // cascade when the user row is hard-deleted after 30 days.
      try {
        await db.update(cvGenerations)
          .set({ userId: null } as any)
          .where(eq(cvGenerations.userId, dbUser.id));

        await db.update(payments)
          .set({ userId: null })
          .where(eq(payments.userId, dbUser.id));

        await db.update(usageLogs)
          .set({ userId: null } as any)
          .where(eq(usageLogs.userId, dbUser.id));

        console.log(`[CLERK_WEBHOOK] ✅ Associated records unlinked`);
      } catch (unlinkErr: any) {
        // Non-fatal — still proceed with user soft-delete
        console.error('[CLERK_WEBHOOK] ❌ Failed to unlink some records:', unlinkErr.message);
      }

      // STEP 4: Soft-delete the user row AND immediately anonymize PII.
      //
      // WHY ANONYMIZE IMMEDIATELY (not after 30 days):
      // GDPR/CNIL requires that personal data be made inaccessible as soon
      // as deletion is requested. The 30-day retention period is for internal
      // audit/dispute resolution only — the data must not be identifiable.
      //
      // WHAT THIS ENABLES:
      // - clerkId: null → user.created webhook for re-signup won't find 
      //   this row and will create a fresh one instead
      // - email anonymized → unique constraint freed, same email can be 
      //   used to create a new account immediately
      // - Stripe IDs cleared → no risk of accidental re-billing
      await db.update(users)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          clerkId: null,
          email: `deleted_${dbUser.id}@deleted.ouicv`,
          name: 'Compte supprimé',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          credits: 0,
        })
        .where(eq(users.id, dbUser.id));

      const hardDeleteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      console.log(
        `[CLERK_WEBHOOK] ✅ User ${clerkUserId} (DB: ${dbUser.id}) soft-deleted and anonymized. ` +
        `Hard-delete scheduled after ${hardDeleteDate.toISOString()}`
      );

    } catch (err: any) {
      console.error(`[CLERK_WEBHOOK] ❌ FATAL ERROR during user.deleted:`, err.message);
      return new Response('Error during soft delete', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
