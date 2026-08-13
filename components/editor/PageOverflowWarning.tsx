// "use client";

// import { AlertTriangle, X } from "lucide-react";
// import { useState } from "react";

// interface PageOverflowWarningProps {
//     pageCount: number;
//     onReduceFontSize?: () => void;
// }

// export default function PageOverflowWarning({ pageCount, onReduceFontSize }: PageOverflowWarningProps) {
//     const [dismissed, setDismissed] = useState(false);
//     if (pageCount <= 1 || dismissed) return null;

//     return (
//         <div
//             role="alert"
//             className="fixed z-50 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 shadow-lg shadow-amber-900/5 p-4 left-4 right-4 bottom-4 md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
//         >
//             <div className="shrink-0 rounded-full bg-amber-100 p-2">
//                 <AlertTriangle className="w-5 h-5 text-amber-600" />
//             </div>
//             <div className="flex-1 min-w-0">
//                 <p className="text-sm font-bold text-amber-900">
//                     Votre CV dépasse une page ({pageCount} pages)
//                 </p>
//                 <p className="text-xs text-amber-800 mt-1 leading-relaxed">
//                     Un CV tenant sur une seule page est généralement recommandé pour un
//                     meilleur impact auprès des recruteurs et une lecture optimale par
//                     les logiciels de recrutement (ATS). Essayez de raccourcir certaines
//                     sections, ou réduisez la taille du texte.
//                 </p>
//                 {onReduceFontSize && (
//                     <button
//                         onClick={onReduceFontSize}
//                         className="mt-3 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-3 py-1.5 rounded-lg"
//                     >
//                         Réduire la taille du texte
//                     </button>
//                 )}
//             </div>
//             <button
//                 onClick={() => setDismissed(true)}
//                 aria-label="Fermer"
//                 className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
//             >
//                 <X className="w-4 h-4" />
//             </button>
//         </div>
//     );
// }



"use client";

import { AlertTriangle, X, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PageOverflowWarningProps {
    pageCount: number;
    onReduceFontSize?: () => void;
    onIncreaseFontSize?: () => void;
}

export default function PageOverflowWarning({
    pageCount,
    onReduceFontSize,
    onIncreaseFontSize,
}: PageOverflowWarningProps) {
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const prevOverflowing = useRef(pageCount > 1);

    useEffect(() => setMounted(true), []);

    // If the CV goes from fitting back to overflowing again (e.g. user added
    // content after previously dismissing the banner), show it again.
    useEffect(() => {
        const isOverflowing = pageCount > 1;
        if (isOverflowing && !prevOverflowing.current) {
            setDismissed(false);
        }
        prevOverflowing.current = isOverflowing;
    }, [pageCount]);

    if (!mounted || pageCount <= 1 || dismissed) return null;

    return createPortal(
        <div
            role="alert"
            style={{ zIndex: 999999, pointerEvents: "auto" }}
            className="fixed flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 shadow-lg shadow-amber-900/10 p-4 left-4 right-4 bottom-4 md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
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
                <div className="mt-3 flex items-center gap-2">
                    {onReduceFontSize && (
                        <button
                            type="button"
                            onClick={onReduceFontSize}
                            className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 transition-colors px-3 py-1.5 rounded-lg"
                        >
                            <Minus className="w-3 h-3" /> Réduire la taille du texte
                        </button>
                    )}
                    {onIncreaseFontSize && (
                        <button
                            type="button"
                            onClick={onIncreaseFontSize}
                            className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors px-2.5 py-1.5 rounded-lg"
                            aria-label="Augmenter la taille du texte"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Fermer"
                className="shrink-0 text-amber-400 hover:text-amber-600 active:text-amber-700 transition-colors p-1 -m-1"
            >
                <X className="w-4 h-4" />
            </button>
        </div>,
        document.body
    );
}