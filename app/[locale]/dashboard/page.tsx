import { db } from "@/lib/db";
import { cvAnalyses, users, cvTemplates } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { cancelSubscription } from "@/app/actions/stripe";
import {
  FileText, ArrowRight, Sparkles, TrendingUp,
  CreditCard, Clock, Zap, Plus, History,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { userId } = await auth();
  const user = await currentUser();
  const { locale } = await params;

  if (!userId || !user) redirect("/sign-in");

  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser && user) {
    const [newUser] = await db.insert(users).values({
      clerkId: userId,
      email: user.emailAddresses[0]?.emailAddress || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Utilisateur",
      plan: "free",
      credits: 0,
    }).returning();
    dbUser = newUser;
  }

  if (!dbUser) return null;

  const resolvedSearchParams = await searchParams; // Await the searchParams promise
  async function handleCancelSubscription() {
    "use server";
    await cancelSubscription(locale);
  }

  const analyses = await db.query.cvAnalyses.findMany({
    where: eq(cvAnalyses.userId, dbUser.id),
    orderBy: [desc(cvAnalyses.createdAt)],
    limit: 10,
  });

  let generatedCvs: any[] = [];
  if (analyses.length > 0) {
    const analysisIds = analyses.map(a => a.id);
    generatedCvs = await db.query.cvTemplates.findMany({
      where: inArray(cvTemplates.analysisId, analysisIds),
      orderBy: [desc(cvTemplates.createdAt)],
      limit: 20,
    });
  }

  const credits = dbUser?.credits ?? 0;
  const bestScore = analyses.length > 0 ? Math.max(...analyses.map(a => a.atsScore || 0)) : 0;
  const planLabel = dbUser.plan === 'monthly' ? 'Pro' : dbUser.plan === 'one_time' ? 'Starter' : 'Gratuit';
  const planColor = dbUser.plan === 'monthly' ? 'text-purple-600 bg-purple-50 border-purple-200' :
    dbUser.plan === 'one_time' ? 'text-amber-600 bg-amber-50 border-amber-200' :
      'text-slate-500 bg-slate-50 border-slate-200';

  // Group cv templates by analysisId — one card per analysis
  const uniqueCvsByAnalysis = Array.from(
    new Map(generatedCvs.map(cv => [cv.analysisId, cv])).values()
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Success Notification */}
      {resolvedSearchParams?.cancellation === 'success' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <CheckCircle2 size={20} />
          <span className="font-black uppercase tracking-widest text-xs">Abonnement résilié avec succès</span>
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Tableau de bord</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              Bonjour, <span className="text-primary">{user.firstName || "Candidat"}</span> 👋
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">Prêt à décrocher votre prochain job ?</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all shrink-0"
          >
            <Zap size={16} className="fill-white" />
            Nouvelle Analyse
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Credits */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                <CreditCard size={20} className="text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crédits</span>
            </div>
            <div>
              <p className="text-5xl font-black text-slate-900 leading-none">{credits}</p>
              <p className="text-slate-400 text-sm font-medium mt-1">Générations restantes</p>
            </div>
          </div>

          {/* Best score */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meilleur Score</span>
            </div>
            <div>
              <p className="text-5xl font-black text-slate-900 leading-none">{bestScore}<span className="text-2xl text-slate-300">%</span></p>
              <p className="text-slate-400 text-sm font-medium mt-1">Compatibilité maximale</p>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-slate-900 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            <div className="flex items-center justify-between relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <Sparkles size={20} className="text-primary fill-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white uppercase italic leading-tight">{planLabel}</p>
              <Link
                href={dbUser.plan === 'free' ? '/#pricing' : '/dashboard#manage-plan'}
                className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1.5 mt-2 hover:gap-2.5 transition-all"
              >
                {dbUser.plan === 'free' ? 'Passer en PRO' : 'Gérer mon plan'}
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Plan management */}
        {dbUser.plan !== 'free' && (
          <div id="manage-plan" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-900 mb-4">Gérer mon plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Plan', value: dbUser.plan === 'monthly' ? 'Abonnement Pro' : 'Pack Starter' },
                { label: 'Statut', value: dbUser.subscriptionStatus || 'active' },
                { label: 'Fin de période', value: dbUser.subscriptionEndsAt ? new Date(dbUser.subscriptionEndsAt).toLocaleDateString('fr-FR') : 'N/A' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
            {dbUser.plan === 'monthly' && dbUser.subscriptionStatus !== 'canceled' && dbUser.stripeSubscriptionId && (
              <form action={handleCancelSubscription}>
                <button type="submit" className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">
                  Annuler l'abonnement
                </button>
              </form>
            )}
            {dbUser.plan === 'one_time' && (
              <p className="text-xs text-slate-400 font-medium">Pack Starter — aucun renouvellement automatique.</p>
            )}
            {dbUser.subscriptionStatus === 'canceled' && (
              <div className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-700">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                  {credits > 0 ? <AlertCircle className="text-amber-600" size={20} /> : <CheckCircle2 className="text-emerald-600" size={20} />}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-black uppercase tracking-tight ${credits > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                    {credits > 0 ? 'Abonnement résilié' : 'Plan clôturé'}
                  </h4>
                  {credits > 0 ? (
                    <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                      Votre demande a été prise en compte. Vous conservez votre accès <span className="font-black text-amber-900">PRO</span> et pouvez utiliser vos <span className="font-black text-amber-900">{credits} crédits</span> restants jusqu'au {dbUser.subscriptionEndsAt ? new Date(dbUser.subscriptionEndsAt).toLocaleDateString('fr-FR') : 'terme de votre période actuelle'}.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium leading-relaxed mt-1">
                      Votre abonnement a été annulé avec succès. Vous ne serez plus prélevé. Votre compte est désormais repassé en mode <span className="font-black">Gratuit</span>.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History and recent analyses have been moved to /dashboard/my-cvs */}
      </div>
    </div>
  );
}