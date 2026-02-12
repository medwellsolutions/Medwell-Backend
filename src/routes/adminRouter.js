const express = require('express');
const { auth, isAuthorized } = require('../middleware/auth');
const adminRouter = express.Router();
const {Details} = require('../models/ParticipantVetting');
const User = require('../models/userSchema');
const {mongoose } = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const ALLOWED = ["hold", "accepted", "rejected"];
const Event = require('../models/EventSchema.js');
const EventSubmission = require('../models/EventSubmission.js');

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
const buckets = new Map();


//gets the details of participants who submitted their activity proofs
adminRouter.get("/admin/applications", auth, isAuthorized("admin"), async (req, res) => {
  try {
    // You can control what "application" means:
    // 1) all pending submissions:
    const submissions = await EventSubmission.find({ status: "pending" })
      .populate("user", "_id firstName lastName role createdAt emailId")
      .select("_id user createdAt") // submission _id + user + createdAt
      .sort({ createdAt: -1 })
      .lean();

    // Convert into the exact structure your Applications UI expects
    const applicants = submissions
      .filter((s) => s.user) // safety
      .map((s) => ({
        _id: s.user._id,            // IMPORTANT: keep user id for /application/:id page
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        role: s.user.role,
        createdAt: s.createdAt,     // show when they submitted (not when user was created)
        submissionId: s._id,        // optional, useful later
      }));
      console.log(applicants);

    return res.status(200).json({
      status: "success",
      data: applicants,
    });
  } catch (err) {
    console.error("GET /admin/applications error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});


//displays the event-submission details for an activity from an event by userId
adminRouter.get("/admin/application/:userId", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const { userId } = req.params;

    // Prefer pending submission; if none, take latest overall
    let submission = await EventSubmission.findOne({ user: userId, status: "pending" })
      .populate("user", "_id firstName lastName emailId role")
      .populate("event", "_id name month")
      .sort({ createdAt: -1 })
      .lean();

    if (!submission) {
      submission = await EventSubmission.findOne({ user: userId })
        .populate("user", "_id firstName lastName emailId role")
        .populate("event", "_id name month")
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!submission) {
      return res.status(404).json({ success: false, message: "No submissions found for this user" });
    }

    // Return in the shape your ViewApplication expects
    const payload = {
      _id: submission._id,                // IMPORTANT: submission id (used for PATCH)
      user: submission.user?._id,
      email: submission.user?.emailId,
      role: submission.user?.role,

      reviewStatus:
        submission.status === "approved"
          ? "accepted"
          : submission.status === "rejected"
          ? "rejected"
          : "hold",

      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,

      // show these in "Role-specific data"
      event: submission.event,
      stepNumber: submission.stepNumber,
      experience: submission.experience,
      socialLink: submission.socialLink,
      media: submission.media || [],
      visibility: submission.visibility,
      tags: submission.tags || [],
      meta: submission.meta || {},

      status: submission.status,
      hoursAwarded: submission.hoursAwarded || 0,
      pointsAwarded: submission.pointsAwarded || 0,
      reviewComment: submission.reviewComment || "",
      reviewedBy: submission.reviewedBy || null,
      reviewedAt: submission.reviewedAt || null,
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error("GET /admin/application/:userId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


adminRouter.get('/admin/file/:fileId', auth, isAuthorized('admin'), async (req, res) => {
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


adminRouter.patch(
  "/admin/application/:id/status",
  auth,
  isAuthorized("admin"),
  async (req, res) => {
    const { id } = req.params; // IMPORTANT: this should be EventSubmission _id
    const {
      reviewStatus,           // "hold" | "accepted" | "rejected"
      hoursAwarded = 0,
      pointsAwarded = 0,
      reviewComment = "",
    } = req.body;

    const adminId = req.user?._id;

    try {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid submission id" });
      }

      const ALLOWED = ["hold", "accepted", "rejected"];
      if (!ALLOWED.includes(reviewStatus)) {
        return res
          .status(400)
          .json({ error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` });
      }

      // Map UI status -> EventSubmission status
      const mappedStatus =
        reviewStatus === "accepted"
          ? "approved"
          : reviewStatus === "rejected"
          ? "rejected"
          : "pending"; // hold

      // Rejection requires comment
      if (mappedStatus === "rejected" && !String(reviewComment).trim()) {
        return res.status(400).json({ error: "Rejection comment is required" });
      }

      // Find submission
      const submission = await EventSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Update submission
      submission.status = mappedStatus;
      submission.reviewedBy = adminId;
      submission.reviewedAt = new Date();
      submission.reviewComment =
        mappedStatus === "rejected" ? String(reviewComment).trim() : "";

      submission.hoursAwarded =
        mappedStatus === "approved" ? Number(hoursAwarded || 0) : 0;

      submission.pointsAwarded =
        mappedStatus === "approved" ? Number(pointsAwarded || 0) : 0;

      await submission.save();

      // OPTIONAL: update user.status too (only if your app uses this field for access)
      // NOTE: Your earlier users didn't have status="hold" so keep this only if you add that field.
      // if (submission.user) {
      //   await User.findByIdAndUpdate(submission.user, {
      //     status: reviewStatus, // store "hold/accepted/rejected" on User
      //     updatedAt: new Date(),
      //     updatedBy: adminId,
      //   });
      // }

      return res.json({
        message: "Submission updated successfully",
        data: {
          reviewStatus,
          status: mappedStatus,
          hoursAwarded: submission.hoursAwarded,
          pointsAwarded: submission.pointsAwarded,
          reviewComment: submission.reviewComment,
          reviewedBy: submission.reviewedBy,
          reviewedAt: submission.reviewedAt,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
);


adminRouter.post( "/admin/createevent",
  auth,
  isAuthorized("admin"),
  async (req, res) => {
    try {
      const {
        name,
        caption,
        month,

        imageUrl,
        bannerImageUrl,

        startsAt,
        endsAt,

        shortDescription,
        longDescription,

        actionSteps,
        estimatedTime,
        volunteerHours,
        additionalInstructions,
        certificateInfo,
        requirements,
        checkListItems,
        FAQs,

        isActive,
      } = req.body;

      // Basic validation
      if (
        !name ||
        !caption ||
        !month ||
        // !imageUrl ||
        // !bannerImageUrl ||
        !startsAt ||
        !endsAt ||
        !shortDescription ||
        !longDescription
      ) {
        return res.status(400).json({
          message: "Missing required fields",
        });
      }

      // Create event document
      const event = new Event({
        name,
        caption,
        month,

        imageUrl,
        bannerImageUrl,

        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),

        shortDescription,
        longDescription,

        actionSteps: actionSteps || [],
        estimatedTime: estimatedTime || {},
        volunteerHours: volunteerHours || {},
        additionalInstructions: additionalInstructions || [],
        certificateInfo: certificateInfo || {},

        requirements: requirements || [],
        checkListItems: checkListItems || [],
        FAQs: FAQs || [],

        isActive: isActive ?? true,
      });

      await event.save();

      return res.status(201).json({
        message: "Event created successfully",
        event,
      });
    } catch (err) {
      console.error("Error creating event:", err);
      return res.status(500).json({
        message: "Internal Server Error",
        error: err.message,
      });
    }
  }
);

module.exports = adminRouter;
