export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ credits: 0 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  return NextResponse.json({
    credits: dbUser?.credits || 0,
    expiry: dbUser?.creditsExpiry || null,
    plan: dbUser?.plan || "free",
    status: dbUser?.subscriptionStatus || null,
  });
}
