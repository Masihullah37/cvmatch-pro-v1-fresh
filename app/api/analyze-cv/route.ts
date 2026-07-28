// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { cvAnalyses, users } from "@/lib/db/schema";
// import { redis } from "@/lib/rate-limit/upstash";
// import { analyzeCV, extractRawCVData } from "@/lib/ai/ats-analyzer";
// import { parseCVFile } from "@/lib/ai/cv-parser";
// import { isUrl, scrapeJobDescription, extractStructuredJobDetails } from "@/lib/utils/scraper";
// import { detectATSPlatform, evaluateCVCompatibility } from "@/lib/ats-detection";
// import { z } from "zod";
// import { auth } from "@clerk/nextjs/server";
// import { eq } from "drizzle-orm";
// import { getUserPlan } from "@/lib/billing/get-user-plan";
// import crypto from "crypto";
// import { getHashedTrackingToken } from "@/lib/anonymous-tracking";
// import { getEffectiveCredits, isCreditsExpired } from "@/lib/utils/subscription";

// const schema = z.object({
//   cvUrl: z.string().url().optional(),
//   cvName: z.string().optional(),
//   profileDescription: z.string().optional(),
//   jobDescription: z.string().min(10),
//   jobUrl: z.string().optional(),
//   guestSessionId: z.string().optional(),
//   locale: z.string().optional(),
// }).refine((data) => data.cvUrl || data.profileDescription, {
//   message: "Un CV sous forme d'URL ou une description de profil est obligatoire.",
//   path: ["cvUrl"],
// });

// // Known bot user-agents
// const BOT_PATTERNS = [
//   "python-requests",
//   "curl",
//   "wget",
//   "scrapy",
//   "httpx",
//   "axios",
//   "postman",
//   "insomnia",
// ];

// async function incrementFailCount(hashedIp: string, isPaid: boolean) {
//   if (isPaid) return;
//   const failCountKey = `fail_count:${hashedIp}`;
//   const count = await redis.incr(failCountKey);
//   if (count === 1) {
//     await redis.expire(failCountKey, 300); // 5 minutes
//   }
//   if (count > 10) {
//     await redis.set(`soft_block:${hashedIp}`, "1", { ex: 600 }); // 10 minutes
//   }
// }

// async function refundAtsScanAttempt(
//   info:
//     | { type: "hourly_daily"; hourlyKey: string; dailyKey: string }
//     | { type: "anon"; anonKey: string; usedBonus: boolean; userId: string | null }
//     | null
// ) {
//   if (!info) return;
//   try {
//     if (info.type === "hourly_daily") {
//       await redis.decr(info.hourlyKey);
//       await redis.decr(info.dailyKey);
//     } else {
//       await redis.decr(info.anonKey);
//       if (info.usedBonus && info.userId) {
//         await redis.del(`ats_bonus_scan_used:${info.userId}`);
//       }
//     }
//   } catch (e) {
//     console.error("[analyze-cv] Failed to refund rate-limit counter:", e);
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const { userId } = await auth();

//     // ✅ Bot detection — block non-browser clients
//     const userAgent = req.headers.get("user-agent") || "";
//     const isBot = BOT_PATTERNS.some((p) => userAgent.toLowerCase().includes(p));
//     if (isBot) {
//       return NextResponse.json(
//         { error: "Accès non autorisé." },
//         { status: 403 },
//       );
//     }

//     // ✅ Get IP for rate limiting
//     const ip =
//       req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
//       req.headers.get("x-real-ip") ||
//       "anonymous";

//     // ✅ Compute IP hash for anti-abuse
//     const trackingSalt = process.env.TRACKING_SALT || "default_salt";
//     const hashedIp = crypto.createHash('sha256').update(ip + trackingSalt).digest('hex');

//     // ✅ Get user from DB to check plan
//     let dbUser = null;
//     if (userId) {
//       dbUser = await db.query.users.findFirst({
//         where: eq(users.clerkId, userId),
//       });
//     }

