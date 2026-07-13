const Company = require("../models/Company");
const SubscriptionRequest = require("../models/SubscriptionRequest");
const { HttpError } = require("../utils/httpError");
const { getDocumentLimitForPlan } = require("./planService");

function toApiSubscriptionRequest(request) {
  return {
    id: request._id.toString(),
    status: request.status,
    current_plan: request.currentPlan,
    requested_plan: request.requestedPlan,
    note: request.note,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    company: request.companyId
      ? {
          id: request.companyId._id.toString(),
          name: request.companyId.name,
          tax_id: request.companyId.taxId,
          plan: request.companyId.plan,
          document_limit: request.companyId.documentLimit
        }
      : null,
    requested_by: request.requestedBy
      ? {
          id: request.requestedBy._id.toString(),
          email: request.requestedBy.email,
          name: request.requestedBy.name
        }
      : null
  };
}

async function listSubscriptionRequests(filters = {}) {
  const status = filters.status || "pending";
  const query = status === "all" ? {} : { status };

  const requests = await SubscriptionRequest.find(query)
    .populate("companyId", "name taxId plan documentLimit")
    .populate("requestedBy", "email name")
    .sort({ createdAt: -1 })
    .limit(100);

  return {
    subscription_requests: requests.map(toApiSubscriptionRequest)
  };
}

async function approveSubscriptionRequest(requestId, adminUserId) {
  const request = await SubscriptionRequest.findById(requestId);

  if (!request) {
    throw new HttpError(404, "Заявката не е намерена.");
  }

  if (request.status !== "pending") {
    throw new HttpError(400, "Само чакащи заявки могат да бъдат одобрени.");
  }

  const company = await Company.findByIdAndUpdate(
    request.companyId,
    {
      $set: {
        plan: request.requestedPlan,
        documentLimit: getDocumentLimitForPlan(request.requestedPlan)
      }
    },
    { new: true, runValidators: true }
  );

  if (!company) {
    throw new HttpError(404, "Фирмата към заявката не е намерена.");
  }

  request.status = "approved";
  request.reviewedBy = adminUserId;
  request.reviewedAt = new Date();
  await request.save();

  await request.populate("companyId", "name taxId plan documentLimit");
  await request.populate("requestedBy", "email name");

  return {
    subscription_request: toApiSubscriptionRequest(request)
  };
}

async function rejectSubscriptionRequest(requestId, adminUserId) {
  const request = await SubscriptionRequest.findById(requestId);

  if (!request) {
    throw new HttpError(404, "Заявката не е намерена.");
  }

  if (request.status !== "pending") {
    throw new HttpError(400, "Само чакащи заявки могат да бъдат отказани.");
  }

  request.status = "rejected";
  request.reviewedBy = adminUserId;
  request.reviewedAt = new Date();
  await request.save();

  await request.populate("companyId", "name taxId plan documentLimit");
  await request.populate("requestedBy", "email name");

  return {
    subscription_request: toApiSubscriptionRequest(request)
  };
}

module.exports = {
  approveSubscriptionRequest,
  listSubscriptionRequests,
  rejectSubscriptionRequest
};
