'use client';

import { FileUp, FileText, UserPlus, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface CVUploadPanelProps {
  cvFile: File | null;
  setCvFile: (file: File | null) => void;
  cvUrl: string;
  setCvUrl: (url: string) => void;
  profileDescription?: string;
  setProfileDescription?: (desc: string) => void;
}

export default function CVUploadPanel({
  cvFile,
  setCvFile,
  cvUrl,
  setCvUrl,
  profileDescription = '',
  setProfileDescription
}: CVUploadPanelProps) {
  const [mode, setMode] = useState<'upload' | 'profile'>('upload');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCvFile(acceptedFiles[0]);
    }
  }, [setCvFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  return (
    <div className="glass-card rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-2xl flex flex-col h-full animate-in fade-in duration-700 w-full max-w-full overflow-hidden">
      {/* Fixed: Added wrap behaviors and flex direction stacking for small mobile screens */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 w-full">
        <div className="flex items-center gap-3 sm:gap-4 max-w-full">
          <div className="bg-primary/10 text-primary p-2.5 sm:p-3 rounded-2xl shrink-0">
            {mode === 'upload' ? <FileText size={20} className="sm:w-6 sm:h-6" /> : <UserPlus size={20} className="sm:w-6 sm:h-6" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
              {mode === 'upload' ? 'Votre CV' : 'Votre Profil'}
            </h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
              {mode === 'upload' ? 'Importation' : 'Saisie Manuelle'}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${mode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Fichier
          </button>
          <button
            onClick={() => setMode('profile')}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${mode === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Texte
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div
          {...getRootProps()}
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl sm:rounded-[2rem] p-4 sm:p-10 transition-all w-full ${isDragActive ? 'border-primary bg-primary/5 scale-[0.98]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
            } cursor-pointer group`}
        >
          <input {...getInputProps()} />
          <div className="bg-white text-primary p-4 sm:p-6 rounded-full mb-4 sm:mb-6 shadow-xl group-hover:scale-110 transition-transform">
            <FileUp size={32} className="sm:w-10 sm:h-10" />
          </div>

          {cvFile ? (
            <div className="text-center space-y-2 px-2 max-w-full">
              <p className="font-black text-primary text-base sm:text-lg break-all">{cvFile.name}</p>
              <p className="text-xs sm:text-sm font-bold text-slate-400">Fichier prêt pour l'analyse.</p>
            </div>
          ) : (
            <div className="text-center space-y-2 px-2">
              <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">Glissez votre CV ici</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                Ou cliquez pour parcourir vos dossiers. PDF ou DOCX acceptés.
              </p>
            </div>
          )}

          <button className="mt-4 sm:mt-8 bg-primary text-white font-black px-5 py-2.5 sm:px-8 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap">
            Sélectionner un fichier
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4 w-full">
          <div className="relative flex-1 w-full">
            <textarea
              value={profileDescription}
              onChange={(e) => setProfileDescription?.(e.target.value)}
              placeholder="Décrivez votre parcours, vos expériences et vos compétences ici... L'IA s'occupera de générer un CV parfaitement adapté."
              className="w-full h-full min-h-[200px] sm:min-h-[300px] p-4 sm:p-6 bg-slate-50 border-none rounded-xl sm:rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none resize-none leading-relaxed text-slate-700"
            />

          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 text-center px-4 italic">
            L'IA utilisera ces détails pour créer un CV compatible avec l'offre d'emploi.
          </p>
        </div>
      )}
    </div>
  );
}


