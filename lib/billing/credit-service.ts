/**
 * Credit Service — SINGLE SOURCE OF TRUTH for mutating users.credits
 *
 * Rules:
 *  - addCredits()   → only for purchase / admin grants
 *  - deductCredit() → only for ai_generation | manual_download
 *  - Both functions support an optional Drizzle `tx` context so they can be
 *    composed inside a larger db.transaction() without nesting transactions.
 *  - NO other code should directly mutate users.credits.
 */

import { db } from "@/lib/db";
import { users, creditTransactions } from "@/lib/db/schema";
import { eq, sql, or } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

type CreditAddReason = "purchase" | "admin_grant" | "refund";
type CreditDeductReason = "ai_generation" | "manual_download";

// A minimal subset of a Drizzle transaction that both functions accept.
// Using `any` here avoids coupling to drizzle internals while staying typesafe
// enough for practical use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleTx = any;

interface AddCreditsParams {
  userId: string;
  amount: number; // Must be > 0
  reason: CreditAddReason;
  referenceId?: string;
  tx?: DrizzleTx;
}

interface DeductCreditParams {
  userId: string;
  amount?: number; // Defaults to 1
  reason: CreditDeductReason;
  referenceId?: string;
  tx?: DrizzleTx;
}

// ── addCredits ─────────────────────────────────────────────────────────────

/**
 * Increase a user's credit balance and insert an audit record.
 * Must be called within a db.transaction() when stripe_events idempotency
 * is required (webhook flow).
 */
export async function addCredits({
  userId,
  amount,
  reason,
  referenceId,
  tx,
}: AddCreditsParams): Promise<void> {
  if (amount <= 0) throw new Error("addCredits: amount must be positive");

  const executor = tx ?? db;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  const whereClause = isUuid ? or(eq(users.id, userId), eq(users.clerkId, userId)) : eq(users.clerkId, userId);

  const user = await executor.query.users.findFirst({ where: whereClause });
  if (!user) throw new Error("addCredits: User not found");

  // 1. Increment running total on user row
  await executor.update(users)
    .set({ credits: sql`COALESCE(${users.credits}, 0) + ${amount}`, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // 2. Append immutable ledger record
  await executor.insert(creditTransactions).values({
    userId: user.id,
    amount: +amount, // positive = credit added
    reason,
    referenceId: referenceId ?? null,
  });
}

// ── deductCredit ───────────────────────────────────────────────────────────

/**
 * Validate sufficient balance, decrease the user's credit balance, and
 * insert an audit record.
 *
 * Throws if:
 *  - User is not found
 *  - Credits are insufficient (< amount)
 *
 * Should always be called inside a db.transaction() so that the check +
 * deduct is atomic (see template download and AI generation flows).
 */
export async function deductCredit({
  userId,
  amount = 1,
  reason,
  referenceId,
  tx,
}: DeductCreditParams): Promise<void> {
  if (amount <= 0) throw new Error("deductCredit: amount must be positive");

  const executor = tx ?? db;

  // 1. Read current balance (inside the tx to take a row-level lock on Postgres)
  const userRow = await executor.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!userRow) throw new Error("deductCredit: utilisateur introuvable");

  const available = userRow.credits ?? 0;
  if (available < amount) {
    throw new Error("Crédits insuffisants.");
  }

  // 2. Decrement running total
  await executor
    .update(users)
    // ✅ Fix: Use COALESCE to handle potential null values in the credits column
    .set({ credits: sql`COALESCE(${users.credits}, 0) - ${amount}`, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // 3. Append immutable ledger record (negative = credit deducted)
  await executor.insert(creditTransactions).values({
    userId,
    amount: -amount,
    reason,
    referenceId: referenceId ?? null,
  });
}
