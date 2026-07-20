'use client';

import { Lock, Download, CreditCard, Check, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import ActivePlanModal from '../home/ActivePlanModal';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  templateNumber?: number;
  templateId?: string;
  mobileView?: string;
  returnUrl?: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  analysisId,
  templateNumber,
  templateId,
  mobileView,
}: PaywallModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const { userId } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<{ credits: number; expiry: string | null; plan: string; status: string | null } | null>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      fetch("/api/user/credits")
        .then((res) => res.json())
        .then((data) => setUserStatus(data))
        .catch(() => { });
    }
  }, [userId, isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (type: 'one-time' | 'subscription') => {
    if (!userId) {
      router.push(`/${locale}/sign-in?redirectTo=${encodeURIComponent(window.location.href)}`);
      return;
    }

    setLoading(type);
    try {
      const path = window.location.href;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "cvmatch_checkout_return",
          JSON.stringify({
            analysisId,
            templateNumber: templateNumber ?? null,
            templateId: templateId ?? null,
            mobileView: mobileView ?? null,
            path,
          })
        );
      }
      const checkoutUrl = await createCheckoutSession(type, analysisId, locale, templateNumber, path);
      window.location.href = checkoutUrl;
      // } catch (error: any) {
      //   console.error("Checkout failed", error);
      //   if (error.message.includes("déjà un plan actif")) {
      //     setShowActiveModal(true);
      //   } else {
      //     toast.error("Une erreur est survenue lors de la redirection vers le paiement.");
      //   }
      // } 
    } catch (error: any) {
      console.error("Checkout failed", error);
      if (error.message?.includes("déjà un plan actif")) {
        setShowActiveModal(true);
      } else if (error.message === "SESSION_EXPIRED") {
        router.push(`/${locale}/sign-in?redirectTo=${encodeURIComponent(window.location.href)}`);
      } else {
        toast.error("Une erreur est survenue lors de la redirection vers le paiement.");
      }
    }
    finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] max-w-[900px] w-full max-h-[95vh] overflow-y-auto custom-scrollbar shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] relative border border-slate-100">

        {/* Animated Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary overflow-hidden">
          <div className="w-1/3 h-full bg-accent animate-[move_3s_infinite_linear]" />
        </div>

        <div className="p-8 md:p-12 relative z-10">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-2xl"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div className="flex flex-col items-center text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-blue-50 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2 border border-blue-100">
              <Zap size={14} className="fill-primary" />
              Boostez votre carrière
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Débloquez votre <span className="text-primary">Réussite</span>
            </h2>
            <p className="text-slate-500 max-w-[600px] text-lg font-medium leading-relaxed">
              Vos analyses ATS et modèles optimisés sont prêts. Choisissez la formule qui propulsera votre CV au sommet de la pile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Starter Pack - One-time */}
            <div className="flex flex-col h-full rounded-[2.5rem] border-2 border-slate-100 bg-slate-50/30 p-8 hover:border-slate-200 transition-all group relative">
              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Pack Starter</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Paiement unique</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">3,90€</span>
                </div>

                <ul className="space-y-5">
                  {[
                    '5 Crédits de génération',
                    'Valable 30 jours',
                    'Aucun filigrane',
                    'CV optimisé inclus',
                    'Analyses ATS incluses'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-600">
                      <div className="bg-emerald-100 p-1 rounded-full">
                        <Check size={14} className="text-emerald-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout('one-time')}
                disabled={!!loading}
                className="w-full mt-10 py-5 px-8 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 font-black hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 active:scale-95"
              >
                {loading === 'one-time' ? <Loader2 className="animate-spin" /> : 'Activer 5 Crédits'}
              </button>
            </div>

            {/* Pro Access - Subscription */}
            <div className="flex flex-col h-full rounded-[2.5rem] border-2 border-primary bg-blue-50/30 p-8 shadow-2xl shadow-primary/10 transition-all relative group">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.25em] shadow-xl shadow-accent/20 border-4 border-white">
                Accès Illimité
              </div>

              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Abonnement Pro</h3>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">Le choix des experts</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary tracking-tighter">13,90€</span>
                  <span className="text-slate-400 text-sm font-black uppercase tracking-widest">/ mois</span>
                </div>

                <ul className="space-y-5">
                  {[
                    '30 Crédits par mois',
                    'Analyses ATS illimitées',
                    '10+ Modèles Premium',
                    'Assistant IA Dédié',
                    'Annulation en 1 clic'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-700">
                      <div className="bg-primary p-1 rounded-full">
                        <Check size={14} className="text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout('subscription')}
                disabled={!!loading}
                className="w-full mt-10 py-5 px-8 rounded-2xl bg-primary text-white font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95"
              >
                {loading === 'subscription' ? <Loader2 className="animate-spin" /> : (
                  <>
                    <CreditCard size={20} />
                    S'abonner Maintenant
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex gap-0.5 text-accent">
                  {[1, 2, 3, 4, 5].map(i => <Zap key={i} size={10} className="fill-accent" />)}
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Utilisé par 2,500+ candidats</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
              Votre abonnement sera renouvelé automatiquement chaque mois.
              Vous pouvez annuler votre abonnement à tout moment depuis la section ‘Gérer mon plan’.
              L’annulation prendra effet à la fin de la période de facturation en cours.
            </p>
            <div className="flex items-center gap-8 opacity-50">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" />
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={16} className="text-emerald-500" />
                Paiement Sécurisé
              </div>
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

      <ActivePlanModal
        isOpen={showActiveModal}
        onClose={() => setShowActiveModal(false)}
        credits={userStatus?.credits || 0}
        expiryDate={userStatus?.expiry || null}
      />
    </div>
  );
}