//     const plan = getUserPlan(dbUser);
//     const isPaid = plan === "one_time" || plan === "pro";
//     const credits = dbUser ? getEffectiveCredits(dbUser) : 0;
//     const hasCredits = credits > 0;
//     const isExpired = dbUser ? isCreditsExpired(dbUser) : false;
//     const hashedToken = await getHashedTrackingToken();

//     let rateLimitRefundInfo:
//       | { type: "hourly_daily"; hourlyKey: string; dailyKey: string }
//       | { type: "anon"; anonKey: string; usedBonus: boolean; userId: string | null }
//       | null = null;

//     // ✅ Soft-block check for non-paid users
//     if (!isPaid) {
//       const softBlockKey = `soft_block:${hashedIp}`;
//       const isSoftBlocked = await redis.get(softBlockKey);
//       if (isSoftBlocked) {
//         return NextResponse.json(
//           { error: "Accès temporairement bloqué pour activité suspecte." },
//           { status: 429 }
//         );
//       }
//     }

//     function formatResetMessage(resetMs: number): string {
//       const resetDate = new Date(resetMs);
//       const diffMinutes = Math.max(1, Math.round((resetMs - Date.now()) / 60000));
//       if (diffMinutes < 60) {
//         return `dans ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
//       }
//       const formattedTimeOnly = resetDate.toLocaleTimeString('fr-FR', {
//         hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
//       });
//       const isToday = resetDate.toDateString() === new Date().toDateString();
//       return isToday ? `aujourd'hui à ${formattedTimeOnly}` : `demain à ${formattedTimeOnly}`;
//     }

//     if (plan === "one_time" || plan === "pro") {
//       const hourlyLimit = plan === "pro" ? 7 : 5;
//       const dailyLimit = 15;
//       const hourlyKey = `ats_hourly_${plan}_${userId}`;
//       const dailyKey = `ats_daily_paid_${userId}`;

//       const hourlyCount = await redis.incr(hourlyKey);
//       if (hourlyCount === 1) await redis.expire(hourlyKey, 60 * 60);

//       const dailyCount = await redis.incr(dailyKey);
//       if (dailyCount === 1) await redis.expire(dailyKey, 24 * 60 * 60);

//       if (!hasCredits || isExpired) {
//         return NextResponse.json(
//           {
//             error: "Vos crédits sont épuisés ou votre plan a expiré. Veuillez renouveler votre abonnement pour continuer.",
//             reason: "credits_exhausted",
//             isPaid: true
//           },
//           { status: 402 }
//         );
//       }

//       if (hourlyCount > hourlyLimit) {
//         const ttl = await redis.ttl(hourlyKey);
//         const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 60 * 60 * 1000));
//         return NextResponse.json(
//           {
//             error: `Limite horaire atteinte (${hourlyLimit} analyses/heure). Veuillez revenir ${formatResetMessage(resetAt.getTime())}.`,
//             resetAt: resetAt.toISOString(),
//             reason: "hourly_limit_reached",
//             isPaid: true
//           },
//           { status: 429 }
//         );
//       }

//       if (dailyCount > dailyLimit) {
//         const ttl = await redis.ttl(dailyKey);
//         const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 24 * 60 * 60 * 1000));
//         return NextResponse.json(
//           {
//             error: `Limite quotidienne atteinte (${dailyLimit} analyses/24h). Veuillez revenir ${formatResetMessage(resetAt.getTime())}.`,
//             resetAt: resetAt.toISOString(),
//             reason: "daily_limit_reached",
//             isPaid: true
//           },
//           { status: 429 }
//         );
//       }
//     } else {
//       // Anonymous, free, and trial (free bonus credit) all share the same
//       // 3-per-24h cap, keyed by the device's tracking token so switching
//       // between anonymous browsing and a free login on the same browser
//       // can't be used to reset the count.
//       const anonKey = `ats_daily_anon_${hashedToken}`;
//       const anonCount = await redis.incr(anonKey);
//       if (anonCount === 1) await redis.expire(anonKey, 24 * 60 * 60);

