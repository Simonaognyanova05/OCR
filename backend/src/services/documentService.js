const path = require("node:path");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { extractExpenseDocument } = require("./ocrService");
const { applyReviewRules } = require("./reviewService");
const {
  createDocument,
  findDocumentById,
  updateReviewedDocument
} = require("./documentRepository");

async function extractDocument(file) {
  if (!file) {
    throw new HttpError(400, "Липсва файл. Изпрати multipart/form-data с поле document.");
  }

  const extracted = applyReviewRules(await extractExpenseDocument(file.path));

  const payload = {
    original_name: file.originalname,
    stored_file: path.basename(file.path),
    model: config.model,
    status: extracted.needs_review ? "needs_review" : "ready_for_export",
    extracted_at: new Date().toISOString(),
    data: extracted
  };

  return createDocument(payload);
}

async function getDocument(documentId) {
  return findDocumentById(documentId);
}

async function saveReviewedDocument(documentId, data) {
  if (!data) {
    throw new HttpError(400, "Липсват прегледани данни за документа.");
  }

  const reviewedData = applyReviewRules(data);

  return updateReviewedDocument(documentId, reviewedData);
}

module.exports = {
  extractDocument,
  getDocument,
  saveReviewedDocument,
};
