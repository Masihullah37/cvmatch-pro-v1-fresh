'use server';

import { db } from "@/lib/db";
import { cvAnalyses, cvTemplates, users, userTemplateUnlocks } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { analyzeCV, extractRawCVData, generateOptimizedCV } from "@/lib/ai/ats-analyzer";
import { parseCVFile } from "@/lib/ai/cv-parser";
import { extractStructuredJobDetails, isUrl, scrapeJobDescription } from "@/lib/utils/scraper";
import { addCredits, deductCredit } from "@/lib/billing/credit-service";

import { auth } from "@clerk/nextjs/server";
import { eq, sql, and } from "drizzle-orm";
import { getEffectiveCredits, isCreditsExpired } from "@/lib/utils/subscription";
import { redis } from "@/lib/rate-limit/upstash";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * RULE: Prevent AI Token Waste
 * performCVAnalysis only extracts raw data and ATS score.
 * AI Resume Generation is a separate paid action.
 */

export async function performCVAnalysis(formData: FormData) {

  const { userId } = await auth();
  let dbUserId: string | null = null;

  if (userId) {
    // Resolve/Sync User only if logged in
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        clerkId: userId,
        credits: 0,
      }).returning();
      dbUserId = newUser.id;
    } else {
      dbUserId = dbUser.id;
    }
  }

  const cvFile = formData.get('cvFile') as File | null;
  let jobTitle = formData.get('jobTitle') as string;
  let jobDescription = formData.get('jobDescription') as string;
  const profileDescription = formData.get('profileDescription') as string | null;

  // Validation: We need at least a CV source
  if (!cvFile && !profileDescription) {
    throw new Error("Missing required data: CV file or Profile Description is required.");
  }

  // URL Scraping Logic
  if (jobDescription && isUrl(jobDescription)) {
    console.log("=== DETECTED JOB URL, SCRAPING... ===");
    try {
      const scrapedContent = await scrapeJobDescription(jobDescription);
      console.log(`=== SCRAPING SUCCESS: ${scrapedContent.length} chars extracted ===`);
      console.log("=== SCRAPED PREVIEW ===", scrapedContent.substring(0, 500));
      jobDescription = scrapedContent;
    } catch (err: any) {
      console.warn("=== URL SCRAPING FAILED ===", err.message);
      return {
        success: false,
        error: "Impossible d'extraire le contenu de l'URL fournie. Veuillez copier-coller la description du poste manuellement."
      };
    }
  }

  // Fallback for missing job info
  if (!jobTitle || jobTitle.trim() === "") {
    jobTitle = "Optimisation Générale";
  }
  if (!jobDescription || jobDescription.trim() === "") {
    jobDescription = "Profil professionnel général et polyvalent. Optimisation standard basée sur les meilleures pratiques du marché.";
  }

  let cvText = "";

  if (cvFile && cvFile.size > 0) {
    // Option A: Parse CV from file
    const buffer = Buffer.from(await cvFile.arrayBuffer());
    cvText = await parseCVFile(buffer, cvFile.name);
    console.log("=== CV TEXT PARSED FROM FILE ===");
  } else if (profileDescription) {
    // Option B: Use Profile Description directly
    cvText = profileDescription;
    console.log("=== PROFILE DESCRIPTION USED AS SOURCE ===");
  }

  if (!cvText || cvText.trim().length < 50) {
    throw new Error("Input source is too short or could not be parsed. Please provide more details.");
  }

  console.log("Length:", cvText.length);
  console.log("First 300 chars:", cvText.substring(0, 300));

  const structuredJobDetails = extractStructuredJobDetails(jobDescription);
  if (jobTitle === "Optimisation Générale" && structuredJobDetails.title) {
    jobTitle = structuredJobDetails.title;
  }

  // 1. Analyze ATS
  const analysisResult = await analyzeCV(cvText, jobDescription, structuredJobDetails);

  // 2. Extract Raw CV Data (Rule: Never generate AI content for unpaid users)
  const rawData = await extractRawCVData(cvText);

  // 3. Create Analysis Record
  let newAnalysis: typeof cvAnalyses.$inferSelect;
  
  // ✅ ATS Platform Detection
  const atsKeywords = [
    "Workday",
    "Taleo",
    "Greenhouse",
    "Lever",
    "ICIMS",
    "SmartRecruiters",
    "BambooHR"
  ];
  
  let detectedPlatform = null;
  const combinedText = `${jobDescription} ${cvText}`;
  
  for (const keyword of atsKeywords) {
    if (combinedText.toLowerCase().includes(keyword.toLowerCase())) {
      detectedPlatform = keyword;
      break;
    }
  }

  try {
    const result = await db.insert(cvAnalyses).values({
      userId: dbUserId, // Associate with DB user
      status: 'completed',
      atsScore: Math.round(Number(analysisResult.atsScore) || 0),
      scoreBreakdown: analysisResult.scoreBreakdown,
      flaws: analysisResult.flaws,
      suggestions: analysisResult.suggestions,
      keywordsFound: analysisResult.keywordsFound,
      keywordsMissing: analysisResult.keywordsMissing,
      userName: rawData?.userName || "Candidat",
      jobTitle: jobTitle || "Poste Visé",
      jobDescription: jobDescription,
      optimizedData: {
        ...rawData,
        _originalCvText: cvText, // Store raw text inside JSON to avoid schema changes
      },
      // @ts-ignore
      detectedPlatform: detectedPlatform,
    }).returning();
    newAnalysis = result[0];
  } catch (dbError: any) {
    console.error("=== DB INSERT ERROR ===");
    throw new Error(`Database insert failed: ${dbError?.message ?? 'Unknown DB error'}`);
  }

  revalidatePath('/[locale]/results/[id]', 'page');
  return newAnalysis.id;
}

