// models/UserMonthlyPoints.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserMonthlyPointsSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthKey: { type: String, required: true, index: true }, // "YYYY-MM"

    points: { type: Number, default: 0, index: true },
    hours: { type: Number, default: 0 },
    approvedCount: { type: Number, default: 0 },

    lastApprovedAt: { type: Date },
  },
  { timestamps: true }
);

UserMonthlyPointsSchema.index({ user: 1, monthKey: 1 }, { unique: true });
UserMonthlyPointsSchema.index({ monthKey: 1, points: -1 });

module.exports = mongoose.model("UserMonthlyPoints", UserMonthlyPointsSchema);
