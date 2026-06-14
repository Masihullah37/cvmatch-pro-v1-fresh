import { users, planEnum } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";
import { isUserExpired } from "@/lib/utils/subscription";

// Define the PlanType based on the Drizzle enum values
export type PlanType = typeof planEnum.enumValues[number] | 'anonymous' | 'trial' | 'pro';

type User = InferSelectModel<typeof users>;

export function getUserPlan(user: User | null | undefined): PlanType {
  if (!user || !user.plan) {
    return 'free';
  }

  const expired = isUserExpired(user);

  switch (user.plan) {
    case 'free':
      // A 'free' user might be considered 'trial' if they have non-expired credits
      // (e.g., from a signup bonus or admin grant, not a 'one_time' purchase).
      // This logic assumes 'trial' is represented by free plan + active credits.
      if (user.credits && user.credits > 0 && !expired) {
        return 'trial';
      }
      return 'free';
    case 'one_time':
      // If a one-time purchase plan is expired, they revert to 'free'.
      if (expired) {
        return 'free';
      }
      return 'one_time';
    case 'monthly':
      // A 'monthly' user with an active subscription is considered 'pro'.
      // If the subscription is not active or expired, they revert to 'free'.
      if (user.subscriptionStatus === 'active' && !expired) {
        return 'pro';
      }
      return 'free';
    default:
      // Fallback for any unexpected plan values or if plan is null
      return 'free';
  }
}

export function getUserPlanStatus(user: User | null | undefined) {
  // This function determines the user's current plan and its validity.
  const plan = getUserPlan(user);
  const now = new Date();
  const isValid = user ? (
    (plan === 'pro' && user.subscriptionStatus === 'active') || // 'pro' implies active monthly
    (plan === 'monthly' && user.subscriptionStatus === 'active') || // Direct monthly check
    (plan === 'one_time' && (!user.creditsExpiry || new Date(user.creditsExpiry) > now)) || // One-time valid if credits not expired
    (plan === 'trial' && user.credits && user.credits > 0 && !isUserExpired(user)) // Trial valid if credits exist and not expired
  ) : false;

  return { plan, isValid };
}