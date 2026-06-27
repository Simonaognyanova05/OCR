const { HttpError } = require("../utils/httpError");
const {
  extractDocument,
  getDocument,
  saveReviewedDocument
} = require("../services/documentService");

async function extractDocumentHandler(req, res, next) {
  try {
    const payload = await extractDocument(req.file);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

async function getDocumentHandler(req, res, next) {
  try {
    const result = await getDocument(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.code === "ENOENT") {
      next(new HttpError(404, "Document result not found."));
      return;
    }

    next(error);
  }
}

async function saveReviewHandler(req, res, next) {
  try {
    const updated = await saveReviewedDocument(req.params.id, req.body?.data);
    res.json(updated);
  } catch (error) {
    if (error.code === "ENOENT") {
      next(new HttpError(404, "Document result not found."));
      return;
    }

    next(error);
  }
}

module.exports = {
  extractDocumentHandler,
  getDocumentHandler,
  saveReviewHandler,
};

