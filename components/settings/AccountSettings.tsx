// 'use client';

// import { useState } from 'react';
// import { UserProfile, useClerk } from "@clerk/nextjs";
// import { toast } from 'sonner';
// import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2, X, Loader2 } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";

// interface AccountSettingsProps {
//     credits: number;
// }

// export default function AccountSettings({ credits }: AccountSettingsProps) {
//     const [hasConfirmed, setHasConfirmed] = useState(false);
//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [isDeleting, setIsDeleting] = useState(false);
//     const [confirmText, setConfirmText] = useState("");
//     const { signOut } = useClerk();

//     const handleDeleteAccount = async () => {
//         if (confirmText !== "SUPPRIMER") return;

//         setIsDeleting(true);
//         try {
//             const res = await fetch('/api/delete-account', { method: 'POST' });
//             if (res.ok) {
//                 await signOut(); // Sign out from Clerk after initiating deletion
//                 window.location.href = "/";
//             } else {
//                 toast.error("Erreur lors de la suppression. Veuillez réessayer.");
//                 setIsDeleting(false);
//             }
//         } catch (error) {
//             console.error("Delete failed:", error);
//             setIsDeleting(false);
//         }
//     };

//     return (
//         <div className="space-y-12">
//             <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
//                 <div className="p-8 bg-slate-50 border-b border-slate-100">
//                     <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
//                         <ShieldAlert className="text-primary" /> Profil Utilisateur
//                     </h2>
//                 </div>
//                 <div className="p-4 flex justify-center">
//                     <UserProfile
//                         routing="hash"
//                         appearance={{
//                             elements: {
//                                 navbarItem__security: { display: 'none' },
//                                 // Target the "Danger Zone" button inside Clerk's UI to hide it
//                                 profileSection__danger: { display: 'none' },
//                                 scrollBox: { borderRadius: '2rem' },
//                                 card: { boxShadow: 'none' }
//                             }
//                         }}
//                     />
//                 </div>
//             </section>

//             <section className="bg-red-50/30 rounded-[2.5rem] border border-red-100 overflow-hidden">
//                 <div className="p-8 bg-red-50 border-b border-red-100">
//                     <div className="flex items-center gap-3">
//                         <Trash2 className="text-red-500" />
//                         <h2 className="text-xl font-black text-red-900">Zone de danger</h2>
//                     </div>
//                 </div>

//                 <div className="p-8 space-y-8">
//                     <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm flex items-start gap-6 relative overflow-hidden">
//                         <div className="absolute top-0 right-0 p-4 opacity-5">
//                             <AlertTriangle size={120} />
//                         </div>

//                         <div className="p-4 bg-red-50 rounded-2xl text-red-500 shrink-0">
//                             <AlertTriangle size={32} />
//                         </div>

//                         <div className="space-y-3 relative z-10">
//                             <h3 className="font-black text-red-900 text-2xl tracking-tight">Suppression du compte</h3>
//                             <p className="text-red-700/70 text-base leading-relaxed max-w-2xl">
//                                 Vous avez actuellement <span className="font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-lg">{credits} crédits</span> restants.
//                                 Conformément au RGPD, vos données seront rendues inaccessibles immédiatement et **conservées pendant 30 jours** avant d'être supprimées définitivement.
//                             </p>
//                         </div>
//                     </div>

//                     {!hasConfirmed ? (
//                         <div className="flex flex-col items-center gap-6 py-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
//                             <p className="text-slate-500 font-medium">Pour accéder aux options de suppression, veuillez confirmer la prise de connaissance :</p>
//                             <button
//                                 onClick={() => setHasConfirmed(true)}
//                                 className="group flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95"
//                             >
//                                 <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
//                                 J'ai compris, afficher les options
//                             </button>
//                         </div>
//                     ) : (
//                         <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
//                             <div className="p-8 bg-white rounded-3xl border-2 border-red-200 border-dashed text-center space-y-4">
//                                 <p className="text-red-900 font-black text-lg">Action requise</p>
//                                 <p className="text-slate-500 text-sm max-w-lg mx-auto">
//                                     Si vous souhaitez vraiment quitter l'aventure et supprimer toutes vos données, cliquez sur le bouton ci-dessous.
//                                 </p>
//                                 <button
//                                     onClick={() => setShowDeleteModal(true)}
//                                     className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200"
//                                 >
//                                     Supprimer mon compte définitivement
//                                 </button>
//                                 <div className="pt-4 flex justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 p-4 rounded-xl">
//                                     <ShieldAlert size={14} /> Période de grâce de 30 jours avant suppression totale
//                                 </div>
//                             </div>

//                             <button
//                                 onClick={() => setHasConfirmed(false)}
//                                 className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors mx-auto block"
//                             >
//                                 Annuler et masquer
//                             </button>
//                         </div>
//                     )}
//                 </div>
//             </section>

//             {/* Deletion Modal */}
//             <AnimatePresence>
//                 {showDeleteModal && (
//                     <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//                         <motion.div
//                             initial={{ opacity: 0, scale: 0.9, y: 20 }}
//                             animate={{ opacity: 1, scale: 1, y: 0 }}
//                             exit={{ opacity: 0, scale: 0.9, y: 20 }}
//                             className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
//                         >
//                             <div className="p-8 bg-red-50 border-b border-red-100 flex justify-between items-center">
//                                 <div className="flex items-center gap-3 text-red-600">
//                                     <AlertTriangle size={24} />
//                                     <span className="font-black text-lg uppercase tracking-tight">Confirmation Finale</span>
//                                 </div>
//                                 <button
//                                     onClick={() => setShowDeleteModal(false)}
//                                     className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400"
//                                 >
//                                     <X size={20} />
//                                 </button>
//                             </div>

