const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("node:fs");
const { findDocumentById, markDocumentExported } = require("./documentRepository");
const { cleanDisplayText } = require("../utils/textQuality");
const { config } = require("../config/env");

const regularFontCandidates = [
  config.pdfFontRegularPath,
  "C:\\Windows\\Fonts\\arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf"
].filter(Boolean);

const boldFontCandidates = [
  config.pdfFontBoldPath,
  "C:\\Windows\\Fonts\\arialbd.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
].filter(Boolean);

const documentTypeLabels = {
  invoice: "Фактура",
  receipt: "Касова бележка",
  credit_note: "Кредитно известие",
  other: "Друг документ"
};

const paymentMethodLabels = {
  cash: "В брой",
  card: "Карта",
  bank_transfer: "Банков превод",
  online: "Онлайн",
  mixed: "Смесено",
  unknown: "Неизвестно"
};

const reviewReasonLabels = {
  document_number_missing: "Липсва номер на документа",
  issue_date_missing: "Липсва дата",
  supplier_name_missing: "Липсва доставчик",
  recipient_name_missing: "Липсва получател",
  currency_missing: "Липсва валута",
  subtotal_missing: "Липсва сума без ДДС",
  total_missing: "Липсва крайна сума",
  vat_missing: "Липсва ДДС информация",
  payment_method_missing: "Липсва начин на плащане",
  amount_mismatch: "Има несъответствие в сумите",
  low_confidence: "Ниска увереност при разчитане",
  unclear_image: "Изображението не е достатъчно ясно"
};

function valueOrEmpty(value) {
  return value === null || value === undefined ? "" : cleanDisplayText(value);
}

