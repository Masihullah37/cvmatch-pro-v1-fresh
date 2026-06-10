import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getUserPlanStatus } from "@/lib/billing/get-user-plan";
import { resetAnalysisRateLimitsForUser } from "@/lib/rate-limit/reset-user-limits";

/** Called after checkout success so limits reset even if webhook is slightly delayed. */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  const { plan, isValid } = getUserPlanStatus(dbUser ?? null); // Handle undefined by converting to null
  if (!isValid || (plan !== "monthly" && plan !== "one_time")) {
    return NextResponse.json({ reset: false, reason: "no_active_paid_plan" });
  }

  await resetAnalysisRateLimitsForUser(userId);
  return NextResponse.json({ reset: true });
}
