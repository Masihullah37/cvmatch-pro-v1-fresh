import React from "react";

// Pure presentational layout for server-side HTML rendering
export function CVPrintRenderer({ data }: { data: any }) {
    const contact = data?.contact || {};
    const experience = Array.isArray(data?.experience) ? data.experience : [];
    const education = Array.isArray(data?.education) ? data.education : [];
    const skills = Array.isArray(data?.skills) ? data.skills : [];

    return (
        <div className="cv-printable p-10 bg-white min-h-screen text-slate-800">
            <header className="border-b border-slate-200 pb-4 mb-6">
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                    {data.userName || data.name || ""}
                </h1>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                    {data.jobTitle || data.title || ""}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.location && <span>{contact.location}</span>}
                </div>
            </header>

            {data.summary && (
                <section className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Profil
                    </h2>
                    <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {data.summary}
                    </p>
                </section>
            )}

            {experience.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                        Expérience Professionnelle
                    </h2>
                    <div className="space-y-4">
                        {experience.map((exp: any, index: number) => (
                            <div key={index}>
                                <div className="flex justify-between items-baseline">
                                    <h3 className="text-xs font-bold text-slate-900">
                                        {exp.company} — {exp.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                        {exp.period || ""}
                                    </span>
                                </div>
                                {exp.description && (
                                    <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap leading-normal">
                                        {exp.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {education.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                        Formation
                    </h2>
                    <div className="space-y-3">
                        {education.map((edu: any, index: number) => (
                            <div key={index} className="flex justify-between items-baseline">
                                <h3 className="text-xs font-bold text-slate-900">
                                    {edu.school} — {edu.degree}
                                </h3>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {edu.year || ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {skills.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Compétences
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill: string, index: number) => (
                            <span
                                key={index}
                                className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}