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
  other: "Друг документ"
};

const paymentMethodLabels = {
  cash: "В брой",
  card: "Карта",
  bank_transfer: "Банков превод",
  unknown: "Неизвестно"
};

const reviewReasonLabels = {
  document_number_missing: "Липсва номер на документа",
  issue_date_missing: "Липсва дата",
  supplier_name_missing: "Липсва доставчик",
  recipient_name_missing: "Липсва получател",
  currency_missing: "Липсва валута",
  total_missing: "Липсва крайна сума",
  vat_missing: "Липсва ДДС информация",
  payment_method_missing: "Липсва начин на плащане",
  low_confidence: "Ниска увереност при разчитане",
  unclear_image: "Изображението не е достатъчно ясно"
};

function valueOrEmpty(value) {
  return value === null || value === undefined ? "" : cleanDisplayText(value);
}

function getDataValue(data, newPath, fallbackPath) {
  const get = (path) => path.split(".").reduce((current, key) => current?.[key], data);
  return get(newPath) ?? (fallbackPath ? get(fallbackPath) : undefined);
}

function findExistingFont(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function registerPdfFonts(pdf) {
  const regularFont = findExistingFont(regularFontCandidates);
  const boldFont = findExistingFont(boldFontCandidates);

  if (regularFont) pdf.registerFont("AppRegular", regularFont);
  if (boldFont) pdf.registerFont("AppBold", boldFont);

  return {
    regular: regularFont ? "AppRegular" : "Helvetica",
    bold: boldFont ? "AppBold" : "Helvetica-Bold"
  };
}

function buildFileBaseName(document) {
  const number = document.data?.documentNumber || document.data?.document_number || document.id;
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

function getItems(data) {
  if (Array.isArray(data.items)) {
    return data.items;
  }

  return (data.line_items || []).map((item) => ({
    name: item.description_bg ?? item.description ?? item.description_raw ?? "",
    quantity: item.quantity,
    unitPrice: item.unit_price_without_vat,
    totalPrice: item.total_with_vat
  }));
}

function getSummaryRows(document) {
  const data = document.data || {};

  return [
    ["Тип документ", getDocumentTypeLabel(getDataValue(data, "documentType", "document_type"))],
    ["Номер на документ", getDataValue(data, "documentNumber", "document_number")],
    ["Дата на издаване", getDataValue(data, "issueDate", "issue_date")],
    ["Доставчик", getDataValue(data, "supplierName", "supplier.name")],
    ["ДДС номер доставчик", getDataValue(data, "supplierVatNumber", "supplier.vat_id")],
    ["Получател", getDataValue(data, "recipientName", "recipient.name")],
    ["ДДС номер получател", getDataValue(data, "recipientVatNumber", "recipient.vat_id")],
    ["Категория", data.category],
    ["Валута", data.currency],
    ["Сума без ДДС", getDataValue(data, "netAmount", "amounts.subtotal_without_vat")],
    ["ДДС", getDataValue(data, "vatAmount", "amounts.total_vat") ?? data.vat?.amount],
    ["Обща сума", getDataValue(data, "totalAmount", "amounts.total_with_vat")],
    ["Начин на плащане", getPaymentMethodLabel(getDataValue(data, "paymentMethod", "payment.method"))],
    ["Увереност", data.confidence],
    ["Нуждае се от преглед", data.needsReview || data.needs_review ? "Да" : "Не"],
    ["Причини за преглед", (data.reviewReasons || data.review_reasons || []).map(getReviewReasonLabel).join(", ")]
  ];
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
  const rowHeight = Math.max(
    pdf.heightOfString(label, { width: labelWidth }),
    pdf.heightOfString(text || "-", { width: valueWidth }),
    16
  ) + 5;

  ensurePdfSpace(pdf, rowHeight);
  pdf.font(fonts.bold).fontSize(9).text(label, startX, startY, { width: labelWidth });
  pdf.font(fonts.regular).fontSize(9).text(text || "-", startX + labelWidth, startY, { width: valueWidth });
  pdf.y = startY + rowHeight;
}

function drawLineItem(pdf, fonts, item, index) {
  const startX = pdf.page.margins.left;
  const descriptionWidth = 245;
  const metaWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - descriptionWidth;
  const description = `${index + 1}. ${valueOrEmpty(item.name) || "-"}`;
  const meta = [
    `Кол.: ${valueOrEmpty(item.quantity) || "-"}`,
    `Ед. цена: ${valueOrEmpty(item.unitPrice) || "-"}`,
    `Общо: ${valueOrEmpty(item.totalPrice) || "-"}`
  ].join(" | ");
  const rowHeight = Math.max(
    pdf.heightOfString(description, { width: descriptionWidth }),
    pdf.heightOfString(meta, { width: metaWidth }),
    18
  ) + 8;
  const startY = pdf.y;

  ensurePdfSpace(pdf, rowHeight);
  pdf.font(fonts.bold).fontSize(9).text(description, startX, startY, { width: descriptionWidth });
  pdf.font(fonts.regular).fontSize(9).text(meta, startX + descriptionWidth, startY, { width: metaWidth });
  pdf.moveTo(startX, startY + rowHeight - 3)
    .lineTo(pdf.page.width - pdf.page.margins.right, startY + rowHeight - 3)
    .strokeColor("#dddddd")
    .stroke();
  pdf.y = startY + rowHeight;
}

async function generateExcelExport(documentId, companyId) {
  const document = await findDocumentById(documentId, companyId);
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
    { header: "Име", key: "name", width: 42 },
    { header: "Количество", key: "quantity", width: 14 },
    { header: "Ед. цена", key: "unitPrice", width: 18 },
    { header: "Общо", key: "totalPrice", width: 18 }
  ];

  for (const item of getItems(document.data || {})) {
    itemsSheet.addRow({
      name: valueOrEmpty(item.name),
      quantity: valueOrEmpty(item.quantity),
      unitPrice: valueOrEmpty(item.unitPrice),
      totalPrice: valueOrEmpty(item.totalPrice)
    });
  }

  itemsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  await markDocumentExported(documentId, "excel", companyId);

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

    const items = getItems(document.data || {});
    if (items.length === 0) {
      pdf.font(fonts.regular).fontSize(10).text("Няма извлечени редове.");
    } else {
      items.forEach((item, index) => drawLineItem(pdf, fonts, item, index));
    }

    pdf.end();
  });
}

async function generatePdfExport(documentId, companyId) {
  const document = await findDocumentById(documentId, companyId);
  const buffer = await generatePdfBuffer(document);
  await markDocumentExported(documentId, "pdf", companyId);

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
