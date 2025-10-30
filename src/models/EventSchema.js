 const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  caption:{type:String, required:true},
  month:{type: String, required:true},
  imageUrl:{type:String, required:true},
  startsAt: Date,
  endsAt: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Event =  mongoose.model("Event", EventSchema);

module.exports = Event;