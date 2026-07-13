const test = require("node:test");
const assert = require("node:assert/strict");
const { config } = require("../src/config/env");
const documentRepository = require("../src/services/documentRepository");
const ocrService = require("../src/services/ocrService");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function loadDocumentServiceWithStubs(stubs) {
  const originals = {
    countCompanyDocumentsThisMonth: documentRepository.countCompanyDocumentsThisMonth,
    createUploadedDocument: documentRepository.createUploadedDocument,
    findPotentialDuplicateDocument: documentRepository.findPotentialDuplicateDocument,
    updateDocumentStatus: documentRepository.updateDocumentStatus,
    updateExtractedDocument: documentRepository.updateExtractedDocument,
    extractExpenseDocumentFromImages: ocrService.extractExpenseDocumentFromImages,
    ocrMaxConcurrentJobs: config.ocrMaxConcurrentJobs
  };
  const documentServicePath = require.resolve("../src/services/documentService");

  documentRepository.countCompanyDocumentsThisMonth = stubs.countCompanyDocumentsThisMonth;
  documentRepository.createUploadedDocument = stubs.createUploadedDocument;
  documentRepository.findPotentialDuplicateDocument = stubs.findPotentialDuplicateDocument;
  documentRepository.updateDocumentStatus = stubs.updateDocumentStatus;
  documentRepository.updateExtractedDocument = stubs.updateExtractedDocument;
  ocrService.extractExpenseDocumentFromImages = stubs.extractExpenseDocumentFromImages;
  config.ocrMaxConcurrentJobs = stubs.ocrMaxConcurrentJobs || 1;
  delete require.cache[documentServicePath];

  const documentService = require("../src/services/documentService");

  return {
    documentService,
    restore() {
      documentRepository.countCompanyDocumentsThisMonth = originals.countCompanyDocumentsThisMonth;
      documentRepository.createUploadedDocument = originals.createUploadedDocument;
      documentRepository.findPotentialDuplicateDocument = originals.findPotentialDuplicateDocument;
      documentRepository.updateDocumentStatus = originals.updateDocumentStatus;
      documentRepository.updateExtractedDocument = originals.updateExtractedDocument;
      ocrService.extractExpenseDocumentFromImages = originals.extractExpenseDocumentFromImages;
      config.ocrMaxConcurrentJobs = originals.ocrMaxConcurrentJobs;
      delete require.cache[documentServicePath];
    }
  };
}

function buildAuthContext() {
  return {
    company: {
      _id: "company-id",
      documentLimit: 10
    },
    user: {
      _id: "user-id"
    }
  };
}

function buildImageFile(name) {
  return {
    path: `C:\\temp\\${name}.png`,
    originalname: `${name}.png`,
    mimetype: "image/png"
  };
}

function buildExtractedData() {
  return {
    documentType: "invoice",
    issueDate: "2026-01-01",
    supplierName: "Supplier",
    recipientName: "Recipient",
    totalAmount: 10,
    currency: "BGN",
    confidence: 0.9
  };
}

test("OCR extraction concurrency guard rejects excess processing and records failure metadata", async () => {
  const firstOcr = deferred();
  const statusUpdates = [];
  const createdDocuments = [];
  let documentCounter = 0;
  let ocrCalls = 0;

  const { documentService, restore } = loadDocumentServiceWithStubs({
    ocrMaxConcurrentJobs: 1,
    countCompanyDocumentsThisMonth: async () => 0,
    createUploadedDocument: async () => {
      documentCounter += 1;
      const document = { id: `doc-${documentCounter}` };
      createdDocuments.push(document);
      return document;
    },
    findPotentialDuplicateDocument: async () => null,
    updateDocumentStatus: async (documentId, companyId, status, extraUpdates = {}) => {
      statusUpdates.push({ documentId, companyId, status, extraUpdates });
      return { id: documentId, status, ...extraUpdates };
    },
    updateExtractedDocument: async (documentId, companyId, payload) => ({
      id: documentId,
      company_id: companyId,
      status: "needs_review",
      data: payload.data
    }),
    extractExpenseDocumentFromImages: async () => {
      ocrCalls += 1;
      if (ocrCalls === 1) {
        return firstOcr.promise;
      }
      return buildExtractedData();
    }
  });

  try {
    const authContext = buildAuthContext();
    const first = documentService.extractDocument(buildImageFile("first"), authContext);
    await new Promise((resolve) => setImmediate(resolve));

    await assert.rejects(
      () => documentService.extractDocument(buildImageFile("second"), authContext),
      (error) => error.statusCode === 429 && error.code === "ocr_concurrency_limit"
    );

    firstOcr.resolve(buildExtractedData());
    const firstResult = await first;

    assert.equal(firstResult.status, "needs_review");
    assert.deepEqual(createdDocuments, [{ id: "doc-1" }, { id: "doc-2" }]);

    const failedUpdate = statusUpdates.find((update) => update.documentId === "doc-2" && update.status === "failed");
    assert.equal(failedUpdate.extraUpdates.failureCode, "ocr_concurrency_limit");
    assert.ok(failedUpdate.extraUpdates.failedAt instanceof Date);
    assert.ok(failedUpdate.extraUpdates.processingCompletedAt instanceof Date);
  } finally {
    restore();
  }
});

