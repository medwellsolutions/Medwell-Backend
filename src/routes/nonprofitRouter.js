const express = require('express');
const nonprofitRouter = express.Router();
const User = require('../models/userSchema.js');
const { auth, isAuthorized } = require('../middleware/auth.js');
const { Details } = require('../models/ParticipantVetting.js');
const { NonProfitDetails } = require('../models/nonprofitSchema.js');

const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];
const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
const urlRef = (url) => (url && typeof url === 'string' && url.trim()) ? { url: url.trim() } : undefined;

nonprofitRouter.post('/non-profit/vetting', auth, isAuthorized('non-profit'), async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const existing = await Details.findOne({ user: req.user._id }).lean();
    if (existing) return res.json({ message: 'Already completed', data: existing });

    const socialLinks = uniq(Array.isArray(req.body.socialLinks) ? req.body.socialLinks : []);
    const participationReadiness = uniq(Array.isArray(req.body.participationReadiness) ? req.body.participationReadiness : []);
    const programFit = uniq(Array.isArray(req.body.programFit) ? req.body.programFit : []);

    if (participationReadiness.length < 5) {
      return res.status(400).json({ error: 'Please select at least 5 participation activities.' });
    }

    // mediaKit: array of S3 URL strings → array of { url }
    const mediaKitUrls = Array.isArray(req.body.mediaKitUrls) ? req.body.mediaKitUrls : [];
    const mediaKit = mediaKitUrls.filter(u => u && u.trim()).map(u => ({ url: u.trim() }));

    const doc = await NonProfitDetails.create({
      user: req.user._id,
      email: user.emailId,

      // Section 1
      legalName:        req.body.legalName,
      stateIncorp:      req.body.stateIncorp,
      contactName:      req.body.contactName,
      contactTitle:     req.body.contactTitle,
      contactPhone:     req.body.contactPhone,
      contactEmail:     req.body.contactEmail,
      socialLinks,
      missionStatement: req.body.missionStatement,
      programsSummary:  req.body.programsSummary,

      // Section 2 — S3 URLs
      eligibilityDocs: {
        determinationLetter: urlRef(req.body.determinationLetterUrl),
        taxExemptLetter:     urlRef(req.body.taxExemptLetterUrl),
        goodStandingCert:    urlRef(req.body.goodStandingCertUrl),
        impactSummary:       urlRef(req.body.impactSummaryUrl),
        mediaKit:            mediaKit.length ? mediaKit : undefined,
      },

      // Section 3
      participationReadiness,

      // Section 4
      alignWithMedwell: req.body.alignWithMedwell,
      pastCampaign:     req.body.pastCampaign,
      desiredImpact:    req.body.desiredImpact,

      // Section 5
      programFit,

      // Section 6
      agreeMonthlyOrQuarterly: toBool(req.body.agreeMonthlyOrQuarterly),
      understandPerformance:   toBool(req.body.understandPerformance),
      agreeCoMarketing:        toBool(req.body.agreeCoMarketing),
      acknowledgeOngoing:      toBool(req.body.acknowledgeOngoing),
      agreeShareMetrics:       toBool(req.body.agreeShareMetrics),
    });

    return res.status(201).json({ message: 'registrationcompleted', data: doc });
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    console.log(err);
    return res.status(status).json({ error: err.message });
  }
});

module.exports = nonprofitRouter;
