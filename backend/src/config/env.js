const path = require("node:path");
const dotenv = require("dotenv");

const backendDir = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendDir, "..");
const defaultAuthSecret = "dev-only-change-this-auth-secret";

dotenv.config({ path: path.join(backendDir, ".env") });
dotenv.config({ path: path.join(projectRoot, ".env"), override: false });

function readCsvEnv(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readPositiveIntEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStorageBackendEnv(value) {
  return value || "local";
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || "gpt-5.5",
  mongodbUri: process.env.MONGODB_URI,
  authSecret: process.env.AUTH_SECRET || defaultAuthSecret,
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY,
  authTokenTtlSeconds: readPositiveIntEnv("AUTH_TOKEN_TTL_SECONDS", 12 * 60 * 60),
  port: Number(process.env.PORT || 3000),
  corsOrigins: readCsvEnv(process.env.CORS_ORIGINS),
  adminEmails: readCsvEnv(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),
  uploadDir: path.resolve(backendDir, process.env.UPLOAD_DIR || "uploads"),
  outputDir: path.resolve(backendDir, process.env.OUTPUT_DIR || "outputs"),
  pdfFontRegularPath: process.env.PDF_FONT_REGULAR_PATH,
  pdfFontBoldPath: process.env.PDF_FONT_BOLD_PATH,
  pythonCommand: process.env.PYTHON_COMMAND || "py",
  pdfRenderDpi: readPositiveIntEnv("PDF_RENDER_DPI", 200),
  pdfMaxPages: readPositiveIntEnv("PDF_MAX_PAGES", 5),
  pdfConversionTimeoutMs: readPositiveIntEnv("PDF_CONVERSION_TIMEOUT_MS", 30000),
  ocrRequestTimeoutMs: readPositiveIntEnv("OCR_REQUEST_TIMEOUT_MS", 60000),
  ocrMaxConcurrentJobs: readPositiveIntEnv("OCR_MAX_CONCURRENT_JOBS", 2),
  authRateLimitWindowMs: readPositiveIntEnv("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  authRateLimitMax: readPositiveIntEnv("AUTH_RATE_LIMIT_MAX", 20),
  uploadRateLimitWindowMs: readPositiveIntEnv("UPLOAD_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
  uploadRateLimitMax: readPositiveIntEnv("UPLOAD_RATE_LIMIT_MAX", 30),
  extractRateLimitWindowMs: readPositiveIntEnv("EXTRACT_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
  extractRateLimitMax: readPositiveIntEnv("EXTRACT_RATE_LIMIT_MAX", 10),
  exportRateLimitWindowMs: readPositiveIntEnv("EXPORT_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
  exportRateLimitMax: readPositiveIntEnv("EXPORT_RATE_LIMIT_MAX", 60),
  malwareScanCommand: process.env.MALWARE_SCAN_COMMAND,
  malwareScanArgs: readCsvEnv(process.env.MALWARE_SCAN_ARGS),
  malwareScanTimeoutMs: readPositiveIntEnv("MALWARE_SCAN_TIMEOUT_MS", 30000),
  storageBackend: readStorageBackendEnv(process.env.STORAGE_BACKEND),
  localUploadRetentionDays: readPositiveIntEnv("LOCAL_UPLOAD_RETENTION_DAYS", 30),
  localOutputRetentionDays: readPositiveIntEnv("LOCAL_OUTPUT_RETENTION_DAYS", 7),
  localStorageCleanupIntervalMs: readPositiveIntEnv("LOCAL_STORAGE_CLEANUP_INTERVAL_MS", 6 * 60 * 60 * 1000),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: readPositiveIntEnv("SMTP_PORT", 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
};

function assertConfig() {
  if (!config.apiKey) {
    throw new Error("Липсва OPENAI_API_KEY. Добави API ключ в backend/.env или в Environment Variables.");
  }
}

function assertDatabaseConfig() {
  if (!config.mongodbUri) {
    throw new Error("Липсва MONGODB_URI. Добави MongoDB connection string в backend/.env или в Environment Variables.");
  }
}

function assertAuthConfig(authConfig = config) {
  const isProduction = authConfig.nodeEnv === "production";
  const secret = String(authConfig.authSecret || "");

  if (!isProduction) {
    return;
  }

  if (!secret || secret === defaultAuthSecret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a strong non-default value in production.");
  }
}

<<<<<<< HEAD
function assertDataEncryptionConfig(runtimeConfig = config) {
  const isProduction = runtimeConfig.nodeEnv === "production";
  const key = String(runtimeConfig.dataEncryptionKey || "");

  if (!isProduction) {
    return;
  }

  if (!key || key.length < 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be set to a strong value in production.");
  }
}
function assertCorsConfig(runtimeConfig = config) {
  const isProduction = runtimeConfig.nodeEnv === "production";
=======
function assertCorsConfig(corsConfig = config) {
  const isProduction = corsConfig.nodeEnv === "production";
>>>>>>> 91b860a57dad890628526138ccd66d26db39a44b

  if (!isProduction) {
    return;
  }

  if (!Array.isArray(corsConfig.corsOrigins) || corsConfig.corsOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must include at least one allowed origin in production.");
  }
}

<<<<<<< HEAD
function assertMalwareScanConfig(runtimeConfig = config) {
  const isProduction = runtimeConfig.nodeEnv === "production";

  if (!isProduction) {
    return;
  }

  if (!runtimeConfig.malwareScanCommand) {
    throw new Error("MALWARE_SCAN_COMMAND must be configured in production.");
  }
}

function assertStorageConfig(runtimeConfig = config) {
  const isProduction = runtimeConfig.nodeEnv === "production";

  if (!isProduction) {
    return;
  }

  if (runtimeConfig.storageBackend !== "persistent-local") {
    throw new Error("STORAGE_BACKEND must be set to persistent-local with a mounted private disk in production.");
  }
}

function assertRuntimeConfig(runtimeConfig = config) {
  assertAuthConfig(runtimeConfig);
  assertDataEncryptionConfig(runtimeConfig);
  assertCorsConfig(runtimeConfig);
  assertMalwareScanConfig(runtimeConfig);
  assertStorageConfig(runtimeConfig);
=======
function assertRuntimeConfig() {
  assertAuthConfig();
  assertCorsConfig();
>>>>>>> 91b860a57dad890628526138ccd66d26db39a44b
}

module.exports = {
  assertAuthConfig,
  assertCorsConfig,
<<<<<<< HEAD
  assertDataEncryptionConfig,
  assertMalwareScanConfig,
  assertStorageConfig,
=======
>>>>>>> 91b860a57dad890628526138ccd66d26db39a44b
  config,
  assertConfig,
  assertDatabaseConfig,
  assertRuntimeConfig,
};
