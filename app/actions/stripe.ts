// "use server";

// import { stripe } from "@/lib/stripe";
// import { auth } from "@clerk/nextjs/server";
// import { headers } from "next/headers";
// import { db } from "@/lib/db";
// import { users } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";

// function resolveCheckoutBaseUrl(returnPath: string | undefined, requestOrigin: string | null) {
//   const fallbackUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").trim();
//   if (!returnPath) return fallbackUrl;

//   try {
//     const parsed = new URL(returnPath);
//     if (
//       (parsed.protocol === "http:" || parsed.protocol === "https:") &&
//       requestOrigin &&
//       parsed.origin === requestOrigin
//     ) {
//       return parsed.origin;
//     }
//   } catch {
//     // Relative return paths use the configured app URL.
//   }

//   return fallbackUrl;
// }

// function resolveReturnPath(returnPath: string | undefined, fallbackPath: string, appUrl: string) {
//   if (!returnPath) return fallbackPath;

//   try {
//     const appOrigin = new URL(appUrl).origin;
//     const parsed = new URL(returnPath, appOrigin);
//     if (parsed.origin !== appOrigin) return fallbackPath;
//     return `${parsed.pathname}${parsed.search}${parsed.hash}`;
//   } catch {
//     return fallbackPath;
//   }
// }

// function buildPaymentBridgeUrl(appUrl: string, locale: string, targetPath: string) {
//   const successUrl = new URL(targetPath, appUrl);
//   successUrl.searchParams.set("payment", "success");
//   successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

//   const bridgeTarget = encodeURIComponent(
//     `${successUrl.pathname}${successUrl.search}${successUrl.hash}`
//   );

//   return `${appUrl}/${locale}/payment/bridge?target=${bridgeTarget}`;
// }

// export async function createCheckoutSession(
//   type: "one-time" | "subscription",
//   analysisId?: string,
//   locale: string = "fr",
//   templateNumber?: number,
//   returnPath?: string
// ) {
//   const { userId, sessionClaims } = await auth();
//   const headersList = await headers();
//   const userEmail = (sessionClaims as { email?: string } | null)?.email;
//   const appUrl = resolveCheckoutBaseUrl(returnPath, headersList.get("origin"));

//   let fallbackSuccessPath = "";
//   if (analysisId) {
//     fallbackSuccessPath = templateNumber
//       ? `/${locale}/templates/${analysisId}?template=${templateNumber}`
//       : `/${locale}/templates/${analysisId}`;
//   } else {
//     fallbackSuccessPath = `/${locale}/dashboard`;
//   }

//   const targetPath = resolveReturnPath(returnPath, fallbackSuccessPath, appUrl);
//   const successBridgeUrl = buildPaymentBridgeUrl(appUrl, locale, targetPath);
//   const cancelUrl = new URL(
//     resolveReturnPath(
//       returnPath,
//       analysisId ? `/${locale}/results/${analysisId}` : `/${locale}#pricing`,
//       appUrl
//     ),
//     appUrl
//   );
//   cancelUrl.searchParams.set("canceled", "true");

//   let session;

//   if (type === "one-time") {
//     session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       customer_email: userEmail,
//       line_items: [
//         {
//           price_data: {
//             currency: "eur",
//             product_data: {
//               name: "Pack 5 CV Optimises (Paiement Unique)",
//               description: analysisId
//                 ? "Debloquez vos modeles de CV parfaitement adaptes pour l'offre d'emploi."
//                 : "Achetez 5 credits pour generer des CV optimises par l'IA.",
//             },
//             unit_amount: 390,
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       allow_promotion_codes: true,
//       success_url: successBridgeUrl,
//       cancel_url: cancelUrl.toString(),
//       custom_text: {
//         submit: {
//           message: "Debloquez votre plein potentiel avec OuiCV Pro.",
//         },
//       },
//       metadata: {
//         userId: userId || "guest",
//         analysisId: analysisId || "direct",
//         type: "one-time",
//       },
//     });
//   } else {
//     session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       customer_email: userEmail,
//       line_items: [
//         {
//           price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
//           quantity: 1,
//         },
//       ],
//       mode: "subscription",
//       allow_promotion_codes: true,
//       success_url: successBridgeUrl,
//       cancel_url: cancelUrl.toString(),
//       custom_text: {
//         submit: {
//           message: "Abonnez-vous pour un acces illimite aux fonctionnalites Pro.",
//         },
//       },
//       metadata: {
//         userId: userId || "guest",
//         analysisId: analysisId || "direct",
//         type: "subscription",
//       },
//       subscription_data: {
//         metadata: {
//           userId: userId || "guest",
//           analysisId: analysisId || "direct",
//           type: "subscription",
//         },
//       },
//     });
//   }

//   if (session.url) {
//     return session.url;
//   }

//   throw new Error("Failed to create checkout session");
// }

// export async function cancelMonthlySubscription(): Promise<{
//   success: boolean;
//   message: string;
// }> {
//   const { userId } = await auth();
//   if (!userId) {
//     throw new Error("Unauthorized");
//   }

//   const dbUser = await db.query.users.findFirst({
//     where: eq(users.clerkId, userId),
//   });

//   if (!dbUser?.stripeSubscriptionId) {
//     throw new Error("Aucun abonnement actif a annuler.");
//   }

//   const subscription = await stripe.subscriptions.update(
//     dbUser.stripeSubscriptionId,
//     {
//       cancel_at_period_end: true,
//     },
//   );

