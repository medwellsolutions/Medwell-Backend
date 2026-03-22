const mongoose = require("mongoose");

const EventViewSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
}, { timestamps: true });

// Enforce one record per user-event pair
EventViewSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventView", EventViewSchema);
