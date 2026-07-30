'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Sparkles, AlertCircle, X, Lock, Zap } from 'lucide-react';

interface AnalyzeButtonProps {
  cvFile: File | null;
  cvUrl: string;
  jobTitle: string;
  jobDescription: string;
  profileDescription?: string;
  onScrapeError?: (message: string | null) => void;
}

export default function AnalyzeButton({
  cvFile,
  cvUrl,
  jobTitle,
  jobDescription,
  profileDescription,
  onScrapeError
}: AnalyzeButtonProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [showGeneralModeConfirm, setShowGeneralModeConfirm] = useState(false);

  // Derive intent from jobDescription — drives label, sub-tag, modal copy, status text
  const hasJobTarget = jobDescription && jobDescription.trim().length >= 10;

  // Auto-clear error after 8 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAnalyze = async () => {
    setError(null);

    // Validation: We need either a CV file or a Profile Description
    if (!cvFile && !cvUrl && (!profileDescription || profileDescription.trim().length < 50)) {
      setError('Veuillez importer un CV ou décrire votre profil avec plus de détails (min. 50 caractères).');
      return;
    }

    // If no real job target was provided, show a soft confirmation before proceeding
    if (!hasJobTarget) {
      setShowGeneralModeConfirm(true);
      return;
    }

    await runAnalysis();
  };

  const runAnalysis = async () => {
    setShowGeneralModeConfirm(false);
    setIsAnalyzing(true);
    try {
      let finalCvUrl = cvUrl;
      let finalCvName = cvFile ? cvFile.name : undefined;

      // 1. If cvFile is uploaded locally, upload it to Uploadthing first
      if (cvFile) {
        const { uploadFiles } = await import('@/lib/uploadthing');
        const res = await uploadFiles('cvUploader', {
          files: [cvFile],
        });
        if (res && res[0]) {
          finalCvUrl = res[0].ufsUrl;
          finalCvName = res[0].name;
        } else {
          throw new Error("Erreur lors de l'envoi du CV. Veuillez réessayer.");
        }
      }

      // 2. Make standard application/json fetch request directly to /api/analyze-cv
      const payload = {
        cvUrl: finalCvUrl || undefined,
        cvName: finalCvName || undefined,
        profileDescription: profileDescription || undefined,
        jobTitle: jobTitle || undefined,
        jobDescription: jobDescription,
        locale: locale,
      };

      const response = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          setLimitMessage(data.error || 'Quota atteint.');
          setIsPaidUser(data.isPaid || false);
          setLimitReason(data.reason || null);
          setIsLimitModalOpen(true);
          setIsAnalyzing(false);
          return;
        }

        if (data.reason === 'scraping_failed' && onScrapeError) {
          onScrapeError(data.error);
          setIsAnalyzing(false);
          return;
        }

        throw new Error(data.error || data.message || "Une erreur est survenue lors de l'analyse.");
      }

      if (data && data.analysisId) {
        sessionStorage.setItem(`ats_completed_${data.analysisId}`, 'true');
        router.push(`/${locale}/results/${data.analysisId}`);
      } else {
        throw new Error("ID d'analyse manquant dans la réponse.");
      }
    } catch (err: any) {
      console.error('Analysis failed', err);
      setError(err.message || 'Une erreur inattendue est survenue. Veuillez réessayer.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 relative">

      {/* ── Error toast ──────────────────────────────────────── */}
      {error && (
        <div className="absolute -top-36 w-full max-w-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500 z-50 px-1">
          <div className="bg-red-50 border-2 border-red-100 p-4 sm:p-5 rounded-[2rem] shadow-2xl shadow-red-200/50 flex items-start gap-3 sm:gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <button
                onClick={() => setError(null)}
                className="p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2.5 sm:p-3 bg-red-100 rounded-2xl text-red-500 shrink-0">
              <AlertCircle size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1 pr-6">
              <p className="font-black text-red-900 text-xs sm:text-sm tracking-tight uppercase">
                Oups ! Action requise
              </p>
              <p className="text-red-700/80 text-xs sm:text-sm font-medium leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main CTA button ──────────────────────────────────── */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="group relative flex flex-col items-center justify-center gap-0.5 w-full max-w-[500px] h-[68px] sm:h-[80px] rounded-2xl sm:rounded-[2.5rem] shadow-2xl transition-all bg-primary text-white hover:bg-emerald-600 hover:scale-[1.03] hover:shadow-emerald-500/30 active:scale-95 duration-200 shadow-emerald-500/20 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden px-4"
      >
        {isAnalyzing ? (
          /* ── Pink progress circle ─────────────────────────── */
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin shrink-0"
              width="32"
              height="32"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
            >
              {/* Track ring */}
              <circle
                cx="18" cy="18" r="14"
                stroke="#fce7f3"
                strokeWidth="3.5"
              />
              {/* Animated arc */}
              <circle
                cx="18" cy="18" r="14"
                stroke="#ec4899"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="52 36"
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
              />
            </svg>
            <span className="text-sm sm:text-base font-black tracking-tight text-white/90">
              {hasJobTarget ? 'Analyse en cours…' : 'Optimisation en cours…'}
            </span>
          </div>
        ) : (
          /* ── Adaptive label ───────────────────────────────── */
          <>
            {hasJobTarget ? (
              /* Mode 1: ATS scan + optimisation */
              <>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Sparkles
                    size={20}
                    className="shrink-0 sm:w-6 sm:h-6 group-hover:animate-pulse"
                  />
                  <span className="text-base sm:text-xl font-black tracking-tight leading-none">
                    Analyser &amp; Optimiser mon CV
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-white/70">
                  Score ATS · Offres d&apos;emploi
                </span>
              </>
            ) : (
              /* Mode 2: General optimisation + job search */
              <>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Zap
                    size={20}
                    className="shrink-0 sm:w-6 sm:h-6 group-hover:animate-pulse"
                  />
                  <span className="text-sm sm:text-xl font-black tracking-tight leading-none">
                    Analyser &amp; Trouver des Offres
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-white/70">
                  Optimisation générale · Offres d&apos;emploi
                </span>
              </>
            )}
          </>
        )}
      </button>

      {/* ── Status line below button ─────────────────────────── */}
      {isAnalyzing && (
        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] animate-pulse text-center px-4">
          {hasJobTarget
            ? 'Analyse ATS et optimisation sémantique en cours'
            : 'Optimisation générale et recherche d\'offres en cours'}
        </p>
      )}

      {/* ── General-mode soft confirmation modal ────────────── */}
      {showGeneralModeConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] max-w-[460px] w-full p-6 sm:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] relative border border-slate-100 flex flex-col items-center text-center">
            <button
              onClick={() => setShowGeneralModeConfirm(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-lg shadow-emerald-100/50 shrink-0">
              <Zap size={26} strokeWidth={2.5} />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
              Optimisation &amp; Offres d&apos;emploi
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-7 sm:mb-8">
              Sans offre d&apos;emploi, nous optimiserons votre CV selon les standards ATS généraux
              et rechercherons des offres adaptées à votre profil automatiquement.
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={runAnalysis}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-primary text-white font-black hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base"
              >
                <Zap size={17} className="fill-white shrink-0" />
                Continuer
              </button>
              <button
                onClick={() => setShowGeneralModeConfirm(false)}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-all active:scale-95 text-sm sm:text-base"
              >
                Ajouter une offre d&apos;emploi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate limit modal ─────────────────────────────────── */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] max-w-[460px] w-full p-6 sm:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] relative border border-slate-100 flex flex-col items-center text-center">
            <button
              onClick={() => setIsLimitModalOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-lg shadow-red-100/50 shrink-0">
              {limitReason === 'credits_exhausted' ? (
                <Sparkles size={26} strokeWidth={2.5} />
              ) : (
                <Lock size={26} strokeWidth={2.5} />
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
              {limitReason === 'credits_exhausted' ? 'Crédits épuisés' : 'Limite atteinte'}
            </h3>

            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-7 sm:mb-8">
              {limitMessage || 'Vous avez atteint votre quota. Pour continuer à optimiser vos CV, passez au plan supérieur.'}
            </p>

            <div className="flex flex-col gap-3 w-full">
              {(limitReason === 'credits_exhausted' || !isPaidUser) && (
                <button
                  onClick={() => {
                    setIsLimitModalOpen(false);
                    router.push(`/${locale}/#pricing`);
                  }}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-primary text-white font-black hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 animate-pulse text-sm sm:text-base"
                >
                  <Sparkles size={17} className="fill-white shrink-0" />
                  {limitReason === 'credits_exhausted' ? 'Recharger des crédits' : 'Passer au Plan Pro'}
                </button>
              )}

              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-all active:scale-95 text-sm sm:text-base"
              >
                {limitReason === 'rate_limit_reached' ? 'Compris' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
