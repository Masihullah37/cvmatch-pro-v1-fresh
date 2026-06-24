'use client';

import { Briefcase, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface JobInputPanelProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
}

export default function JobInputPanel({
  jobTitle,
  setJobTitle,
  jobDescription,
  setJobDescription
}: JobInputPanelProps) {
  const t = useTranslations('Index.job_panel');

  return (
    <div className="glass-card rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl flex flex-col h-full animate-in fade-in duration-700 delay-150">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary p-3 rounded-2xl">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('title')}</h2>
            <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">{t('subtitle')}</p>
          </div>
        </div>
        <div className="bg-blue-50 text-primary px-3 py-1 rounded-full flex items-center gap-2">
          <Info size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('optional')}</span>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <div className="space-y-3">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">{t('title_label')}</label>
            <span className="text-[9px] font-bold text-gray-500 uppercase">{t('title_optional')}</span>
          </div>
          <input
            type="text"
            placeholder={t('title_placeholder')}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none text-slate-700 placeholder:text-gray-400 transition-all"
          />
        </div>

        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">{t('description_label')}</label>
            <span className="text-[9px] font-bold text-gray-500 uppercase">{t('description_optional')}</span>
          </div>
          <textarea
            placeholder={t('description_placeholder')}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full flex-1 min-h-[200px] sm:min-h-[250px] bg-slate-50 border-none rounded-xl sm:rounded-[2rem] px-4 py-4 sm:px-6 sm:py-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none resize-none leading-relaxed text-slate-700 placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 text-center px-4 uppercase tracking-tighter leading-relaxed">
          {t('footer_note')}
        </p>
      </div>
    </div>
  );
}
