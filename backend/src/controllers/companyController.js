const {
  createCompanyMembership,
  getCompanyProfile,
  listCompanyMemberships,
  updateCompanyProfile
} = require("../services/companyService");

async function getCompanyProfileHandler(req, res, next) {
  try {
    res.json(await getCompanyProfile(req.auth));
  } catch (error) {
    next(error);
  }
}

async function updateCompanyProfileHandler(req, res, next) {
  try {
    res.json(await updateCompanyProfile(req.auth, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function listCompanyMembershipsHandler(req, res, next) {
  try {
    res.json(await listCompanyMemberships(req.auth));
  } catch (error) {
    next(error);
  }
}

async function createCompanyMembershipHandler(req, res, next) {
  try {
    res.status(201).json(await createCompanyMembership(req.auth, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCompanyMembershipHandler,
  getCompanyProfileHandler,
  listCompanyMembershipsHandler,
  updateCompanyProfileHandler
};
