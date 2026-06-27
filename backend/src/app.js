const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/healthRoutes");
const documentRoutes = require("./routes/documentRoutes");
const { errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(healthRoutes);
app.use("/api", documentRoutes);

app.use(errorMiddleware);

module.exports = app;

