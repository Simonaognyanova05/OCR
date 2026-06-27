import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { config, assertConfig } from "./config.js";
import { expenseDocumentSchema } from "./schema.js";

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function getImageMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext];

  if (!mimeType) {
    throw new Error(`Unsupported file type "${ext}". Start with PNG, JPG, JPEG, or WEBP.`);
  }

  return mimeType;
}

async function imageToDataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  const mimeType = getImageMimeType(filePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeResponse(response) {
  const text = response.output_text;

  if (!text) {
    throw new Error("The model returned no structured output.");
  }

  return JSON.parse(text);
}

export async function extractExpenseDocument(filePath) {
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
              "You extract structured data from invoices, receipts, and expense documents.",
              "Return only data that is visible in the document.",
              "Do not guess missing values. Use null when a value is missing or uncertain.",
              "Set needs_review to true when total, date, or merchant name is missing."
            ].join(" ")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract the expense document data from this image."
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

