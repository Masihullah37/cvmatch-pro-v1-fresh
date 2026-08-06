"use client";

import React, { useState, useRef } from 'react';

// Survives the component being unmounted/remounted by an unrelated parent
// re-render — plain module state, not React state, so it isn't reset.
const draftCache: Record<string, string> = {};

const InlineEditInteractive = ({ value, path, isInteractive, onUpdate, className = "", multiline = false }: any) => {
  // Only drop the draft once the parent's value has actually caught up to it —
  // clearing it right on blur (before the parent re-renders) is what let the
  // old value flash back in if a remount landed in that gap.
  if (Object.prototype.hasOwnProperty.call(draftCache, path) && draftCache[path] === value) {
    delete draftCache[path];
  }

  const hasDraft = Object.prototype.hasOwnProperty.call(draftCache, path);
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(hasDraft ? draftCache[path] : value);
  const inputRef = useRef<any>(null);

  if (!isInteractive) return <span className={className}>{value}</span>;

  const handleChange = (v: string) => {
    setCurrentValue(v);
    draftCache[path] = v;
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value && onUpdate) onUpdate(path, currentValue);
  };

  const displayValue = hasDraft ? draftCache[path] : value;

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className={`w-full bg-white/95 text-slate-950 border border-blue-300 rounded p-1 outline-none focus:ring-1 focus:ring-blue-400 shadow-sm ${className}`}
          rows={Math.max(2, (currentValue || "").split('\n').length)}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        autoFocus
        className={`w-full bg-white/95 border border-blue-300 rounded p-1 outline-none focus:ring-1 focus:ring-blue-400 text-slate-950 shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentValue(displayValue); setIsEditing(true); }}
      className={`cursor-text hover:bg-white/20 hover:ring-1 hover:ring-blue-300 rounded transition-colors inline-block min-w-[20px] ${className}`}
      title="Cliquez pour modifier"
    >
      {displayValue || (multiline ? "\u00A0\n\u00A0" : "\u00A0")}
    </span>
  );
};

export default InlineEditInteractive;