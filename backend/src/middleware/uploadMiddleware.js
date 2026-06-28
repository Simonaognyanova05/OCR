const crypto = require("node:crypto");
const path = require("node:path");
const multer = require("multer");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ocrMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const extensionByMimeType = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp"
};

const uploadStorage = multer.diskStorage({
  destination: config.uploadDir,
  filename(_req, file, callback) {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const ext = originalExt || extensionByMimeType[file.mimetype] || "";
    callback(null, `${crypto.randomUUID()}${ext}`);
  }
});

const uploadDocument = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, "Неподдържан файлов тип. Качи PDF, JPG или PNG."));
      return;
    }

    callback(null, true);
  }
});

module.exports = {
  ocrMimeTypes,
  uploadDocument
};
