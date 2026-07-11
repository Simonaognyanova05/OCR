const express = require("express");
const {
  approveSubscriptionRequestHandler,
  listSubscriptionRequestsHandler,
  rejectSubscriptionRequestHandler
} = require("../controllers/adminController");
const { requireAdmin, requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/subscription-requests", requireAuth, requireAdmin, listSubscriptionRequestsHandler);
router.post("/subscription-requests/:id/approve", requireAuth, requireAdmin, approveSubscriptionRequestHandler);
router.post("/subscription-requests/:id/reject", requireAuth, requireAdmin, rejectSubscriptionRequestHandler);

module.exports = router;
