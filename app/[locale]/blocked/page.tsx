'use client';

import { ShieldAlert, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
          <ShieldAlert size={48} />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Compte <span className="text-red-500">Bloqué</span></h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Votre accès aux services de OuiCV Pro a été suspendu par l'administrateur.
            Cela peut être dû à un non-respect de nos conditions d'utilisation.
          </p>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Besoin d'aide ?</p>
          <a
            href="mailto:contact@ouicv.com"
            className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg"
          >
            <Mail size={18} /> Contacter le Support
          </a>
        </div>
      </motion.div>
    </div>
  );
}
