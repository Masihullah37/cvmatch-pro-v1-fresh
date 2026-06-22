export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  users,
  payments,
  cvTemplates,
  cvAnalyses,
  stripeEvents,
  userTemplateUnlocks,
  creditTransactions
} from "@/lib/db/schema";
import { eq, sql, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Helper function to safely handle rate limits reset
async function safeResetRateLimits(clerkId: string) {
  try {
    console.log(`Resetting rate limits for user: ${clerkId}`);
  } catch (e) {
    console.error("Rate limit reset ignored:", e);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_94e69e3263279c65b7900a839e8d366792e1209eddfda2e36644f9e47a2313a3";
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Signature verification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    console.log(`🔔 Webhook Received: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId = session.payment_intent as string | null;
      const sessionId = session.id;

      const clientRefId = session.client_reference_id !== "guest" ? session.client_reference_id : null;
      const metadataUserId = session.metadata?.userId !== "guest" ? session.metadata?.userId : null;
      const resolvedUserId = clientRefId || metadataUserId;

      const stripeCustomerId = session.customer as string;
      const customerEmail = session.customer_details?.email;
      const analysisId = session.metadata?.analysisId;

      console.log(`[checkout.session.completed] Session: ${sessionId} | Resolved ID: ${resolvedUserId}`);

      const existingPayment = paymentIntentId
        ? await db.query.payments.findFirst({ where: eq(payments.stripePaymentIntentId, paymentIntentId) })
        : await db.query.payments.findFirst({ where: eq(payments.stripeSessionId, sessionId) });

      if (existingPayment?.status === "completed") {
        return NextResponse.json({ received: true });
      }

      if (session.mode === "payment" || session.mode === "subscription") {

        // ✨ FIX: Declare userRecord here so it lives outside the transaction scope block!
        let userRecord: any = null;

        await db.transaction(async (tx) => {
          const processed = await tx.select().from(stripeEvents).where(eq(stripeEvents.eventId, event.id)).limit(1);
          if (processed.length > 0) return;
          await tx.insert(stripeEvents).values({ eventId: event.id, type: event.type });

          if (resolvedUserId) {
            // Check if it's a UUID to avoid Postgres type mismatch errors
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId);
            const whereClause = isUuid
              ? or(eq(users.clerkId, resolvedUserId), eq(users.id, resolvedUserId))
              : eq(users.clerkId, resolvedUserId);
            const usersFound = await tx.select().from(users).where(whereClause).limit(1);
            userRecord = usersFound[0];
          }

          if (!userRecord && stripeCustomerId) {
            const usersFound = await tx.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
            userRecord = usersFound[0];
          }

          if (!userRecord && customerEmail) {
            const usersFound = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
            userRecord = usersFound[0];
          }

          if (userRecord) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const isSub = session.mode === "subscription";
            const creditAmount = isSub ? 30 : 5;
            const targetPlan = isSub ? "monthly" : "one_time";

            await tx.update(users)
              .set({
                plan: targetPlan,
                stripeCustomerId: isSub ? stripeCustomerId : (userRecord.stripeCustomerId || stripeCustomerId),
                stripeSubscriptionId: session.subscription as string || null,
                subscriptionStatus: isSub ? "active" : null,
                subscriptionEndsAt: thirtyDaysFromNow,
                creditsExpiry: thirtyDaysFromNow,
                credits: sql`COALESCE(${users.credits}, 0) + ${creditAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userRecord.id));

            await tx.insert(creditTransactions).values({
              userId: userRecord.id,
              amount: creditAmount,
              reason: 'purchase',
              referenceId: session.id,
              createdAt: new Date()
            });

            console.log(`✅ Success! Added ${creditAmount} credits to User ID: ${userRecord.id}`);
          } else {
            console.warn("⚠️ Mismatch Warning: No user found.");
          }

          await tx.insert(payments)
            .values({
              stripeSessionId: session.id,
              stripePaymentIntentId: paymentIntentId || `sub_initial_${Date.now()}`,
              amount: session.amount_total,
              currency: session.currency || 'eur',
              paymentType: session.mode === "subscription" ? "subscription" : "one_time",
              status: "completed",
              userId: userRecord?.id ?? undefined,
              guestEmail: customerEmail ?? undefined,
            })
            .onConflictDoUpdate({
              target: payments.stripePaymentIntentId,
              set: { status: "completed", userId: userRecord?.id ?? undefined }
            });

          if (analysisId && analysisId !== "direct") {
            await tx.update(cvTemplates).set({ isPaid: true }).where(eq(cvTemplates.analysisId, analysisId));
            if (userRecord) {
              await tx.update(cvAnalyses).set({ userId: userRecord.id }).where(eq(cvAnalyses.id, analysisId));
              const unlockedTemplates = await tx.select().from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId));

              if (unlockedTemplates.length > 0) {
                await tx.insert(userTemplateUnlocks).values(
                  unlockedTemplates.map((t) => ({ userId: userRecord!.id, templateId: t.id }))
                ).onConflictDoNothing();
              }
            }
          }
        }); // <-- Transaction closes safely

        // ✅ This block now references userRecord with zero TypeScript errors!
        if (userRecord?.clerkId) {
          await safeResetRateLimits(userRecord.clerkId);
        }
      }
    }

    // Handle invoice billing expansions
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string | null;

      // Skip the very first invoice: checkout.session.completed already credited those 30 credits.
      // billing_reason === 'subscription_create' means this is the initial invoice from a new checkout.
      const isInitialInvoice = invoice.billing_reason === 'subscription_create';

      if (subscriptionId && !isInitialInvoice) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const periodEnd = new Date(subscription.current_period_end * 1000);
        const metadataUserId = subscription.metadata?.userId;

        await db.transaction(async (tx) => {
          const processed = await tx.select().from(stripeEvents).where(eq(stripeEvents.eventId, event.id)).limit(1);
          if (processed.length > 0) return;
          await tx.insert(stripeEvents).values({ eventId: event.id, type: event.type });

          const subUsers = await tx.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
          const clerkUsers = metadataUserId ? await tx.select().from(users).where(eq(users.clerkId, metadataUserId)).limit(1) : [];
          const targetUser = subUsers[0] || clerkUsers[0];

          if (targetUser) {
            await tx.update(users).set({
              plan: "monthly",
              subscriptionStatus: "active",
              subscriptionEndsAt: periodEnd,
              creditsExpiry: periodEnd,
              credits: sql`COALESCE(${users.credits}, 0) + 30`,
              updatedAt: new Date(),
            }).where(eq(users.id, targetUser.id));

            await tx.insert(creditTransactions).values({
              userId: targetUser.id,
              amount: 30,
              reason: 'purchase',
              referenceId: event.id,
              createdAt: new Date()
            });

            await tx.insert(payments).values({
              stripePaymentIntentId: invoice.payment_intent as string || `renew_${subscriptionId}_${Date.now()}`,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              paymentType: "subscription",
              status: "completed",
              userId: targetUser.id,
              guestEmail: invoice.customer_email ?? undefined,
            });
          }
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const isDeleted = event.type === "customer.subscription.deleted";
      const periodEnd = new Date(subscription.current_period_end * 1000);

      await db.transaction(async (tx) => {
        const processed = await tx.select().from(stripeEvents).where(eq(stripeEvents.eventId, event.id)).limit(1);
        if (processed.length > 0) return;

        await tx.insert(stripeEvents).values({ eventId: event.id, type: event.type });

        await tx.update(users)
          .set({
            plan: isDeleted ? "free" : "monthly",
            credits: isDeleted ? 0 : undefined,
            subscriptionStatus: isDeleted ? "canceled" : (subscription.status === "past_due" ? "past_due" : "active"),
            subscriptionEndsAt: isDeleted ? new Date() : periodEnd,
            creditsExpiry: isDeleted ? new Date() : periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeSubscriptionId, subscription.id));
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ Webhook execution error:", error.message);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}