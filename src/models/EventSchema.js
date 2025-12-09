 const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },   // Event title
  caption: { type: String, required: true },             // Short tag line
  month: { type: String, required: true },               // Month category (ex: "November Events")

  imageUrl: { type: String, required: false },            // Thumbnail
  bannerImageUrl: { type: String, required: false },      // Banner for event page

  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },

  shortDescription: { type: String, required: true },
  longDescription: { type: String, required: true },

  // ***** NEW FIELDS FIXED PROPERLY *****

  // Steps like: Step 1: Plan, Step 2: Celebrate, Step 3: Share…
  actionSteps: [
    {
      stepNumber: Number,
      title: String,
      isCompleted: {type:Boolean, default:false},
      isRequired: { type: Boolean, default: false },

      contentBlocks: [
      {
        heading: String,           // Optional section heading
        text: String,              // Paragraph text
        links: [
          {
            label: String,         // What user sees
            url: String            // Where it redirects
          }
        ]
      }
    ]

    }
  ],

  // Ex: "3–6 hours"
  estimatedTime: {
    text: String,
    minHours: Number,
    maxHours: Number
  },

  // Ex: volunteer credit YES/NO, number of hours
  volunteerHours: {
    isAvailable: { type: Boolean, default: true },
    hours: { type: Number, default: 0 }
  },

  // Extra notes like safety guidelines, materials needed etc.
  additionalInstructions: [
    {
      title: String,
      description: String
    }
  ],

  // Certificate content fields
  certificateInfo: {
    includesName: { type: Boolean, default: true },
    includesDate: { type: Boolean, default: true },
    includesEventName: { type: Boolean, default: true },
    includesHours: { type: Boolean, default: true },
    templateUrl: String // optional image of template
  },

  // Requirements before starting event
  requirements: [
    {
      title: String,
      description: String
    }
  ],

  // Checklist items the user must mark as done
  checkListItems: [
    {
      text: String,
      isMandatory: { type: Boolean, default: false }
    }
  ],

  // FAQs section
  FAQs: [
    {
      question: String,
      answer: String
    }
  ],

  isActive: { type: Boolean, default: true }
}, { timestamps: true });


const Event =  mongoose.model("Event", EventSchema);

module.exports = Event;