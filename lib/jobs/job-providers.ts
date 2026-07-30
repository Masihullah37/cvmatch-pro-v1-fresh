// ── France Travail ──────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFranceTravailToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }
    const res = await fetch(
        "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID || "",
                client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET || "",
                scope: "api_offresdemploiv2 o2dsoffre",
            }),
        }
    );
    const rawText = await res.text();
    if (!res.ok) {
        throw new Error(`France Travail auth failed: ${res.status} — ${rawText.slice(0, 300)}`);
    }
    try {
        const data = JSON.parse(rawText);
        cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
        return cachedToken.token;
    } catch {
        throw new Error(`France Travail auth returned non-JSON response: ${rawText.slice(0, 300)}`);
    }
}

export async function fetchFranceTravailJobs(query: string, location: string) {
    try {
        const token = await getFranceTravailToken();
        const searchKeywords = location ? `${query} ${location}` : query;
        const params = new URLSearchParams({ motsCles: searchKeywords });
        const res = await fetch(
            `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        // const rawText = await res.text();
        // if (!res.ok) {
        //     console.error(`[job-providers] France Travail search returned ${res.status}: ${rawText.slice(0, 300)}`);
        //     return [];
        // }
        // let data;
        // try {
        //     data = JSON.parse(rawText);
        // } catch {
        //     console.error(`[job-providers] France Travail search returned non-JSON: ${rawText.slice(0, 300)}`);
        //     return [];
        // }

        const rawText = await res.text();
        if (!res.ok) {
            console.error(`[job-providers] France Travail search returned ${res.status}: ${rawText.slice(0, 300)}`);
            return [];
        }
        // An empty body (often a 204 No Content) means the search legitimately
        // found zero matching jobs — this is a normal, valid outcome, not an
        // error, so we return an empty array quietly instead of trying (and
        // failing) to JSON.parse an empty string.
        if (!rawText.trim()) {
            return [];
        }
        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            console.error(`[job-providers] France Travail search returned non-JSON: ${rawText.slice(0, 300)}`);
            return [];
        }
        console.log(`[job-providers] France Travail returned ${(data.resultats || []).length} raw results.`);
        return (data.resultats || []).slice(0, 10).map((job: any) => ({
            source: "france_travail" as const,
            title: job.intitule,
            company: job.entreprise?.nom || null,
            location: job.lieuTravail?.libelle || null,
            url: job.origineOffre?.urlOrigine ||
                `https://candidat.francetravail.fr/offres/recherche/detail/${job.id}`,
            description: (job.description || "").slice(0, 300),
            postedAt: job.dateCreation ? new Date(job.dateCreation) : null,
        }));
    } catch (e: any) {
        console.error("[job-providers] France Travail fetch failed:", e.message || e);
        return [];
    }
}

// ── Adzuna ───────────────────────────────────────────────────
export async function fetchAdzunaJobs(query: string, location: string) {
    try {
        const params = new URLSearchParams({
            app_id: process.env.ADZUNA_APP_ID || "",
            app_key: process.env.ADZUNA_APP_KEY || "",
            what: query,
            where: location || "",
            results_per_page: "10",
        });
        const res = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`);
        const rawText = await res.text();
        if (!res.ok) {
            console.error(`[job-providers] Adzuna returned ${res.status}: ${rawText.slice(0, 300)}`);
            return [];
        }
        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            console.error(`[job-providers] Adzuna returned non-JSON: ${rawText.slice(0, 300)}`);
            return [];
        }
        console.log(`[job-providers] Adzuna returned ${(data.results || []).length} raw results.`);
        return (data.results || []).map((job: any) => ({
            source: "adzuna" as const,
            title: job.title,
            company: job.company?.display_name || null,
            location: job.location?.display_name || null,
            url: job.redirect_url,
            description: (job.description || "").slice(0, 300),
            postedAt: job.created ? new Date(job.created) : null,
        }));
    } catch (e: any) {
        console.error("[job-providers] Adzuna fetch failed:", e.message || e);
        return [];
    }
}

export async function fetchJobRecommendations(query: string, location: string) {
    const [franceTravail, adzuna] = await Promise.all([
        fetchFranceTravailJobs(query, location),
        fetchAdzunaJobs(query, location),
    ]);
    return [...franceTravail, ...adzuna];
}