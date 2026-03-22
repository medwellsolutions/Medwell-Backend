const express = require('express');
const supplierRouter  = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {Details} = require('../models/ParticipantVetting.js');
const {SupplierDetails} = require('../models/supplierSchema.js');

const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];

supplierRouter.post(
  '/supplier/vetting',
  auth,
  isAuthorized('supplier'),
  async (req, res) => {
    try {
      if (!req.user?._id) return res.status(401).json({ error: "Unauthorized: user not found" });

      const user = await User.findById(req.user._id);
      if (!user) return res.status(401).json({ error: "User not found" });

      // one vetting per user
      const existing = await Details.findOne({ user: req.user._id }).lean();
      if (existing) return res.json({ message: 'Already completed', data: existing });

      // arrays
      const socialLinks             = uniq(Array.isArray(req.body.socialLinks) ? req.body.socialLinks : []);
      const supplierCategory        = uniq(Array.isArray(req.body.supplierCategory) ? req.body.supplierCategory : []);
      const MembershipParticipation = uniq(Array.isArray(req.body.MembershipParticipation) ? req.body.MembershipParticipation : []);

      if (MembershipParticipation.length < 5) {
        return res.status(400).json({ error: 'Please select at least 5 participation activities.' });
      }

      // Helper: build a URL ref only if a URL string was provided
      const urlRef = (url) => (url && typeof url === 'string' && url.trim())
        ? { url: url.trim() }
        : undefined;

      const doc = await SupplierDetails.create({
        // base
        user: req.user._id,
        email: user.emailId,

        // Section 1
        businessName:      req.body.businessName,
        businessStructure: req.body.businessStructure,
        contactName:       req.body.contactName,
        phone:             req.body.phone,
        socialLinks,
        taxID:             req.body.taxID,

        // Section 2
        supplierCategory,

        // Section 3 — S3 URLs
        compliance: {
          businessLicense:         urlRef(req.body.businessLicenseUrl),
          w9:                      urlRef(req.body.w9Url),
          supplierDiversityStatus: urlRef(req.body.supplierDiversityStatusUrl),
        },

        // Section 4
        MembershipParticipation,

        // Section 5 — S3 URLs
        serviceOverview: {
          productCatalog:        urlRef(req.body.productCatalogUrl),
          pricingTiers:          urlRef(req.body.pricingTiersUrl),
          MOQ:                   urlRef(req.body.MOQUrl),
          warranty:              urlRef(req.body.warrantyUrl),
          distributorAgreements: urlRef(req.body.distributorAgreementsUrl),
        },

        // Section 6
        wellness:         req.body.wellness,
        interest:         req.body.interest,
        nonProfitInterest:req.body.nonProfitInterest,

        // Section 7
        communityImpactRebate:           toBool(req.body.communityImpactRebate),
        performanceAccountability:       toBool(req.body.performanceAccountability),
        medwellPartnership:              toBool(req.body.medwellPartnership),
        assetsSupply:                    toBool(req.body.assetsSupply),
        membershipRevokeAcknowledgement: toBool(req.body.membershipRevokeAcknowledgement),
      });

      return res.status(201).json({ message: 'registrationcompleted', data: doc });
    } catch (err) {
      const status = err.name === 'ValidationError' ? 400 : 500;
      console.log(err);
      return res.status(status).json({ error: err.message });
    }
  }
);

module.exports = supplierRouter;