//       if (anonCount > 3) {
//         // One-time bonus: the very first time someone logs in, they get one
//         // extra scan even if they already used up their 3 anonymous scans on
//         // this device. This is a permanent, once-per-account flag — it never
//         // touches credits, which stay reserved for AI generation and downloads
//         // exactly as they already work today.
//         const bonusKey = userId ? `ats_bonus_scan_used:${userId}` : null;
//         const bonusAlreadyUsed = bonusKey ? await redis.get(bonusKey) : true;

//         if (bonusKey && !bonusAlreadyUsed) {
//           await redis.set(bonusKey, "1"); // no expiry — one-time for the life of the account
//           // Let this request through as their one-time login bonus scan.
//         } else {
//           const ttl = await redis.ttl(anonKey);
//           const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 24 * 60 * 60 * 1000));
//           const message = userId
//             ? `Limite d'analyses gratuites atteinte (3 par jour). Veuillez passer à un plan payant pour continuer. Prochaine réinitialisation : ${formatResetMessage(resetAt.getTime())}.`
//             : `Limite d'analyses gratuites atteinte (3 par jour). Veuillez vous connecter ou souscrire à un plan pour continuer. Prochaine réinitialisation : ${formatResetMessage(resetAt.getTime())}.`;
//           return NextResponse.json(
//             {
//               error: message,
//               resetAt: resetAt.toISOString(),
//               reason: userId ? "free_limit_reached" : "anon_limit_reached",
//               isPaid: false
//             },
//             { status: 429 }
//           );
//         }
//       }
//     }

//     // ✅ Content-Type check — must be JSON
//     const contentType = req.headers.get("content-type") || "";
//     if (!contentType.includes("application/json")) {
//       await incrementFailCount(hashedIp, isPaid);
//       return NextResponse.json(
//         { error: "Format de requête invalide." },
//         { status: 400 },
//       );
//     }

//     const body = await req.json();

//     // ✅ Validate input strictly
//     const parsed = schema.safeParse(body);
//     if (!parsed.success) {
//       await incrementFailCount(hashedIp, isPaid);
//       return NextResponse.json(
//         { error: "Données invalides.", details: parsed.error.flatten() },
//         { status: 400 },
//       );
//     }

//     const { cvUrl, cvName, profileDescription, jobDescription, jobUrl, guestSessionId, locale } = parsed.data;

//     let cvText = "";
//     const originalCvUrlForDb = cvUrl || "";

//     // ✅ Parse CV
//     if (cvUrl) {
//       // Verify CV URL is from your own uploadthing storage only
//       const allowedHosts = ["utfs.io", "uploadthing.com", "ufs.sh"];
//       const cvHostname = new URL(cvUrl).hostname;
//       if (!allowedHosts.some((h) => cvHostname.includes(h))) {
//         await incrementFailCount(hashedIp, isPaid);
//         return NextResponse.json(
//           { error: "Source de fichier non autorisée." },
//           { status: 400 },
//         );
//       }

//       // Fetch and parse CV
//       const response = await fetch(cvUrl);
//       const arrayBuffer = await response.arrayBuffer();

//       // ✅ File size check — max 10MB
//       if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
//         await incrementFailCount(hashedIp, isPaid);
//         return NextResponse.json(
//           { error: "Fichier trop volumineux (max 10MB)." },
//           { status: 400 },
//         );
//       }

//       const buffer = Buffer.from(arrayBuffer);
//       cvText = await parseCVFile(buffer, cvName || cvUrl);
//     } else if (profileDescription) {
//       cvText = profileDescription;
//     }

//     if (!cvText || cvText.trim().length < 50) {
//       await incrementFailCount(hashedIp, isPaid);
//       return NextResponse.json(
//         { error: "Ce CV semble contenir du texte non sélectionnable, ce qui arrive souvent avec les exports gratuits ou filigranés des générateurs de CV. Essayez d'exporter votre CV depuis Word ou d'utiliser un PDF sans filigrane." },
//         { status: 400 },
//       );
//     }

//     // ✅ Scrape Job Description URL if jobDescription is a URL
//     // let finalJobDescription = jobDescription;
//     // let resolvedJobUrl = jobUrl;

