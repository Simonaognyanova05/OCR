const express = require("express");
const {
  extractDocumentHandler,
  getDocumentHandler,
  saveReviewHandler
} = require("../controllers/documentController");
const {
  exportExcelHandler,
  exportPdfHandler
} = require("../controllers/exportController");
const { uploadDocument } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/documents/extract", uploadDocument.single("document"), extractDocumentHandler);
router.put("/documents/:id/review", saveReviewHandler);
router.get("/documents/:id/export/excel", exportExcelHandler);
router.get("/documents/:id/export/pdf", exportPdfHandler);
router.get("/documents/:id", getDocumentHandler);

module.exports = router;
