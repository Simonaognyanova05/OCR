const {
  approveSubscriptionRequest,
  listSubscriptionRequests,
  rejectSubscriptionRequest
} = require("../services/adminService");

async function listSubscriptionRequestsHandler(req, res, next) {
  try {
    res.json(await listSubscriptionRequests(req.query || {}));
  } catch (error) {
    next(error);
  }
}

async function approveSubscriptionRequestHandler(req, res, next) {
  try {
    res.json(await approveSubscriptionRequest(req.params.id, req.auth.user._id));
  } catch (error) {
    next(error);
  }
}

async function rejectSubscriptionRequestHandler(req, res, next) {
  try {
    res.json(await rejectSubscriptionRequest(req.params.id, req.auth.user._id));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveSubscriptionRequestHandler,
  listSubscriptionRequestsHandler,
  rejectSubscriptionRequestHandler
};
