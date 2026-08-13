// import { db } from "@/lib/db";
// import { cvTemplates, cvAnalyses } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { notFound } from "next/navigation";
// import CVPrintView from "@/components/templates/CVPrintView";
// import CVRenderer from "@/components/templates/CVRenderer";

// import { headers } from "next/headers";

// export default async function PrintTemplatePage({
//   params,
// }: {
//   params: Promise<{ analysisId: string; templateId: string }>;
// }) {
//   const { analysisId, templateId } = await params;
//   const headersList = await headers();

//   // ✅ AUTH BYPASS: Check for internal secret header from Puppeteer
//   const isInternal = headersList.get('x-pdf-gen-secret') === (process.env.PDF_GEN_SECRET || 'internal-bypass');

//   // If not internal, you might want to check for a session here if needed, 
//   // but for now we prioritize internal access.

//   // Fetch both template and analysis data to ensure the CV has content
//   const [template, analysis] = await Promise.all([
//     db.query.cvTemplates.findFirst({ where: eq(cvTemplates.id, templateId) }),
//     db.query.cvAnalyses.findFirst({ where: eq(cvAnalyses.id, analysisId) })
//   ]);

//   //   if (!template || !analysis) {
//   //     notFound();
//   //   }

//   //   return (
//   //     // CRITICAL: This div MUST be present for Puppeteer
//   //     <div id="cv-ready" data-testid="cv-content" className="bg-white min-h-screen">
//   //       <CVRenderer
//   //         template={template}
//   //         analysisData={analysis}
//   //         isPaid={true}
//   //       />
//   //     </div>
//   //   );
//   // }

//   if (!template || !analysis) {
//     notFound();
//   }

//   // Combine template and analysis data for printing
//   const templateWithData = {
//     ...template,
//     templateData: template.templateData || analysis.optimizedData || {},
//   };

//   return (
//     <div id="cv-ready" data-testid="cv-content" className="bg-white min-h-screen">
//       <CVPrintView template={templateWithData} />
//     </div>
//   );
// }

import { db } from "@/lib/db";
import { cvTemplates, cvAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import CVPrintView from "@/components/templates/CVPrintView";
import { headers } from "next/headers";

export default async function PrintTemplatePage({
  params,
}: {
  params: Promise<{ analysisId: string; templateId: string }>;
}) {
  const { analysisId, templateId } = await params;
  const headersList = await headers();

  // ✅ AUTH BYPASS: Check for internal secret header from Puppeteer
  const isInternal = headersList.get('x-pdf-gen-secret') === (process.env.PDF_GEN_SECRET || 'internal-bypass');

  // ─── Fetch template and analysis data ──────────────────────────
  const [template, analysis] = await Promise.all([
    db.query.cvTemplates.findFirst({ where: eq(cvTemplates.id, templateId) }),
    db.query.cvAnalyses.findFirst({ where: eq(cvAnalyses.id, analysisId) })
  ]);

  if (!template || !analysis) {
    notFound();
  }

  // ─── Combine data for printing ──────────────────────────────────
  const templateWithData = {
    ...template,
    templateData: template.templateData || analysis.optimizedData || {},
  };

  return (
    <>
      {/* ─── Critical: Remove all margins for perfect PDF scaling ─── */}
      {/* <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: white;
        }
        #cv-ready {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          background: white;
        }
        @media print {
          html, body {
            overflow: hidden !important;
          }
          #cv-ready {
            overflow: hidden !important;
          }
        }
      `}</style>
      <div id="cv-ready" data-testid="cv-content">
        <CVPrintView template={templateWithData} />
      </div> */}

      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          background: white;
        }
        #cv-ready {
          width: 100%;
          margin: 0;
          padding: 0;
          background: white;
        }
      `}</style>

      {/* ─── CRITICAL: This div MUST be present for Puppeteer ────── */}
      <div id="cv-ready">
        <CVPrintView template={templateWithData} />
      </div>
    </>
  );
}