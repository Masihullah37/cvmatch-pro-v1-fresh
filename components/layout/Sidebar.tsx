// import { LayoutDashboard, Clock, Plus, Sparkles, Zap } from 'lucide-react';
// import { Link } from '@/i18n/routing';
// import { auth } from '@clerk/nextjs/server';
// import { db } from '@/lib/db';
// import { users } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';

// export default async function Sidebar() {
//   const { userId } = await auth();
//   let credits = 0;
//   let planName = "Gratuit";

//   if (userId) {
//     try {
//       const userRecord = await db.query.users.findFirst({
//         where: eq(users.clerkId, userId)
//       });
//       if (userRecord) {
//         // Check for expiry
//         const now = new Date();
//         const expiryDate = userRecord.creditsExpiry ? new Date(userRecord.creditsExpiry) : null;

//         if (expiryDate && now > expiryDate) {
//            credits = 0;
//            // Optionally update DB here, but better to do it lazily or via a cron job
//            // For the UI, we'll just show 0
//         } else {
//            credits = userRecord.credits || 0;
//         }

//         if (userRecord.plan === 'monthly') planName = "Pro";
//         else if (userRecord.plan === 'one_time') planName = "Starter";
//       }
//     } catch (e) {
//       console.error("Error fetching user stats for sidebar", e);
//     }
//   }

//   return (
//     <aside className="w-64 flex-shrink-0 min-h-screen bg-slate-50 border-r border-slate-200 flex flex-col p-6 no-print">
//        <div className="flex items-center gap-3 mb-10">
//          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
//             <Sparkles className="text-white" size={20} />
//          </div>
//          <div>
//            <h2 className="font-black text-slate-900 leading-tight tracking-tight">CVMatch <span className="text-primary text-xs uppercase">Pro</span></h2>
//            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">AI Recruitment</p>
//          </div>
//        </div>

//        <nav className="flex-1 space-y-2">
//          <Link href="/" className="flex items-center gap-3 bg-primary text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]">
//            <LayoutDashboard size={18} /> Tableau de bord
//          </Link>
//          <Link href="/dashboard" className="flex items-center gap-3 text-slate-500 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
//            <Clock size={18} /> Historique
//          </Link>
//          <Link href="/dashboard/settings" className="flex items-center gap-3 text-slate-500 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
//            <Zap size={18} /> Paramètres
//          </Link>
//        </nav>

//        <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
//          {/* User Limits Section */}
//          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
//            <div className="flex items-center justify-between mb-2">
//              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Votre Plan</span>
//              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-blue-50 px-2 py-0.5 rounded-full">{planName}</span>
//            </div>
//            <div className="flex items-center gap-2 mb-1">
//              <Zap size={14} className="text-orange-500 fill-orange-500" />
//              <span className="text-sm font-black text-slate-900">{credits} Crédits</span>
//            </div>
//            <p className="text-[10px] text-slate-400 font-bold leading-tight">Restants pour générer vos CVs et Lettres</p>
//          </div>

//          <Link href="/" className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
//            <Plus size={16} /> Nouvelle Analyse
//          </Link>
//        </div>
//     </aside>
//   );
// }

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SidebarClient from './SidebarClient'; // Assuming SidebarClient exists and handles rendering
import { PlanType } from '@/lib/billing/get-user-plan'; // Import PlanType

export default async function Sidebar() {
  const { userId } = await auth();
  let credits = 0;
  let planName = 'Gratuit';

  if (userId) {
    try {
      const results = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
      const userRecord = results[0];

      if (userRecord) {
        const now = new Date();
        const expiryDate = userRecord.creditsExpiry ? new Date(userRecord.creditsExpiry) : null;
        credits = expiryDate && now > expiryDate ? 0 : (userRecord.credits || 0);
        if (userRecord.plan === 'monthly') planName = 'Pro';
        else if (userRecord.plan === 'one_time') planName = 'Starter';
      }
    } catch (e) {
      console.error('Sidebar fetch error', e);
    }
  }

  return <SidebarClient credits={credits} planName={planName} />;
}