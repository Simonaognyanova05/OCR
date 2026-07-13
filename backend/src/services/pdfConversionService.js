const path = require("node:path");
const { spawn } = require("node:child_process");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

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
          reject(new Error(stderr || `PDF conversion failed with exit code ${code}`));
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
  const outputDir = path.join(config.outputDir, "pdf-pages", path.basename(pdfPath, path.extname(pdfPath)));
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

module.exports = {
  convertPdfToImages
};
