// models/EventSubmission.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const EventSubmissionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },

    // if you want step-level granularity, otherwise you can just store final
    stepNumber: { type: Number, required: true },

    // proof
    proofImageUrl: { type: String }, // S3 URL after upload
    socialLink: { type: String },

    // reflection
    experience: { type: String, required: true },

    // review / status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    reviewComment: { type: String },

    // for future: hours actually awarded, certificate URL, etc.
    hoursAwarded: { type: Number, default: 0 },
    certificateUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventSubmission", EventSubmissionSchema);
