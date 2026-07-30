import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SidebarClient from './SidebarClient'; // Assuming SidebarClient exists and handles rendering
import { PlanType } from '@/lib/billing/get-user-plan'; // Import PlanType

export default async function Sidebar() {
  const { userId } = await auth();
  let credits = 0;
  let planName = 'Gratuit';

  if (userId) {
    try {
      const results = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
      const userRecord = results[0];

      if (userRecord) {
        const now = new Date();
        const expiryDate = userRecord.creditsExpiry ? new Date(userRecord.creditsExpiry) : null;
        credits = expiryDate && now > expiryDate ? 0 : (userRecord.credits || 0);
        if (userRecord.plan === 'monthly') planName = 'Pro';
        else if (userRecord.plan === 'one_time') planName = 'Starter';
      }
    } catch (e) {
      console.error('Sidebar fetch error', e);
    }
  }

  return <SidebarClient credits={credits} planName={planName} />;
}