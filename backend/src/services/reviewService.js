const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");
const { isLikelyGarbledText } = require("../utils/textQuality");

const requiredAccountingFields = [
  ["document_number", "document_number_missing"],
  ["issue_date", "issue_date_missing"],
  ["supplier.name", "supplier_name_missing"],
  ["currency", "currency_missing"],
  ["amounts.total_with_vat", "total_missing"],
  ["vat.amount", "vat_missing"],
  ["payment.method", "payment_method_missing"]
];

const reviewReasonAliases = {
  "Missing document number": "document_number_missing",
  "Missing issue date": "issue_date_missing",
  "Missing supplier name": "supplier_name_missing",
  "Missing recipient name for invoice": "recipient_name_missing",
  "Missing currency": "currency_missing",
  "Missing total amount": "total_missing",
  "Missing VAT amount": "vat_missing",
  "Missing payment method": "payment_method_missing",
  vat_breakdown_missing: "vat_missing",
  vat_amount_missing: "vat_missing",
  vat_missing: "vat_missing",
  tax_missing: "vat_missing",
  subtotal_missing: "subtotal_missing",
  total_missing: "total_missing",
  amount_mismatch: "amount_mismatch",
  low_confidence: "low_confidence",
  unclear_image: "unclear_image"
};

const allowedReviewReasons = new Set([
  "document_number_missing",
  "issue_date_missing",
  "supplier_name_missing",
  "recipient_name_missing",
  "currency_missing",
  "subtotal_missing",
  "total_missing",
  "vat_missing",
  "payment_method_missing",
  "amount_mismatch",
  "low_confidence",
  "unclear_image"
]);

function getValue(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function applyReviewRules(documentData) {
  const reviewReasons = new Set();
  const sanitizedDocumentData = sanitizeDocumentDataForStorage(documentData);
  const cleanedDocumentData = {
    ...sanitizedDocumentData,
    line_items: (sanitizedDocumentData.line_items || []).map((item) => {
      const description = item.description_bg ?? item.description ?? item.description_raw;

      if (!isLikelyGarbledText(description)) {
        return item;
      }

      reviewReasons.add("unclear_image");

      return {
        ...item,
        description: null,
        description_bg: null,
        description_raw: null
      };
    })
  };

  for (const reason of cleanedDocumentData.review_reasons || []) {
    const normalizedReason = reviewReasonAliases[reason] || reason;

    if (allowedReviewReasons.has(normalizedReason)) {
      reviewReasons.add(normalizedReason);
    }
  }

  for (const [path, reason] of requiredAccountingFields) {
    const value = getValue(cleanedDocumentData, path);

    if (value === null || value === undefined || value === "") {
      reviewReasons.add(reason);
    }
  }

  if (cleanedDocumentData.document_type === "invoice" && !cleanedDocumentData.recipient?.name) {
    reviewReasons.add("recipient_name_missing");
  }

  return {
    ...cleanedDocumentData,
    needs_review: reviewReasons.size > 0 || cleanedDocumentData.needs_review,
    review_reasons: [...reviewReasons]
  };
}

module.exports = {
  applyReviewRules,
};
