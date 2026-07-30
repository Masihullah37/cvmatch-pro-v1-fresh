'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { CVRenderer } from '@/components/templates/CVRenderer';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { CV_TEMPLATE_STYLES } from "@/lib/cv-template-styles";

const DEMO_DATA = {
  userName: "Marie Dupont",
  jobTitle: "Développeuse Full Stack",
  summary: "Développeuse passionnée avec 5 ans d'expérience en React, Node.js et PostgreSQL. Spécialisée dans la création d'applications web performantes et accessibles pour le marché européen.",
  contact: { email: "marie.dupont@email.com", phone: "+33 6 12 34 56 78", location: "Paris, France" },
  experience: [
    { title: "Développeuse Senior", company: "TechCorp Paris", period: "2021–2024", description: "Développement de plateformes SaaS B2B en React/Node.js. Amélioration des performances de 40%. Encadrement d'une équipe de 3 développeurs juniors." },
    { title: "Développeuse Full Stack", company: "StartupXYZ", period: "2019–2021", description: "Création d'API RESTful et d'interfaces utilisateur modernes. Intégration de solutions de paiement Stripe." },
  ],
  education: [
    { degree: "Master Informatique", school: "Université Paris-Saclay", year: "2019", details: "Spécialisation Génie Logiciel" },
    { degree: "Licence Informatique", school: "Université Lyon 1", year: "2017", details: "" },
  ],
  skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Next.js"],
  languages: [{ language: "Français", level: "Natif" }, { language: "Anglais", level: "Courant (C1)" }],
  projects: [{ name: "OuiCV Platform", description: "Application SaaS d'optimisation de CV avec IA générative", technologies: ["Next.js", "OpenAI", "Stripe"] }],
  interests: ["Open Source", "UX Design", "Intelligence Artificielle"],
};

const STYLES = [...CV_TEMPLATE_STYLES];

function TemplateCard({
  template,
  isLoading,
  onClick,
  onPrefetch
}: {
  template: { id: string; templateNumber: number; templateStyle: string; templateData: typeof DEMO_DATA };
  isLoading: boolean;
  onClick: (num: number) => void;
  onPrefetch: (num: number) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef} className="h-56 sm:h-[280px] w-full">
      <button
        onClick={() => onClick(template.templateNumber)}
        onMouseEnter={() => onPrefetch(template.templateNumber)}
        onTouchStart={() => onPrefetch(template.templateNumber)}
        disabled={isLoading}
        style={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        className="group relative w-full h-full bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 text-left hover:shadow-2xl hover:-translate-y-1 hover:border-emerald-200 active:shadow-2xl active:-translate-y-1 active:border-emerald-200 disabled:cursor-wait"
      >
        {/* Preview Container */}
        <div className="relative bg-slate-50 overflow-hidden flex justify-center h-full w-full">
          {isVisible ? (
            <div className="absolute inset-0 flex justify-center items-start pt-4">
              <div className="scale-[0.25] sm:scale-[0.28] origin-top transform-gpu pointer-events-none transition-transform">
                <CVRenderer template={template} isPaid={true} analysisData={null} />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-100/60 animate-pulse flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {template.templateStyle}
              </span>
            </div>
          )}

          {/* Hover / Active Overlay */}
          <div className={`absolute inset-0 transition-colors flex items-center justify-center ${
            isLoading 
              ? 'bg-slate-900/60 backdrop-blur-xs' 
              : 'bg-emerald-600/0 group-hover:bg-emerald-600/10 group-active:bg-emerald-600/10'
          }`}>
            {isLoading ? (
              <div className="bg-white text-slate-900 px-4 py-2.5 rounded-xl font-black text-xs shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <Loader2 size={16} className="animate-spin text-pink-500" />
                <span>Chargement du modèle...</span>
              </div>
            ) : (
              <span className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs opacity-0 translate-y-2 transition-all shadow-xl flex items-center gap-2 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                Utiliser ce modèle <ArrowRight size={14} />
              </span>
            )}
          </div>
        </div>

        {/* Style Name Tag */}
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-lg border border-slate-200/60 shadow-xs">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            {template.templateStyle}
          </span>
        </div>
      </button>
    </div>
  );
}

export default function DemoTemplateCarousel({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [loadingTemplateId, setLoadingTemplateId] = useState<number | null>(null);

  const demoTemplates = STYLES.map((style, i) => ({
    id: `demo-${i + 1}`,
    templateNumber: i + 1,
    templateStyle: style,
    templateData: DEMO_DATA,
    pdfUrl: undefined,
  }));

  const handlePrefetch = (templateNumber: number) => {
    router.prefetch(`/${locale}/templates/${analysisId}?template=${templateNumber}`);
  };

  const handleClick = (templateNumber: number) => {
    if (loadingTemplateId !== null) return;
    setLoadingTemplateId(templateNumber);
    router.push(`/${locale}/templates/${analysisId}?template=${templateNumber}`);
  };

  return (
    <div className="py-16 px-4 md:px-6 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Sparkles size={12} />
            28 Modèles Professionnels
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 leading-tight mb-4">
            Modèles CV Recommandés
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto text-sm sm:text-base">
            Choisissez votre style préféré. Cliquez pour ouvrir l'éditeur et personnaliser avec vos vraies informations.
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {demoTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isLoading={loadingTemplateId === template.templateNumber}
              onClick={handleClick}
              onPrefetch={handlePrefetch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}