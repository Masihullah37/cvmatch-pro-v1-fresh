import { db } from "@/lib/db";
import { userTemplateUnlocks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";


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
