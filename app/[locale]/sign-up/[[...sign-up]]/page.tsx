"use client";

import { SignUp } from "@clerk/nextjs";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function CustomSignUpPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [redirectTo, setRedirectTo] = useState(`/${locale}`);
  const [signInUrl, setSignInUrl] = useState(`/${locale}/sign-in`);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const redirectToParam = searchParams.get("redirectTo") || searchParams.get("redirect_url");

    if (redirectToParam && (redirectToParam.includes("trigger=one-time") || redirectToParam === `/${locale}`)) {
      setRedirectTo(`/${locale}`);
      setSignInUrl(`/${locale}/sign-in?redirectTo=${encodeURIComponent(`/${locale}`)}`);
      return;
    }

    if (!redirectToParam) {
      setRedirectTo(`/${locale}`);
      return;
    }

    try {
      const decoded = decodeURIComponent(redirectToParam);
      const parsed = new URL(decoded, window.location.origin);

      if (parsed.origin !== window.location.origin) {
        setRedirectTo(`/${locale}`);
        return;
      }

      const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      const encoded = encodeURIComponent(safePath);

      setRedirectTo(safePath);
      setSignInUrl(`/${locale}/sign-in?redirectTo=${encoded}`);

      fetch("/api/set-redirect-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectTo: encoded }),
      });
    } catch {
      setRedirectTo(`/${locale}`);
    }
  }, [searchParams, locale]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      <AnimatedBackground />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 mb-8">
          <Image
            src="/ouicvlogo.png"
            alt="OuiCV"
            width={360}
            height={110}
            style={{ width: "auto", height: "auto" }} // Added height: auto to fix the console warning layout issue!
            className="object-contain"
            priority
          />

          <p className="text-base font-black tracking-widest uppercase text-center animate-shine">
            Optimisez votre carrière dès aujourd'hui
          </p>
        </div>

        {/* ── Clerk Card ─────────────────────────────────── */}
        <div className="w-full bg-white/85 backdrop-blur-xl border border-white shadow-2xl shadow-slate-200/60 rounded-[2rem]">
          {mounted ? (
            <SignUp
              forceRedirectUrl={redirectTo}
              fallbackRedirectUrl={`/${locale}`}
              signInUrl={signInUrl}
              appearance={{
                elements: {
                  rootBox: "!w-full !max-w-full block",
                  cardBox: "!w-full !max-w-full !shadow-none block",
                  card: "!bg-transparent !shadow-none !border-none !w-full !max-w-full !rounded-none px-6 py-6",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  badge: "hidden",
                  footer: "!bg-slate-50/80 border-t border-slate-100 !w-full !max-w-full px-6",
                  footerPages: "!bg-transparent !w-full",
                  formFields: "!w-full",
                  formFieldRow: "!w-full",
                  form: "!w-full",
                  formButtonPrimary: "!w-full",
                  socialButtons: "!w-full flex flex-col gap-2",
                  socialButtonsBlockButton: "!w-full !min-w-0 flex items-center justify-center gap-2 !px-3",
                  socialButtonsBlockButtonText: "!text-xs md:!text-sm !overflow-visible !whitespace-normal !line-clamp-none",
                  socialButtonsProviderIcon: "!shrink-0",
              }}
            />
          ) : (
            <div className="h-[440px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* ── Terms ──────────────────────────────────────── */}
        <p className="text-center text-[11px] text-slate-400 font-medium mt-5">
          En créant un compte, vous acceptez nos{" "}
          <Link
            href="/terms"
            className="underline hover:text-emerald-600 transition-colors"
          >
            Conditions d'utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}