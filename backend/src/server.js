const app = require("./app");
const { assertRuntimeConfig, config } = require("./config/env");
const { connectDatabase } = require("./config/db");
const { ensureStorage } = require("./services/storageService");
const {
  cleanupLocalStorageRetention,
  startStorageRetentionSchedule
} = require("./services/storageRetentionService");

async function startServer() {
  assertRuntimeConfig();
  await connectDatabase();
  await ensureStorage();
  await cleanupLocalStorageRetention();
  startStorageRetentionSchedule();

  app.listen(config.port, () => {
    console.log(`OCR backend listening on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