//     // if (jobDescription && isUrl(jobDescription)) {
//     //   console.log("=== API /analyze-cv: SCRAPING JOB URL ===");
//     //   if (!resolvedJobUrl) {
//     //     resolvedJobUrl = jobDescription;
//     //   }
//     //   finalJobDescription = await scrapeJobDescription(jobDescription);
//     // }

//     // ✅ Scrape Job Description URL if jobDescription is a URL
//     let finalJobDescription = jobDescription;
//     let resolvedJobUrl = jobUrl;

//     if (jobDescription && isUrl(jobDescription)) {
//       console.log("=== API /analyze-cv: SCRAPING JOB URL ===");
//       if (!resolvedJobUrl) {
//         resolvedJobUrl = jobDescription;
//       }
//       try {
//         finalJobDescription = await scrapeJobDescription(jobDescription);
//       } catch (scrapeError: any) {
//         console.error("[analyze-cv] Job URL scraping failed:", scrapeError.message);
//         await refundAtsScanAttempt(rateLimitRefundInfo);
//         return NextResponse.json(
//           {
//             error: "Nous n'avons pas pu récupérer automatiquement le contenu de cette offre. Collez directement le texte de la description à la place de l'URL.",
//             reason: "scraping_failed",
//           },
//           { status: 422 }
//         );
//       }
//     }

//     // ✅ Run AI analysis
//     const structuredJobDetails = extractStructuredJobDetails(finalJobDescription);
//     const analysisResult = await analyzeCV(
//       cvText,
//       finalJobDescription,
//       structuredJobDetails,
//       locale,
//     );
//     const rawData = await extractRawCVData(cvText);

//     // ✅ ATS Platform Detection & Evaluation
//     const detectedPlatformObj = detectATSPlatform(resolvedJobUrl, finalJobDescription, cvText);
//     const detectedPlatform = detectedPlatformObj ? detectedPlatformObj.name : null;

//     // Evaluate CV format compatibility
//     const compatResult = evaluateCVCompatibility(detectedPlatformObj, cvUrl || "cv.txt");
//     if (!compatResult.isCompatible) {
//       // Penalize format score by 10 points
//       if (analysisResult.scoreBreakdown && analysisResult.scoreBreakdown.format) {
//         const originalFormatScore = Number(analysisResult.scoreBreakdown.format.score) || 0;
//         analysisResult.scoreBreakdown.format.score = Math.max(0, originalFormatScore - 10);

//         // Recalculate total atsScore
//         let newTotalScore = 0;
//         for (const cat in analysisResult.scoreBreakdown) {
//           newTotalScore += Number(analysisResult.scoreBreakdown[cat].score) || 0;
//         }
//         analysisResult.atsScore = Math.round(newTotalScore);
//       }

//       // Add compatibility flaws and suggestions
//       if (!analysisResult.flaws) analysisResult.flaws = [];
//       analysisResult.flaws.push(...compatResult.flaws);

//       if (!analysisResult.suggestions) analysisResult.suggestions = [];
//       analysisResult.suggestions.push(...compatResult.suggestions);
//     }

//     console.log("========== [STAGE 6] BEFORE SAVING TO DB ==========");
//     console.log("keywordsFound to DB:", analysisResult.keywordsFound);
//     console.log("keywordsMissing to DB:", analysisResult.keywordsMissing);
//     console.log("===================================================");

//     // ✅ Insert Analysis Record into DB
//     const [insertedAnalysis] = await db
//       .insert(cvAnalyses)
//       .values({
//         userId: dbUser?.id,
//         originalCvUrl: originalCvUrlForDb,
//         jobUrl: resolvedJobUrl,
//         jobDescription: finalJobDescription,
//         atsScore: Math.round(Number(analysisResult.atsScore) || 0),
//         scoreBreakdown: analysisResult.scoreBreakdown,
//         flaws: analysisResult.flaws,
//         suggestions: analysisResult.suggestions,
//         keywordsMissing: analysisResult.keywordsMissing,
//         keywordsFound: analysisResult.keywordsFound,
//         optimizedData: {
//           ...rawData,
//           _originalCvText: cvText,
//         },
//         // guestSessionId: guestSessionId,
//         guestSessionId: dbUser ? null : hashedToken,
//         status: "completed",
//         userName: rawData?.userName || "Candidat",
//         jobTitle: rawData?.jobTitle || "Poste Visé",
//         detectedPlatform: detectedPlatform,
//       })
//       .returning({ id: cvAnalyses.id });

