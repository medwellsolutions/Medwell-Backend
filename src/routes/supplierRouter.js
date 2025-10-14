const express = require('express');
const supplierRouter  = express.Router();
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {Details} = require('../models/ParticipantVetting.js');
const {SupplierDetails} = require('../models/supplierSchema.js');
const multer = require('multer');

const buckets = new Map();
function getBucket(bucketName = 'compliance') {
  const conn = mongoose.connection;
  if (conn.readyState !== 1 || !conn.db) throw new Error('MongoDB not connected yet.');
  if (!buckets.has(bucketName)) buckets.set(bucketName, new GridFSBucket(conn.db, { bucketName }));
  return buckets.get(bucketName);
}

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToGridFS(file, bucket) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(file.originalname, {
      metadata: { contentType: file.mimetype, field: file.fieldname }
    });
    Readable.from(file.buffer)
      .pipe(stream)
      .on('error', reject)
      .on('finish', () =>
        resolve({
          _id: stream.id,
          filename: file.originalname,
          metadata: { contentType: file.mimetype, field: file.fieldname },
          length: file.buffer.length,
          uploadDate: new Date()
        })
      );
  });
}

const parseJSON = (v, fallback) => {
  if (v == null || v === '') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};
const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];

supplierRouter.post(
  '/supplier/vetting',
  auth,
  isAuthorized('supplier'),
  upload.fields([
    // compliance
    { name: 'businessLicense', maxCount: 1 },
    { name: 'w9', maxCount: 1 },
    { name: 'supplierDiversityStatus', maxCount: 1 },
    // serviceOverview
    { name: 'productCatalog', maxCount: 1 },
    { name: 'pricingTiers', maxCount: 1 },
    { name: 'MOQ', maxCount: 1 },
    { name: 'warranty', maxCount: 1 },
    { name: 'distributorAgreements', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.user?._id) return res.status(401).json({ error: "Unauthorized: user not found" });

      const user = await User.findById(req.user._id);
      if (!user) return res.status(401).json({ error: "User not found" });

      // one vetting per user
      const existing = await Details.findOne({ user: req.user._id }).lean();
      if (existing) return res.json({ message: 'Already completed', data: existing });

      const bucket = getBucket();

      const up = async (field) => {
        const f = req.files?.[field]?.[0];
        if (!f) return undefined;
        if (f.mimetype !== 'application/pdf') throw new Error(`${field} must be a PDF`);
        const fileDoc = await uploadToGridFS(f, bucket);
        return {
          fileId: fileDoc._id,
          filename: fileDoc.filename,
          contentType: fileDoc.metadata?.contentType || f.mimetype,
          length: fileDoc.length,
          uploadDate: fileDoc.uploadDate
        };
      };

      // arrays
      const socialLinks            = uniq(parseJSON(req.body.socialLinks, []));
      const supplierCategory       = uniq(parseJSON(req.body.supplierCategory, []));
      const MembershipParticipation= uniq(parseJSON(req.body.MembershipParticipation, []));
      if (MembershipParticipation.length < 5) {
        return res.status(400).json({ error: 'Please select at least 5 participation activities.' });
      }

      const doc = await SupplierDetails.create({
        // base
        user: req.user._id,
        email: user.emailId,

        // Section 1
        businessName: req.body.businessName,
        businessStructure: req.body.businessStructure,
        contactName: req.body.contactName,
        phone: req.body.phone,
        socialLinks,
        taxID: req.body.taxID,

        // Section 2
        supplierCategory,

        // Section 3
        compliance: {
          businessLicense:         await up('businessLicense'),
          w9:                      await up('w9'),
          supplierDiversityStatus: await up('supplierDiversityStatus'),
        },

        // Section 4
        MembershipParticipation,

        // Section 5
        serviceOverview: {
          productCatalog:        await up('productCatalog'),
          pricingTiers:          await up('pricingTiers'),
          MOQ:                   await up('MOQ'),
          warranty:              await up('warranty'),
          distributorAgreements: await up('distributorAgreements'),
        },

        // Section 6
        wellness: req.body.wellness,
        interest: req.body.interest,
        nonProfitInterest: req.body.nonProfitInterest,

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
