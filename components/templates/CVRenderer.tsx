import React from 'react';
import Watermark from "@/components/templates/Watermark";
import { asRecordArray, asStringArray } from "@/components/templates/normalizeCvArrays";

// Inline SVG icons to avoid lucide-react client-only restriction
const MapPin = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const Phone = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const Mail = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);


const InlineEdit = (props: any) => {
  if (!props.isInteractive) {
    return <span className={props.className}>{props.value || (props.multiline ? "\u00A0\n\u00A0" : "\u00A0")}</span>;
  }
  const Interactive = require('./InlineEditInteractive').default;
  return <Interactive {...props} />;
};

const DraggableSection = ({ id, isInteractive, onDelete, children, style: extraStyle = {}, className = '' }: any) => {
  if (!isInteractive) return <div style={extraStyle} className={className}>{children}</div>;
  const Interactive = require('./DraggableSectionInteractive').default;
  return (
    <Interactive id={id} onDelete={onDelete} style={extraStyle} className={className}>
      {children}
    </Interactive>
  );
};


export const CVRenderer = ({
  template,
  isPaid = true,
  analysisData = null,
  isInteractive = false,
  onUpdate,
  onDeleteSection,
}: any) => {
  const data = (template.templateData as any) || {};
  const style = template.templateStyle;

  const name = data.userName || analysisData?.userName || "Candidat";
  const hasTemplatePhotoOverride = Object.prototype.hasOwnProperty.call(data, "photoUrl");
  const resolvedPhotoUrl = hasTemplatePhotoOverride
    ? typeof data.photoUrl === "string"
      ? data.photoUrl.trim()
      : ""
    : typeof data.profileDescription?.photoUrl === "string" && data.profileDescription.photoUrl.trim()
      ? data.profileDescription.photoUrl
      : typeof template.optimizedData?.photoUrl === "string" && template.optimizedData.photoUrl.trim()
        ? template.optimizedData.photoUrl
        : typeof analysisData?.optimizedData?.photoUrl === "string" && analysisData.optimizedData.photoUrl.trim()
          ? analysisData.optimizedData.photoUrl
          : typeof analysisData?.profileDescription?.photoUrl === "string" && analysisData.profileDescription.photoUrl.trim()
            ? analysisData.profileDescription.photoUrl
            : "";
  const photoUrl = resolvedPhotoUrl;
  const hasPhotoSlot = Boolean(photoUrl);
  const title = data.jobTitle || analysisData?.jobTitle || "Optimisé par IA";
  const summaryText =
    data.summary ||
    "Professionnel expérimenté avec une solide expertise dans son domaine.";
  const experiences = asRecordArray(data.experience);
  const skills = asStringArray(data.skills);
  const education = asRecordArray(data.education);
  const contact = data.contact || {};
  const projects = asRecordArray(data.projects);
  const languages = asRecordArray(data.languages);

  const headers = data.headers || {
    summary: "Profil",
    experience: "Expérience",
    education: "Formation",
    projects: "Projets",
    skills: "Compétences",
    languages: "Langues",
    contact: "Contact",
  };

  // --- STABLE REUSABLE SUB-COMPONENTS (Defined outside to prevent infinite unmount/remount loops) ---

  const SectionTitle = ({ sectionKey, className, headers: sectionHeaders = headers, isInteractive: interactive = isInteractive, onUpdate: updateHandler = onUpdate }: any) => (
    <h3 className={className}>
      <InlineEdit
        value={sectionHeaders?.[sectionKey] || sectionKey}
        path={`headers.${sectionKey}`}
        isInteractive={interactive}
        onUpdate={updateHandler}
      />
    </h3>
  );

  const ExperienceTitle = ({ className, headers: sectionHeaders = headers, isInteractive: interactive = isInteractive, onUpdate: updateHandler = onUpdate }: any) => (
    <h2 className={className}>
      <InlineEdit value={sectionHeaders?.experience} path="headers.experience" isInteractive={interactive} onUpdate={updateHandler} />
    </h2>
  );

  const ContactLinks = ({ className, contact: contactData = contact, isInteractive: interactive = isInteractive, onUpdate: updateHandler = onUpdate }: any) => (
    <>
      {contactData?.linkedin && (
        <p className={className}>
          <strong>LinkedIn:</strong>{" "}
          <InlineEdit value={contactData.linkedin} path="contact.linkedin" isInteractive={interactive} onUpdate={updateHandler} />
        </p>
      )}
      {contactData?.github && (
        <p className={className}>
          <strong>GitHub:</strong>{" "}
          <InlineEdit value={contactData.github} path="contact.github" isInteractive={interactive} onUpdate={updateHandler} />
        </p>
      )}
      {contactData?.portfolio && (
        <p className={className}>
          <strong>Portfolio:</strong>{" "}
          <InlineEdit value={contactData.portfolio} path="contact.portfolio" isInteractive={interactive} onUpdate={updateHandler} />
        </p>
      )}
    </>
  );

  const ProfilePhoto = ({ className, alt = name }: { className: string; alt?: string }) => {
    if (!hasPhotoSlot) return null;

    return (
      <div className={className}>
        <img src={photoUrl} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  };

  const LanguagesSection = ({ headerClass, itemClass, languages: sectionLanguages = languages, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("languages")) return null;
    if (!interactive && (!sectionLanguages || sectionLanguages.length === 0)) return null;
    return (
      <DraggableSection id="languages" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="languages" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className="space-y-1 mt-3">
          {asRecordArray(sectionLanguages).map((l: any, i: number) => (
            <p key={i} className={`${itemClass} break-words min-w-0`}>
              <strong className="break-words min-w-0"><InlineEdit value={l.language || l.name || (typeof l === "string" ? l : "")} path={`languages.${i}.language`} isInteractive={interactive} onUpdate={updateHandler} /></strong>
              {l.level && <span className="opacity-70 break-words min-w-0"> — <InlineEdit value={l.level} path={`languages.${i}.level`} isInteractive={isInteractive} onUpdate={onUpdate} /></span>}
            </p>
          ))}
        </div>
      </DraggableSection>
    );
  };

  const ProjectsSection = ({ headerClass, itemClass, projects: sectionProjects = projects, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("projects")) return null;
    if (!interactive && (!sectionProjects || sectionProjects.length === 0)) return null;
    return (
      <DraggableSection id="projects" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="projects" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className="space-y-4 mt-3">
          {asRecordArray(sectionProjects).map((proj: any, i: number) => (
            <div key={i} className={itemClass}>
              <p className="font-bold break-words"><InlineEdit value={proj.name} path={`projects.${i}.name`} isInteractive={interactive} onUpdate={updateHandler} /></p>
              {(proj.technologies || interactive) && (
                <p className="text-xs opacity-60 break-words italic">
                  <InlineEdit value={Array.isArray(proj.technologies) ? proj.technologies.join(", ") : (proj.technologies || "")} path={`projects.${i}.technologies`} isInteractive={interactive} onUpdate={(path: string, val: any) => updateHandler(path, val.split(",").map((s: string) => s.trim()))} />
                </p>
              )}
              <p className="text-xs mt-1 break-words whitespace-pre-wrap"><InlineEdit value={proj.description} path={`projects.${i}.description`} isInteractive={interactive} onUpdate={updateHandler} multiline /></p>
            </div>
          ))}
        </div>
      </DraggableSection>
    );
  };

  const ExperienceSection = ({ headerClass, experiences: sectionExperiences = experiences, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("experience")) return null;
    if (!interactive && (!sectionExperiences || sectionExperiences.length === 0)) return null;
    return (
      <DraggableSection id="experience" isInteractive={interactive} onDelete={deleteHandler}>
        <ExperienceTitle className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className="space-y-10">
          {asRecordArray(sectionExperiences).map((exp: any, i: number) => (
            <div key={i} className="flex gap-6 relative">
              <div className="w-px bg-slate-200 relative"><div className="absolute top-2 -left-1 w-2.5 h-2.5 bg-[#3d3d3d] rounded-full"></div></div>
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h4 className="flex-1 min-w-0 text-[13px] font-black text-slate-900 uppercase break-words"><InlineEdit value={exp.company} path={`experience.${i}.company`} isInteractive={interactive} onUpdate={updateHandler} /></h4>
                  <p className="flex-[0.8] min-w-0 text-[12px] font-black text-slate-700 break-words text-right"><InlineEdit value={exp.title} path={`experience.${i}.title`} isInteractive={interactive} onUpdate={updateHandler} /></p>
                </div>
                <div className="text-[10px] text-slate-400 mb-2 break-words"><InlineEdit value={exp.period} path={`experience.${i}.period`} isInteractive={interactive} onUpdate={updateHandler} /></div>
                <p className="text-[11px] leading-relaxed text-slate-500 whitespace-pre-wrap break-words"><InlineEdit value={exp.description} path={`experience.${i}.description`} isInteractive={interactive} onUpdate={updateHandler} multiline /></p>
              </div>
            </div>
          ))}
        </div>
      </DraggableSection>
    );
  };

  const EducationSection = ({ headerClass, education: sectionEducation = education, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("education")) return null;
    if (!interactive && (!sectionEducation || sectionEducation.length === 0)) return null;
    return (
      <DraggableSection id="education" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="education" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className="space-y-8">
          {asRecordArray(sectionEducation).map((edu: any, i: number) => (
            <div key={i} className="flex gap-6 relative">
              <div className="w-px bg-slate-200 relative"><div className="absolute top-2 -left-1 w-2.5 h-2.5 bg-[#3d3d3d] rounded-full"></div></div>
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex justify-between items-start gap-2 min-w-0">
                    <h4 className="flex-1 min-w-0 text-[12px] font-black text-slate-900 uppercase break-all leading-tight"><InlineEdit value={edu.school} path={`education.${i}.school`} isInteractive={interactive} onUpdate={updateHandler} /></h4>
                    <p className="shrink-0 max-w-[45%] text-[11px] font-black text-slate-700 break-words text-right leading-tight"><InlineEdit value={edu.degree} path={`education.${i}.degree`} isInteractive={interactive} onUpdate={updateHandler} /></p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 break-words"><InlineEdit value={edu.year} path={`education.${i}.year`} isInteractive={interactive} onUpdate={updateHandler} /></p>
                {edu.details && <p className="text-[11px] text-slate-500 mt-1 break-words whitespace-pre-wrap"><InlineEdit value={edu.details} path={`education.${i}.details`} isInteractive={interactive} onUpdate={updateHandler} multiline /></p>}
              </div>
            </div>
          ))}
        </div>
      </DraggableSection>
    );
  };

  const SummarySection = ({ headerClass, itemClass, summaryText: sectionSummary = summaryText, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("summary")) return null;
    return (
      <DraggableSection id="summary" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="summary" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <p className={`${itemClass} mt-3 break-words whitespace-pre-wrap`}><InlineEdit value={sectionSummary} path="summary" isInteractive={interactive} onUpdate={updateHandler} multiline /></p>
      </DraggableSection>
    );
  };

  const SkillsSection = ({ headerClass, itemClass, layout = "tags", skills: sectionSkills = skills, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("skills")) return null;
    if (!interactive && (!sectionSkills || sectionSkills.length === 0)) return null;
    return (
      <DraggableSection id="skills" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="skills" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className={layout === "tags" ? "flex flex-wrap gap-2 mt-3" : "space-y-2 mt-3"}>
          {asStringArray(sectionSkills).map((s: string, i: number) => (
            <span key={i} className={`${itemClass} ${layout === "tags" ? "inline-block" : "block"} break-words min-w-0 max-w-full`}>
              <InlineEdit value={s} path={`skills.${i}`} isInteractive={interactive} onUpdate={updateHandler} />
            </span>
          ))}
        </div>
      </DraggableSection>
    );
  };

  const ContactSection = ({ headerClass, itemClass = "", contact: contactData = contact, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    if (data.sectionOrder && !data.sectionOrder.includes("contact")) return null;
    if (!sectionHeaders?.contact) return null;
    return (
      <DraggableSection id="contact" isInteractive={interactive} onDelete={deleteHandler}>
        <SectionTitle sectionKey="contact" className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
        <div className={`space-y-2 ${itemClass} break-words min-w-0`}>
          {contactData?.location && <p className="break-words"><InlineEdit value={contactData.location} path="contact.location" isInteractive={interactive} onUpdate={updateHandler} /></p>}
          <p className="break-words"><InlineEdit value={contactData?.email || ""} path="contact.email" isInteractive={interactive} onUpdate={updateHandler} /></p>
          <p className="break-words"><InlineEdit value={contactData?.phone || ""} path="contact.phone" isInteractive={interactive} onUpdate={updateHandler} /></p>
          <div className="break-words"><ContactLinks className="break-words" contact={contactData} isInteractive={interactive} onUpdate={updateHandler} /></div>
        </div>
      </DraggableSection>
    );
  };

  const IdentityHeader = ({ nameClass, titleClass, containerClass = "", contactContainerClass = "text-right space-y-1 text-[10px] font-bold text-slate-500", showIcons = true, showContact = true, showPhoto = true, name: displayName = name, title: displayTitle = title, contact: contactData = contact, isInteractive: interactive = isInteractive, onUpdate: updateHandler = onUpdate }: any) => (
    <header className={containerClass}>
      <div className="flex items-center gap-6 flex-1 min-w-0">
        {showPhoto && (
          <ProfilePhoto
            className="w-24 h-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200/50 shadow-md bg-white"
            alt="Photo"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className={`${nameClass} break-words`}><InlineEdit value={displayName} path="userName" isInteractive={interactive} onUpdate={updateHandler} /></h1>
          <p className={`${titleClass} break-words`}><InlineEdit value={displayTitle} path="jobTitle" isInteractive={interactive} onUpdate={updateHandler} /></p>
        </div>
      </div>
      {showContact && headers?.contact && (
        <DraggableSection id="contact" isInteractive={interactive} onDelete={onDeleteSection}>
          <div className={`${contactContainerClass} text-current flex-1 min-w-0 max-w-[50%]`}>
            {contactData?.location && <div className="flex items-center justify-end gap-2"><span className="break-words min-w-0"><InlineEdit value={contactData.location} path="contact.location" isInteractive={interactive} onUpdate={updateHandler} /></span>{showIcons && <MapPin size={10} className="text-current opacity-70 shrink-0" />}</div>}
            <div className="flex items-center justify-end gap-2"><span className="break-words min-w-0"><InlineEdit value={contactData?.phone || ""} path="contact.phone" isInteractive={interactive} onUpdate={updateHandler} /></span>{showIcons && <Phone size={10} className="text-current opacity-70 shrink-0" />}</div>
            <div className="flex items-center justify-end gap-2"><span className="break-words min-w-0"><InlineEdit value={contactData?.email || ""} path="contact.email" isInteractive={interactive} onUpdate={updateHandler} /></span>{showIcons && <Mail size={10} className="text-current opacity-70 shrink-0" />}</div>
            <div className="break-words min-w-0"><ContactLinks contact={contactData} isInteractive={interactive} onUpdate={updateHandler} /></div>
          </div>
        </DraggableSection>
      )}
    </header>
  );

  const DynamicMainSections = ({ headerClass, itemClass, data: sectionData = data, style: templateStyle = style, experiences: sectionExperiences = experiences, education: sectionEducation = education, projects: sectionProjects = projects, languages: sectionLanguages = languages, skills: sectionSkills = skills, summaryText: sectionSummary = summaryText, isInteractive: interactive = isInteractive, onDeleteSection: deleteHandler = onDeleteSection, onUpdate: updateHandler = onUpdate, headers: sectionHeaders = headers }: any) => {
    // Deduplicate order to prevent "duplicate key" React errors
    const order = Array.from(new Set(sectionData?.sectionOrder || ["summary", "experience", "projects", "education", "skills", "languages"])) as string[];
    return ( // Added key for DynamicMainSections map
      <>
        {order.map((key) => {
          // if (key === "summary" && ["Horizon", "Lunar", "Stellar", "Solar", "Nebula", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Classic"].includes(templateStyle)) return null;
          // if (key === "summary" && ["Horizon", "Lunar", "Stellar", "Solar", "Nebula", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Classic", "Liverpool", "Lumiere", "Hartmann", "Patterson"].includes(templateStyle)) return null;
          // if (key === "summary" && ["Horizon", "Lunar", "Stellar", "Solar", "Nebula", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Classic", "Liverpool", "Lumiere", "Hartmann", "Patterson"].includes(templateStyle)) return null;
          if (key === "summary" && ["Horizon", "Lunar", "Stellar", "Solar", "Nebula", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Classic", "Liverpool", "Lumiere", "Patterson"].includes(templateStyle)) return null;
          if (key === "contact") return null;
          // if (key === "skills" && ["Horizon", "Eclipse", "Hyperion", "Lunar", "Stellar", "Solar", "Nebula", "Cosmos", "Astra", "Europass", "Galaxy", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure"].includes(templateStyle)) return null;
          // if (key === "languages" && ["Eclipse", "Hyperion", "Lunar", "Stellar", "Solar", "Nebula", "Cosmos", "Astra", "Europass", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure"].includes(templateStyle)) return null;
          if (key === "skills" && ["Horizon", "Eclipse", "Hyperion", "Lunar", "Stellar", "Solar", "Nebula", "Europass", "Galaxy", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Pamela", "Liverpool", "Lumiere", "Hartmann", "Patterson"].includes(templateStyle)) return null;
          if (key === "languages" && ["Eclipse", "Hyperion", "Lunar", "Stellar", "Solar", "Nebula", "Europass", "Prism", "Navy", "Vertex", "Verde", "Rose", "Azure", "Pamela", "Liverpool", "Lumiere", "Hartmann", "Patterson"].includes(templateStyle)) return null;
          // if (key === "experience" && ["Patterson"].includes(templateStyle)) return null;
          if (key === "experience" && ["Patterson"].includes(templateStyle)) return null;
          if (key === "education" && ["Patterson"].includes(templateStyle)) return null;
          if (key === "experience") return <ExperienceSection key={key} headerClass={headerClass} experiences={sectionExperiences} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;
          // Rose education now renders in main column — no exclusion needed
          if (key === "education") return <EducationSection key={key} headerClass={headerClass} education={sectionEducation} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;
          if (key === "projects") return <ProjectsSection key={key} headerClass={headerClass} itemClass={itemClass} projects={sectionProjects} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;
          if (key === "languages") return <LanguagesSection key={key} headerClass={headerClass} itemClass={itemClass} languages={sectionLanguages} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;
          if (key === "skills") return <SkillsSection key={key} headerClass={headerClass} itemClass={itemClass} skills={sectionSkills} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;
          if (key === "summary") return <SummarySection key={key} headerClass={headerClass} itemClass={itemClass} summaryText={sectionSummary} isInteractive={interactive} onDeleteSection={deleteHandler} onUpdate={updateHandler} headers={sectionHeaders} />;

          const standardKeys = ["summary", "experience", "education", "skills", "languages", "projects", "contact", "headers", "photourl", "username", "jobtitle", "_originalcvtext", "_originalcvcontext", "sectionorder"];
          if (!standardKeys.includes(key.toLowerCase()) && key in (sectionData || {})) {
            const items = sectionData[key];
            const isEmpty = !items || (Array.isArray(items) && items.length === 0) || (typeof items === 'string' && items.trim() === '');

            if (!interactive && isEmpty) return null;

            return (
              <DraggableSection key={key} id={key} isInteractive={interactive} onDelete={deleteHandler}>
                <div className="mt-2 mb-2">
                  <SectionTitle sectionKey={key} className={headerClass} headers={sectionHeaders} isInteractive={interactive} onUpdate={updateHandler} />
                  {Array.isArray(items) ? (
                    <div className="space-y-1 mt-3">{items.map((it: any, i: number) => (<p key={i} className={`${itemClass} break-words min-w-0`}><InlineEdit value={it} path={`${key}.${i}`} isInteractive={interactive} onUpdate={updateHandler} /></p>))}</div>
                  ) : (
                    <p className={`${itemClass} mt-3 whitespace-pre-wrap break-words min-w-0`}><InlineEdit value={items} path={key} isInteractive={interactive} onUpdate={updateHandler} multiline /></p>
                  )}
                </div>
              </DraggableSection>
            );
          }
          return null;
        })}
      </>
    );
  };

  // Renders sidebar sections (contact/skills/languages) in sectionOrder so drag-drop reorder works
  const DynamicSidebarSections = ({ sidebarKeys, configs }: {
    sidebarKeys: string[];
    configs: Record<string, { headerClass: string; itemClass: string; layout?: string }>;
  }) => {
    const order: string[] = data.sectionOrder || sidebarKeys;
    const sorted = [...sidebarKeys].sort((a: string, b: string) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return (
      <>
        {sorted.map((key: string) => {
          const cfg = configs[key];
          if (!cfg) return null;
          if (key === 'contact') return <ContactSection key={key} headerClass={cfg.headerClass} itemClass={cfg.itemClass} />;
          if (key === 'languages') return <LanguagesSection key={key} headerClass={cfg.headerClass} itemClass={cfg.itemClass} languages={languages} isInteractive={isInteractive} onDeleteSection={onDeleteSection} onUpdate={onUpdate} headers={headers} />;
          if (key === 'skills') return <SkillsSection key={key} headerClass={cfg.headerClass} itemClass={cfg.itemClass} layout={cfg.layout || 'tags'} />;
          if (key === 'education') return <EducationSection key={key} headerClass={cfg.headerClass} itemClass={cfg.itemClass} />;
          if (key === 'summary') return <SummarySection key={key} headerClass={cfg.headerClass} itemClass={cfg.itemClass} />;
          return null;
        })}
      </>
    );
  };

  // The ProtectionOverlay is now disabled to remove watermarks for all users.
  const ProtectionOverlay = () => null;

  return (
    <div
      className={`w-[210mm] min-h-[297mm] bg-white shadow-sm overflow-hidden text-left mx-auto relative select-none cv-printable`}
      onContextMenu={(e) => !isPaid && e.preventDefault()}
    >
      <style>{`
        .cv-readable-sidebar,
        .cv-readable-sidebar *:not(input):not(textarea):not(button):not(svg):not(path):not(circle):not(line):not(polyline):not(rect):not(.cv-section-controls):not(.cv-section-controls *) { color: #ffffff !important; }
        .cv-readable-sidebar .muted-readable { color: rgba(255,255,255,.78) !important; }
        .cv-readable-sidebar [class*="border-"] { border-color: rgba(255,255,255,.24) !important; }
        .cv-readable-sidebar input,
        .cv-readable-sidebar textarea { color: #0f172a !important; }
        .cv-section-controls { color: #475569 !important; }
        .cv-section-controls--delete { color: #dc2626 !important; background: #ffffff !important; border-color: #f87171 !important; }
        .cv-section-controls--delete svg { color: #dc2626 !important; stroke: #dc2626 !important; }
      `}</style>

      {/* --- STYLE: HORIZON --- */}
      {style === "Horizon" && (
        <div className="flex min-h-[297mm] w-[210mm] font-sans bg-white">
          <div className="cv-readable-sidebar w-[30%] bg-[#3d3d3d] text-white p-10 flex flex-col gap-10">
            {hasPhotoSlot && (
              <div className="w-32 h-32 rounded-full border-4 border-white/20 mx-auto overflow-hidden shadow-2xl">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2">
                À propos
              </h3>
              <p className="text-[11px] leading-relaxed text-white">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
              </p>
            </section>
            <DynamicSidebarSections
              sidebarKeys={["contact", "skills"]}
              configs={{
                contact: { headerClass: "text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2 text-current", itemClass: "text-[11px] opacity-90 text-current" },
                skills: { headerClass: "text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[9px] text-white font-bold" },
              }}
            />
          </div>
          <div className="flex-1 p-12 flex flex-col gap-12">
            <IdentityHeader
              nameClass="text-4xl font-black text-[#222] uppercase tracking-tighter"
              titleClass="text-lg font-bold text-slate-400 mt-1 uppercase tracking-widest"
              containerClass="flex justify-between items-start border-b border-slate-100 pb-8"
              showContact={false}
              isInteractive={isInteractive}
              onUpdate={onUpdate}
              showPhoto={false} // Photo is in sidebar for Horizon
            />
            <DynamicMainSections
              headerClass="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b-2 border-slate-100 pb-2"
              itemClass="text-[11px] leading-relaxed text-slate-500"
            />
          </div>
        </div>
      )}

      {/* --- STYLE: GALAXY --- */}
      {style === "Galaxy" && (
        <div className="p-16 font-serif text-[#1a1a1a]">
          <div className="text-center border-b-2 border-gray-100 pb-10 mb-10">
            {hasPhotoSlot && (
              <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-5xl font-bold uppercase tracking-widest mb-4">
              <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
            </h1>
            <p className="text-xl italic text-gray-500">
              <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
            </p>
            {headers.contact && (
              <DraggableSection id="contact" isInteractive={isInteractive} onDelete={onDeleteSection}>
                <div className="mt-4 flex flex-col items-center gap-2 text-xs font-sans uppercase tracking-widest text-gray-400 text-current">
                  <p>
                    <InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} />
                    {" • "}
                    <InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} />
                    {" • "}
                    <InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                  <ContactLinks className="" />
                </div>
              </DraggableSection>
            )}
          </div>
          <div className="flex flex-col gap-10 font-sans">
            {Array.from(new Set(data.sectionOrder || ["summary", "experience", "projects", "education", "skills", "languages"])).map((key: any) => {
              if (key === "skills") {
                if (data.sectionOrder && !data.sectionOrder.includes("skills")) return null;
                if (!isInteractive && skills.length === 0) return null;
                return (
                  <DraggableSection key={key} id="skills" isInteractive={isInteractive} onDelete={onDeleteSection}>
                    <SectionTitle sectionKey="skills" className="text-sm font-black uppercase tracking-[0.3em] mb-4 text-gray-400" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                    <p className="text-sm text-gray-600">
                      <InlineEdit
                        value={skills.join(" • ")}
                        path="skills"
                        isInteractive={isInteractive}
                        onUpdate={(path: string, val: any) => onUpdate(path, val.split("•").map((s: string) => s.trim()))}
                      />
                    </p>
                  </DraggableSection>
                );
              }

              return (
                <DynamicMainSections
                  key={key}
                  data={{ ...data, sectionOrder: [key] }}
                  headerClass="text-sm font-black uppercase tracking-[0.3em] mb-4 text-gray-400"
                  itemClass="text-sm text-gray-700"
                  languages={languages}
                  isInteractive={isInteractive}
                  onDeleteSection={onDeleteSection}
                  onUpdate={onUpdate}
                  headers={headers}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* --- STYLE: ECLIPSE --- */}
      {style === "Eclipse" && (
        <div className="flex min-h-[297mm] w-[210mm] font-sans text-[#333]">
          <div className="cv-readable-sidebar w-[35%] bg-[#1a1a1a] text-white p-10 flex flex-col gap-10">
            {hasPhotoSlot && (
              <div className="w-40 h-40 rounded-3xl border-4 border-white/10 mx-auto overflow-hidden">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-[28px] font-black leading-[1.1] uppercase mb-4">
                <InlineEdit
                  value={name}
                  path="userName"
                  isInteractive={isInteractive}
                  onUpdate={onUpdate}
                />
              </h1>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                <InlineEdit
                  value={title}
                  path="jobTitle"
                  isInteractive={isInteractive}
                  onUpdate={onUpdate}
                />
              </p>
            </div>
            <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2 text-current", itemClass: "text-[11px] text-white/90 text-current" },
                languages: { headerClass: "text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[11px] text-white/90" },
                skills: { headerClass: "text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[10px] text-white font-bold" },
              }}
            />
          </div>
          <div className="flex-1 p-16 flex flex-col gap-12">
            <DynamicMainSections
              headerClass="text-xl font-black uppercase tracking-tighter border-l-4 border-black pl-4 mb-6"
              itemClass="text-[13px] leading-relaxed text-gray-600"
            />
          </div>
        </div>
      )}

      {/* --- STYLE: AETHER --- */}
      {style === "Aether" && (
        <div className="p-16 font-sans text-gray-900">
          <IdentityHeader
            nameClass="text-5xl font-black tracking-tighter"
            titleClass="text-xl font-bold text-gray-500 mt-1"
            containerClass="flex justify-between items-start border-b-4 border-gray-900 pb-8 mb-10"
            isInteractive={isInteractive}
            onUpdate={onUpdate}
            contactContainerClass="text-right text-xs font-bold space-y-1 text-gray-700"
            showIcons={false}
          />
          <div className="grid grid-cols-12 gap-12">
            {/* Left Column */}
            <div className="col-span-8 flex flex-col gap-10">
              {Array.from(new Set<string>(data.sectionOrder || ["skills", "experience", "education", "projects"]))
                .filter((key: string) => !["summary", "languages", "contact"].includes(key))
                .map((key: string) => {
                  if (data.sectionOrder && !data.sectionOrder.includes(key)) return null;

                  if (key === "skills") {
                    return (
                      <DraggableSection key={key} id="skills" isInteractive={isInteractive} onDelete={onDeleteSection}>
                        <SectionTitle sectionKey="skills" className="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                        <div className="space-y-2">
                          {skills.map((s: string, i: number) => (
                            <p key={i} className="text-xs font-bold break-words whitespace-pre-wrap">
                              • <InlineEdit value={s} path={`skills.${i}`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                          ))}
                        </div>
                      </DraggableSection>
                    );
                  }

                  if (key === "experience") {
                    return (
                      <DraggableSection key={key} id="experience" isInteractive={isInteractive} onDelete={onDeleteSection}>
                        <SectionTitle sectionKey="experience" className="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                        {experiences.map((exp: any, i: number) => (
                          <div key={i} className="mb-6">
                            <p className="font-black text-base break-words">
                              <InlineEdit value={exp.company} path={`experience.${i}.company`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              {" | "}
                              <InlineEdit value={exp.title} path={`experience.${i}.title`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                            <p className="text-xs text-gray-400 font-bold mb-2 break-words">
                              <InlineEdit value={exp.period} path={`experience.${i}.period`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                              <InlineEdit value={exp.description} path={`experience.${i}.description`} isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                            </p>
                          </div>
                        ))}
                      </DraggableSection>
                    );
                  }

                  if (key === "education" && education.length > 0) {
                    return (
                      <DraggableSection key={key} id="education" isInteractive={isInteractive} onDelete={onDeleteSection}>
                        <SectionTitle sectionKey="education" className="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                        {education.map((edu: any, i: number) => (
                          <div key={i} className="mb-4">
                            <p className="font-black text-base break-words">
                              <InlineEdit value={edu.degree} path={`education.${i}.degree`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                            <p className="text-xs text-gray-500 break-words">
                              <InlineEdit value={edu.school} path={`education.${i}.school`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              {" • "}
                              <InlineEdit value={edu.year} path={`education.${i}.year`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                            {edu.details && (
                              <p className="text-xs text-gray-600 mt-1 break-words whitespace-pre-wrap">
                                <InlineEdit value={edu.details} path={`education.${i}.details`} isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                              </p>
                            )}
                          </div>
                        ))}
                      </DraggableSection>
                    );
                  }

                  if (key === "projects") {
                    return (
                      <ProjectsSection
                        key={key}
                        headerClass="text-lg font-black border-b border-gray-200 pb-2 mb-4"
                        itemClass="mb-6"
                        isInteractive={isInteractive}
                        onDeleteSection={onDeleteSection}
                        onUpdate={onUpdate}
                        headers={headers}
                      />
                    );
                  }

                  // Custom sections
                  const standardKeys = ["summary", "experience", "education", "skills", "languages", "projects", "contact", "headers", "photourl", "username", "jobtitle", "_originalcvtext", "sectionorder"];
                  if (!standardKeys.includes(key.toLowerCase()) && key in data) {
                    const items = data[key];
                    const isEmpty = !items || (Array.isArray(items) && items.length === 0) || (typeof items === 'string' && items.trim() === '');
                    if (!isInteractive && isEmpty) return null;
                    return (
                      <DraggableSection key={key} id={key} isInteractive={isInteractive} onDelete={onDeleteSection}>
                        <SectionTitle sectionKey={key} className="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                        {Array.isArray(items) ? (
                          <div className="space-y-1 mt-3">
                            {items.map((it: any, i: number) => (
                              <p key={i} className="text-xs break-words min-w-0">
                                • <InlineEdit value={it} path={`${key}.${i}`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs mt-3 whitespace-pre-wrap break-words min-w-0 text-gray-600 leading-relaxed">
                            <InlineEdit value={items} path={key} isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                          </p>
                        )}
                      </DraggableSection>
                    );
                  }
                  return null;
                })}
            </div>

            {/* Right Column */}
            <div className="col-span-4 flex flex-col gap-8">
              {Array.from(new Set<string>(data.sectionOrder || ["summary", "languages"]))
                .filter((key: string) => ["summary", "languages"].includes(key))
                .map((key: string) => {
                  if (data.sectionOrder && !data.sectionOrder.includes(key)) return null;

                  if (key === "summary") {
                    return (
                      <DraggableSection key={key} id="summary" isInteractive={isInteractive} onDelete={onDeleteSection}>
                        <SectionTitle sectionKey="summary" className="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4" headers={headers} isInteractive={isInteractive} onUpdate={onUpdate} />
                        <p className="text-xs text-gray-600 leading-relaxed italic break-words whitespace-pre-wrap">
                          <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                        </p>
                      </DraggableSection>
                    );
                  }

                  if (key === "languages" && languages.length > 0) {
                    return (
                      <LanguagesSection
                        key={key}
                        headerClass="text-sm font-black uppercase border-b border-gray-200 pb-2 mb-4"
                        itemClass="text-xs"
                        languages={languages}
                        isInteractive={isInteractive}
                        onDeleteSection={onDeleteSection}
                        onUpdate={onUpdate}
                        headers={headers}
                      />
                    );
                  }
                  return null;
                })}
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: HYPERION --- */}
      {style === "Hyperion" && (
        <div className="flex min-h-[297mm] font-sans">
          <div className="cv-readable-sidebar w-[30%] bg-[#064e3b] text-white p-10 flex flex-col gap-10">
            {hasPhotoSlot && (
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-emerald-400/30">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-xs font-black uppercase tracking-widest text-emerald-400", itemClass: "text-[10px] text-white text-current" },
                languages: { headerClass: "text-xs font-black uppercase tracking-widest text-emerald-400", itemClass: "text-[10px] text-white" },
                skills: { headerClass: "text-xs font-black uppercase tracking-widest text-emerald-400", itemClass: "text-[10px] font-bold text-emerald-100" },
              }}
            />
          </div>
          <div className="flex-1 p-16 flex flex-col gap-12">
            <header>
              <h1 className="text-5xl font-black text-emerald-950 tracking-tighter">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-xl font-bold text-emerald-600 mt-2">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>
            <DynamicMainSections
              headerClass="text-lg font-black text-emerald-900 border-b-2 border-emerald-100 pb-2 mb-6 uppercase"
              itemClass="text-sm text-gray-600 leading-relaxed"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: LUNAR --- */}
      {style === "Lunar" && (
        <div className="p-10 font-sans bg-slate-50 min-h-[297mm]">
          <header className="mb-8 flex gap-8 items-center">
            {hasPhotoSlot && (
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-light tracking-tighter text-slate-900 mb-2">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-lg font-bold text-slate-400 tracking-widest uppercase">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </div>
          </header>
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4 flex flex-col gap-12">
              <DynamicSidebarSections
                sidebarKeys={["contact", "languages", "skills"]}
                configs={{
                  contact: { headerClass: "text-xs font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-sm font-bold text-slate-600 text-current" },
                  languages: { headerClass: "text-xs font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-sm font-bold text-slate-600" },
                  skills: { headerClass: "text-xs font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-sm font-bold text-slate-700", layout: "list" },
                }}
              />
            </div>
            <div className="col-span-8 flex flex-col gap-16">
              <p className="text-sm leading-relaxed text-gray-600 font-medium italic break-words whitespace-pre-wrap">
                "<InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />"
              </p>
              <DynamicMainSections
                headerClass="text-xs font-black uppercase tracking-widest text-slate-400 mb-8"
                itemClass="text-sm leading-relaxed text-slate-600"
                languages={languages}
                isInteractive={isInteractive}
                onDeleteSection={onDeleteSection}
                onUpdate={onUpdate}
                headers={headers}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: STELLAR --- */}
      {style === "Stellar" && (
        <div className="font-sans min-h-[297mm] bg-white">
          <IdentityHeader
            nameClass="text-5xl font-black mb-2 text-white"
            titleClass="text-xl font-medium opacity-90 text-white"
            containerClass="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 p-10 relative flex justify-between items-center"
            isInteractive={isInteractive}
            onUpdate={onUpdate}
            contactContainerClass="absolute -bottom-8 right-16 bg-white shadow-xl p-6 rounded-2xl flex flex-col gap-2 text-xs font-bold text-gray-500 text-current"
            showIcons={false}
          />
          <div className="p-16 pt-24 grid grid-cols-12 gap-16">
            <div className="col-span-8 flex flex-col gap-8">
              <DynamicMainSections
                headerClass="text-xl font-black text-indigo-900 mb-6"
                itemClass="text-sm text-gray-600 leading-relaxed"
              />
            </div>
            <div className="col-span-4 flex flex-col gap-10">
              <div className="bg-gray-50 p-8 rounded-3xl">
                <SectionTitle sectionKey="summary" className="text-sm font-black uppercase text-gray-400 mb-4"
                  headers={headers}
                  isInteractive={isInteractive}
                  onUpdate={onUpdate}
                />
                <p className="text-xs leading-relaxed text-gray-600 font-medium break-words whitespace-pre-wrap">
                  <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                </p>
              </div>
              <DynamicSidebarSections
                sidebarKeys={["languages", "skills"]}
                configs={{
                  languages: { headerClass: "text-sm font-black uppercase text-indigo-900 mb-6", itemClass: "text-xs" },
                  skills: { headerClass: "text-sm font-black uppercase text-indigo-900 mb-6", itemClass: "text-xs font-bold text-gray-600" },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: SOLAR --- */}
      {style === "Solar" && (
        <div className="p-10 font-sans text-slate-800">
          <IdentityHeader
            nameClass="text-5xl font-black tracking-tight"
            titleClass="text-xl font-bold text-amber-600 mt-2"
            containerClass="mb-8 flex justify-between items-end border-b-8 border-amber-400 pb-6"
            isInteractive={isInteractive}
            onUpdate={onUpdate}
            contactContainerClass="text-right text-xs font-black space-y-1 opacity-60 uppercase text-current"
            showIcons={false}
          />
          <div className="grid grid-cols-2 gap-16">
            <section className="flex flex-col gap-8 min-w-0 overflow-hidden">
              <DynamicMainSections
                headerClass="text-lg font-black uppercase border-b-2 border-slate-100 pb-2"
                itemClass="text-xs leading-relaxed text-slate-500 break-words"
              />
            </section>
            <div className="flex flex-col gap-12">
              <div className="border-b-2 border-slate-100 pb-2 mb-4">
                <SectionTitle sectionKey="summary" className="text-lg font-black uppercase mb-4"
                  headers={headers}
                  isInteractive={isInteractive}
                  onUpdate={onUpdate}
                />
                <p className="text-sm leading-relaxed font-medium text-slate-600 italic break-words whitespace-pre-wrap">
                  "<InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />"
                </p>
              </div>
              <DynamicSidebarSections
                sidebarKeys={["languages", "skills"]}
                configs={{
                  languages: { headerClass: "text-lg font-black uppercase border-b-2 border-slate-100 pb-2 mb-6", itemClass: "text-sm font-bold text-slate-600" },
                  skills: { headerClass: "text-lg font-black uppercase border-b-2 border-slate-100 pb-2 mb-6", itemClass: "flex items-center gap-2 text-xs font-bold" },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: NEBULA --- */}
      {style === "Nebula" && (
        <div className="p-10 font-sans bg-white min-h-[297mm]">
          <div className="flex gap-12 mb-10">
            <div className="w-1/3 flex flex-col items-center text-center">
              {hasPhotoSlot && (
                <div className="w-24 h-24 mb-4 rounded-xl overflow-hidden border border-rose-100 shadow-sm">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="text-3xl font-black text-rose-500 leading-tight mb-4">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <div className="h-2 w-12 bg-rose-500 mb-6"></div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </div>
            <div className="w-2/3 pt-4">
              <div className="text-sm leading-relaxed text-gray-600 font-medium border-l-2 border-rose-100 pl-8 italic">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                <SectionTitle sectionKey="summary" className="text-xs font-black uppercase tracking-[0.4em] text-gray-300 mt-12 mb-8 not-italic"
                  headers={headers}
                  isInteractive={isInteractive}
                  onUpdate={onUpdate} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-8 flex flex-col gap-8">
              <DynamicMainSections
                headerClass="text-xs font-black uppercase tracking-[0.4em] text-gray-300 mt-12 mb-8"
                itemClass="text-sm text-gray-500 leading-relaxed"
                languages={languages}
                isInteractive={isInteractive}
                onDeleteSection={onDeleteSection}
                onUpdate={onUpdate}
                headers={headers}
              />
            </div>
            <div className="col-span-4 flex flex-col gap-12">
              <DynamicSidebarSections
                sidebarKeys={["contact", "languages", "skills"]}
                configs={{
                  contact: {
                    headerClass: "text-xs font-black uppercase tracking-[0.4em] text-gray-300 mb-6",
                    itemClass: "text-xs font-bold text-gray-500 text-current"
                  },
                  languages: {
                    headerClass: "text-xs font-black uppercase tracking-[0.4em] text-gray-300 mb-6",
                    itemClass: "text-xs"
                  },
                  skills: {
                    headerClass: "text-xs font-black uppercase tracking-[0.4em] text-gray-300 mb-6",
                    itemClass: "text-[10px] font-bold text-gray-600"
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: COSMOS --- */}
      {style === "Cosmos" && (
        <div className="font-sans min-h-[297mm] text-slate-900">
          <IdentityHeader
            nameClass="text-5xl font-black tracking-tighter mb-2 text-white"
            titleClass="text-xl font-bold text-slate-400 uppercase tracking-widest text-white"
            containerClass="bg-slate-900 text-white p-12 flex justify-between items-center"
            isInteractive={isInteractive}
            onUpdate={onUpdate}
            contactContainerClass="text-right text-sm space-y-1 font-medium opacity-80 text-white text-current"
            showIcons={false}
          />
          <div className="p-20 flex flex-col gap-16">
            <DynamicMainSections
              headerClass="text-sm font-black uppercase tracking-widest text-slate-400"
              itemClass="text-sm leading-relaxed text-slate-600"
            />
            <DynamicSidebarSections
              sidebarKeys={["languages", "skills"]}
              configs={{
                languages: { headerClass: "text-sm font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-sm" },
                skills: { headerClass: "text-sm font-black uppercase tracking-widest text-slate-400", itemClass: "font-bold text-xs text-slate-700" },
              }}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: ASTRA --- */}
      {style === "Astra" && (
        <div className="p-12 font-serif bg-white text-[#1a1a1a]">
          <header className="text-center mb-10">
            {hasPhotoSlot && (
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border border-gray-200">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2 tracking-tight"><InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} /></h1>
            <p className="text-lg text-gray-600 italic mb-4"><InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
            {headers.contact && (
              <DraggableSection id="contact" isInteractive={isInteractive} onDelete={onDeleteSection}>
                <div className="flex justify-center gap-6 text-xs text-gray-500 border-y border-gray-100 py-3 text-current">
                  {contact.location && <span><InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} /> • </span>}
                  <span><InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
                  <span>•</span>
                  <span><InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
                </div>
                <ContactLinks className="text-xs text-gray-500 mt-2" />
              </DraggableSection>
            )}
          </header>
          <div className="flex flex-col gap-10 font-sans">
            <DynamicMainSections
              headerClass="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-1 mb-6"
              itemClass="text-sm text-gray-700 leading-relaxed"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
            <DynamicSidebarSections
              sidebarKeys={["languages", "skills"]}
              configs={{
                languages: { headerClass: "text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-1 mb-4", itemClass: "text-sm" },
                skills: { headerClass: "text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-1 mb-4", itemClass: "text-sm text-gray-700" },
              }}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: PRISM --- */}
      {style === "Prism" && (
        <div className="flex min-h-[297mm] font-sans bg-white">
          <div className="w-[28%] bg-[#ebebeb] p-8 flex flex-col gap-8 text-slate-800">
            {hasPhotoSlot && (
              <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-[3px] border-pink-400 shadow-md">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-pink-600 border-b border-pink-300 pb-2 mb-3">Profil</h3>
              <p className="text-[11px] leading-relaxed text-slate-600">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline /> {/* Added key for SectionTitle */}
              </p>
            </section>
            <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-[10px] font-black uppercase tracking-widest text-pink-600 border-b border-pink-300 pb-2", itemClass: "text-[10px] text-slate-600" },
                languages: { headerClass: "text-[10px] font-black uppercase tracking-widest text-pink-600 border-b border-pink-300 pb-2", itemClass: "text-[10px] text-slate-600" },
                skills: { headerClass: "text-[10px] font-black uppercase tracking-widest text-pink-600 border-b border-pink-300 pb-2", itemClass: "text-[9px] text-slate-700 font-bold" },
              }}
            />
          </div>
          <div className="flex-1 p-10 relative">
            <div className="absolute top-0 right-0 w-28 h-28 bg-pink-200/50 rounded-bl-[3rem]" />
            <div className="absolute top-4 left-4 w-16 h-16 bg-slate-200/60 rotate-12" />
            <header className="border-2 border-slate-900 p-6 mb-10 text-center relative z-10 bg-white">
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-sm font-bold text-pink-600 uppercase tracking-[0.25em] mt-2">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>
            <DynamicMainSections
              headerClass="text-[10px] font-black uppercase tracking-[0.3em] text-pink-600 mb-6 border-b-2 border-pink-200 pb-2"
              itemClass="text-[11px] leading-relaxed text-slate-600"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: MERIDIAN --- */}
      {style === "Meridian" && (
        <div className="min-h-[297mm] font-sans bg-white p-12">
          <header className="border-b-4 border-[#2563eb] pb-6 mb-10 flex justify-between items-end gap-6">
            <div className="flex items-center gap-6">
              {hasPhotoSlot && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#2563eb]/30 shrink-0 shadow-sm">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-black text-[#1e40af] tracking-tight">
                  <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
                </h1>
                <p className="text-lg font-bold text-[#3b82f6] mt-1">
                  <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
                </p>
              </div>
            </div>
            {headers.contact && (
              <div className="text-right text-[10px] font-bold text-slate-500 space-y-1 shrink-0">
                <p className="text-current"><InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
                <p className="text-current"><InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
                <p className="text-current"><InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
              </div>
            )}
          </header>
          <DynamicMainSections
            headerClass="text-sm font-black uppercase text-[#2563eb] mb-6 border-l-4 border-[#2563eb] pl-3"
            itemClass="text-sm text-slate-600 leading-relaxed"
          />

        </div>
      )}

      {/* --- STYLE: CLASSIC --- */}
      {style === "Classic" && (
        <div className="min-h-[297mm] font-serif bg-white p-14 text-slate-900">
          <header className="text-center border-b border-slate-300 pb-8 mb-8">
            {hasPhotoSlot && (
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border border-slate-300">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-4xl font-bold tracking-wide mb-2">
              <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
            </h1>
            <p className="text-lg italic text-slate-600 mb-4">
              <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 font-sans">
              <span><InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
              <span>•</span>
              <span><InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
              <span>•</span>
              <span><InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
            </div>
          </header>
          <section className="mb-8 pb-6 border-b border-slate-200 font-sans">
            <SectionTitle sectionKey="summary" className="text-center text-sm font-bold uppercase tracking-[0.3em] mb-4" />
            <p className="text-sm text-center leading-relaxed text-slate-600 max-w-2xl mx-auto">
              <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
            </p>
          </section>
          <div className="font-sans">
            <DynamicMainSections
              headerClass="text-center text-xs font-bold uppercase tracking-[0.35em] border-b border-slate-300 pb-2 mb-6 mt-8"
              itemClass="text-sm text-slate-700 leading-relaxed"
            />

          </div>
        </div>
      )}

      {/* --- STYLE: NAVY --- */}
      {style === "Navy" && (
        <div className="flex min-h-[297mm] font-sans">
          {/* <div className="w-[34%] bg-[#1e3a5f] text-white p-8 flex flex-col gap-8 relative"> */}
          <div className="cv-readable-sidebar w-[34%] bg-[#1e3a5f] text-white p-8 flex flex-col gap-8 relative">
            <div className="absolute top-0 right-0 w-2 h-full bg-[#fbbf24]" />
            {hasPhotoSlot && (
              <div className="w-36 h-36 mx-auto overflow-hidden border-4 border-[#fbbf24] shadow-xl">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            {/* <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[11px] text-white/90" },
                languages: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[11px] text-white" },
                skills: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[10px] text-white font-bold" },
              }}
            />
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2 mb-3">Profil</h3>
              <p className="text-[11px] leading-relaxed text-white/85">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
              </p>
            </section> */}

            <DynamicSidebarSections
              sidebarKeys={["summary", "contact", "languages", "skills"]}
              configs={{
                summary: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[11px] leading-relaxed text-white/85" },
                contact: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[11px] text-white/90" },
                languages: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[11px] text-white" },
                skills: { headerClass: "text-xs font-black uppercase tracking-widest text-[#fbbf24] border-b border-white/20 pb-2", itemClass: "text-[10px] text-white font-bold" },
              }}
            />
          </div>
          <div className="flex-1 p-12 bg-white flex flex-col gap-10">
            <header className="border-b-2 border-[#1e3a5f] pb-6">
              <h1 className="text-4xl font-black text-[#1e3a5f] uppercase tracking-tight">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-lg font-bold text-[#fbbf24] mt-2 uppercase tracking-widest">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>
            <DynamicMainSections
              headerClass="text-sm font-black uppercase text-[#1e3a5f] mb-6 border-l-4 border-[#fbbf24] pl-3"
              itemClass="text-sm text-slate-600 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* --- STYLE: VERTEX --- */}
      {style === "Vertex" && (
        <div className="min-h-[297mm] font-sans bg-white">
          <header className="bg-[#1e3a8a] text-white px-10 py-8 flex items-center gap-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
            {hasPhotoSlot && (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shrink-0 relative z-10">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="relative z-10 flex-1">
              <h1 className="text-4xl font-black tracking-tight">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-lg font-medium opacity-90 mt-1">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </div>
            <div className="relative z-10 text-right text-xs space-y-1 opacity-90 shrink-0">
              <p><InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
              <p><InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} /></p>
            </div>
          </header>
          <div className="p-10 grid grid-cols-12 gap-10">
            <div className="col-span-4 flex flex-col gap-8">
              <section className="bg-slate-50 p-6 rounded-xl">
                <SectionTitle sectionKey="summary" className="text-xs font-black uppercase text-[#1e3a8a] mb-3" />
                <p className="text-xs leading-relaxed text-slate-600">
                  <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                </p>
              </section>
              <DynamicSidebarSections
                sidebarKeys={["languages", "skills"]}
                configs={{
                  languages: { headerClass: "text-xs font-black uppercase text-[#1e3a8a] mb-3", itemClass: "text-xs text-slate-600" },
                  skills: { headerClass: "text-xs font-black uppercase text-[#1e3a8a] mb-3", itemClass: "text-xs text-slate-600 font-bold" },
                }}
              />
            </div>
            <div className="col-span-8">
              <DynamicMainSections
                headerClass="text-sm font-black uppercase text-[#1e3a8a] mb-6 border-b-2 border-blue-100 pb-2"
                itemClass="text-sm text-slate-600 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: VERDE --- */}
      {style === "Verde" && (
        <div className="min-h-[297mm] font-sans bg-white">
          <div className="h-28 bg-[#16a34a] relative">
            {hasPhotoSlot && (
              <div className="absolute left-10 -bottom-12 w-28 h-28 rounded-xl overflow-hidden border-4 border-white shadow-xl">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="px-12 pt-16 pb-10">
            <header className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
              <div className={hasPhotoSlot ? "pl-36" : ""}>
                <h1 className="text-4xl font-black text-slate-900">
                  <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
                </h1>
                <p className="text-lg font-bold text-[#16a34a] mt-1">
                  <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
                </p>
              </div>
              <ContactSection headerClass="text-[10px] font-black uppercase text-[#16a34a]" itemClass="text-xs text-slate-600 text-right text-current" />
            </header>
            <section className="mb-8">
              <SectionTitle sectionKey="summary" className="text-sm font-black uppercase text-[#16a34a] border-b-2 border-green-100 pb-2 mb-4" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
              </p>
            </section>
            <DynamicMainSections
              headerClass="text-sm font-black uppercase text-[#16a34a] mb-6 border-b-2 border-green-100 pb-2 mt-4"
              itemClass="text-sm text-slate-600 leading-relaxed"
            />
            <div className="mt-8 grid grid-cols-2 gap-8">
              <LanguagesSection headerClass="text-sm font-black uppercase text-[#16a34a] mb-4" itemClass="text-xs text-slate-600" />
              <SkillsSection headerClass="text-sm font-black uppercase text-[#16a34a] mb-4" itemClass="text-xs font-bold text-slate-700" layout="list" />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: ROSE --- */}
      {style === "Rose" && (
        <div className="flex min-h-[297mm] font-sans border-l-[10px] border-t-[10px] border-[#ec4899] bg-white">
          <div className="w-[32%] p-8 flex flex-col gap-8 border-r border-pink-100">
            {hasPhotoSlot && (
              <div className="w-full aspect-[4/5] overflow-hidden border-2 border-[#ec4899]">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <DynamicSidebarSections
              sidebarKeys={["contact", "skills", "languages"]}
              configs={{
                contact: { headerClass: "text-xs font-black uppercase text-[#ec4899] border-b-2 border-pink-200 pb-2", itemClass: "text-[11px] text-slate-600 text-current" },
                skills: { headerClass: "text-xs font-black uppercase text-[#ec4899] border-b-2 border-pink-200 pb-2", itemClass: "text-[10px] font-bold text-slate-700" },
                languages: { headerClass: "text-xs font-black uppercase text-[#ec4899] border-b-2 border-pink-200 pb-2", itemClass: "text-[11px] text-slate-600" },
              }}
            />
          </div>
          <div className="flex-1 p-10 flex flex-col gap-8 min-w-0 overflow-hidden">
            <header>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter break-words">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <div className="h-1 w-24 bg-[#ec4899] my-3" />
              <p className="text-lg font-bold text-[#ec4899] uppercase tracking-widest">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>
            <SummarySection headerClass="text-sm font-black uppercase text-[#ec4899] border-b-2 border-pink-200 pb-2 mb-4" itemClass="text-sm text-slate-600 leading-relaxed" />
            <DynamicMainSections
              headerClass="text-sm font-black uppercase text-[#ec4899] mb-6 border-b-2 border-pink-200 pb-2"
              itemClass="text-sm text-slate-600 leading-relaxed break-words"
            />
          </div>
        </div>
      )}

      {/* --- STYLE: AZURE --- */}
      {style === "Azure" && (
        <div className="flex min-h-[297mm] font-sans">
          <div className="w-[30%] bg-[#dbeafe] p-8 flex flex-col gap-8 text-slate-800">
            {hasPhotoSlot && (
              <div className="w-28 h-28 mx-auto overflow-hidden border-2 border-[#3b82f6] shadow-md">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-[10px] font-black uppercase text-[#1d4ed8] border-b border-blue-300 pb-2", itemClass: "text-[10px] text-slate-700 text-current" },
                languages: { headerClass: "text-[10px] font-black uppercase text-[#1d4ed8] border-b border-blue-300 pb-2", itemClass: "text-[10px] text-slate-700" },
                skills: { headerClass: "text-[10px] font-black uppercase text-[#1d4ed8] border-b border-blue-300 pb-2", itemClass: "text-[9px] text-slate-700 font-bold" },
              }}
            />
          </div>
          <div className="flex-1 p-12 flex flex-col gap-10 bg-white">
            <header className="flex gap-6 items-center border-b-2 border-[#3b82f6] pb-6">
              <div>
                <h1 className="text-3xl font-black text-[#1e40af]">
                  <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
                </h1>
                <p className="text-base font-bold text-[#3b82f6] mt-1">
                  <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
                </p>
              </div>
            </header>
            <section>
              <SectionTitle sectionKey="summary" className="text-sm font-black uppercase text-[#1d4ed8] mb-4" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
              </p>
            </section>
            <DynamicMainSections
              headerClass="text-sm font-black uppercase text-[#1d4ed8] mb-6 bg-blue-50 px-3 py-2 border-l-4 border-[#3b82f6]"
              itemClass="text-sm text-slate-600 leading-relaxed px-1"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: EUROPASS --- */}
      {style === "Europass" && (
        <div className="flex min-h-[297mm] font-sans text-slate-800">
          <div className="cv-readable-sidebar w-[32%] bg-[#0065a2] text-white p-8 flex flex-col gap-10">
            {hasPhotoSlot && (
              <div className="w-32 h-32 rounded-sm overflow-hidden border-2 border-white/30 mx-auto">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <DynamicSidebarSections
              sidebarKeys={["contact", "languages", "skills"]}
              configs={{
                contact: { headerClass: "text-[13px] font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[11px] font-medium text-white text-current" },
                languages: { headerClass: "text-[13px] font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[11px] text-white" },
                skills: { headerClass: "text-[13px] font-black uppercase tracking-widest border-b border-white/20 pb-2", itemClass: "text-[11px] flex items-start gap-2 text-white", layout: "list" },
              }}
            />
          </div>
          <div className="flex-1 p-12 flex flex-col gap-12">
            <header className="border-b-2 border-slate-100 pb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-1">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-lg font-bold text-[#0065a2] uppercase tracking-widest">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>
            <DynamicMainSections
              headerClass="text-[14px] font-black uppercase tracking-widest text-slate-900 bg-slate-50 px-4 py-2 border-l-4 border-[#0065a2] mb-6"
              itemClass="px-4 text-[12px] text-slate-600"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: ELITE --- */}
      {style === "Elite" && (
        <div className="p-16 font-serif bg-white text-[#111] min-h-[297mm]">
          <header className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <ProfilePhoto className="w-28 h-28 rounded-full border border-slate-200 p-1 shadow-sm" />
            </div>
            <h1 className="text-5xl font-medium tracking-tight mb-3">
              <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
            </h1>
            <p className="text-xl text-slate-500 italic mb-6">
              <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
            </p>
            <div className="flex justify-center items-center gap-4 text-[11px] font-sans uppercase tracking-[0.2em] text-slate-400 text-current">
              <InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} />
              <span>•</span>
              <InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} />
              <span>•</span>
              <InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} />
            </div>
          </header>

          <div className="space-y-12">
            <section className="border-t border-b border-slate-100 py-8">
              <p className="text-center text-sm leading-relaxed text-slate-600 max-w-2xl mx-auto italic">
                <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
              </p>
            </section>

            <div className="font-sans">
              <DynamicMainSections
                headerClass="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 mb-8 flex items-center gap-4 after:content-[''] after:h-px after:bg-slate-100 after:flex-1"
                itemClass="text-[12px] leading-relaxed text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100 font-sans">
              <SkillsSection headerClass="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4" itemClass="text-[11px] font-bold text-slate-700" />
              <LanguagesSection headerClass="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4" itemClass="text-[11px] text-slate-600" />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: CONTEMPORARY --- */}
      {style === "Contemporary" && (
        <div className="p-16 font-sans bg-white min-h-[297mm] text-slate-900">
          <header className="flex items-start justify-between mb-20">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest mb-4">
                Curriculum Vitae
              </div>
              <h1 className="text-7xl font-black tracking-tighter leading-[0.8] mb-6">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-xl font-bold text-emerald-600 uppercase tracking-widest">
                  <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
                </p>
                <div className="h-px w-20 bg-slate-200" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest space-x-3">
                  <span><InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
                  <span><InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} /></span>
                </div>
              </div>
            </div>
            <ProfilePhoto className="w-32 h-40 object-cover bg-slate-100 grayscale hover:grayscale-0 transition-all duration-500" />
          </header>

          <div className="grid grid-cols-10 gap-16 relative">
            <div className="col-span-7 space-y-16">
              <DynamicMainSections
                headerClass="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mb-8 border-l-2 border-emerald-500 pl-4"
                itemClass="text-[13px] leading-relaxed text-slate-600"
              />
            </div>
            <div className="col-span-3 space-y-12 pt-2">
              <DynamicSidebarSections
                sidebarKeys={["contact", "skills", "languages", "education"]}
                configs={{
                  contact: { headerClass: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-[11px] font-bold text-slate-700" },
                  skills: { headerClass: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-600 shadow-sm" },
                  languages: { headerClass: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-[11px] text-slate-600" },
                  education: { headerClass: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4", itemClass: "text-[11px] text-slate-600" }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: PAMELA --- */}
      {style === "Pamela" && (
        <div className="flex min-h-[297mm] font-sans bg-white text-slate-800">
          {/* Left sidebar */}
          <div className="w-[32%] bg-[#f5f0e8] flex flex-col">
            {/* Geometric header with circular photo */}
            <div className="relative h-44 bg-[#c9b99a] overflow-hidden shrink-0">
              <div
                className="absolute bottom-0 left-0 w-full h-full bg-[#f5f0e8]"
                style={{ clipPath: "polygon(0 55%, 100% 100%, 0 100%)" }}
              />
              {hasPhotoSlot && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg z-10">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="p-7 flex flex-col gap-7 flex-1 overflow-hidden">
              <DynamicSidebarSections
                sidebarKeys={["contact", "skills", "languages"]}
                configs={{
                  contact: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-slate-300 pb-1 mb-2",
                    itemClass: "text-[9px] text-slate-600 text-current break-words",
                  },
                  skills: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-slate-300 pb-1 mb-2",
                    itemClass: "text-[9px] text-slate-600 break-words",
                    layout: "list",
                  },
                  languages: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-slate-300 pb-1 mb-2",
                    itemClass: "text-[9px] text-slate-600 break-words",
                  },
                }}
              />
            </div>
          </div>

          {/* Right main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Beige header band — name top right */}
            <div className="bg-[#c9b99a] px-8 py-6 flex items-center justify-end min-h-[7rem] shrink-0">
              <div className="text-right">
                <h1 className="text-2xl font-black uppercase tracking-widest text-white break-words">
                  <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80 mt-1 break-words">
                  <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
                </p>
              </div>
            </div>

            <div className="flex-1 p-8 flex flex-col gap-8 overflow-hidden">
              <DynamicMainSections
                headerClass="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 border-b border-slate-200 pb-1 mb-3"
                itemClass="text-[10px] text-slate-600 leading-relaxed break-words"
                languages={languages}
                isInteractive={isInteractive}
                onDeleteSection={onDeleteSection}
                onUpdate={onUpdate}
                headers={headers}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: LIVERPOOL --- */}
      {style === "Liverpool" && (
        <div className="flex min-h-[297mm] font-sans bg-white text-slate-800">
          {/* Left sidebar */}
          {/* <div className="w-[34%] bg-[#f0f7f7] flex flex-col p-8 gap-8"> */}
          <div className="w-[34%] bg-[#f0f7f7] flex flex-col p-8 gap-8 overflow-hidden min-w-0">
            {hasPhotoSlot && (
              <div className="w-full aspect-square overflow-hidden mb-2">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <DynamicSidebarSections
              sidebarKeys={["contact", "skills", "languages"]}
              configs={{
                contact: {
                  headerClass: "text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-[#4ab5b0] pb-1 mb-3",
                  itemClass: "text-[9px] text-slate-600 break-words min-w-0 overflow-hidden text-current",
                },
                skills: {
                  headerClass: "text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-[#4ab5b0] pb-1 mb-3",
                  itemClass: "text-[11px] text-slate-700",
                  layout: "list",
                },
                languages: {
                  headerClass: "text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-[#4ab5b0] pb-1 mb-3",
                  itemClass: "text-[11px] text-slate-700 font-bold",
                },
              }}
            />
          </div>

          {/* Right main content */}
          <div className="flex-1 p-10 flex flex-col gap-8">
            <header className="border-b-2 border-[#4ab5b0] pb-6">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight break-words">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest break-words">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>

            {/* Summary inline */}
            {(data.sectionOrder ? data.sectionOrder.includes("summary") : true) && (
              <DraggableSection id="summary" isInteractive={isInteractive} onDelete={onDeleteSection}>
                <p className="text-sm text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                  <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                </p>
              </DraggableSection>
            )}

            <DynamicMainSections
              headerClass="text-xs font-black uppercase tracking-widest text-slate-800 border-b-2 border-[#4ab5b0] pb-1 mb-4"
              itemClass="text-[11px] text-slate-600 leading-relaxed"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />
          </div>
        </div>
      )}

      {/* --- STYLE: LUMIERE --- */}
      {style === "Lumiere" && (
        <div className="flex min-h-[297mm] font-sans bg-white text-slate-800">
          {/* Left sidebar */}
          <div className="w-[32%] flex flex-col">
            {/* Top white area with name + photo */}
            <div className="p-8 pb-4 bg-white flex flex-col gap-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight break-words">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-sm font-bold text-[#7ab3d4] break-words">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
              {/* Contact items inline before the blue sidebar */}
              <div className="space-y-2 mt-2 text-[11px] text-slate-600">
                {contact?.location && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">📍</span>
                    <InlineEdit value={contact.location} path="contact.location" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
                {contact?.phone && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">P:</span>
                    <InlineEdit value={contact.phone} path="contact.phone" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
                {contact?.email && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">E:</span>
                    <InlineEdit value={contact.email} path="contact.email" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
                {contact?.linkedin && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">L:</span>
                    <InlineEdit value={contact.linkedin} path="contact.linkedin" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
                {contact?.github && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">G:</span>
                    <InlineEdit value={contact.github} path="contact.github" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
                {contact?.portfolio && (
                  <p className="flex items-center gap-2 break-words">
                    <span className="font-black text-slate-800 shrink-0">W:</span>
                    <InlineEdit value={contact.portfolio} path="contact.portfolio" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </p>
                )}
              </div>
            </div>

            {/* Blue skills/education sidebar */}
            <div className="flex-1 bg-[#d6eaf5] p-8 flex flex-col gap-8">
              <DynamicSidebarSections
                sidebarKeys={["skills", "languages"]}
                configs={{
                  skills: {
                    headerClass: "text-sm font-black text-slate-800 mb-3",
                    itemClass: "text-[11px] text-slate-700",
                    layout: "list",
                  },
                  languages: {
                    headerClass: "text-sm font-black text-slate-800 mb-3",
                    itemClass: "text-[11px] text-slate-700",
                  },
                }}
              />
            </div>
          </div>

          {/* Right main content */}
          <div className="flex-1 flex flex-col">
            {/* Top beige/cream area with circular photo */}
            <div className="bg-[#f5f0e8] p-8 flex justify-end items-start min-h-[12rem]">
              {hasPhotoSlot && (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 p-8 flex flex-col gap-8">
              {(data.sectionOrder ? data.sectionOrder.includes("summary") : true) && (
                <DraggableSection id="summary" isInteractive={isInteractive} onDelete={onDeleteSection}>
                  <h3 className="text-sm font-black text-slate-800 mb-3">
                    <InlineEdit value={headers?.summary || "Summary"} path="headers.summary" isInteractive={isInteractive} onUpdate={onUpdate} />
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                    <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                  </p>
                </DraggableSection>
              )}

              <DynamicMainSections
                headerClass="text-sm font-black text-slate-800 mb-4 border-b border-slate-200 pb-1"
                itemClass="text-[11px] text-slate-600 leading-relaxed"
                languages={languages}
                isInteractive={isInteractive}
                onDeleteSection={onDeleteSection}
                onUpdate={onUpdate}
                headers={headers}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- STYLE: HARTMANN --- */}
      {style === "Hartmann" && (
        <div className="flex min-h-[297mm] font-sans bg-white text-[#2c2c2c]">
          {/* Left sidebar */}
          <div className="w-[35%] flex flex-col">
            {/* Large photo at top */}
            {hasPhotoSlot ? (
              <div className="w-full aspect-[3/4] overflow-hidden bg-[#e8e0d5]">
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full aspect-[3/4] bg-[#e8e0d5]" />
            )}

            {/* Sidebar content below photo */}
            <div className="flex-1 bg-[#f5f0e8] p-6 flex flex-col gap-6 overflow-hidden min-w-0">
              <DynamicSidebarSections
                sidebarKeys={["contact", "languages", "skills"]}
                configs={{
                  contact: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.15em] text-[#8c7b6b] mb-2 border-b border-[#c9b99a]/50 pb-1",
                    itemClass: "text-[9px] text-[#4a4a4a] break-words min-w-0 text-current",
                  },
                  languages: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.25em] text-[#8c7b6b] mb-3",
                    itemClass: "text-[10px] text-[#4a4a4a] font-bold",
                  },
                  skills: {
                    headerClass: "text-[9px] font-black uppercase tracking-[0.25em] text-[#8c7b6b] mb-3",
                    itemClass: "text-[10px] text-[#4a4a4a]",
                    layout: "list",
                  },
                }}
              />
            </div>
          </div>

          {/* Right main content */}
          <div className="flex-1 p-10 flex flex-col gap-8 bg-white">
            {/* Name and title header */}
            <header className="border-b border-[#c9b99a] pb-6">
              <h1 className="text-4xl font-black uppercase tracking-[0.15em] text-[#2c2c2c] leading-tight break-words">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <div className="h-px w-full bg-[#c9b99a] my-3" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8c7b6b] break-words">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </header>

            <DynamicMainSections
              headerClass="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c2c2c] border-b border-[#c9b99a] pb-1 mb-4"
              itemClass="text-[11px] text-[#4a4a4a] leading-relaxed"
              languages={languages}
              isInteractive={isInteractive}
              onDeleteSection={onDeleteSection}
              onUpdate={onUpdate}
              headers={headers}
            />

            {/* Summary as profile section */}
            {/* {(data.sectionOrder ? data.sectionOrder.includes("summary") : true) && (
              <DraggableSection id="summary" isInteractive={isInteractive} onDelete={onDeleteSection}>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c2c2c] border-b border-[#c9b99a] pb-1 mb-4">
                  <InlineEdit value={headers?.summary || "Profil"} path="headers.summary" isInteractive={isInteractive} onUpdate={onUpdate} />
                </h3>
                <p className="text-[11px] text-[#4a4a4a] leading-relaxed break-words whitespace-pre-wrap">
                  <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                </p>
              </DraggableSection>
            )} */}
          </div>
        </div>
      )}

      {/* --- STYLE: PATTERSON --- */}
      {style === "Patterson" && (
        <div className="flex min-h-[297mm] font-sans bg-white text-slate-800">
          {/* Left sidebar — grey background */}
          <div className="w-[34%] flex flex-col bg-[#e8e8e8]">
            {/* Dark top header area with photo circle overlapping */}
            <div className="bg-[#4a4a4a] w-full relative" style={{ height: "180px" }}>
              {hasPhotoSlot && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[-44px] w-24 h-24 rounded-full overflow-hidden border-4 border-[#e8e8e8] shadow-xl z-10">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Sidebar sections — shifted down to clear the overlapping photo */}
            <div className={`flex flex-col gap-7 p-7 flex-1 ${hasPhotoSlot ? "pt-16" : "pt-7"}`}>
              <DynamicSidebarSections
                sidebarKeys={["skills", "languages", "contact"]}
                configs={{
                  skills: {
                    headerClass: "text-[10px] font-black text-slate-800 border-b border-slate-400 pb-1 mb-2 uppercase tracking-wide",
                    itemClass: "text-[10px] text-slate-700 break-words",
                    layout: "list",
                  },
                  languages: {
                    headerClass: "text-[10px] font-black text-slate-800 border-b border-slate-400 pb-1 mb-2 uppercase tracking-wide",
                    itemClass: "text-[10px] text-slate-700 break-words",
                    layout: "list",
                  },
                  contact: {
                    headerClass: "text-[10px] font-black text-slate-800 border-b border-slate-400 pb-1 mb-2 uppercase tracking-wide",
                    itemClass: "text-[10px] text-slate-700 break-words text-current",
                  },
                }}
              />
            </div>
          </div>

          {/* Right main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Dark header with name — aligns with dark sidebar top */}
            {/* <div className="bg-[#4a4a4a] text-white px-8 py-8 flex flex-col justify-center" style={{ minHeight: "180px" }}>
              <h1 className="text-4xl font-black uppercase tracking-tight break-words leading-tight">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-sm font-medium text-white/75 mt-2 tracking-widest break-words"> */}
            <div className="bg-[#4a4a4a] px-8 py-8 flex flex-col justify-center" style={{ minHeight: "180px" }}>
              <h1 className="text-4xl font-black uppercase tracking-tight break-words leading-tight text-white">
                <InlineEdit value={name} path="userName" isInteractive={isInteractive} onUpdate={onUpdate} />
              </h1>
              <p className="text-sm font-medium text-slate-300 mt-2 tracking-widest break-words">
                <InlineEdit value={title} path="jobTitle" isInteractive={isInteractive} onUpdate={onUpdate} />
              </p>
            </div>

            {/* Main body */}
            <div className="flex-1 p-8 flex flex-col gap-7 bg-white">
              {/* Summary / Profile Info */}
              {(data.sectionOrder ? data.sectionOrder.includes("summary") : true) && (
                <DraggableSection id="summary" isInteractive={isInteractive} onDelete={onDeleteSection}>
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-3 flex items-center gap-3">
                    <InlineEdit value={headers?.summary || "Profile Info"} path="headers.summary" isInteractive={isInteractive} onUpdate={onUpdate} />
                    <span className="flex-1 h-px bg-slate-200 block" />
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                    <InlineEdit value={summaryText} path="summary" isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                  </p>
                </DraggableSection>
              )}

              {/* Experience with vertical timeline line */}
              {(data.sectionOrder ? data.sectionOrder.includes("experience") : true) && experiences.length > 0 && (
                <DraggableSection id="experience" isInteractive={isInteractive} onDelete={onDeleteSection}>
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-4 flex items-center gap-3">
                    <InlineEdit value={headers?.experience || "Expérience"} path="headers.experience" isInteractive={isInteractive} onUpdate={onUpdate} />
                    <span className="flex-1 h-px bg-slate-200 block" />
                  </h3>
                  <div className="relative pl-5">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-slate-300" />
                    <div className="space-y-5">
                      {experiences.map((exp: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 border-[#4a4a4a] bg-white" />
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <div className="min-w-0">
                              <p className="font-black text-[11px] text-slate-900 break-words">
                                <InlineEdit value={exp.title} path={`experience.${i}.title`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              </p>
                              <p className="font-bold text-[10px] text-slate-700 break-words">
                                <InlineEdit value={exp.company} path={`experience.${i}.company`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              </p>
                            </div>
                            <p className="text-[9px] text-slate-500 shrink-0 font-bold whitespace-nowrap">
                              <InlineEdit value={exp.period} path={`experience.${i}.period`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                            <InlineEdit value={exp.description} path={`experience.${i}.description`} isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </DraggableSection>
              )}

              {/* Education — same timeline style as experience */}
              {(data.sectionOrder ? data.sectionOrder.includes("education") : true) && education.length > 0 && (
                <DraggableSection id="education" isInteractive={isInteractive} onDelete={onDeleteSection}>
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-4 flex items-center gap-3">
                    <InlineEdit value={headers?.education || "Formation"} path="headers.education" isInteractive={isInteractive} onUpdate={onUpdate} />
                    <span className="flex-1 h-px bg-slate-200 block" />
                  </h3>
                  <div className="relative pl-5">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-slate-300" />
                    <div className="space-y-4">
                      {education.map((edu: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 border-[#4a4a4a] bg-white" />
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <div className="min-w-0">
                              <p className="font-black text-[11px] text-slate-900 break-words">
                                <InlineEdit value={edu.degree} path={`education.${i}.degree`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              </p>
                              <p className="font-bold text-[10px] text-slate-700 break-words">
                                <InlineEdit value={edu.school} path={`education.${i}.school`} isInteractive={isInteractive} onUpdate={onUpdate} />
                              </p>
                            </div>
                            <p className="text-[9px] text-slate-500 shrink-0 font-bold whitespace-nowrap">
                              <InlineEdit value={edu.year} path={`education.${i}.year`} isInteractive={isInteractive} onUpdate={onUpdate} />
                            </p>
                          </div>
                          {edu.details && (
                            <p className="text-[10px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                              <InlineEdit value={edu.details} path={`education.${i}.details`} isInteractive={isInteractive} onUpdate={onUpdate} multiline />
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </DraggableSection>
              )}

              <DynamicMainSections
                headerClass="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-3 flex items-center gap-3 after:content-[''] after:h-px after:bg-slate-200 after:flex-1"
                itemClass="text-[11px] text-slate-600 leading-relaxed break-words"
                languages={languages}
                isInteractive={isInteractive}
                onDeleteSection={onDeleteSection}
                onUpdate={onUpdate}
                headers={headers}
              />

            </div>
          </div>
        </div>
      )}

      <ProtectionOverlay />
    </div>
  );
};

export default CVRenderer;