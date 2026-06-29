const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("node:fs");
const {
  findDocumentById,
  listCompanyDocumentsForMonthlyReport,
  markDocumentExported
} = require("./documentRepository");
const { HttpError } = require("../utils/httpError");
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

const warningLabels = {
  amount_mismatch: "Общата сума не съвпада с основа + ДДС",
  possible_duplicate: "Възможен дубликат: същият номер, доставчик и сума вече съществуват"
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

function getTaxOrVatNumber(data, party) {
  if (party === "supplier") {
    return (
      getDataValue(data, "supplierVatNumber", "supplier.vat_id") ||
      getDataValue(data, "supplierTaxNumber", "supplier.tax_id") ||
      getDataValue(data, "supplierEik", "supplier.eik")
    );
  }

  return (
    getDataValue(data, "recipientVatNumber", "recipient.vat_id") ||
    getDataValue(data, "recipientTaxNumber", "recipient.tax_id") ||
    getDataValue(data, "recipientEik", "recipient.eik")
  );
}

function buildAccountingExportRow(document) {
  const data = document.data || {};

  return {
    issueDate: getDataValue(data, "issueDate", "issue_date"),
    documentType: getDocumentTypeLabel(getDataValue(data, "documentType", "document_type")),
    documentNumber: getDataValue(data, "documentNumber", "document_number"),
    supplierName: getDataValue(data, "supplierName", "supplier.name"),
    supplierTaxNumber: getTaxOrVatNumber(data, "supplier"),
    recipientName: getDataValue(data, "recipientName", "recipient.name"),
    recipientTaxNumber: getTaxOrVatNumber(data, "recipient"),
    netAmount: getDataValue(data, "netAmount", "amounts.subtotal_without_vat"),
    vatAmount: getDataValue(data, "vatAmount", "amounts.total_vat") ?? data.vat?.amount,
    totalAmount: getDataValue(data, "totalAmount", "amounts.total_with_vat"),
    currency: data.currency,
    paymentMethod: getPaymentMethodLabel(getDataValue(data, "paymentMethod", "payment.method")),
    category: data.category
  };
}

function formatAccountingCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return cleanDisplayText(value);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getReportMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new HttpError(400, "Подай месец във формат YYYY-MM.");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new HttpError(400, "Невалиден месец за PDF отчет.");
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));

  return {
    label: month,
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10)
  };
}

function getDocumentCurrency(documents) {
  const currencies = [...new Set(documents.map((document) => document.data?.currency).filter(Boolean))];
  if (currencies.length === 1) return currencies[0];
  if (currencies.length === 0) return "BGN";
  return "смесена валута";
}

function formatMoney(value, currency) {
  const amount = new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNumber(value));

  if (currency === "BGN") return `${amount} лв`;
  if (currency && currency !== "смесена валута") return `${amount} ${currency}`;
  return amount;
}

function buildMonthlyReport(documents, monthRange) {
  const currency = getDocumentCurrency(documents);
  const categories = new Map();
  const suppliers = new Map();
  let totalAmount = 0;
  let totalVat = 0;

  for (const document of documents) {
    const data = document.data || {};
    const amount = toNumber(data.totalAmount);
    const vat = toNumber(data.vatAmount);
    const supplier = cleanDisplayText(data.supplierName) || "Без доставчик";
    const category = cleanDisplayText(data.category) || "Без категория";

    totalAmount += amount;
    totalVat += vat;
    suppliers.set(supplier, (suppliers.get(supplier) || 0) + amount);
    categories.set(category, (categories.get(category) || 0) + amount);
  }

  const topSupplier = [...suppliers.entries()]
    .sort((first, second) => second[1] - first[1])
    .at(0);

  return {
    month: monthRange.label,
    dateFrom: monthRange.dateFrom,
    dateTo: monthRange.dateTo,
    currency,
    totalDocuments: documents.length,
    totalAmount,
    totalVat,
    topSupplier: topSupplier
      ? { name: topSupplier[0], amount: topSupplier[1] }
      : { name: "-", amount: 0 },
    categories: [...categories.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((first, second) => second.amount - first.amount),
    documents: documents.map((document) => buildAccountingExportRow(document))
  };
}

function getReviewReasonLabel(reason) {
  return reviewReasonLabels[reason] || reason;
}

function getWarningLabel(warning) {
  return warningLabels[warning] || warning;
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
    ["Причини за преглед", (data.reviewReasons || data.review_reasons || []).map(getReviewReasonLabel).join(", ")],
    ["Предупреждения", (data.warnings || []).map(getWarningLabel).join(", ")]
  ];
}

function ensurePdfSpace(pdf, neededHeight) {
  if (pdf.y + neededHeight > pdf.page.height - pdf.page.margins.bottom) {
    pdf.addPage();
  }
}