//     return NextResponse.json({ analysisId: insertedAnalysis.id });
//   } catch (error: any) {
//     console.error("API /analyze-cv error:", error);
//     return NextResponse.json(
//       { error: "Une erreur est survenue. Veuillez réessayer." },
//       { status: 500 },
//     );
//   }
// }


import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cvAnalyses, users } from "@/lib/db/schema";
import { redis } from "@/lib/rate-limit/upstash";
import { analyzeCV, extractRawCVData } from "@/lib/ai/ats-analyzer";
import { parseCVFile } from "@/lib/ai/cv-parser";
import { isUrl, scrapeJobDescription, extractStructuredJobDetails } from "@/lib/utils/scraper";
import { detectATSPlatform, evaluateCVCompatibility } from "@/lib/ats-detection";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import crypto from "crypto";
import { getHashedTrackingToken } from "@/lib/anonymous-tracking";
import { getEffectiveCredits, isCreditsExpired } from "@/lib/utils/subscription";

const schema = z.object({
  cvUrl: z.string().url().optional(),
  cvName: z.string().optional(),
  profileDescription: z.string().optional(),
  jobDescription: z.string().optional(),
  jobUrl: z.string().optional(),
  guestSessionId: z.string().optional(),
  locale: z.string().optional(),
}).refine((data) => data.cvUrl || data.profileDescription, {
  message: "Un CV sous forme d'URL ou une description de profil est obligatoire.",
  path: ["cvUrl"],
});

// Known bot user-agents
const BOT_PATTERNS = [
  "python-requests",
  "curl",
  "wget",
  "scrapy",
  "httpx",
  "axios",
  "postman",
  "insomnia",
];

async function incrementFailCount(hashedIp: string, isPaid: boolean) {
  if (isPaid) return;
  const failCountKey = `fail_count:${hashedIp}`;
  const count = await redis.incr(failCountKey);
  if (count === 1) {
    await redis.expire(failCountKey, 300); // 5 minutes
  }
  if (count > 10) {
    await redis.set(`soft_block:${hashedIp}`, "1", { ex: 600 }); // 10 minutes
  }
}

type RateLimitRefundInfo =
  | { type: "hourly_daily"; hourlyKey: string; dailyKey: string }
  | { type: "anon"; anonKey: string; usedBonus: boolean; userId: string | null }
  | null;

