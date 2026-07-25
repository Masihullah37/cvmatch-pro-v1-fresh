import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cvAnalyses, jobRecommendations } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { fetchJobRecommendations } from "@/lib/jobs/job-providers";

const CACHE_HOURS = 6;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get("analysisId");
    if (!analysisId) {
        return NextResponse.json({ error: "analysisId requis" }, { status: 400 });
    }

    const analysis = await db.query.cvAnalyses.findFirst({
        where: eq(cvAnalyses.id, analysisId),
    });
    if (!analysis) {
        return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
    }

    const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000);
    const cached = await db.query.jobRecommendations.findMany({
        where: and(
            eq(jobRecommendations.analysisId, analysisId),
            gt(jobRecommendations.fetchedAt, cutoff)
        ),
    });
    if (cached.length > 0) {
        return NextResponse.json({ jobs: cached, cached: true });
    }

    const optimizedData = analysis.optimizedData as any;
    const jobTitle = optimizedData?.jobTitle || analysis.jobTitle || "";
    const rawLocation = optimizedData?.contact?.location || "";
    // French addresses typically come as "Street, City, PostalCode, Country" —
    // extract just the city segment rather than passing the full address to
    // job search APIs, which expect a place name, not a street address.
    const location = rawLocation.includes(",")
        ? rawLocation.split(",")[1]?.trim() || rawLocation
        : rawLocation;

    if (!jobTitle) {
        return NextResponse.json({ jobs: [], cached: false });
    }

    const jobs = await fetchJobRecommendations(jobTitle, location);

    if (jobs.length > 0) {
        await db.insert(jobRecommendations).values(
            jobs.map((j) => ({ ...j, analysisId }))
        );
    }

    return NextResponse.json({ jobs, cached: false });
}