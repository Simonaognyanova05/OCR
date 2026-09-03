const express = require("express");
const { extractPublicDemoHandler } = require("../controllers/publicDemoController");
const { uploadDocument, validateUploadedDocumentSignature } = require("../middleware/uploadMiddleware");
const { publicDemoRateLimit } = require("../middleware/rateLimitMiddleware");

const router = express.Router();
router.post("/public/demo/extract", publicDemoRateLimit, uploadDocument.single("document"), validateUploadedDocumentSignature, extractPublicDemoHandler);

module.exports = router;
