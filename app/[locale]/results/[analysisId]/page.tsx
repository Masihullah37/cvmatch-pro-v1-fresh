export const dynamic = "force-dynamic";
export const revalidate = 0;
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cvAnalyses, cvTemplates, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ATSScoreCard from "@/components/results/ATSScoreCard";
import ScoreBreakdown from "@/components/results/ScoreBreakdown";
import FlawsList from "@/components/results/FlawsList";
import ImprovementSuggestions from "@/components/results/ImprovementSuggestions";
import UnlockButton from "@/components/results/UnlockButton";
import { Link } from "@/i18n/routing";
import { ArrowRight, Sparkles, Target, TrendingUp } from "lucide-react";
import PaymentSync from "@/components/results/PaymentSync";
import DemoTemplateCarousel from "@/components/results/DemoTemplateCarousel";
import OuiCVLoader from "@/components/common/OuiCVLoader";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; analysisId: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { locale, analysisId } = await params;
  const { payment } = await searchParams;

  const { userId } = await auth();
  const isGuest = !userId;

  const analysis = await db.query.cvAnalyses.findFirst({
    where: eq(cvAnalyses.id, analysisId),
  });
  if (!analysis) notFound();

  const dbUser = userId
    ? await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    : null;

  const userCredits = dbUser?.credits || 0;

  const existingTemplates = await db.query.cvTemplates.findMany({
    where: eq(cvTemplates.analysisId, analysisId),
  });

  const isPaid = existingTemplates.some(t => t.isPaid);
  const isTeaser = false; // Full results always visible

  if (analysis.status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-8 p-8">
          <OuiCVLoader size="lg" />
          <p className="text-slate-400 text-sm mt-4">Rafraîchissez dans quelques secondes.</p>
        </div>
      </div>
    );
  }

  const redirectToParam = encodeURIComponent(`/${locale}/results/${analysisId}`);
  // const score = analysis.atsScore || 0;
  // const scoreColor = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';
  // const scoreBg = score >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  const hasATSAnalysis =
    analysis.detectedPlatform !== "manual_cv_creation";


  const score = hasATSAnalysis
    ? analysis.atsScore || 0
    : 0;


  const scoreColor = hasATSAnalysis
    ? (
      score >= 70
        ? 'text-emerald-500'
        : score >= 40
          ? 'text-amber-500'
          : 'text-red-500'
    )
    : 'text-slate-300';


  const scoreBg = hasATSAnalysis
    ? (
      score >= 70
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : score >= 40
          ? 'bg-amber-500/10 border-amber-500/20'
          : 'bg-red-500/10 border-red-500/20'
    )
    : 'bg-slate-100 border-slate-200';

  return (
    <div className="min-h-screen bg-slate-50">
      {payment === "success" && !isPaid && <PaymentSync analysisId={analysisId} />}

      {/* Header bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900">Résultats de l'Analyse ATS</h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5 hidden sm:block">
              {analysis.jobTitle || "Analyse CV"}
            </p>
          </div>
          {isPaid ? (
            <Link
              href={{ pathname: "/templates/" + analysisId }}
              locale={locale}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all shrink-0"
            >
              Voir mes CVs
            </Link>
          ) : !isGuest ? (
            // <UnlockButton analysisId={analysisId} credits={userCredits} isGuest={isGuest} />

            <UnlockButton
              analysisId={analysisId}
              credits={userCredits}
              isGuest={isGuest}
            >
              <Link
                href={{ pathname: "/templates/" + analysisId, query: { template: 1 } }}
                locale={locale}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 px-6 py-4 rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                <Sparkles size={18} />
                Personnaliser mon CV
              </Link>
            </UnlockButton>
          ) : (
            <Link
              href={{ pathname: "/sign-in", query: { redirectTo: redirectToParam } }}
              locale={locale}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all shrink-0"
            >
              Se connecter <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8"> */}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Score hero banner */}
        <div className={`rounded-3xl border p-6 md:p-8 ${scoreBg} flex flex-col md:flex-row items-center gap-6`}>
          <div className="text-center md:text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Score ATS Global</p>
            {/* <div className={`text-7xl md:text-8xl font-black ${scoreColor} leading-none`}>{score}</div> */}
            <div className={`text-7xl md:text-8xl font-black ${scoreColor} leading-none`}>
              {hasATSAnalysis ? score : 0}
            </div>
            <div className={`text-2xl font-black ${scoreColor}`}>/ 100</div>
          </div>
          {/* <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {[
              { label: 'Mots-clés', icon: Target, value: `${(analysis.keywordsFound as string[])?.length || 0} trouvés` },
              { label: 'Manquants', icon: TrendingUp, value: `${(analysis.keywordsMissing as string[])?.length || 0} keywords` },
              { label: 'Suggestions', icon: Sparkles, value: `${(analysis.suggestions as string[])?.length || 0} points` },
            ].map(stat => (
              <div key={stat.label} className="bg-white/60 backdrop-blur rounded-2xl p-4 text-center border border-white/80">
                <stat.icon size={18} className="mx-auto mb-2 text-slate-400" />
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div> */}

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {[
              {
                label: 'Mots-clés',
                icon: Target,
                value: hasATSAnalysis
                  ? `${(analysis?.keywordsFound as string[])?.length || 0} trouvés`
                  : "0"
              },
              {
                label: 'Manquants',
                icon: TrendingUp,
                value: hasATSAnalysis
                  ? `${(analysis?.keywordsMissing as string[])?.length || 0} keywords`
                  : "0"
              },
              {
                label: 'Suggestions',
                icon: Sparkles,
                value: hasATSAnalysis
                  ? `${(analysis?.suggestions as string[])?.length || 0} points`
                  : "0"
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white/60 backdrop-blur rounded-2xl p-4 text-center border border-white/80">
                <stat.icon size={18} className="mx-auto mb-2 text-slate-400" />
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              {/* <ATSScoreCard score={score} /> */}
              {hasATSAnalysis && (
                <ATSScoreCard score={score} />
              )}
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              {/* <ScoreBreakdown breakdown={analysis.scoreBreakdown} /> */}
              {hasATSAnalysis && (
                <ScoreBreakdown breakdown={analysis.scoreBreakdown} />
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Flaws */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              {/* <FlawsList flaws={(analysis.flaws as string[]) || []} isGated={isTeaser} /> */}
              {hasATSAnalysis && (
                <FlawsList
                  flaws={(analysis.flaws as string[]) || []}
                  isGated={isTeaser}
                />
              )}
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              {/* <ImprovementSuggestions suggestions={(analysis.suggestions as string[]) || []} isGated={isTeaser} /> */}
              {hasATSAnalysis && (
                <ImprovementSuggestions
                  suggestions={(analysis.suggestions as string[]) || []}
                  isGated={isTeaser}
                />
              )}
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Target size={18} className="text-primary" />
                Analyse des Mots-clés
              </h3>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Mots-clés trouvés ({(analysis.keywordsFound as string[])?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(analysis.keywordsFound as string[])?.map((kw, i) => (
                    <span key={i} className="bg-emerald-500/10 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/20">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Mots-clés manquants ({(analysis.keywordsMissing as string[])?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(analysis.keywordsMissing as string[])?.map((kw, i) => (
                    <span key={i} className="bg-red-500/10 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/20">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="mt-20 border-t border-slate-200">
        <DemoTemplateCarousel analysisId={analysisId} />
      </div>
    </div>
  );
}