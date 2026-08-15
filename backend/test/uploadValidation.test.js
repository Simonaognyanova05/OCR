const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { config } = require("../src/config/env");
const {
  validateUploadedDocumentSignature
} = require("../src/middleware/uploadMiddleware");
const {
  detectImageDimensionsFromBuffer,
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

function buildPngHeader(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test("detects image dimensions from supported image headers", () => {
  assert.deepEqual(
    detectImageDimensionsFromBuffer(buildPngHeader(1200, 900), "image/png"),
    { width: 1200, height: 900 }
  );
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

test("upload signature validation allows image dimensions within the pixel limit", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-validation-"));
  const filePath = path.join(tempDir, "small.png");

  await fs.writeFile(filePath, buildPngHeader(1200, 900));

  try {
    const error = await runValidation({
      mimetype: "image/png",
      path: filePath
    });

    assert.equal(error, undefined);
    assert.ok(await fs.stat(filePath));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("upload signature validation rejects oversized image dimensions and removes the file", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-validation-"));
  const filePath = path.join(tempDir, "huge.png");

  await fs.writeFile(filePath, buildPngHeader(100000, 100000));

  try {
    const error = await runValidation({
      mimetype: "image/png",
      path: filePath
    });

    assert.equal(error.statusCode, 400);
    await assert.rejects(() => fs.stat(filePath));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("upload validation rejects files when configured malware scan fails and removes the file", async () => {
  const originalCommand = config.malwareScanCommand;
  const originalArgs = config.malwareScanArgs;
  const originalTimeout = config.malwareScanTimeoutMs;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-validation-"));
  const filePath = path.join(tempDir, "infected.pdf");

  await fs.writeFile(filePath, "%PDF-1.7\n");

  try {
    config.malwareScanCommand = process.execPath;
    config.malwareScanArgs = ["-e", "process.exit(1)"];
    config.malwareScanTimeoutMs = 5000;

    const error = await runValidation({
      mimetype: "application/pdf",
      path: filePath
    });

    assert.equal(error.statusCode, 400);
    assert.equal(error.code, "malware_detected");
    await assert.rejects(() => fs.stat(filePath));
  } finally {
    config.malwareScanCommand = originalCommand;
    config.malwareScanArgs = originalArgs;
    config.malwareScanTimeoutMs = originalTimeout;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
