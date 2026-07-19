const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { config } = require("../src/config/env");
const { cleanupPdfConversionOutput } = require("../src/services/pdfConversionService");

test("cleanupPdfConversionOutput removes the rendered pages directory for a PDF", async () => {
  const originalOutputDir = config.outputDir;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-pdf-cleanup-"));

  try {
    config.outputDir = path.join(tempDir, "outputs");
    const pdfPath = path.join(tempDir, "uploads", "invoice.pdf");
    const renderedDir = path.join(config.outputDir, "pdf-pages", "invoice");

    await fs.mkdir(renderedDir, { recursive: true });
    await fs.writeFile(path.join(renderedDir, "invoice-page-001.png"), "rendered");

    await cleanupPdfConversionOutput(pdfPath);

    await assert.rejects(() => fs.stat(renderedDir), { code: "ENOENT" });
  } finally {
    config.outputDir = originalOutputDir;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("cleanupPdfConversionOutput is idempotent when rendered output is already absent", async () => {
  const originalOutputDir = config.outputDir;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-pdf-cleanup-"));

  try {
    config.outputDir = path.join(tempDir, "outputs");

    await cleanupPdfConversionOutput(path.join(tempDir, "uploads", "missing.pdf"));
  } finally {
    config.outputDir = originalOutputDir;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
