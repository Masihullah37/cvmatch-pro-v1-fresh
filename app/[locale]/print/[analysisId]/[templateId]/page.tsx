import { db } from "@/lib/db";
import { cvTemplates, cvAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import CVPrintView from "@/components/templates/CVPrintView";
import CVRenderer from "@/components/templates/CVRenderer";

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

  // If not internal, you might want to check for a session here if needed, 
  // but for now we prioritize internal access.

  // Fetch both template and analysis data to ensure the CV has content
  const [template, analysis] = await Promise.all([
    db.query.cvTemplates.findFirst({ where: eq(cvTemplates.id, templateId) }),
    db.query.cvAnalyses.findFirst({ where: eq(cvAnalyses.id, analysisId) })
  ]);

  //   if (!template || !analysis) {
  //     notFound();
  //   }

  //   return (
  //     // CRITICAL: This div MUST be present for Puppeteer
  //     <div id="cv-ready" data-testid="cv-content" className="bg-white min-h-screen">
  //       <CVRenderer
  //         template={template}
  //         analysisData={analysis}
  //         isPaid={true}
  //       />
  //     </div>
  //   );
  // }

  if (!template || !analysis) {
    notFound();
  }

  // Combine template and analysis data for printing
  const templateWithData = {
    ...template,
    templateData: template.templateData || analysis.optimizedData || {},
  };

  return (
    <div id="cv-ready" data-testid="cv-content" className="bg-white min-h-screen">
      <CVPrintView template={templateWithData} />
    </div>
  );
}