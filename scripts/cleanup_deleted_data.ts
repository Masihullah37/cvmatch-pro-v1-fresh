// scripts/cleanup_deleted_data.ts

import { db } from '@/lib/db'; // Corrected path to your Drizzle DB instance
import { users, cvAnalyses } from '@/lib/db/schema'; // Corrected path to your Drizzle schemas
import { lt } from 'drizzle-orm';

/**
 * This script performs hard deletion of records that have been soft-deleted
 * (marked with a `deleted_at` timestamp) for more than 30 days.
 * It should be scheduled to run periodically (e.g., daily) via a cron job or serverless function.
 */
async function cleanupDeletedData() {
    console.log("Starting cleanup of soft-deleted data...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Calculate date 30 days ago

    // Hard delete users whose deleted_at timestamp is older than 30 days
    const deletedUsers = await db.delete(users)
        .where(lt(users.deletedAt, thirtyDaysAgo)) // Use users.deletedAt as per schema
        .returning({ id: users.id }); // Return deleted IDs for logging
    console.log(`Hard deleted ${deletedUsers.length} user(s) with IDs: ${deletedUsers.map(u => u.id).join(', ')}`);

    // Hard delete CV analyses whose deleted_at timestamp is older than 30 days
    // Note: Due to foreign key cascade deletes in your schema, related cv_generations and cv_templates will also be deleted.
    const deletedAnalyses = await db.delete(cvAnalyses)
        .where(lt(cvAnalyses.deletedAt, thirtyDaysAgo)) // Use cvAnalyses.deletedAt as per schema
        .returning({ id: cvAnalyses.id });
    console.log(`Hard deleted ${deletedAnalyses.length} CV analysis/analyses with IDs: ${deletedAnalyses.map(a => a.id).join(', ')}`);

    console.log("Cleanup of soft-deleted data completed.");
}

// Example of how to run this script (e.g., from a package.json script or directly)
// node -r ts-node/register scripts/cleanup_deleted_data.ts
cleanupDeletedData().catch(error => {
    console.error("Error during cleanup:", error);
    process.exit(1);
});