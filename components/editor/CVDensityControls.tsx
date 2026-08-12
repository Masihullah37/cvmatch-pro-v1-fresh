"use client";

import { Type, AlignJustify } from "lucide-react";

interface CVDensityControlsProps {
    fontScale: number;
    lineScale: number;
    onFontScaleChange: (v: number) => void;
    onLineScaleChange: (v: number) => void;
}

export default function CVDensityControls({
    fontScale,
    lineScale,
    onFontScaleChange,
    onLineScaleChange,
}: CVDensityControlsProps) {
    return (
        <div className="w-full md:w-auto flex flex-col gap-4 bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-3">
                <Type className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Taille du texte</label>
                        <span className="text-xs text-slate-400">{Math.round(fontScale * 100)}%</span>
                    </div>
                    <input
                        type="range" min={0.85} max={1.15} step={0.01}
                        value={fontScale}
                        onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
                        className="w-full accent-pink-600"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <AlignJustify className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Espacement des lignes</label>
                        <span className="text-xs text-slate-400">{Math.round(lineScale * 100)}%</span>
                    </div>
                    <input
                        type="range" min={0.9} max={1.4} step={0.01}
                        value={lineScale}
                        onChange={(e) => onLineScaleChange(parseFloat(e.target.value))}
                        className="w-full accent-pink-600"
                    />
                </div>
            </div>
        </div>
    );
}