const { sanitizeTextForStorage } = require("./textQuality");

const documentTypes = new Set(["invoice", "receipt"]);
const currencies = new Set(["BGN", "EUR", "USD"]);
const paymentMethods = new Set(["cash", "card", "bank_transfer", "unknown"]);

function sanitizeNullableText(value, options = {}) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return sanitizeTextForStorage(value, options);
}

function sanitizeEnum(value, allowedValues) {
  const sanitized = sanitizeNullableText(value);

  return allowedValues.has(sanitized) ? sanitized : null;
}

function sanitizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sanitizeBoolean(value) {
  return value === true;
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeNullableText(item))
    .filter((item) => typeof item === "string" && item.length > 0);
}

function sanitizeItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const source = item && typeof item === "object" ? item : {};

    return {
      name: sanitizeNullableText(source.name, { nullIfGarbled: true }) || "",
      quantity: sanitizeNullableNumber(source.quantity),
      unitPrice: sanitizeNullableNumber(source.unitPrice),
      totalPrice: sanitizeNullableNumber(source.totalPrice)
    };
  });
}

function sanitizeDocumentDataForStorage(documentData) {
  return {
    documentType: sanitizeEnum(documentData?.documentType, documentTypes),
    documentNumber: sanitizeNullableText(documentData?.documentNumber),
    issueDate: sanitizeNullableText(documentData?.issueDate),
    supplierName: sanitizeNullableText(documentData?.supplierName, { nullIfGarbled: true }),
    supplierVatNumber: sanitizeNullableText(documentData?.supplierVatNumber),
    recipientName: sanitizeNullableText(documentData?.recipientName, { nullIfGarbled: true }),
    recipientVatNumber: sanitizeNullableText(documentData?.recipientVatNumber),
    totalAmount: sanitizeNullableNumber(documentData?.totalAmount),
    vatAmount: sanitizeNullableNumber(documentData?.vatAmount),
    netAmount: sanitizeNullableNumber(documentData?.netAmount),
    currency: sanitizeEnum(documentData?.currency, currencies),
    paymentMethod: sanitizeEnum(documentData?.paymentMethod, paymentMethods),
    category: sanitizeNullableText(documentData?.category, { nullIfGarbled: true }),
    items: sanitizeItems(documentData?.items),
    confidence: sanitizeNullableNumber(documentData?.confidence),
    needsReview: sanitizeBoolean(documentData?.needsReview),
    reviewReasons: sanitizeStringArray(documentData?.reviewReasons),
    warnings: sanitizeStringArray(documentData?.warnings)
  };
}

module.exports = {
  sanitizeDocumentDataForStorage
};