function drawSummaryRow(pdf, fonts, label, value) {
  const labelWidth = 145;
  const valueWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - labelWidth;
  const text = String(valueOrEmpty(value));
  const rowHeight = Math.max(
    pdf.heightOfString(label, { width: labelWidth }),
    pdf.heightOfString(text || "-", { width: valueWidth }),
    16
  ) + 5;

  ensurePdfSpace(pdf, rowHeight);
  const startX = pdf.page.margins.left;
  const startY = pdf.y;
  pdf.font(fonts.bold).fontSize(9).text(label, startX, startY, { width: labelWidth });
  pdf.font(fonts.regular).fontSize(9).text(text || "-", startX + labelWidth, startY, { width: valueWidth });
  pdf.y = startY + rowHeight;
}

function getItemDisplayName(item, index) {
  const name = valueOrEmpty(item.name || item.description_bg || item.description || item.description_raw);
  return name && name !== "[нечетим текст]" ? name : `Артикул ${index + 1}`;
}

function drawLineItem(pdf, fonts, item, index) {
  const descriptionWidth = 245;
  const metaWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - descriptionWidth;
  const description = `${index + 1}. ${getItemDisplayName(item, index)}`;
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

  ensurePdfSpace(pdf, rowHeight);
  const startX = pdf.page.margins.left;
  const startY = pdf.y;
  pdf.font(fonts.bold).fontSize(9).text(description, startX, startY, { width: descriptionWidth });
  pdf.font(fonts.regular).fontSize(9).text(meta, startX + descriptionWidth, startY, { width: metaWidth });
  pdf.moveTo(startX, startY + rowHeight - 3)
    .lineTo(pdf.page.width - pdf.page.margins.right, startY + rowHeight - 3)
    .strokeColor("#dddddd")
    .stroke();
  pdf.y = startY + rowHeight;
}

function drawMonthlyMetric(pdf, fonts, label, value) {
  const width = (pdf.page.width - pdf.page.margins.left - pdf.page.margins.right - 24) / 2;
  const x = pdf.x;
  const y = pdf.y;

  pdf.roundedRect(x, y, width, 52, 6).fillAndStroke("#f7f9fc", "#dce2ee");
  pdf.fillColor("#52627a").font(fonts.bold).fontSize(8).text(label, x + 12, y + 10, { width: width - 24 });
  pdf.fillColor("#111827").font(fonts.bold).fontSize(13).text(value, x + 12, y + 26, { width: width - 24 });
  pdf.fillColor("#111827");
}

function drawMonthlySectionTitle(pdf, fonts, title) {
  ensurePdfSpace(pdf, 30);
  pdf.moveDown(0.8);
  pdf.font(fonts.bold).fontSize(13).fillColor("#111827").text(title);
  pdf.moveDown(0.4);
}

function drawMonthlySimpleRow(pdf, fonts, columns) {
  const availableWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
  const rowHeight = 22;
  const widths = columns.map((column) => column.width * availableWidth);

  ensurePdfSpace(pdf, rowHeight + 2);
  const startX = pdf.page.margins.left;
  const startY = pdf.y;
  columns.reduce((x, column, index) => {
    pdf.font(column.bold ? fonts.bold : fonts.regular)
      .fontSize(column.size || 8)
      .fillColor(column.color || "#111827")
      .text(String(column.value || "-"), x, startY + 5, {
        width: widths[index] - 6,
        ellipsis: true
      });
    return x + widths[index];
  }, startX);

  pdf.moveTo(startX, startY + rowHeight)
    .lineTo(pdf.page.width - pdf.page.margins.right, startY + rowHeight)
    .strokeColor("#e4e9f2")
    .stroke();
  pdf.y = startY + rowHeight + 2;
}

