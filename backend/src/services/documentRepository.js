const Document = require("../models/Document");
const { HttpError } = require("../utils/httpError");
const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");

function toApiDocument(document) {
  return {
    id: document._id.toString(),
    original_name: document.originalName,
    stored_file: document.storedFile,
    model: document.model,
    status: document.status,
    extracted_at: document.extractedAt?.toISOString(),
    reviewed_at: document.reviewedAt ? document.reviewedAt.toISOString() : undefined,
    created_at: document.createdAt?.toISOString(),
    updated_at: document.updatedAt?.toISOString(),
    data: document.data
  };
}

async function createDocument(payload) {
  const sanitizedData = sanitizeDocumentDataForStorage(payload.data);
  const document = await Document.create({
    originalName: payload.original_name,
    storedFile: payload.stored_file,
    model: payload.model,
    status: payload.status,
    extractedAt: payload.extracted_at,
    data: sanitizedData
  });

  return toApiDocument(document);
}

async function findDocumentById(documentId) {
  const document = await Document.findById(documentId);

  if (!document) {
    throw new HttpError(404, "Document result not found.");
  }

  return toApiDocument(document);
}

async function updateReviewedDocument(documentId, reviewedData) {
  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      $set: {
        status: sanitizedData.needs_review ? "needs_review" : "reviewed",
        reviewedAt: new Date(),
        data: sanitizedData
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!document) {
    throw new HttpError(404, "Document result not found.");
  }

  return toApiDocument(document);
}

async function markDocumentExported(documentId, exportType) {
  const exportedAt = new Date();
  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      $set: {
        status: "exported",
        [`exports.${exportType}.exportedAt`]: exportedAt
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!document) {
    throw new HttpError(404, "Document result not found.");
  }

  return toApiDocument(document);
}

module.exports = {
  createDocument,
  findDocumentById,
  markDocumentExported,
  updateReviewedDocument,
};
