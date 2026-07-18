const test = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../src/models/Document");
const { listCompanyDocuments } = require("../src/services/documentRepository");

function stubDocumentQueries() {
  const originalFind = Document.find;
  const originalCountDocuments = Document.countDocuments;
  const captured = {};

  Document.find = (query) => {
    captured.findQuery = query;
    return {
      sort(sortValue) {
        captured.sortValue = sortValue;
        return this;
      },
      skip(skipValue) {
        captured.skipValue = skipValue;
        return this;
      },
      limit(limitValue) {
        captured.limitValue = limitValue;
        return [];
      }
    };
  };

  Document.countDocuments = (query) => {
    captured.countQuery = query;
    return Promise.resolve(0);
  };

  return {
    captured,
    restore() {
      Document.find = originalFind;
      Document.countDocuments = originalCountDocuments;
    }
  };
}

test("document list filters are normalized, bounded, and regex escaped", async () => {
  const { captured, restore } = stubDocumentQueries();

  try {
    const result = await listCompanyDocuments("company-id", {
      page: "2",
      limit: "250",
      status: "approved",
      documentType: "invoice",
      currency: "BGN",
      category: "Office.*",
      supplier: "A+B",
      recipient: "Client?",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      amountMin: "0",
      amountMax: "100.5"
    });

    assert.equal(captured.skipValue, 100);
    assert.equal(captured.limitValue, 100);
    assert.deepEqual(result.pagination, {
      page: 2,
      limit: 100,
      total: 0,
      pages: 0
    });
    assert.deepEqual(captured.findQuery, {
      companyId: "company-id",
      status: "approved",
      documentType: "invoice",
      "data.currency": "BGN",
      "data.category": { $regex: "Office\\.\\*", $options: "i" },
      "data.supplierName": { $regex: "A\\+B", $options: "i" },
      "data.recipientName": { $regex: "Client\\?", $options: "i" },
      "data.issueDate": {
        $gte: "2026-01-01",
        $lte: "2026-01-31"
      },
      "data.totalAmount": {
        $gte: 0,
        $lte: 100.5
      }
    });
  } finally {
    restore();
  }
});

test("document list rejects invalid pagination and filters", async () => {
  await assert.rejects(
    () => listCompanyDocuments("company-id", { page: "NaN" }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => listCompanyDocuments("company-id", { limit: "0" }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => listCompanyDocuments("company-id", { amountMin: "not-a-number" }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => listCompanyDocuments("company-id", { dateFrom: "2026-99-99" }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => listCompanyDocuments("company-id", { status: "deleted" }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => listCompanyDocuments("company-id", { supplier: "a".repeat(81) }),
    (error) => error.statusCode === 400
  );
});
