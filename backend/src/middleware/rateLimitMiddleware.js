const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

function getIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function getAuthScope(req) {
  const userId = req.auth?.user?._id?.toString?.() || "anonymous";
  const companyId = req.auth?.company?._id?.toString?.() || "no-company";
  return `${companyId}:${userId}`;
}

function createRateLimiter({ name, windowMs, max, keyGenerator }) {
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const rawKey = keyGenerator(req);
    const key = `${name}:${rawKey}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(Math.max(max - 1, 0)));
      res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
      next(new HttpError(429, "Твърде много заявки. Опитай отново след малко."));
      return;
    }

    current.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(max - current.count, 0)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
    next();
  };
}

const authRateLimit = createRateLimiter({
  name: "auth",
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  keyGenerator: (req) => getIp(req)
});

const uploadRateLimit = createRateLimiter({
  name: "upload",
  windowMs: config.uploadRateLimitWindowMs,
  max: config.uploadRateLimitMax,
  keyGenerator: (req) => getAuthScope(req)
});

const extractRateLimit = createRateLimiter({
  name: "extract",
  windowMs: config.extractRateLimitWindowMs,
  max: config.extractRateLimitMax,
  keyGenerator: (req) => getAuthScope(req)
});

const exportRateLimit = createRateLimiter({
  name: "export",
  windowMs: config.exportRateLimitWindowMs,
  max: config.exportRateLimitMax,
  keyGenerator: (req) => getAuthScope(req)
});

module.exports = {
  authRateLimit,
  createRateLimiter,
  exportRateLimit,
  extractRateLimit,
  uploadRateLimit
};
