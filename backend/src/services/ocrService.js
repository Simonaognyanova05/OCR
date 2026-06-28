const OpenAI = require("openai");
const { config, assertConfig } = require("../config/env");
const { expenseDocumentSchema } = require("../models/expenseDocumentSchema");
const { imageToDataUrl } = require("../utils/fileUtils");

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

  const client = new OpenAI({ apiKey: config.apiKey });
  const imageInputs = await buildImageInputs(imagePaths);

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
              "Извличаш структурирани данни от фактури и касови бележки за счетоводни процеси.",
              "Основните потребители са малки фирми, счетоводители, самонаети лица и онлайн магазини.",
              "Фокусирай се върху номер на документ, дата, доставчик, получател, ДДС, суми, валута и начин на плащане.",
              "Всички текстови полета, които ще вижда потребителят, трябва да бъдат на български език.",
              "Възможно е изображенията да са завъртени. Прочети документа според реалната ориентация на текста.",
              "Ако има няколко страници, извлечи един общ документ от всички подадени изображения.",
              "За редовете попълвай description_bg с чисто българско име на продукт/услуга само когато текстът е ясно четим.",
              "За редовете попълвай description_raw с оригиналния видим текст само когато е ясно четим.",
              "Никога не копирай OCR шум, mojibake, случайни символи или транслитериран боклук в description_bg или description_raw.",
              "Ако описанието на продукт/услуга е нечетимо, върни description_bg и description_raw като null, но все пак извлечи количество и суми.",
              "Връщай само данни, които се виждат в документа.",
              "Не измисляй липсващи стойности. Използвай null, когато стойността липсва или е несигурна.",
              "За български документи запази кирилицата точно. Не транслитерирай кирилица към латиница.",
              "Ако доставчик, получател или описание на ред не са четими, върни null вместо предположение или счупен текст.",
              "Използвай ISO кодове за валута като BGN, EUR или USD, когато е възможно.",
              "Нормализирай видимите дати до YYYY-MM-DD.",
              "Задай needs_review на true, когато номерът, датата, доставчикът, общата сума, валутата или ДДС данните липсват или са несъответстващи.",
              "Използвай само тези review_reasons кодове при нужда: document_number_missing, issue_date_missing, supplier_name_missing, recipient_name_missing, currency_missing, subtotal_missing, total_missing, vat_missing, payment_method_missing, amount_mismatch, low_confidence, unclear_image."
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

  return normalizeResponse(response);
}

async function extractExpenseDocument(filePath) {
  return extractExpenseDocumentFromImages([filePath]);
}

module.exports = {
  extractExpenseDocument,
  extractExpenseDocumentFromImages
};
