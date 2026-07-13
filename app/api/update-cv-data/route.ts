// import { db } from "@/lib/db";
// import { cvAnalyses, users, cvTemplates } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   try {
//     const { userId: clerkId } = await auth();
//     if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const { analysisId, templateId, optimizedData } = await req.json();

//     // 1. Get the internal DB user ID from the Clerk ID
//     const dbUser = await db.query.users.findFirst({
//       where: eq(users.clerkId, clerkId)
//     });

//     if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

//     // 2. Fetch the analysis to check ownership
//     const analysis = await db.query.cvAnalyses.findFirst({
//       where: eq(cvAnalyses.id, analysisId),
//     });

//     if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

//     // 3. Security Check: Block if already owned by someone else. 
//     // If userId is null, we "claim" it for the current user.
//     if (analysis.userId && analysis.userId !== dbUser.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//     }

//     let masterOptimizedData = optimizedData;
//     if (templateId && optimizedData?.photoUrl === "") {
//       const currentOptimizedData = (analysis?.optimizedData as any) || {};
//       masterOptimizedData = {
//         ...optimizedData,
//         photoUrl: currentOptimizedData.photoUrl,
//       };
//     }

//     // 4. Update master analysis JSON and associate user if missing
//     await db.update(cvAnalyses)
//       .set({
//         optimizedData: masterOptimizedData,
//         // Claim the analysis if it was ownerless (guest session)
//         userId: analysis.userId ? undefined : dbUser.id
//       })
//       .where(eq(cvAnalyses.id, analysisId));

//     // 5. Update the specific template JSON (if provided)
//     if (templateId) {
//       await db.update(cvTemplates)
//         .set({ templateData: optimizedData })
//         .where(eq(cvTemplates.id, templateId));
//     }

//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     console.error("SAVE_ERROR:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


import { db } from "@/lib/db";
import { cvAnalyses, users, cvTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncUserWithClerk } from "@/lib/auth/sync"; // Ensure this import points to your sync utility
import { recalculateScoreForStructuredCV } from "@/lib/ai/ats-analyzer";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysisId, templateId, optimizedData } = await req.json();

    // 1. Get the internal DB user ID (With on-the-fly syncing to prevent race condition crashes)
    // let dbUser = await db.query.users.findFirst({
    //   where: eq(users.clerkId, clerkId)
    // });

    // // 🚀 If Clerk says authenticated but webhook hasn't finished writing the DB row yet, sync it now!
    // if (!dbUser) {
    //   dbUser = await syncUserWithClerk();
    // }

    // if (!dbUser) {
    //   return NextResponse.json({ error: "User profile initializing, please wait." }, { status: 404 });
    // }

    // 1. Get the internal DB user ID (Allowing both null or undefined for flexible sync assignment)
    let dbUser: any = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId)
    });

    // 🚀 If Clerk says authenticated but webhook hasn't finished writing the DB row yet, sync it now!
    if (!dbUser) {
      const syncedUser = await syncUserWithClerk();
      dbUser = syncedUser ?? null; // Normalizes undefined to null if needed
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
    // If userId is null, we "claim" it for the current user.
    if (analysis.userId && analysis.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
      atsScore: analysis.atsScore || 0,
      scoreBreakdown: analysis.scoreBreakdown,
      // keywordsFound: analysis.keywordsFound,
      // keywordsMissing: analysis.keywordsMissing,

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
        // Claim the analysis if it was ownerless (guest session)
        userId: analysis.userId ? undefined : dbUser.id
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