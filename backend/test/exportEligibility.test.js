const test = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../src/models/Document");
const documentRepository = require("../src/services/documentRepository");

function loadExportServiceWithRepositoryStubs(stubs) {
  const originalFindDocumentById = documentRepository.findDocumentById;
  const originalMarkDocumentExported = documentRepository.markDocumentExported;
  const exportServicePath = require.resolve("../src/services/exportService");

  documentRepository.findDocumentById = stubs.findDocumentById;
  documentRepository.markDocumentExported = stubs.markDocumentExported;
  delete require.cache[exportServicePath];

  const exportService = require("../src/services/exportService");

  return {
    exportService,
    restore() {
      documentRepository.findDocumentById = originalFindDocumentById;
      documentRepository.markDocumentExported = originalMarkDocumentExported;
      delete require.cache[exportServicePath];
    }
  };
}

function buildDocument(status) {
  return {
    id: "507f1f77bcf86cd799439011",
    status,
    data: {
      documentType: "invoice",
      issueDate: "2026-01-01",
      documentNumber: "INV-1",
      supplierName: "Supplier",
      recipientName: "Recipient",
      totalAmount: 10,
      currency: "BGN"
    }
  };
}

test("single document exports reject non-approved statuses", async () => {
  const blockedStatuses = ["uploaded", "processing", "needs_review", "failed"];

  for (const status of blockedStatuses) {
    let markCalled = false;
    const { exportService, restore } = loadExportServiceWithRepositoryStubs({
      findDocumentById: async () => buildDocument(status),
      markDocumentExported: async () => {
        markCalled = true;
      }
    });

    try {
      await assert.rejects(
        () => exportService.generateExcelExport("doc-id", "company-id"),
        (error) => error.statusCode === 409
      );
      await assert.rejects(
        () => exportService.generatePdfExport("doc-id", "company-id"),
        (error) => error.statusCode === 409
      );
      assert.equal(markCalled, false);
    } finally {
      restore();
    }
  }
});

test("single document excel export allows approved and exported statuses", async () => {
  for (const status of ["approved", "exported"]) {
    let markCall;
    const { exportService, restore } = loadExportServiceWithRepositoryStubs({
      findDocumentById: async () => buildDocument(status),
      markDocumentExported: async (documentId, exportType, companyId) => {
        markCall = { documentId, exportType, companyId };
      }
    });

    try {
      const result = await exportService.generateExcelExport("doc-id", "company-id");

      assert.equal(result.contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      assert.deepEqual(markCall, {
        documentId: "doc-id",
        exportType: "excel",
        companyId: "company-id"
      });
    } finally {
      restore();
    }
  }
});

test("markDocumentExported atomically requires approved or exported status", async () => {
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  let capturedQuery;

  Document.findOneAndUpdate = (query) => {
    capturedQuery = query;
    return null;
  };

  try {
    await assert.rejects(
      () => documentRepository.markDocumentExported("doc-id", "excel", "company-id"),
      (error) => error.statusCode === 404 || error.statusCode === 409
    );

    assert.deepEqual(capturedQuery, {
      _id: "doc-id",
      status: { $in: ["approved", "exported"] },
      companyId: "company-id"
    });
  } finally {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