async function refundAtsScanAttempt(info: RateLimitRefundInfo) {
  if (!info) return;
  try {
    if (info.type === "hourly_daily") {
      await redis.decr(info.hourlyKey);
      await redis.decr(info.dailyKey);
    } else {
      await redis.decr(info.anonKey);
      if (info.usedBonus && info.userId) {
        await redis.del(`ats_bonus_scan_used:${info.userId}`);
      }
    }
  } catch (e) {
    console.error("[analyze-cv] Failed to refund rate-limit counter:", e);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    // ✅ Bot detection — block non-browser clients
    const userAgent = req.headers.get("user-agent") || "";
    const isBot = BOT_PATTERNS.some((p) => userAgent.toLowerCase().includes(p));
    if (isBot) {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 403 },
      );
    }

    // ✅ Get IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    // ✅ Compute IP hash for anti-abuse
    const trackingSalt = process.env.TRACKING_SALT || "default_salt";
    const hashedIp = crypto.createHash('sha256').update(ip + trackingSalt).digest('hex');

    // ✅ Get user from DB to check plan
    let dbUser = null;
    if (userId) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, userId),
      });
    }

    const plan = getUserPlan(dbUser);
    const isPaid = plan === "one_time" || plan === "pro";
    const credits = dbUser ? getEffectiveCredits(dbUser) : 0;
    const hasCredits = credits > 0;
    const isExpired = dbUser ? isCreditsExpired(dbUser) : false;
    const hashedToken = await getHashedTrackingToken();

    let rateLimitRefundInfo: RateLimitRefundInfo = null;

    // ✅ Soft-block check for non-paid users
    if (!isPaid) {
      const softBlockKey = `soft_block:${hashedIp}`;
      const isSoftBlocked = await redis.get(softBlockKey);
      if (isSoftBlocked) {
        return NextResponse.json(
          { error: "Accès temporairement bloqué pour activité suspecte." },
          { status: 429 }
        );
      }
    }

    function formatResetMessage(resetMs: number): string {
      const resetDate = new Date(resetMs);
      const diffMinutes = Math.max(1, Math.round((resetMs - Date.now()) / 60000));
      if (diffMinutes < 60) {
        return `dans ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
      }
      const formattedTimeOnly = resetDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
      });
      const isToday = resetDate.toDateString() === new Date().toDateString();
      return isToday ? `aujourd'hui à ${formattedTimeOnly}` : `demain à ${formattedTimeOnly}`;
    }

    if (plan === "one_time" || plan === "pro") {
      const hourlyLimit = plan === "pro" ? 7 : 5;
      const dailyLimit = 15;
      const hourlyKey = `ats_hourly_${plan}_${userId}`;
      const dailyKey = `ats_daily_paid_${userId}`;

      const hourlyCount = await redis.incr(hourlyKey);
      if (hourlyCount === 1) await redis.expire(hourlyKey, 60 * 60);

      const dailyCount = await redis.incr(dailyKey);
      if (dailyCount === 1) await redis.expire(dailyKey, 24 * 60 * 60);

      rateLimitRefundInfo = { type: "hourly_daily", hourlyKey, dailyKey };

      if (!hasCredits || isExpired) {
        await refundAtsScanAttempt(rateLimitRefundInfo);
        return NextResponse.json(
          {
            error: "Vos crédits sont épuisés ou votre plan a expiré. Veuillez renouveler votre abonnement pour continuer.",
            reason: "credits_exhausted",
            isPaid: true
          },
          { status: 402 }
        );
      }

      if (hourlyCount > hourlyLimit) {
        const ttl = await redis.ttl(hourlyKey);
        const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 60 * 60 * 1000));
        return NextResponse.json(
          {
            error: `Limite horaire atteinte (${hourlyLimit} analyses/heure). Veuillez revenir ${formatResetMessage(resetAt.getTime())}.`,
            resetAt: resetAt.toISOString(),
            reason: "hourly_limit_reached",
            isPaid: true
          },
          { status: 429 }
        );
      }

      if (dailyCount > dailyLimit) {
        const ttl = await redis.ttl(dailyKey);
        const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 24 * 60 * 60 * 1000));
        return NextResponse.json(
          {
            error: `Limite quotidienne atteinte (${dailyLimit} analyses/24h). Veuillez revenir ${formatResetMessage(resetAt.getTime())}.`,
            resetAt: resetAt.toISOString(),
            reason: "daily_limit_reached",
            isPaid: true
          },
          { status: 429 }
        );
      }
    } else {
      // Anonymous, free, and trial (free bonus credit) all share the same
      // 3-per-24h cap, keyed by the device's tracking token so switching
      // between anonymous browsing and a free login on the same browser
      // can't be used to reset the count.
      const anonKey = `ats_daily_anon_${hashedToken}`;
      const anonCount = await redis.incr(anonKey);
      if (anonCount === 1) await redis.expire(anonKey, 24 * 60 * 60);

      let usedBonusScan = false;

      if (anonCount > 3) {
        // One-time bonus: the very first time someone logs in, they get one
        // extra scan even if they already used up their 3 anonymous scans on
        // this device. This is a permanent, once-per-account flag — it never
        // touches credits, which stay reserved for AI generation and downloads
        // exactly as they already work today.
        const bonusKey = userId ? `ats_bonus_scan_used:${userId}` : null;
        const bonusAlreadyUsed = bonusKey ? await redis.get(bonusKey) : true;

        if (bonusKey && !bonusAlreadyUsed) {
          await redis.set(bonusKey, "1"); // no expiry — one-time for the life of the account
          usedBonusScan = true;
          // Let this request through as their one-time login bonus scan.
        } else {
          const ttl = await redis.ttl(anonKey);
          const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 24 * 60 * 60 * 1000));
          const message = userId
            ? `Limite d'analyses gratuites atteinte (3 par jour). Veuillez passer à un plan payant pour continuer. Prochaine réinitialisation : ${formatResetMessage(resetAt.getTime())}.`
            : `Limite d'analyses gratuites atteinte (3 par jour). Veuillez vous connecter ou souscrire à un plan pour continuer. Prochaine réinitialisation : ${formatResetMessage(resetAt.getTime())}.`;
          return NextResponse.json(
            {
              error: message,
              resetAt: resetAt.toISOString(),
              reason: userId ? "free_limit_reached" : "anon_limit_reached",
              isPaid: false
            },
            { status: 429 }
          );
        }
      }

      rateLimitRefundInfo = { type: "anon", anonKey, usedBonus: usedBonusScan, userId };
    }

    // ✅ Content-Type check — must be JSON
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      await incrementFailCount(hashedIp, isPaid);
      return NextResponse.json(
        { error: "Format de requête invalide." },
        { status: 400 },
      );
    }

    const body = await req.json();

    // ✅ Validate input strictly
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      await incrementFailCount(hashedIp, isPaid);
      return NextResponse.json(
        { error: "Données invalides.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // const { cvUrl, cvName, profileDescription, jobDescription, jobUrl, guestSessionId, locale } = parsed.data;

    const { cvUrl, cvName, profileDescription, jobDescription: rawJobDescription, jobUrl, guestSessionId, locale } = parsed.data;

    // If the user didn't provide a real job target, fall back to the same
    // "general optimization" marker generateOptimizedCV already checks for —
    // this guarantees every downstream function always receives a real,
    // non-empty string, never undefined.
    const jobDescription =
      rawJobDescription && rawJobDescription.trim().length >= 10
        ? rawJobDescription
        : "Optimisation standard";

    let cvText = "";
    const originalCvUrlForDb = cvUrl || "";

    // ✅ Parse CV
    if (cvUrl) {
      // Verify CV URL is from your own uploadthing storage only
      const allowedHosts = ["utfs.io", "uploadthing.com", "ufs.sh"];
      const cvHostname = new URL(cvUrl).hostname;
      if (!allowedHosts.some((h) => cvHostname.includes(h))) {
        await incrementFailCount(hashedIp, isPaid);
        return NextResponse.json(
          { error: "Source de fichier non autorisée." },
          { status: 400 },
        );
      }

      // Fetch and parse CV
      const response = await fetch(cvUrl);
      const arrayBuffer = await response.arrayBuffer();

      // ✅ File size check — max 10MB
      if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
        await incrementFailCount(hashedIp, isPaid);
        return NextResponse.json(
          { error: "Fichier trop volumineux (max 10MB)." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(arrayBuffer);
      cvText = await parseCVFile(buffer, cvName || cvUrl);
    } else if (profileDescription) {
      cvText = profileDescription;
    }

    if (!cvText || cvText.trim().length < 50) {
      await incrementFailCount(hashedIp, isPaid);
      await refundAtsScanAttempt(rateLimitRefundInfo);
      return NextResponse.json(
        { error: "Ce CV semble contenir du texte non sélectionnable, ce qui arrive souvent avec les exports gratuits ou filigranés des générateurs de CV. Essayez d'exporter votre CV depuis Word ou d'utiliser un PDF sans filigrane." },
        { status: 400 },
      );
    }

    // ✅ Scrape Job Description URL if jobDescription is a URL
    let finalJobDescription = jobDescription;
    let resolvedJobUrl = jobUrl;

    if (jobDescription && isUrl(jobDescription)) {
      console.log("=== API /analyze-cv: SCRAPING JOB URL ===");
      if (!resolvedJobUrl) {
        resolvedJobUrl = jobDescription;
      }
      try {
        finalJobDescription = await scrapeJobDescription(jobDescription);
      } catch (scrapeError: any) {
        console.error("[analyze-cv] Job URL scraping failed:", scrapeError.message);
        await refundAtsScanAttempt(rateLimitRefundInfo);
        return NextResponse.json(
          {
            error: "Nous n'avons pas pu récupérer automatiquement le contenu de cette offre. Collez directement le texte de la description à la place de l'URL.",
            reason: "scraping_failed",
          },
          { status: 422 }
        );
      }
    }

    // ✅ Run AI analysis
    const structuredJobDetails = extractStructuredJobDetails(finalJobDescription);
    const analysisResult = await analyzeCV(
      cvText,
      finalJobDescription,
      structuredJobDetails,
      locale,
    );

    const rawData = await extractRawCVData(cvText);

    if (!rawData) {
      console.error("[analyze-cv] extractRawCVData returned null after all retries — aborting before save, refunding scan attempt.");
      await refundAtsScanAttempt(rateLimitRefundInfo);
      return NextResponse.json(
        {
          error: "Une erreur est survenue lors de l'analyse de votre CV. Veuillez réessayer dans quelques instants.",
          reason: "extraction_failed",
        },
        { status: 503 }
      );
    }

    // ✅ ATS Platform Detection & Evaluation
    const detectedPlatformObj = detectATSPlatform(resolvedJobUrl, finalJobDescription, cvText);
    const detectedPlatform = detectedPlatformObj ? detectedPlatformObj.name : null;

    // Evaluate CV format compatibility
    const compatResult = evaluateCVCompatibility(detectedPlatformObj, cvUrl || "cv.txt");
    if (!compatResult.isCompatible) {
      // Penalize format score by 10 points
      if (analysisResult.scoreBreakdown && analysisResult.scoreBreakdown.format) {
        const originalFormatScore = Number(analysisResult.scoreBreakdown.format.score) || 0;
        analysisResult.scoreBreakdown.format.score = Math.max(0, originalFormatScore - 10);

        // Recalculate total atsScore
        let newTotalScore = 0;
        for (const cat in analysisResult.scoreBreakdown) {
          newTotalScore += Number(analysisResult.scoreBreakdown[cat].score) || 0;
        }
        analysisResult.atsScore = Math.round(newTotalScore);
      }

      // Add compatibility flaws and suggestions
      if (!analysisResult.flaws) analysisResult.flaws = [];
      analysisResult.flaws.push(...compatResult.flaws);

      if (!analysisResult.suggestions) analysisResult.suggestions = [];
      analysisResult.suggestions.push(...compatResult.suggestions);
    }

    console.log("========== [STAGE 6] BEFORE SAVING TO DB ==========");
    console.log("keywordsFound to DB:", analysisResult.keywordsFound);
    console.log("keywordsMissing to DB:", analysisResult.keywordsMissing);
    console.log("===================================================");

    // ✅ Insert Analysis Record into DB
    const [insertedAnalysis] = await db
      .insert(cvAnalyses)
      .values({
        userId: dbUser?.id,
        originalCvUrl: originalCvUrlForDb,
        jobUrl: resolvedJobUrl,
        jobDescription: finalJobDescription,
        atsScore: Math.round(Number(analysisResult.atsScore) || 0),
        scoreBreakdown: analysisResult.scoreBreakdown,
        flaws: analysisResult.flaws,
        suggestions: analysisResult.suggestions,
        keywordsMissing: analysisResult.keywordsMissing,
        keywordsFound: analysisResult.keywordsFound,
        optimizedData: {
          ...rawData,
          _originalCvText: cvText,
        },
        guestSessionId: dbUser ? null : hashedToken,
        status: "completed",
        userName: rawData?.userName || "Candidat",
        jobTitle: rawData?.jobTitle || "Poste Visé",
        detectedPlatform: detectedPlatform,
      })
      .returning({ id: cvAnalyses.id });

    return NextResponse.json({ analysisId: insertedAnalysis.id });
  } catch (error: any) {
    console.error("API /analyze-cv error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
