const {
  extractContract,
  getContract,
  getContractFile,
  listContracts,
  uploadContractOnly
} = require("../services/contractService");

async function uploadContractHandler(req, res, next) {
  try {
    const payload = await uploadContractOnly(req.file, req.auth);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

async function extractContractHandler(req, res, next) {
  try {
    const payload = await extractContract(req.file, req.auth);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

async function listContractsHandler(req, res, next) {
  try {
    const result = await listContracts(req.query, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getContractHandler(req, res, next) {
  try {
    const result = await getContract(req.params.id, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getContractFileHandler(req, res, next) {
  try {
    const file = await getContractFile(req.params.id, req.auth);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(file.mimeType);
    res.sendFile(file.filePath, {
      headers: {
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  extractContractHandler,
  getContractFileHandler,
  getContractHandler,
  listContractsHandler,
  uploadContractHandler
};
