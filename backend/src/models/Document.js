const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
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
      enum: ["uploaded", "processing", "needs_review", "approved", "exported", "failed"],
      required: true,
      default: "uploaded"
    },
    documentType: {
      type: String,
      default: null
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    extractedAt: {
      type: Date,
      default: null
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
