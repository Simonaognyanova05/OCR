export const expenseDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "document_type",
    "document_number",
    "issue_date",
    "supplier",
    "recipient",
    "currency",
    "amounts",
    "vat",
    "payment",
    "confidence",
    "needs_review",
    "review_reasons",
    "line_items"
  ],
  properties: {
    document_type: {
      type: ["string", "null"],
      enum: ["invoice", "receipt", "credit_note", "other", null]
    },
    document_number: { type: ["string", "null"] },
    issue_date: {
      type: ["string", "null"],
      description: "Date in YYYY-MM-DD format when visible."
    },
    supplier: {
      type: "object",
      additionalProperties: false,
      required: ["name", "tax_id", "vat_id", "address"],
      properties: {
        name: { type: ["string", "null"] },
        tax_id: {
          type: ["string", "null"],
          description: "Company or personal tax identifier, such as Bulgarian EIK/BULSTAT when visible."
        },
        vat_id: {
          type: ["string", "null"],
          description: "VAT registration number, such as BG-prefixed VAT ID when visible."
        },
        address: { type: ["string", "null"] }
      }
    },
    recipient: {
      type: "object",
      additionalProperties: false,
      required: ["name", "tax_id", "vat_id", "address"],
      properties: {
        name: { type: ["string", "null"] },
        tax_id: { type: ["string", "null"] },
        vat_id: { type: ["string", "null"] },
        address: { type: ["string", "null"] }
      }
    },
    currency: { type: ["string", "null"] },
    amounts: {
      type: "object",
      additionalProperties: false,
      required: ["subtotal_without_vat", "discount", "total_vat", "total_with_vat"],
      properties: {
        subtotal_without_vat: { type: ["number", "null"] },
        discount: { type: ["number", "null"] },
        total_vat: { type: ["number", "null"] },
        total_with_vat: { type: ["number", "null"] }
      }
    },
    vat: {
      type: "object",
      additionalProperties: false,
      required: ["rate", "amount", "breakdown"],
      properties: {
        rate: { type: ["number", "null"] },
        amount: { type: ["number", "null"] },
        breakdown: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["rate", "base", "amount"],
            properties: {
              rate: { type: ["number", "null"] },
              base: { type: ["number", "null"] },
              amount: { type: ["number", "null"] }
            }
          }
        }
      }
    },
    payment: {
      type: "object",
      additionalProperties: false,
      required: ["method", "iban", "bank_name", "paid"],
      properties: {
        method: {
          type: ["string", "null"],
          enum: ["cash", "card", "bank_transfer", "online", "mixed", "unknown", null]
        },
        iban: { type: ["string", "null"] },
        bank_name: { type: ["string", "null"] },
        paid: { type: ["boolean", "null"] }
      }
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    needs_review: { type: "boolean" },
    review_reasons: {
      type: "array",
      items: {
        type: "string",
        enum: [
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
        ]
      }
    },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "description",
          "quantity",
          "unit_price_without_vat",
          "vat_rate",
          "total_without_vat",
          "total_with_vat"
        ],
        properties: {
          description: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price_without_vat: { type: ["number", "null"] },
          vat_rate: { type: ["number", "null"] },
          total_without_vat: { type: ["number", "null"] },
          total_with_vat: { type: ["number", "null"] }
        }
      }
    }
  }
};
