const test = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../src/models/Document");
const { findDocumentById } = require("../src/services/documentRepository");

function buildDocument(overrides = {}) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: "507f1f77bcf86cd799439011",
    companyId: "507f1f77bcf86cd799439012",
    uploadedBy: "507f1f77bcf86cd799439013",
    originalName: "invoice.pdf",
    originalFileName: "invoice.pdf",
    storedFile: "private-storage-name.pdf",
    fileUrl: "/uploads/private-storage-name.pdf",
    mimeType: "application/pdf",
    model: null,
    status: "uploaded",
    documentType: null,
    extractedAt: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    data: null,
    ...overrides
  };
}

test("document detail DTO hides storage implementation details", async () => {
  const originalFindOne = Document.findOne;
  let capturedQuery;

  Document.findOne = async (query) => {
    capturedQuery = query;
    return buildDocument();
  };

  try {
    const result = await findDocumentById("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012");

    assert.deepEqual(capturedQuery, {
      _id: "507f1f77bcf86cd799439011",
      companyId: "507f1f77bcf86cd799439012"
    });
    assert.equal(Object.hasOwn(result, "stored_file"), false);
    assert.equal(Object.hasOwn(result, "file_url"), false);
    assert.equal(result.file_endpoint, "/api/documents/507f1f77bcf86cd799439011/file");
  } finally {
    Document.findOne = originalFindOne;
  }
});
