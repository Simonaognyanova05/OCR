const expenseDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "documentNumber",
    "issueDate",
    "supplierName",
    "supplierVatNumber",
    "recipientName",
    "recipientVatNumber",
    "totalAmount",
    "vatAmount",
    "netAmount",
    "currency",
    "paymentMethod",
    "category",
    "items",
    "confidence"
  ],
  properties: {
    documentType: {
      type: ["string", "null"],
      enum: ["invoice", "receipt", null]
    },
    documentNumber: { type: ["string", "null"] },
    issueDate: {
      type: ["string", "null"],
      description: "Date in YYYY-MM-DD format when visible."
    },
    supplierName: { type: ["string", "null"] },
    supplierVatNumber: { type: ["string", "null"] },
    recipientName: { type: ["string", "null"] },
    recipientVatNumber: { type: ["string", "null"] },
    totalAmount: { type: ["number", "null"] },
    vatAmount: { type: ["number", "null"] },
    netAmount: { type: ["number", "null"] },
    currency: {
      type: ["string", "null"],
      enum: ["BGN", "EUR", "USD", null]
    },
    paymentMethod: {
      type: "string",
      enum: ["cash", "card", "bank_transfer", "unknown"]
    },
    category: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unitPrice", "totalPrice"],
        properties: {
          name: {
            type: "string",
            description: "Clean Bulgarian product/service name. Use an empty string if unreadable."
          },
          quantity: { type: ["number", "null"] },
          unitPrice: { type: ["number", "null"] },
          totalPrice: { type: ["number", "null"] }
        }
      }
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    }
  }
};

module.exports = {
  expenseDocumentSchema
};
