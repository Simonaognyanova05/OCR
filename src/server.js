import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";
import { extractExpenseDocument } from "./extract.js";
import {
  createDocumentId,
  ensureStorage,
  readExtractionResult,
  saveExtractionResult
} from "./storage.js";
import { HttpError, toErrorResponse } from "./errors.js";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const extensionByMimeType = {
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

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, "Unsupported file type. Upload PNG, JPG, JPEG, or WEBP."));
      return;
    }

    callback(null, true);
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: config.model
  });
});

app.post("/api/documents/extract", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError(400, "Missing file. Send multipart/form-data with a document field.");
    }

    const documentId = createDocumentId();
    const extracted = await extractExpenseDocument(req.file.path);

    const payload = {
      id: documentId,
      original_name: req.file.originalname,
      stored_file: path.basename(req.file.path),
      model: config.model,
      extracted_at: new Date().toISOString(),
      data: extracted
    };

    await saveExtractionResult(documentId, payload);

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/documents/:id", async (req, res, next) => {
  try {
    const result = await readExtractionResult(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.code === "ENOENT") {
      next(new HttpError(404, "Document result not found."));
      return;
    }

    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(toErrorResponse(error));
});

await ensureStorage();

app.listen(config.port, () => {
  console.log(`OCR backend listening on http://localhost:${config.port}`);
});
