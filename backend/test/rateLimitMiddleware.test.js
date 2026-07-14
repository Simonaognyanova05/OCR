const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../src/middleware/rateLimitMiddleware");

function createMockResponse() {
  const headers = {};

  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    }
  };
}

function runLimiter(limiter, req) {
  const res = createMockResponse();
  let nextError;
  let nextCalled = false;

  limiter(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });

  return { nextCalled, nextError, res };
}

test("rate limiter returns 429 after configured limit", () => {
  const limiter = createRateLimiter({
    name: "test",
    windowMs: 60000,
    max: 2,
    keyGenerator: () => "same-key"
  });

  assert.equal(runLimiter(limiter, {}).nextError, undefined);
  assert.equal(runLimiter(limiter, {}).nextError, undefined);

  const limited = runLimiter(limiter, {});
  assert.equal(limited.nextCalled, true);
  assert.equal(limited.nextError.statusCode, 429);
  assert.equal(limited.res.headers["RateLimit-Remaining"], "0");
  assert.ok(Number(limited.res.headers["Retry-After"]) > 0);
});

test("rate limiter tracks separate keys independently", () => {
  const limiter = createRateLimiter({
    name: "test-scoped",
    windowMs: 60000,
    max: 1,
    keyGenerator: (req) => req.scope
  });

  assert.equal(runLimiter(limiter, { scope: "company-a:user-a" }).nextError, undefined);
  assert.equal(runLimiter(limiter, { scope: "company-b:user-a" }).nextError, undefined);
  assert.equal(runLimiter(limiter, { scope: "company-a:user-a" }).nextError.statusCode, 429);
});

test("rate limiter resets after the configured window", () => {
  const originalDateNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    const limiter = createRateLimiter({
      name: "test-reset",
      windowMs: 1000,
      max: 1,
      keyGenerator: () => "same-key"
    });

    assert.equal(runLimiter(limiter, {}).nextError, undefined);
    assert.equal(runLimiter(limiter, {}).nextError.statusCode, 429);

    now = 2001;
    assert.equal(runLimiter(limiter, {}).nextError, undefined);
  } finally {
    Date.now = originalDateNow;
  }
});
