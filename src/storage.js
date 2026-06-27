import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

export async function ensureStorage() {
  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.mkdir(config.outputDir, { recursive: true });
}

export function createDocumentId() {
  return crypto.randomUUID();
}

export function getResultPath(documentId) {
  return path.join(config.outputDir, `${documentId}.json`);
}

export async function saveExtractionResult(documentId, payload) {
  const outputPath = getResultPath(documentId);
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

export async function readExtractionResult(documentId) {
  const resultPath = getResultPath(documentId);
  const raw = await fs.readFile(resultPath, "utf8");
  return JSON.parse(raw);
}

