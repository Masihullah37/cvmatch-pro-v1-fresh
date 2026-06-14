/**
 * Additive migration script for cookie consent columns.
 * Safe: uses IF NOT EXISTS idiom.
 * Execute with:  node scripts/migrate-consent-columns.mjs
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import ws from 'ws';
import { neonConfig, neon } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL);

const statements = [
    // Add cookie_consent column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS cookie_consent VARCHAR DEFAULT 'pending'`,

    // Add cookie_consent_at column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS cookie_consent_at TIMESTAMP`,
];

console.log('Starting migration for cookie consent columns...');

for (const stmt of statements) {
    try {
        await sql.query(stmt);
        const preview = stmt.trim().split('\n')[0].substring(0, 60);
        console.log(`✅  ${preview}...`);
    } catch (err) {
        console.error(`❌  Failed:\n${stmt}\n`, err.message);
        process.exit(1);
    }
}

console.log('\n🎉  All cookie consent columns applied successfully.');