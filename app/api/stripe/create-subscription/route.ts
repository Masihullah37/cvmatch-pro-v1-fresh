// import { NextResponse } from "next/server";
// import { stripe } from "@/lib/stripe/client";
// import { auth } from "@clerk/nextjs/server";
// import { db } from "@/lib/db";
// import { cvAnalyses } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";

// export async function POST(req: Request) {
//   try {
//     const { userId } = await auth();
//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { analysisId, locale = "fr", templateNumber, returnPath, templateData } = await req.json();

//     // ✅ Persist current edits to the database so they are not lost after payment redirect
//     if (analysisId && templateData) {
//       await db.update(cvAnalyses).set({ optimizedData: templateData as any }).where(eq(cvAnalyses.id, analysisId));
//     }

//     let appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").trim();
//     if (returnPath) {
//       try {
//         const parsedReturnUrl = new URL(returnPath);
//         const requestOrigin = req.headers.get("origin");
//         if (
//           (parsedReturnUrl.protocol === "http:" || parsedReturnUrl.protocol === "https:") &&
//           requestOrigin &&
//           parsedReturnUrl.origin === requestOrigin
//         ) {
//           appUrl = parsedReturnUrl.origin;
//         }
//       } catch {
//         // Relative paths keep the configured app URL.
//       }
//     }
//     const fallbackPath = templateNumber
//       ? `/${locale}/templates/${analysisId}?template=${templateNumber}&payment=success`
//       : `/${locale}/templates/${analysisId}?payment=success`;
//     const appOrigin = new URL(appUrl).origin;
//     let targetPath = fallbackPath;

//     if (returnPath) {
//       try {
//         const parsed = new URL(returnPath, appOrigin);
//         if (parsed.origin === appOrigin) {
//           targetPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
//         }
//       } catch {
//         targetPath = fallbackPath;
//       }
//     }

//     const successUrl = new URL(targetPath, appUrl);
//     successUrl.searchParams.set("payment", "success");
//     successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
//     const bridgeTarget = encodeURIComponent(
//       `${successUrl.pathname}${successUrl.search}${successUrl.hash}`
//     );
//     const cancelUrl = new URL(targetPath, appUrl);
//     cancelUrl.searchParams.set("payment", "canceled");

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       mode: "subscription",
//       client_reference_id: userId,
//       line_items: [
//         {
//           price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
//           quantity: 1,
//         },
//       ],
//       success_url: `${appUrl}/${locale}/payment/bridge?target=${bridgeTarget}`,
//       cancel_url: cancelUrl.toString(),
//       metadata: {
//         userId,
//         analysisId,
//       },
//       subscription_data: {
//         metadata: {
//           userId,
//           analysisId,
//         },
//       },
//     });

//     return NextResponse.json({ url: session.url });
//   } catch (error: unknown) {
//     const message = error instanceof Error ? error.message : "Stripe subscription checkout failed";
//     console.error("Stripe subscription checkout error:", error);
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }




import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cvAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId, locale = "fr", templateNumber, returnPath, templateData } = await req.json();

    // ✅ Persist current edits to the database so they are not lost after payment redirect
    if (analysisId && templateData) {
      await db.update(cvAnalyses).set({ optimizedData: templateData as any }).where(eq(cvAnalyses.id, analysisId));
    }

    let appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").trim();
    if (returnPath) {
      try {
        const parsedReturnUrl = new URL(returnPath);
        const requestOrigin = req.headers.get("origin");
        if (
          (parsedReturnUrl.protocol === "http:" || parsedReturnUrl.protocol === "https:") &&
          requestOrigin &&
          parsedReturnUrl.origin === requestOrigin
        ) {
          appUrl = parsedReturnUrl.origin;
        }
      } catch {
        // Relative paths keep the configured app URL.
      }
    }
    const fallbackPath = templateNumber
      ? `/${locale}/templates/${analysisId}?template=${templateNumber}&payment=success`
      : `/${locale}/templates/${analysisId}?payment=success`;
    const appOrigin = new URL(appUrl).origin;
    let targetPath = fallbackPath;

    if (returnPath) {
      try {
        const parsed = new URL(returnPath, appOrigin);
        if (parsed.origin === appOrigin) {
          targetPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        targetPath = fallbackPath;
      }
    }

    const successUrl = new URL(targetPath, appUrl);
    successUrl.searchParams.set("payment", "success");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    const bridgeTarget = encodeURIComponent(
      `${successUrl.pathname}${successUrl.search}${successUrl.hash}`
    );

    // 🚀 NATIVE URL BUILDERS (Fixes double slashes and trailing slashes)
    const finalSuccessUrl = new URL(`/${locale}/payment/bridge`, appUrl);
    finalSuccessUrl.searchParams.set("target", decodeURIComponent(bridgeTarget));

    const finalCancelUrl = new URL(targetPath, appUrl);
    finalCancelUrl.searchParams.set("payment", "canceled");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      client_reference_id: userId,
      line_items: [
        {
          price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      
      // 🔥 FIXED CHANNELS
      success_url: finalSuccessUrl.toString(),
      cancel_url: finalCancelUrl.toString(),
      metadata: {
        userId,
        analysisId,
      },
      subscription_data: {
        metadata: {
          userId,
          analysisId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Stripe subscription checkout failed";
    console.error("Stripe subscription checkout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}