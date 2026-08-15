const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { config } = require("../src/config/env");
const { convertPdfToImages } = require("../src/services/pdfConversionService");

test("PDF conversion rejects encrypted PDFs with a safe client error", async () => {
  const originalOutputDir = config.outputDir;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-encrypted-pdf-"));
  const pdfPath = path.join(tempDir, "encrypted.pdf");

  try {
    config.outputDir = path.join(tempDir, "outputs");
    const createEncryptedPdf = spawnSync(config.pythonCommand, [
      "-B",
      "-c",
      [
        "import fitz, sys",
        "doc = fitz.open()",
        "doc.new_page()",
        "doc.save(sys.argv[1], encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw='owner-pass', user_pw='user-pass')"
      ].join("; "),
      pdfPath
    ], { encoding: "utf8" });

    assert.equal(createEncryptedPdf.status, 0, createEncryptedPdf.stderr);

    await assert.rejects(
      () => convertPdfToImages(pdfPath),
      (error) => error.statusCode === 400 && error.code === "pdf_encrypted"
    );
  } finally {
    config.outputDir = originalOutputDir;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
