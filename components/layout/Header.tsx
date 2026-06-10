// 


'use client';

import { Link } from '@/i18n/routing';
import AuthButtons from './AuthButtons';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Menu, X, ChevronLeft as BackIcon, ChevronRight as ForwardIcon, Plus, Home } from 'lucide-react';

export default function Header() {
  const { userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isHome = pathname === '/' || pathname === '/fr' || pathname === '/en';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    
    if (userId) {
      fetch('/api/user/role')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => {});
    }

    return () => window.removeEventListener('scroll', onScroll);
  }, [userId]);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100'
        : 'bg-transparent'
    }`}>
      <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center group">
            <span className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight uppercase flex items-center gap-2">
              <Home size={18} />
              {locale === 'en' ? 'Home' : 'Accueil'}
            </span>
          </Link>


        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#analyze" className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 active:bg-pink-700 transition-all shadow-lg shadow-pink-200">
            <Plus size={14} /> Nouvelle Analyse
          </Link>
          {userId && (
            <div className="flex items-center gap-6">
              {isAdmin && (
                <Link href="/admin" className="text-sm font-black text-white bg-emerald-600 px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
                  Admin
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Right */}
        <div className="hidden md:flex items-center gap-4">
          <AuthButtons />
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-6 space-y-4 shadow-xl">
          <Link href="/#analyze" className="flex items-center justify-center gap-2 bg-pink-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 active:bg-pink-700 transition-all" onClick={() => setMobileOpen(false)}>
            <Plus size={14} /> Nouvelle Analyse
          </Link>
          {userId && (
            <>
              {isAdmin && (
                <Link href="/admin" className="block text-sm font-bold text-emerald-600 py-2" onClick={() => setMobileOpen(false)}>
                  Admin Panel
                </Link>
              )}
            </>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
            <AuthButtons />
          </div>
        </div>
      )}
    </header>
  );
}