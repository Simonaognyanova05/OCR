const express = require("express");
const {
  extractContractHandler,
  getContractFileHandler,
  getContractHandler,
  listContractsHandler,
  uploadContractHandler
} = require("../controllers/contractController");
const { requireAuth } = require("../middleware/authMiddleware");
const { extractRateLimit, uploadRateLimit } = require("../middleware/rateLimitMiddleware");
const {
  uploadDocument,
  validateUploadedDocumentSignature
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/contracts/upload", requireAuth, uploadRateLimit, uploadDocument.single("document"), validateUploadedDocumentSignature, uploadContractHandler);
router.post("/contracts/extract", requireAuth, extractRateLimit, uploadDocument.single("document"), validateUploadedDocumentSignature, extractContractHandler);
router.get("/contracts", requireAuth, listContractsHandler);
router.get("/contracts/:id/file", requireAuth, getContractFileHandler);
router.get("/contracts/:id", requireAuth, getContractHandler);

module.exports = router;
