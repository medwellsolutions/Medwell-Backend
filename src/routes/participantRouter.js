const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {ParticipantDetails, Details} = require('../models/ParticipantVetting.js');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Activity = require("../models/activitySchema.js");
const Event= require("../models/EventSchema.js");
const { default: mongoose } = require('mongoose');


participantRouter.get('/feed/participant',auth, isAuthorized('participant'),async (req,res)=>{
    try{
       const user = await User.findById(req.user._id);
        res.json({
            message:"200",
            // data:user,
        })
    }catch(err){
        res.send(err.message);
    }
})

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

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

participantRouter.post("/uploads/sign", auth, isAuthorized('participant'), async (req, res) => {
  const { fileName, fileType } = req.body;
  const ts = Date.now();
  const key = `uploads/${ts}_${fileName}`
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60 seconds
  const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  res.json({ uploadUrl, fileUrl });
});

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

participantRouter.get("/events/:month", auth, isAuthorized('participant') ,async (req, res) => {
  const month = req.params.month;
  const events = await Event.find({ month, isActive: true });
  res.json(events);
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

participantRouter.get("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    // validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid eventId" });
    }

    // Get only approved + public activities and required fields
    const data = await Activity.find({
      event: eventId,
      visibility: "public",
      status: "approved",
    })
      .select("text media createdAt") // only these fields
      .sort({ createdAt: -1 })
      .lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No activities found" });
    }

    res.json({ count: data.length, data });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = participantRouter;