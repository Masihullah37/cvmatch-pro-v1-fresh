import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Required for drizzle-kit push to connect to Neon via WebSocket
neonConfig.webSocketConstructor = ws;

dotenv.config({ path: '.env.local' });

console.log("DATABASE_URL:", process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.example' });
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
