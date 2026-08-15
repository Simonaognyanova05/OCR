const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("../config/env");
const { docxMimeType, ocrMimeTypes } = require("../middleware/uploadMiddleware");
const { HttpError } = require("../utils/httpError");
const { cleanupPdfConversionOutput, convertPdfToImages } = require("./pdfConversionService");
const { extractDocxText } = require("./docxTextService");
const { extractContractDocumentFromImages, extractContractDocumentFromText } = require("./ocrService");
const { countCompanyDocumentsThisMonth } = require("./documentRepository");
const {
  countCompanyContractsThisMonth,
  createUploadedContract,
  findContractById,
  findContractFileById,
  listCompanyContracts,
  updateContractStatus,
  updateExtractedContract
} = require("./contractRepository");

let activeContractExtractionJobs = 0;

async function runWithContractExtractionSlot(work) {
  if (activeContractExtractionJobs >= config.ocrMaxConcurrentJobs) {
    const error = new HttpError(429, "Too many active OCR jobs. Try again shortly.");
    error.code = "ocr_concurrency_limit";
    throw error;
  }

  activeContractExtractionJobs += 1;
  try {
    return await work();
  } finally {
    activeContractExtractionJobs -= 1;
  }
}

function buildFailureMetadata(error) {
  const code = error.code || (error.statusCode === 504 ? "processing_timeout" : "processing_failed");
  const isExpected = error instanceof HttpError || error.statusCode;

  return {
    failedAt: new Date(),
    processingCompletedAt: new Date(),
    failureCode: code,
    failureMessage: isExpected ? String(error.message).slice(0, 500) : "Contract processing failed. Try again or upload a clearer document."
  };
}

function buildFilePayload(file, authContext) {
  return {
    company_id: authContext.company._id,
    uploaded_by: authContext.user._id,
    original_file_name: file.originalname,
    stored_file: path.basename(file.path),
    mime_type: file.mimetype
  };
}

async function assertDocumentLimit(authContext) {
  const [usedDocuments, usedContracts] = await Promise.all([
    countCompanyDocumentsThisMonth(authContext.company._id),
    countCompanyContractsThisMonth(authContext.company._id)
  ]);
  const usedTotal = usedDocuments + usedContracts;
  const documentLimit = authContext.company.documentLimit;

  if (usedTotal >= documentLimit) {
    throw new HttpError(403, `Monthly document limit of ${documentLimit} reached.`);
  }
}

async function uploadContractOnly(file, authContext) {
  if (!file) {
    throw new HttpError(400, "Missing file. Send multipart/form-data with document field.");
  }

  await assertDocumentLimit(authContext);
  return createUploadedContract(buildFilePayload(file, authContext));
}

async function extractContract(file, authContext) {
  if (!file) {
    throw new HttpError(400, "Missing file. Send multipart/form-data with document field.");
  }

  await assertDocumentLimit(authContext);
  const uploadedContract = await createUploadedContract(buildFilePayload(file, authContext));

  try {
    await updateContractStatus(uploadedContract.id, authContext.company._id, "processing", {
      processingStartedAt: new Date(),
      processingCompletedAt: null,
      failedAt: null,
      failureCode: null,
      failureMessage: null
    });

    const extracted = await runWithContractExtractionSlot(async () => {
      if (file.mimetype === docxMimeType) {
        return extractContractDocumentFromText(await extractDocxText(file.path));
      }

      if (file.mimetype === "application/pdf") {
        return extractContractDocumentFromImages(await convertPdfToImages(file.path));
      }

      if (ocrMimeTypes.has(file.mimetype)) {
        return extractContractDocumentFromImages([file.path]);
      }

      throw new HttpError(400, "Contract extraction supports PDF, DOCX, JPG, PNG and WebP.");
    });

    return updateExtractedContract(uploadedContract.id, authContext.company._id, {
      model: config.model,
      extracted_at: new Date().toISOString(),
      data: extracted
    });
  } catch (error) {
    await updateContractStatus(
      uploadedContract.id,
      authContext.company._id,
      "failed",
      buildFailureMetadata(error)
    ).catch(() => {});
    throw error;
  } finally {
    if (file.mimetype === "application/pdf") {
      await cleanupPdfConversionOutput(file.path).catch(() => {});
    }
  }
}

async function getContract(contractId, authContext) {
  return findContractById(contractId, authContext.company._id);
}

async function getContractFile(contractId, authContext) {
  const contractFile = await findContractFileById(contractId, authContext.company._id);
  const uploadRoot = path.resolve(config.uploadDir);
  const storedFile = path.basename(contractFile.storedFile || "");

  if (!storedFile) {
    throw new HttpError(404, "File not found.");
  }

  const filePath = path.resolve(uploadRoot, storedFile);
  const relativePath = path.relative(uploadRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new HttpError(400, "Invalid file.");
  }

  try {
    await fs.access(filePath);
  } catch (_error) {
    throw new HttpError(404, "File not found.");
  }

  return {
    filePath,
    filename: contractFile.originalName || storedFile,
    mimeType: contractFile.mimeType
  };
}

async function listContracts(filters, authContext) {
  return listCompanyContracts(authContext.company._id, filters || {});
}

module.exports = {
  extractContract,
  getContract,
  getContractFile,
  listContracts,
  uploadContractOnly
};
