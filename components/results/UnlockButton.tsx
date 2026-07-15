"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateAIResume, deductCreditForAnalysis } from "@/app/actions/analysis";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PaywallModal from "@/components/templates/PaywallModal";
import { useLocale } from "next-intl";

export default function UnlockButton({
  analysisId,
  credits,
  isGuest,
  children,
}: {
  analysisId: string;
  credits: number;
  isGuest: boolean;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  // Capture current path to ensure redirect after payment returns here
  const currentPath = typeof window !== "undefined" ? window.location.href : "";

  const handleUnlock = async () => {
    if (isGuest) {
      const redirectTo = encodeURIComponent(currentPath || `/${locale}/results/${analysisId}`);
      router.push(`/${locale}/sign-in?redirectTo=${redirectTo}`);
      return;
    }

    // 2. Logged-in but no credits → open paywall
    if (credits < 1) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    try {
      // RULE: If they just want to "Unlock" (Deduct credit for the first time without AI gen)
      // we call deductCreditForAnalysis. If this button is specifically for AI generation:
      const result = await generateAIResume(analysisId);

      if (result.success) {
        toast.success("CV Optimisés générés avec succès !");
        // If they are already on the templates page, just refresh, otherwise redirect
        if (window.location.pathname.includes('/templates/')) {
          router.refresh();
        } else {
          router.push(`/${locale}/templates/${analysisId}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      {/* <div className="flex flex-col items-center gap-3"> */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
        <button
          onClick={handleUnlock}
          disabled={loading}
          // className="bg-primary text-primary-foreground px-8 py-4 rounded-xl sm:rounded-2xl font-black shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all group flex items-center justify-center gap-3 text-sm sm:text-base uppercase tracking-widest disabled:cursor-not-allowed min-w-[280px]"
          className="flex-1 sm:flex-none bg-primary text-primary-foreground px-6 py-4 rounded-xl sm:rounded-2xl font-black shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all group flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Sparkles
              className="group-hover:rotate-12 transition-transform text-white/90"
              size={18}
            />
          )}
          <span>Générer mes CV Optimisés</span>
        </button>
        {children}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        analysisId={analysisId}
        returnUrl={currentPath} // Pass the current URL to the paywall for Stripe success_url
      />
    </>
  );
}
