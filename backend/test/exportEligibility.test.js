const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
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

function buildDocument(status, dataOverrides = {}) {
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
      currency: "BGN",
      ...dataOverrides
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

test("single document excel export escapes formula-leading text cells", async () => {
  const { exportService, restore } = loadExportServiceWithRepositoryStubs({
    findDocumentById: async () => buildDocument("approved", {
      documentNumber: "=SUM(1,1)",
      supplierName: "+cmd",
      recipientName: "-1+2",
      category: "@value-with-long-text"
    }),
    markDocumentExported: async () => {}
  });

  try {
    const result = await exportService.generateExcelExport("doc-id", "company-id");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer);
    const sheet = workbook.worksheets[0];

    assert.equal(sheet.getCell("C2").value, "'=SUM(1,1)");
    assert.equal(sheet.getCell("D2").value, "'+cmd");
    assert.equal(sheet.getCell("F2").value, "'-1+2");
    assert.equal(sheet.getCell("M2").value, "'@value-with-long-text");
    assert.equal(sheet.getCell("J2").value, 10);
  } finally {
    restore();
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

