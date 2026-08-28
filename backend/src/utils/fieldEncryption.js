const crypto = require("node:crypto");
const { config } = require("../config/env");

const encryptionMarker = "__encrypted";
const algorithm = "aes-256-gcm";
const ivLength = 12;

function getEncryptionSecret() {
  return config.dataEncryptionKey || config.authSecret;
}

function getKey() {
  return crypto.createHash("sha256").update(String(getEncryptionSecret())).digest();
}

function isEncryptedValue(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value[encryptionMarker] === true &&
      value.alg === algorithm &&
      typeof value.iv === "string" &&
      typeof value.tag === "string" &&
      typeof value.value === "string"
  );
}

function encryptString(value) {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  if (isEncryptedValue(value)) {
    return value;
  }

  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);

  return {
    [encryptionMarker]: true,
    alg: algorithm,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    value: encrypted.toString("base64url")
  };
}

function decryptString(value) {
  if (!isEncryptedValue(value)) {
    return value;
  }

  try {
    const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(value.iv, "base64url"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(value.value, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch (_error) {
    throw new Error("Failed to decrypt protected field.");
  }
}

function encryptFields(data, fieldNames) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const encrypted = { ...data };
  for (const fieldName of fieldNames) {
    if (Object.hasOwn(encrypted, fieldName)) {
      encrypted[fieldName] = encryptString(encrypted[fieldName]);
    }
  }

  return encrypted;
}

function decryptFields(data, fieldNames) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const decrypted = { ...data };
  for (const fieldName of fieldNames) {
    if (Object.hasOwn(decrypted, fieldName)) {
      decrypted[fieldName] = decryptString(decrypted[fieldName]);
    }
  }

  return decrypted;
}

module.exports = {
  decryptFields,
  decryptString,
  encryptFields,
  encryptString,
  isEncryptedValue
};
