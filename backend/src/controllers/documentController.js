const {
  approveDocument,
  extractDocument,
  getDashboard,
  getDocument,
  listDocuments,
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

async function listDocumentsHandler(req, res, next) {
  try {
    const result = await listDocuments(req.query, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getDashboardHandler(req, res, next) {
  try {
    const result = await getDashboard(req.auth);
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

async function approveDocumentHandler(req, res, next) {
  try {
    const approved = await approveDocument(req.params.id, req.body?.data, req.auth);
    res.json(approved);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveDocumentHandler,
  extractDocumentHandler,
  getDashboardHandler,
  getDocumentHandler,
  listDocumentsHandler,
  saveReviewHandler,
  uploadDocumentHandler
};
