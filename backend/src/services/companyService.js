const Company = require("../models/Company");
const Membership = require("../models/Membership");
const SubscriptionRequest = require("../models/SubscriptionRequest");
const User = require("../models/User");
const { HttpError } = require("../utils/httpError");
const { hashPassword } = require("../utils/auth");
const { assertValidPlan, getDocumentLimitForPlan, getPlans } = require("./planService");
const { toApiCompany } = require("./authService");

function assertOwner(membership) {
  if (membership.role !== "owner") {
    throw new HttpError(403, "Само owner може да редактира фирмения профил.");
  }
}

async function getCompanyProfile(authContext) {
  const pendingSubscriptionRequest = await SubscriptionRequest.findOne({
    companyId: authContext.company._id,
    status: "pending"
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    company: toApiCompany(authContext.company),
    membership: {
      id: authContext.membership._id.toString(),
      role: authContext.membership.role
    },
    plans: getPlans(),
    pending_subscription_request: pendingSubscriptionRequest
      ? toApiSubscriptionRequest(pendingSubscriptionRequest)
      : null
  };
}

async function updateCompanyProfile(authContext, payload) {
  assertOwner(authContext.membership);

  const updates = {};

  if (payload.name !== undefined) updates.name = String(payload.name).trim();
  if (payload.tax_id !== undefined) updates.taxId = payload.tax_id || null;
  if (payload.vat_id !== undefined) updates.vatId = payload.vat_id || null;
  if (payload.address !== undefined) updates.address = payload.address || null;

  if (payload.plan !== undefined) {
    throw new HttpError(400, "Планът се сменя чрез заявка за абонамент.");
  }

  const company = await Company.findByIdAndUpdate(authContext.company._id, { $set: updates }, {
    new: true,
    runValidators: true
  });

  return {
    company: toApiCompany(company)
  };
}

function toApiSubscriptionRequest(subscriptionRequest) {
  return {
    id: subscriptionRequest._id.toString(),
    current_plan: subscriptionRequest.currentPlan,
    requested_plan: subscriptionRequest.requestedPlan,
    status: subscriptionRequest.status,
    note: subscriptionRequest.note,
    created_at: subscriptionRequest.createdAt,
    updated_at: subscriptionRequest.updatedAt
  };
}

async function requestSubscriptionPlan(authContext, payload) {
  assertOwner(authContext.membership);

  const requestedPlan = String(payload.plan || "").trim();
  const note = payload.note ? String(payload.note).trim() : null;

  try {
    assertValidPlan(requestedPlan);
  } catch (_error) {
    throw new HttpError(400, "Избери валиден абонаментен план.");
  }

  if (requestedPlan === authContext.company.plan) {
    throw new HttpError(400, "Фирмата вече е на този план.");
  }

  const existingPendingRequest = await SubscriptionRequest.findOne({
    companyId: authContext.company._id,
    status: "pending"
  });

  if (existingPendingRequest) {
    throw new HttpError(409, "Вече има чакаща заявка за абонамент.");
  }

  const subscriptionRequest = await SubscriptionRequest.create({
    companyId: authContext.company._id,
    requestedBy: authContext.user._id,
    currentPlan: authContext.company.plan,
    requestedPlan,
    note
  });

  return {
    subscription_request: toApiSubscriptionRequest(subscriptionRequest)
  };
}

async function listCompanyMemberships(authContext) {
  const memberships = await Membership.find({ companyId: authContext.company._id, isActive: true })
    .populate("userId", "email name")
    .sort({ createdAt: 1 });

  return {
    memberships: memberships.map((membership) => ({
      id: membership._id.toString(),
      role: membership.role,
      user: {
        id: membership.userId._id.toString(),
        email: membership.userId.email,
        name: membership.userId.name
      }
    }))
  };
}

async function createCompanyMembership(authContext, payload) {
  assertOwner(authContext.membership);

  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const password = String(payload.password || "");
  const role = payload.role || "employee";

  if (!email || !name || password.length < 8) {
    throw new HttpError(400, "Име, имейл и парола поне 8 символа са задължителни.");
  }

  if (!["accountant", "employee"].includes(role)) {
    throw new HttpError(400, "Позволени роли за добавяне са accountant и employee.");
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name,
      passwordHash: hashPassword(password)
    });
  }

  const existingMembership = await Membership.findOne({
    userId: user._id,
    companyId: authContext.company._id
  });

  if (existingMembership) {
    throw new HttpError(409, "Този потребител вече е член на фирмата.");
  }

  const membership = await Membership.create({
    userId: user._id,
    companyId: authContext.company._id,
    role
  });

  return {
    membership: {
      id: membership._id.toString(),
      role: membership.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    }
  };
}

module.exports = {
  createCompanyMembership,
  getCompanyProfile,
  listCompanyMemberships,
  requestSubscriptionPlan,
  updateCompanyProfile
};
