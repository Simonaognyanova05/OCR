const mongoose = require("mongoose");

const subscriptionRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    currentPlan: {
      type: String,
      enum: ["free", "starter", "pro", "business", "custom"],
      required: true
    },
    requestedPlan: {
      type: String,
      enum: ["free", "starter", "pro", "business"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending"
    },
    note: {
      type: String,
      trim: true,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

subscriptionRequestSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("SubscriptionRequest", subscriptionRequestSchema);
