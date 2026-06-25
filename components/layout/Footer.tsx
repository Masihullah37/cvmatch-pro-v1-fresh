'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Mail, ShieldCheck, CreditCard } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Main row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div className="flex items-center shrink-0">
            <Image src="/ouicvlogo.png" alt="OuiCV" width={150} height={50} className="object-contain" style={{ height: 'auto' }} />
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400">
            <Link href={`/${locale}`} className="hover:text-white transition-colors">Accueil</Link>
            <Link href={`/${locale}#pricing`} className="hover:text-white transition-colors">Tarifs</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">CGU</Link>
            <Link href={`/${locale}/legal-notice`} className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">RGPD</Link>
          </nav>

          {/* Contact */}
          <a
            href="mailto:contact@rushai.pro"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <Mail size={14} className="text-primary" />
            contact@rushai.pro
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {year} RushAI — OuiCV. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ShieldCheck size={12} className="text-emerald-500" />
              Stripe SSL 256-bit
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <CreditCard size={12} />
              Visa · Mastercard · Apple Pay
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}