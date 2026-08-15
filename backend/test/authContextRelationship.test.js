const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");
const Company = require("../src/models/Company");
const Membership = require("../src/models/Membership");
const { getAuthContext } = require("../src/services/authService");
const { requireAuth, requireRole } = require("../src/middleware/authMiddleware");

const userId = "507f1f77bcf86cd799439011";
const companyId = "507f1f77bcf86cd799439012";
const membershipId = "507f1f77bcf86cd799439013";
const otherUserId = "507f1f77bcf86cd799439014";
const otherCompanyId = "507f1f77bcf86cd799439015";

function findByIdFrom(records) {
  return async (id) => records[String(id)] || null;
}

async function withAuthRecords(records, callback) {
  const originalUserFindById = User.findById;
  const originalCompanyFindById = Company.findById;
  const originalMembershipFindById = Membership.findById;

  User.findById = findByIdFrom(records.users);
  Company.findById = findByIdFrom(records.companies);
  Membership.findById = findByIdFrom(records.memberships);

  try {
    return await callback();
  } finally {
    User.findById = originalUserFindById;
    Company.findById = originalCompanyFindById;
    Membership.findById = originalMembershipFindById;
  }
}

function buildRecords(overrides = {}) {
  return {
    users: {
      [userId]: {
        _id: userId,
        email: "owner@example.com",
        name: "Owner",
        isActive: true
      }
    },
    companies: {
      [companyId]: {
        _id: companyId,
        name: "Example Ltd",
        plan: "starter"
      }
    },
    memberships: {
      [membershipId]: {
        _id: membershipId,
        userId,
        companyId,
        role: "owner",
        isActive: true,
        ...overrides.membership
      }
    }
  };
}

function tokenPayload() {
  return {
    sub: userId,
    company_id: companyId,
    membership_id: membershipId,
    role: "owner"
  };
}

test("requireAuth denies anonymous requests before building auth context", async () => {
  const req = { headers: {} };
  let nextError;

  await requireAuth(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 401);
  assert.equal(req.auth, undefined);
});

test("auth context accepts a membership tied to the token user and company", async () => {
  await withAuthRecords(buildRecords(), async () => {
    const context = await getAuthContext(tokenPayload());

    assert.equal(context.user._id, userId);
    assert.equal(context.company._id, companyId);
    assert.equal(context.membership._id, membershipId);
    assert.equal(context.api.membership.user_id, userId);
    assert.equal(context.api.membership.company_id, companyId);
  });
});

test("auth context rejects a membership tied to another user", async () => {
  await withAuthRecords(buildRecords({ membership: { userId: otherUserId } }), async () => {
    await assert.rejects(
      () => getAuthContext(tokenPayload()),
      (error) => error.statusCode === 401
    );
  });
});

test("auth context rejects a membership tied to another company", async () => {
  await withAuthRecords(buildRecords({ membership: { companyId: otherCompanyId } }), async () => {
    await assert.rejects(
      () => getAuthContext(tokenPayload()),
      (error) => error.statusCode === 401
    );
  });
});

test("role guard allows matching roles and denies insufficient roles", () => {
  let allowedError;
  requireRole(["owner"])({ auth: { membership: { role: "owner" } } }, {}, (error) => {
    allowedError = error;
  });
  assert.equal(allowedError, undefined);

  let deniedError;
  requireRole(["owner"])({ auth: { membership: { role: "employee" } } }, {}, (error) => {
    deniedError = error;
  });
  assert.equal(deniedError.statusCode, 403);
});
