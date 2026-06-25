"use client";

import { SignUp, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import Image from "next/image";

export default function CustomSignUpPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const redirectToParam = searchParams.get("redirectTo");

  useEffect(() => {
    if (redirectToParam) {
      fetch("/api/set-redirect-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectTo: redirectToParam }),
      });
    }
  }, [redirectToParam]);

  const redirectTo =
    typeof window !== "undefined"
      ? redirectToParam
        ? `${window.location.origin}${decodeURIComponent(redirectToParam)}`
        : `${window.location.origin}/${locale}/dashboard`
      : `/${locale}/dashboard`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* 🌟 Custom Background Elements */}
      <AnimatedBackground />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(16,185,129,0.1)] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-2 text-slate-400 rounded-full bg-slate-900/[0.02] border border-slate-900/[0.04] backdrop-blur-md transition-all duration-300 hover:text-emerald-600 hover:bg-emerald-500/[0.03] hover:border-emerald-500/20 hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)] text-xs font-black tracking-widest uppercase group hover-glow-link"
          >
            <ArrowLeft
              size={14}
              className="transform transition-all duration-300 ease-out group-hover:-translate-x-1 group-hover:text-emerald-500 filter drop-shadow-[0_0_2px_rgba(16,185,129,0)] group-hover:drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
            />
            <span className="shine-text transition-colors duration-300">
              Retour à l'accueil
            </span>
          </Link>

          {/* 🌟 Your Verified Brand Logo */}
          <div className="flex items-center justify-center">
            <Image
              src="/ouicvlogo.png"
              alt="Oui CV Logo"
              width={180}
              height={50}
              className="object-contain"
              priority
            />
          </div>

          {/* 🌟 Animated Shining Subtitle */}
          <p className="text-base font-bold tracking-wide uppercase animate-shine">
            Créez votre compte pour optimiser votre carrière
          </p>
        </div>

        {/* 🌟 Expanded frame size to seamlessly lock borders and fields together */}
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
            <SignUp
              forceRedirectUrl={redirectTo}
              fallbackRedirectUrl={`/${locale}/dashboard`}
              signInUrl={
                redirectToParam
                  ? `/${locale}/sign-in?redirectTo=${redirectToParam}`
                  : `/${locale}/sign-in`
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
          En créant un compte, vous acceptez nos{" "}
          <Link href="/terms" className="underline hover:text-emerald-600">
            Conditions d'utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}