const contractDocumentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    contractType: {
      type: ["string", "null"],
      enum: ["Lease", "SalePurchase", "Service", "Client", "Supplier", "NDA", "Employment", "License", "Other", null]
    },
    title: { type: ["string", "null"] },
    partyA: { type: ["string", "null"] },
    partyB: { type: ["string", "null"] },
    signDate: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    endDate: { type: ["string", "null"] },
    durationMonths: { type: ["number", "null"] },
    currency: {
      type: ["string", "null"],
      enum: ["BGN", "EUR", "USD", null]
    },
    contractValue: { type: ["number", "null"] },
    monthlyPayment: { type: ["number", "null"] },
    terminationNoticeDays: { type: ["number", "null"] },
    penaltyAmount: { type: ["number", "null"] },
    renewsAutomatically: { type: ["boolean", "null"] },
    importantClauses: {
      type: "array",
      items: {
        type: "string",
        enum: ["Penalty", "AutoRenewal", "Termination", "ForceMajeure", "Confidentiality", "Liability", "Arbitration", "Exclusivity", "Other"]
      }
    },
    summary: { type: ["string", "null"] },
    confidence: { type: ["number", "null"] }
  },
  required: [
    "contractType",
    "title",
    "partyA",
    "partyB",
    "signDate",
    "startDate",
    "endDate",
    "durationMonths",
    "currency",
    "contractValue",
    "monthlyPayment",
    "terminationNoticeDays",
    "penaltyAmount",
    "renewsAutomatically",
    "importantClauses",
    "summary",
    "confidence"
  ]
};

module.exports = {
  contractDocumentSchema
};
