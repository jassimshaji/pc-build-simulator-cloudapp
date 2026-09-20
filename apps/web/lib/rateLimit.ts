// Fixed-window, in-memory rate limiter for the endpoints that are cheap to
// hammer and expensive or sensitive to serve: sign-in (bcrypt + password
// guessing), registration (bcrypt + account spam) and upload-URL requests.
//
// State lives in the server process, so on a serverless host (Vercel) each
// instance keeps its own counters: this blunts a single client hammering one
// instance but is not a global limit. Swap `buckets` for a shared store (Redis /
// Upstash) when that matters — callers only see `rateLimit()`.

export interface RateLimitRule {
  limit: number; // requests allowed per window
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number; // 0 when allowed
}

export const RATE_LIMITS = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 }, // per IP
  login: { limit: 10, windowMs: 15 * 60 * 1000 }, // per email
  upload: { limit: 60, windowMs: 60 * 60 * 1000 }, // per user
} satisfies Record<string, RateLimitRule>;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

// Tests exercise many sign-ins and registrations from one address; they turn
// the limiter off unless they are testing it.
function isDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "true";
}

function evictExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  scope: keyof typeof RATE_LIMITS,
  identifier: string,
  now: number = Date.now(),
): RateLimitResult {
  if (isDisabled()) return { allowed: true, retryAfterSeconds: 0 };

  const rule = RATE_LIMITS[scope];
  const key = `${scope}:${identifier}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Bound memory: a flood of distinct identifiers can't grow the map forever.
    if (buckets.size >= MAX_BUCKETS) evictExpired(now);
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= rule.limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}

// The client address as seen through the proxy chain. Behind Vercel / a load
// balancer the first x-forwarded-for entry is the original client.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
