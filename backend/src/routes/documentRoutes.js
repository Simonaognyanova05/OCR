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

const router = express.Router();

router.post("/documents/upload", requireAuth, uploadDocument.single("document"), uploadDocumentHandler);
router.post("/documents/extract", requireAuth, uploadDocument.single("document"), extractDocumentHandler);
router.get("/dashboard", requireAuth, getDashboardHandler);
router.get("/documents", requireAuth, listDocumentsHandler);
router.get("/reports/monthly/pdf", requireAuth, requireRole(["owner", "accountant"]), exportMonthlyPdfReportHandler);
router.get("/documents/:id/file", requireAuth, getDocumentFileHandler);
router.put("/documents/:id/review", requireAuth, requireRole(["owner", "accountant", "employee"]), saveReviewHandler);
router.post("/documents/:id/approve", requireAuth, requireRole(["owner", "accountant", "employee"]), approveDocumentHandler);
router.get("/documents/:id/export/excel", requireAuth, requireRole(["owner", "accountant"]), exportExcelHandler);
router.get("/documents/:id/export/pdf", requireAuth, requireRole(["owner", "accountant"]), exportPdfHandler);
router.get("/documents/:id", requireAuth, getDocumentHandler);

module.exports = router;
