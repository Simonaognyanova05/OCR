const mongoose = require("mongoose");
const { config, assertDatabaseConfig } = require("./env");

async function connectDatabase() {
  assertDatabaseConfig();

  mongoose.set("strictQuery", true);

  await mongoose.connect(config.mongodbUri);
  console.log("MongoDB connected");
}

module.exports = {
  connectDatabase,
};

