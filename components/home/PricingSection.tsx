"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from 'sonner';
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect, useCallback, useRef } from "react";
import { createCheckoutSession } from "@/app/actions/stripe";
import { useRouter } from "next/navigation";
import ActivePlanModal from "./ActivePlanModal";

const plans = [
  {
    name: "Gratuit",
    price: "0€",
    period: "",
    desc: "Testez sans engagement",
    color: "border-slate-200",
    badge: null,
    features: [
      "Score ATS complet",
      "Suggestions d'amélioration",
      "Mots-clés manquants",
    ],
    cta: "Commencer gratuitement",
    ctaStyle: "bg-slate-900 text-white hover:bg-slate-800",
    type: "free",
  },
  {
    name: "Pack Starter",
    price: "3,90€",
    period: "paiement unique",
    desc: "5 CVs optimisés, sans abonnement",
    color: "border-primary",
    badge: "Populaire",
    features: [
      "Tout du plan Gratuit",
      "5 CVs professionnels générés",
      "Modèles de styles différents",
      "Éditeur de CV intégré",
      "Valable 30 jours",
    ],
    cta: "Obtenir le Pack",
    ctaStyle:
      "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/30",
    type: "one-time",
  },
  {
    name: "Pro Mensuel",
    price: "13,90€",
    period: "/ mois",
    desc: "Pour les candidats actifs",
    color: "border-slate-200",
    badge: null,
    features: [
      "Tout du Pack Starter",
      "30 CVs par mois",
      "Renouvellement automatique",
      "Support prioritaire",
      "Accès aux nouvelles fonctionnalités",
    ],
    cta: "Démarrer l'abonnement",
    ctaStyle: "bg-slate-900 text-white hover:bg-slate-800",
    type: "subscription",
  },
] as const;

type PlanType = typeof plans[number]["type"];

export default function PricingSection() {
  const locale = useLocale();
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [userStatus, setUserStatus] = useState<{
    credits: number;
    expiry: string | null;
    plan: string;
    status: string | null;
  } | null>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);

  // Ref to prevent trigger from firing multiple times
  const triggerFiredRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/user/credits")
      .then((res) => res.json())
      .then((data) => setUserStatus(data))
      .catch(() => { });
  }, [userId]);

  const handlePlanClick = useCallback(async (planType: PlanType) => {
    if (planType === "free") {
      router.push(`/${locale}#analyze`);
      return;
    }

    if (!userId) {
      const triggerPath = `/${locale}?trigger=${planType}`;
      router.push(
        `/${locale}/sign-in?redirectTo=${encodeURIComponent(triggerPath)}`
      );
      return;
    }

    try {
      setLoading(planType);
      const url = await createCheckoutSession(
        planType as any,
        "",          // templateId — not needed for pricing section
        locale,
        undefined,
        window.location.href
      );
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error?.message?.includes("déjà un plan actif")) {
        setShowActiveModal(true);
      } else {
        toast.error(
          "Une erreur est survenue lors de la redirection vers le paiement."
        );
      }
    } finally {
      setLoading(null);
    }
  }, [userId, locale, router]);

  // Handle post-login trigger — fires once when userId becomes available
  useEffect(() => {
    if (!userId) return;
    if (triggerFiredRef.current) return; // Prevent double-firing

    const triggerPlan = new URLSearchParams(window.location.search).get("trigger") as PlanType | null;
    if (!triggerPlan) return;

    const validPlan = plans.find((p) => p.type === triggerPlan);
    if (!validPlan) return;

    // Mark as fired immediately to prevent re-trigger
    triggerFiredRef.current = true;

    // Clean URL immediately
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("trigger");
    window.history.replaceState({}, "", cleanUrl.toString());

    // Wait for Clerk session to propagate to server cookies
    const timer = setTimeout(() => {
      handlePlanClick(validPlan.type);
    }, 1200);

    return () => clearTimeout(timer);
  }, [userId, handlePlanClick]);

  return (
    <section id="pricing" className="py-24 px-6 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">
            ✦ Tarifs
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Simple, transparent,
            <br />
            <span className="text-primary">sans surprise</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Commencez gratuitement. Payez uniquement quand vous voulez générer
            vos CVs optimisés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-[2rem] border-2 ${plan.color} p-8 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black text-slate-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-slate-400 text-sm font-medium">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{plan.desc}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-slate-600"
                  >
                    <CheckCircle2
                      size={16}
                      className="text-emerald-500 shrink-0 mt-0.5"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanClick(plan.type)}
                disabled={loading !== null}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-center transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${plan.ctaStyle}`}
              >
                {loading === plan.type && (
                  <Loader2 className="animate-spin" size={18} />
                )}
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ActivePlanModal
        isOpen={showActiveModal}
        onClose={() => setShowActiveModal(false)}
        credits={userStatus?.credits || 0}
        expiryDate={userStatus?.expiry || null}
      />
    </section>
  );
}
