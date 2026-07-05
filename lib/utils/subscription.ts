type CreditAwareUser = {
  credits: number | null;
  creditsExpiry: Date | string | null;
  plan: "free" | "one_time" | "monthly" | null;
  subscriptionStatus: "active" | "canceled" | "past_due" | null;
};

export function isCreditsExpired(user: CreditAwareUser | null | undefined): boolean {
  if (!user || !user.creditsExpiry) {
    return false;
  }

  const expiry = new Date(user.creditsExpiry);
  return Number.isFinite(expiry.getTime()) && new Date() > expiry;
}

export function getEffectiveCredits(user: CreditAwareUser | null | undefined): number {
  if (!user) {
    return 0;
  }
  if (isCreditsExpired(user)) {
    return 0;
  }
  return Math.max(0, user.credits || 0);
}

export function isUserExpired(user: CreditAwareUser | null | undefined): boolean {
  return isCreditsExpired(user);
}

export function isActivePaidUser(user: CreditAwareUser | null | undefined): boolean {
  if (!user) return false;
  return getEffectiveCredits(user) > 0 && !isCreditsExpired(user);
}
