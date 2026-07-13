const planDocumentLimits = {
  free: 50,
  starter: 200,
  pro: 1000,
  business: 5000
};

const plans = [
  { id: "free", name: "Free", documentLimit: 50, description: "За тест и малък обем документи." },
  { id: "starter", name: "Starter", documentLimit: 200, description: "За малки фирми с регулярни разходни документи." },
  { id: "pro", name: "Pro", documentLimit: 1000, description: "За активни фирми и счетоводни екипи." },
  { id: "business", name: "Business", documentLimit: 5000, description: "За счетоводни къщи и по-голям обем документи." }
];

function getPlans() {
  return plans;
}

function assertValidPlan(plan) {
  if (!planDocumentLimits[plan]) {
    throw new Error("Невалиден абонаментен план.");
  }
}

function getDocumentLimitForPlan(plan) {
  return planDocumentLimits[plan] || planDocumentLimits.free;
}

module.exports = {
  assertValidPlan,
  getPlans,
  getDocumentLimitForPlan
};