/**
 * RULE: Credit Deduction Logic (Trigger 1)
 * Deducts 1 credit to generate an AI-optimized resume.
 * Incorporates missing points and suggestions into existing content.
 */
export async function generateAIResume(analysisId: string, currentCVData?: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new Error("Utilisateur introuvable.");
  }

  if (isCreditsExpired(dbUser)) throw new Error("EXPIRED: Votre plan a expiré.");
  if (getEffectiveCredits(dbUser) < 1) throw new Error("Crédits insuffisants.");

  const analysis = await db.query.cvAnalyses.findFirst({
    where: eq(cvAnalyses.id, analysisId),
  });

  if (!analysis) throw new Error("Analyse introuvable.");

  // Wrap deduction + AI generation in a transaction for atomicity.
  // If AI fails, the credit deduction is rolled back automatically.
  let finalData: any;

  await db.transaction(async (tx) => {
    // 1. Deduct 1 credit via the credit service (validates balance inside tx)
    await deductCredit({
      userId: dbUser.id,
      amount: 1,
      reason: "ai_generation",
      referenceId: analysisId,
      tx,
    });

    // 2. Perform AI Optimization outside the transaction (network I/O)
    //    We intentionally do this after the deduction; if AI fails we throw
    //    which rolls back the whole transaction.
    const cvSource = currentCVData ? JSON.stringify(currentCVData) : (analysis.optimizedData as any)?._originalCvText || "";
    const structuredJobDetails = extractStructuredJobDetails(analysis.jobDescription || "");

    const aiResult = await generateOptimizedCV(
      cvSource,
      analysis.jobDescription || "",
      {
        atsScore: analysis.atsScore,
        scoreBreakdown: analysis.scoreBreakdown,
        flaws: analysis.flaws,
        suggestions: analysis.suggestions,
        keywordsMissing: analysis.keywordsMissing,
        keywordsFound: analysis.keywordsFound,
      } as any,
      structuredJobDetails
    );

    // RULE: Prevent AI from adding extra sections not present in user editor
    let result = aiResult;
    if (currentCVData && typeof aiResult === 'object' && aiResult !== null) {
      const filteredResult: any = {};
      Object.keys(currentCVData).forEach(key => {
        filteredResult[key] = aiResult[key] !== undefined ? aiResult[key] : currentCVData[key];
      });
      result = filteredResult;
    }
    finalData = result;

    // 3. Persist AI-generated data within the same transaction
    await tx.update(cvAnalyses)
      .set({ optimizedData: finalData })
      .where(eq(cvAnalyses.id, analysisId));

    const existingTemplates = await tx.query.cvTemplates.findMany({
      where: eq(cvTemplates.analysisId, analysisId)
    });

    if (existingTemplates.length > 0) {
      await tx.update(cvTemplates)
        .set({ templateData: finalData, isPaid: true })
        .where(eq(cvTemplates.analysisId, analysisId));
    } else {
      const { CV_TEMPLATE_STYLES } = await import("@/lib/cv-template-styles");
      const styles = [...CV_TEMPLATE_STYLES];
      await tx.insert(cvTemplates).values(
        styles.map((style, i) => ({
          analysisId: analysis.id,
          templateNumber: i + 1,
          templateStyle: style,
          templateData: finalData as any,
          isPaid: true,
        }))
      );
    }
  });

  revalidatePath('/[locale]/results/[id]', 'page');
  revalidatePath('/[locale]/templates/[id]', 'page');

  return { success: true };
}

