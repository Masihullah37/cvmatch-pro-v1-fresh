'use client';

import { useState, useEffect } from 'react';
import { X, ShieldCheck, Cookie } from 'lucide-react';
import Link from "next/link";
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Ensure cookie is in sync with localStorage for server-side visibility
      if (!document.cookie.includes('cookie_consent=')) {
        document.cookie = `cookie_consent=${consent}; path=/; max-age=${180 * 24 * 60 * 60}; SameSite=Lax; Secure`;
      }
    }
  }, []);

  const accept = async () => {
    localStorage.setItem('cookie_consent', 'accepted');
    document.cookie = `cookie_consent=accepted; path=/; max-age=${180 * 24 * 60 * 60}; SameSite=Lax; Secure`;
    await fetch('/api/user/consent', {
      method: 'POST',
      body: JSON.stringify({ consent: 'accepted' }),
      headers: { 'Content-Type': 'application/json' },
    });
    setShow(false);
  };

  const decline = async () => {
    localStorage.setItem('cookie_consent', 'declined');
    document.cookie = `cookie_consent=declined; path=/; max-age=${180 * 24 * 60 * 60}; SameSite=Lax; Secure`;
    await fetch('/api/user/consent', {
      method: 'POST',
      body: JSON.stringify({ consent: 'declined' }),
      headers: { 'Content-Type': 'application/json' },
    });
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 md:p-8 relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={decline}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-500 transition-colors"
            >
              Continuer sans accepter
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <ShieldCheck className="text-emerald-500" size={14} />
            </div>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/50">
              <Cookie className="text-emerald-500" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-950 leading-tight">Respect de la vie privée</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mt-1">Conformité RGPD & Analyse IA</p>
            </div>
          </div>

          {/* <p className="text-sm text-slate-600 leading-relaxed mb-8">
            Nous utilisons des cookies pour optimiser votre expérience et analyser l'utilisation de nos outils d'IA via Google Analytics.
          </p> */}

          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            Nous utilisons des cookies strictement nécessaires au fonctionnement du site ainsi,
            avec votre consentement, des cookies de mesure d'audience via Google Analytics.
            Vous pouvez consulter notre{" "}
            <Link
              href="/politique-cookies"
              className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              Politique relative aux cookies
            </Link>{" "}
            pour obtenir plus d'informations sur les cookies utilisés, leur durée de conservation
            et vos droits.
          </p>

          {/* <div className="flex flex-col gap-3">
            <button
              onClick={accept}
              className="w-full bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Tout accepter
            </button>
          </div> */}

          <div className="flex flex-col gap-3">

            <button
              onClick={accept}
              className="w-full bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Tout accepter
            </button>

            <button
              onClick={decline}
              className="w-full border border-slate-200 bg-white text-slate-700 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Refuser les cookies optionnels
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
