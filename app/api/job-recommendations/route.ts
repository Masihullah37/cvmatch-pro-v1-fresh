import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cvAnalyses, jobRecommendations } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
    fetchFranceTravailJobs,
    fetchAdzunaJobs,
    fetchAdzunaEUJobs,
    extractDepartmentCode,
} from "@/lib/jobs/job-providers";
import { detectDomain } from "@/lib/ai/ats-analyzer";

const CACHE_HOURS = 6;

// ─────────────────────────────────────────────────────────────
// Domain-aware related job queries
// Each domain lists sibling query groups in priority order.
// The orchestrator iterates tier-by-tier until enough jobs are found.
// This lets a doctor see nurse/pharmacist roles, a full-stack dev
// see DevOps/networking/data roles, etc.
// ─────────────────────────────────────────────────────────────
const DOMAIN_NEIGHBORS: Record<string, string[][]> = {
    it_dev: [
        ["développeur", "software engineer", "ingénieur logiciel"],
        ["devops", "cloud engineer", "infrastructure"],
        ["administrateur système", "réseau", "sécurité informatique"],
        ["data engineer", "analyste données", "machine learning"],
        ["chef de projet IT", "scrum master", "product owner"],
    ],
    healthcare: [
        ["infirmier", "aide-soignant", "soins infirmiers"],
        ["médecin", "praticien", "médecin généraliste"],
        ["pharmacien", "préparateur en pharmacie"],
        ["kinésithérapeute", "ergothérapeute", "orthophoniste"],
        ["sage-femme", "puéricultrice", "pédiatrie"],
        ["radiologie", "laboratoire médical", "imagerie"],
    ],
    engineering: [
        ["ingénieur", "technicien industriel"],
        ["bureau d'études", "conception CAO", "dessinateur"],
        ["maintenance industrielle", "automatisme", "robotique"],
        ["qualité", "méthodes industrielles", "lean"],
        ["génie civil", "conducteur de travaux"],
    ],
    finance: [
        ["comptable", "gestionnaire de paie"],
        ["contrôleur de gestion", "audit interne"],
        ["analyste financier", "trésorier"],
        ["consultant finance", "conseiller bancaire"],
        ["risk manager", "actuariat", "assurance"],
    ],
    legal: [
        ["juriste", "assistant juridique"],
        ["compliance", "conformité réglementaire"],
        ["paralegal", "clerc de notaire"],
        ["droit des affaires", "contentieux"],
        ["ressources humaines", "droit du travail"],
    ],
    administrative: [
        ["assistant administratif", "secrétaire"],
        ["gestionnaire RH", "ressources humaines"],
        ["office manager", "coordinateur administratif"],
        ["chargé de mission", "assistant de direction"],
        ["gestionnaire de paie", "comptabilité"],
    ],
    education: [
        ["enseignant", "professeur", "formateur"],
        ["conseiller pédagogique", "éducateur spécialisé"],
        ["animateur", "moniteur", "instructeur"],
        ["directeur d'école", "responsable formation"],
        ["coach", "consultant formation"],
    ],
    business: [
        ["commercial", "business developer", "chargé de clientèle"],
        ["account manager", "responsable grands comptes"],
        ["marketing", "chef de produit", "chargé de communication"],
        ["consultant", "chef de projet", "PMO"],
        ["directeur commercial", "responsable ventes"],
    ],
    services: [
        ["service client", "relation client", "conseiller clientèle"],
        ["hôtellerie", "restauration", "réceptionniste"],
        ["logistique", "transport", "supply chain"],
        ["accueil", "hôte d'accueil"],
        ["tourisme", "guide touristique", "agent de voyage"],
    ],
    trades: [
        ["électricien", "technicien électrique"],
        ["plombier", "chauffagiste", "CVC"],
        ["menuisier", "charpentier", "ébéniste"],
        ["maçon", "conducteur de travaux", "BTP"],
        ["peintre en bâtiment", "carreleur", "second œuvre"],
    ],
    general: [
        ["emploi", "poste disponible"],
        ["assistant", "opérateur"],
        ["polyvalent", "agent"],
    ],
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type JobResult = {
    source: string;
    title: string | null;
    company: string | null;
    location: string | null;
    url: string;
    description: string;
    postedAt: Date | null;
    matchType?: "direct" | "related" | "domain_neighbor" | "eu";
    [key: string]: any;
};

function dedup(existing: Set<string>, jobs: JobResult[]): JobResult[] {
    const fresh: JobResult[] = [];
    for (const job of jobs) {
        if (!existing.has(job.url)) {
            existing.add(job.url);
            fresh.push(job);
        }
    }
    return fresh;
}

async function searchBothProviders(
    query: string,
    location: string,
    matchType: JobResult["matchType"]
): Promise<JobResult[]> {
    const [ft, az] = await Promise.all([
        fetchFranceTravailJobs(query, location),
        fetchAdzunaJobs(query, location),
    ]);
    return [...ft, ...az].map((j) => ({ ...j, matchType }));
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

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

    // ── Cache check ──────────────────────────────────────────
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

    // ── Extract CV data ──────────────────────────────────────
    const optimizedData = analysis.optimizedData as any;
    const rawJobTitle = optimizedData?.jobTitle || analysis.jobTitle || "";
    const jobTitle = rawJobTitle === "Poste Visé" ? "" : rawJobTitle;
    if (!jobTitle) {
        return NextResponse.json({ jobs: [], cached: false });
    }

    // Location: prefer structured contact location, fallback to raw
    const rawLocation: string = optimizedData?.contact?.location || "";

    // Extract the city segment from a full address string like
    // "12 Rue de la Paix, Tours, 37000, France"
    // We prefer the segment that contains a postal code or stands alone as a city.
    let location = rawLocation;
    if (rawLocation.includes(",")) {
        const segments = rawLocation.split(",").map((s) => s.trim());
        // Find the segment that is most city-like:
        // prefer the segment that has a dept code extractable from it
        const withCode = segments.find((s) => extractDepartmentCode(s) !== null);
        location = withCode ?? segments[1] ?? segments[0];
    }
    console.log("[Jobs] Extracted location:", location);
    console.log("[Jobs] Job title:", jobTitle);

    const skills: string[] = Array.isArray(optimizedData?.skills) ? optimizedData.skills : [];
    const domain = detectDomain(optimizedData, optimizedData?._originalCvText || "");
    console.log("[Jobs] Detected domain:", domain);

    const seen = new Set<string>();
    let jobs: JobResult[] = [];

    // ── Step 1: Direct search — job title, local area ────────
    console.log("[Jobs] Step 1: direct search, local");
    const step1 = await searchBothProviders(jobTitle, location, "direct");
    jobs.push(...dedup(seen, step1));
    console.log(`[Jobs] After Step 1: ${jobs.length} jobs`);

    // ── Step 2: Direct search — France-wide (empty location) ─
    if (jobs.length < 5) {
        console.log("[Jobs] Step 2: direct search, France-wide");
        const step2 = await searchBothProviders(jobTitle, "", "direct");
        jobs.push(...dedup(seen, step2));
        console.log(`[Jobs] After Step 2: ${jobs.length} jobs`);
    }

    // ── Step 3: Domain neighbor queries ──────────────────────
    if (jobs.length < 10) {
        const neighborTiers = DOMAIN_NEIGHBORS[domain] ?? DOMAIN_NEIGHBORS.general;
        console.log(`[Jobs] Step 3: domain neighbors for "${domain}" (${neighborTiers.length} tiers)`);

        for (const tierQueries of neighborTiers) {
            if (jobs.length >= 15) break;

            for (const neighborQuery of tierQueries) {
                if (jobs.length >= 15) break;

                // Skip if this query is essentially the job title itself
                if (neighborQuery.toLowerCase() === jobTitle.toLowerCase()) continue;

                console.log(`[Jobs] Step 3: trying neighbor query "${neighborQuery}"`);
                const neighborJobs = await searchBothProviders(
                    neighborQuery,
                    location,
                    "domain_neighbor"
                );
                jobs.push(...dedup(seen, neighborJobs));

                // If still thin, also try France-wide for this neighbor
                if (jobs.length < 10) {
                    const neighborFranceWide = await searchBothProviders(
                        neighborQuery,
                        "",
                        "domain_neighbor"
                    );
                    jobs.push(...dedup(seen, neighborFranceWide));
                }

                console.log(`[Jobs] After neighbor "${neighborQuery}": ${jobs.length} jobs`);
            }
        }
    }

    // ── Step 4: EU fallback via Adzuna ───────────────────────
    if (jobs.length < 5) {
        console.log("[Jobs] Step 4: EU fallback");
        const euJobs = (await fetchAdzunaEUJobs(jobTitle)).map((j) => ({
            ...j,
            matchType: "eu" as const,
        }));
        jobs.push(...dedup(seen, euJobs));

        // Also try the first domain neighbor query EU-wide
        if (jobs.length < 5) {
            const firstNeighborQuery =
                DOMAIN_NEIGHBORS[domain]?.[0]?.[0] ?? jobTitle;
            const euNeighborJobs = (await fetchAdzunaEUJobs(firstNeighborQuery)).map(
                (j) => ({ ...j, matchType: "eu" as const })
            );
            jobs.push(...dedup(seen, euNeighborJobs));
        }

        console.log(`[Jobs] After Step 4 (EU): ${jobs.length} jobs`);
    }

    // ── Trim and persist ─────────────────────────────────────
    jobs = jobs.slice(0, 20);
    console.log(`[Jobs] Final count: ${jobs.length}`);

    if (jobs.length > 0) {
        await db.insert(jobRecommendations).values(
            jobs.map((j) => ({
                analysisId,
                source: j.source,
                title: j.title ?? "",
                company: j.company ?? null,
                location: j.location ?? null,
                url: j.url,
                description: j.description ?? null,
                postedAt: j.postedAt ?? null,
                matchType: j.matchType ?? "direct",
            }))
        );
    }

    return NextResponse.json({ jobs, cached: false });
}