/**
 * RULE: Credit Deduction Logic — Per-Template Ownership
 * Trigger: User clicks Télécharger (Download) for the first time on a specific template.
 * Action: Deduct 1 credit, record ownership in user_template_unlocks, mark template as paid.
 * Subsequent downloads of the same template are FREE (ownership check prevents re-deduction).
 *
 * NOTE: Template selection/preview/editing is always 0 credits.
 */
export async function deductCreditForTemplate(templateId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) throw new Error("Utilisateur introuvable.");
  if (isCreditsExpired(dbUser)) throw new Error("EXPIRED: Votre plan a expiré.");
  if (getEffectiveCredits(dbUser) < 1) throw new Error("Crédits insuffisants.");

  const template = await db.query.cvTemplates.findFirst({
    where: eq(cvTemplates.id, templateId),
  });

  if (!template) throw new Error("Modèle introuvable.");

  // Run the entire flow atomically
  await db.transaction(async (tx) => {
    // 1. Check ownership INSIDE the transaction to prevent race conditions
    const existingUnlock = await tx.query.userTemplateUnlocks.findFirst({
      where: and(
        eq(userTemplateUnlocks.userId, dbUser.id),
        eq(userTemplateUnlocks.templateId, templateId)
      ),
    });

    // Already owns it — no deduction needed
    if (existingUnlock) return;

    // 2. Deduct 1 credit via credit service
    await deductCredit({
      userId: dbUser.id,
      amount: 1,
      reason: "manual_download",
      referenceId: templateId,
      tx,
    });

    // 3. Record ownership
    await tx.insert(userTemplateUnlocks).values({
      userId: dbUser.id,
      templateId,
    });

    // 4. Keep isPaid flag in sync for backward compatibility
    await tx.update(cvTemplates)
      .set({ isPaid: true })
      .where(eq(cvTemplates.id, templateId));
  });

  revalidatePath('/[locale]/templates/[id]', 'page');
  return { success: true };
}

/**
 * @deprecated Use deductCreditForTemplate(templateId) instead.
 * Kept for backward compatibility with TemplateGrid.tsx until migration is complete.
 */
