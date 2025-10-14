const express = require('express');
const nonprofitRouter = express.Router();
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const multer = require('multer');

const User = require('../models/userSchema.js');
const { auth, isAuthorized } = require('../middleware/auth.js');
const { Details } = require('../models/ParticipantVetting.js');
const { NonProfitDetails } = require('../models/nonprofitSchema.js');

const buckets = new Map();
function getBucket(bucketName = 'compliance') {
  const conn = mongoose.connection;
  if (conn.readyState !== 1 || !conn.db) throw new Error('MongoDB not connected yet.');
  if (!buckets.has(bucketName)) buckets.set(bucketName, new GridFSBucket(conn.db, { bucketName }));
  return buckets.get(bucketName);
}

const upload = multer({ storage: multer.memoryStorage() });
const parseJSON = (v, fb) => (v == null || v === '' ? fb : (() => { try { return JSON.parse(v); } catch { return fb; } })());
const uniq = arr => Array.isArray(arr) ? [...new Set(arr)] : [];
const toBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';

function uploadToGridFS(file, bucket) {
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
  if (kind === 'pdf' && f.mimetype !== 'application/pdf') throw new Error(`${field} must be a PDF`);
  if (kind === 'pdfOrImage' && !(f.mimetype === 'application/pdf' || f.mimetype.startsWith('image/'))) {
    throw new Error(`${field} must be a PDF or image`);
  }
  const d = await uploadToGridFS(f, bucket);
  return { fileId: d._id, filename: d.filename, contentType: d.metadata?.contentType || f.mimetype, length: d.length, uploadDate: d.uploadDate };
}

async function upMany(field, req, bucket) {
  const arr = req.files?.[field] || [];
  const out = [];
  for (const f of arr) {
    if (!(f.mimetype === 'application/pdf' || f.mimetype.startsWith('image/'))) {
      throw new Error(`${field} files must be images or PDFs`);
    }
    const d = await uploadToGridFS(f, bucket);
    out.push({ fileId: d._id, filename: d.filename, contentType: d.metadata?.contentType || f.mimetype, length: d.length, uploadDate: d.uploadDate });
  }
  return out.length ? out : undefined;
}

nonprofitRouter.post(
  '/non-profit/vetting',
  auth,
  isAuthorized('non-profit'),
  upload.fields([
    { name: 'determinationLetter', maxCount: 1 }, // EIN/501c3
    { name: 'taxExemptLetter', maxCount: 1 },     // IRS 501c3
    { name: 'goodStandingCert', maxCount: 1 },
    { name: 'impactSummary', maxCount: 1 },       // PDF
    { name: 'mediaKit', maxCount: 5 },            // up to 5 images/PDFs
  ]),
  async (req, res) => {
    try {
      if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found' });
      const user = await User.findById(req.user._id);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const existing = await Details.findOne({ user: req.user._id }).lean();
      if (existing) return res.json({ message: 'Already completed', data: existing });

      const bucket = getBucket();

      const socialLinks = uniq(parseJSON(req.body.socialLinks, []));
      const participationReadiness = uniq(parseJSON(req.body.participationReadiness, []));
      const programFit = uniq(parseJSON(req.body.programFit, []));

      if (participationReadiness.length < 5) {
        return res.status(400).json({ error: 'Please select at least 5 participation activities.' });
      }

      const doc = await NonProfitDetails.create({
        user: req.user._id,
        email: user.emailId,

        // Section 1
        legalName: req.body.legalName,
        stateIncorp: req.body.stateIncorp,
        contactName: req.body.contactName,
        contactTitle: req.body.contactTitle,
        contactPhone: req.body.contactPhone,
        contactEmail: req.body.contactEmail,
        socialLinks,
        missionStatement: req.body.missionStatement,
        programsSummary: req.body.programsSummary,

        // Section 2
        eligibilityDocs: {
          determinationLetter: await up('determinationLetter', req, bucket, 'pdfOrImage'),
          taxExemptLetter:     await up('taxExemptLetter', req, bucket, 'pdfOrImage'),
          goodStandingCert:    await up('goodStandingCert', req, bucket, 'pdfOrImage'),
          impactSummary:       await up('impactSummary', req, bucket, 'pdf'),
          mediaKit:            await upMany('mediaKit', req, bucket),
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
  }
);

module.exports = nonprofitRouter;
