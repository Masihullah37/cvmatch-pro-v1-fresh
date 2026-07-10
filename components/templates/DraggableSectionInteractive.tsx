"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

const DraggableSectionInteractive = ({ id, onDelete, children, style: extraStyle = {}, className = "" }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    ...extraStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    // 🚀 CRITICAL MOBILE FIX: Stops the background window from scrolling when dragging a container!
    touchAction: 'none'
  };

  return (
    <div ref={setNodeRef} style={style} className={`group relative select-none ${className}`}>
      <div
        {...attributes}
        {...listeners}
        className="cv-section-controls absolute -left-1 top-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1.5 bg-white rounded-md shadow-md border border-slate-300 text-slate-600 hover:text-slate-900 touch-none hover:border-slate-400 transition-all z-[100]"
        title="Déplacer"
      >
        <GripVertical size={14} strokeWidth={2.5} />
      </div>
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
        className="cv-section-controls cv-section-controls--delete absolute -right-1 top-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer p-1.5 rounded-md shadow-md border-2 transition-all z-[100] hover:bg-red-50"
        title="Supprimer"
      >
        <Trash2 size={14} strokeWidth={2.5} />
      </div>
      <div className="pl-8 pr-8 min-w-0">
        {children}
      </div>
    </div>
  );
};

export default DraggableSectionInteractive;
