// /**
//  * Template Service — Ownership lookups for watermark/download gating.
//  *
//  * Rules (from spec):
//  *  - All users can browse, select, preview and edit every template (0 credits).
//  *  - Watermark is hidden only when:
//  *      templateUnlocked  (user_template_unlocks row exists)
//  *      OR plan === 'monthly'
//  *      OR plan === 'one_time'
//  *  - Historical payments alone do NOT remove the watermark.
//  *  - Unused credits alone do NOT remove the watermark.
//  */

import { db } from "@/lib/db";
import { userTemplateUnlocks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// /**
//  * Returns a Set of template IDs that the given user has explicitly unlocked
//  * (i.e. paid 1 credit for a manual download).
//  *
//  * The caller combines this with plan checks:
//  *   hideWatermark = ownedTemplates.has(templateId)
//  *                   || plan === 'monthly'
//  *                   || plan === 'one_time';
//  */
// export async function getTemplateOwnership(userId: string): Promise<Set<string>> {
//   const rows = await db.query.userTemplateUnlocks.findMany({
//     where: eq(userTemplateUnlocks.userId, userId),
//   });

//   return new Set(rows.map((r) => r.templateId));
// }

// /**
//  * Returns true if the user already owns a specific template (no credit needed).
//  */
// export async function isTemplateOwned(
//   userId: string,
//   templateId: string,
// ): Promise<boolean> {
//   const row = await db.query.userTemplateUnlocks.findFirst({
//     where: (t, { and, eq: eqOp }) =>
//       and(eqOp(t.userId, userId), eqOp(t.templateId, templateId)),
//   });
//   return !!row;
// }

export async function getTemplateOwnership(userId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(userTemplateUnlocks)
    .where(eq(userTemplateUnlocks.userId, userId));

  return new Set(rows.map((r) => r.templateId));
}

export async function isTemplateOwned(userId: string, templateId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(userTemplateUnlocks)
    .where(
      and(
        eq(userTemplateUnlocks.userId, userId),
        eq(userTemplateUnlocks.templateId, templateId)
      )
    );

  return rows.length > 0;
}
