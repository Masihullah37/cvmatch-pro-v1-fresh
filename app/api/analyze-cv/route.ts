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
  jobDescription: z.string().min(10),
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
    // const isPaid = plan === "trial" || plan === "pro" || plan === "one_time";
    // const credits = dbUser ? getEffectiveCredits(dbUser) : 0;
    // const hasCredits = credits > 0;
    // const isExpired = dbUser ? isCreditsExpired(dbUser) : false;

    // // ✅ Soft-block check for non-paid users
    // if (!isPaid) {
    //   const softBlockKey = `soft_block:${hashedIp}`;
    //   const isSoftBlocked = await redis.get(softBlockKey);
    //   if (isSoftBlocked) {
    //     return NextResponse.json(
    //       { error: "Accès temporairement bloqué pour activité suspecte." },
    //       { status: 429 }
    //     );
    //   }
    // }

    // // ✅ SECURE NATIVE REDIS RATE LIMITS (No high-level wrappers)
    // let limit = 3;
    // let redisKey = "";
    // const hashedToken = await getHashedTrackingToken();

    // if (isPaid) {
    //   limit = 10;
    //   redisKey = `ats_daily_paid_${userId}`;
    // } else if (plan === "free") {
    //   limit = 3;
    //   redisKey = `ats_daily_free_${userId || "unknown"}`;
    // } else { // anonymous
    //   limit = 3;
    //   redisKey = `ats_daily_anon_${hashedToken}`;
    // }

    // // Check if the anonymous token key is already exhausted for free/anon users
    // // to prevent logging out to bypass limits on the same device.
    // if (!isPaid) {
    //   const anonKey = `ats_daily_anon_${hashedToken}`;
    //   const anonCount = Number(await redis.get(anonKey)) || 0;
    //   if (anonCount >= 3) {
    //     return NextResponse.json(
    //       {
    //         error: "Limite d'analyses gratuites atteinte (3 par jour). Veuillez passer à un plan payant pour continuer.",
    //         resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    //       },
    //       { status: 429 }
    //     );
    //   }
    // }

    // const count = await redis.incr(redisKey);
    // if (count === 1) {
    //   await redis.expire(redisKey, 24 * 60 * 60); // 24 hours
    // }

    // // Sync the anonymous tracking token key for free users
    // if (plan === "free") {
    //   const anonKey = `ats_daily_anon_${hashedToken}`;
    //   const anonCount = await redis.incr(anonKey);
    //   if (anonCount === 1) {
    //     await redis.expire(anonKey, 24 * 60 * 60);
    //   }
    // }

    // const ttl = await redis.ttl(redisKey);
    // const resetTime = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    // const resetDate = new Date(resetTime);
    // const resetAt = resetDate.toISOString();

    // // Format reset time for French display (Europe/Paris)
    // const formattedTimeOnly = resetDate.toLocaleTimeString('fr-FR', {
    //   hour: '2-digit',
    //   minute: '2-digit',
    //   timeZone: 'Europe/Paris'
    // });
    // const formattedTime = `demain à ${formattedTimeOnly}`;

    // if (count > limit) {
    //   if (isPaid) {
    //     if (!hasCredits || isExpired) {
    //       return NextResponse.json(
    //         {
    //           error: "Vos crédits sont épuisés ou votre plan a expiré. Veuillez renouveler votre abonnement pour continuer.",
    //           resetAt,
    //           reason: "credits_exhausted",
    //           isPaid: true
    //         },
    //         { status: 402 }
    //       );
    //     }
    //     return NextResponse.json(
    //       {
    //         error: `Limite quotidienne atteinte (10 analyses). Pour des raisons de sécurité, nous limitons l'usage intensif. Veuillez revenir ${formattedTime}.`,
    //         resetAt,
    //         reason: "rate_limit_reached",
    //         isPaid: true
    //       },
    //       { status: 429 }
    //     );
    //   } else if (plan === "free") {
    //     return NextResponse.json(
    //       {
    //         error: `Limite d'analyses gratuites atteinte (3 par jour). Veuillez passer à un plan payant pour continuer. Prochaine réinitialisation : ${formattedTime}.`,
    //         resetAt,
    //         reason: "free_limit_reached",
    //         isPaid: false
    //       },
    //       { status: 429 }
    //     );
    //   } else {
    //     return NextResponse.json(
    //       {
    //         error: `Limite d'analyses gratuites atteinte (3 par jour). Veuillez vous connecter ou souscrire à un plan pour continuer. Prochaine réinitialisation : ${formattedTime}.`,
    //         resetAt,
    //         reason: "anon_limit_reached",
    //         isPaid: false
    //       },
    //       { status: 429 }
    //     );
    //   }
    // }

    // // Check credits before proceeding for paid users
    // if (isPaid && (!hasCredits || isExpired)) {
    //   return NextResponse.json(
    //     {
    //       error: "Crédits insuffisants. Veuillez renouveler votre plan pour continuer.",
    //       reason: "credits_exhausted",
    //       isPaid: true
    //     },
    //     { status: 402 }
    //   );
    // }

    // Rate-limit tiers:
    //   anonymous / free / trial (unpaid, incl. the 1 free bonus credit) → 3 per 24h,
    //     plus a one-time-ever extra scan on a user's first login if they've
    //     already used up their 3 anonymous scans on this device.
    //   one_time (credit pack)                                            → 5/hour AND 15/24h
    //   pro (active subscription)                                         → 7/hour AND 15/24h
    const isPaid = plan === "one_time" || plan === "pro";
    const credits = dbUser ? getEffectiveCredits(dbUser) : 0;
    const hasCredits = credits > 0;
    const isExpired = dbUser ? isCreditsExpired(dbUser) : false;
    const hashedToken = await getHashedTrackingToken();

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

      if (!hasCredits || isExpired) {
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

    const { cvUrl, cvName, profileDescription, jobDescription, jobUrl, guestSessionId, locale } = parsed.data;

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
      return NextResponse.json(
        { error: "Le contenu du CV ou du profil est trop court pour être analysé." },
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
      finalJobDescription = await scrapeJobDescription(jobDescription);
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
        // guestSessionId: guestSessionId,
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

