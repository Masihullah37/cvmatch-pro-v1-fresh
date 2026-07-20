import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import Script from 'next/script';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const consent = cookieStore.get('cookie_consent')?.value;

  return (
    <ClerkProvider
      afterSignOutUrl="/fr"
      appearance={{
        variables: {
          colorPrimary: '#059669',
          // colorTextBase: '#020617',
          colorForeground: '#020617',
          // colorTextSecondary: '#64748b',
          colorMutedForeground: '#64748b',
          colorBackground: '#ffffff',
          borderRadius: '1rem',
        },
        options: {
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
          shimmer: false,
          logoLinkUrl: "/fr",
        },
        elements: {
          // ── Root & Card ──────────────────────────────────
          rootBox: "w-full !max-w-full",
          cardBox: "w-full !max-w-full",
          card: "bg-transparent shadow-none w-full border-none p-6 !max-w-full",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          badge: "hidden",

          // ── Social Buttons ────────────────────────────────
          socialButtonsBlockButton:
            "rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all font-bold text-slate-700 h-12 shadow-sm",
          socialButtonsBlockButtonText: "font-bold text-sm text-slate-700",

          // ── Divider ──────────────────────────────────────
          dividerRow: "my-2",
          dividerLine: "bg-slate-100",
          dividerText: "text-slate-300 font-black text-[10px] uppercase tracking-widest",

          // ── Form Labels ──────────────────────────────────
          formFieldLabel:
            "text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1.5 block",
          formFieldLabelRow: "mb-1",

          // ── Form Inputs ──────────────────────────────────
          formFieldInput:
            "rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 h-12 px-4 font-medium text-slate-900 placeholder:text-slate-300 transition-all",
          formFieldInputShowPasswordButton:
            "text-slate-400 hover:text-slate-600",

          // ── Error / Alert States ─────────────────────────
          formFieldErrorText: "text-red-500 text-xs font-bold mt-1",
          formFieldSuccessText: "text-emerald-600 text-xs font-bold mt-1",
          alertText: "text-sm font-bold",
          alert: "rounded-2xl border-0 bg-red-50 text-red-700 p-4",

          // ── Primary Button ────────────────────────────────
          formButtonPrimary:
            "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] rounded-2xl py-3.5 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 transition-all w-full text-white",

          // ── Footer Links ──────────────────────────────────
          footerActionText: "text-slate-400 text-sm font-medium",
          footerActionLink:
            "text-emerald-600 font-bold hover:text-emerald-700 transition-colors",
          footer: "mt-2 rounded-b-[2rem]",

          // ── OTP Code ─────────────────────────────────────
          otpCodeFieldInput:
            "rounded-2xl border border-slate-200 bg-slate-50 h-12 w-12 text-center text-lg font-black text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all",

          // ── Identity Preview ──────────────────────────────
          identityPreviewText: "text-slate-700 font-bold",
          identityPreviewEditButton:
            "text-emerald-600 font-bold hover:text-emerald-700",

          // ── Alternative Methods ───────────────────────────
          alternativeMethodsBlockButton:
            "rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all font-bold text-slate-600 h-11 text-sm",

          // ── Resend Code ───────────────────────────────────
          formResendCodeLink:
            "text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm",
        },
      }}
    >
      <html lang="fr" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          {consent === 'accepted' && (
            <>
              <Script src="https://www.googletagmanager.com/gtag/js?id=G-PLACEHOLDER" strategy="afterInteractive" />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-PLACEHOLDER');
                `}
              </Script>
            </>
          )}

          {/* TEMP: Mobile debugging */}
          <Script
            src="https://cdn.jsdelivr.net/npm/eruda"
            strategy="afterInteractive"
          />

          <Script id="eruda-init" strategy="lazyOnload">
            {`
(function initEruda(){
  if(window.eruda){
    window.eruda.init();
  }else{
    setTimeout(initEruda,300);
  }
})();
`}
          </Script>


        </body>
      </html>
    </ClerkProvider>
  );
}