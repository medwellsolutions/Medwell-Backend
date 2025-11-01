const mongoose = require('mongoose');
const validator = require('validator');
const { FileIdRef, Details } = require('./ParticipantVetting');

const MEMBERSHIP_PARTICIPATION_OPTIONS = [
  "Agree to contribute a % community impact fee (donations toward nonprofits)",
  "Provide transparent pricing and competitive bids via Medwell’s platform",
  "Offer volume or performance-based rebate structures",
  "Participate in co-branded marketing campaigns (flyers, livestreams, cause activations)",
  "Sponsor or match donations for monthly awareness campaigns",
  "Submit product education materials for workshops or student learning",
  "Provide quarterly sales/performance reports for impact tracking",
  "Join at least one cause-related initiative (e.g., Autism, Breast Cancer) annually"
];

// (Optional) constrain categories if you have a known set
const SUPPLIER_CATEGORIES = [
  "Pharmaceuticals", "Medical Devices", "Diagnostics", "Wellness",
  "Nutrition", "HealthTech", "Services", "Other"
];

const businessStructure = ['LLC','C-Corp','S-Corp','Sole Proprietor','Partnership','Nonprofit','Other']

const urlValidator = v => validator.isURL(v, { require_protocol: true });

const einRegex = /^\d{2}-\d{7}$/; // 12-3456789 (US EIN)

const supplierSchema = new mongoose.Schema({
  // SECTION 1: Company Information
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    set: v => v?.trim()
    // , unique: true // enable if you want to block dup names
  },
  businessStructure: {
    type: String,
    enum:businessStructure,
    required: true,
    trim: true,
    maxlength: 120,
    set: v => v?.trim()
    // consider enum: ['LLC','C-Corp','S-Corp','Sole Proprietor','Partnership','Nonprofit','Other']
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    set: v => v?.trim()
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 25,
    validate: {
      validator: v => validator.isMobilePhone(v, 'any') || validator.isMobilePhone(v, 'en-US') || /^\+?[0-9().\-\s]+$/.test(v),
      message: 'Please provide a valid phone number.'
    }
  },

  // Website or socialMedia
  socialLinks: [{
    type: String,
    trim: true,
    validate: { validator: urlValidator, message: 'Each social link must be a valid URL with protocol (e.g., https://...)' },
    set: v => v?.trim()
  }],

  // Tax Id/EIN
  taxID: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    set: v => v?.trim(),
    validate: {
      validator: v => einRegex.test(v),
      message: 'EIN must match NN-NNNNNNN format.'
    }
  },

  // SECTION 2: Supplier Category
  supplierCategory: {
    type: [{ type: String, enum: SUPPLIER_CATEGORIES }],
    default: [],
    set: arr => Array.isArray(arr) ? [...new Set(arr)] : arr
    // If you need at least one: validate: { validator: arr => Array.isArray(arr) && arr.length >= 1, message: 'Select at least one category.' }
  },

  // SECTION 3: Brand Guidelines & Legal 
  compliance: {
    _id: false,
    businessLicense:         { type: FileIdRef, default: undefined }, // PDF (set required: true if mandatory)
    w9:                      { type: FileIdRef, default: undefined }, // PDF
    supplierDiversityStatus: { type: FileIdRef, default: undefined }, // PDF
  },

  // SECTION 4: Membership Participation 
  MembershipParticipation: {
    type: [{ type: String, enum: MEMBERSHIP_PARTICIPATION_OPTIONS }],
    default: [],
    set: arr => Array.isArray(arr) ? [...new Set(arr)] : arr,
    validate: {
      validator: arr => Array.isArray(arr) && arr.length >= 5,
      message: 'Please select at least 5 participation activities.'
    }
  },

  // SECTION 5: Product & Service Overview 
  serviceOverview: {
    _id: false,
    productCatalog:        { type: FileIdRef, default: undefined }, // PDF
    pricingTiers:          { type: FileIdRef, default: undefined }, // PDF
    MOQ:                   { type: FileIdRef, default: undefined }, // PDF
    warranty:              { type: FileIdRef, default: undefined }, // PDF
    distributorAgreements: { type: FileIdRef, default: undefined }, // PDF
  },

  // SECTION 6: Alignment & Mission Fit (100–250 words suggested)
  wellness: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000, // ~300–350 words room
    set: v => v?.trim()
  },
  interest: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
    set: v => v?.trim()
  },
  nonProfitInterest: {
    type: String,
    // required: true,
    trim: true,
    maxlength: 300,
    set: v => v?.trim()
  },

  // SECTION 7: Agreement & Activation
  communityImpactRebate:           { type: Boolean, required: true },
  performanceAccountability:       { type: Boolean, required: true },
  medwellPartnership:              { type: Boolean, required: true }, // fixed spelling
  assetsSupply:                    { type: Boolean, required: true },
  membershipRevokeAcknowledgement: { type: Boolean, required: true },

}, { _id: false, minimize: true });

// Important: ensure the base single-nested path in Details has a discriminatorKey set.
// Assuming Details is defined accordingly in ./ParticipantVetting
const SupplierDetails = Details.discriminator('supplier', supplierSchema);

module.exports = { SupplierDetails };
