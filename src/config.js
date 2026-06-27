import "dotenv/config";

export const config = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || "gpt-5.5",
  port: Number(process.env.PORT || 3000),
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  outputDir: process.env.OUTPUT_DIR || "outputs",
};

export function assertConfig() {
  if (!config.apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your API key.");
  }
}
