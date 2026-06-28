const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    taxId: {
      type: String,
      trim: true,
      default: null
    },
    vatId: {
      type: String,
      trim: true,
      default: null
    },
    address: {
      type: String,
      trim: true,
      default: null
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "business", "custom"],
      default: "free"
    },
    documentLimit: {
      type: Number,
      required: true,
      default: 50
    },
    billingPeriod: {
      type: String,
      enum: ["monthly"],
      default: "monthly"
    }
  },
  {
    timestamps: true
  }
);

companySchema.index({ name: 1 });
companySchema.index({ taxId: 1 });

module.exports = mongoose.model("Company", companySchema);
