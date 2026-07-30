// ── Department code extractor ────────────────────────────────
// France Travail API requires geographic filtering through separate
// parameters (departement=XX), NOT by appending the city to motsCles.
// This helper extracts a 2-digit department code from a location string.
// It first tries to find a postal code (first 2 digits = department),
// then falls back to a city→department lookup for the most common cities.

const CITY_TO_DEPT: Record<string, string> = {
    // Île-de-France
    "paris": "75", "boulogne-billancourt": "92", "saint-denis": "93",
    "versailles": "78", "nanterre": "92", "créteil": "94",
    "vincennes": "94", "montreuil": "93", "aubervilliers": "93",
    "asnières-sur-seine": "92", "courbevoie": "92", "vitry-sur-seine": "94",
    "colombes": "92", "saint-paul": "93", "champigny-sur-marne": "94",
    "meudon": "92", "issy-les-moulineaux": "92", "levallois-perret": "92",
    "noisy-le-grand": "93", "clichy": "92", "rueil-malmaison": "92",
    "épinay-sur-seine": "93", "ivry-sur-seine": "94", "choisy-le-roi": "94",
    "maisons-alfort": "94", "fontenay-sous-bois": "94",

    // Auvergne-Rhône-Alpes
    "lyon": "69", "grenoble": "38", "saint-étienne": "42",
    "clermont-ferrand": "63", "annecy": "74", "valence": "26",
    "chambéry": "73", "bourg-en-bresse": "01", "aurillac": "15",
    "le puy-en-velay": "43", "montluçon": "03", "vichy": "03",
    "moulins": "03", "privas": "07", "gap": "05", "villeurbanne": "69",

    // Normandie
    "rouen": "76", "caen": "14", "le havre": "76", "cherbourg-en-cotentin": "50",
    "évreux": "27", "alençon": "61",

    // Bretagne
    "rennes": "35", "brest": "29", "quimper": "29", "lorient": "56",
    "vannes": "56", "saint-brieuc": "22", "saint-malo": "35",

    // Pays de la Loire
    "nantes": "44", "le mans": "72", "angers": "49", "laval": "53",
    "la roche-sur-yon": "85", "saint-nazaire": "44",

    // Hauts-de-France
    "lille": "59", "amiens": "80", "roubaix": "59", "tourcoing": "59",
    "dunkerque": "59", "valenciennes": "59", "lens": "62",
    "boulogne-sur-mer": "62", "saint-quentin": "02", "laon": "02",

    // Grand Est
    "strasbourg": "67", "metz": "57", "reims": "51", "mulhouse": "68",
    "nancy": "54", "troyes": "10", "châlons-en-champagne": "51",
    "colmar": "68", "épinal": "88", "charleville-mézières": "08",
    "bar-le-duc": "55",

    // Nouvelle-Aquitaine
    "bordeaux": "33", "limoges": "87", "poitiers": "86",
    "la rochelle": "17", "pau": "64", "niort": "79",
    "angoulême": "16", "périgueux": "24", "agen": "47",
    "mont-de-marsan": "40", "bayonne": "64", "mérignac": "33",

    // Occitanie
    "toulouse": "31", "montpellier": "34", "nîmes": "30",
    "perpignan": "66", "carcassonne": "11", "rodez": "12",
    "albi": "81", "tarbes": "65", "foix": "09", "mende": "48",
    "cahors": "46", "auch": "32",

    // Centre-Val de Loire
    "tours": "37", "orléans": "45", "blois": "41", "bourges": "18",
    "chartres": "28", "châteauroux": "36", "joué-lès-tours": "37",
    "joué les tours": "37", "saint-cyr-sur-loire": "37",
    "amboise": "37", "chinon": "37",

    // Bourgogne-Franche-Comté
    "dijon": "21", "besançon": "25", "chalon-sur-saône": "71",
    "mâcon": "71", "nevers": "58", "auxerre": "89",
    "belfort": "90",

    // Provence-Alpes-Côte d'Azur
    "marseille": "13", "nice": "06", "toulon": "83",
    "aix-en-provence": "13", "avignon": "84", "antibes": "06",
    "cannes": "06", "fréjus": "83",

    // Corsica
    "ajaccio": "2a", "bastia": "2b",

    // Overseas
    "saint-denis de la réunion": "974", "fort-de-france": "972",
    "basse-terre": "971", "cayenne": "973", "mamoudzou": "976",
};

