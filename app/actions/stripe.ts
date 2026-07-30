'use server';

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, cvAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { redirect } from "next/navigation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
// --- createCheckoutSession ---//
export async function createCheckoutSession(
  type: 'one-time' | 'subscription',
  analysisId: string,
  locale: string,
  templateNumber?: number,
  returnUrl?: string,
) {

  const { userId } = await auth();
  if (!userId) {
    throw new Error("SESSION_EXPIRED");
  }

  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  // Fallback: If dbUser is missing (e.g. fresh signup on iPhone before webhook finishes), sync immediately
  if (!dbUser) {
    const { syncUserWithClerk } = await import("@/lib/auth/sync");
    const syncedUser = await syncUserWithClerk();
    if (syncedUser) {
      dbUser = syncedUser;
    }
  }

  if (!dbUser) {
    throw new Error("SESSION_EXPIRED");
  }

  // Use returnUrl if provided (current page), otherwise build the standard path
  const baseReturnPath = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/templates/${analysisId}`;

  // Safely append query parameters to avoid path duplication and malformed URLs
  const separator = baseReturnPath.includes('?') ? '&' : '?';
  const successUrl = `${baseReturnPath}${separator}payment=success`;
  const cancelUrl = `${baseReturnPath}${separator}payment=cancelled`;

  // Professional handling of returning customers: use customer ID if it exists, otherwise use email
  const customerConfig = dbUser.stripeCustomerId
    ? { customer: dbUser.stripeCustomerId }
    : { customer_email: dbUser.email || undefined };

  let session;

  if (type === 'one-time') {
    session = await stripe.checkout.sessions.create({
      ...customerConfig,
      line_items: [
        {
          price_data: { // Ensure email is string | undefined
            currency: 'eur',
            product_data: {
              name: 'Pack Starter (5 Crédits)',
            },
            unit_amount: 390, // 3.90 EUR
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: dbUser.id,
        type: 'one-time-credits',
      },
    });
  } else { // subscription
    session = await stripe.checkout.sessions.create({
      ...customerConfig,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Abonnement Pro (30 Crédits/mois)',
            },
            unit_amount: 1390, // 13.90 EUR
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: dbUser.id,
        type: 'monthly-subscription',
      },
    });
  }

  if (session.url) {
    return session.url;
  }
  throw new Error("Failed to create Stripe checkout session.");
}

// --- cancelSubscription ---
export async function cancelSubscription(locale: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new Error("User not found in DB.");
  }

  if (!dbUser.stripeSubscriptionId) {
    throw new Error("Aucun abonnement actif trouvé.");
  }

  try {
    // 1. Retrieve current subscription status to ensure it's updatable
    const subscription = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId);

    if (subscription.cancel_at_period_end) {
      // Already canceled in Stripe, just sync DB and redirect
      await db.update(users)
        .set({ subscriptionStatus: 'canceled', updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));
      revalidatePath('/[locale]/dashboard', 'page');
      redirect(`/${locale}/dashboard?cancellation=success`);
    }

    await stripe.subscriptions.update(dbUser.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // 2. Update status in database (keep plan active so user keeps access until expiry)
    await db.update(users)
      .set({
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    // Revalidate paths to reflect changes in UI
    revalidatePath('/[locale]/dashboard', 'page');
    revalidatePath('/[locale]/templates/[analysisId]', 'page');

    redirect(`/${locale}/dashboard?cancellation=success`);
  } catch (error: any) {
    // IMPORTANT: Next.js redirect() works by throwing a special NEXT_REDIRECT error.
    // We must re-throw it so the redirect actually happens instead of being swallowed.
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Failed to cancel subscription:", error);
    throw new Error("Échec de l'annulation de l'abonnement. Veuillez réessayer.");
  }
}