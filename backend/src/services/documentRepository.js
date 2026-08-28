const Document = require("../models/Document");
const { HttpError } = require("../utils/httpError");
const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");
const { decryptFields, encryptFields } = require("../utils/fieldEncryption");

const documentStatuses = new Set(["uploaded", "processing", "needs_review", "approved", "exported", "failed"]);
const documentTypes = new Set(["invoice", "receipt", "other"]);
const currencies = new Set(["BGN", "EUR", "USD"]);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const maxTextFilterLength = 80;
const protectedDocumentDataFields = new Set(["personalName", "egn"]);

function encryptDocumentData(data) {
  return encryptFields(data, protectedDocumentDataFields);
}

function decryptDocumentData(data) {
  return decryptFields(data, protectedDocumentDataFields);
}
function assertTenantScope(companyId) {
  if (companyId === undefined || companyId === null || companyId === "") {
    throw new Error("Tenant companyId is required for document repository access.");
  }
}

function toApiDocument(document) {
  const data = decryptDocumentData(document.data);

  return {
    id: document._id.toString(),
    company_id: document.companyId.toString(),
    uploaded_by: document.uploadedBy.toString(),
    original_name: document.originalName,
    original_file_name: document.originalFileName || document.originalName,
    file_endpoint: buildProtectedFileEndpoint(document._id),
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
    data
  };
}

function toApiDocumentListItem(document) {
  const data = decryptDocumentData(document.data) || {};

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

function addRegexFilter(query, field, value) {
  if (value) {
    query[field] = { $regex: escapeRegex(value), $options: "i" };
  }
}

function buildDocumentListQuery(companyId, filters) {
  const query = { companyId };

  if (filters.status) query.status = filters.status;
  if (filters.documentType) query.documentType = filters.documentType;
  if (filters.currency) query["data.currency"] = filters.currency;
  addRegexFilter(query, "data.category", filters.category);

  addRegexFilter(query, "data.supplierName", filters.supplier);
  addRegexFilter(query, "data.recipientName", filters.recipient);

  if (filters.dateFrom || filters.dateTo) {
    query["data.issueDate"] = {};
    if (filters.dateFrom) query["data.issueDate"].$gte = filters.dateFrom;
    if (filters.dateTo) query["data.issueDate"].$lte = filters.dateTo;
  }

  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    query["data.totalAmount"] = {};
    if (filters.amountMin !== undefined) query["data.totalAmount"].$gte = filters.amountMin;
    if (filters.amountMax !== undefined) query["data.totalAmount"].$lte = filters.amountMax;
  }

  return query;
}

async function createUploadedDocument(payload) {
  const document = new Document({
    companyId: payload.company_id,
    uploadedBy: payload.uploaded_by,
    originalName: payload.original_file_name,
    originalFileName: payload.original_file_name,
    storedFile: payload.stored_file,
    fileUrl: payload.file_url || null,
    mimeType: payload.mime_type,
    status: "uploaded",
    documentType: null,
    data: null
  });

  document.fileUrl = buildProtectedFileEndpoint(document._id);
  await document.save();

  return toApiDocument(document);
}

async function countCompanyDocumentsThisMonth(companyId) {
  assertTenantScope(companyId);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  return Document.countDocuments({
    companyId,
    createdAt: { $gte: startOfMonth }
  });
}

async function listCompanyDocuments(companyId, filters) {
  assertTenantScope(companyId);

  const normalizedFilters = normalizeDocumentListFilters(filters);
  const { limit, page } = normalizedFilters;
  const query = buildDocumentListQuery(companyId, normalizedFilters);
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
  assertTenantScope(companyId);

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
  assertTenantScope(companyId);

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
  assertTenantScope(companyId);

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
  assertTenantScope(companyId);

  const document = await Document.findOne({ _id: documentId, companyId });
  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function findDocumentFileById(documentId, companyId) {
  assertTenantScope(companyId);

  const document = await Document.findOne({ _id: documentId, companyId })
    .select("originalName originalFileName storedFile mimeType");

  if (!document) {
    throw new HttpError(404, "Документът не е намерен.");
  }

  return {
    originalName: document.originalFileName || document.originalName,
    storedFile: document.storedFile,
    mimeType: document.mimeType
  };
}

async function updateDocumentStatus(documentId, companyId, status, extraUpdates = {}) {
  assertTenantScope(companyId);

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
  assertTenantScope(companyId);

  const sanitizedData = sanitizeDocumentDataForStorage(payload.data);
  const protectedData = encryptDocumentData(sanitizedData);
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
        data: protectedData
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
  assertTenantScope(companyId);

  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const protectedData = encryptDocumentData(sanitizedData);
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      $set: {
        status: "needs_review",
        reviewedAt: new Date(),
        documentType: sanitizedData.documentType || null,
        data: protectedData
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
  assertTenantScope(companyId);

  const sanitizedData = sanitizeDocumentDataForStorage(reviewedData);
  const protectedData = encryptDocumentData({
    ...sanitizedData,
    needsReview: false,
    reviewReasons: []
  });
  const document = await Document.findOneAndUpdate(
    { _id: documentId, companyId, status: "needs_review" },
    {
      $set: {
        status: "approved",
        reviewedAt: new Date(),
        documentType: sanitizedData.documentType || null,
        data: protectedData
      }
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    const existingDocument = await Document.exists({ _id: documentId, companyId });
    if (existingDocument) {
      throw new HttpError(409, "Документът трябва да бъде в статус за преглед преди одобрение.");
    }

    throw new HttpError(404, "Документът не е намерен.");
  }

  return toApiDocument(document);
}

async function markDocumentExported(documentId, exportType, companyId) {
  assertTenantScope(companyId);

  const exportedAt = new Date();
  const query = { _id: documentId, status: { $in: ["approved", "exported"] }, companyId };

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
  decryptDocumentData,
  encryptDocumentData,
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
