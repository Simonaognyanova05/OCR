const path = require("node:path");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { ocrMimeTypes } = require("../middleware/uploadMiddleware");
const { convertPdfToImages } = require("./pdfConversionService");
const { extractExpenseDocumentFromImages } = require("./ocrService");
const { applyReviewRules } = require("./reviewService");
const {
  countCompanyDocumentsThisMonth,
  createUploadedDocument,
  findDocumentById,
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
      status: extracted.needsReview ? "needs_review" : "approved",
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
  saveReviewedDocument,
  uploadDocumentOnly
};