export function extractDepartmentCode(location: string): string | null {
    if (!location) return null;

    // 1. Try to find a postal code — first 2 digits = department
    //    Handle "2A" and "2B" for Corsica
    const postalMatch = location.match(/\b(2[AB]|0[1-9]|[1-9]\d)\d{3}\b/i);
    if (postalMatch) {
        return postalMatch[1].toUpperCase();
    }

    // 2. Normalise and check city lookup table
    const normalized = location
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents
        .replace(/[^a-z0-9\s-]/g, "")
        .trim();

    // Try full string, then each comma-split segment
    const segments = [normalized, ...normalized.split(/[,;]/).map((s) => s.trim())];
    for (const seg of segments) {
        // Direct lookup
        if (CITY_TO_DEPT[seg]) return CITY_TO_DEPT[seg];
        // Partial match: check if any known city name appears in segment
        for (const [city, code] of Object.entries(CITY_TO_DEPT)) {
            if (seg.includes(city) || city.includes(seg)) return code;
        }
    }

    return null;
}

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
        console.log("[France Travail] Token received.");
        return cachedToken.token;
    } catch {
        throw new Error(`France Travail auth returned non-JSON response: ${rawText.slice(0, 300)}`);
    }
}

// Core France Travail search — never puts location inside motsCles.
// Geographic scope is controlled via departement / region parameters.
async function searchFranceTravail(
    query: string,
    geoParams: Record<string, string> = {}
): Promise<any[]> {
    try {
        const token = await getFranceTravailToken();

        const params = new URLSearchParams({
            motsCles: query,
            range: "0-19",
            ...geoParams,
        });

        const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`;
        console.log("[France Travail] GET", url.replace(/motsCles=[^&]+/, `motsCles=${encodeURIComponent(query)}`));

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log("[France Travail] HTTP status:", res.status);
        const rawText = await res.text();

        if (!res.ok) {
            console.error(`[France Travail] Error ${res.status}: ${rawText.slice(0, 300)}`);
            return [];
        }
        if (!rawText.trim()) {
            console.log("[France Travail] 204 / empty body — no results for this scope.");
            return [];
        }

        let data: any;
        try {
            data = JSON.parse(rawText);
        } catch {
            console.error("[France Travail] Non-JSON response:", rawText.slice(0, 300));
            return [];
        }

        if (data.code) {
            console.error("[France Travail] API error:", data);
            return [];
        }

        const resultats: any[] = data.resultats || [];
        console.log(`[France Travail] Results: ${resultats.length} (geo: ${JSON.stringify(geoParams)})`);
        return resultats;
    } catch (e: any) {
        console.error("[France Travail] Fetch failed:", e.message || e);
        return [];
    }
}

function mapFranceTravailJob(job: any) {
    return {
        source: "france_travail" as const,
        title: job.intitule,
        company: job.entreprise?.nom || null,
        location: job.lieuTravail?.libelle || null,
        url:
            job.origineOffre?.urlOrigine ||
            `https://candidat.francetravail.fr/offres/recherche/detail/${job.id}`,
        description: (job.description || "").slice(0, 300),
        postedAt: job.dateCreation ? new Date(job.dateCreation) : null,
    };
}

/**
 * 3-tier France Travail search:
 *   Tier 1 — local department (if dept code available)
 *   Tier 2 — all France (no geo filter)
 *   Tier 3 — with distance=50 around the extracted department
 *
 * Returns up to 10 mapped job objects.
 */
export async function fetchFranceTravailJobs(
    query: string,
    location: string
): Promise<ReturnType<typeof mapFranceTravailJob>[]> {
    const deptCode = extractDepartmentCode(location);
    console.log(`[France Travail] Dept code from "${location}": ${deptCode ?? "not found → national search"}`);

    const existingIds = new Set<string>();
    const allResults: any[] = [];

    const collect = (raw: any[]) => {
        for (const job of raw) {
            if (!existingIds.has(job.id)) {
                existingIds.add(job.id);
                allResults.push(job);
            }
        }
    };

    // Tier 1: local department
    if (deptCode) {
        const tier1 = await searchFranceTravail(query, { departement: deptCode });
        collect(tier1);
        console.log(`[France Travail] Tier1 (dept=${deptCode}): ${tier1.length} results`);
    }

    // Tier 2: all of France — always try this to maximise results
    if (allResults.length < 10) {
        const tier2 = await searchFranceTravail(query, {});
        collect(tier2);
        console.log(`[France Travail] Tier2 (France-wide): cumulative ${allResults.length}`);
    }

    // Tier 3: distance-based search (50 km) if we still have very few
    if (allResults.length < 3 && deptCode) {
        const tier3 = await searchFranceTravail(query, {
            departement: deptCode,
            distance: "50",
        });
        collect(tier3);
        console.log(`[France Travail] Tier3 (dept+50km): cumulative ${allResults.length}`);
    }

    return allResults.slice(0, 10).map(mapFranceTravailJob);
}

