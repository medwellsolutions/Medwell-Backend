// routes/sponsorRouter.js
const express = require('express');
const sponsorRouter = express.Router();
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const multer = require('multer');

const User = require('../models/userSchema.js');
const { auth, isAuthorized } = require('../middleware/auth.js');
const { Details } = require('../models/ParticipantVetting.js');
const { SponsorDetails } = require('../models/sponsorSchema.js');

const buckets = new Map();
function getBucket(bucketName = 'compliance') {
  const conn = mongoose.connection;
  if (conn.readyState !== 1 || !conn.db) throw new Error('MongoDB not connected yet.');
  if (!buckets.has(bucketName)) buckets.set(bucketName, new GridFSBucket(conn.db, { bucketName }));
  return buckets.get(bucketName);
}

const upload = multer({ storage: multer.memoryStorage() });

function parseJSON(v, fallback) {
  if (v == null || v === '') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];
const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';

async function uploadToGridFS(file, bucket) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(file.originalname, {
      metadata: { contentType: file.mimetype, field: file.fieldname }
    });
    Readable.from(file.buffer)
      .pipe(stream)
      .on('error', reject)
      .on('finish', () => resolve({
        _id: stream.id,
        filename: file.originalname,
        metadata: { contentType: file.mimetype, field: file.fieldname },
        length: file.buffer.length,
        uploadDate: new Date()
      }));
  });
}

async function up(field, req, bucket, kind) {
  const f = req.files?.[field]?.[0];
  if (!f) return undefined;
  if (kind === 'image' && !f.mimetype.startsWith('image/')) throw new Error(`${field} must be an image`);
  if (kind === 'pdf'   && f.mimetype !== 'application/pdf')   throw new Error(`${field} must be a PDF`);
  const fileDoc = await uploadToGridFS(f, bucket);
  return {
    fileId: fileDoc._id,
    filename: fileDoc.filename,
    contentType: fileDoc.metadata?.contentType || f.mimetype,
    length: fileDoc.length,
    uploadDate: fileDoc.uploadDate
  };
}

sponsorRouter.post(
  '/sponsor/vetting',
  auth,
  isAuthorized('sponsor'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'styleGuide', maxCount: 1 },
    { name: 'marketingLanguage', maxCount: 1 },
    { name: 'w9OrReceipt', maxCount: 1 },
    { name: 'liaisonDoc', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found' });
      const user = await User.findById(req.user._id);
      if (!user) return res.status(401).json({ error: 'User not found' });

      // one vetting per user
      const existing = await Details.findOne({ user: req.user._id }).lean();
      if (existing) return res.json({ message: 'Already completed', data: existing });

      const bucket = getBucket();

      // arrays (JSON strings in form-data)
      const socialLinks        = uniq(parseJSON(req.body.socialLinks, []));
      const sponsorshipGoals   = uniq(parseJSON(req.body.sponsorshipGoals, []));
      const fundingModels      = uniq(parseJSON(req.body.fundingModels, []));
      const activationReadiness= uniq(parseJSON(req.body.activationReadiness, []));
      const causeAlignment     = uniq(parseJSON(req.body.causeAlignment, []));

      // optional “other” fields if client uses "Other"
      const fundingOther = req.body.fundingOther || undefined;
      const causeOther   = req.body.causeOther || undefined;

      const doc = await SponsorDetails.create({
        user:  req.user._id,
        email: user.emailId,

        // Section 1
        businessName: req.body.businessName,
        entityType: req.body.entityType,
        entityTypeOther: req.body.entityTypeOther,
        contactName: req.body.contactName,
        contactTitle: req.body.contactTitle,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        socialLinks,

        missionValues:  req.body.missionValues,
        csrEsgOverview: req.body.csrEsgOverview,

        // Section 2 (files)
        brandLegal: {
          logo:              await up('logo', req, bucket, 'image'),
          styleGuide:        await up('styleGuide', req, bucket, 'pdf'),
          marketingLanguage: await up('marketingLanguage', req, bucket, 'pdf'),
          w9OrReceipt:       await up('w9OrReceipt', req, bucket, 'pdf'),
          liaisonDoc:        await up('liaisonDoc', req, bucket, 'pdf'),
        },

        // Section 3
        sponsorshipGoals,

        // Section 4
        fundingModels,
        fundingOther,

        // Section 5
        activationReadiness,

        // Section 6
        causeAlignment,
        causeOther,

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
  }
);

module.exports = sponsorRouter;
