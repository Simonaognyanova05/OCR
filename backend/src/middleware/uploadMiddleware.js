const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const multer = require("multer");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { detectImageDimensionsFromFile, detectMimeTypeFromFile } = require("../utils/fileSignature");
const { scanUploadedFileForMalware } = require("../services/malwareScanService");

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ocrMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImagePixels = 25 * 1000 * 1000;
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
    const ext = extensionByMimeType[file.mimetype] || originalExt || "";
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
      callback(new HttpError(400, "Неподдържан файлов тип. Качи PDF, JPG, PNG или WebP."));
      return;
    }

    callback(null, true);
  }
});

async function validateUploadedDocumentSignature(req, _res, next) {
  if (!req.file) {
    next();
    return;
  }

  try {
    const detectedMimeType = await detectMimeTypeFromFile(req.file.path);

    if (detectedMimeType !== req.file.mimetype || !allowedMimeTypes.has(detectedMimeType)) {
      await fs.unlink(req.file.path).catch(() => {});
      next(new HttpError(400, "Невалидно файлово съдържание. Качи истински PDF, JPG, PNG или WebP файл."));
      return;
    }

    if (ocrMimeTypes.has(detectedMimeType)) {
      const dimensions = await detectImageDimensionsFromFile(req.file.path, detectedMimeType);
      const pixels = dimensions ? dimensions.width * dimensions.height : 0;

      if (!dimensions || pixels > maxImagePixels) {
        await fs.unlink(req.file.path).catch(() => {});
        next(new HttpError(400, "Изображението е твърде голямо или невалидно. Качи по-малък JPG, PNG или WebP файл."));
        return;
      }
    }

    await scanUploadedFileForMalware(req.file.path);

    next();
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
}

module.exports = {
  ocrMimeTypes,
  uploadDocument,
  validateUploadedDocumentSignature
};
