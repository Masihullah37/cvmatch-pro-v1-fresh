"use client";

import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function CustomSignInPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();

  const redirectToParam = searchParams.get("redirectTo") || searchParams.get("redirect_url");
  const getSafeRedirectPath = () => {
    if (typeof window === "undefined" || !redirectToParam) return null;

    try {
      const decoded = decodeURIComponent(redirectToParam);
      const parsed = new URL(decoded, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  };
  const safeRedirectPath = getSafeRedirectPath();
  const encodedSafeRedirectPath = safeRedirectPath ? encodeURIComponent(safeRedirectPath) : null;

  useEffect(() => {
    if (encodedSafeRedirectPath) {
      fetch("/api/set-redirect-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectTo: encodedSafeRedirectPath }),
      });
    }
  }, [encodedSafeRedirectPath]);

  const redirectTo =
    typeof window !== "undefined"
      ? safeRedirectPath
        ? `${window.location.origin}${safeRedirectPath}`
        : `${window.location.origin}/${locale}/dashboard`
      : `/${locale}/dashboard`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      <AnimatedBackground />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(16,185,129,0.1)] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          {/* 🌟 Pristine Animated Shining Text */}
          <p className="text-base font-bold tracking-wide uppercase animate-shine">
            Connectez-vous pour débloquer votre plein potentiel
          </p>
        </div>

        {/* 🌟 Widened background container to perfectly fit expanded Clerk components without clipping */}
        <div className="clerk-custom-container w-[440px] max-w-full mx-auto bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-[2.5rem] p-1 overflow-hidden min-h-[440px] flex flex-col items-center justify-center relative">

          <ClerkLoading>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 z-20">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Chargement...
              </p>
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <SignIn
              forceRedirectUrl={redirectTo}
              fallbackRedirectUrl={`/${locale}/dashboard`}
              signUpUrl={
                encodedSafeRedirectPath
                  ? `/${locale}/sign-up?redirectTo=${encodedSafeRedirectPath}`
                  : `/${locale}/sign-up`
              }
              appearance={{
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "blockButton",
                  shimmer: false,
                },
                elements: {
                  rootBox: "w-full !max-w-full",
                  cardBox: "w-full !max-w-full",
                  card: "bg-transparent shadow-none w-full border-none p-6 !max-w-full",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  badge: "hidden",
                },
              }}
            />
          </ClerkLoaded>
        </div>

        <p className="text-center text-xs text-slate-400 font-medium">
          En vous connectant, vous acceptez nos{" "}
          <Link href="/terms" className="underline hover:text-emerald-600">
            Conditions d'utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}