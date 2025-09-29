
const express = require('express');
const doctorRouter  = express.Router();
const { Readable } = require('stream');
const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {DoctorDetails, Details} = require('../models/ParticipantVetting.js');

const multer = require('multer');


/* ------------------------------
   Route: GET /doctor/file/:fileId
--------------------------------*/
doctorRouter.get('/doctor/file/:fileId', auth, isAuthorized('doctor'), async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid fileId' });
    }
    const bucket = getBucket();
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    const file = files[0];
    res.set({
      'Content-Type': file.metadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.filename}"`
    });
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    downloadStream.on('error', err => res.status(500).json({ error: err.message }));
    downloadStream.pipe(res);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------
   GridFS bucket (safe + cached)
--------------------------------*/
const buckets = new Map();

function getBucket(bucketName = 'compliance') {
  const conn = mongoose.connection;
  if (conn.readyState !== 1 || !conn.db) {
    // Connected = 1. Don't reconnect here: app already connected at startup.
    throw new Error('MongoDB not connected yet. Ensure connectDB() ran before using GridFS.');
  }
  if (!buckets.has(bucketName)) {
    buckets.set(bucketName, new GridFSBucket(conn.db, { bucketName }));
  }
  return buckets.get(bucketName);
}

/* ------------------------------
   Multer (in-memory)
--------------------------------*/
const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------
   Helpers
--------------------------------*/
async function uploadToGridFS(file, bucket) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(file.originalname, {
      metadata: { contentType: file.mimetype, field: file.fieldname }
    });

    Readable.from(file.buffer)
      .pipe(stream)
      .on('error', reject)
      .on('finish', function() {
        // Return minimal file info
        resolve({
          _id: stream.id,
          filename: file.originalname,
          metadata: { contentType: file.mimetype, field: file.fieldname },
          length: file.buffer.length,
          uploadDate: new Date()
        });
      });
  });
}

const parseJSON = (v, fallback) => {
  if (v == null || v === '') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};

/* ------------------------------
   Route: POST /doctor/vetting
--------------------------------*/
doctorRouter.post('/doctor/vetting', auth, isAuthorized('doctor'), upload.fields([
    { name: 'businessLicense', maxCount: 1 },
    { name: 'w9',             maxCount: 1 },
    { name: 'logo',           maxCount: 1 },
    { name: 'headshot',       maxCount: 1 },
  ]),
  async (req, res) => {
    try {
        console.log('req.files:', req.files);
        console.log('req.body:', req.body);
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "Unauthorized: user not found" });
      }

      // Fetch user from DB to get email
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const role = 'doctor';
      // idempotency: one vetting per user per role
      const existing = await Details.findOne({ user: req.user._id }).lean();
      if (existing) {
        return res.json({ message: 'Already completed', data: existing });
      }

      const bucket = getBucket();

      const up = async (field) => {
        const f = req.files?.[field]?.[0];
        console.log(`Checking field: ${field}`);
        console.log('File received:', f);
        if (!f) return undefined;
        // enforce PDF for doc fields
        if (['businessLicense', 'w9'].includes(field) && f.mimetype !== 'application/pdf') {
          throw new Error(`${field} must be a PDF`);
        }
        const fileDoc = await uploadToGridFS(f, bucket);
        console.log('FileDoc returned from uploadToGridFS:', fileDoc);
        return {
          fileId: fileDoc._id,
          filename: fileDoc.filename,
          contentType: fileDoc.metadata?.contentType || f.mimetype,
          length: fileDoc.length,
          uploadDate: fileDoc.uploadDate
        };
      };

      const hipaaAck =
        req.body.hipaaAcknowledged === 'true' || req.body.hipaaAcknowledged === true;

      const doc = await DoctorDetails.create({
        clinicName: req.body.clinicName,
        practiceAddress: req.body.practiceAddress,
        website: req.body.website,
        socialLinks: parseJSON(req.body.socialLinks, []),
        compliance: {
          hipaaAcknowledged: hipaaAck,
          hipaaAcknowledgedAt: hipaaAck ? new Date() : undefined,
          businessLicense: await up('businessLicense'),
          w9:             await up('w9'),
          logo:           await up('logo'),
          headshot:       await up('headshot'),
        },
        participationOptions: parseJSON(req.body.participationOptions, []),
        alignmentImpact: {
          promoteEngagement: req.body.promoteEngagement,
          meaningfulCauses: req.body.meaningfulCauses
        },
        campaignFit: parseJSON(req.body.campaignFit, []),
        // server-controlled
        user: req.user._id,
        email: user.emailId
      });

      return res.status(201).json({ message: 'registrationcompleted', data: doc });
    } catch (err) {
      const status = err.name === 'ValidationError' ? 400 : 500;
      console.log(err);
      return res.status(status).json({ error: err.message });
    }
  }
);

module.exports = doctorRouter;