const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
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
    model: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["needs_review", "ready_for_export", "reviewed", "exported"],
      required: true,
      default: "needs_review"
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    extractedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    exports: {
      excel: {
        exportedAt: {
          type: Date,
          default: null
        }
      },
      pdf: {
        exportedAt: {
          type: Date,
          default: null
        }
      }
    }
  },
  {
    timestamps: true
  }
);

documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ companyId: 1, createdAt: -1 });
documentSchema.index({ "data.document_number": 1 });
documentSchema.index({ "data.supplier.name": 1 });

module.exports = mongoose.model("Document", documentSchema);