function generateMonthlyPdfReportBuffer(report) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ margin: 42, size: "A4" });

    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const fonts = registerPdfFonts(pdf);
    const currency = report.currency;
    const totalLabel = currency === "смесена валута" ? "смесена валута" : currency;

    pdf.font(fonts.bold).fontSize(18).fillColor("#111827").text(`Месечен PDF отчет: ${report.month}`);
    pdf.font(fonts.regular).fontSize(9).fillColor("#52627a").text(`Период: ${report.dateFrom} - ${report.dateTo}`);
    pdf.moveDown(1);

    const metricStartX = pdf.x;
    const metricStartY = pdf.y;
    drawMonthlyMetric(pdf, fonts, "Общо документи", String(report.totalDocuments));
    pdf.x = metricStartX + (pdf.page.width - pdf.page.margins.left - pdf.page.margins.right + 24) / 2;
    pdf.y = metricStartY;
    drawMonthlyMetric(pdf, fonts, "Обща сума", `${formatMoney(report.totalAmount, currency)} ${totalLabel === "смесена валута" ? "(смесена валута)" : ""}`.trim());
    pdf.x = metricStartX;
    pdf.y = metricStartY + 66;
    drawMonthlyMetric(pdf, fonts, "Общо ДДС", formatMoney(report.totalVat, currency));
    pdf.x = metricStartX + (pdf.page.width - pdf.page.margins.left - pdf.page.margins.right + 24) / 2;
    pdf.y = metricStartY + 66;
    drawMonthlyMetric(pdf, fonts, "Най-голям доставчик", `${report.topSupplier.name} (${formatMoney(report.topSupplier.amount, currency)})`);
    pdf.x = metricStartX;
    pdf.y = metricStartY + 126;

    drawMonthlySectionTitle(pdf, fonts, "Разходи по категории");
    if (report.categories.length === 0) {
      pdf.font(fonts.regular).fontSize(9).text("Няма одобрени документи за този месец.");
    } else {
      for (const category of report.categories) {
        drawMonthlySimpleRow(pdf, fonts, [
          { value: category.name, width: 0.72, bold: true },
          { value: formatMoney(category.amount, currency), width: 0.28 }
        ]);
      }
    }

    drawMonthlySectionTitle(pdf, fonts, "Списък с документи");
    drawMonthlySimpleRow(pdf, fonts, [
      { value: "Дата", width: 0.13, bold: true, color: "#52627a" },
      { value: "Тип", width: 0.13, bold: true, color: "#52627a" },
      { value: "Номер", width: 0.13, bold: true, color: "#52627a" },
      { value: "Доставчик", width: 0.25, bold: true, color: "#52627a" },
      { value: "Категория", width: 0.18, bold: true, color: "#52627a" },
      { value: "Сума", width: 0.18, bold: true, color: "#52627a" }
    ]);

    for (const document of report.documents) {
      drawMonthlySimpleRow(pdf, fonts, [
        { value: document.issueDate, width: 0.13 },
        { value: document.documentType, width: 0.13 },
        { value: document.documentNumber, width: 0.13 },
        { value: document.supplierName, width: 0.25 },
        { value: document.category, width: 0.18 },
        { value: formatMoney(document.totalAmount, currency), width: 0.18 }
      ]);
    }

    pdf.end();
  });
}

async function generateExcelExport(documentId, companyId) {
  const document = await findDocumentById(documentId, companyId);
  const workbook = new ExcelJS.Workbook();
  const documentsSheet = workbook.addWorksheet("Документи");

  workbook.creator = "OCR Documents";
  workbook.created = new Date();

  documentsSheet.columns = [
    { header: "Дата", key: "issueDate", width: 14 },
    { header: "Тип документ", key: "documentType", width: 18 },
    { header: "Номер", key: "documentNumber", width: 18 },
    { header: "Доставчик", key: "supplierName", width: 34 },
    { header: "ЕИК/ДДС номер доставчик", key: "supplierTaxNumber", width: 26 },
    { header: "Получател", key: "recipientName", width: 34 },
    { header: "ЕИК/ДДС номер получател", key: "recipientTaxNumber", width: 26 },
    { header: "Основа", key: "netAmount", width: 14 },
    { header: "ДДС", key: "vatAmount", width: 14 },
    { header: "Обща сума", key: "totalAmount", width: 16 },
    { header: "Валута", key: "currency", width: 10 },
    { header: "Начин на плащане", key: "paymentMethod", width: 20 },
    { header: "Категория", key: "category", width: 22 }
  ];

  documentsSheet.addRow(
    Object.fromEntries(
      Object.entries(buildAccountingExportRow(document)).map(([key, value]) => [
        key,
        formatAccountingCellValue(value)
      ])
    )
  );

  documentsSheet.views = [{ state: "frozen", ySplit: 1 }];
  documentsSheet.autoFilter = {
    from: "A1",
    to: "M1"
  };

  const headerRow = documentsSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" }
  };
  headerRow.alignment = { vertical: "middle" };

  documentsSheet.getRow(2).alignment = { vertical: "top", wrapText: true };
  ["H", "I", "J"].forEach((column) => {
    documentsSheet.getColumn(column).numFmt = "#,##0.00";
  });

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

async function generateMonthlyPdfReport(companyId, month) {
  const monthRange = getReportMonthRange(month);
  const documents = await listCompanyDocumentsForMonthlyReport(companyId, monthRange);
  const report = buildMonthlyReport(documents, monthRange);
  const buffer = await generateMonthlyPdfReportBuffer(report);

  return {
    buffer,
    filename: `monthly-report-${monthRange.label}.pdf`,
    contentType: "application/pdf"
  };
}

module.exports = {
  generateExcelExport,
  generateMonthlyPdfReport,
  generatePdfExport
};
