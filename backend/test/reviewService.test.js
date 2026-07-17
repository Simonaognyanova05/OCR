const test = require("node:test");
const assert = require("node:assert/strict");
const { applyReviewRules } = require("../src/services/reviewService");

function buildValidInvoice(overrides = {}) {
  return {
    documentType: "invoice",
    documentNumber: "INV-100",
    issueDate: "2026-01-15",
    supplierName: "Supplier Ltd",
    supplierVatNumber: "BG123456789",
    recipientName: "Client Ltd",
    recipientVatNumber: "BG987654321",
    totalAmount: 120,
    netAmount: 100,
    vatAmount: 20,
    currency: "BGN",
    paymentMethod: "bank_transfer",
    category: "Office",
    items: [
      {
        name: "Service",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120
      }
    ],
    confidence: 0.95,
    ...overrides
  };
}

test("review rules allow a complete accounting-ready invoice", () => {
  const reviewed = applyReviewRules(buildValidInvoice());

  assert.equal(reviewed.needsReview, false);
  assert.deepEqual(reviewed.reviewReasons, []);
  assert.deepEqual(reviewed.warnings, []);
});

test("review rules block approval for accounting inconsistencies", () => {
  const reviewed = applyReviewRules(buildValidInvoice({
    totalAmount: 119,
    vatAmount: 130,
    paymentMethod: "unknown",
    supplierVatNumber: null
  }));

  assert.equal(reviewed.needsReview, true);
  assert.ok(reviewed.reviewReasons.includes("amount_mismatch"));
  assert.ok(reviewed.reviewReasons.includes("vat_exceeds_total"));
  assert.ok(reviewed.reviewReasons.includes("payment_method_unknown"));
  assert.ok(reviewed.reviewReasons.includes("supplier_vat_missing"));
  assert.ok(reviewed.warnings.includes("amount_mismatch"));
});

test("review rules flag invalid and future issue dates", () => {
  const invalidDate = applyReviewRules(buildValidInvoice({ issueDate: "2026-02-31" }));
  assert.ok(invalidDate.reviewReasons.includes("invalid_issue_date"));

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const futureIssueDate = tomorrow.toISOString().slice(0, 10);
  const futureDate = applyReviewRules(buildValidInvoice({ issueDate: futureIssueDate }));

  assert.ok(futureDate.reviewReasons.includes("future_issue_date"));
  assert.ok(futureDate.warnings.includes("future_issue_date"));
});

test("review rules refresh generated warnings instead of preserving stale ones", () => {
  const reviewed = applyReviewRules(buildValidInvoice({
    warnings: ["amount_mismatch", "possible_duplicate", "manual_note"]
  }));

  assert.deepEqual(reviewed.warnings, ["manual_note"]);
});
