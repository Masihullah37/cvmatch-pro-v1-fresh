"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * DraggableEntryInteractive — wraps a single array entry (e.g. one experience row)
 * so it can be reordered inside its parent section without affecting section-level drag.
 */
const DraggableEntryInteractive = ({ id, children, className = "" }: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    touchAction: 'none',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`group/entry ${className}`}>
      {/* Grip handle — visible on hover / always on touch */}
      <div
        {...attributes}
        {...listeners}
        className="cv-section-controls absolute -left-6 top-1 opacity-100 md:opacity-0 md:group-hover/entry:opacity-100 cursor-grab active:cursor-grabbing p-1.5 bg-white rounded shadow border border-slate-300 text-slate-600 hover:text-slate-900 transition-all z-[90] touch-none"
        title="Réordonner"
        style={{ touchAction: 'none' }}
      >
        <GripVertical size={14} strokeWidth={2.5} />
      </div>
      {children}
    </div>
  );
};

export default DraggableEntryInteractive;
