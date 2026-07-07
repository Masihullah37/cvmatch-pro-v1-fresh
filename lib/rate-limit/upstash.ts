import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";


// Check if credentials exist, otherwise fall back to dummy strings to prevent CI/CD build crashes
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || "https://dummy-redis-url.upstash.io";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || "dummy_token";

// export const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL || "",
//   token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
// });

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// General API protection — 100 requests per minute
export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "cvboost_general",
});

// ATS scan — guest: 5/hour per IP, paid: 20/hour per user
export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "cvboost_strict",
});

// Paid user limit — more generous
export const paidUserRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "cvboost_paid",
});

// PDF download limit — prevents PDF generation abuse
export const pdfRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "cvboost_pdf",
});

// Daily hard limit — blocks sustained attacks
export const dailyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "24 h"),
  analytics: true,
  prefix: "cvboost_daily",
});

// ATS scan — free authenticated: 3/24h
export const atsDailyFreeLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, "24 h"),
  analytics: true,
  prefix: "ats_daily_free",
});

// ATS scan — anonymous: 3/24h
export const atsDailyAnonLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, "24 h"),
  analytics: true,
  prefix: "ats_daily_anon",
});

// ATS scan — paid: 10/24h
export const atsDailyPaidLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "24 h"),
  analytics: true,
  prefix: "ats_daily_paid",
});

// PDF download — hourly per user: 20/1h
export const pdfHourlyUserLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "pdf_hourly",
});

// PDF download — daily per user: 40/24h
export const pdfDailyUserLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "24 h"),
  analytics: true,
  prefix: "pdf_daily",
});

// PDF download — hourly per IP: 3/1h
export const pdfIpLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "pdf_ip",
});
