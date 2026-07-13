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
    file_url: `/api/documents/${document._id.toString()}/file`,
    mime_type: document.mimeType,
    model: document.model,
    status: document.status,
    document_type: document.documentType,
    extracted_at: document.extractedAt?.toISOString(),
    processing_started_at: document.processingStartedAt ? document.processingStartedAt.toISOString() : undefined,
    processing_completed_at: document.processingCompletedAt ? document.processingCompletedAt.toISOString() : undefined,
    failed_at: document.failedAt ? document.failedAt.toISOString() : undefined,
    failure_code: document.failureCode || undefined,
    failure_message: document.failureMessage || undefined,
    reviewed_at: document.reviewedAt ? document.reviewedAt.toISOString() : undefined,
    created_at: document.createdAt?.toISOString(),
    updated_at: document.updatedAt?.toISOString(),
    data: document.data
  };
}

function toApiDocumentListItem(document) {
  const data = document.data || {};

  return {
    id: document._id.toString(),
    date: data.issueDate || document.createdAt?.toISOString()?.slice(0, 10) || null,
    documentType: document.documentType || data.documentType || null,
    supplierName: data.supplierName || null,
    recipientName: data.recipientName || null,
    totalAmount: data.totalAmount ?? null,
    vatAmount: data.vatAmount ?? null,
    currency: data.currency || null,
    category: data.category || null,
    status: document.status,
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString()
  };
}

function buildFileUrl(storedFile) {
  return `/uploads/${storedFile}`;
}

function addRegexFilter(query, field, value) {
  if (value) {
    query[field] = { $regex: String(value).trim(), $options: "i" };
  }
}

function buildDocumentListQuery(companyId, filters = {}) {
  const query = { companyId };

  if (filters.status) query.status = filters.status;
  if (filters.documentType) query.documentType = filters.documentType;
  if (filters.currency) query["data.currency"] = filters.currency;
  if (filters.category) query["data.category"] = { $regex: String(filters.category).trim(), $options: "i" };

  addRegexFilter(query, "data.supplierName", filters.supplier);
  addRegexFilter(query, "data.recipientName", filters.recipient);

  if (filters.dateFrom || filters.dateTo) {
    query["data.issueDate"] = {};
    if (filters.dateFrom) query["data.issueDate"].$gte = filters.dateFrom;
    if (filters.dateTo) query["data.issueDate"].$lte = filters.dateTo;
  }

  if (filters.amountMin || filters.amountMax) {
    query["data.totalAmount"] = {};
    if (filters.amountMin) query["data.totalAmount"].$gte = Number(filters.amountMin);
    if (filters.amountMax) query["data.totalAmount"].$lte = Number(filters.amountMax);
  }

  return query;
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
    createdAt: { $gte: startOfMonth }
  });
}

async function listCompanyDocuments(companyId, filters) {
  const limit = Math.min(Number(filters.limit || 50), 100);
  const page = Math.max(Number(filters.page || 1), 1);
  const query = buildDocumentListQuery(companyId, filters);
  const [documents, total] = await Promise.all([
    Document.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Document.countDocuments(query)
  ]);

  return {
    documents: documents.map(toApiDocumentListItem),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

async function listCompanyDocumentsForMonthlyReport(companyId, { dateFrom, dateTo }) {
  return Document.find({
    companyId,
    status: { $in: ["approved", "exported"] },
    "data.issueDate": {
      $gte: dateFrom,
      $lte: dateTo
    }
  })
    .sort({ "data.issueDate": 1, createdAt: 1 })
    .lean();
}

async function getCompanyDashboardDocuments(companyId, { dateFrom, dateTo }) {
  return Document.find({
    companyId,
    status: { $in: ["approved", "exported"] },
    "data.issueDate": {
      $gte: dateFrom,
      $lte: dateTo
    }
  })
    .select("data status documentType createdAt")
    .lean();
}

async function findPotentialDuplicateDocument(companyId, documentData, excludeDocumentId) {
  if (!documentData?.documentNumber || !documentData?.supplierName || documentData.totalAmount === null || documentData.totalAmount === undefined) {
    return null;
  }

  const query = {
    companyId,
    status: { $ne: "failed" },
    "data.documentNumber": documentData.documentNumber,
    "data.supplierName": documentData.supplierName,
    "data.totalAmount": documentData.totalAmount
  };

  if (excludeDocumentId) {
    query._id = { $ne: excludeDocumentId };
  }

  return Document.findOne(query)
    .select("_id data.documentNumber data.supplierName data.totalAmount status")
    .lean();
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

async function findDocumentFileById(documentId, companyId) {
  const document = await Document.findOne({ _id: documentId, companyId })
    .select("originalName originalFileName storedFile mimeType");

  if (!document) {
    throw new HttpError(404, "Ð”Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚ÑŠÑ‚ Ð½Ðµ Ðµ Ð½Ð°Ð¼ÐµÑ€ÐµÐ½.");
  }

  return {
    originalName: document.originalFileName || document.originalName,
    storedFile: document.storedFile,
    mimeType: document.mimeType
  };
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
        processingCompletedAt: new Date(),
        failedAt: null,
        failureCode: null,
        failureMessage: null,
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
  const query = { _id: documentId, status: { $in: ["approved", "exported"] } };
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
  findDocumentFileById,
  findDocumentById,
  findPotentialDuplicateDocument,
  getCompanyDashboardDocuments,
  listCompanyDocuments,
  listCompanyDocumentsForMonthlyReport,
  markDocumentExported,
  updateDocumentStatus,
  updateExtractedDocument,
  updateReviewedDocument
};
