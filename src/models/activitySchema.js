const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  kind: { type: String, enum: ["image", "video"], required: true },
  url:   { type: String, required: true },
  thumbUrl: String,
  contentType: String,     // e.g., "image/jpeg", "video/mp4"
  sizeBytes: Number,
  width: Number,
  height: Number,
  durationSec: Number,     // videos
  checksum: String,        // optional: to dedupe
  transcodingStatus: { type: String, enum: ["none","queued","processing","done","failed"], default: "none" },
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  type:  { type: String, enum: ["text", "image", "video"], required: true, index: true },

  text:  { type: String, maxlength: 10_000 },

  media: { type: [MediaSchema], default: [] },

  visibility: { type: String, enum: ["public","private","unlisted"], default: "public" },
  status:     { type: String, enum: ["pending","approved","rejected"], default: "approved", index: true },

  points:     { type: Number, default: 0, index: true },
  tags:       { type: [String], index: true },

  meta:       { type: Object }, // device, location, etc.
}, { timestamps: true });

ActivitySchema.index({ event: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, event: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", ActivitySchema);

module.exports = Activity;