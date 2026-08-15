const express = require("express");
const { extractPublicDemoHandler } = require("../controllers/publicDemoController");
const { uploadDocument } = require("../middleware/uploadMiddleware");
const { HttpError } = require("../utils/httpError");

const router = express.Router();
const demoAttempts = new Map();
const windowMs = 60 * 60 * 1000;
const maxAttempts = 5;

function publicDemoRateLimit(req, _res, next) {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const current = demoAttempts.get(key);

  if (!current || current.resetAt <= now) {
    demoAttempts.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (current.count >= maxAttempts) {
    next(new HttpError(429, "Достигнат е лимитът за публични OCR тестове. Опитай отново по-късно или създай профил."));
    return;
  }

  current.count += 1;
  next();
}

router.post("/public/demo/extract", publicDemoRateLimit, uploadDocument.single("document"), extractPublicDemoHandler);

module.exports = router;
