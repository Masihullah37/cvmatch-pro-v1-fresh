"use client";
/* eslint-disable react-hooks/immutability */

import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { deductCreditForAnalysis, deductCreditForTemplate, generateAIResume } from "@/app/actions/analysis"; // Assuming softDeleteCvAnalysis is imported
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import PaywallModal from "./PaywallModal";
import GuestAuthModal from "./GuestAuthModal";
import Watermark from "./Watermark";
import {
  Lock,
  Download,
  Sparkles,
  X,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Camera,
  ChevronLeft,
  Eye,
  Pencil,
  MoreVertical,
  Layers,
  Monitor,
  Target,
  CreditCard,
} from "lucide-react";
import CVRenderer from "./CVRenderer";
import { toast } from "sonner";
import { asRecordArray, asStringArray } from "@/components/templates/normalizeCvArrays";
import OuiCVLoader from "../common/OuiCVLoader";
interface Template {
  analysisId: string; // Add analysisId to Template interface for deletion
  id: string;
  templateNumber: number;
  templateStyle: string;
  templateData?: any;
  pdfUrl?: string;
  isPaid: boolean;
}

interface TemplateGridProps {
  templates: Template[];
  isPaid: boolean;
  userCredits: number;
  isExpired?: boolean;
  analysisId: string;
  analysisData?: any;
  initialTemplate?: number;
  plan?: string;
}

// ── Shared styles & constants ──────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary focus:bg-white transition-all";
const textareaCls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary focus:bg-white transition-all resize-none";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block";

const DEFAULT_HEADERS: Record<string, string> = {
  summary: "Profil",
  experience: "Expérience",
  education: "Formation",
  projects: "Projets",
  skills: "Compétences",
  languages: "Langues",
  contact: "Contact",
};

const sectionColors: Record<string, string> = {
  identity: "bg-white",
  summary: "bg-emerald-50/30",
  contact: "bg-slate-50/30",
  experience: "bg-emerald-50/20",
  education: "bg-slate-50/50",
  skills: "bg-emerald-50/30",
  languages: "bg-slate-50/30",
  projects: "bg-emerald-50/20",
};

// ── Sub-components (outside to prevent focus loss) ───────────────────────────

interface SectionHeaderProps {
  sectionKey: string;
  editingData: any;
  update: (path: string, value: any) => void;
  onAdd?: () => void;
  addLabel?: string;
  confirmingDelete: string | null;
  setConfirmingDelete: (val: string | null) => void;
  deleteSection: (key: string) => void;
}

