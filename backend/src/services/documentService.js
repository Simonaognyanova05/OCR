const path = require("node:path");
const fs = require("node:fs/promises");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { ocrMimeTypes } = require("../middleware/uploadMiddleware");
const { convertPdfToImages } = require("./pdfConversionService");
const { extractExpenseDocumentFromImages } = require("./ocrService");
const { addWarning, applyReviewRules } = require("./reviewService");
const {
  approveReviewedDocument,
  countCompanyDocumentsThisMonth,
  createUploadedDocument,
  findDocumentFileById,
  findDocumentById,
  findPotentialDuplicateDocument,
  getCompanyDashboardDocuments,
  listCompanyDocuments,
  updateDocumentStatus,
  updateExtractedDocument,
  updateReviewedDocument
} = require("./documentRepository");

let activeExtractionJobs = 0;

async function runWithExtractionSlot(work) {
  if (activeExtractionJobs >= config.ocrMaxConcurrentJobs) {
    const error = new HttpError(429, "Има твърде много активни OCR обработки. Опитай отново след малко.");
    error.code = "ocr_concurrency_limit";
    throw error;
  }

  activeExtractionJobs += 1;
  try {
    return await work();
  } finally {
    activeExtractionJobs -= 1;
  }
}

function buildFailureMetadata(error) {
  const code = error.code || (error.statusCode === 504 ? "processing_timeout" : "processing_failed");
  const isExpected = error instanceof HttpError || error.statusCode;

  return {
    failedAt: new Date(),
    processingCompletedAt: new Date(),
    failureCode: code,
    failureMessage: isExpected ? String(error.message).slice(0, 500) : "Обработката не успя. Опитай отново или качи по-ясен документ."
  };
}

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
    await updateDocumentStatus(uploadedDocument.id, authContext.company._id, "processing", {
      processingStartedAt: new Date(),
      processingCompletedAt: null,
      failedAt: null,
      failureCode: null,
      failureMessage: null
    });

    const extracted = await runWithExtractionSlot(async () => {
      const imagePaths = await getOcrImagePaths(file);
      return applyAutomaticChecks(
        await extractExpenseDocumentFromImages(imagePaths),
        authContext,
        uploadedDocument.id
      );
    });

    return updateExtractedDocument(uploadedDocument.id, authContext.company._id, {
      model: config.model,
      extracted_at: new Date().toISOString(),
      data: extracted
    });
  } catch (error) {
    await updateDocumentStatus(
      uploadedDocument.id,
      authContext.company._id,
      "failed",
      buildFailureMetadata(error)
    ).catch(() => {});
    throw error;
  }
}

async function getDocument(documentId, authContext) {
  return findDocumentById(documentId, authContext.company._id);
}

async function getDocumentFile(documentId, authContext) {
  const documentFile = await findDocumentFileById(documentId, authContext.company._id);
  const uploadRoot = path.resolve(config.uploadDir);
  const storedFile = path.basename(documentFile.storedFile || "");

  if (!storedFile) {
    throw new HttpError(404, "Ð¤Ð°Ð¹Ð»ÑŠÑ‚ Ð½Ðµ Ðµ Ð½Ð°Ð¼ÐµÑ€ÐµÐ½.");
  }

  const filePath = path.resolve(uploadRoot, storedFile);
  const relativePath = path.relative(uploadRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new HttpError(400, "ÐÐµÐ²Ð°Ð»Ð¸Ð´ÐµÐ½ Ñ„Ð°Ð¹Ð».");
  }

  try {
    await fs.access(filePath);
  } catch (_error) {
    throw new HttpError(404, "Ð¤Ð°Ð¹Ð»ÑŠÑ‚ Ð½Ðµ Ðµ Ð½Ð°Ð¼ÐµÑ€ÐµÐ½.");
  }

  return {
    filePath,
    filename: documentFile.originalName || storedFile,
    mimeType: documentFile.mimeType
  };
}

async function listDocuments(filters, authContext) {
  return listCompanyDocuments(authContext.company._id, filters || {});
}

async function applyAutomaticChecks(data, authContext, documentId) {
  const checkedData = applyReviewRules(data);
  const duplicate = await findPotentialDuplicateDocument(authContext.company._id, checkedData, documentId);

  if (duplicate) {
    addWarning(checkedData.warnings, "possible_duplicate");
    checkedData.duplicateDocumentId = duplicate._id.toString();
  } else {
    delete checkedData.duplicateDocumentId;
  }

  return checkedData;
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
  const [documents, usedDocuments] = await Promise.all([
    getCompanyDashboardDocuments(authContext.company._id, monthRange),
    countCompanyDocumentsThisMonth(authContext.company._id)
  ]);
  const suppliers = new Map();
  const categories = new Map();
  const currencies = new Set();
  let totalExpenses = 0;
  let totalVat = 0;
  const documentLimit = authContext.company.documentLimit;

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
    usage: {
      usedDocuments,
      documentLimit,
      remainingDocuments: Math.max(documentLimit - usedDocuments, 0),
      limitReached: usedDocuments >= documentLimit,
      plan: authContext.company.plan
    },
    topSuppliers: toSortedBreakdown(suppliers, 5),
    expensesByCategory: toSortedBreakdown(categories)
  };
}

async function saveReviewedDocument(documentId, data, authContext) {
  if (!data) {
    throw new HttpError(400, "Липсват прегледани данни за документа.");
  }

  const reviewedData = await applyAutomaticChecks(data, authContext, documentId);
  return updateReviewedDocument(documentId, reviewedData, authContext.company._id);
}

async function approveDocument(documentId, data, authContext) {
  if (!data) {
    throw new HttpError(400, "Липсват данни за одобряване.");
  }

  const reviewedData = await applyAutomaticChecks(data, authContext, documentId);
  if (reviewedData.needsReview) {
    throw new HttpError(400, "Документът все още има липсващи или рискови полета и не може да бъде одобрен.");
  }

  return approveReviewedDocument(documentId, reviewedData, authContext.company._id);
}

module.exports = {
  approveDocument,
  extractDocument,
  getDashboard,
  getDocument,
  getDocumentFile,
  listDocuments,
  saveReviewedDocument,
  uploadDocumentOnly
};
