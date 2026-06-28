const path = require("node:path");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { extractExpenseDocument } = require("./ocrService");
const { applyReviewRules } = require("./reviewService");
const {
  countCompanyDocumentsThisMonth,
  createDocument,
  findDocumentById,
  updateReviewedDocument
} = require("./documentRepository");

async function assertDocumentLimit(authContext) {
  const usedDocuments = await countCompanyDocumentsThisMonth(authContext.company._id);
  const documentLimit = authContext.company.documentLimit;

  if (usedDocuments >= documentLimit) {
    throw new HttpError(403, `Достигнат е лимитът от ${documentLimit} документа за текущия месец.`);
  }
}

async function extractDocument(file, authContext) {
  if (!file) {
    throw new HttpError(400, "Липсва файл. Изпрати multipart/form-data с поле document.");
  }

  await assertDocumentLimit(authContext);

  const extracted = applyReviewRules(await extractExpenseDocument(file.path));

  const payload = {
    company_id: authContext.company._id,
    uploaded_by: authContext.user._id,
    original_name: file.originalname,
    stored_file: path.basename(file.path),
    model: config.model,
    status: extracted.needs_review ? "needs_review" : "ready_for_export",
    extracted_at: new Date().toISOString(),
    data: extracted
  };

  return createDocument(payload);
}

async function getDocument(documentId, authContext) {
  return findDocumentById(documentId, authContext.company._id);
}

async function saveReviewedDocument(documentId, data, authContext) {
  if (!data) {
    throw new HttpError(400, "Липсват прегледани данни за документа.");
  }

  const reviewedData = applyReviewRules(data);

  return updateReviewedDocument(documentId, reviewedData, authContext.company._id);
}

module.exports = {
  extractDocument,
  getDocument,
  saveReviewedDocument
};
