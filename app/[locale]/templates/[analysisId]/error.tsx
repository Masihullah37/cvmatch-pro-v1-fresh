'use client';

import { useEffect } from 'react';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const { signOut } = useClerk();

    useEffect(() => {
        // Log the error for debugging purposes
        console.error('SERVER_COMPONENT_CRASH:', error);
    }, [error]);

    const handleRetry = async () => {
        try {
            // Forces Clerk to clear the orphaned local session
            await signOut();
            // Now that the cookie is gone, retry the render as a guest
            window.location.reload(); // Force a full page reload to clear all state
        } catch (err) {
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-100 p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">

                <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100/50">
                    <AlertCircle className="text-red-500 animate-pulse" size={48} />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                    Oups ! Session <span className="text-red-500">Expirée</span>
                </h2>

                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10">
                    Il semble que votre session ne soit plus valide. Cela se produit si votre compte a été supprimé ou si la connexion a été interrompue pour votre sécurité.
                </p>

                <div className="flex flex-col gap-4 w-full">
                    <button
                        onClick={handleRetry}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <RotateCcw size={18} />
                        Réessayer la connexion
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-white text-slate-600 border-2 border-slate-100 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Home size={18} />
                        Retour à l'accueil
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        Code d'erreur : {error.digest || "AUTH_SYNC_FAILED"}
                    </p>
                </div>
            </div>
        </div>
    );
}