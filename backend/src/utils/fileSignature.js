const fs = require("node:fs/promises");

const maxSignatureBytes = 16;

function startsWith(buffer, signature) {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

function detectMimeTypeFromBuffer(buffer) {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

async function detectMimeTypeFromFile(filePath) {
  const handle = await fs.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(maxSignatureBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxSignatureBytes, 0);
    return detectMimeTypeFromBuffer(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

module.exports = {
  detectMimeTypeFromBuffer,
  detectMimeTypeFromFile
};
