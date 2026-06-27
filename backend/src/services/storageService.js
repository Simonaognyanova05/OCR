const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { config } = require("../config/env");

async function ensureStorage() {
  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.mkdir(config.outputDir, { recursive: true });
}

function createDocumentId() {
  return crypto.randomUUID();
}

function getResultPath(documentId) {
  return path.join(config.outputDir, `${documentId}.json`);
}

async function saveExtractionResult(documentId, payload) {
  const outputPath = getResultPath(documentId);
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

async function readExtractionResult(documentId) {
  const resultPath = getResultPath(documentId);
  const raw = await fs.readFile(resultPath, "utf8");
  return JSON.parse(raw);
}

async function updateExtractionResult(documentId, updater) {
  const current = await readExtractionResult(documentId);
  const updated = updater(current);
  await saveExtractionResult(documentId, updated);
  return updated;
}

module.exports = {
  createDocumentId,
  ensureStorage,
  readExtractionResult,
  saveExtractionResult,
  updateExtractionResult,
};

