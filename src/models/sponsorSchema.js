// models/sponsorSchema.js
const mongoose = require('mongoose');
const validator = require('validator');
const { FileIdRef, Details } = require('./ParticipantVetting');

// ----- ENUMS (from your form) -----
const ENTITY_TYPES = ['Corporation', 'Small Business', 'Foundation', 'B Corp', 'Other'];

const SPONSORSHIP_GOALS = [
  'Donate funds tied to point-based activities',
  'Match points earned by participants with monetary donations',
  'Offer in-kind rewards (gift cards, merchandise, experiences)',
  'Sponsor an awareness month (e.g. Autism, Stress, Breast Cancer)',
  'Provide scholarship or grant funds for student participants',
  'Engage in co-branded content (podcasts, livestreams, event booths)',
  'Sponsor a challenge (e.g. 5K, Kahoot, trivia, Wheel of Impact)',
  'Contribute toward performance-based community rebates',
  'Provide volunteers or ambassadors from your workforce'
];

const FUNDING_MODELS = [
  'Monthly recurring donation',
  'Match-based donations',
  'Awareness campaign sponsorship (flat-rate or tiered)',
  'Product placement or in-kind donation value',
  'One-time scholarship or nonprofit grant funding',
  'Other'
];

const ACTIVATION_READINESS = [
  'Approve use of your logo for community marketing',
  'Submit a company rep for a podcast or livestream',
  'Attend or co-sponsor a community or campus event',
  'Review quarterly PACE impact reports',
  'Promote program internally via email/newsletter',
  'Provide a 60–90 second brand video or testimonial',
  'Engage staff in volunteer or “Assign It Forward” team day',
  'Join monthly cause-aligned initiatives as featured sponsor',
  'Offer special rewards or discounts tied to point campaigns'
];

const CAUSE_AREAS = [
  'Mental Health Awareness',
  'Veterans & First Responders',
  'Autism & Neurodiversity',
  'Cancer (Breast, Prostate, Pediatric, etc.)',
  'Student Wellness & College Health',
  'Women’s Health',
  'Diabetes & Heart Disease',
  'Underserved Communities',
  'Health Literacy & Access',
  'Other'
];

const sponsorSchema = new mongoose.Schema({
  // SECTION 1: Organization Overview
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  entityType:   { type: String, required: true, enum: ENTITY_TYPES },
  entityTypeOther: { type: String, trim: true, maxlength: 120 }, // used when entityType = "Other"
  contactName:  { type: String, required: true, trim: true, maxlength: 120 },
  contactTitle: { type: String, trim: true, maxlength: 120 },
  contactEmail: {
    type: String, required: true, trim: true, maxlength: 120,
    validate: { validator: v => validator.isEmail(v), message: 'Invalid email' }
  },
  contactPhone: { type: String, required: true, trim: true, maxlength: 30 },
  socialLinks: [{
    type: String, trim: true,
    validate: { validator: v => validator.isURL(v, { require_protocol: true }), message: 'URL must include protocol' }
  }],

  missionValues:   { type: String, trim: true, maxlength: 2000 },
  csrEsgOverview:  { type: String, trim: true, maxlength: 2000 },

  // SECTION 2: Brand Guidelines & Legal (files)
  brandLegal: {
    _id: false,
    logo:                { type: FileIdRef, default: undefined }, // image
    styleGuide:          { type: FileIdRef, default: undefined }, // PDF
    marketingLanguage:   { type: FileIdRef, default: undefined }, // PDF
    w9OrReceipt:         { type: FileIdRef, default: undefined }, // PDF
    liaisonDoc:          { type: FileIdRef, default: undefined }, // PDF (optional)
  },

  // SECTION 3: Sponsorship Goals (multi-select)
  sponsorshipGoals: { type: [{ type: String, enum: SPONSORSHIP_GOALS }], default: [] },

  // SECTION 4: Funding Commitment (multi-select)
  fundingModels:    { type: [{ type: String, enum: FUNDING_MODELS }], default: [] },
  fundingOther:     { type: String, trim: true, maxlength: 200 }, // if "Other" picked

  // SECTION 5: Activation Readiness (select at least 4 - app-level check)
  activationReadiness: { type: [{ type: String, enum: ACTIVATION_READINESS }], default: [] },

  // SECTION 6: Cause Alignment (multi-select)
  causeAlignment: { type: [{ type: String, enum: CAUSE_AREAS }], default: [] },
  causeOther:     { type: String, trim: true, maxlength: 200 }, // if "Other" picked

  // SECTION 7: Agreement (all must be true)
  agreeImpactProgram:     { type: Boolean, required: true },
  agreePublicListing:     { type: Boolean, required: true },
  acknowledgeCommunity:   { type: Boolean, required: true },
  agreeQuarterlyReport:   { type: Boolean, required: true },
  agreeParticipate12mo:   { type: Boolean, required: true },

}, { _id: false });

const SponsorDetails = Details.discriminator('sponsor', sponsorSchema);
module.exports = { SponsorDetails };
