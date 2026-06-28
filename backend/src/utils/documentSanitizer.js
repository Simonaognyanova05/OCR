const { sanitizeTextForStorage } = require("./textQuality");

function sanitizeTextTree(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeTextTree);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeTextTree(nestedValue)])
    );
  }

  return sanitizeTextForStorage(value);
}

function sanitizeDocumentDataForStorage(documentData) {
  const sanitized = sanitizeTextTree(documentData || {});

  return {
    ...sanitized,
    supplierName: sanitizeTextForStorage(sanitized.supplierName, { nullIfGarbled: true }),
    recipientName: sanitizeTextForStorage(sanitized.recipientName, { nullIfGarbled: true }),
    category: sanitizeTextForStorage(sanitized.category, { nullIfGarbled: true }),
    items: (sanitized.items || []).map((item) => ({
      ...item,
      name: sanitizeTextForStorage(item.name, { nullIfGarbled: true }) || ""
    }))
  };
}

module.exports = {
  sanitizeDocumentDataForStorage
};
