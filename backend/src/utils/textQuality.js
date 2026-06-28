const mojibakeMarkers = [
  "\u00c3",
  "\u00c2",
  "\u00d0",
  "\u00d1",
  "\u00e2",
  "\ufffd"
];

function removeControlCharacters(value) {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}

function countMojibakeMarkers(value) {
  return mojibakeMarkers.reduce((count, marker) => count + value.split(marker).length - 1, 0);
}

function tryRepairMojibake(value) {
  if (countMojibakeMarkers(value) === 0) {
    return value;
  }

  const repaired = Buffer.from(value, "latin1").toString("utf8");

  if (countMojibakeMarkers(repaired) < countMojibakeMarkers(value) && !repaired.includes("\ufffd")) {
    return repaired;
  }

  return value;
}

function normalizeTextValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  const repaired = tryRepairMojibake(value);

  return removeControlCharacters(repaired)
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyGarbledText(value) {
  if (typeof value !== "string") {
    return false;
  }

  const text = normalizeTextValue(value);

  if (text.length < 6) {
    return false;
  }

  if (mojibakeMarkers.some((marker) => text.includes(marker))) {
    return true;
  }

  const suspiciousSymbols = text.match(/[<>{}[\]~`^\\|"'@$]+|\u00b4/g) || [];
  const highLatinChars = text.match(/[\u00c0-\u024f]/g) || [];
  const letters = text.match(/[A-Za-z\u0400-\u04ff]/g) || [];
  const nonWordChars = text.match(/[^A-Za-z\u0400-\u04ff0-9\s.,:/()%+-]/g) || [];
  const arrowLikeFragments = text.match(/[A-Za-z0-9][><][A-Za-z0-9]/g) || [];

  if (suspiciousSymbols.length >= 2 || arrowLikeFragments.length > 0) {
    return true;
  }

  if (highLatinChars.length >= 1 && suspiciousSymbols.length >= 1) {
    return true;
  }

  if (highLatinChars.length >= 2 && highLatinChars.length / text.length > 0.08) {
    return true;
  }

  return letters.length > 0 && nonWordChars.length / text.length > 0.12;
}

function cleanDisplayText(value) {
  const normalized = normalizeTextValue(value);

  if (isLikelyGarbledText(normalized)) {
    return "[нечетим текст]";
  }

  return normalized;
}

function sanitizeTextForStorage(value, options = {}) {
  const normalized = normalizeTextValue(value);

  if (options.nullIfGarbled && isLikelyGarbledText(normalized)) {
    return null;
  }

  return normalized;
}

module.exports = {
  cleanDisplayText,
  isLikelyGarbledText,
  normalizeTextValue,
  sanitizeTextForStorage,
};
