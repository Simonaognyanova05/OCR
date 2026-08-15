const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

function getPdfConversionOutputDir(pdfPath) {
  return path.join(config.outputDir, "pdf-pages", path.basename(pdfPath, path.extname(pdfPath)));
}

function assertSafePdfOutputDir(outputDir) {
  const outputRoot = path.resolve(config.outputDir, "pdf-pages");
  const resolvedOutputDir = path.resolve(outputDir);
  const relativePath = path.relative(outputRoot, resolvedOutputDir);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Refusing to remove PDF output directory outside configured output root.");
  }

  return resolvedOutputDir;
}

function buildPdfConversionError(stderr, code) {
  if (/encrypted_pdf_not_supported/i.test(stderr || "")) {
    const error = new HttpError(400, "Encrypted or password-protected PDF files are not supported.");
    error.code = "pdf_encrypted";
    return error;
  }

  return new Error(stderr || `PDF conversion failed with exit code ${code}`);
}

function runPythonPdfConverter(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.pythonCommand, args, {
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGKILL");
      const error = new HttpError(504, "PDF обработката отне твърде дълго. Опитай с по-малък или по-ясен файл.");
      error.code = "pdf_conversion_timeout";
      reject(error);
    }, config.pdfConversionTimeoutMs);

    function settle(callback) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      settle(() => reject(error));
    });

    child.on("close", (code) => {
      settle(() => {
        if (code !== 0) {
          reject(buildPdfConversionError(stderr, code));
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`PDF conversion returned invalid JSON: ${error.message}`));
        }
      });
    });
  });
}

async function convertPdfToImages(pdfPath) {
  const scriptPath = path.resolve(__dirname, "../../scripts/pdf_to_images.py");
  const outputDir = getPdfConversionOutputDir(pdfPath);
  const result = await runPythonPdfConverter([
    scriptPath,
    "--pdf",
    pdfPath,
    "--output-dir",
    outputDir,
    "--dpi",
    String(config.pdfRenderDpi),
    "--max-pages",
    String(config.pdfMaxPages),
    "--rotation",
    "auto"
  ]);

  return result.images || [];
}

async function cleanupPdfConversionOutput(pdfPath) {
  const outputDir = assertSafePdfOutputDir(getPdfConversionOutputDir(pdfPath));
  await fs.rm(outputDir, { recursive: true, force: true });
}

module.exports = {
  cleanupPdfConversionOutput,
  convertPdfToImages
};
