"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Send, CheckCircle2, Loader2 } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import AnimatedBackground from "@/components/layout/AnimatedBackground";

export default function ContactPage() {
    const { user, isLoaded } = useUser();

    const [form, setForm] = useState({
        name: user?.fullName || "",
        email: user?.emailAddresses[0]?.emailAddress || "",
        subject: "",
        message: "",
    });
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);

    // Pre-fill form when user loads
    if (isLoaded && user && !form.name && !form.email) {
        setForm((prev) => ({
            ...prev,
            name: user.fullName || prev.name,
            email: user.emailAddresses[0]?.emailAddress || prev.email,
        }));
    }

    const handleSubmit = async () => {
        setError(null);

        if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
            setError("Veuillez remplir tous les champs.");
            return;
        }
        if (!captchaToken) {
            setError("Veuillez compléter le CAPTCHA.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    captchaToken,
                    currentUrl: window.location.href,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Une erreur est survenue.");
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
                return;
            }

            setSent(true);
        } catch {
            setError("Erreur réseau. Vérifiez votre connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <AnimatedBackground />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">

                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-sm font-bold mb-8 group"
                >
                    <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                    Retour à l'accueil
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
                        ✦ Support
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                        Nous contacter
                    </h1>
                    <p className="text-slate-500 text-base leading-relaxed">
                        Une question, un problème ou une suggestion ? Nous vous répondrons dès que possible..
                    </p>
                </div>

                {/* Success state */}
                {sent ? (
                    <div className="bg-white rounded-[2rem] border border-emerald-100 p-10 text-center shadow-sm">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <CheckCircle2 size={32} className="text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-3">
                            Message envoyé !
                        </h2>
                        <p className="text-slate-500 mb-6 leading-relaxed">
                            Merci pour votre message. Nous vous répondrons dans les plus brefs délais à{" "}
                            <span className="font-bold text-slate-700">{form.email}</span>.
                        </p>
                        <button
                            onClick={() => {
                                setSent(false);
                                setForm({ name: "", email: "", subject: "", message: "" });
                                setCaptchaToken(null);
                            }}
                            className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm"
                        >
                            Envoyer un autre message
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl p-6 sm:p-8">

                        {/* Logged in user info banner */}
                        {isLoaded && user && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">
                                        Connecté en tant que {user.fullName || user.emailAddresses[0]?.emailAddress}
                                    </p>
                                    <p className="text-xs text-emerald-600 mt-0.5">
                                        Vos informations de compte seront automatiquement incluses dans votre message.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                                    Nom complet <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="Votre nom"
                                    maxLength={100}
                                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="votre@email.com"
                                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                />
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                                    Sujet <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                                    placeholder="En quoi pouvons-nous vous aider ?"
                                    maxLength={150}
                                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                                    Message <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={form.message}
                                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                                    placeholder="Décrivez votre question ou problème en détail..."
                                    maxLength={3000}
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none leading-relaxed"
                                />
                                <p className="text-xs text-slate-400 mt-1 text-right">
                                    {form.message.length}/3000
                                </p>
                            </div>

                            {/* hCaptcha (Fixed layout overflow container) */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-500 mb-3">
                                    Vérification anti-spam <span className="text-red-400">*</span>
                                </label>
                                <div className="w-full py-2 flex justify-start sm:justify-center overflow-x-auto min-w-0">
                                    <div className="flex-shrink-0 origin-left sm:origin-center scale-[0.82] xs:scale-90 sm:scale-100">
                                        <HCaptcha
                                            ref={captchaRef}
                                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
                                            onVerify={(token) => setCaptchaToken(token)}
                                            onExpire={() => setCaptchaToken(null)}
                                            theme="light"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
                                    <p className="text-sm font-bold text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Envoyer le message
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-400">
                                En envoyant ce formulaire, vous acceptez notre{" "}
                                <Link href="/politique-confidentialite" className="underline hover:text-emerald-600 transition-colors">
                                    politique de confidentialité
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}