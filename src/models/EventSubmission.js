// models/EventSubmission.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Reuse the same MediaSchema you had in Activity
const MediaSchema = new Schema(
  {
    kind: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    thumbUrl: String,
    contentType: String, // "image/jpeg", "video/mp4"
    sizeBytes: Number,
    width: Number,
    height: Number,
    durationSec: Number, // videos
    checksum: String,
    transcodingStatus: {
      type: String,
      enum: ["none", "queued", "processing", "done", "failed"],
      default: "none",
    },
  },
  { _id: false }
);

const EventSubmissionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    // step-based proof
    stepNumber: { type: Number, required: true },

    // proof options (either media or social link)
    media: { type: [MediaSchema], default: [] },     // ✅ replaces proofImageUrl
    socialLink: { type: String, default: null },

    // reflection / caption (your "activity text")
    experience: { type: String, required: true, maxlength: 10_000 },

    // review / status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    reviewComment: { type: String, default: "" },
    reviewedAt: { type: Date }, // ✅ cleaner than relying on updatedAt

    // rewards / scoreboard
    hoursAwarded: { type: Number, default: 0 },
    pointsAwarded: { type: Number, default: 0, index: true }, // ✅ leaderboard-friendly

    // optional: if you still want “public activity feed”
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public",
      index: true,
    },

    // optional: for filtering/search later
    tags: { type: [String], default: [], index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// ✅ prevent duplicate submissions for same step
EventSubmissionSchema.index({ user: 1, event: 1, stepNumber: 1 }, { unique: true });

// ✅ fast feeds / admin review queues
EventSubmissionSchema.index({ event: 1, status: 1, reviewedAt: -1 });
EventSubmissionSchema.index({ event: 1, createdAt: -1 });
EventSubmissionSchema.index({ user: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("EventSubmission", EventSubmissionSchema);
