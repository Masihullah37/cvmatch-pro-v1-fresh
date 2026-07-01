'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();
  const locale = useLocale();

  if (!isLoaded) {
    return <div className="w-20 h-8 bg-muted animate-pulse rounded-md" />;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        {/* Localized Link instead of a pop-up modal overlay */}
        <Link
          href="/sign-in"
          className="text-sm font-black text-slate-600 hover:text-emerald-600 transition-colors tracking-tight uppercase cursor-pointer"
        >
          Se connecter
        </Link>

        <Link
          href="/sign-up"
          className="text-sm font-black bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest text-[10px] cursor-pointer"
        >
          S'inscrire
        </Link>
      </div>
    );
  }

  return (

    <UserButton
      appearance={{
        elements: {
          // ── Trigger button (avatar in navbar) ────────────
          userButtonAvatarBox: "w-9 h-9 ring-2 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all",

          // ── Dropdown popup ────────────────────────────────
          userButtonPopoverCard:
            "shadow-2xl border border-slate-100 rounded-[1.5rem] !w-[280px] !max-w-[calc(100vw-2rem)]",
          userButtonPopoverActions: "p-2",
          userButtonPopoverActionButton:
            "rounded-xl hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm",
          userButtonPopoverActionButtonText: "font-bold text-slate-700",
          userButtonPopoverActionButtonIcon: "text-slate-400",
          userButtonPopoverFooter: "hidden",

          // ── User preview inside dropdown ──────────────────
          userPreviewMainIdentifier: "font-black text-slate-900 text-sm",
          userPreviewSecondaryIdentifier: "text-slate-400 text-xs",
          userPreviewAvatarBox: "w-10 h-10",

          // ── Full UserProfile modal (Manage Account) ───────
          userProfile: "!max-w-[min(560px,calc(100vw-2rem))] !w-full",
          userProfilePage: "!max-w-full",
          profileSectionContent: "!max-w-full",
          scrollBox: "!max-w-full",

          // ── Modal overlay ─────────────────────────────────
          modalContent:
            "!w-[min(560px,calc(100vw-1rem))] !max-w-full !mx-auto !rounded-[1.5rem] overflow-hidden",
          modalCloseButton: "top-4 right-4",
        },
      }}
    />
  );
}