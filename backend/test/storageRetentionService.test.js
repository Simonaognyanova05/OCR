const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { cleanupLocalStorageRetention } = require("../src/services/storageRetentionService");

async function touch(filePath, mtime) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "data");
  await fs.utimes(filePath, mtime, mtime);
}

test("local storage retention removes old uploads and outputs but keeps fresh files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-retention-"));
  const uploadDir = path.join(tempDir, "uploads");
  const outputDir = path.join(tempDir, "outputs");
  const now = new Date("2026-07-18T12:00:00Z").getTime();
  const oldTime = new Date(now - 40 * 24 * 60 * 60 * 1000);
  const freshTime = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const oldUpload = path.join(uploadDir, "old.pdf");
  const freshUpload = path.join(uploadDir, "fresh.pdf");
  const oldOutput = path.join(outputDir, "nested", "old.json");
  const freshOutput = path.join(outputDir, "fresh.json");

  try {
    await touch(oldUpload, oldTime);
    await touch(freshUpload, freshTime);
    await touch(oldOutput, oldTime);
    await touch(freshOutput, freshTime);

    const result = await cleanupLocalStorageRetention({
      uploadDir,
      outputDir,
      localUploadRetentionDays: 30,
      localOutputRetentionDays: 7
    }, now);

    assert.deepEqual(result.removedUploads, [oldUpload]);
    assert.deepEqual(result.removedOutputs, [oldOutput]);
    await assert.rejects(() => fs.stat(oldUpload), { code: "ENOENT" });
    await assert.rejects(() => fs.stat(oldOutput), { code: "ENOENT" });
    assert.ok(await fs.stat(freshUpload));
    assert.ok(await fs.stat(freshOutput));
    assert.ok(await fs.stat(uploadDir));
    assert.ok(await fs.stat(outputDir));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
