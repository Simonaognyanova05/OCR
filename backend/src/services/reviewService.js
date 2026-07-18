const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");
const { isLikelyGarbledText } = require("../utils/textQuality");

const requiredAccountingFields = [
  ["documentType", "document_type_missing"],
  ["issueDate", "issue_date_missing"],
  ["supplierName", "supplier_name_missing"],
  ["totalAmount", "total_missing"],
  ["netAmount", "net_amount_missing"]
];

const recommendedAccountingFields = [
  ["documentNumber", "document_number_missing"],
  ["currency", "currency_missing"],
  ["vatAmount", "vat_missing"],
  ["paymentMethod", "payment_method_missing"]
];

const generatedWarnings = new Set([
  "amount_mismatch",
  "future_issue_date",
  "item_amount_mismatch",
  "possible_duplicate",
  "recipient_vat_missing",
  "vat_rate_unusual"
]);

const supportedCurrencies = new Set(["BGN", "EUR", "USD"]);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function getValue(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function isMissing(value) {
  return value === null || value === undefined || value === "";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function addWarning(warnings, warning) {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function isValidIsoDate(value) {
  if (typeof value !== "string" || !isoDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function isFutureDate(value) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return parsed > today;
}

function hasVatNumber(value) {
  return typeof value === "string" && value.trim().length >= 8;
}

function addAmountReviewRules(cleanedDocumentData, reviewReasons, warnings) {
  const totalAmount = toNumber(cleanedDocumentData.totalAmount);
  const netAmount = toNumber(cleanedDocumentData.netAmount);
  const vatAmount = toNumber(cleanedDocumentData.vatAmount);

  if (totalAmount !== null && totalAmount <= 0) {
    reviewReasons.add("non_positive_total");
  }

  if (netAmount !== null && netAmount < 0) {
    reviewReasons.add("negative_net_amount");
  }

  if (vatAmount !== null && vatAmount < 0) {
    reviewReasons.add("negative_vat_amount");
  }

  if (totalAmount !== null && vatAmount !== null && vatAmount > totalAmount) {
    reviewReasons.add("vat_exceeds_total");
  }

  if (totalAmount !== null && netAmount !== null && vatAmount !== null) {
    const expectedTotal = netAmount + vatAmount;
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      addWarning(warnings, "amount_mismatch");
      reviewReasons.add("amount_mismatch");
    }

    if (totalAmount > 0 && vatAmount > 0) {
      const vatRate = vatAmount / netAmount;
      if (netAmount > 0 && ![0.09, 0.2].some((rate) => Math.abs(vatRate - rate) <= 0.015)) {
        addWarning(warnings, "vat_rate_unusual");
      }
    }
  }
}

function addItemReviewRules(cleanedDocumentData, warnings) {
  for (const item of cleanedDocumentData.items || []) {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unitPrice);
    const totalPrice = toNumber(item.totalPrice);

    if (quantity === null || unitPrice === null || totalPrice === null) {
      continue;
    }

    if (Math.abs(quantity * unitPrice - totalPrice) > 0.02) {
      addWarning(warnings, "item_amount_mismatch");
      return;
    }
  }
}

function applyReviewRules(documentData) {
  const reviewReasons = new Set();
  const sanitizedDocumentData = sanitizeDocumentDataForStorage(documentData);
  const warnings = (sanitizedDocumentData.warnings || []).filter((warning) => !generatedWarnings.has(warning));
  const cleanedDocumentData = {
    ...sanitizedDocumentData,
    items: (sanitizedDocumentData.items || []).map((item) => {
      if (!isLikelyGarbledText(item.name)) {
        return item;
      }

      reviewReasons.add("unclear_image");

      return {
        ...item,
        name: ""
      };
    })
  };

  for (const [path, reason] of requiredAccountingFields) {
    const value = getValue(cleanedDocumentData, path);

    if (isMissing(value)) {
      reviewReasons.add(reason);
    }
  }

  for (const [path, reason] of recommendedAccountingFields) {
    const value = getValue(cleanedDocumentData, path);

    if (isMissing(value)) {
      reviewReasons.add(reason);
    }
  }

  if (cleanedDocumentData.issueDate) {
    if (!isValidIsoDate(cleanedDocumentData.issueDate)) {
      reviewReasons.add("invalid_issue_date");
    } else if (isFutureDate(cleanedDocumentData.issueDate)) {
      addWarning(warnings, "future_issue_date");
      reviewReasons.add("future_issue_date");
    }
  }

  if (cleanedDocumentData.currency && !supportedCurrencies.has(cleanedDocumentData.currency)) {
    reviewReasons.add("unsupported_currency");
  }

  if (cleanedDocumentData.paymentMethod === "unknown") {
    reviewReasons.add("payment_method_unknown");
  }

  if (cleanedDocumentData.documentType === "invoice" && !cleanedDocumentData.recipientName) {
    reviewReasons.add("recipient_name_missing");
  }

  if (cleanedDocumentData.documentType === "invoice" && !hasVatNumber(cleanedDocumentData.supplierVatNumber)) {
    reviewReasons.add("supplier_vat_missing");
  }

  if (cleanedDocumentData.documentType === "invoice" && !hasVatNumber(cleanedDocumentData.recipientVatNumber)) {
    addWarning(warnings, "recipient_vat_missing");
  }

  addAmountReviewRules(cleanedDocumentData, reviewReasons, warnings);
  addItemReviewRules(cleanedDocumentData, warnings);

  if (cleanedDocumentData.confidence < 0.75) {
    reviewReasons.add("low_confidence");
  }

  return {
    ...cleanedDocumentData,
    needsReview: reviewReasons.size > 0,
    reviewReasons: [...reviewReasons],
    warnings
  };
}

module.exports = {
  applyReviewRules,
  addWarning
};
