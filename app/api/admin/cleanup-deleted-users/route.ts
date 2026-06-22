export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, cvAnalyses } from '@/lib/db/schema';
import { and, isNotNull, lt } from 'drizzle-orm';

/**
 * GDPR Cleanup Endpoint
 *
 * Hard-deletes user accounts and associated CV data that have been
 * soft-deleted for more than 30 days, in compliance with RGPD/CNIL
 * retention policies.
 *
 * Protected by CRON_SECRET header — only callable by trusted cron services.
 * Triggered daily by GitHub Actions (.github/workflows/cleanup.yml).
 */
export async function POST(req: Request) {
    const authHeader = req.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== cronSecret) {
        console.warn('[CLEANUP] Unauthorized cleanup attempt blocked');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(
        `[CLEANUP] Starting GDPR hard-delete for records soft-deleted before ` +
        thirtyDaysAgo.toISOString()
    );

    const results = {
        usersHardDeleted: 0,
        analysesHardDeleted: 0,
        errors: [] as string[],
    };

    // Delete cv_analyses first.
    // This avoids FK conflict if a cv_analyses row's parent user
    // was already hard-deleted in a previous cleanup run.
    // Cascade from cv_analyses → cv_templates → cv_generations (via analysisId FK).
    try {
        const deletedAnalyses = await db.delete(cvAnalyses)
            .where(
                and(
                    isNotNull(cvAnalyses.deletedAt),
                    lt(cvAnalyses.deletedAt, thirtyDaysAgo)
                )
            )
            .returning({ id: cvAnalyses.id });

        results.analysesHardDeleted = deletedAnalyses.length;
        console.log(`[CLEANUP] Hard-deleted ${deletedAnalyses.length} CV analyses`);
    } catch (err: any) {
        results.errors.push(`cv_analyses: ${err.message}`);
        console.error('[CLEANUP] Error deleting cv_analyses:', err.message);
    }

    // Delete users.
    // Cascade handles: user_template_unlocks, credit_transactions,
    // and any remaining cv_analyses/cv_generations/usage_logs still linked.
    // payments are NOT deleted (legal requirement — 10 years French accounting).
    try {
        const deletedUsers = await db.delete(users)
            .where(
                and(
                    isNotNull(users.deletedAt),
                    lt(users.deletedAt, thirtyDaysAgo)
                )
            )
            .returning({ id: users.id });

        results.usersHardDeleted = deletedUsers.length;
        console.log(`[CLEANUP] Hard-deleted ${deletedUsers.length} users`);
    } catch (err: any) {
        results.errors.push(`users: ${err.message}`);
        console.error('[CLEANUP] Error deleting users:', err.message);
    }

    const response = {
        success: results.errors.length === 0,
        ...results,
        cleanedBefore: thirtyDaysAgo.toISOString(),
        ranAt: new Date().toISOString(),
    };

    console.log('[CLEANUP] Completed:', response);
    return NextResponse.json(response);
}