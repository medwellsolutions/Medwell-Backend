const mongoose = require('mongoose');
const validator = require('validator');
const { FileIdRef, Details } = require('./ParticipantVetting');

// ---- enums from your form ----
const PARTICIPATION_READINESS = [
  'Host or co-host a health literacy workshop or virtual discussion',
  'Promote health awareness content or wellness challenges',
  'Accept points converted into donations or grants',
  'Assign a representative to participate in quarterly PACE review',
  'Submit a success story, testimonial, or video for community visibility',
  'Promote the program through your newsletter, email list, or social media',
  'Engage in student org collaborations or service hour tracking',
  'Share flyers or co-brand campaign materials provided by Medwell',
  'Co-develop cause-aligned Kahoot games or podcast topics',
  'Provide performance metrics or beneficiary stories upon request',
  'Other'
];

const AWARENESS_CAMPAIGNS = [
  'Mental Health / Stress Awareness',
  'Veterans & First Responders',
  'Autism & Neurodiversity',
  'Cancer Support (e.g., Breast, Prostate, Pediatric)',
  'Nutrition, Fitness & Healthy Living',
  'Disability Inclusion',
  'Youth & Education',
  'Caregivers & Aging Adults',
  'Health Equity & Access',
  'Other'
];

const nonprofitSchema = new mongoose.Schema({
  // SECTION 1: General Information
  legalName:        { type: String, required: true, trim: true, maxlength: 160 },
  stateIncorp:      { type: String, required: true, trim: true, maxlength: 80 },
  contactName:      { type: String, required: true, trim: true, maxlength: 120 },
  contactTitle:     { type: String, trim: true, maxlength: 120 },
  contactPhone:     { type: String, required: true, trim: true, maxlength: 30 },
  contactEmail:     {
    type: String, required: true, trim: true, maxlength: 160,
    validate: { validator: v => validator.isEmail(v), message: 'Invalid email' }
  },
  socialLinks: [{
    type: String, trim: true,
    validate: { validator: v => validator.isURL(v, { require_protocol: true }), message: 'URL must include protocol' }
  }],

  missionStatement: { type: String, required: true, trim: true, maxlength: 2000 },
  programsSummary:  { type: String, required: true, trim: true, maxlength: 2000 },

  // SECTION 2: Eligibility & Documentation
  eligibilityDocs: {
    _id: false,
    determinationLetter:  { type: FileIdRef, default: undefined }, // EIN/501(c)(3) letter (pdf/image)
    taxExemptLetter:      { type: FileIdRef, default: undefined }, // IRS 501(c)(3) (pdf/image)
    goodStandingCert:     { type: FileIdRef, default: undefined }, // optional (pdf/image)
    impactSummary:        { type: FileIdRef, default: undefined }, // PDF
    mediaKit:             [{ type: FileIdRef, default: undefined }], // up to 5 files (image/pdf)
  },

  // SECTION 3: Participation Readiness (>= 5)
  participationReadiness: { type: [{ type: String, enum: PARTICIPATION_READINESS }], default: [] },

  // SECTION 4: Alignment & Values (short answers)
  alignWithMedwell: { type: String, required: true, trim: true, maxlength: 2000 },
  pastCampaign:     { type: String, required: true, trim: true, maxlength: 2000 },
  desiredImpact:    { type: String, required: true, trim: true, maxlength: 2000 },

  // SECTION 5: Program Fit (multi-select)
  programFit:    { type: [{ type: String, enum: AWARENESS_CAMPAIGNS }], default: [] },

  // SECTION 6: Agreement (all Yes)
  agreeMonthlyOrQuarterly: { type: Boolean, required: true },
  understandPerformance:   { type: Boolean, required: true },
  agreeCoMarketing:        { type: Boolean, required: true },
  acknowledgeOngoing:      { type: Boolean, required: true },
  agreeShareMetrics:       { type: Boolean, required: true },
}, { _id: false });

const NonProfitDetails = Details.discriminator('non-profit', nonprofitSchema);
module.exports = { NonProfitDetails };
