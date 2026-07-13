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

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || "gpt-5.5",
  mongodbUri: process.env.MONGODB_URI,
  authSecret: process.env.AUTH_SECRET || defaultAuthSecret,
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

function assertRuntimeConfig() {
  assertAuthConfig();
}

module.exports = {
  assertAuthConfig,
  config,
  assertConfig,
  assertDatabaseConfig,
  assertRuntimeConfig,
};
