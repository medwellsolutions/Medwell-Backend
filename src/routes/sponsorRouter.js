// routes/sponsorRouter.js
const express = require('express');
const sponsorRouter = express.Router();
const User = require('../models/userSchema.js');
const { auth, isAuthorized } = require('../middleware/auth.js');
const { Details } = require('../models/ParticipantVetting.js');
const { SponsorDetails } = require('../models/sponsorSchema.js');

const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];
const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
const urlRef = (url) => (url && typeof url === 'string' && url.trim()) ? { url: url.trim() } : undefined;

sponsorRouter.post('/sponsor/vetting', auth, isAuthorized('sponsor'), async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const existing = await Details.findOne({ user: req.user._id }).lean();
    if (existing) return res.json({ message: 'Already completed', data: existing });

    const socialLinks        = uniq(Array.isArray(req.body.socialLinks)        ? req.body.socialLinks        : []);
    const sponsorshipGoals   = uniq(Array.isArray(req.body.sponsorshipGoals)   ? req.body.sponsorshipGoals   : []);
    const fundingModels      = uniq(Array.isArray(req.body.fundingModels)      ? req.body.fundingModels      : []);
    const activationReadiness= uniq(Array.isArray(req.body.activationReadiness)? req.body.activationReadiness: []);
    const causeAlignment     = uniq(Array.isArray(req.body.causeAlignment)     ? req.body.causeAlignment     : []);

    const doc = await SponsorDetails.create({
      user:  req.user._id,
      email: user.emailId,

      // Section 1
      businessName:    req.body.businessName,
      entityType:      req.body.entityType,
      entityTypeOther: req.body.entityTypeOther,
      contactName:     req.body.contactName,
      contactTitle:    req.body.contactTitle,
      contactEmail:    req.body.contactEmail,
      contactPhone:    req.body.contactPhone,
      socialLinks,
      missionValues:   req.body.missionValues,
      csrEsgOverview:  req.body.csrEsgOverview,

      // Section 2 — S3 URLs
      brandLegal: {
        logo:              urlRef(req.body.logoUrl),
        styleGuide:        urlRef(req.body.styleGuideUrl),
        marketingLanguage: urlRef(req.body.marketingLanguageUrl),
        w9OrReceipt:       urlRef(req.body.w9OrReceiptUrl),
        liaisonDoc:        urlRef(req.body.liaisonDocUrl),
      },

      // Section 3
      sponsorshipGoals,

      // Section 4
      fundingModels,
      fundingOther: req.body.fundingOther || undefined,

      // Section 5
      activationReadiness,

      // Section 6
      causeAlignment,
      causeOther: req.body.causeOther || undefined,

      // Section 7
      agreeImpactProgram:   toBool(req.body.agreeImpactProgram),
      agreePublicListing:   toBool(req.body.agreePublicListing),
      acknowledgeCommunity: toBool(req.body.acknowledgeCommunity),
      agreeQuarterlyReport: toBool(req.body.agreeQuarterlyReport),
      agreeParticipate12mo: toBool(req.body.agreeParticipate12mo),
    });

    return res.status(201).json({ message: 'registrationcompleted', data: doc });
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    console.log(err);
    return res.status(status).json({ error: err.message });
  }
});

module.exports = sponsorRouter;
