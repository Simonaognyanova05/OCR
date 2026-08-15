const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("../config/env");

function isInsideRoot(rootDir, candidatePath) {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  const relativePath = path.relative(root, candidate);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

async function removeOldFiles(rootDir, olderThanMs, now = Date.now()) {
  const root = path.resolve(rootDir);
  const cutoff = now - olderThanMs;
  const removed = [];

  async function visit(currentPath) {
    if (!isInsideRoot(root, currentPath)) {
      return;
    }

    const stats = await fs.lstat(currentPath).catch(() => null);
    if (!stats) {
      return;
    }

    if (stats.isDirectory()) {
      const entries = await fs.readdir(currentPath).catch(() => []);

      for (const entry of entries) {
        await visit(path.join(currentPath, entry));
      }

      await fs.rmdir(currentPath).catch(() => {});
      return;
    }

    if (stats.mtimeMs < cutoff) {
      await fs.rm(currentPath, { force: true });
      removed.push(currentPath);
    }
  }

  const entries = await fs.readdir(root).catch(() => []);

  for (const entry of entries) {
    await visit(path.join(root, entry));
  }

  return removed;
}

async function cleanupLocalStorageRetention(runtimeConfig = config, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const removedUploads = await removeOldFiles(
    runtimeConfig.uploadDir,
    runtimeConfig.localUploadRetentionDays * dayMs,
    now
  );
  const removedOutputs = await removeOldFiles(
    runtimeConfig.outputDir,
    runtimeConfig.localOutputRetentionDays * dayMs,
    now
  );

  return {
    removedUploads,
    removedOutputs
  };
}

function startStorageRetentionSchedule(runtimeConfig = config) {
  const interval = setInterval(() => {
    cleanupLocalStorageRetention(runtimeConfig).catch((error) => {
      console.error("Local storage retention cleanup failed:", error.message);
    });
  }, runtimeConfig.localStorageCleanupIntervalMs);

  if (typeof interval.unref === "function") {
    interval.unref();
  }

  return interval;
}

module.exports = {
  cleanupLocalStorageRetention,
  removeOldFiles,
  startStorageRetentionSchedule
};
