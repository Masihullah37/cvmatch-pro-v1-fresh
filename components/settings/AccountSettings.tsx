'use client';

import { useState } from 'react';
import { UserProfile, useClerk } from "@clerk/nextjs";
import { toast } from 'sonner';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountSettingsProps {
    credits: number;
}

export default function AccountSettings({ credits }: AccountSettingsProps) {
    const { signOut } = useClerk(); // 🌟 Access the sign out method
    const [hasConfirmed, setHasConfirmed] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const handleDeleteAccount = async () => {
        if (confirmText !== "SUPPRIMER") return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/delete-account', { method: 'POST' });
            if (res.ok) {
                toast.success("Votre compte a été supprimé avec succès.");

                // 🌟 1. Clear Clerk's local cookies, session storage, and client-side cache
                await signOut();

                // 🌟 2. Force hard navigation to wipe Next.js client-side router memory
                // This guarantees credits read 0 / Guest view instantly
                window.location.href = "/";
            } else {
                toast.error("Erreur lors de la suppression. Veuillez réessayer.");
                setIsDeleting(false);
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Une erreur système est survenue.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-12">
            <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-4 md:p-8 bg-slate-50 border-b border-slate-100">
                    <h2 className="text-base md:text-xl font-black text-slate-900 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-primary shrink-0" /> Profil Utilisateur
                    </h2>
                </div>
                <div className="p-2 md:p-4 flex justify-center overflow-x-hidden">
                    <UserProfile
                        routing="hash"
                        appearance={{
                            elements: {
                                navbarItem__security: { display: 'none' },
                                profileSection__danger: { display: 'none' },
                                scrollBox: { borderRadius: '1.5rem' },
                                card: { boxShadow: 'none', width: '100%' }
                            }
                        }}
                    />
                </div>
            </section>

            <section className="bg-red-50/30 rounded-[1.5rem] md:rounded-[2.5rem] border border-red-100 overflow-hidden">
                <div className="p-4 md:p-8 bg-red-50 border-b border-red-100">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Trash2 size={18} className="text-red-500 shrink-0" />
                        <h2 className="text-base md:text-xl font-black text-red-900">Zone de danger</h2>
                    </div>
                </div>

                <div className="p-4 md:p-8 space-y-4 md:space-y-8">
                    <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-red-100 shadow-sm flex items-start gap-3 md:gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 hidden md:block">
                            <AlertTriangle size={120} />
                        </div>

                        <div className="p-2.5 md:p-4 bg-red-50 rounded-xl md:rounded-2xl text-red-500 shrink-0">
                            <AlertTriangle size={20} className="md:hidden" />
                            <AlertTriangle size={32} className="hidden md:block" />
                        </div>

                        <div className="space-y-2 md:space-y-3 relative z-10">
                            <h3 className="font-black text-red-900 text-base md:text-2xl tracking-tight">Suppression du compte</h3>
                            <p className="text-red-700/70 text-xs md:text-base leading-relaxed max-w-2xl">
                                Vous avez actuellement <span className="font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-lg">{credits} crédits</span> restants.
                                Conformément au RGPD, vos données seront rendues inaccessibles immédiatement et conservées pendant 30 jours avant d'être supprimées définitivement.
                            </p>
                        </div>
                    </div>

                    {!hasConfirmed ? (
                        <div className="flex flex-col items-center gap-4 md:gap-6 py-5 md:py-8 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-xs md:text-sm font-medium text-center px-4">Pour accéder aux options de suppression, veuillez confirmer la prise de connaissance :</p>
                            <button
                                type="button"
                                style={{
                                    WebkitTapHighlightColor: "transparent",
                                    touchAction: "manipulation",
                                }}
                                onClick={() => setHasConfirmed(true)}
                                className="group flex items-center gap-2 md:gap-3 bg-red-600 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all shadow-xl shadow-red-200"
                            >
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                                J'ai compris, afficher les options
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-4 md:p-8 bg-white rounded-2xl md:rounded-3xl border-2 border-red-200 border-dashed text-center space-y-3 md:space-y-4">
                                <p className="text-red-900 font-black text-base md:text-lg">Action requise</p>
                                <p className="text-slate-500 text-xs md:text-sm max-w-lg mx-auto">
                                    Si vous souhaitez vraiment quitter l'aventure et supprimer toutes vos données, cliquez sur le bouton ci-dessous.
                                </p>
                                <button
                                    type="button"
                                    style={{
                                        WebkitTapHighlightColor: "transparent",
                                        touchAction: "manipulation",
                                    }}
                                    onClick={() => setShowDeleteModal(true)}
                                    className="bg-red-600 text-white px-7 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-tight hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all shadow-lg"
                                >
                                    Supprimer mon compte définitivement
                                </button>
                                <div className="flex justify-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 p-3 rounded-xl">
                                    <ShieldAlert size={12} className="shrink-0" /> Période de grâce de 30 jours avant suppression totale
                                </div>
                            </div>

                            <button
                                type="button"
                                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                onClick={() => setHasConfirmed(false)}
                                className="text-slate-400 text-xs font-bold hover:text-slate-600 active:text-slate-700 active:scale-95 transition-all mx-auto block"
                            >
                                Annuler et masquer
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Deletion Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-4 md:p-8 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                <div className="flex items-center gap-2 md:gap-3 text-red-600">
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <span className="font-black text-sm md:text-lg uppercase tracking-tight">Confirmation Finale</span>
                                </div>
                                <button
                                    type="button"
                                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                    onClick={() => setShowDeleteModal(false)}
                                    className="p-2 hover:bg-red-100 active:bg-red-200 active:scale-90 rounded-xl transition-all text-red-400"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
                                <p className="text-slate-600 text-sm md:text-base leading-relaxed font-medium">
                                    Veuillez confirmer la suppression de votre compte. Vos données seront archivées pendant 30 jours puis définitivement effacées, entraînant la perte de vos <span className="font-bold">{credits} crédits</span>.
                                </p>

                                <div className="space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Tapez "SUPPRIMER" pour confirmer</label>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                        placeholder="SUPPRIMER"
                                        className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-center font-black tracking-widest text-red-600 outline-none focus:border-red-500 transition-colors text-sm md:text-base"
                                    />
                                </div>

                                <button
                                    type="button"
                                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                    disabled={confirmText !== "SUPPRIMER" || isDeleting}
                                    onClick={handleDeleteAccount}
                                    className="w-full bg-red-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 active:bg-red-800 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 md:gap-3"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                    {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
                                </button>

                                <button
                                    type="button"
                                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-full py-2.5 text-slate-400 font-bold text-xs hover:text-slate-600 active:text-slate-700 active:scale-95 transition-all"
                                >
                                    Je change d'avis, garder mon compte
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}