const planDocumentLimits = {
  free: 50,
  starter: 200,
  pro: 1000,
  business: 5000
};

function getDocumentLimitForPlan(plan) {
  return planDocumentLimits[plan] || planDocumentLimits.free;
}

module.exports = {
  getDocumentLimitForPlan
};
