const { sanitizeDocumentDataForStorage } = require("../utils/documentSanitizer");
const { isLikelyGarbledText } = require("../utils/textQuality");

const requiredAccountingFields = [
  ["documentNumber", "document_number_missing"],
  ["issueDate", "issue_date_missing"],
  ["supplierName", "supplier_name_missing"],
  ["currency", "currency_missing"],
  ["totalAmount", "total_missing"],
  ["vatAmount", "vat_missing"],
  ["paymentMethod", "payment_method_missing"]
];

function getValue(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function applyReviewRules(documentData) {
  const reviewReasons = new Set();
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

    if (value === null || value === undefined || value === "") {
      reviewReasons.add(reason);
    }
  }

  if (cleanedDocumentData.documentType === "invoice" && !cleanedDocumentData.recipientName) {
    reviewReasons.add("recipient_name_missing");
  }

  if (cleanedDocumentData.confidence < 0.75) {
    reviewReasons.add("low_confidence");
  }

  return {
    ...cleanedDocumentData,
    needsReview: reviewReasons.size > 0,
    reviewReasons: [...reviewReasons]
  };
}

module.exports = {
  applyReviewRules
};
