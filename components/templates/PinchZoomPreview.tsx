"use client";
import { useRef, useState, useCallback } from "react";

interface PinchZoomPreviewProps {
    children: React.ReactNode;
}

export default function PinchZoomPreview({ children }: PinchZoomPreviewProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [origin, setOrigin] = useState("top left");
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

    // Converts the touch midpoint into a percentage-based transform-origin
    // relative to this wrapper, so zooming expands from wherever the
    // user's fingers actually are — not always the top-left corner.
    const setOriginFromTouches = (touches: React.TouchList) => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const midX = (touches[0].clientX + (touches[1]?.clientX ?? touches[0].clientX)) / 2;
        const midY = (touches[0].clientY + (touches[1]?.clientY ?? touches[0].clientY)) / 2;
        const originX = ((midX - rect.left) / rect.width) * 100;
        const originY = ((midY - rect.top) / rect.height) * 100;
        setOrigin(`${originX}% ${originY}%`);
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            touchState.current.startDistance = getDistance(e.touches);
            touchState.current.startScale = zoomScale;
            setOriginFromTouches(e.touches);
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - touchState.current.lastTap < 300) {
                setOriginFromTouches(e.touches);
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
        <div
            ref={wrapperRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: origin,
                transition: touchState.current.startDistance ? "none" : "transform 0.15s ease-out",
            }}
        >
            {children}
        </div>
    );
}