//   const periodEnd = new Date(subscription.current_period_end * 1000);
//   await db
//     .update(users)
//     .set({
//       subscriptionStatus: "canceled",
//       subscriptionEndsAt: periodEnd,
//       creditsExpiry: periodEnd,
//     })
//     .where(eq(users.id, dbUser.id));

//   return {
//     success: true,
//     message:
//       "Votre abonnement a ete annule.\nIl restera actif jusqu'a la fin de la periode en cours.\nAucun renouvellement ne sera effectue.",
//   };
// }



"use server";

import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function resolveCheckoutBaseUrl(returnPath: string | undefined, requestOrigin: string | null) {
  const fallbackUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").trim();
  if (!returnPath) return fallbackUrl;

  try {
    const parsed = new URL(returnPath);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      requestOrigin &&
      parsed.origin === requestOrigin
    ) {
      return parsed.origin;
    }
  } catch {
    // Relative return paths use the configured app URL.
  }

  return fallbackUrl;
}

function resolveReturnPath(returnPath: string | undefined, fallbackPath: string, appUrl: string) {
  if (!returnPath) return fallbackPath;

  try {
    const appOrigin = new URL(appUrl).origin;
    const parsed = new URL(returnPath, appOrigin);
    if (parsed.origin !== appOrigin) return fallbackPath;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackPath;
  }
}

function buildPaymentBridgeUrl(appUrl: string, locale: string, targetPath: string) {
  const successUrl = new URL(targetPath, appUrl);
  successUrl.searchParams.set("payment", "success");
  const bridgeTarget = encodeURIComponent(
    `${successUrl.pathname}${successUrl.search}${successUrl.hash}`
  );

  return `${appUrl}/${locale}/payment/bridge?session_id={CHECKOUT_SESSION_ID}&target=${bridgeTarget}`;
}

export async function createCheckoutSession(
  type: "one-time" | "subscription",
  analysisId?: string,
  locale: string = "fr",
  templateNumber?: number,
  returnPath?: string
) {
  const { userId, sessionClaims } = await auth();
  const headersList = await headers();
  const userEmail = (sessionClaims as { email?: string } | null)?.email;
  const appUrl = resolveCheckoutBaseUrl(returnPath, headersList.get("origin"));

  let fallbackSuccessPath = "";
  if (analysisId) {
    fallbackSuccessPath = templateNumber
      ? `/${locale}/templates/${analysisId}?template=${templateNumber}`
      : `/${locale}/templates/${analysisId}`;
  } else {
    fallbackSuccessPath = `/${locale}/dashboard`;
  }

  const targetPath = resolveReturnPath(returnPath, fallbackSuccessPath, appUrl);
  const successBridgeUrl = buildPaymentBridgeUrl(appUrl, locale, targetPath);
  const cancelUrl = new URL(
    resolveReturnPath(
      returnPath,
      analysisId ? `/${locale}/results/${analysisId}` : `/${locale}#pricing`,
      appUrl
    ),
    appUrl
  );
  cancelUrl.searchParams.set("canceled", "true");

  let session;

  if (type === "one-time") {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: userEmail,
      // ✅ FIX 1: Pass the Clerk ID at the root level so the webhook user match works
      client_reference_id: userId || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Pack 5 CV Optimises (Paiement Unique)",
              description: analysisId
                ? "Debloquez vos modeles de CV parfaitement adaptes pour l'offre d'emploi."
                : "Achetez 5 credits pour generer des CV optimises par l'IA.",
            },
            unit_amount: 390,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: successBridgeUrl,
      cancel_url: cancelUrl.toString(),
      custom_text: {
        submit: {
          message: "Debloquez votre plein potentiel avec OuiCV Pro.",
        },
      },
      metadata: {
        userId: userId || "guest",
        analysisId: analysisId || "direct",
        type: "one-time",
      },
    });
  } else {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: userEmail,
      // ✅ FIX 2: Pass the Clerk ID at the root level for subscriptions
      client_reference_id: userId || undefined,
      line_items: [
        {
          price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: successBridgeUrl,
      cancel_url: cancelUrl.toString(),
      custom_text: {
        submit: {
          message: "Abonnez-vous pour un acces illimite aux fonctionnalites Pro.",
        },
      },
      metadata: {
        userId: userId || "guest",
        analysisId: analysisId || "direct",
        type: "subscription",
      },
      subscription_data: {
        metadata: {
          userId: userId || "guest",
          analysisId: analysisId || "direct",
          type: "subscription",
        },
      },
    });
  }

  if (session.url) {
    return session.url;
  }

  throw new Error("Failed to create checkout session");
}

export async function cancelMonthlySubscription(): Promise<{
  success: boolean;
  message: string;
}> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser?.stripeSubscriptionId) {
    throw new Error("Aucun abonnement actif a annuler.");
  }

  const subscription = await stripe.subscriptions.update(
    dbUser.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    },
  );

  const periodEnd = new Date(subscription.current_period_end * 1000);
  await db
    .update(users)
    .set({
      subscriptionStatus: "canceled",
      subscriptionEndsAt: periodEnd,
      creditsExpiry: periodEnd,
    })
    .where(eq(users.id, dbUser.id));

  return {
    success: true,
    message:
      "Votre abonnement a ete annule.\nIl restera actif jusqu'a la fin de la periode en cours.\nAucun renouvellement ne sera effectue.",
  };
}