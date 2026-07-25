// ── France Travail ──────────────────────────────────────────
async function getFranceTravailToken(): Promise<string> {
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
    if (!res.ok) throw new Error(`France Travail auth failed: ${res.status}`);
    const data = await res.json();
    return data.access_token;
}

export async function fetchFranceTravailJobs(query: string, location: string) {
    try {
        const token = await getFranceTravailToken();
        // France Travail's `commune` param requires a 5-digit INSEE code, not a
        // city name — so instead of passing a raw location string (which would
        // cause a 400 error), fold the location into the free-text keyword search.
        const searchKeywords = location ? `${query} ${location}` : query;
        const params = new URLSearchParams({ motsCles: searchKeywords });
        const res = await fetch(
            `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.resultats || []).slice(0, 10).map((job: any) => ({
            source: "france_travail" as const,
            title: job.intitule,
            company: job.entreprise?.nom || null,
            location: job.lieuTravail?.libelle || null,
            // Some listings don't provide an external origin URL — fall back to
            // France Travail's own hosted listing page rather than a broken link.
            url: job.origineOffre?.urlOrigine ||
                `https://candidat.francetravail.fr/offres/recherche/detail/${job.id}`,
            description: (job.description || "").slice(0, 300),
            postedAt: job.dateCreation ? new Date(job.dateCreation) : null,
        }));
    } catch (e) {
        console.error("[job-providers] France Travail fetch failed:", e);
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
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map((job: any) => ({
            source: "adzuna" as const,
            title: job.title,
            company: job.company?.display_name || null,
            location: job.location?.display_name || null,
            url: job.redirect_url,
            description: (job.description || "").slice(0, 300),
            postedAt: job.created ? new Date(job.created) : null,
        }));
    } catch (e) {
        console.error("[job-providers] Adzuna fetch failed:", e);
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