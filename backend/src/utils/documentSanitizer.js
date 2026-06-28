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
  const sanitized = sanitizeTextTree(documentData);

  return {
    ...sanitized,
    supplier: sanitizeParty(sanitized.supplier),
    recipient: sanitizeParty(sanitized.recipient),
    line_items: (sanitized.line_items || []).map((item) => ({
      ...item,
      description: sanitizeTextForStorage(item.description, { nullIfGarbled: true }),
      description_bg: sanitizeTextForStorage(item.description_bg, { nullIfGarbled: true }),
      description_raw: sanitizeTextForStorage(item.description_raw, { nullIfGarbled: true })
    }))
  };
}

function sanitizeParty(party) {
  if (!party) {
    return party;
  }

  return {
    ...party,
    name: sanitizeTextForStorage(party.name, { nullIfGarbled: true }),
    address: sanitizeTextForStorage(party.address, { nullIfGarbled: true })
  };
}

module.exports = {
  sanitizeDocumentDataForStorage,
};
