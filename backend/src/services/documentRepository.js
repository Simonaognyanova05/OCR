const Document = require("../models/Document");
const { HttpError } = require("../utils/httpError");
const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");

function toApiDocument(document) {
  return {
    id: document._id.toString(),
    company_id: document.companyId.toString(),
    uploaded_by: document.uploadedBy.toString(),
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
    companyId: payload.company_id,
    uploadedBy: payload.uploaded_by,
    originalName: payload.original_name,
    storedFile: payload.stored_file,
    model: payload.model,
    status: payload.status,
    extractedAt: payload.extracted_at,
    data: sanitizedData
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
  const query = {
    _id: documentId
  };

  if (companyId) {
    query.companyId = companyId;
  }

  const document = await Document.findOne(query);

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function updateReviewedDocument(documentId, reviewedData, companyId) {
  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const document = await Document.findOneAndUpdate(
    {
      _id: documentId,
      companyId
    },
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
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function markDocumentExported(documentId, exportType, companyId) {
  const exportedAt = new Date();
  const query = {
    _id: documentId
  };

  if (companyId) {
    query.companyId = companyId;
  }

  const document = await Document.findOneAndUpdate(
    query,
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
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

module.exports = {
  countCompanyDocumentsThisMonth,
  createDocument,
  findDocumentById,
  markDocumentExported,
  updateReviewedDocument
};
