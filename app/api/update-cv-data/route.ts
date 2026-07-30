import { db } from "@/lib/db";
import { cvAnalyses, users, cvTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncUserWithClerk } from "@/lib/auth/sync";
import { recalculateScoreForStructuredCV } from "@/lib/ai/ats-analyzer";
import { getHashedTrackingToken } from "@/lib/anonymous-tracking";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysisId, templateId, optimizedData } = await req.json();

    let dbUser: any = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId)
    });

    if (!dbUser) {
      const syncedUser = await syncUserWithClerk();
      dbUser = syncedUser ?? null;
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User profile initializing, please wait." }, { status: 404 });
    }

    // 2. Fetch the analysis to check ownership
    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId),
    });

    if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

    // 3. Security Check: Block if already owned by someone else.
    if (analysis.userId && analysis.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Guard the claim path: an ownerless analysis may only be adopted by the
    // browser session that actually created it — never by whichever logged-in
    // user's request happens to reach this analysisId next.
    if (!analysis.userId && analysis.guestSessionId) {
      const currentTrackingToken = await getHashedTrackingToken();
      if (analysis.guestSessionId !== currentTrackingToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    let masterOptimizedData = optimizedData;
    if (templateId && optimizedData?.photoUrl === "") {
      const currentOptimizedData = (analysis?.optimizedData as any) || {};
      masterOptimizedData = {
        ...optimizedData,
        photoUrl: currentOptimizedData.photoUrl,
      };
    }

    const scoreUpdate = recalculateScoreForStructuredCV(masterOptimizedData, {
      atsScore: analysis.atsScore,
      scoreBreakdown: analysis.scoreBreakdown,
      keywordsFound: Array.isArray(analysis.keywordsFound)
        ? (analysis.keywordsFound as string[])
        : [],
      keywordsMissing: Array.isArray(analysis.keywordsMissing)
        ? (analysis.keywordsMissing as string[])
        : [],
    });

    const finalMasterData = {
      ...masterOptimizedData,
      _originalCvText: (analysis.optimizedData as any)?._originalCvText || "",
      _optimizedCvText: scoreUpdate.optimizedCvText,
    };

    console.log("[update-cv-data] Recalculated ATS score for edits:", scoreUpdate.atsScore);

    // 4. Update master analysis JSON and associate user if missing
    await db.update(cvAnalyses)
      .set({
        optimizedData: finalMasterData,
        atsScore: scoreUpdate.atsScore,
        scoreBreakdown: scoreUpdate.scoreBreakdown,
        keywordsFound: scoreUpdate.keywordsFound,
        keywordsMissing: scoreUpdate.keywordsMissing,
        userId: analysis.userId ? undefined : dbUser.id,
      })
      .where(eq(cvAnalyses.id, analysisId));

    // 5. Update the specific template JSON (if provided)
    if (templateId) {
      await db.update(cvTemplates)
        .set({ templateData: finalMasterData })
        .where(eq(cvTemplates.id, templateId));
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("SAVE_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}