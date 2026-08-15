const express = require("express");
const {
  loginHandler,
  meHandler,
  registerHandler
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { authRateLimit } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/auth/register", authRateLimit, registerHandler);
router.post("/auth/login", authRateLimit, loginHandler);
router.get("/auth/me", requireAuth, meHandler);

module.exports = router;
