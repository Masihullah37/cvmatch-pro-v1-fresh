"use client";
import { useEffect, useState, createElement as h } from "react";
import { Briefcase, MapPin, ExternalLink } from "lucide-react";

interface Job {
    title: string;
    company: string | null;
    location: string | null;
    url: string;
    source: string;
}

export default function JobRecommendations({ analysisId }: { analysisId: string }) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/job-recommendations?analysisId=${analysisId}`)
            .then((res) => res.json())
            .then((data) => setJobs(data.jobs || []))
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, [analysisId]);

    if (loading) {
        return h("p", { className: "text-sm text-slate-400" }, "Recherche d'offres en cours...");
    }
    if (jobs.length === 0) {
        return null;
    }

    return h(
        "div",
        { className: "space-y-4" },
        h(
            "h3",
            { className: "text-base font-black text-slate-900 flex items-center gap-2" },
            h(Briefcase, { size: 18, className: "text-primary" }),
            "Offres recommandees pour vous"
        ),
        h(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
            jobs.map((job, i) =>
                h(
                    "a",
                    {
                        key: i,
                        href: job.url,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "block bg-white rounded-2xl border border-slate-100 p-4 hover:border-primary hover:shadow-md transition-all",
                    },
                    h("p", { className: "font-bold text-slate-900 text-sm mb-1" }, job.title),
                    job.company && h("p", { className: "text-xs text-slate-500 mb-1" }, job.company),
                    job.location &&
                    h(
                        "p",
                        { className: "text-xs text-slate-400 flex items-center gap-1" },
                        h(MapPin, { size: 12 }),
                        " ",
                        job.location
                    ),
                    h(
                        "p",
                        { className: "text-xs font-bold text-primary mt-2 flex items-center gap-1" },
                        "Voir l'offre ",
                        h(ExternalLink, { size: 12 })
                    )
                )
            )
        )
    );
}