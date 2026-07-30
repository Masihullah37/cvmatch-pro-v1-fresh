import { redis } from "@/lib/rate-limit/upstash";
import { db } from "@/lib/db";
import { usageLogs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Clears daily ATS / AI rewrite counters for a user after purchase or renewal
 * so a fresh plan starts with a full daily quota (not a stale pre-payment count).
 * Includes Aggregated Snapshot Pattern: logs usage to DB before clearing.
 */
export async function resetAnalysisRateLimitsForUser(
  clerkUserId: string
): Promise<void> {
  if (!clerkUserId || clerkUserId === "guest") return;

  try {
    // 1. Resolve keys to delete first (Fast)

    const baseKeys = [
      `ats_daily_paid_${clerkUserId}`,
      `ats_hourly_one_time_${clerkUserId}`,
      `ats_hourly_pro_${clerkUserId}`,
      `ai_rewrite_pro_${clerkUserId}`,
      `ai_rewrite_trial_${clerkUserId}`,
      `ai_rewrite_one_time_${clerkUserId}`,
    ];

    const libPrefixes = [
      'ats_daily_paid',
      'pdf_hourly',
      'pdf_daily',
      'cvboost_paid',
      'cvboost_pdf',
      'ai_rewrite_pro',
      'ai_rewrite_trial',
      'ai_rewrite_one_time'
    ];

    const finalKeys = [...baseKeys];
    libPrefixes.forEach(prefix => finalKeys.push(`${prefix}:${clerkUserId}`));

    // 2. Perform Atomic Snapshot (Optional but requested)
    // We do this in the background or at least don't let it block the delete
    const snapshotPromise = Promise.all(
      baseKeys.map(async (k) => {
        try {
          const count = await redis.get<number>(k);
          return { key: k, count: Number(count) || 0 };
        } catch { return { key: k, count: 0 }; }
      })
    );

    // 3. ATOMIC DELETE (Critical for user access)
    // Removed SCAN loop to avoid timeouts in webhook context
    await redis.del(...finalKeys);

    // 4. Background Logging (Don't block access)
    snapshotPromise.then(async (results) => {
      const used = results.filter(r => r.count > 0);
      if (used.length === 0) return;

      try {
        const user = await db.query.users.findFirst({
          where: eq(users.clerkId, clerkUserId),
        });
        if (!user) return;

        await db.insert(usageLogs).values(
          used.map(u => ({
            userId: user.id,
            scansCompletedCount: u.count,
            planAtThatTime: user.plan || 'free',
            usageType: u.key.includes('ats_daily') ? 'ats_scan' : 'ai_rewrite',
            cycleEndedAt: new Date(),
          }))
        );
      } catch (e) {
        console.error("Log error (silenced):", e);
      }
    }).catch(e => console.error("Snapshot error (silenced):", e));

    console.log(`✅ Reset rate limits for user ${clerkUserId}`);
  } catch (error) {
    console.error(`❌ Failed to reset rate limits for user ${clerkUserId}:`, error);
  }
}
