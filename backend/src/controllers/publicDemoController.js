const { extractPublicDemoDocument } = require("../services/documentService");

async function extractPublicDemoHandler(req, res, next) {
  try {
    const payload = await extractPublicDemoDocument(req.file);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  extractPublicDemoHandler
};
