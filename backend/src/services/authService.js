const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Membership = require("../models/Membership");
const { HttpError } = require("../utils/httpError");
const { hashPassword, signToken, verifyPassword } = require("../utils/auth");
const { getDocumentLimitForPlan } = require("./planService");

function toApiUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name
  };
}

function toApiCompany(company) {
  return {
    id: company._id.toString(),
    name: company.name,
    tax_id: company.taxId,
    vat_id: company.vatId,
    address: company.address,
    plan: company.plan,
    document_limit: company.documentLimit,
    billing_period: company.billingPeriod
  };
}

function toApiMembership(membership) {
  return {
    id: membership._id.toString(),
    user_id: membership.userId.toString(),
    company_id: membership.companyId.toString(),
    role: membership.role
  };
}

function buildAuthResponse(user, company, membership) {
  const token = signToken({
    sub: user._id.toString(),
    company_id: company._id.toString(),
    membership_id: membership._id.toString(),
    role: membership.role
  });

  return {
    token,
    user: toApiUser(user),
    company: toApiCompany(company),
    membership: toApiMembership(membership)
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  if (String(password || "").length < 8) {
    throw new HttpError(400, "Паролата трябва да бъде поне 8 символа.");
  }
}

async function registerUser(payload) {
  const email = normalizeEmail(payload.email);
  const name = String(payload.name || "").trim();
  const companyName = String(payload.company_name || payload.companyName || "").trim();
  const password = String(payload.password || "");
  const plan = payload.plan || "free";

  if (!email || !name || !companyName) {
    throw new HttpError(400, "Име, имейл и име на фирма са задължителни.");
  }

  validatePassword(password);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new HttpError(409, "Вече има потребител с този имейл.");
  }

  const session = await mongoose.startSession();

  try {
    let authResponse;

    await session.withTransaction(async () => {
      const [user] = await User.create(
        [
          {
            email,
            name,
            passwordHash: hashPassword(password)
          }
        ],
        { session }
      );

      const [company] = await Company.create(
        [
          {
            name: companyName,
            taxId: payload.tax_id || null,
            vatId: payload.vat_id || null,
            address: payload.address || null,
            plan,
            documentLimit: getDocumentLimitForPlan(plan)
          }
        ],
        { session }
      );

      const [membership] = await Membership.create(
        [
          {
            userId: user._id,
            companyId: company._id,
            role: "owner"
          }
        ],
        { session }
      );

      authResponse = buildAuthResponse(user, company, membership);
    });

    return authResponse;
  } finally {
    await session.endSession();
  }
}

async function loginUser(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const user = await User.findOne({ email });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, "Невалиден имейл или парола.");
  }

  const membership = await Membership.findOne({ userId: user._id, isActive: true }).sort({ createdAt: 1 });
  if (!membership) {
    throw new HttpError(403, "Потребителят няма активна фирма.");
  }

  const company = await Company.findById(membership.companyId);
  if (!company) {
    throw new HttpError(404, "Фирмата не е намерена.");
  }

  return buildAuthResponse(user, company, membership);
}

async function getAuthContext(tokenPayload) {
  const [user, company, membership] = await Promise.all([
    User.findById(tokenPayload.sub),
    Company.findById(tokenPayload.company_id),
    Membership.findById(tokenPayload.membership_id)
  ]);

  if (!user || !user.isActive || !company || !membership || !membership.isActive) {
    throw new HttpError(401, "Невалидна или изтекла сесия.");
  }

  return {
    user,
    company,
    membership,
    api: {
      user: toApiUser(user),
      company: toApiCompany(company),
      membership: toApiMembership(membership)
    }
  };
}

module.exports = {
  getAuthContext,
  loginUser,
  registerUser,
  toApiCompany
};