//                             <div className="p-8 space-y-6">
//                                 <p className="text-slate-600 leading-relaxed font-medium">
//                                     Veuillez confirmer la suppression de votre compte. Vos données seront **archivées pendant 30 jours** puis définitivement effacées, entraînant la perte de vos <span className="font-bold">{credits} crédits</span>.
//                                 </p>

//                                 <div className="space-y-3">
//                                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tapez "SUPPRIMER" pour confirmer</label>
//                                     <input
//                                         type="text"
//                                         value={confirmText}
//                                         onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
//                                         placeholder="SUPPRIMER"
//                                         className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-black tracking-widest text-red-600 outline-none focus:border-red-500 transition-colors"
//                                     />
//                                 </div>

//                                 <button
//                                     disabled={confirmText !== "SUPPRIMER" || isDeleting}
//                                     onClick={handleDeleteAccount}
//                                     className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-3"
//                                 >
//                                     {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
//                                     {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
//                                 </button>

//                                 <button
//                                     onClick={() => setShowDeleteModal(false)}
//                                     className="w-full py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
//                                 >
//                                     Je change d'avis, garder mon compte
//                                 </button>
//                             </div>
//                         </motion.div>
//                     </div>
//                 )}
//             </AnimatePresence>
//         </div>
//     );
// }


'use client';

import { useState } from 'react';
import { UserProfile } from "@clerk/nextjs";
import { toast } from 'sonner';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountSettingsProps {
    credits: number;
}

export default function AccountSettings({ credits }: AccountSettingsProps) {
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

                // Force a hard navigation to wipe client-side cookie caches and cache memory safely 
                // without invoking Clerk JS signout errors.
                window.location.assign("/");
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
        <div className="space-y-12">
            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-8 bg-slate-50 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <ShieldAlert className="text-primary" /> Profil Utilisateur
                    </h2>
                </div>
                <div className="p-4 flex justify-center">
                    <UserProfile
                        routing="hash"
                        appearance={{
                            elements: {
                                navbarItem__security: { display: 'none' },
                                profileSection__danger: { display: 'none' },
                                scrollBox: { borderRadius: '2rem' },
                                card: { boxShadow: 'none' }
                            }
                        }}
                    />
                </div>
            </section>

            <section className="bg-red-50/30 rounded-[2.5rem] border border-red-100 overflow-hidden">
                <div className="p-8 bg-red-50 border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <Trash2 className="text-red-500" />
                        <h2 className="text-xl font-black text-red-900">Zone de danger</h2>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm flex items-start gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <AlertTriangle size={120} />
                        </div>

                        <div className="p-4 bg-red-50 rounded-2xl text-red-500 shrink-0">
                            <AlertTriangle size={32} />
                        </div>

                        <div className="space-y-3 relative z-10">
                            <h3 className="font-black text-red-900 text-2xl tracking-tight">Suppression du compte</h3>
                            <p className="text-red-700/70 text-base leading-relaxed max-w-2xl">
                                Vous avez actuellement <span className="font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-lg">{credits} crédits</span> restants.
                                Conformément au RGPD, vos données seront rendues inaccessibles immédiatement et **conservées pendant 30 jours** avant d'être supprimées définitivement.
                            </p>
                        </div>
                    </div>

                    {!hasConfirmed ? (
                        <div className="flex flex-col items-center gap-6 py-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 font-medium">Pour accéder aux options de suppression, veuillez confirmer la prise de connaissance :</p>
                            <button
                                onClick={() => setHasConfirmed(true)}
                                className="group flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95"
                            >
                                <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                                J'ai compris, afficher les options
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-8 bg-white rounded-3xl border-2 border-red-200 border-dashed text-center space-y-4">
                                <p className="text-red-900 font-black text-lg">Action requise</p>
                                <p className="text-slate-500 text-sm max-w-lg mx-auto">
                                    Si vous souhaitez vraiment quitter l'aventure et supprimer toutes vos données, cliquez sur le bouton ci-dessous.
                                </p>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200"
                                >
                                    Supprimer mon compte définitivement
                                </button>
                                <div className="pt-4 flex justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 p-4 rounded-xl">
                                    <ShieldAlert size={14} /> Période de grâce de 30 jours avant suppression totale
                                </div>
                            </div>

                            <button
                                onClick={() => setHasConfirmed(false)}
                                className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors mx-auto block"
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                <div className="flex items-center gap-3 text-red-600">
                                    <AlertTriangle size={24} />
                                    <span className="font-black text-lg uppercase tracking-tight">Confirmation Finale</span>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    Veuillez confirmer la suppression de votre compte. Vos données seront **archivées pendant 30 jours** puis définitivement effacées, entraînant la perte de vos <span className="font-bold">{credits} crédits</span>.
                                </p>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tapez "SUPPRIMER" pour confirmer</label>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                        placeholder="SUPPRIMER"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-black tracking-widest text-red-600 outline-none focus:border-red-500 transition-colors"
                                    />
                                </div>

                                <button
                                    disabled={confirmText !== "SUPPRIMER" || isDeleting}
                                    onClick={handleDeleteAccount}
                                    className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
                                </button>

                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-full py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
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