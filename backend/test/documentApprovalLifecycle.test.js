const test = require("node:test");
const assert = require("node:assert/strict");

const Document = require("../src/models/Document");
const documentRepository = require("../src/services/documentRepository");

function id(value) {
  return {
    toString() {
      return value;
    }
  };
}

function buildDocument(status, data = {}) {
  return {
    _id: id("doc-id"),
    companyId: id("company-id"),
    uploadedBy: id("user-id"),
    originalName: "invoice.pdf",
    originalFileName: "invoice.pdf",
    storedFile: "stored.pdf",
    fileUrl: "",
    mimeType: "application/pdf",
    model: null,
    status,
    documentType: data.documentType || "invoice",
    data,
    exports: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

function buildReviewedData(overrides = {}) {
  return {
    documentType: "invoice",
    documentNumber: "INV-1",
    issueDate: "2026-01-01",
    supplierName: "Supplier",
    supplierVatNumber: "BG123456789",
    recipientName: "Recipient",
    recipientVatNumber: "BG987654321",
    totalAmount: 120,
    netAmount: 100,
    vatAmount: 20,
    currency: "BGN",
    paymentMethod: "bank_transfer",
    category: "Office",
    needsReview: false,
    reviewReasons: [],
    warnings: [],
    ...overrides
  };
}

test("approval atomically requires needs_review status", async () => {
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalExists = Document.exists;

  let capturedQuery;
  Document.findOneAndUpdate = (query, update) => {
    capturedQuery = query;
    return buildDocument(update.$set.status, update.$set.data);
  };

  try {
    const approved = await documentRepository.approveReviewedDocument(
      "doc-id",
      buildReviewedData(),
      "company-id"
    );

    assert.deepEqual(capturedQuery, {
      _id: "doc-id",
      companyId: "company-id",
      status: "needs_review"
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.data.needsReview, false);
  } finally {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    Document.exists = originalExists;
  }
});

test("approval rejects documents outside the review lifecycle state", async () => {
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalExists = Document.exists;
  const blockedStatuses = ["uploaded", "processing", "failed"];

  try {
    for (const currentStatus of blockedStatuses) {
      Document.findOneAndUpdate = (query, update) => {
        if (query.status === currentStatus) {
          return buildDocument(update.$set.status, update.$set.data);
        }
        return null;
      };
      Document.exists = async () => ({ _id: "doc-id" });

      await assert.rejects(
        () => documentRepository.approveReviewedDocument("doc-id", buildReviewedData(), "company-id"),
        (error) => error.statusCode === 409
      );
    }
  } finally {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    Document.exists = originalExists;
  }
});
