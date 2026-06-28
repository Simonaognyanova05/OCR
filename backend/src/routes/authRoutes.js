const express = require("express");
const {
  loginHandler,
  meHandler,
  registerHandler
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/auth/register", registerHandler);
router.post("/auth/login", loginHandler);
router.get("/auth/me", requireAuth, meHandler);

module.exports = router;
