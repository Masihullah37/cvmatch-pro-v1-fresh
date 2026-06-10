import { users, planEnum } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";

// Define the PlanType based on the Drizzle enum values
export type PlanType = typeof planEnum.enumValues[number];

type User = InferSelectModel<typeof users>;

export function getUserPlan(user: User | null): PlanType {
  if (!user || !user.plan) {
    return 'free';
  }
  // Ensure the returned value is one of the enum values.
  // This cast is safe because planEnum.enumValues is the source of truth for PlanType.
  if (planEnum.enumValues.includes(user.plan as PlanType)) {
    return user.plan as PlanType;
  }
  return 'free'; // Fallback to 'free' if plan is somehow invalid or not recognized
}

export function getUserPlanStatus(user: User | null) {
  // This function determines the user's current plan and its validity.
  const plan = getUserPlan(user);
  const now = new Date();
  const isValid = user ? (
    (plan === 'monthly' && user.subscriptionStatus === 'active') ||
    (plan === 'one_time' && (!user.subscriptionEndsAt || new Date(user.subscriptionEndsAt) > now))
  ) : false;

  return { plan, isValid };
}