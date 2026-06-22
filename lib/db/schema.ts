import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('plan', ['free', 'one_time', 'monthly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due']);
export const analysisStatusEnum = pgEnum('status', ['processing', 'completed', 'failed']);
export const paymentTypeEnum = pgEnum('payment_type', ['one_time', 'subscription']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const creditReasonEnum = pgEnum('credit_reason', ['purchase', 'manual_download', 'ai_generation', 'admin_grant', 'refund']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id').unique(),
  email: varchar('email').unique(),
  name: varchar('name'),
  plan: planEnum('plan').default('free'),
  credits: integer('credits').default(0),
  creditsExpiry: timestamp('credits_expiry'),
  stripeCustomerId: varchar('stripe_customer_id'),
  stripeSubscriptionId: varchar('stripe_subscription_id'),
  subscriptionStatus: subscriptionStatusEnum('subscription_status'),
  subscriptionEndsAt: timestamp('subscription_ends_at'),
  cvTemplatesUsedThisMonth: integer('cv_templates_used_this_month').default(0),
  aiRewritesUsed: integer('ai_rewrites_used').default(0),
  isAdmin: boolean('is_admin').default(false),
  isBlocked: boolean('is_blocked').default(false),
  cookieConsent: varchar('cookie_consent').default('pending'),
  cookieConsentAt: timestamp('cookie_consent_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'), // Added for soft delete
});

export const cvAnalyses = pgTable('cv_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Change to set null to prevent hard delete cascade
  guestSessionId: text('guest_session_id'),
  originalCvUrl: varchar('original_cv_url'),
  jobUrl: varchar('job_url'),
  userName: varchar('user_name'),
  jobTitle: varchar('job_title'),
  jobDescription: text('job_description'),
  atsScore: integer('ats_score'),
  scoreBreakdown: jsonb('score_breakdown'),
  flaws: jsonb('flaws'),
  suggestions: jsonb('suggestions'),
  keywordsMissing: jsonb('keywords_missing'),
  keywordsFound: jsonb('keywords_found'),
  optimizedData: jsonb('optimized_data'),
  status: analysisStatusEnum('status').default('processing'),
  detectedPlatform: varchar('detected_platform', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(), // Added for consistency and update operations
  deletedAt: timestamp('deleted_at'), // Added for soft delete
});

export const cvTemplates = pgTable('cv_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id').references(() => cvAnalyses.id, { onDelete: 'cascade' }), // Cascade deletion
  templateNumber: integer('template_number'),
  templateStyle: varchar('template_style'),
  templateData: jsonb('template_data'),
  pdfUrl: varchar('pdf_url'),
  isPaid: boolean('is_paid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  guestSessionId: text("guest_session_id"),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Keep payment history for accounting, but unlink user
  guestEmail: varchar('guest_email'),
  guestSessionId: varchar('guest_session_id'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id').unique(),
  stripeSessionId: varchar('stripe_session_id'),
  amount: integer('amount'),
  currency: varchar('currency').default('eur'),
  paymentType: paymentTypeEnum('payment_type'),
  templateId: uuid('template_id'),
  status: paymentStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const guestSessions = pgTable('guest_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token').unique(),
  ipAddress: varchar('ip_address'),
  userAgent: text('user_agent'),
  email: varchar('email'),
  createdAt: timestamp('created_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
});

export const cvGenerations = pgTable('cv_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  analysisId: uuid('analysis_id').references(() => cvAnalyses.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => cvTemplates.id, { onDelete: 'cascade' }),
  templateStyle: varchar('template_style'),
  templateData: jsonb('template_data'),
  pdfUrl: varchar('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Change to set null for soft-delete strategy
  scansCompletedCount: integer('scans_completed_count').notNull(),
  cycleEndedAt: timestamp('cycle_ended_at').defaultNow(),
  planAtThatTime: varchar('plan_at_that_time'),
  usageType: varchar('usage_type').default('ats_scan'), // 'ats_scan' or 'ai_rewrite'
});

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  activeOffer: jsonb('active_offer'), // { discount: 20, description: 'Offre Spéciale', expiresAt: '...' }
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── NEW: Template Ownership Ledger ──────────────────────────────────────────
// Tracks which templates a specific user has "purchased" (i.e. spent 1 credit on).
// First download costs 1 credit; subsequent downloads are free.
// Ownership removes the watermark only for that user + that template.
export const userTemplateUnlocks = pgTable('user_template_unlocks', { // Changed onDelete to 'set null'
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Make nullable
  templateId: uuid('template_id').notNull().references(() => cvTemplates.id, { onDelete: 'cascade' }),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
});

// ── NEW: Credit Ledger ───────────────────────────────────────────────────────
// Immutable, append-only log of every credit addition and deduction.
// This is the source of truth for auditing — users.credits is the running total.
export const creditTransactions = pgTable('credit_transactions', { // Changed onDelete to 'set null'
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Make nullable
  // Positive = credit added, negative = credit deducted
  amount: integer('amount').notNull(),
  reason: creditReasonEnum('reason').notNull(),
  referenceId: varchar('reference_id'), // templateId, analysisId, stripeEventId, etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// ── NEW: Stripe Event Idempotency Log ────────────────────────────────────────
// Records every processed Stripe event ID to prevent double-crediting on retries.
export const stripeEvents = pgTable('stripe_events', {
  eventId: varchar('id').primaryKey(), // Stripe event ID (evt_xxx)
  type: varchar('type').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
  skippedReason: varchar('skipped_reason', { length: 255 }), // Added for audit trail
});
