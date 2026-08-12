"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface PageOverflowWarningProps {
    pageCount: number;
    onReduceFontSize?: () => void;
}

export default function PageOverflowWarning({ pageCount, onReduceFontSize }: PageOverflowWarningProps) {
    const [dismissed, setDismissed] = useState(false);
    if (pageCount <= 1 || dismissed) return null;

    return (
        <div
            role="alert"
            className="fixed z-50 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 shadow-lg shadow-amber-900/5 p-4 left-4 right-4 bottom-4 md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
        >
            <div className="shrink-0 rounded-full bg-amber-100 p-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                    Votre CV dépasse une page ({pageCount} pages)
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Un CV tenant sur une seule page est généralement recommandé pour un
                    meilleur impact auprès des recruteurs et une lecture optimale par
                    les logiciels de recrutement (ATS). Essayez de raccourcir certaines
                    sections, ou réduisez la taille du texte.
                </p>
                {onReduceFontSize && (
                    <button
                        onClick={onReduceFontSize}
                        className="mt-3 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-3 py-1.5 rounded-lg"
                    >
                        Réduire la taille du texte
                    </button>
                )}
            </div>
            <button
                onClick={() => setDismissed(true)}
                aria-label="Fermer"
                className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}