const SectionHeader = ({
  sectionKey,
  editingData,
  update,
  onAdd,
  addLabel = "Ajouter",
  confirmingDelete,
  setConfirmingDelete,
  deleteSection
}: SectionHeaderProps) => {
  const val = editingData?.headers?.[sectionKey] ?? DEFAULT_HEADERS[sectionKey] ?? sectionKey;
  const isConfirming = confirmingDelete === sectionKey;

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 group/header">
        <input
          className="w-full text-xs font-black uppercase tracking-widest text-slate-800 bg-white/50
            border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
          value={val}
          onChange={(e) => update(`headers.${sectionKey}`, e.target.value)}
          placeholder={DEFAULT_HEADERS[sectionKey]}
        />
        {isConfirming && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 animate-in slide-in-from-left-2 z-20 translate-x-full pl-2">
            <button
              onClick={() => deleteSection(sectionKey)}
              className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg hover:bg-red-600 whitespace-nowrap"
            >
              Confirmer ?
            </button>
            <button
              onClick={() => setConfirmingDelete(null)}
              className="bg-slate-100 text-slate-400 p-1 rounded-lg hover:bg-slate-200"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!onAdd && !isConfirming && (
          <button
            onClick={() => setConfirmingDelete(sectionKey)}
            className="p-2 text-slate-300 hover:text-red-500 transition-all"
            title="Supprimer la section"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {onAdd && (
        <div className="flex items-center gap-2">
          {!isConfirming && (
            <button
              onClick={() => setConfirmingDelete(sectionKey)}
              className="p-2 text-slate-300 hover:text-red-500 transition-all"
              title="Supprimer la section"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onAdd}
            className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 transition-all flex items-center gap-1 shrink-0"
          >
            <Plus size={12} /> {addLabel}
          </button>
        </div>
      )}
    </div>
  );
};

interface EditorContentProps {
  editingData: any;
  update: (path: string, value: any) => void;
  updateTopLevel: (key: string, value: any) => void;
  updateArr: (section: string, idx: number, field: string, value: any) => void;
  addArr: (section: string, item: object) => void;
  removeArr: (section: string, idx: number) => void;
  delContact: (key: string) => void;
  hasLinkedin: boolean;
  hasGithub: boolean;
  hasPortfolio: boolean;
  addNextContact: () => void;
  addCustomSection: (name: string) => void;
  handleSave: () => void;
  saveStatus: string;
  confirmingDelete: string | null;
  setConfirmingDelete: (val: string | null) => void;
  deleteSection: (key: string) => void;
  newSectionName: string;
  setNewSectionName: (val: string) => void;
  analysisData: any;
}

const EditorContent = ({
  editingData,
  update,
  updateTopLevel,
  updateArr,
  addArr,
  removeArr,
  delContact,
  hasLinkedin,
  hasGithub,
  hasPortfolio,
  addNextContact,
  addCustomSection,
  handleSave,
  saveStatus,
  confirmingDelete,
  setConfirmingDelete,
  deleteSection,
  newSectionName,
  setNewSectionName,
  analysisData
}: EditorContentProps) => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="p-6 md:p-8 bg-white border-b border-slate-100 shrink-0 z-10">
      <h3 className="text-xl font-black text-slate-900">Modifier le CV</h3>
      <p className="text-xs text-slate-400 font-medium mt-1">Personnalisez chaque section en temps réel.</p>
    </div>

    <div className="flex-1 overflow-y-auto space-y-1 bg-slate-50/30">
      {/* Identity */}
      <div className={`p-6 md:p-8 ${sectionColors.identity}`}>
        <label className={labelCls}>Photo de profil</label>
        <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
          {editingData?.photoUrl ? (
            <div className="relative group">
              {/* <img
                src={editingData.photoUrl}
                alt="Profil"
                className="w-20 h-20 rounded-xl object-cover"
              /> */}
              <img
                src={editingData.photoUrl}
                alt="Profil"
                className="w-20 h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => update("photoUrl", "")}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg transition-transform hover:scale-110"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
              <Camera size={24} />
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="photo-upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onloadend = () => update("photoUrl", r.result);
                  r.readAsDataURL(f);
                }
              }}
            />
            <label
              htmlFor="photo-upload"
              className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black cursor-pointer hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
            >
              {editingData?.photoUrl ? "Changer" : "Ajouter une photo"}
            </label>
            <p className="text-[10px] text-slate-400 mt-2 font-medium italic">PNG, JPG — Max 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nom complet</label>
            <input
              className={inputCls}
              placeholder="Prénom Nom"
              value={editingData?.userName || ""}
              onChange={(e) => update("userName", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Poste visé</label>
            <input
              className={inputCls}
              placeholder="Développeur Full Stack"
              value={editingData?.jobTitle || ""}
              onChange={(e) => update("jobTitle", e.target.value)}
            />
          </div>
        </div>
      </div>

      {editingData?.headers?.summary !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.summary}`}>
          <SectionHeader
            sectionKey="summary"
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <textarea
            className={textareaCls}
            rows={5}
            placeholder="Décrivez votre parcours et vos objectifs..."
            value={editingData?.summary || ""}
            onChange={(e) => update("summary", e.target.value)}
          />
        </div>
      )}

      {editingData?.headers?.contact !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.contact}`}>
          <SectionHeader
            sectionKey="contact"
            onAdd={(!hasLinkedin || !hasGithub || !hasPortfolio) ? addNextContact : undefined}
            addLabel="Lien"
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                type="email"
                placeholder="email@exemple.com"
                value={editingData?.contact?.email || ""}
                onChange={(e) => update("contact.email", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input
                className={inputCls}
                placeholder="+33 6 00 00 00 00"
                value={editingData?.contact?.phone || ""}
                onChange={(e) => update("contact.phone", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Localisation</label>
              <input
                className={inputCls}
                placeholder="Paris, France"
                value={editingData?.contact?.location || ""}
                onChange={(e) => update("contact.location", e.target.value)}
              />
            </div>
            {hasLinkedin && (
              <div className="group/field relative">
                <label className={labelCls}>LinkedIn</label>
                <input
                  className={inputCls}
                  placeholder="linkedin.com/in/profil"
                  value={editingData?.contact?.linkedin || ""}
                  onChange={(e) => update("contact.linkedin", e.target.value)}
                />
                <button
                  onClick={() => delContact("linkedin")}
                  className="absolute right-3 top-9 p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {hasGithub && (
              <div className="group/field relative">
                <label className={labelCls}>GitHub</label>
                <input
                  className={inputCls}
                  placeholder="github.com/username"
                  value={editingData?.contact?.github || ""}
                  onChange={(e) => update("contact.github", e.target.value)}
                />
                <button
                  onClick={() => delContact("github")}
                  className="absolute right-3 top-9 p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {hasPortfolio && (
              <div className="group/field relative">
                <label className={labelCls}>Portfolio</label>
                <input
                  className={inputCls}
                  placeholder="https://portfolio.com"
                  value={editingData?.contact?.portfolio || ""}
                  onChange={(e) => update("contact.portfolio", e.target.value)}
                />
                <button
                  onClick={() => delContact("portfolio")}
                  className="absolute right-3 top-9 p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editingData?.headers?.experience !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.experience}`}>
          <SectionHeader
            sectionKey="experience"
            onAdd={() => addArr("experience", { title: "", company: "", period: "", description: "" })}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="space-y-4">
            {asRecordArray(editingData?.experience).map((exp: any, idx: number) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative group/item">
                <button
                  onClick={() => removeArr("experience", idx)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Poste</label>
                    <input className={inputCls} value={exp?.title || ""} onChange={(e) => updateArr("experience", idx, "title", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Entreprise</label>
                    <input className={inputCls} value={exp?.company || ""} onChange={(e) => updateArr("experience", idx, "company", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Période</label>
                    <input className={inputCls} value={exp?.period || ""} onChange={(e) => updateArr("experience", idx, "period", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Missions & Réalisations</label>
                  <textarea className={textareaCls} rows={4} value={exp?.description || ""} onChange={(e) => updateArr("experience", idx, "description", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingData?.headers?.education !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.education}`}>
          <SectionHeader
            sectionKey="education"
            onAdd={() => addArr("education", { degree: "", school: "", year: "", details: "" })}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="space-y-4">
            {asRecordArray(editingData?.education).map((edu: any, idx: number) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative">
                <button onClick={() => removeArr("education", idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
                <div>
                  <label className={labelCls}>Diplôme / Formation</label>
                  <input className={inputCls} value={edu?.degree || ""} onChange={(e) => updateArr("education", idx, "degree", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Établissement</label>
                    <input className={inputCls} value={edu?.school || ""} onChange={(e) => updateArr("education", idx, "school", e.target.value)} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Année / Période</label>
                    <input className={inputCls} value={edu?.year || ""} onChange={(e) => updateArr("education", idx, "year", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingData?.headers?.skills !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.skills}`}>
          <SectionHeader
            sectionKey="skills"
            onAdd={() => update("skills", [...asStringArray(editingData?.skills), ""])}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="flex flex-wrap gap-2.5 p-4 bg-white/50 rounded-2xl border border-slate-200 min-h-[60px]">
            {asStringArray(editingData?.skills).map((skill: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-200 group/skill">
                <input
                  value={skill || ""}
                  onChange={(e) => {
                    const arr = [...asStringArray(editingData?.skills)];
                    arr[idx] = e.target.value;
                    update("skills", arr);
                  }}
                  className="text-sm font-bold outline-none w-24 bg-transparent text-slate-700"
                />
                <button
                  onClick={() => {
                    const arr = asStringArray(editingData?.skills);
                    update("skills", arr.filter((_: any, i: number) => i !== idx));
                  }}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingData?.headers?.languages !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.languages}`}>
          <SectionHeader
            sectionKey="languages"
            onAdd={() => addArr("languages", { language: "", level: "" })}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="space-y-3">
            {asRecordArray(editingData?.languages).map((lang: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-center group/lang">
                <input className={`${inputCls} flex-1 shadow-sm`} placeholder="Langue" value={lang?.language || lang?.name || ""} onChange={(e) => {
                  const arr = [...asRecordArray(editingData?.languages)];
                  arr[idx] = { ...arr[idx], language: e.target.value };
                  update("languages", arr);
                }} />
                <input className={`${inputCls} flex-1 shadow-sm`} placeholder="Niveau" value={lang?.level || ""} onChange={(e) => {
                  const arr = [...asRecordArray(editingData?.languages)];
                  arr[idx] = { ...arr[idx], level: e.target.value };
                  update("languages", arr);
                }} />
                <button onClick={() => removeArr("languages", idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingData?.headers?.projects !== undefined && (
        <div className={`p-6 md:p-8 border-t border-slate-100 ${sectionColors.projects}`}>
          <SectionHeader
            sectionKey="projects"
            onAdd={() => addArr("projects", { name: "", technologies: [], description: "" })}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          <div className="space-y-5">
            {asRecordArray(editingData?.projects).map((proj: any, idx: number) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative">
                <button onClick={() => removeArr("projects", idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                <div>
                  <label className={labelCls}>Nom du Projet</label>
                  <input className={inputCls} value={proj?.name || ""} onChange={(e) => updateArr("projects", idx, "name", e.target.value)} />
                </div>
                <div>
                  {/* <label className={labelCls}>Technologies</label> */}
                  <label className={labelCls}>Technologies / Outils / Méthodes</label>
                  <input className={inputCls} placeholder="Ex: React, Tailwind — ou: Gestion de projet, Excel, Canva" value={Array.isArray(proj?.technologies) ? proj.technologies.join(", ") : proj?.technologies || ""} onChange={(e) => updateArr("projects", idx, "technologies", e.target.value.split(",").map(s => s.trimStart()))} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={textareaCls} rows={3} value={proj?.description || ""} onChange={(e) => updateArr("projects", idx, "description", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sections */}
      {Object.keys(editingData?.headers || {}).filter(k => !['summary', 'experience', 'education', 'skills', 'languages', 'contact', 'photoUrl', 'userName', 'jobTitle', 'projects', 'certifications', 'projet'].includes(k)).map(key => (
        <div key={key} className={`p-6 md:p-8 border-t border-slate-100 bg-slate-50/20`}>
          <SectionHeader
            sectionKey={key}
            onAdd={Array.isArray(editingData[key]) ? () => updateTopLevel(key, [...(editingData[key] || []), ""]) : undefined}
            editingData={editingData}
            update={update}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            deleteSection={deleteSection}
          />
          {Array.isArray(editingData[key]) ? (
            <div className="flex flex-wrap gap-2.5 p-4 bg-white/50 rounded-2xl border border-slate-200">
              {editingData[key].map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-200">
                  <input
                    value={item}
                    onChange={(e) => {
                      const arr = [...editingData[key]];
                      arr[idx] = e.target.value;
                      updateTopLevel(key, arr);
                    }}
                    className="text-sm font-medium outline-none w-24 bg-transparent"
                  />
                  <button
                    onClick={() => updateTopLevel(key, editingData[key].filter((_: any, i: number) => i !== idx))}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              className={textareaCls}
              rows={4}
              value={editingData[key] || ""}
              onChange={(e) => updateTopLevel(key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>

    {/* Fixed Bottom Panel (Save + ATS results) */}
    <div className="h-[260px] md:h-[300px] bg-white border-t border-slate-200 overflow-y-auto p-4 md:p-6 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] scrollbar-hide">
      <div className="w-full flex flex-col gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl mb-4">
        <div className="flex items-center gap-2">
          <Plus size={12} className="text-slate-400" />
          <input
            placeholder="Nom de la section (ex: Loisirs)"
            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none flex-1 text-slate-700"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
          />
          <button
            onClick={() => {
              if (newSectionName) {
                addCustomSection(newSectionName);
                setNewSectionName("");
              }
            }}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
          >
            Ajouter
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saveStatus === "saving"}
        className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 mb-6 ${saveStatus === "saved"
          ? "bg-emerald-600 text-white"
          : saveStatus === "error"
            ? "bg-red-500 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg shadow-emerald-500/20"
          }`}
      >
        {saveStatus === "saving" && (
          <OuiCVLoader size="sm" className="opacity-80" />
        )}
        {saveStatus === "saved" && <CheckCircle2 size={16} />}
        {saveStatus === "error" && <AlertCircle size={16} />}
        {saveStatus === "idle" && <Save size={14} />}
        {saveStatus === "saving"
          ? "Enregistrement..."
          : saveStatus === "saved"
            ? "Enregistré !"
            : saveStatus === "error"
              ? "Erreur — réessayer"
              : "Enregistrer les modifications"}
      </button>

      {/* ATS Data Panel - Strictly below Save button and separate from Editor scroll */}
      {analysisData && (
        <div className="pt-6 border-t border-slate-100 bg-white space-y-5 pb-6">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-primary shrink-0" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Données ATS — Optimisez votre CV</h4>
          </div>
          {analysisData.keywordsMissing && (analysisData.keywordsMissing as string[]).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Mots-clés manquants</p>
              <div className="flex flex-wrap gap-1.5">
                {(analysisData.keywordsMissing as string[]).map((kw: string, i: number) => (
                  <span key={i} className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {analysisData.suggestions && (analysisData.suggestions as string[]).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Suggestions d'amélioration</p>
              <ul className="space-y-2">
                {(analysisData.suggestions as string[]).slice(0, 5).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TemplateGrid({
  templates: initialTemplates,
  userCredits: initialUserCredits,
  isExpired = false,
  analysisId,
  analysisData,
  initialTemplate,
  plan,
  hasRealAnalysis = true,
}: any) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const locale = useLocale();
  const { userId } = useAuth();

  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [userCredits, setUserCredits] = useState<number>(initialUserCredits);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [forceDesktopPreview, setForceDesktopPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const editingDataRef = useRef<any>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const hasRestoredEdits = useRef(false);

  useEffect(() => {
    editingDataRef.current = editingData;
  }, [editingData]);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  useEffect(() => {
    setUserCredits(initialUserCredits);
  }, [initialUserCredits]);

  // useEffect(() => {
  //   if (searchParams.get("payment") === "success" && !hasRefreshed) {
  //     setHasRefreshed(true);
  //     try {
  //       const raw = sessionStorage.getItem("cvmatch_checkout_return");
  //       if (raw) {
  //         const saved = JSON.parse(raw);
  //         if (saved.mobileView === "edit") setMobileView("edit");
  //         sessionStorage.removeItem("cvmatch_checkout_return");
  //       }
  //     } catch {
  //       /* ignore */
  //     }
  //     fetch("/api/user/refresh-rate-limits", { method: "POST" }).catch(() => { });
  //     router.refresh();
  //   }
  // }, [searchParams, router, hasRefreshed]);

  useEffect(() => {
    if (searchParams.get("payment") === "success" && !hasRefreshed) {
      setHasRefreshed(true);
      try {
        const raw = sessionStorage.getItem("cvmatch_checkout_return");
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.mobileView === "edit") setMobileView("edit");
          sessionStorage.removeItem("cvmatch_checkout_return");
        }
      } catch {
        /* ignore */
      }

      // ✅ FIX: Delay this request slightly so the server doesn't choke on a simultaneous burst
      const executionTimer = setTimeout(() => {
        fetch("/api/user/refresh-rate-limits", { method: "POST" }).catch(() => { });
      }, 1000);

      return () => clearTimeout(executionTimer);
    }
  }, [searchParams, hasRefreshed]);

  // Auto-select initial template from URL param
  useEffect(() => {
    if (initialTemplate && initialTemplates.length > 0 && !selectedTemplate) {
      const tpl = initialTemplates.find((t: any) => t.templateNumber === initialTemplate) || initialTemplates[0];
      if (tpl) handleSelectById(tpl.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplates]);

  useEffect(() => {
    if (hasRestoredEdits.current) return;

    const saved = sessionStorage.getItem(`cv_anon_edits_${analysisId}`);
    // Restore if data exists, user is now logged in, and a template is selected
    if (saved && userId && selectedTemplate) {
      try {
        const parsedData = JSON.parse(saved);
        setEditingData(parsedData);
        sessionStorage.removeItem(`cv_anon_edits_${analysisId}`);
        hasRestoredEdits.current = true;
        // Auto-save the restored data to the database for the newly logged-in user
        persistEdits(parsedData);
      } catch (e) {
        console.error("Failed to restore anon edits", e);
      }
    }
  }, [selectedTemplate, userId, analysisId]);

  // Close any auth modal automatically once the user becomes authenticated.
  // Prevents Clerk's SignIn/SignUp modal from attempting to re-render
  // while already signed in (which throws "cannot_render_single_session_enabled").
  useEffect(() => {
    if (userId && showGuestAuthModal) {
      setShowGuestAuthModal(false);
    }
  }, [userId, showGuestAuthModal]);

  // Success banner after payment
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  }, [searchParams]);

  // Logic for "has access without immediate deduction"
  const hasAvailableCredits = userCredits > 0 && !isExpired;
  const isJustPaid = searchParams.get("payment") === "success";

  // Get current selected template to check its specific watermark/ownership status
  const selectedTpl = templates.find((t: any) => String(t.id) === String(selectedTemplate));

  // hasPaid is true if just paid, has credits, or already owns this specific template.
  // We tie this strictly to credits/ownership so watermarks reappear when balance is 0.
  const hasPaid = isJustPaid || hasAvailableCredits || (selectedTpl?.hideWatermark ?? false);

  const handleSelectById = async (id: string) => {
    const template = initialTemplates.find((t: any) => String(t.id) === String(id));
    if (!template) return;

    if (isExpired && !hasPaid) {
      setShowPaywall(true);
      return;
    }

    if (!editingData) {
      // RULE: Template selection is always FREE (0 credits).
      // Credits are only deducted at Download time.

      const data = JSON.parse(JSON.stringify(template.templateData || {}));
      if (!data.contact) data.contact = { email: "", phone: "", location: "" };
      const headerKeys = data.headers ? Object.keys(data.headers) : Object.keys(DEFAULT_HEADERS);
      data.headers = headerKeys.reduce((acc: Record<string, string>, key: string) => {
        acc[key] = data.headers?.[key] ?? DEFAULT_HEADERS[key] ?? key;
        return acc;
      }, {});

      data.languages = asRecordArray(data.languages);
      data.skills = asStringArray(data.skills);
      data.experience = asRecordArray(data.experience);
      data.education = asRecordArray(data.education);
      data.projects = asRecordArray(data.projects);
      // Initialize section order if missing
      if (!data.sectionOrder) {
        data.sectionOrder = Object.keys(data.headers).filter(k => k !== 'photoUrl' && k !== 'userName' && k !== 'jobTitle');
      } else {
        data.sectionOrder = Array.from(new Set(data.sectionOrder));
      }
      setEditingData(data);
    }
    setSelectedTemplate(id);
    setSaveStatus("idle");
    setMobileView("edit");
    setForceDesktopPreview(false);
  };

  const handleSelect = async (id: string) => {
    const template = templates.find((t) => String(t.id) === String(id));
    if (!template) return;

    if (isExpired && !hasPaid) {
      setShowPaywall(true);
      return;
    }

    if (!editingData) {
      // RULE: Template selection is always FREE (0 credits).
      // Credits are only deducted at Download time.

      const data = JSON.parse(JSON.stringify(template.templateData || {}));
      if (!data.contact) data.contact = { email: "", phone: "", location: "" };
      const headerKeys = data.headers ? Object.keys(data.headers) : Object.keys(DEFAULT_HEADERS);
      data.headers = headerKeys.reduce((acc: Record<string, string>, key: string) => {
        acc[key] = data.headers?.[key] ?? DEFAULT_HEADERS[key] ?? key;
        return acc;
      }, {});

      data.languages = asRecordArray(data.languages);
      data.skills = asStringArray(data.skills);
      data.experience = asRecordArray(data.experience);
      data.education = asRecordArray(data.education);
      data.projects = asRecordArray(data.projects);
      // Initialize section order if missing
      if (!data.sectionOrder) {
        data.sectionOrder = Object.keys(data.headers).filter(k => k !== 'photoUrl' && k !== 'userName' && k !== 'jobTitle');
      } else {
        data.sectionOrder = Array.from(new Set(data.sectionOrder));
      }
      setEditingData(data);
    }
    setSelectedTemplate(id);
    setSaveStatus("idle");
    setMobileView("edit");
    setForceDesktopPreview(false);
    setShowModelPicker(false);
  };

  const handleGenerateAI = async () => {
    // ✅ Fix: Anonymous users should always be prompted to login first
    if (plan === "anonymous") {
      setShowGuestAuthModal(true);
      return;
    }

    if (isExpired && !hasPaid) {
      setShowPaywall(true);
      return;
    }
    if (userCredits < 1 && !hasPaid) { setShowPaywall(true); return; }
    try {
      setIsGeneratingAI(true);

      // Deduct credit first if not already paid
      if (!hasPaid) {
        try {
          const creditRes = await deductCreditForAnalysis(analysisId);
          if (creditRes.success) {
            if (!creditRes.alreadyPaid && userCredits > 0) {
              setUserCredits(prev => prev - 1);
            }
            setTemplates(prev => prev.map(t => ({ ...t, isPaid: true })));
            router.refresh();
          }
        } catch (err: any) {
          setShowPaywall(true);
          return;
        }
      }

      const res = await fetch("/api/generate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      if (!res.ok) throw new Error("Erreur lors de la génération IA");
      const result = await res.json();
      console.log("[DOWNLOAD] API response", result);
      if (result.success) {
        router.refresh();
      }
    } catch (err: any) {
      setShowPaywall(true);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const persistEdits = async (data: any) => {
    try {
      const res = await fetch("/api/update-cv-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          templateId: selectedTemplate,
          optimizedData: data,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };


  const handleSave = async () => {
    if (!selectedTemplate || !editingData) return;

    // If not logged in, save to session storage and show registration modal
    if (!userId) {
      sessionStorage.setItem(`cv_anon_edits_${analysisId}`, JSON.stringify(editingData));
      setShowGuestAuthModal(true);
      return;
    }

    setSaveStatus("saving");
    setTemplates((prev) =>
      prev.map((t) =>
        String(t.id) === String(selectedTemplate)
          ? { ...t, templateData: editingData }
          : t,
      ),
    );
    const ok = await persistEdits(editingData);
    setSaveStatus(ok ? "saved" : "error");
    if (ok) setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleDownload = async (templateId: string) => {
    if (!userId) {
      if (editingData) {
        sessionStorage.setItem(`cv_anon_edits_${analysisId}`, JSON.stringify(editingData));
      }
      setShowGuestAuthModal(true);
      return;
    }

    if (isExpired && !hasPaid) {
      setShowPaywall(true);
      return;
    }

    try {
      setIsGenerating(templateId);

      const creditRes = await deductCreditForTemplate(templateId);

      if (creditRes?.deducted && userCredits > 0) {
        setUserCredits((prev: number) => Math.max(0, prev - 1));
      }

      const currentData =
        selectedTemplate === templateId && editingDataRef.current
          ? editingDataRef.current
          : templates.find((t) => t.id === templateId)?.templateData;

      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          analysisId,
          templateData: currentData,
        }),
      });

      const result = await res.json();
      console.log("[DOWNLOAD] API response", result);
      if (!res.ok) {
        if (result.action === "upgrade" || result.action === "unlock" || result.action === "login") {
          throw new Error("PAYWALL");
        }
        throw new Error(result.error || "Erreur serveur");
      }

      if (result.pdfBase64) {
        // 1. Convert base64 to binary data
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // 2. Direct, Safe Link Trigger for all Devices (Mobile & Desktop)
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = result.fileName || "CV.pdf";

        document.body.appendChild(link);

        // Disconnect click completely from the Next.js synchronous render frame
        // requestAnimationFrame(() => {
        //   link.click();

        //   setTimeout(() => {
        //     if (document.body.contains(link)) {
        //       document.body.removeChild(link);
        //     }
        //     window.URL.revokeObjectURL(blobUrl);
        //   }, 500);
        // });

        link.click();
        console.log("[DOWNLOAD] Link clicked");

        // Give mobile browsers plenty of time before cleanup
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }

          window.URL.revokeObjectURL(blobUrl);
        }, 10000);
      }

    } catch (err: any) {
      const isPaywallError =
        err.message === "PAYWALL" ||
        err.message === "Crédits insuffisants." ||
        err.message?.startsWith("EXPIRED:") ||
        err.message === "Utilisateur introuvable.";

      if (isPaywallError) {
        setShowPaywall(true);
      } else {
        console.error("[DOWNLOAD ERROR]", err);
        toast.error(err.message || "Une erreur s'est produite lors du téléchargement.");
      }
    } finally {
      if (mountedRef.current) {
        setIsGenerating(null);
      }
    }
  };

  const update = useCallback((path: string, value: any) => {
    if (path === "photoUrl" && typeof value === "string" && value.trim()) {
      setTemplates((prev) =>
        prev.map((t) => {
          const templateData = (t.templateData as any) || {};
          if (String(t.id) !== String(selectedTemplate) && templateData.photoUrl === "") {
            return t;
          }
          return {
            ...t,
            templateData: {
              ...templateData,
              photoUrl: value,
            },
          };
        }),
      );
    }

    setEditingData((prev: any) => {
      if (!prev) return prev;
      const keys = path.split(".");

      // Recursive shallow update to maintain referential integrity where possible
      const updateNested = (obj: any, keysArray: string[]): any => {
        const [head, ...tail] = keysArray;
        if (!head) return obj;
        if (tail.length === 0) {
          if (obj[head] === value) return obj;
          return { ...obj, [head]: value };
        }
        const nextSub = updateNested(obj[head] || {}, tail);
        if (obj[head] === nextSub) return obj;
        return { ...obj, [head]: nextSub };
      };

      return updateNested(prev, keys);
    });
  }, [selectedTemplate]);

  const updateTopLevel = useCallback((key: string, value: any) => {
    setEditingData((prev: any) => {
      if (!prev || prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const updateArr = useCallback((section: string, idx: number, field: string, value: any) => {
    setEditingData((prev: any) => {
      if (prev[section]?.[idx]?.[field] === value) return prev;
      const safeArr = Array.isArray(prev[section]) ? prev[section] : [];
      const arr = [...safeArr];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...prev, [section]: arr };
    });
  }, []);

  const addArr = useCallback((section: string, item: object) =>
    setEditingData((prev: any) => {
      const safeArr = Array.isArray(prev[section]) ? prev[section] : [];
      return {
        ...prev,
        [section]: [...safeArr, { ...item }],
      };
    }), []);

  const removeArr = useCallback((section: string, idx: number) =>
    setEditingData((prev: any) => {
      const safeArr = Array.isArray(prev[section]) ? prev[section] : [];
      return {
        ...prev,
        [section]: safeArr.filter((_: any, i: number) => i !== idx),
      };
    }), []);

  const delContact = useCallback((key: string) =>
    setEditingData((prev: any) => {
      const c = { ...prev.contact };
      delete c[key];
      return { ...prev, contact: c };
    }), []);

  const deleteSection = useCallback((key: string) => {
    setEditingData((prev: any) => {
      const next = { ...prev };
      delete next[key];
      if (next.headers) {
        const nextHeaders = { ...next.headers };
        delete nextHeaders[key];
        next.headers = nextHeaders;
      }
      // Remove from visual order
      if (next.sectionOrder) {
        next.sectionOrder = next.sectionOrder.filter((s: string) => s !== key);
      }
      return next;
    });
    setConfirmingDelete(null);
  }, []);

  const addCustomSection = useCallback((sectionName: string) => {
    if (!sectionName) return;
    const normalized = sectionName.trim().toLowerCase();
    let key = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) key = `section_${Date.now()}`;

    // Smart mapping to standard keys to allow re-adding deleted sections
    if (["profil", "résumé", "summary", "about", "bio"].includes(normalized)) key = "summary";
    else if (["expérience", "expériences", "experience", "work"].includes(normalized)) key = "experience";
    else if (["formation", "formations", "education", "études"].includes(normalized)) key = "education";
    else if (["compétences", "skills", "aptitudes"].includes(normalized)) key = "skills";
    else if (["langues", "languages"].includes(normalized)) key = "languages";
    else if (["projets", "projects"].includes(normalized)) key = "projects";

    const isListSection = ["skills", "languages"].includes(key);

    setEditingData((prev: any) => {
      const currentOrder = prev.sectionOrder || [];
      // Prevent duplicate keys in sectionOrder which causes React render errors
      if (currentOrder.includes(key)) return prev;

      const nextHeaders = { ...prev.headers, [key]: sectionName };

      return {
        ...prev,
        headers: nextHeaders,
        [key]: isListSection ? (prev[key] || []) : (prev[key] || ""),
        // Add new section to the end of the order
        sectionOrder: [...currentOrder, key]
      };
    });
  }, []);

  const memoizedTemplate = useMemo(() => {
    if (!selectedTpl) return null;
    return { ...selectedTpl, templateData: editingData };
  }, [selectedTpl, editingData]);

  const hasLinkedin = editingData?.contact && "linkedin" in editingData.contact;
  const hasGithub = editingData?.contact && "github" in editingData.contact;
  const hasPortfolio = editingData?.contact && "portfolio" in editingData.contact;

  const addNextContact = () => {
    if (!hasLinkedin) { update("contact.linkedin", ""); return; }
    if (!hasGithub) { update("contact.github", ""); return; }
    if (!hasPortfolio) { update("contact.portfolio", ""); return; }
  };

  // ── Drag & Drop Logic ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditingData((prev: any) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id);
        const newIndex = prev.sectionOrder.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return {
          ...prev,
          sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex),
        };
      });
    }
  }, []);

  useEffect(() => {
    const node = previewViewportRef.current;
    if (!node || !selectedTemplate) return;

    const updateMeasuredScale = () => {
      // When in desktop preview, we don't use horizontal padding because we want to see the full sheet
      const horizontalPadding = 16;
      const viewportWidth = window.visualViewport?.width || window.innerWidth || node.clientWidth;

      // We calculate scale based on the A4 width (794px). 
      // If forceDesktopPreview is true, we keep the layout fixed but scale it to fit the screen width.
      const availableWidth = Math.max(240, viewportWidth - horizontalPadding);
      const scale = Math.min(1, availableWidth / 794);

      setPreviewScale(scale);
    };

    updateMeasuredScale();
    const observer = new ResizeObserver(updateMeasuredScale);
    observer.observe(node);
    window.visualViewport?.addEventListener("resize", updateMeasuredScale);
    window.addEventListener("orientationchange", updateMeasuredScale);

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", updateMeasuredScale);
      window.removeEventListener("orientationchange", updateMeasuredScale);
    };
  }, [forceDesktopPreview, selectedTemplate, mobileView]);

  return (
    <div>
      <style>{`
        @keyframes ouiHeartPump {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.35); }
          60% { transform: scale(1.05); }
          80% { transform: scale(1.25); }
        }
        /* Issue A: Hide template title text (NOT the dots icon) on very small screens.
           The MoreVertical icon button is always visible because it has no text node. */
        @media (max-width: 404px) {
          .template-editor-title-text {
            display: none;
          }
        }
      `}</style>
      {/* Payment Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          <span className="font-black">Paiement réussi ! Votre CV est maintenant débloqué.</span>
        </div>
      )}
      {/* ── Template Grid ─────────────────────────────────────────── */}
      {!selectedTemplate && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">Choisissez un modèle</h2>
              <p className="text-xs text-slate-400 font-medium">Tous les modèles sont optimisés par l'IA pour votre profil.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                <CreditCard size={16} className="text-slate-400" />
                <span className="text-sm font-black text-slate-700">{userCredits} Crédits</span>
              </div>
              {!hasPaid && (
                <button
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-purple-500/20"
                >
                  {isGeneratingAI ? (
                    <img src="/ouicvlogo.png" alt="" className="mix-blend-multiply" style={{ width: 20, height: 'auto', animation: 'ouiHeartPump 0.6s infinite ease-in-out' }} />
                  ) : <Sparkles size={18} />}
                  {isGeneratingAI ? "IA en cours..." : "Générer mon CV par IA"}
                </button>
              )}

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              // <div
              //   key={template.id}
              //   // onClick={() => handleSelect(template.id)}
              //   onClick={() => {
              //     setTimeout(() => handleSelect(template.id), 150);
              //   }}
              //   className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              // >

              <div
                key={template.id}
                onClick={() => {
                  setTimeout(() => handleSelect(template.id), 150);
                }}
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
                className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 flex flex-col hover:shadow-2xl hover:-translate-y-1 hover:border-primary/30 active:shadow-2xl active:-translate-y-1 active:border-primary/30"
              >
                <div className="relative bg-slate-50 overflow-hidden" style={{ height: 320 }}>
                  <div className={`absolute inset-0 flex justify-center items-start pt-6`}>
                    {/* <div className="scale-[0.38] origin-top transform-gpu"> */}
                    <div className="scale-[0.38] origin-top transform-gpu pointer-events-none">
                      <CVRenderer template={template} isPaid={hasPaid} analysisData={analysisData} />
                    </div>
                  </div>
                  {/* <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center"> */}
                  <div className="absolute inset-0 bg-primary/0 transition-colors flex items-center justify-center group-hover:bg-primary/10 group-active:bg-primary/10">
                    {/* <span className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl flex items-center gap-2"> */}
                    <span className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-sm opacity-0 translate-y-2 transition-all shadow-xl flex items-center gap-2 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                      <Pencil size={15} /> Éditer
                    </span>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-slate-100">
                  <div />
                  {hasPaid && (
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(template.id); }} disabled={isGenerating === template.id} className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 active:scale-90 text-white rounded-xl flex items-center justify-center transition-all">
                      {isGenerating === template.id ? (
                        <img src="/ouicvlogo.png" alt="" className="mix-blend-multiply" style={{ width: 18, height: 'auto', animation: 'ouiHeartPump 0.6s infinite ease-in-out' }} />
                      ) : <Download size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor Modal ────────────────────────────────────────────── */}
      {selectedTemplate && selectedTpl && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedTemplate(null)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
                <ChevronLeft size={18} className="text-slate-600" />
              </button>
              <div>
                <p className="font-black text-slate-900 text-sm template-editor-title-text">Modèle {selectedTpl.templateStyle}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:block template-editor-title-text">Éditeur de CV</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                <CreditCard size={14} className="text-slate-400" />
                <span className="text-xs font-black text-slate-700">{userCredits} Crédits</span>
              </div>
              <button
                onClick={() => setShowModelPicker(v => !v)}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
              >
                <Layers size={16} /> Changer de modèle
              </button>
              <button
                onClick={async () => {
                  if (!userId) {
                    if (editingData) {
                      sessionStorage.setItem(`cv_anon_edits_${analysisId}`, JSON.stringify(editingData));
                    }
                    setShowGuestAuthModal(true);
                    return;
                  }
                  if (saveStatus !== "saved" && editingData) await handleSave();
                  if (hasPaid) {
                    await handleDownload(selectedTpl.id);
                  } else {
                    setShowPaywall(true);
                  }
                }}
                disabled={!!isGenerating}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 active:scale-95"
              >
                {isGenerating ? (
                  <img src="/ouicvlogo.png" alt="" className="mix-blend-multiply" style={{ width: 20, height: 'auto', animation: 'ouiHeartPump 0.6s infinite ease-in-out' }} />
                ) : (hasPaid ? <Download size={16} /> : <Lock size={16} />)}
                {isGenerating ? "" : "Télécharger"}
              </button>
            </div>

            <div className="flex sm:hidden items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setMobileView("edit")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mobileView === "edit" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}>
                <Pencil size={12} /> Éditer
              </button>
              <button onClick={() => setMobileView("preview")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mobileView === "preview" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}>
                <Eye size={12} /> Aperçu
              </button>
            </div>

            <div className="flex sm:hidden items-center gap-2">
              {/* <button
                onClick={async () => {
                  if (!userId) {
                    if (editingData) {
                      sessionStorage.setItem(`cv_anon_edits_${analysisId}`, JSON.stringify(editingData));
                    }
                    setShowGuestAuthModal(true);
                    return;
                  }
                  if (saveStatus !== "saved" && editingData) await handleSave();
                  if (hasPaid) {
                    await handleDownload(selectedTpl.id);
                  } else {
                    setShowPaywall(true);
                  }
                }}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-90 transition-all text-white rounded-xl flex items-center justify-center"
              >
                {hasPaid ? <Download size={18} /> : <Lock size={18} />}
              </button> */}

              <button
                type="button"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
                onClick={async (e) => {
                  e.preventDefault();
                  if (isGenerating === selectedTpl.id) return;

                  if (!userId) {
                    if (editingData) {
                      sessionStorage.setItem(`cv_anon_edits_${analysisId}`, JSON.stringify(editingData));
                    }
                    setShowGuestAuthModal(true);
                    return;
                  }
                  if (saveStatus !== "saved" && editingData) await handleSave();
                  if (hasPaid) {
                    await handleDownload(selectedTpl.id);
                  } else {
                    setShowPaywall(true);
                  }
                }}
                disabled={isGenerating === selectedTpl.id}
                className="w-10 h-10 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-80 shadow-lg shadow-emerald-600/20"
              >
                {isGenerating === selectedTpl.id ? (
                  <img
                    src="/ouicvlogo.png"
                    alt="Loading..."
                    className="mix-blend-multiply"
                    style={{ width: 22, height: 'auto', animation: 'ouiHeartPump 0.6s infinite ease-in-out' }}
                  />
                ) : hasPaid ? (
                  <Download size={18} />
                ) : (
                  <Lock size={18} />
                )}
              </button>
              {/* 3-dot menu */}
              <div className="relative">
                <button onClick={() => setShowMobileMenu(v => !v)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <MoreVertical size={18} className="text-slate-600" />
                </button>
                {showMobileMenu && (
                  <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-slate-100 w-56 z-50 overflow-hidden">
                    <button onClick={() => { setShowModelPicker(true); setShowMobileMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                      <Layers size={16} /> Changer de modèle
                    </button>
                    <div className="border-t border-slate-100" />
                    <button onClick={() => { setForceDesktopPreview(v => !v); setMobileView("preview"); setShowMobileMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-3">
                      <Monitor size={16} /> {forceDesktopPreview ? "Version mobile" : "Version desktop"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
            {/* Issue B: Editor pane mobile scroll fix.
               flex-1 min-h-0 constrains the panel to the remaining viewport height inside
               the fixed inset-0 parent, so overflow-y-auto inside EditorContent works
               correctly and doesn't stop scrolling below the Profile field. */}
            <div className={`w-full md:w-[480px] flex flex-col border-r border-slate-200 bg-white shrink-0 shadow-xl z-10 flex-1 min-h-0 md:flex-initial ${mobileView === "preview" ? "hidden md:flex" : "flex"}`}>
              <EditorContent
                editingData={editingData}
                update={update}
                updateTopLevel={updateTopLevel}
                updateArr={updateArr}
                addArr={addArr}
                removeArr={removeArr}
                delContact={delContact}
                hasLinkedin={hasLinkedin}
                hasGithub={hasGithub}
                hasPortfolio={hasPortfolio}
                addNextContact={addNextContact}
                addCustomSection={addCustomSection}
                handleSave={handleSave}
                saveStatus={saveStatus}
                confirmingDelete={confirmingDelete}
                setConfirmingDelete={setConfirmingDelete}
                deleteSection={deleteSection}
                newSectionName={newSectionName}
                setNewSectionName={setNewSectionName}
                analysisData={analysisData}
              />

              {/* Removed redundant ATS Data Panel from here - moved inside EditorContent */}
            </div>

            <div className={`flex-1 overflow-auto bg-slate-200/50 flex flex-col relative min-h-[500px] md:min-h-0 ${mobileView === "edit" ? "hidden md:flex" : "flex"}`}>
              {/* Model Picker Overlay */}
              {showModelPicker && (
                <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2"><Layers size={20} className="text-primary" /> Changer de modèle</h3>
                    <button onClick={() => setShowModelPicker(false)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelect(t.id)}
                        className={`group relative bg-slate-50 rounded-2xl overflow-hidden border-2 transition-all hover:border-primary hover:shadow-lg ${String(t.id) === String(selectedTemplate) ? "border-primary" : "border-transparent"
                          }`}
                      >
                        <div style={{ height: 180 }} className="relative overflow-hidden">
                          <div className="absolute inset-0 flex justify-center items-start pt-2">
                            <div className="scale-[0.24] origin-top transform-gpu pointer-events-none">
                              <CVRenderer template={{ ...t, templateData: editingData || t.templateData }} isPaid={true} analysisData={null} />
                            </div>
                          </div>
                        </div>
                        <div className="p-2 border-t border-slate-200 bg-white">
                        </div>
                        {String(t.id) === String(selectedTemplate) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="md:hidden sticky top-0 z-20 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aperçu en direct</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowModelPicker(true)} className="text-[10px] font-black text-primary flex items-center gap-1"><Layers size={12} /> Modèle</button>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>

              <div
                ref={previewViewportRef}
                className={`cv-live-preview flex-1 overflow-auto px-2 py-3 md:p-12 justify-center flex items-start bg-slate-200/50 transition-all duration-500`}
                style={{ "--preview-scale": previewScale } as CSSProperties}
              >
                <div
                  className="relative bg-white shadow-2xl rounded-sm overflow-visible transform-gpu transition-all duration-300"
                  style={{
                    width: "calc(794px * var(--preview-scale, 1))",
                    height: "calc(1123px * var(--preview-scale, 1))",
                    minWidth: forceDesktopPreview ? "calc(794px * var(--preview-scale, 1))" : undefined,
                  }}
                >
                  <div className="absolute left-0 top-0 w-[794px] transform-gpu flex justify-center" style={{ transform: "scale(var(--preview-scale, 1))", transformOrigin: 'top left' }}>
                    <style>{`
                      .cv-live-preview .cv-printable { margin-left: 0 !important; margin-right: 0 !important; }
                    `}</style>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={editingData?.sectionOrder || []} strategy={verticalListSortingStrategy}>
                        <CVRenderer
                          template={memoizedTemplate}
                          isPaid={hasPaid}
                          analysisData={analysisData}
                          isInteractive={true}
                          onUpdate={(path: string, val: any) => update(path, val)}
                          onDeleteSection={(key: string) => deleteSection(key)}
                        />
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaywall && (
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          analysisId={analysisId}
          templateNumber={selectedTpl?.templateNumber}
          templateId={selectedTemplate ?? undefined}
          mobileView={mobileView}
        />
      )}
      {showGuestAuthModal && !userId && (
        <GuestAuthModal
          isOpen={showGuestAuthModal}
          onClose={() => setShowGuestAuthModal(false)}
        />
      )}
    </div>
  );
};