const express = require("express");
const {
  approveDocumentHandler,
  extractDocumentHandler,
  getDashboardHandler,
  getDocumentFileHandler,
  getDocumentHandler,
  listDocumentsHandler,
  saveReviewHandler,
  uploadDocumentHandler
} = require("../controllers/documentController");
const {
  exportExcelHandler,
  exportMonthlyPdfReportHandler,
  exportPdfHandler
} = require("../controllers/exportController");
const { uploadDocument } = require("../middleware/uploadMiddleware");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const {
  exportRateLimit,
  extractRateLimit,
  uploadRateLimit
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/documents/upload", requireAuth, uploadRateLimit, uploadDocument.single("document"), uploadDocumentHandler);
router.post("/documents/extract", requireAuth, extractRateLimit, uploadDocument.single("document"), extractDocumentHandler);
router.get("/dashboard", requireAuth, getDashboardHandler);
router.get("/documents", requireAuth, listDocumentsHandler);
router.get("/reports/monthly/pdf", requireAuth, requireRole(["owner", "accountant"]), exportRateLimit, exportMonthlyPdfReportHandler);
router.get("/documents/:id/file", requireAuth, getDocumentFileHandler);
router.put("/documents/:id/review", requireAuth, requireRole(["owner", "accountant", "employee"]), saveReviewHandler);
router.post("/documents/:id/approve", requireAuth, requireRole(["owner", "accountant", "employee"]), approveDocumentHandler);
router.get("/documents/:id/export/excel", requireAuth, requireRole(["owner", "accountant"]), exportRateLimit, exportExcelHandler);
router.get("/documents/:id/export/pdf", requireAuth, requireRole(["owner", "accountant"]), exportRateLimit, exportPdfHandler);
router.get("/documents/:id", requireAuth, getDocumentHandler);

module.exports = router;
