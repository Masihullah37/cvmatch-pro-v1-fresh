"use client";
import { useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PinchZoomPreviewProps {
    children: React.ReactNode;
}

export default function PinchZoomPreview({ children }: PinchZoomPreviewProps) {
    const [zoomScale, setZoomScale] = useState(1);
    const touchState = useRef<{ startDistance: number; startScale: number; lastTap: number }>({
        startDistance: 0,
        startScale: 1,
        lastTap: 0,
    });

    const MIN_SCALE = 1;
    const MAX_SCALE = 3;

    const getDistance = (touches: React.TouchList) => {
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            touchState.current.startDistance = getDistance(e.touches);
            touchState.current.startScale = zoomScale;
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - touchState.current.lastTap < 300) {
                setZoomScale((s) => (s > MIN_SCALE ? MIN_SCALE : 2));
            }
            touchState.current.lastTap = now;
        }
    }, [zoomScale]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const newDistance = getDistance(e.touches);
            const ratio = newDistance / touchState.current.startDistance;
            setZoomScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, touchState.current.startScale * ratio)));
        }
    }, []);

    return (
        <>
            <div className="sticky top-2 z-30 flex justify-end gap-2 mb-2 sm:hidden pointer-events-none">
                <div className="pointer-events-auto flex gap-2">
                    <button onClick={() => setZoomScale((s) => Math.max(MIN_SCALE, s - 0.5))} className="bg-white shadow-md rounded-full p-2 border border-slate-200 active:scale-95" aria-label="Réduire">
                        <ZoomOut size={16} className="text-slate-700" />
                    </button>
                    <button onClick={() => setZoomScale((s) => Math.min(MAX_SCALE, s + 0.5))} className="bg-white shadow-md rounded-full p-2 border border-slate-200 active:scale-95" aria-label="Agrandir">
                        <ZoomIn size={16} className="text-slate-700" />
                    </button>
                    {zoomScale > MIN_SCALE && (
                        <button onClick={() => setZoomScale(MIN_SCALE)} className="bg-white shadow-md rounded-full p-2 border border-slate-200 active:scale-95" aria-label="Réinitialiser">
                            <RotateCcw size={16} className="text-slate-700" />
                        </button>
                    )}
                </div>
            </div>
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                style={{ transform: `scale(${zoomScale})`, transformOrigin: "top left", transition: touchState.current.startDistance ? "none" : "transform 0.15s ease-out" }}
            >
                {children}
            </div>
        </>
    );
}