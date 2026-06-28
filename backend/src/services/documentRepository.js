const Document = require("../models/Document");
const { HttpError } = require("../utils/httpError");
const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");

function toApiDocument(document) {
  return {
    id: document._id.toString(),
    company_id: document.companyId.toString(),
    uploaded_by: document.uploadedBy.toString(),
    original_name: document.originalName,
    original_file_name: document.originalFileName || document.originalName,
    stored_file: document.storedFile,
    file_url: document.fileUrl,
    mime_type: document.mimeType,
    model: document.model,
    status: document.status,
    document_type: document.documentType,
    extracted_at: document.extractedAt?.toISOString(),
    reviewed_at: document.reviewedAt ? document.reviewedAt.toISOString() : undefined,
    created_at: document.createdAt?.toISOString(),
    updated_at: document.updatedAt?.toISOString(),
    data: document.data
  };
}

function buildFileUrl(storedFile) {
  return `/uploads/${storedFile}`;
}

async function createUploadedDocument(payload) {
  const document = await Document.create({
    companyId: payload.company_id,
    uploadedBy: payload.uploaded_by,
    originalName: payload.original_file_name,
    originalFileName: payload.original_file_name,
    storedFile: payload.stored_file,
    fileUrl: payload.file_url || buildFileUrl(payload.stored_file),
    mimeType: payload.mime_type,
    status: "uploaded",
    documentType: null,
    data: null
  });

  return toApiDocument(document);
}

async function countCompanyDocumentsThisMonth(companyId) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  return Document.countDocuments({
    companyId,
    createdAt: {
      $gte: startOfMonth
    }
  });
}

async function findDocumentById(documentId, companyId) {
  const query = { _id: documentId };
  if (companyId) query.companyId = companyId;

  const document = await Document.findOne(query);
  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function updateDocumentStatus(documentId, companyId, status, extraUpdates = {}) {
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId },
    { $set: { status, ...extraUpdates } },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function updateExtractedDocument(documentId, companyId, payload) {
  const sanitizedData = sanitizeDocumentDataForStorage(payload.data);
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      $set: {
        status: "needs_review",
        model: payload.model,
        documentType: sanitizedData.documentType || null,
        extractedAt: payload.extracted_at,
        data: sanitizedData
      }
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function updateReviewedDocument(documentId, reviewedData, companyId) {
  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      $set: {
        status: "needs_review",
        reviewedAt: new Date(),
        documentType: sanitizedData.documentType || null,
        data: sanitizedData
      }
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function approveReviewedDocument(documentId, reviewedData, companyId) {
  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      $set: {
        status: "approved",
        reviewedAt: new Date(),
        documentType: sanitizedData.documentType || null,
        data: {
          ...sanitizedData,
          needsReview: false,
          reviewReasons: []
        }
      }
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function markDocumentExported(documentId, exportType, companyId) {
  const exportedAt = new Date();
  const query = { _id: documentId };
  if (companyId) query.companyId = companyId;

  const document = await Document.findOneAndUpdate(
    query,
    {
      $set: {
        status: "exported",
        [`exports.${exportType}.exportedAt`]: exportedAt
      }
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

module.exports = {
  approveReviewedDocument,
  countCompanyDocumentsThisMonth,
  createUploadedDocument,
  findDocumentById,
  markDocumentExported,
  updateDocumentStatus,
  updateExtractedDocument,
  updateReviewedDocument
};
