const Contract = require("../models/Contract");
const { HttpError } = require("../utils/httpError");

const contractStatuses = new Set(["uploaded", "processing", "extracted", "failed"]);
const contractTypes = new Set(["Lease", "SalePurchase", "Service", "Client", "Supplier", "NDA", "Employment", "License", "Other"]);
const currencies = new Set(["BGN", "EUR", "USD"]);
const maxTextFilterLength = 80;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function assertTenantScope(companyId) {
  if (companyId === undefined || companyId === null || companyId === "") {
    throw new Error("Tenant companyId is required for contract repository access.");
  }
}

function buildProtectedFileEndpoint(contractId) {
  return `/api/contracts/${contractId.toString()}/file`;
}

function toApiContract(contract) {
  return {
    id: contract._id.toString(),
    company_id: contract.companyId.toString(),
    uploaded_by: contract.uploadedBy.toString(),
    original_name: contract.originalName,
    original_file_name: contract.originalFileName || contract.originalName,
    file_endpoint: buildProtectedFileEndpoint(contract._id),
    mime_type: contract.mimeType,
    model: contract.model,
    status: contract.status,
    contract_type: contract.contractType,
    extracted_at: contract.extractedAt ? contract.extractedAt.toISOString() : undefined,
    processing_started_at: contract.processingStartedAt ? contract.processingStartedAt.toISOString() : undefined,
    processing_completed_at: contract.processingCompletedAt ? contract.processingCompletedAt.toISOString() : undefined,
    failed_at: contract.failedAt ? contract.failedAt.toISOString() : undefined,
    failure_code: contract.failureCode || undefined,
    failure_message: contract.failureMessage || undefined,
    created_at: contract.createdAt ? contract.createdAt.toISOString() : undefined,
    updated_at: contract.updatedAt ? contract.updatedAt.toISOString() : undefined,
    data: contract.data
  };
}

function toApiContractListItem(contract) {
  const data = contract.data || {};

  return {
    id: contract._id.toString(),
    title: data.title || contract.originalName,
    contractType: contract.contractType || data.contractType || null,
    partyA: data.partyA || null,
    partyB: data.partyB || null,
    signDate: data.signDate || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    contractValue: data.contractValue ?? null,
    monthlyPayment: data.monthlyPayment ?? null,
    penaltyAmount: data.penaltyAmount ?? null,
    currency: data.currency || null,
    renewsAutomatically: data.renewsAutomatically ?? null,
    status: contract.status,
    createdAt: contract.createdAt ? contract.createdAt.toISOString() : undefined,
    updatedAt: contract.updatedAt ? contract.updatedAt.toISOString() : undefined
  };
}

function parsePositiveInteger(value, fallback, max) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new HttpError(400, "Invalid pagination value.");
  }

  return Math.min(number, max);
}

function parseAmountFilter(value, name) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, `Invalid ${name} filter.`);
  }

  return number;
}

function parseBooleanFilter(value, name) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;

  throw new HttpError(400, `Invalid ${name} filter.`);
}

function assertIsoDate(value, name) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!isoDatePattern.test(normalized)) {
    throw new HttpError(400, `Invalid ${name} filter.`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, `Invalid ${name} filter.`);
  }

  return normalized;
}

function normalizeTextFilter(value, name) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (normalized.length > maxTextFilterLength) {
    throw new HttpError(400, `${name} filter is too long.`);
  }

  return normalized;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addRegexFilter(query, fields, value) {
  if (!value) return;

  query.$or = fields.map((field) => ({
    [field]: { $regex: escapeRegex(value), $options: "i" }
  }));
}

