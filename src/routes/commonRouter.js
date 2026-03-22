const express = require('express');
const commonRouter = express.Router();
const {auth} = require('../middleware/auth.js');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Event = require('../models/EventSchema.js')
const EventView = require('../models/EventView.js')
const EventSubmission = require('../models/EventSubmission.js');
const UserMonthlyPoints = require("../models/UserMonthlyPoints");
const { monthKeyFromDate } = require("../utils/dateUtil");


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

//sends an uploadurl to upload files in s3bucket 
commonRouter.post("/uploads/sign", auth, async (req, res) => {
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

// Returns a short-lived signed URL for reading a private S3 object
commonRouter.get("/uploads/sign", auth, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "key is required" });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
    return res.json({ signedUrl });
  } catch (err) {
    console.error("GET /uploads/sign error:", err);
    return res.status(500).json({ error: err.message });
  }
});

//fetches events of a given month
commonRouter.get("/events/:month" ,async (req, res) => {
  const month = req.params.month;
  const events = await Event.find({ month, isActive: true });
  res.json(events);
});

// Records a unique view — each user is counted only once per event
commonRouter.post("/event/:eventId/view", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    // upsert: true inserts only if {event, user} pair doesn't exist yet
    const result = await EventView.updateOne(
      { event: eventId, user: userId },
      { $setOnInsert: { event: eventId, user: userId } },
      { upsert: true }
    );

    // upsertedCount === 1 means this is the user's first view
    if (result.upsertedCount === 1) {
      await Event.findByIdAndUpdate(eventId, { $inc: { viewCount: 1 } });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("POST /event/:eventId/view error:", err);
    return res.status(500).json({ success: false });
  }
});

//fetches the data of a given event/cause
commonRouter.get("/event/:eventId", async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json({ event });
  } catch (err) {
    console.error("Error fetching event:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

commonRouter.get("/leaderboard", auth, async (req, res) => {
  try {
    // optional: allow frontend to ask a specific month: /leaderboard?monthKey=2026-02
    const monthKey =
      (req.query.monthKey && String(req.query.monthKey)) || monthKeyFromDate(new Date());

    const limit = Math.min(Number(req.query.limit || 100), 500);

    const rows = await UserMonthlyPoints.find({ monthKey })
      .populate("user", "_id firstName lastName")
      .sort({ points: -1, lastApprovedAt: -1 }) // tie-breaker
      .limit(limit)
      .lean();

    // Convert to frontend-friendly shape
    const data = rows.map((r, idx) => ({
      rank: idx + 1, // you can also compute in frontend, but this is handy
      userId: r.user?._id,
      firstName: r.user?.firstName || "",
      lastName: r.user?.lastName || "",
      points: Number(r.points || 0),
    }));
    return res.status(200).json({
      success: true,
      monthKey,
      data,
    });
  } catch (err) {
    console.error("GET /leaderboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});




// GET /feed — approved public submissions, newest first, paginated
commonRouter.get("/feed", auth, async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page  || 1));
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const skip  = (page - 1) * limit;

    const submissions = await EventSubmission.find({
      status: "approved",
      visibility: "public",
    })
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user",  "firstName lastName")
      .populate("event", "name imageUrl")
      .select("user event stepNumber media socialLink experience reviewedAt")
      .lean();

    const total = await EventSubmission.countDocuments({ status: "approved", visibility: "public" });

    return res.json({ success: true, data: submissions, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET /feed error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = commonRouter;