// ── Adzuna ───────────────────────────────────────────────────

async function searchAdzuna(
    query: string,
    whereParam: string | null,
    country = "fr"
): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            app_id: process.env.ADZUNA_APP_ID || "",
            app_key: process.env.ADZUNA_APP_KEY || "",
            what: query,
            results_per_page: "10",
        });
        if (whereParam) params.set("where", whereParam);

        const res = await fetch(
            `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`
        );
        const rawText = await res.text();
        if (!res.ok) {
            console.error(`[Adzuna][${country}] ${res.status}: ${rawText.slice(0, 200)}`);
            return [];
        }
        let data: any;
        try {
            data = JSON.parse(rawText);
        } catch {
            console.error(`[Adzuna][${country}] Non-JSON response`);
            return [];
        }
        const results: any[] = data.results || [];
        console.log(`[Adzuna][${country}] Results: ${results.length} (where=${whereParam ?? "none"})`);
        return results;
    } catch (e: any) {
        console.error(`[Adzuna][${country}] Fetch failed:`, e.message || e);
        return [];
    }
}

function mapAdzunaJob(job: any, country = "fr") {
    return {
        source: "adzuna" as const,
        title: job.title,
        company: job.company?.display_name || null,
        location: job.location?.display_name || null,
        url: job.redirect_url,
        description: (job.description || "").slice(0, 300),
        postedAt: job.created ? new Date(job.created) : null,
        country,
    };
}

/**
 * 2-tier Adzuna search:
 *   Tier 1 — with city location (France)
 *   Tier 2 — France-wide (no location filter)
 */
export async function fetchAdzunaJobs(
    query: string,
    location: string
): Promise<ReturnType<typeof mapAdzunaJob>[]> {
    const existingUrls = new Set<string>();
    const allResults: any[] = [];

    const collect = (raw: any[], country = "fr") => {
        for (const job of raw) {
            if (!existingUrls.has(job.redirect_url)) {
                existingUrls.add(job.redirect_url);
                allResults.push({ ...job, _country: country });
            }
        }
    };

    // Tier 1: with city
    if (location) {
        const tier1 = await searchAdzuna(query, location);
        collect(tier1);
    }

    // Tier 2: France-wide (no where param)
    if (allResults.length < 5) {
        const tier2 = await searchAdzuna(query, null, "fr");
        collect(tier2);
    }

    return allResults.slice(0, 10).map((job) => mapAdzunaJob(job, job._country || "fr"));
}

/**
 * Fetch EU jobs via Adzuna for the given query.
 * Countries: Belgium, Switzerland, Germany, Netherlands, Spain.
 * Returns up to 5 results total.
 */
export async function fetchAdzunaEUJobs(
    query: string
): Promise<ReturnType<typeof mapAdzunaJob>[]> {
    const EU_COUNTRIES = ["be", "ch", "de", "nl", "es"];
    const results: any[] = [];

    for (const country of EU_COUNTRIES) {
        if (results.length >= 5) break;
        const raw = await searchAdzuna(query, null, country);
        for (const job of raw.slice(0, 2)) {
            results.push({ ...job, _country: country });
        }
    }

    return results.map((job) => mapAdzunaJob(job, job._country));
}

/**
 * Combined entry point — both providers in parallel.
 */
export async function fetchJobRecommendations(
    query: string,
    location: string
): Promise<(ReturnType<typeof mapFranceTravailJob> | ReturnType<typeof mapAdzunaJob>)[]> {
    const [franceTravail, adzuna] = await Promise.all([
        fetchFranceTravailJobs(query, location),
        fetchAdzunaJobs(query, location),
    ]);
    return [...franceTravail, ...adzuna];
}