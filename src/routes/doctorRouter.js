const express = require('express');
const doctorRouter = express.Router();
const User = require('../models/userSchema.js');
const { auth, isAuthorized } = require('../middleware/auth.js');
const { DoctorDetails, Details } = require('../models/ParticipantVetting.js');

const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];
const urlRef = (url) => (url && typeof url === 'string' && url.trim()) ? { url: url.trim() } : undefined;

doctorRouter.post('/doctor/vetting', auth, isAuthorized('doctor'), async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const existing = await Details.findOne({ user: req.user._id }).lean();
    if (existing) return res.json({ message: 'Already completed', data: existing });

    const hipaaAck = req.body.hipaaAcknowledged === true || req.body.hipaaAcknowledged === 'true';

    const doc = await DoctorDetails.create({
      user: req.user._id,
      email: user.emailId,
      clinicName: req.body.clinicName,
      practiceAddress: req.body.practiceAddress,
      website: req.body.website,
      socialLinks: uniq(Array.isArray(req.body.socialLinks) ? req.body.socialLinks : []),
      compliance: {
        hipaaAcknowledged: hipaaAck,
        hipaaAcknowledgedAt: hipaaAck ? new Date() : undefined,
        businessLicense: urlRef(req.body.businessLicenseUrl),
        w9:              urlRef(req.body.w9Url),
        logo:            urlRef(req.body.logoUrl),
        headshot:        urlRef(req.body.headshotUrl),
      },
      participationOptions: uniq(Array.isArray(req.body.participationOptions) ? req.body.participationOptions : []),
      alignmentImpact: {
        promoteEngagement: req.body.promoteEngagement,
        meaningfulCauses:  req.body.meaningfulCauses,
      },
      campaignFit: uniq(Array.isArray(req.body.campaignFit) ? req.body.campaignFit : []),
    });

    return res.status(201).json({ message: 'registrationcompleted', data: doc });
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    console.log(err);
    return res.status(status).json({ error: err.message });
  }
});

module.exports = doctorRouter;
