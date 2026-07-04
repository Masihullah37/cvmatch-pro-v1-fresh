import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function syncUserWithClerk() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    // 1. Initial read: check if user exists and is active (not soft-deleted)
    let dbUser = await db.query.users.findFirst({
      where: and(eq(users.clerkId, clerkUser.id), isNull(users.deletedAt)),
    });

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : email;

    const cookieStore = await cookies();
    const consent = cookieStore.get('cookie_consent')?.value || 'pending';

    if (!dbUser) {
      try {
        // 2. Attempt Insertion
        const [newUser] = await db.insert(users).values({
          clerkId: clerkUser.id,
          email,
          name,
          plan: 'free',
          credits: 1, // Fix: Ensure they get 1 free credit if created via sync fallback loop
          cookieConsent: consent,
          cookieConsentAt: (consent === 'accepted' || consent === 'declined') ? new Date() : null,
        }).returning();

        return newUser;
      } catch (insertError: any) {
        // Handle PostgreSql unique validation crash code 23505 (unique_violation)
        if (insertError.code === '23505' || insertError.message?.includes('unique constraint')) {
          console.log("Race condition intercepted gracefully: Webhook won the insert battle. Reading record...");

          // Re-fetch the entry that was committed by the competing thread
          dbUser = await db.query.users.findFirst({
            where: and(eq(users.clerkId, clerkUser.id), isNull(users.deletedAt)),
          });

          if (!dbUser) return null;
        } else {
          throw insertError; // Pass along unexpected structural failures
        }
      }
    }

    // 3. User already exists: sync properties if necessary
    const needsEmailUpdate = !dbUser.email && email;
    const needsNameUpdate = !dbUser.name && name;
    const needsConsentUpdate = dbUser.cookieConsent === 'pending' && consent !== 'pending';

    if (needsEmailUpdate || needsNameUpdate || needsConsentUpdate) {
      const [updatedUser] = await db.update(users).set({
        ...(needsEmailUpdate ? { email } : {}),
        ...(needsNameUpdate ? { name } : {}),
        ...(needsConsentUpdate ? { cookieConsent: consent, cookieConsentAt: new Date() } : {}),
        updatedAt: new Date(),
      }).where(eq(users.clerkId, clerkUser.id)).returning();

      return updatedUser;
    }

    return dbUser;
  } catch (error) {
    console.error("Clerk sync error:", error);
    return null;
  }
}