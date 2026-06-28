const path = require("node:path");
const { spawn } = require("node:child_process");
const { config } = require("../config/env");

function runPythonPdfConverter(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.pythonCommand, args, {
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);

    child.on("close", (code) => {
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
