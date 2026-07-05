import { db } from "@/lib/db";
import { cvAnalyses, users, cvTemplates } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import {
  FileText, ArrowRight, Clock, Zap, Plus, History
} from "lucide-react";

export default async function MyCVsPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) redirect("/sign-in");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    redirect("/dashboard");
  }

  const analyses = await db.query.cvAnalyses.findMany({
    where: eq(cvAnalyses.userId, dbUser.id),
    orderBy: [desc(cvAnalyses.createdAt)],
    limit: 20,
  });

  let generatedCvs: any[] = [];
  if (analyses.length > 0) {
    const analysisIds = analyses.map(a => a.id);
    generatedCvs = await db.query.cvTemplates.findMany({
      where: inArray(cvTemplates.analysisId, analysisIds),
      orderBy: [desc(cvTemplates.createdAt)],
      limit: 50,
    });
  }

  const uniqueCvsByAnalysis = Array.from(
    new Map(generatedCvs.map(cv => [cv.analysisId, cv])).values()
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 mb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Mon Historique</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              Mes CVs Optimisés
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">Retrouvez vos analyses et modèles de CV générés.</p>
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-12">
        {/* Generated CVs history */}
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
            <History size={18} className="text-primary" />
            Historique de vos CVs générés
          </h2>

          {uniqueCvsByAnalysis.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText size={22} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold text-sm">{"Vous n'avez pas encore généré de CV."}</p>
              <Link href="/" className="inline-flex items-center gap-2 mt-4 text-primary text-xs font-black uppercase tracking-widest hover:gap-3 transition-all">
                Lancer une analyse <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueCvsByAnalysis.map((cv) => {
                const parentAnalysis = analyses.find(a => a.id === cv.analysisId);
                return (
                  <div key={cv.analysisId} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                        <FileText size={18} className="text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm line-clamp-1">
                          {parentAnalysis?.jobTitle || "Analyse CV"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                          {new Date(cv.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/templates/${cv.analysisId}`}
                      className="w-full block bg-slate-900 hover:bg-primary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center transition-all"
                    >
                      Voir mes CVs
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent analyses */}
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary" />
            Analyses Récentes
          </h2>

          {analyses.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{"Pas encore d'analyses"}</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                Analysez votre premier CV pour voir vos scores et générer des modèles optimisés.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Lancer ma première analyse
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis) => {
                const score = analysis.atsScore || 0;
                const scoreColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div
                    key={analysis.id}
                    className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${scoreColor} rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0`}>
                        {score}%
                      </div>
                      <div>
                        <p className="font-black text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                          {analysis.jobTitle || analysis.jobUrl || "Analyse CV"}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {new Date(analysis.createdAt!).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/results/${analysis.id}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Résultats
                      </Link>
                      <Link
                        href={`/templates/${analysis.id}`}
                        className="bg-primary text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-105 transition-all"
                      >
                        CVs
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
