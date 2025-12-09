const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {ParticipantDetails, Details} = require('../models/ParticipantVetting.js');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Activity = require("../models/activitySchema.js");
const Event= require("../models/EventSchema.js");
const EventSubmission = require("../models/EventSubmission");
const { default: mongoose } = require('mongoose');

participantRouter.post('/participant/vetting', auth, isAuthorized('participant'), async(req,res)=>{
    try{
    const _id = req.user._id;
    const existing = await Details.findOne({user:_id});
    if(existing){
        return res.json({
            message:"user has already completed the form",
            data: existing
        });
    }
    const user =await User.findById(_id);
    const emailId = user.emailId;
    const {interest_areas, commitments, goals, codeOfParticipation} = req.body || {};
    const details = {
        user:_id,
        email: emailId,
        interest_areas,
        commitments,
        goals, 
        codeOfParticipation
    }

    const pVetting = new ParticipantDetails(details);
    await pVetting.save()
    res.status(200).json({
        message:"registrationcompleted",
        data:pVetting
    })
    }catch(err){
        res.status(400).send(err.message);
    }
})

participantRouter.get('/details', auth, isAuthorized('participant'), async(req,res)=>{
    try{
        const _id = req.user._id;
        const details = await Details.findOne({user:_id});
        if(!details){
            return res.status(403).json({
                message: "Details are not available"
            });
        }
        return res.status(200).json({
            message: "Details fetched successfully",
            data: details
        });
    }catch(err){
        res.status(400).send(err.message);
    }
})
//posts activiity into for an event in db, files in S3 bucket
participantRouter.post("/activities", auth, isAuthorized("participant"), async (req, res) => {
  try {
    const userId = req.user._id; // from auth middleware
    const { event, type, text, media = [], visibility = "public", tags = [] } = req.body;

    // Basic validation
    if (!event) return res.status(400).json({ message: "event is required" });
    if (!type || !["text", "image", "video"].includes(type)) {
      return res.status(400).json({ message: "type must be one of: text, image, video" });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "text is required for all activities" });
    }   
    if ((type === "image" || type === "video") && media.length === 0) {
      return res.status(400).json({ message: "media[] is required for image/video" });
    }

    // Optional: ensure event exists
    const ev = await Event.findById(event).select("_id");
    if (!ev) return res.status(404).json({ message: "event not found" });

    // Normalize media items: infer kind from contentType if not provided
    const normalizedMedia = media.map((m) => {
      const kind =
        m?.kind ||
        (m?.contentType?.startsWith("image/")
          ? "image"
          : m?.contentType?.startsWith("video/")
          ? "video"
          : undefined);

      if (!kind) {
        throw new Error("media.kind or media.contentType (image/* or video/*) is required");
      }

      return {
        kind,
        url: m.url,                     // e.g., https://bucket.s3.amazonaws.com/uploads/169..._file.jpg
        thumbUrl: m.thumbUrl,           // optional (you can add later)
        contentType: m.contentType,     // e.g., image/jpeg
        sizeBytes: m.sizeBytes,
        width: m.width,
        height: m.height,
        durationSec: m.durationSec,
        checksum: m.checksum,
        transcodingStatus: m.transcodingStatus || "none",
      };
    });

    // For type=text enforce no media; for media types, ensure kinds match
    if (type === "text" && normalizedMedia.length > 0) {
      return res.status(400).json({ message: "media[] must be empty for type=text" });
    }
    if (type === "image" && normalizedMedia.some((m) => m.kind !== "image")) {
      return res.status(400).json({ message: "all media must be kind=image for type=image" });
    }
    if (type === "video" && normalizedMedia.some((m) => m.kind !== "video")) {
      return res.status(400).json({ message: "all media must be kind=video for type=video" });
    }

    const activity = await Activity.create({
      user: userId,
      event,
      type,
      text,
      media: normalizedMedia,
      visibility,
      status: "approved", // or "pending" if you want moderation
      points: 0,
      tags,
      meta: req.body.meta || {},
    });

    return res.status(201).json({ message: "activity created", activity });
  } catch (err) {
    console.error("POST /activities error:", err);
    return res.status(400).json({ message: err.message || "failed to create activity" });
  }
});

/** Utility: whitelist body fields */
const pick = (obj, keys) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

/** GET /me -> logged-in user profile (sanitized) */
participantRouter.get('/profile/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v -passwordChangedAt')
      .lean();
    if (!user) return res.status(404).send('User not found');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

/** PATCH /me -> update own profile (cannot edit emailId, phone, password, role) */
participantRouter.patch('/profile/edit', auth, async (req, res, next) => {
  try {
    const DISALLOWED = ['emailId', 'phone', 'password', 'role'];
    if (Object.keys(req.body).some((k) => DISALLOWED.includes(k))) {
      return res.status(400).send('emailId, phone, password, and role cannot be edited.');
    }

    // Only allow these fields for self-edit:
    const ALLOWED = [
      'firstName',
      'lastName',
      'location',
      'age',
      'gender',
      'college',
      'clubs'
      // NOTE: not including 'status' here (keep status immutable for users)
    ];

    const update = pick(req.body, ALLOWED);

    // If nothing to update
    if (Object.keys(update).length === 0) {
      return res.status(400).send('No valid fields to update.');
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password -__v -passwordChangedAt');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});


// route to post proof of submission of an actiivity by participant for admin/ reviewer to review
participantRouter.post("/", auth, async (req, res) => {
  try {
    const {
      event,
      stepNumber,
      proofImageUrl,
      socialLink,
      experience,
    } = req.body;

    // Validation
    if (!event || !stepNumber || !experience) {
      return res.status(400).json({
        success: false,
        message: "event, stepNumber, and experience are required",
      });
    }
    if(!proofImageUrl && !socialLink){
      return res.status(400).json({
        success:false,
        message:"Either SocialLink or ProofImage are required"
      })
    }

    const newSubmission = new EventSubmission({
      user: req.user._id,  // taken from authMiddleware
      event,
      stepNumber,
      proofImageUrl: proofImageUrl || null,
      socialLink: socialLink || null,
      experience,
    });

    const saved = await newSubmission.save();

    res.status(201).json({
      success: true,
      message: "Submission created successfully",
      submission: saved,
    });
  } catch (err) {
    console.error("Error creating submission:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = participantRouter;