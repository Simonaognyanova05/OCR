const express = require("express");
const {
  createCompanyMembershipHandler,
  getCompanyProfileHandler,
  listCompanyMembershipsHandler,
  updateCompanyProfileHandler
} = require("../controllers/companyController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/company", requireAuth, getCompanyProfileHandler);
router.put("/company", requireAuth, requireRole(["owner"]), updateCompanyProfileHandler);
router.get("/company/memberships", requireAuth, requireRole(["owner", "accountant"]), listCompanyMembershipsHandler);
router.post("/company/memberships", requireAuth, requireRole(["owner"]), createCompanyMembershipHandler);

module.exports = router;
