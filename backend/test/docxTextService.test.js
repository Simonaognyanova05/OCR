const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { extractDocxText } = require("../src/services/docxTextService");

function buildDocxEntry(xml, declaredSize = Buffer.byteLength(xml)) {
  const name = Buffer.from("word/document.xml");
  const compressed = zlib.deflateRawSync(Buffer.from(xml));
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(declaredSize, 22);
  header.writeUInt16LE(name.length, 26);
  return Buffer.concat([header, name, compressed]);
}

test("DOCX extraction reads a bounded document body", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-docx-"));
  const filePath = path.join(tempDir, "sample.docx");
  await fs.writeFile(filePath, buildDocxEntry("<w:document><w:p>Hello</w:p></w:document>"));

  try {
    assert.equal(await extractDocxText(filePath), "Hello");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("DOCX extraction rejects oversized declared output before decompression", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-docx-"));
  const filePath = path.join(tempDir, "oversized.docx");
  await fs.writeFile(filePath, buildDocxEntry("<w:document/>", 3 * 1024 * 1024));

  try {
    await assert.rejects(
      () => extractDocxText(filePath),
      (error) => error.statusCode === 400 && /too large/.test(error.message)
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});