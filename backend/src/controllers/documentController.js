const {
  extractDocument,
  getDocument,
  saveReviewedDocument,
  uploadDocumentOnly
} = require("../services/documentService");

async function uploadDocumentHandler(req, res, next) {
  try {
    const payload = await uploadDocumentOnly(req.file, req.auth);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

async function extractDocumentHandler(req, res, next) {
  try {
    const payload = await extractDocument(req.file, req.auth);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

async function getDocumentHandler(req, res, next) {
  try {
    const result = await getDocument(req.params.id, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function saveReviewHandler(req, res, next) {
  try {
    const updated = await saveReviewedDocument(req.params.id, req.body?.data, req.auth);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  extractDocumentHandler,
  getDocumentHandler,
  saveReviewHandler,
  uploadDocumentHandler
};
