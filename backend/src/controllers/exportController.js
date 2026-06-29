const {
  generateExcelExport,
  generateMonthlyPdfReport,
  generatePdfExport
} = require("../services/exportService");

function sendExport(res, exportFile) {
  res.setHeader("Content-Type", exportFile.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${exportFile.filename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(exportFile.buffer);
}

async function exportExcelHandler(req, res, next) {
  try {
    const exportFile = await generateExcelExport(req.params.id, req.auth.company._id);
    sendExport(res, exportFile);
  } catch (error) {
    next(error);
  }
}

async function exportPdfHandler(req, res, next) {
  try {
    const exportFile = await generatePdfExport(req.params.id, req.auth.company._id);
    sendExport(res, exportFile);
  } catch (error) {
    next(error);
  }
}

async function exportMonthlyPdfReportHandler(req, res, next) {
  try {
    const exportFile = await generateMonthlyPdfReport(req.auth.company._id, req.query.month);
    sendExport(res, exportFile);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  exportExcelHandler,
  exportMonthlyPdfReportHandler,
  exportPdfHandler,
};
