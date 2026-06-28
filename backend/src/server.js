const app = require("./app");
const { config } = require("./config/env");
const { connectDatabase } = require("./config/db");
const { ensureStorage } = require("./services/storageService");

async function startServer() {
  await connectDatabase();
  await ensureStorage();

  app.listen(config.port, () => {
    console.log(`OCR backend listening on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
