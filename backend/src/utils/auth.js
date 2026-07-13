const crypto = require("node:crypto");
const { config } = require("../config/env");

const keyLength = 64;
const iterations = 120000;
const digest = "sha512";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function decodeBase64UrlJson(value) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("base64url");

  return `pbkdf2:${iterations}:${digest}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [type, storedIterations, storedDigest, salt, hash] = String(storedHash).split(":");

  if (type !== "pbkdf2" || !storedIterations || !storedDigest || !salt || !hash) {
    return false;
  }

  const calculated = crypto
    .pbkdf2Sync(password, salt, Number(storedIterations), keyLength, storedDigest)
    .toString("base64url");

  const calculatedBuffer = Buffer.from(calculated);
  const hashBuffer = Buffer.from(hash);

  if (calculatedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedBuffer, hashBuffer);
}

function signToken(payload, options = {}) {
  const issuedAt = options.issuedAt || Math.floor(Date.now() / 1000);
  const expiresInSeconds = options.expiresInSeconds || config.authTokenTtlSeconds;
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson({
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds
  });
  const signature = crypto
    .createHmac("sha256", config.authSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifyToken(token, options = {}) {
  const [header, body, signature] = String(token).split(".");

  if (!header || !body || !signature) {
    return null;
  }

  const decodedHeader = decodeBase64UrlJson(header);
  if (!decodedHeader || decodedHeader.alg !== "HS256" || decodedHeader.typ !== "JWT") {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.authSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  const payload = decodeBase64UrlJson(body);
  const now = options.now || Math.floor(Date.now() / 1000);

  if (!payload || !Number.isFinite(payload.exp) || payload.exp <= now) {
    return null;
  }

  return payload;
}

module.exports = {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken
};
