const path = require("node:path");
const dotenv = require("dotenv");

const backendDir = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendDir, "..");

dotenv.config({ path: path.join(backendDir, ".env") });
dotenv.config({ path: path.join(projectRoot, ".env"), override: false });

const config = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || "gpt-5.5",
  port: Number(process.env.PORT || 3000),
  uploadDir: path.resolve(backendDir, process.env.UPLOAD_DIR || "uploads"),
  outputDir: path.resolve(backendDir, process.env.OUTPUT_DIR || "outputs"),
};

function assertConfig() {
  if (!config.apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy backend/.env.example to backend/.env and add your API key.");
  }
}

module.exports = {
  config,
  assertConfig,
};

