'use client';

import {
  LayoutDashboard, Clock, Plus, Sparkles,
  Zap, Settings, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface SidebarProps {
  credits?: number;
  planName?: string;
}

export default function SidebarClient({ credits = 0, planName = 'Gratuit' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update CSS variable so #main-content shifts correctly
  useEffect(() => {
    if (!isMounted) return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        collapsed ? '80px' : '256px'
      );
    }
  }, [collapsed, isMounted]);

  // Reset offset on mobile
  useEffect(() => {
    if (!isMounted) return;
    const handleResize = () => {
      if (window.innerWidth < 768) {
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      } else {
        document.documentElement.style.setProperty(
          '--sidebar-width',
          collapsed ? '80px' : '256px'
        );
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed, isMounted]);

  const planColor =
    planName === 'Pro' ? 'text-purple-600 bg-purple-50' :
      planName === 'Starter' ? 'text-amber-600 bg-amber-50' :
        'text-slate-500 bg-slate-100';

  const navItems = [
    { href: '/#analyze', label: 'Nouvelle Analyse', icon: Plus, accent: true },
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard/my-cvs', label: 'Mon CV', icon: Clock },
    { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <>
      {/* ── Mobile: floating trigger ───────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-6 left-4 z-50 md:hidden w-12 h-12 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile: drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
              <Image src="/ouicvlogo.png" alt="Logo" width={110} height={36} className="object-contain" />
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all antialiased ${item.accent
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'hover:bg-slate-50'
                    }`}
                  style={item.accent ? undefined : { color: '#0b0f19' }}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Credits */}
            <div className="p-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${planColor}`}>{planName}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold antialiased" style={{ color: '#0b0f19' }}>{credits} Crédits</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium antialiased">Restants pour générer vos CVs</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop: fixed sidebar ─────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-[60] bg-white border-r border-slate-100 transition-all duration-300 no-print ${collapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Orange toggle button — improved visibility */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-24 z-[70] w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-[0_4px_12px_rgba(249,115,22,0.4)] flex items-center justify-center transition-all hover:scale-110 border-2 border-white"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Logo */}
        <div className={`flex items-center gap-3 p-5 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
          <motion.div
            animate={{
              filter: ["drop-shadow(0 0 0px rgba(16, 185, 129, 0))", "drop-shadow(0 0 12px rgba(16, 185, 129, 0.3))", "drop-shadow(0 0 0px rgba(16, 185, 129, 0))"]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="relative"
          >
            <Image
              src="/ouicvlogo.png"
              alt="Logo"
              width={collapsed ? 40 : 140}
              height={collapsed ? 40 : 46}
              className="object-contain shrink-0 mix-blend-multiply"
              priority
            />
          </motion.div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-2xl font-semibold text-xs uppercase tracking-widest transition-all antialiased ${collapsed ? 'justify-center' : ''
                } ${item.accent
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'hover:bg-slate-50'
                }`}
              style={item.accent ? undefined : { color: '#0b0f19' }}
            >
              <item.icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Credits */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plan</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${planColor}`}>{planName}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold antialiased" style={{ color: '#0b0f19' }}>{credits} Crédits</span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium antialiased">Restants pour générer vos CVs</p>
            </div>
          </div>
        )}

        {/* Collapsed credits dot */}
        {collapsed && (
          <div className="p-3 border-t border-slate-100 flex justify-center">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center" title={`${credits} crédits`}>
              <Zap size={16} className="text-amber-500 fill-amber-500" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}