export async function deductCreditForAnalysis(analysisId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) throw new Error("Utilisateur introuvable.");
  if (isCreditsExpired(dbUser)) throw new Error("EXPIRED: Votre plan a expiré.");
  if (getEffectiveCredits(dbUser) < 1) throw new Error("Crédits insuffisants.");

  const analysis = await db.query.cvAnalyses.findFirst({
    where: eq(cvAnalyses.id, analysisId)
  });

  if (!analysis) throw new Error("Analyse introuvable.");

  // Check if already paid at analysis level (legacy)
  const existingPaidTemplate = await db.query.cvTemplates.findFirst({
    where: and(eq(cvTemplates.analysisId, analysisId), eq(cvTemplates.isPaid, true))
  });

  if (existingPaidTemplate) return { success: true, alreadyPaid: true };

  // For legacy compatibility: deduct 1 credit and mark all templates in the analysis as paid
  await db.transaction(async (tx) => {
    await deductCredit({
      userId: dbUser.id,
      amount: 1,
      reason: "manual_download",
      referenceId: analysisId,
      tx,
    });

    const existingTemplates = await tx.query.cvTemplates.findMany({
      where: eq(cvTemplates.analysisId, analysisId)
    });

    if (existingTemplates.length === 0) {
      const { CV_TEMPLATE_STYLES } = await import("@/lib/cv-template-styles");
      const styles = [...CV_TEMPLATE_STYLES];
      await tx.insert(cvTemplates).values(
        styles.map((style, i) => ({
          analysisId,
          templateNumber: i + 1,
          templateStyle: style,
          templateData: analysis.optimizedData as any,
          isPaid: true,
        }))
      );
    } else {
      await tx.update(cvTemplates)
        .set({ isPaid: true })
        .where(eq(cvTemplates.analysisId, analysisId));

      // Also record individual ownership for each template
      await tx.insert(userTemplateUnlocks).values(
        existingTemplates.map((t) => ({
          userId: dbUser.id,
          templateId: t.id,
        }))
      ).onConflictDoNothing();
    }
  });

  revalidatePath('/[locale]/templates/[id]', 'page');
  return { success: true };
}

export async function generateRewritePreview(analysisId: string, currentCVData: any) {
  const { userId } = await auth();
  
  let dbUser = null;
  if (userId) {
    dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
  }

  const plan = getUserPlan(dbUser);
  const trackingSalt = process.env.TRACKING_SALT || "default_salt";
  
  let userIdentifier = userId || "anonymous";
  let retryKey = `ai_rewrite_retry_${userIdentifier}`;
  
  const cookieStore = await cookies();
  const trackToken = cookieStore.get('_cvb_track')?.value;
  const hashedToken = trackToken ? crypto.createHash('sha256').update(trackToken + trackingSalt).digest('hex') : "anon_fallback";

  if (!userId) {
    userIdentifier = hashedToken;
    retryKey = `ai_rewrite_retry_${hashedToken}`;
  }

  // 1. Check Retry Window
  const hasRetry = await redis.get(retryKey);
  if (hasRetry) {
    console.log("=== BYPASSING LIMITS (RETRY WINDOW) ===");
  } else {
    // Check limits if not in retry window
    if (plan === "free") {
      // @ts-ignore - ai_rewrites_used will be added to schema
      if (dbUser && dbUser.ai_rewrites_used >= 3) {
        throw new Error("Limite de modifications atteinte pour le plan gratuit.");
      }
    } else if (plan === "anonymous") {
      const anonCount = await redis.get(`ai_rewrite_anon_${hashedToken}`);
      if (anonCount && Number(anonCount) >= 1) {
        throw new Error("Limite de modifications atteinte pour les invités.");
      }
    } else if (plan === "trial") {
      const trialKey = `ai_rewrite_trial_${userId}`;
      const count = await redis.get(trialKey);
      if (count && Number(count) >= 5) {
        throw new Error("Limite horaire atteinte (5/heure).");
      }
    } else if (plan === "pro") {
      const proKey = `ai_rewrite_pro_${userId}`;
      const count = await redis.get(proKey);
      if (count && Number(count) >= 7) {
        throw new Error("Limite horaire atteinte (7/heure).");
      }
    }
  }

  const analysis = await db.query.cvAnalyses.findFirst({
    where: eq(cvAnalyses.id, analysisId),
  });

  if (!analysis) throw new Error("Analyse introuvable.");

  // Generate AI Rewrite
  const cvSource = JSON.stringify(currentCVData);
  const structuredJobDetails = extractStructuredJobDetails(analysis.jobDescription || "");

  const aiResult = await generateOptimizedCV(
    cvSource,
    analysis.jobDescription || "",
    {
      atsScore: analysis.atsScore,
      scoreBreakdown: analysis.scoreBreakdown,
      flaws: analysis.flaws,
      suggestions: analysis.suggestions,
      keywordsMissing: analysis.keywordsMissing,
      keywordsFound: analysis.keywordsFound,
    } as any,
    structuredJobDetails
  );

  // Validation
  if (typeof aiResult !== 'object' || aiResult === null) {
    throw new Error("Erreur de génération AI. Veuillez réessayer.");
  }
  
  // Check for blank entries or hallucinated segments (basic check)
  const hasBlank = Object.values(aiResult).some(val => val === "" || val === null || val === undefined);
  if (hasBlank) {
    throw new Error("Génération AI incomplète. Veuillez réessayer.");
  }

  // Set Retry Token (TTL 5 mins)
  await redis.set(retryKey, "1", { ex: 300 });

  // Increment counts if NOT in retry window and NOT trial/pro (who are just rate limited on generation)
  if (!hasRetry) {
    if (plan === "trial") {
      const trialKey = `ai_rewrite_trial_${userId}`;
      await redis.incr(trialKey);
      await redis.expire(trialKey, 3600); // 1 hour
    } else if (plan === "pro") {
      const proKey = `ai_rewrite_pro_${userId}`;
      await redis.incr(proKey);
      await redis.expire(proKey, 3600); // 1 hour
    }
  }

  return aiResult;
}

