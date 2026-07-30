export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { cvAnalyses, cvTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveCredits, isUserExpired } from "@/lib/utils/subscription";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { getTemplateOwnership } from "@/lib/billing/template-service";
import { notFound } from "next/navigation";
import TemplateGrid from "@/components/templates/TemplateGrid";
import { auth } from "@clerk/nextjs/server";
import { syncUserWithClerk } from "@/lib/auth/sync";
import { Link } from "@/i18n/routing";
import { PlanType } from "@/lib/billing/get-user-plan";
import { CV_TEMPLATE_STYLES } from "@/lib/cv-template-styles";
import { getHashedTrackingToken } from "@/lib/anonymous-tracking";

// Revert to original unique templates
// const STYLES = [...CV_TEMPLATE_STYLES]; // 28 templates

const STYLES = [
  "Prism",
  ...CV_TEMPLATE_STYLES.filter(style => style !== "Prism")
]; // Garantit que "Rose" est toujours inséré en premier (ID de template #1)

const DEMO_FALLBACK = {
  userName: "Votre Nom",
  jobTitle: "Votre Titre",
  summary: "Ajoutez votre profil professionnel ici.",
  contact: { email: "", phone: "", location: "" },
  experience: [{ title: "Poste", company: "Entreprise", period: "2020–2024", description: "Description de vos responsabilités." }],
  education: [{ degree: "Diplôme", school: "Établissement", year: "2020", details: "" }],
  skills: ["Compétence 1", "Compétence 2"],
  languages: [{ language: "Français", level: "Natif" }],
  projects: [],
};

function getTemplateContent(analysisData: any) {
  let content = { ...(analysisData?.optimizedData || DEMO_FALLBACK) };
  if (typeof content === "string") {
    try { content = JSON.parse(content); } catch { content = DEMO_FALLBACK; }
  }
  if ((content as any)._originalCvText) delete (content as any)._originalCvText;
  return {
    ...content,
    contact: content.contact || DEMO_FALLBACK.contact,
  };
}

async function ensureTemplatesExist(analysisId: string, analysisData: any) {
  const existing = await db.select().from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId));

  const content = getTemplateContent(analysisData);

  if (existing.length === 0) {
    await Promise.all(
      STYLES.map((style, i) =>
        db.insert(cvTemplates).values({
          analysisId,
          templateNumber: i + 1,
          templateStyle: style,
          templateData: content as any,
          isPaid: false,
        })
      )
    );
  } else {
    const existingStyles = new Set(existing.map((t) => t.templateStyle));
    const missing = STYLES.filter((style) => !existingStyles.has(style));
    if (missing.length > 0) {
      const maxNumber = Math.max(...existing.map((t) => t.templateNumber ?? 0));
      await Promise.all(
        missing.map((style, i) =>
          db.insert(cvTemplates).values({
            analysisId,
            templateNumber: maxNumber + i + 1,
            templateStyle: style,
            templateData: content as any,
            isPaid: false,
          })
        )
      );
    }
  }

  return await db.select().from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId));
}

export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; analysisId: string }>;
  searchParams: Promise<{ template?: string; payment?: string }>;
}) {
  const { locale, analysisId } = await params;
  const { template: templateParam, payment } = await searchParams;
  const { userId } = await auth();

  const dbUser = await syncUserWithClerk();

  // const analysisResults = await db.select().from(cvAnalyses).where(eq(cvAnalyses.id, analysisId)).limit(1);
  // const analysis = analysisResults[0];

  // if (!analysis) notFound();

  // const userCredits = dbUser ? getEffectiveCredits(dbUser) : 0;

  const analysisResults = await db.select().from(cvAnalyses).where(eq(cvAnalyses.id, analysisId)).limit(1);
  const analysis = analysisResults[0];

  if (!analysis) notFound();

  // ✅ Ownership check — prevents anyone who merely has this URL (e.g. via
  // a shared link) from viewing another person's CV. A shared link must
  // only work for the person who actually created this analysis.
  if (analysis.userId) {
    if (!dbUser || analysis.userId !== dbUser.id) {
      notFound();
    }
  } else {
    const currentTrackingToken = await getHashedTrackingToken();
    if (!analysis.guestSessionId || analysis.guestSessionId !== currentTrackingToken) {
      notFound();
    }
  }

  const userCredits = dbUser ? getEffectiveCredits(dbUser) : 0;
  const isExpired = dbUser ? isUserExpired(dbUser) : false;
  const plan = getUserPlan(dbUser);

  // Determine if a real ATS analysis was performed (not a quick/blank CV creation).
  // Quick CVs are created with a placeholder jobDescription and no real scoring.
  const hasRealAnalysis = Boolean(
    analysis.jobDescription &&
    analysis.jobDescription !== "Création rapide de CV" &&
    analysis.optimizedData &&
    (analysis.optimizedData as any)._originalCvText
  );

  // const isJustPaid = payment === "success" || searchParams.then(s => s.payment === "success");
  const isJustPaid = payment === "success";

  // ── Fetch templates ───────────────────────────────────────────────────────
  const templates = await ensureTemplatesExist(analysisId, analysis);
  // ✅ Deduplicate templates by style to prevent UI duplication from DB race conditions
  const uniqueTemplates = Array.from(
    new Map(templates.map((t) => [t.templateStyle, t])).values()
  ).sort((a, b) => (a.templateNumber ?? 0) - (b.templateNumber ?? 0));

  const initialTemplate = templateParam ? parseInt(templateParam, 10) : 1;

  // ── Ownership & Watermark Logic ───────────────────────────────────────────
  let ownedTemplateIds = new Set<string>();
  if (dbUser) {
    ownedTemplateIds = await getTemplateOwnership(dbUser.id);
  }

  const hasAvailableCredits = userCredits > 0 && !isExpired;
  const isPlanPaid = plan === 'pro' || plan === 'monthly';
  const hasStructuralAccess = isJustPaid || hasAvailableCredits || isPlanPaid;

  // ✅ Fix: Check if user owns ANY template for this specific analysis
  const ownsAnyInAnalysis = uniqueTemplates.some(t => ownedTemplateIds.has(t.id) || t.isPaid);

  const safeTemplates = uniqueTemplates.map((t) => {
    // Treat as owned if they explicitly own it, OR if they own any template in this analysis, OR if it's marked as paid via AI generation
    const templateOwned = ownedTemplateIds.has(t.id) || ownsAnyInAnalysis || t.isPaid;
    const hideWatermark = templateOwned || hasStructuralAccess;
    return { ...t, hideWatermark };
  });

  // Overall "isPaid" status for the UI banner. 
  const isPaid = hasStructuralAccess || ownsAnyInAnalysis;

  if (analysis.status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 font-bold text-lg">Analyse en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
          <Link
            href={`/results/${analysisId}`}
            locale={locale}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-900">
              Vos Modèles Optimisés
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 hidden sm:block truncate">
              {analysis.jobTitle || "CV Optimisé"} · {safeTemplates.length} modèles disponibles
            </p>
          </div>
          {!isPaid && (
            <div className="shrink-0 hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-black">
              🔒 Filigrane actif — débloquez pour télécharger
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        <TemplateGrid
          templates={safeTemplates}
          isPaid={isPaid}
          userCredits={userCredits}
          isExpired={isExpired}
          analysisId={analysisId}
          analysisData={analysis}
          initialTemplate={initialTemplate}
          plan={plan}
          hasRealAnalysis={hasRealAnalysis}
        />
      </div>
    </div>
  );
}