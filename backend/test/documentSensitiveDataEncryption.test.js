const test = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../src/models/Document");
const {
  findDocumentById,
  updateExtractedDocument
} = require("../src/services/documentRepository");
const { isEncryptedValue } = require("../src/utils/fieldEncryption");

const documentId = "507f1f77bcf86cd799439011";
const companyId = "507f1f77bcf86cd799439012";
const userId = "507f1f77bcf86cd799439013";

function buildStoredDocument(data) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: documentId,
    companyId,
    uploadedBy: userId,
    originalName: "invoice.pdf",
    originalFileName: "invoice.pdf",
    storedFile: "stored.pdf",
    fileUrl: "",
    mimeType: "application/pdf",
    model: "test-model",
    status: "needs_review",
    documentType: "invoice",
    extractedAt: now,
    processingStartedAt: now,
    processingCompletedAt: now,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    data
  };
}

function buildDocumentData() {
  return {
    documentType: "invoice",
    documentNumber: "INV-100",
    issueDate: "2026-01-15",
    supplierName: "Supplier Ltd",
    supplierVatNumber: "BG123456789",
    recipientName: "Client Ltd",
    recipientVatNumber: "BG987654321",
    personalName: "Ivan Petrov",
    egn: "7501011234",
    totalAmount: 120,
    netAmount: 100,
    vatAmount: 20,
    currency: "BGN",
    paymentMethod: "bank_transfer",
    category: "Office",
    items: [],
    confidence: 0.95,
    needsReview: false,
    reviewReasons: [],
    warnings: []
  };
}

test("document repository encrypts EGN and personal names at rest and decrypts API DTOs", async () => {
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalFindOne = Document.findOne;
  let persistedData;

  Document.findOneAndUpdate = async (_query, update) => {
    persistedData = update.$set.data;
    return buildStoredDocument(persistedData);
  };

  Document.findOne = async () => buildStoredDocument(persistedData);

  try {
    const updated = await updateExtractedDocument(documentId, companyId, {
      model: "test-model",
      extracted_at: "2026-01-01T00:00:00.000Z",
      data: buildDocumentData()
    });

    assert.equal(isEncryptedValue(persistedData.personalName), true);
    assert.equal(isEncryptedValue(persistedData.egn), true);
    assert.notEqual(persistedData.personalName.value, "Ivan Petrov");
    assert.notEqual(persistedData.egn.value, "7501011234");

    assert.equal(updated.data.personalName, "Ivan Petrov");
    assert.equal(updated.data.egn, "7501011234");
    assert.equal(updated.data.supplierName, "Supplier Ltd");

    const fetched = await findDocumentById(documentId, companyId);
    assert.equal(fetched.data.personalName, "Ivan Petrov");
    assert.equal(fetched.data.egn, "7501011234");
  } finally {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    Document.findOne = originalFindOne;
  }
});