function findExistingFont(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function registerPdfFonts(pdf) {
  const regularFont = findExistingFont(regularFontCandidates);
  const boldFont = findExistingFont(boldFontCandidates);

  if (regularFont) {
    pdf.registerFont("AppRegular", regularFont);
  }

  if (boldFont) {
    pdf.registerFont("AppBold", boldFont);
  }

  return {
    regular: regularFont ? "AppRegular" : "Helvetica",
    bold: boldFont ? "AppBold" : "Helvetica-Bold"
  };
}

function buildFileBaseName(document) {
  const number = document.data?.document_number || document.id;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `document-${String(number).replace(/[^a-zA-Z0-9_-]+/g, "-")}-${timestamp}`;
}

function getDocumentTypeLabel(type) {
  return documentTypeLabels[type] || type;
}

function getPaymentMethodLabel(method) {
  return paymentMethodLabels[method] || method;
}

function getReviewReasonLabel(reason) {
  return reviewReasonLabels[reason] || reason;
}

function getSummaryRows(document) {
  const data = document.data || {};

  return [
    ["Тип документ", getDocumentTypeLabel(data.document_type)],
    ["Номер на документ", data.document_number],
    ["Дата на издаване", data.issue_date],
    ["Доставчик", data.supplier?.name],
    ["ЕИК доставчик", data.supplier?.tax_id],
    ["ДДС номер доставчик", data.supplier?.vat_id],
    ["Получател", data.recipient?.name],
    ["ЕИК получател", data.recipient?.tax_id],
    ["Валута", data.currency],
    ["Сума без ДДС", data.amounts?.subtotal_without_vat],
    ["Отстъпка", data.amounts?.discount],
    ["ДДС", data.amounts?.total_vat ?? data.vat?.amount],
    ["Обща сума с ДДС", data.amounts?.total_with_vat],
    ["ДДС ставка", data.vat?.rate],
    ["Начин на плащане", getPaymentMethodLabel(data.payment?.method)],
    ["IBAN", data.payment?.iban],
    ["Банка", data.payment?.bank_name],
    ["Нуждае се от преглед", data.needs_review ? "Да" : "Не"],
    ["Причини за преглед", (data.review_reasons || []).map(getReviewReasonLabel).join(", ")]
  ];
}

function getLineItemDescription(item) {
  return item.description_bg ?? item.description ?? item.description_raw;
}

function ensurePdfSpace(pdf, neededHeight) {
  if (pdf.y + neededHeight > pdf.page.height - pdf.page.margins.bottom) {
    pdf.addPage();
  }
}

function drawSummaryRow(pdf, fonts, label, value) {
  const startX = pdf.page.margins.left;
  const startY = pdf.y;
  const labelWidth = 145;
  const valueWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - labelWidth;
  const text = String(valueOrEmpty(value));
  const labelHeight = pdf.heightOfString(label, { width: labelWidth });
  const valueHeight = pdf.heightOfString(text || "-", { width: valueWidth });
  const rowHeight = Math.max(labelHeight, valueHeight, 16) + 5;

  ensurePdfSpace(pdf, rowHeight);

  pdf.font(fonts.bold).fontSize(9).text(label, startX, startY, {
    width: labelWidth,
    continued: false
  });
  pdf.font(fonts.regular).fontSize(9).text(text || "-", startX + labelWidth, startY, {
    width: valueWidth,
    continued: false
  });
  pdf.y = startY + rowHeight;
}

function drawLineItem(pdf, fonts, item, index) {
  const startX = pdf.page.margins.left;
  const descriptionWidth = 245;
  const metaWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - descriptionWidth;
  const description = `${index + 1}. ${valueOrEmpty(getLineItemDescription(item)) || "-"}`;
  const meta = [
    `Кол.: ${valueOrEmpty(item.quantity) || "-"}`,
    `Ед. цена: ${valueOrEmpty(item.unit_price_without_vat) || "-"}`,
    `ДДС: ${valueOrEmpty(item.vat_rate) || "-"}`,
    `Общо: ${valueOrEmpty(item.total_with_vat) || "-"}`
  ].join(" | ");
  const descriptionHeight = pdf.heightOfString(description, { width: descriptionWidth });
  const metaHeight = pdf.heightOfString(meta, { width: metaWidth });
  const rowHeight = Math.max(descriptionHeight, metaHeight, 18) + 8;
  const startY = pdf.y;

  ensurePdfSpace(pdf, rowHeight);

  pdf.font(fonts.bold).fontSize(9).text(description, startX, startY, {
    width: descriptionWidth,
    continued: false
  });
  pdf.font(fonts.regular).fontSize(9).text(meta, startX + descriptionWidth, startY, {
    width: metaWidth,
    continued: false
  });
  pdf.moveTo(startX, startY + rowHeight - 3)
    .lineTo(pdf.page.width - pdf.page.margins.right, startY + rowHeight - 3)
    .strokeColor("#dddddd")
    .stroke();
  pdf.y = startY + rowHeight;
}

async function generateExcelExport(documentId) {
  const document = await findDocumentById(documentId);
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet("Обобщение");
  const itemsSheet = workbook.addWorksheet("Редове");

  summarySheet.columns = [
    { header: "Поле", key: "field", width: 28 },
    { header: "Стойност", key: "value", width: 42 }
  ];

  for (const [field, value] of getSummaryRows(document)) {
    summarySheet.addRow({ field, value: valueOrEmpty(value) });
  }

  summarySheet.getRow(1).font = { bold: true };

  itemsSheet.columns = [
    { header: "Описание", key: "description", width: 42 },
    { header: "Количество", key: "quantity", width: 14 },
    { header: "Ед. цена без ДДС", key: "unit_price_without_vat", width: 22 },
    { header: "ДДС ставка", key: "vat_rate", width: 14 },
    { header: "Сума без ДДС", key: "total_without_vat", width: 20 },
    { header: "Сума с ДДС", key: "total_with_vat", width: 18 }
  ];

  for (const item of document.data?.line_items || []) {
    itemsSheet.addRow({
      description: valueOrEmpty(getLineItemDescription(item)),
      quantity: valueOrEmpty(item.quantity),
      unit_price_without_vat: valueOrEmpty(item.unit_price_without_vat),
      vat_rate: valueOrEmpty(item.vat_rate),
      total_without_vat: valueOrEmpty(item.total_without_vat),
      total_with_vat: valueOrEmpty(item.total_with_vat)
    });
  }

  itemsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  await markDocumentExported(documentId, "excel");

  return {
    buffer: Buffer.from(buffer),
    filename: `${buildFileBaseName(document)}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
}

function generatePdfBuffer(document) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ margin: 48 });

    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const fonts = registerPdfFonts(pdf);

    pdf.font(fonts.bold).fontSize(18).text("Експорт на фактура / касова бележка");
    pdf.moveDown(0.8);

    for (const [field, value] of getSummaryRows(document)) {
      drawSummaryRow(pdf, fonts, field, value);
    }

    pdf.moveDown(0.8);
    ensurePdfSpace(pdf, 30);
    pdf.font(fonts.bold).fontSize(13).text("Редове / артикули");
    pdf.moveDown(0.5);

    const items = document.data?.line_items || [];
    if (items.length === 0) {
      pdf.font(fonts.regular).fontSize(10).text("Няма извлечени редове.");
    } else {
      items.forEach((item, index) => {
        drawLineItem(pdf, fonts, item, index);
      });
    }

    pdf.end();
  });
}

async function generatePdfExport(documentId) {
  const document = await findDocumentById(documentId);
  const buffer = await generatePdfBuffer(document);
  await markDocumentExported(documentId, "pdf");

  return {
    buffer,
    filename: `${buildFileBaseName(document)}.pdf`,
    contentType: "application/pdf"
  };
}

module.exports = {
  generateExcelExport,
  generatePdfExport
};
