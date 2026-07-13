const OpenAI = require("openai");
const { config, assertConfig } = require("../config/env");
const { expenseDocumentSchema } = require("../models/expenseDocumentSchema");
const { imageToDataUrl } = require("../utils/fileUtils");
const { HttpError } = require("../utils/httpError");

function normalizeResponse(response) {
  const text = response.output_text;

  if (!text) {
    throw new Error("Моделът не върна структуриран резултат.");
  }

  return JSON.parse(text);
}

async function buildImageInputs(imagePaths) {
  const images = [];

  for (const imagePath of imagePaths) {
    images.push({
      type: "input_image",
      image_url: await imageToDataUrl(imagePath)
    });
  }

  return images;
}

async function extractExpenseDocumentFromImages(imagePaths) {
  assertConfig();

  if (!imagePaths.length) {
    throw new Error("Няма изображения за OCR обработка.");
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.ocrRequestTimeoutMs
  });
  const imageInputs = await buildImageInputs(imagePaths);

  let response;

  try {
    response = await client.responses.create({
    model: config.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "Извличаш структурирани данни от фактури и касови бележки за счетоводни процеси.",
              "Върни JSON само по зададената schema с camelCase полета.",
              "documentType трябва да бъде invoice или receipt.",
              "Извличай documentNumber, issueDate, supplierName, supplierVatNumber, recipientName, recipientVatNumber, totalAmount, vatAmount, netAmount, currency, paymentMethod, category, items и confidence.",
              "currency трябва да бъде BGN, EUR, USD или null.",
              "paymentMethod трябва да бъде cash, card, bank_transfer или unknown.",
              "category е кратка счетоводна категория на български, например Гориво, Офис консумативи, Храна, Услуги или null.",
              "items съдържа name, quantity, unitPrice и totalPrice.",
              "Всички видими текстови стойности трябва да бъдат на български език, когато е приложимо.",
              "Възможно е изображенията да са завъртени. Прочети документа според реалната ориентация на текста.",
              "Ако има няколко страници, извлечи един общ документ от всички подадени изображения.",
              "За items.name попълвай чисто име на продукт/услуга само когато текстът е ясно четим. Ако е нечетим, използвай празен string.",
              "Никога не копирай OCR шум, mojibake, случайни символи или транслитериран боклук.",
              "Връщай само данни, които се виждат в документа.",
              "Не измисляй липсващи стойности. Използвай null, когато стойността липсва или е несигурна.",
              "За български документи запази кирилицата точно. Не транслитерирай кирилица към латиница.",
              "Нормализирай видимите дати до YYYY-MM-DD.",
              "confidence е число от 0 до 1 за увереността в извлечените данни."
            ].join(" ")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Извлечи счетоводно готови данни от тези изображения на фактура или касова бележка."
          },
          ...imageInputs
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
  } catch (error) {
    if (error.name === "APIConnectionTimeoutError" || error.code === "ETIMEDOUT" || /timeout/i.test(error.message || "")) {
      const timeoutError = new HttpError(504, "OCR обработката отне твърде дълго. Опитай отново или качи по-ясен документ.");
      timeoutError.code = "ocr_request_timeout";
      throw timeoutError;
    }

    throw error;
  }

  return normalizeResponse(response);
}

async function extractExpenseDocument(filePath) {
  return extractExpenseDocumentFromImages([filePath]);
}

module.exports = {
  extractExpenseDocument,
  extractExpenseDocumentFromImages
};
