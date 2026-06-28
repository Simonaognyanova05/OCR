const express = require("express");
const path = require("node:path");
const cors = require("cors");
const { config } = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const documentRoutes = require("./routes/documentRoutes");
const { errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(config.uploadDir)));

app.use(healthRoutes);
app.use("/api", authRoutes);
app.use("/api", companyRoutes);
app.use("/api", documentRoutes);

app.use(errorMiddleware);

module.exports = app;