function getDateAfterDays(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeFilters(filters = {}) {
  const status = filters.status ? String(filters.status).trim() : "";
  const contractType = filters.contractType ? String(filters.contractType).trim() : "";
  const currency = filters.currency ? String(filters.currency).trim() : "";

  if (status && !contractStatuses.has(status)) {
    throw new HttpError(400, "Invalid status filter.");
  }

  if (contractType && !contractTypes.has(contractType)) {
    throw new HttpError(400, "Invalid contractType filter.");
  }

  if (currency && !currencies.has(currency)) {
    throw new HttpError(400, "Invalid currency filter.");
  }

  const endDateFrom = assertIsoDate(filters.endDateFrom, "endDateFrom");
  const endDateTo = filters.expiresInDays
    ? getDateAfterDays(parsePositiveInteger(filters.expiresInDays, 30, 3650))
    : assertIsoDate(filters.endDateTo, "endDateTo");
  const valueMin = parseAmountFilter(filters.valueMin, "valueMin");
  const valueMax = parseAmountFilter(filters.valueMax, "valueMax");
  const penaltyMin = parseAmountFilter(filters.penaltyMin, "penaltyMin");
  const penaltyMax = parseAmountFilter(filters.penaltyMax, "penaltyMax");

  if (endDateFrom && endDateTo && endDateFrom > endDateTo) {
    throw new HttpError(400, "Invalid end date range.");
  }

  if (valueMin !== undefined && valueMax !== undefined && valueMin > valueMax) {
    throw new HttpError(400, "Invalid value range.");
  }

  if (penaltyMin !== undefined && penaltyMax !== undefined && penaltyMin > penaltyMax) {
    throw new HttpError(400, "Invalid penalty range.");
  }

  return {
    page: parsePositiveInteger(filters.page, 1, Number.MAX_SAFE_INTEGER),
    limit: parsePositiveInteger(filters.limit, 50, 100),
    status: status || undefined,
    contractType: contractType || undefined,
    currency: currency || undefined,
    company: normalizeTextFilter(filters.company, "company"),
    endDateFrom,
    endDateTo,
    valueMin,
    valueMax,
    penaltyMin,
    penaltyMax,
    renewsAutomatically: parseBooleanFilter(filters.renewsAutomatically, "renewsAutomatically")
  };
}

async function createUploadedContract(payload) {
  const contract = new Contract({
    companyId: payload.company_id,
    uploadedBy: payload.uploaded_by,
    originalName: payload.original_file_name,
    originalFileName: payload.original_file_name,
    storedFile: payload.stored_file,
    fileUrl: "",
    mimeType: payload.mime_type,
    status: "uploaded",
    contractType: null,
    data: null
  });

  contract.fileUrl = buildProtectedFileEndpoint(contract._id);
  await contract.save();

  return toApiContract(contract);
}

async function countCompanyContractsThisMonth(companyId) {
  assertTenantScope(companyId);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  return Contract.countDocuments({
    companyId,
    createdAt: { $gte: startOfMonth }
  });
}

async function updateContractStatus(contractId, companyId, status, extraUpdates = {}) {
  assertTenantScope(companyId);

  const contract = await Contract.findOneAndUpdate(
    { _id: contractId, companyId },
    { $set: { status, ...extraUpdates } },
    { new: true, runValidators: true }
  );

  if (!contract) {
    throw new HttpError(404, "Contract not found.");
  }

  return toApiContract(contract);
}

async function updateExtractedContract(contractId, companyId, payload) {
  assertTenantScope(companyId);

  const contractType = payload.data?.contractType || null;
  const contract = await Contract.findOneAndUpdate(
    { _id: contractId, companyId },
    {
      $set: {
        status: "extracted",
        model: payload.model,
        contractType,
        extractedAt: payload.extracted_at,
        processingCompletedAt: new Date(),
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        data: payload.data
      }
    },
    { new: true, runValidators: true }
  );

  if (!contract) {
    throw new HttpError(404, "Contract not found.");
  }

  return toApiContract(contract);
}

async function findContractById(contractId, companyId) {
  assertTenantScope(companyId);

  const contract = await Contract.findOne({ _id: contractId, companyId });
  if (!contract) {
    throw new HttpError(404, "Contract not found.");
  }

  return toApiContract(contract);
}

async function findContractFileById(contractId, companyId) {
  assertTenantScope(companyId);

  const contract = await Contract.findOne({ _id: contractId, companyId })
    .select("originalName originalFileName storedFile mimeType");

  if (!contract) {
    throw new HttpError(404, "Contract not found.");
  }

  return {
    originalName: contract.originalFileName || contract.originalName,
    storedFile: contract.storedFile,
    mimeType: contract.mimeType
  };
}

async function listCompanyContracts(companyId, filters) {
  assertTenantScope(companyId);

  const normalizedFilters = normalizeFilters(filters);
  const { limit, page } = normalizedFilters;
  const query = { companyId };

  if (normalizedFilters.status) query.status = normalizedFilters.status;
  if (normalizedFilters.contractType) query.contractType = normalizedFilters.contractType;
  if (normalizedFilters.currency) query["data.currency"] = normalizedFilters.currency;
  if (normalizedFilters.renewsAutomatically !== undefined) query["data.renewsAutomatically"] = normalizedFilters.renewsAutomatically;
  addRegexFilter(query, ["data.partyA", "data.partyB", "data.title"], normalizedFilters.company);

  if (normalizedFilters.endDateFrom || normalizedFilters.endDateTo) {
    query["data.endDate"] = {};
    if (normalizedFilters.endDateFrom) query["data.endDate"].$gte = normalizedFilters.endDateFrom;
    if (normalizedFilters.endDateTo) query["data.endDate"].$lte = normalizedFilters.endDateTo;
  }

  if (normalizedFilters.valueMin !== undefined || normalizedFilters.valueMax !== undefined) {
    query["data.contractValue"] = {};
    if (normalizedFilters.valueMin !== undefined) query["data.contractValue"].$gte = normalizedFilters.valueMin;
    if (normalizedFilters.valueMax !== undefined) query["data.contractValue"].$lte = normalizedFilters.valueMax;
  }

  if (normalizedFilters.penaltyMin !== undefined || normalizedFilters.penaltyMax !== undefined) {
    query["data.penaltyAmount"] = {};
    if (normalizedFilters.penaltyMin !== undefined) query["data.penaltyAmount"].$gte = normalizedFilters.penaltyMin;
    if (normalizedFilters.penaltyMax !== undefined) query["data.penaltyAmount"].$lte = normalizedFilters.penaltyMax;
  }

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Contract.countDocuments(query)
  ]);

  return {
    contracts: contracts.map(toApiContractListItem),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  countCompanyContractsThisMonth,
  createUploadedContract,
  findContractById,
  findContractFileById,
  listCompanyContracts,
  updateContractStatus,
  updateExtractedContract
};
