'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { CVRenderer } from '@/components/templates/CVRenderer';
import { ArrowRight, Sparkles } from 'lucide-react';
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

export default function DemoTemplateCarousel({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const locale = useLocale();

  const demoTemplates = STYLES.map((style, i) => ({
    id: `demo-${i + 1}`,
    templateNumber: i + 1,
    templateStyle: style,
    templateData: DEMO_DATA,
    pdfUrl: undefined,
  }));

  const handleClick = (templateNumber: number) => {
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
          <p className="text-slate-500 font-medium max-w-xl mx-auto">
            Choisissez votre style préféré. Cliquez pour ouvrir l'éditeur et personnaliser avec vos vraies informations.
          </p>
        </div>

        {/* Template Grid */}
        {/* ✨ FIX 2a: Dropped to grid-cols-1 on mobile so layout handles wider rendering space safely */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {demoTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleClick(template.templateNumber)}
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              // className="group bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 text-left"
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 text-left hover:shadow-2xl hover:-translate-y-1 hover:border-emerald-200 active:shadow-2xl active:-translate-y-1 active:border-emerald-200"
            >
              {/* Preview */}
              {/* ✨ FIX 2b: Changed to use layout height classes h-56 mobile to improve visible space */}
              <div className="relative bg-slate-50 overflow-hidden flex justify-center h-56 sm:h-[280px]">
                <div className="absolute inset-0 flex justify-center items-start pt-4">
                  <div className="scale-[0.25] sm:scale-[0.28] origin-top transform-gpu pointer-events-none transition-transform">
                    <CVRenderer template={template} isPaid={true} analysisData={null} />
                  </div>
                </div>
                {/* Hover overlay */}
                {/* <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 transition-colors flex items-center justify-center"> */}
                <div className="absolute inset-0 bg-emerald-600/0 transition-colors flex items-center justify-center group-hover:bg-emerald-600/10 group-active:bg-emerald-600/10">
                  {/* <span className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl flex items-center gap-2"> */}
                  <span className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs opacity-0 translate-y-2 transition-all shadow-xl flex items-center gap-2 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                    Utiliser ce modèle <ArrowRight size={14} />
                  </span>
                </div>
              </div>
              {/* Label */}
              <div className="p-3 border-t border-slate-100">
              </div>
            </button>
          ))}
        </div>

        {/* CTA
        <div className="mt-12 text-center">
          <button
            onClick={() => handleClick(1)}
            className="inline-flex items-center gap-3 bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Sparkles size={18} />
            Personnaliser avec mon vrai CV
            <ArrowRight size={18} />
          </button>
          <p className="text-slate-400 text-xs font-medium mt-3">
            Données de démonstration — vos vraies informations seront utilisées après déblocage
          </p>
        </div> */}

        {/* CTA removed - button now lives in Results header */}
      </div>
    </div>
  );
}