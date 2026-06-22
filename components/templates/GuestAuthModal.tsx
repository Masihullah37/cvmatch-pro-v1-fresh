'use client';

import { LogIn, UserPlus, X, Zap, ShieldCheck, Gift } from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface GuestAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export default function GuestAuthModal({
  isOpen,
  onClose,
  returnUrl,
}: GuestAuthModalProps) {
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(returnUrl || window.location.href);
    }
  }, [returnUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] max-w-[500px] w-full overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] relative border border-slate-100 animate-in zoom-in-95 duration-300">

        {/* Animated Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary overflow-hidden">
          <div className="w-1/3 h-full bg-accent animate-[move_3s_infinite_linear]" />
        </div>

        <div className="p-8 md:p-12 relative z-10 flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-blue-50 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-blue-100">
            <Zap size={14} className="fill-primary" />
            Étape requise
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
            Prêt à <span className="text-primary">Télécharger</span> ?
          </h2>

          <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10">
            Connectez-vous ou créez un compte pour sauvegarder vos modifications et télécharger votre CV optimisé.
          </p>

          <div className="w-full mb-8 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2.5">
            <Gift size={16} className="text-emerald-600 shrink-0" />
            <p className="text-emerald-700 text-sm font-bold">
              1 téléchargement gratuit offert à la création de votre compte
            </p>
          </div>

          <div className="flex flex-col w-full gap-4">
            <SignInButton mode="modal" forceRedirectUrl={currentUrl}>
              <button className="w-full py-5 px-8 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 group">
                <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                Se connecter
              </button>
            </SignInButton>

            <SignUpButton mode="modal" forceRedirectUrl={currentUrl}>
              <button className="w-full py-5 px-8 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                S'inscrire gratuitement
              </button>
            </SignUpButton>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 w-full flex items-center justify-center gap-6 opacity-60">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={16} className="text-emerald-500" />
              Sécurisé par Clerk
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes move {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
