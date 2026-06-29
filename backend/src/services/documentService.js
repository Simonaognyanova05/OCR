const path = require("node:path");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { ocrMimeTypes } = require("../middleware/uploadMiddleware");
const { convertPdfToImages } = require("./pdfConversionService");
const { extractExpenseDocumentFromImages } = require("./ocrService");
const { applyReviewRules } = require("./reviewService");
const {
  approveReviewedDocument,
  countCompanyDocumentsThisMonth,
  createUploadedDocument,
  findDocumentById,
  getCompanyDashboardDocuments,
  listCompanyDocuments,
  updateDocumentStatus,
  updateExtractedDocument,
  updateReviewedDocument
} = require("./documentRepository");

function buildFilePayload(file, authContext) {
  const storedFile = path.basename(file.path);

  return {
    company_id: authContext.company._id,
    uploaded_by: authContext.user._id,
    original_file_name: file.originalname,
    stored_file: storedFile,
    file_url: `/uploads/${storedFile}`,
    mime_type: file.mimetype
  };
}

async function assertDocumentLimit(authContext) {
  const usedDocuments = await countCompanyDocumentsThisMonth(authContext.company._id);
  const documentLimit = authContext.company.documentLimit;

  if (usedDocuments >= documentLimit) {
    throw new HttpError(403, `Достигнат е лимитът от ${documentLimit} документа за текущия месец.`);
  }
}

async function uploadDocumentOnly(file, authContext) {
  if (!file) {
    throw new HttpError(400, "Липсва файл. Изпрати multipart/form-data с поле document.");
  }

  await assertDocumentLimit(authContext);
  return createUploadedDocument(buildFilePayload(file, authContext));
}

async function getOcrImagePaths(file) {
  if (file.mimetype === "application/pdf") {
    return convertPdfToImages(file.path);
  }

  if (ocrMimeTypes.has(file.mimetype)) {
    return [file.path];
  }

  throw new HttpError(400, "OCR обработката поддържа PDF, JPG и PNG.");
}

async function extractDocument(file, authContext) {
  if (!file) {
    throw new HttpError(400, "Липсва файл. Изпрати multipart/form-data с поле document.");
  }

  await assertDocumentLimit(authContext);
  const uploadedDocument = await createUploadedDocument(buildFilePayload(file, authContext));

  try {
    await updateDocumentStatus(uploadedDocument.id, authContext.company._id, "processing");
    const imagePaths = await getOcrImagePaths(file);
    const extracted = applyReviewRules(await extractExpenseDocumentFromImages(imagePaths));

    return updateExtractedDocument(uploadedDocument.id, authContext.company._id, {
      model: config.model,
      extracted_at: new Date().toISOString(),
      data: extracted
    });
  } catch (error) {
    await updateDocumentStatus(uploadedDocument.id, authContext.company._id, "failed").catch(() => {});
    throw error;
  }
}

async function getDocument(documentId, authContext) {
  return findDocumentById(documentId, authContext.company._id);
}

async function listDocuments(filters, authContext) {
  return listCompanyDocuments(authContext.company._id, filters || {});
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    month: start.toISOString().slice(0, 7),
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10)
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function addAmountToMap(map, key, amount) {
  const safeKey = key || "Без категория";
  map.set(safeKey, (map.get(safeKey) || 0) + amount);
}

function toSortedBreakdown(map, limit) {
  return [...map.entries()]
    .map(([name, totalAmount]) => ({ name, totalAmount }))
    .sort((first, second) => second.totalAmount - first.totalAmount)
    .slice(0, limit);
}

async function getDashboard(authContext) {
  const monthRange = getCurrentMonthRange();
  const documents = await getCompanyDashboardDocuments(authContext.company._id, monthRange);
  const suppliers = new Map();
  const categories = new Map();
  const currencies = new Set();
  let totalExpenses = 0;
  let totalVat = 0;

  for (const document of documents) {
    const data = document.data || {};
    const amount = toNumber(data.totalAmount);
    const vat = toNumber(data.vatAmount);

    totalExpenses += amount;
    totalVat += vat;
    if (data.currency) currencies.add(data.currency);
    addAmountToMap(suppliers, data.supplierName || "Без доставчик", amount);
    addAmountToMap(categories, data.category || "Без категория", amount);
  }

  return {
    month: monthRange.month,
    dateFrom: monthRange.dateFrom,
    dateTo: monthRange.dateTo,
    currency: currencies.size === 0 ? "BGN" : currencies.size === 1 ? [...currencies][0] : "mixed",
    totalExpenses,
    totalVat,
    documentCount: documents.length,
    topSuppliers: toSortedBreakdown(suppliers, 5),
    expensesByCategory: toSortedBreakdown(categories)
  };
}

async function saveReviewedDocument(documentId, data, authContext) {
  if (!data) {
    throw new HttpError(400, "Липсват прегледани данни за документа.");
  }

  const reviewedData = applyReviewRules(data);
  return updateReviewedDocument(documentId, reviewedData, authContext.company._id);
}

async function approveDocument(documentId, data, authContext) {
  if (!data) {
    throw new HttpError(400, "Липсват данни за одобряване.");
  }

  return approveReviewedDocument(documentId, data, authContext.company._id);
}

module.exports = {
  approveDocument,
  extractDocument,
  getDashboard,
  getDocument,
  listDocuments,
  saveReviewedDocument,
  uploadDocumentOnly
};
