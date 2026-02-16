import { NextResponse } from "next/server";

const globalState = globalThis;
const RATE_LIMIT_STORE_KEY = "__tsm_rate_limit_store__";
const rateLimitStore = globalState[RATE_LIMIT_STORE_KEY] || new Map();
if (!globalState[RATE_LIMIT_STORE_KEY]) {
  globalState[RATE_LIMIT_STORE_KEY] = rateLimitStore;
}

const getClientIp = (request) => {
  const forwarded = request?.headers?.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    request?.headers?.get("x-real-ip") ||
    request?.headers?.get("cf-connecting-ip") ||
    "unknown"
  );
};

const checkWindow = ({ key, limit, windowMs }) => {
  const now = Date.now();
  const existing = rateLimitStore.get(key) || [];
  const recent = existing.filter((ts) => now - ts < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    rateLimitStore.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
};

export const enforceRateLimit = ({
  request,
  key,
  limit,
  windowMs,
  identifier,
}) => {
  const subject = String(identifier || getClientIp(request) || "unknown");
  const rateKey = `${key}:${subject}`;
  const result = checkWindow({ key: rateKey, limit, windowMs });

  if (result.allowed) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return NextResponse.json(
    {
      success: false,
      message: `Too many requests. Please try again in ${retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
};

