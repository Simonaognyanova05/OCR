const fs = require("node:fs/promises");
const path = require("node:path");

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function getImageMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext];

  if (!mimeType) {
    throw new Error(`Неподдържан файлов тип "${ext}". Използвай PNG, JPG, JPEG или WEBP.`);
  }

  return mimeType;
}

async function imageToDataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  const mimeType = getImageMimeType(filePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

module.exports = {
  getImageMimeType,
  imageToDataUrl
};
