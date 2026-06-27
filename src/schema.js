export const expenseDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "document_type",
    "merchant_name",
    "document_number",
    "issue_date",
    "currency",
    "subtotal",
    "tax",
    "total",
    "confidence",
    "needs_review",
    "review_reason",
    "line_items"
  ],
  properties: {
    document_type: {
      type: ["string", "null"],
      enum: ["invoice", "receipt", "credit_note", "other", null]
    },
    merchant_name: { type: ["string", "null"] },
    document_number: { type: ["string", "null"] },
    issue_date: {
      type: ["string", "null"],
      description: "Date in YYYY-MM-DD format when visible."
    },
    currency: { type: ["string", "null"] },
    subtotal: { type: ["number", "null"] },
    tax: { type: ["number", "null"] },
    total: { type: ["number", "null"] },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    needs_review: { type: "boolean" },
    review_reason: { type: ["string", "null"] },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "quantity", "unit_price", "total"],
        properties: {
          description: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          total: { type: ["number", "null"] }
        }
      }
    }
  }
};

