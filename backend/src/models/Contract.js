const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    originalFileName: {
      type: String,
      trim: true,
      default: null
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    storedFile: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    model: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "extracted", "failed"],
      required: true,
      default: "uploaded"
    },
    contractType: {
      type: String,
      default: null,
      index: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    extractedAt: {
      type: Date,
      default: null
    },
    processingStartedAt: {
      type: Date,
      default: null
    },
    processingCompletedAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    failureCode: {
      type: String,
      trim: true,
      default: null
    },
    failureMessage: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

contractSchema.index({ companyId: 1, createdAt: -1 });
contractSchema.index({ companyId: 1, status: 1, createdAt: -1 });
contractSchema.index({ companyId: 1, contractType: 1 });
contractSchema.index({ companyId: 1, "data.endDate": 1 });
contractSchema.index({ companyId: 1, "data.partyA": 1 });
contractSchema.index({ companyId: 1, "data.partyB": 1 });

module.exports = mongoose.model("Contract", contractSchema);
