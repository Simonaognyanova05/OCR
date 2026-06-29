const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");
const { isLikelyGarbledText } = require("../utils/textQuality");

const requiredAccountingFields = [
  ["issueDate", "issue_date_missing"],
  ["supplierName", "supplier_name_missing"],
  ["totalAmount", "total_missing"]
];

const recommendedAccountingFields = [
  ["documentNumber", "document_number_missing"],
  ["currency", "currency_missing"],
  ["vatAmount", "vat_missing"],
  ["paymentMethod", "payment_method_missing"]
];

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

function applyReviewRules(documentData) {
  const reviewReasons = new Set();
  const warnings = (documentData?.warnings || []).filter(
    (warning) => !["amount_mismatch", "possible_duplicate"].includes(warning)
  );
  const sanitizedDocumentData = sanitizeDocumentDataForStorage(documentData);
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

  if (cleanedDocumentData.documentType === "invoice" && !cleanedDocumentData.recipientName) {
    reviewReasons.add("recipient_name_missing");
  }

  const totalAmount = toNumber(cleanedDocumentData.totalAmount);
  const netAmount = toNumber(cleanedDocumentData.netAmount);
  const vatAmount = toNumber(cleanedDocumentData.vatAmount);

  if (totalAmount !== null && netAmount !== null && vatAmount !== null) {
    const expectedTotal = netAmount + vatAmount;
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      addWarning(warnings, "amount_mismatch");
    }
  }

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
