const path = require("node:path");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { extractExpenseDocument } = require("./ocrService");
const { applyReviewRules } = require("./reviewService");
const {
  createDocumentId,
  readExtractionResult,
  saveExtractionResult,
  updateExtractionResult
} = require("./storageService");

async function extractDocument(file) {
  if (!file) {
    throw new HttpError(400, "Missing file. Send multipart/form-data with a document field.");
  }

  const documentId = createDocumentId();
  const extracted = applyReviewRules(await extractExpenseDocument(file.path));

  const payload = {
    id: documentId,
    original_name: file.originalname,
    stored_file: path.basename(file.path),
    model: config.model,
    status: extracted.needs_review ? "needs_review" : "ready_for_export",
    extracted_at: new Date().toISOString(),
    data: extracted
  };

  await saveExtractionResult(documentId, payload);
  return payload;
}

async function getDocument(documentId) {
  return readExtractionResult(documentId);
}

async function saveReviewedDocument(documentId, data) {
  if (!data) {
    throw new HttpError(400, "Missing reviewed document data.");
  }

  const reviewedData = applyReviewRules(data);

  return updateExtractionResult(documentId, (current) => ({
    ...current,
    status: reviewedData.needs_review ? "needs_review" : "reviewed",
    reviewed_at: new Date().toISOString(),
    data: reviewedData
  }));
}

module.exports = {
  extractDocument,
  getDocument,
  saveReviewedDocument,
};

