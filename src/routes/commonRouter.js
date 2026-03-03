const express = require('express');
const commonRouter = express.Router();
const {auth} = require('../middleware/auth.js');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Event = require('../models/EventSchema.js')
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

//fetches events of a given month
commonRouter.get("/events/:month" ,async (req, res) => {
  const month = req.params.month;
  const events = await Event.find({ month, isActive: true });
  res.json(events);
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




module.exports = commonRouter;