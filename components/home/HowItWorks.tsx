'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Cpu, BarChart3, Download, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    icon: Upload,
    number: '01',
    title: 'Importez votre CV',
    desc: 'PDF ou DOCX, ou décrivez votre profil',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  {
    icon: Cpu,
    number: '02',
    title: "Collez l'offre d'emploi",
    desc: 'URL ou description du poste visé',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Obtenez votre score ATS',
    desc: 'Analyse IA en moins de 30 secondes',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
  },
  {
    icon: Download,
    number: '04',
    title: 'Téléchargez vos CVs',
    desc: 'modèles optimisés prêts au recruteur',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Intersection observer — start animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Cycle through active steps
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <section ref={ref} className="pt-2 pb-16 px-4 bg-transparent">
      <div className="max-w-5xl mx-auto">

        {/* Label */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
            ✦ Comment ça marche
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Optimisez votre CV en{' '}
            <span className="text-primary">4 étapes simples</span>
          </h2>
        </div>

        {/* Steps — horizontal on md+, vertical on mobile */}
        <div className="relative">

          {/* Connecting line — desktop only */}
          <div className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-0.5 bg-slate-100 z-0">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 via-orange-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
            {STEPS.map((step, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className={`flex flex-col items-center text-center cursor-pointer transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                  onClick={() => setActiveStep(i)}
                >
                  {/* Icon circle */}
                  <div
                    className="relative w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-4 transition-all duration-500 border-2"
                    style={{
                      background: isActive || isDone ? step.bg : 'rgb(248,250,252)',
                      borderColor: isActive ? step.color : isDone ? `${step.color}60` : 'rgb(226,232,240)',
                      transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      boxShadow: isActive ? `0 8px 32px ${step.color}30` : 'none',
                    }}
                  >
                    <Icon
                      size={28}
                      style={{ color: isActive || isDone ? step.color : '#94a3b8' }}
                    />
                    {/* Step number badge */}
                    <div
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white transition-all duration-300"
                      style={{
                        background: isActive ? step.color : isDone ? `${step.color}90` : '#cbd5e1',
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>

                  {/* Mobile connecting line */}
                  {i < STEPS.length - 1 && (
                    <div className="md:hidden w-0.5 h-8 bg-slate-200 my-1 relative overflow-hidden">
                      <div
                        className="absolute inset-x-0 top-0 bg-primary transition-all duration-700"
                        style={{ height: isDone ? '100%' : '0%' }}
                      />
                    </div>
                  )}

                  <p
                    className="text-sm font-black mb-1 transition-colors duration-300"
                    style={{ color: isActive ? step.color : '#1e293b' }}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[140px]">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="#analyze"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            Commencer maintenant
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}