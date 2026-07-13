const path = require("node:path");
const dotenv = require("dotenv");

const backendDir = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendDir, "..");

dotenv.config({ path: path.join(backendDir, ".env") });
dotenv.config({ path: path.join(projectRoot, ".env"), override: false });

function readCsvEnv(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || "gpt-5.5",
  mongodbUri: process.env.MONGODB_URI,
  authSecret: process.env.AUTH_SECRET || "dev-only-change-this-auth-secret",
  port: Number(process.env.PORT || 3000),
  corsOrigins: readCsvEnv(process.env.CORS_ORIGINS),
  adminEmails: readCsvEnv(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),
  uploadDir: path.resolve(backendDir, process.env.UPLOAD_DIR || "uploads"),
  outputDir: path.resolve(backendDir, process.env.OUTPUT_DIR || "outputs"),
  pdfFontRegularPath: process.env.PDF_FONT_REGULAR_PATH,
  pdfFontBoldPath: process.env.PDF_FONT_BOLD_PATH,
  pythonCommand: process.env.PYTHON_COMMAND || "py",
  pdfRenderDpi: Number(process.env.PDF_RENDER_DPI || 200),
  pdfMaxPages: Number(process.env.PDF_MAX_PAGES || 5),
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

module.exports = {
  config,
  assertConfig,
  assertDatabaseConfig,
};
