import mongoose from "mongoose";
const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  startsAt: Date,
  endsAt: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Event =  mongoose.model("Event", EventSchema);
module.exports = Event;