export async function acceptRewrite(analysisId: string) {
  const { userId } = await auth();
  
  let dbUser = null;
  if (userId) {
    dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
  }

  const plan = getUserPlan(dbUser);
  const trackingSalt = process.env.TRACKING_SALT || "default_salt";
  
  const cookieStore = await cookies();
  const trackToken = cookieStore.get('_cvb_track')?.value;
  const hashedToken = trackToken ? crypto.createHash('sha256').update(trackToken + trackingSalt).digest('hex') : "anon_fallback";

  // Increment Timing: Only add to the count after the user reviews the preview output and explicitly clicks the "Accept" action.
  if (plan === "free" && dbUser) {
    await db.update(users)
      // @ts-ignore - ai_rewrites_used will be added to schema
      .set({ ai_rewrites_used: (dbUser.ai_rewrites_used || 0) + 1 })
      .where(eq(users.id, dbUser.id));
  } else if (plan === "anonymous") {
    const anonKey = `ai_rewrite_anon_${hashedToken}`;
    await redis.incr(anonKey);
    await redis.expire(anonKey, 30 * 24 * 3600); // 30 days
  }

  return { success: true };
}

export async function createQuickCVAnalysis() {
  const { userId } = await auth();
  let dbUserId: string | null = null;

  if (userId) {
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        clerkId: userId,
        credits: 0,
      }).returning();
      dbUserId = newUser.id;
    } else {
      dbUserId = dbUser.id;
    }
  }

  const DEMO_FALLBACK = {
    userName: "Votre Nom",
    jobTitle: "Votre Titre",
    summary: "Ajoutez votre profil professionnel ici.",
    contact: { email: "", phone: "", location: "" },
    experience: [{ title: "Poste", company: "Entreprise", period: "2020–2024", description: "Description de vos responsabilités." }],
    education: [{ degree: "Diplôme", school: "Établissement", year: "2020", details: "" }],
    skills: ["Compétence 1", "Compétence 2"],
    languages: [{ language: "Français", level: "Natif" }],
    projects: []
  };

  const [newAnalysis] = await db.insert(cvAnalyses).values({
    userId: dbUserId,
    status: 'completed',
    atsScore: 0,
    userName: "Votre Nom",
    jobTitle: "Votre Titre",
    jobDescription: "Création rapide de CV",
    optimizedData: DEMO_FALLBACK,
  }).returning();

  return newAnalysis.id;
}
