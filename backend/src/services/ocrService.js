const OpenAI = require("openai");
const { config, assertConfig } = require("../config/env");
const { expenseDocumentSchema } = require("../models/expenseDocumentSchema");
const { imageToDataUrl } = require("../utils/fileUtils");

function normalizeResponse(response) {
  const text = response.output_text;

  if (!text) {
    throw new Error("The model returned no structured output.");
  }

  return JSON.parse(text);
}

async function extractExpenseDocument(filePath) {
  assertConfig();

  const client = new OpenAI({ apiKey: config.apiKey });
  const imageUrl = await imageToDataUrl(filePath);

  const response = await client.responses.create({
    model: config.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You extract structured data from invoices and receipts for accounting workflows.",
              "The primary customers are small businesses, accountants, freelancers, and online stores.",
              "Focus on invoice number, date, supplier, recipient, VAT, totals, currency, and payment method.",
              "Return only data that is visible in the document.",
              "Do not guess missing values. Use null when a value is missing or uncertain.",
              "Use ISO currency codes such as BGN, EUR, or USD when possible.",
              "Normalize visible dates to YYYY-MM-DD.",
              "Set needs_review to true when document number, issue date, supplier name, total, currency, or VAT data is missing or inconsistent.",
              "Use only these review_reasons codes when needed: document_number_missing, issue_date_missing, supplier_name_missing, recipient_name_missing, currency_missing, subtotal_missing, total_missing, vat_missing, payment_method_missing, amount_mismatch, low_confidence, unclear_image."
            ].join(" ")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract accounting-ready data from this invoice or receipt image."
          },
          {
            type: "input_image",
            image_url: imageUrl
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "expense_document",
        strict: true,
        schema: expenseDocumentSchema
      }
    }
  });

  return normalizeResponse(response);
}

module.exports = {
  extractExpenseDocument,
};

