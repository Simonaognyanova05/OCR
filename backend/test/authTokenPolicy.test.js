const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { signToken, verifyToken } = require("../src/utils/auth");
const {
  assertAuthConfig,
  assertCorsConfig,
  assertMalwareScanConfig,
  assertStorageConfig,
  assertRuntimeConfig,
  config
} = require("../src/config/env");

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

test("production rejects empty CORS origins", () => {
  assert.throws(
    () => assertCorsConfig({ nodeEnv: "production", corsOrigins: [] }),
    /CORS_ORIGINS/
  );
  assert.throws(
    () => assertRuntimeConfig({
      nodeEnv: "production",
      authSecret: "a-strong-production-secret-at-least-32-chars",
      corsOrigins: []
    }),
    /CORS_ORIGINS/
  );
});

test("production accepts configured CORS origins and development can be empty", () => {
  assert.doesNotThrow(() => assertCorsConfig({
    nodeEnv: "production",
    corsOrigins: ["https://app.example.com"]
  }));
  assert.doesNotThrow(() => assertCorsConfig({
    nodeEnv: "development",
    corsOrigins: []
  }));
  assert.doesNotThrow(() => assertRuntimeConfig({
    nodeEnv: "production",
    authSecret: "a-strong-production-secret-at-least-32-chars",
    corsOrigins: ["https://app.example.com"],
    malwareScanCommand: "clamscan",
    storageBackend: "persistent-local"
  }));
});

test("production requires malware scanning command and development can skip it", () => {
  assert.throws(
    () => assertMalwareScanConfig({ nodeEnv: "production", malwareScanCommand: "" }),
    /MALWARE_SCAN_COMMAND/
  );
  assert.throws(
    () => assertRuntimeConfig({
      nodeEnv: "production",
      authSecret: "a-strong-production-secret-at-least-32-chars",
      corsOrigins: ["https://app.example.com"],
      malwareScanCommand: ""
    }),
    /MALWARE_SCAN_COMMAND/
  );
  assert.doesNotThrow(() => assertMalwareScanConfig({
    nodeEnv: "development",
    malwareScanCommand: ""
  }));
});

test("production requires explicit persistent local storage backend", () => {
  assert.throws(
    () => assertStorageConfig({ nodeEnv: "production", storageBackend: "local" }),
    /STORAGE_BACKEND/
  );
  assert.throws(
    () => assertRuntimeConfig({
      nodeEnv: "production",
      authSecret: "a-strong-production-secret-at-least-32-chars",
      corsOrigins: ["https://app.example.com"],
      malwareScanCommand: "clamscan",
      storageBackend: "local"
    }),
    /STORAGE_BACKEND/
  );
  assert.doesNotThrow(() => assertStorageConfig({
    nodeEnv: "production",
    storageBackend: "persistent-local"
  }));
  assert.doesNotThrow(() => assertStorageConfig({
    nodeEnv: "development",
    storageBackend: "local"
  }));
});
