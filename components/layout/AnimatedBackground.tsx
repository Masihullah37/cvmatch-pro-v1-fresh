'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * AMBIENT ANIMATION EFFECT
 * A modern, slow-moving abstract background animation layer.
 * Smooth green and blue gradients drifting through space.
 */
export default function AnimatedBackground() {
  // Define colors for the gradients
  const colors = {
    green: 'rgba(16, 185, 129, 0.12)', // emerald-500 with low opacity
    blue: 'rgba(59, 130, 246, 0.12)',  // blue-500 with low opacity
    cyan: 'rgba(6, 182, 212, 0.12)',  // cyan-500 with low opacity
  };

  // Configuration for drifting shapes (rendered desktop only to save mobile TBT)
  const shapes = [
    {
      id: 1,
      size: '600px',
      duration: 35,
      xPattern: [0, 200, -100, 150, 0],
      yPattern: [0, 100, 200, 50, 0],
      colorPattern: [colors.green, colors.blue, colors.cyan, colors.green],
      left: '-5%',
      top: '10%',
    },
    {
      id: 2,
      size: '550px',
      duration: 40,
      xPattern: [0, -150, 100, -200, 0],
      yPattern: [0, 150, 50, 250, 0],
      colorPattern: [colors.blue, colors.cyan, colors.green, colors.blue],
      left: '60%',
      top: '20%',
    },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden z-[-10] pointer-events-none bg-white">
      {/* Lightweight static radial ambient glow for mobile */}
      <div className="absolute inset-0 block md:hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/60 via-slate-50/40 to-white" />

      {/* Heavy Drifting Organic Shapes (Desktop only for max mobile performance) */}
      <div className="hidden md:block absolute inset-0 overflow-hidden">
        {shapes.map((shape) => (
          <motion.div
            key={shape.id}
            className="absolute rounded-full transform-gpu will-change-transform"
            style={{
              width: shape.size,
              height: shape.size,
              filter: 'blur(80px)',
              opacity: 0.5,
              left: shape.left,
              top: shape.top,
            }}
            animate={{
              x: shape.xPattern,
              y: shape.yPattern,
              backgroundColor: shape.colorPattern,
            }}
            transition={{
              duration: shape.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Subtle Grain Overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Bottom fade to ensure content clarity at the very end of long pages */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" 
      />
    </div>
  );
}
