const fs = require("node:fs/promises");
const zlib = require("node:zlib");
const { HttpError } = require("../utils/httpError");

const localFileHeaderSignature = 0x04034b50;
const maxExtractedTextLength = 120000;
const maxDocumentXmlBytes = 2 * 1024 * 1024;

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function xmlToText(xml) {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function extractDocxText(filePath) {
  const buffer = await fs.readFile(filePath);
  let offset = 0;

  while (offset + 30 < buffer.length) {
    if (buffer.readUInt32LE(offset) !== localFileHeaderSignature) {
      offset += 1;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;
    const entryName = buffer.toString("utf8", nameStart, nameEnd);

    if (dataEnd > buffer.length) {
      throw new HttpError(400, "Invalid DOCX archive.");
    }

    if (entryName === "word/document.xml") {
      if (![0, 8].includes(compressionMethod) || uncompressedSize > maxDocumentXmlBytes) {
        throw new HttpError(400, "DOCX document body is too large or uses unsupported compression.");
      }

      const entry = buffer.subarray(dataStart, dataEnd);
      let xml;

      try {
        xml = compressionMethod === 0
          ? entry.toString("utf8")
          : zlib.inflateRawSync(entry, { maxOutputLength: maxDocumentXmlBytes }).toString("utf8");
      } catch (_error) {
        throw new HttpError(400, "DOCX document body is invalid or too large.");
      }

      if (Buffer.byteLength(xml, "utf8") > maxDocumentXmlBytes) {
        throw new HttpError(400, "DOCX document body is too large.");
      }

      const text = xmlToText(xml).slice(0, maxExtractedTextLength);

      if (!text) {
        throw new HttpError(400, "DOCX file does not contain readable text.");
      }

      return text;
    }

    offset = dataEnd;
  }

  throw new HttpError(400, "DOCX file does not contain a supported document body.");
}

module.exports = {
  extractDocxText
};
