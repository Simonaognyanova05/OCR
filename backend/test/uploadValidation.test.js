const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  validateUploadedDocumentSignature
} = require("../src/middleware/uploadMiddleware");
const {
  detectMimeTypeFromBuffer
} = require("../src/utils/fileSignature");

function runValidation(file) {
  return new Promise((resolve) => {
    validateUploadedDocumentSignature({ file }, {}, (error) => {
      resolve(error);
    });
  });
}

test("detects supported document file signatures", () => {
  assert.equal(detectMimeTypeFromBuffer(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(
    detectMimeTypeFromBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png"
  );
  assert.equal(detectMimeTypeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectMimeTypeFromBuffer(Buffer.from("RIFFxxxxWEBP", "ascii")), "image/webp");
});

test("upload signature validation rejects disguised files and removes them", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-validation-"));
  const filePath = path.join(tempDir, "fake.pdf");

  await fs.writeFile(filePath, "not a real pdf");

  try {
    const error = await runValidation({
      mimetype: "application/pdf",
      path: filePath
    });

    assert.equal(error.statusCode, 400);
    await assert.rejects(() => fs.stat(filePath));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("upload signature validation allows files matching their claimed MIME type", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-validation-"));
  const filePath = path.join(tempDir, "real.pdf");

  await fs.writeFile(filePath, "%PDF-1.7\n");

  try {
    const error = await runValidation({
      mimetype: "application/pdf",
      path: filePath
    });

    assert.equal(error, undefined);
    assert.ok(await fs.stat(filePath));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
