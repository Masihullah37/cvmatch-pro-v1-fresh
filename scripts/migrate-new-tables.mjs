/**
 * Additive migration script — run once to apply the new tables.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import ws from 'ws';
import { neonConfig, neon } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // 1. Enum credit_reason
  `DO $$ BEGIN
    CREATE TYPE credit_reason AS ENUM(
      'purchase', 'manual_download', 'ai_generation', 'admin_grant', 'refund'
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  // 2. credit_transactions
  `CREATE TABLE IF NOT EXISTS credit_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount       INTEGER NOT NULL,
    reason       credit_reason NOT NULL,
    reference_id VARCHAR,
    created_at   TIMESTAMP DEFAULT NOW()
  )`,

  // 3. stripe_events
  `CREATE TABLE IF NOT EXISTS stripe_events (
    id           VARCHAR PRIMARY KEY,
    type         VARCHAR NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW()
  )`,

  // 4. user_template_unlocks
  `CREATE TABLE IF NOT EXISTS user_template_unlocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES cv_templates(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW()
  )`,
];

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

console.log('\n🎉  All new tables applied successfully.');