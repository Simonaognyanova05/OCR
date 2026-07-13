const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { signToken, verifyToken } = require("../src/utils/auth");
const { assertAuthConfig, config } = require("../src/config/env");

function signLegacyToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", config.authSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

test("signed tokens include and enforce expiration", () => {
  const token = signToken({ sub: "user-1" }, { issuedAt: 1000, expiresInSeconds: 60 });

  assert.equal(verifyToken(token, { now: 1059 }).sub, "user-1");
  assert.equal(verifyToken(token, { now: 1060 }), null);
});

test("tokens without expiration are rejected", () => {
  const token = signLegacyToken({ sub: "user-1", iat: 1000 });

  assert.equal(verifyToken(token, { now: 1001 }), null);
});

test("production rejects missing, default, or weak auth secrets", () => {
  assert.throws(
    () => assertAuthConfig({ nodeEnv: "production", authSecret: "" }),
    /AUTH_SECRET/
  );
  assert.throws(
    () => assertAuthConfig({ nodeEnv: "production", authSecret: "dev-only-change-this-auth-secret" }),
    /AUTH_SECRET/
  );
  assert.throws(
    () => assertAuthConfig({ nodeEnv: "production", authSecret: "short-secret" }),
    /AUTH_SECRET/
  );
  assert.doesNotThrow(() => assertAuthConfig({
    nodeEnv: "production",
    authSecret: "a-strong-production-secret-at-least-32-chars"
  }));
  assert.doesNotThrow(() => assertAuthConfig({
    nodeEnv: "development",
    authSecret: "dev-only-change-this-auth-secret"
  }));
});
