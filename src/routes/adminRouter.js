const express = require('express');
const { auth, isAuthorized } = require('../middleware/auth');
const adminRouter = express.Router();
const {Details} = require('../models/ParticipantVetting');
const { sendEmail } = require('../services/emailService');
const User = require('../models/userSchema');
const {mongoose } = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const ALLOWED = ["hold", "accepted", "rejected"];
const Event = require('../models/EventSchema.js');
const EventSubmission = require('../models/EventSubmission.js');
const UserMonthlyPoints = require("../models/UserMonthlyPoints");
const { monthKeyFromDate } = require("../utils/dateUtil.js");

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
    const { id } = req.params;
    const {
      reviewStatus,
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
        return res.status(400).json({
          error: `Invalid status. Allowed: ${ALLOWED.join(", ")}`,
        });
      }

      const mappedStatus =
        reviewStatus === "accepted"
          ? "approved"
          : reviewStatus === "rejected"
          ? "rejected"
          : "pending";

      if (mappedStatus === "rejected" && !String(reviewComment).trim()) {
        return res.status(400).json({ error: "Rejection comment is required" });
      }

      const submission = await EventSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // -------- OLD VALUES --------
      const oldStatus = submission.status;
      const oldPoints = Number(submission.pointsAwarded || 0);
      const oldHours = Number(submission.hoursAwarded || 0);

      // ✅ monthKey should be EVENT month, derived from Event.startsAt if needed
      const yyyyMm = /^\d{4}-\d{2}$/;
      let monthKey = submission.eventMonthKey;

      if (!monthKey || !yyyyMm.test(String(monthKey))) {
        // fallback: compute from event.startsAt
        const ev = await Event.findById(submission.event).select("_id startsAt");
        if (!ev?.startsAt) {
          return res.status(400).json({
            error: "Cannot compute monthKey: event.startsAt missing/invalid",
          });
        }
        const d = new Date(ev.startsAt);
        if (isNaN(d.getTime())) {
          return res.status(400).json({
            error: "Cannot compute monthKey: event.startsAt invalid",
          });
        }
        monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        // ✅ also persist the corrected monthKey on the submission so future calls are fast
        submission.eventMonthKey = monthKey;
      }

      // -------- NEW VALUES --------
      const newPoints = mappedStatus === "approved" ? Number(pointsAwarded || 0) : 0;
      const newHours = mappedStatus === "approved" ? Number(hoursAwarded || 0) : 0;

      // -------- UPDATE SUBMISSION --------
      submission.status = mappedStatus;
      submission.reviewedBy = adminId;
      submission.reviewedAt = new Date();
      submission.reviewComment =
        mappedStatus === "rejected" ? String(reviewComment).trim() : "";

      submission.hoursAwarded = newHours;
      submission.pointsAwarded = newPoints;

      await submission.save();

      // -------- LEADERBOARD DELTA (EVENT MONTH BASED) --------
      async function incMonthly(userId, monthKey, dp, dh, dc) {
        if (!dp && !dh && !dc) return;

        await UserMonthlyPoints.updateOne(
          { user: userId, monthKey },
          {
            $inc: {
              points: dp,
              hours: dh,
              approvedCount: dc,
            },
          },
          { upsert: true }
        );
      }

      // Cases
      if (oldStatus !== "approved" && mappedStatus === "approved") {
        await incMonthly(submission.user, monthKey, newPoints, newHours, 1);
      } else if (oldStatus === "approved" && mappedStatus !== "approved") {
        await incMonthly(submission.user, monthKey, -oldPoints, -oldHours, -1);
      } else if (oldStatus === "approved" && mappedStatus === "approved") {
        await incMonthly(
          submission.user,
          monthKey,
          newPoints - oldPoints,
          newHours - oldHours,
          0
        );
      }

      return res.json({
        message: "Submission updated successfully",
        data: {
          reviewStatus,
          status: mappedStatus,
          hoursAwarded: submission.hoursAwarded,
          pointsAwarded: submission.pointsAwarded,
          monthKey, // helpful for debugging
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// GET pending vetting count (lightweight — used for navbar badge)
adminRouter.get("/admin/vettings/count", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const [pending, total] = await Promise.all([
      Details.countDocuments({ reviewStatus: "hold" }),
      Details.countDocuments({}),
    ]);
    return res.status(200).json({ status: "success", data: { pending, total } });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// GET all vetting submissions from the details collection (all roles)
adminRouter.get("/admin/vettings", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const docs = await Details.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Shape each doc to only send what the list UI needs
    const data = docs.map((d) => ({
      _id: d._id,
      role: d.role,
      email: d.email,
      reviewStatus: d.reviewStatus || "hold",
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,

      // name fields — different per role, frontend picks whichever exists
      businessName:  d.businessName  || null,   // supplier, sponsor
      legalName:     d.legalName     || null,    // non-profit
      clinicName:    d.clinicName    || null,    // doctor

      // extra subtitle fields
      businessStructure: d.businessStructure || null,  // supplier
      entityType:        d.entityType        || null,  // sponsor
      stateIncorp:       d.stateIncorp       || null,  // non-profit
      practiceAddress:   d.practiceAddress   || null,  // doctor
    }));

    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("GET /admin/vettings error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// GET single vetting application by _id
adminRouter.get("/admin/vetting/:id", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ status: "error", message: "Invalid id" });
    }
    const doc = await Details.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }
    return res.status(200).json({ status: "success", data: doc });
  } catch (err) {
    console.error("GET /admin/vetting/:id error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// PATCH vetting status
adminRouter.patch("/admin/vetting/:id/status", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewerNotes = "" } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ status: "error", message: "Invalid id" });
    }
    if (!ALLOWED.includes(reviewStatus)) {
      return res.status(400).json({ status: "error", message: `Status must be one of: ${ALLOWED.join(", ")}` });
    }
    if (reviewStatus === "rejected" && !String(reviewerNotes).trim()) {
      return res.status(400).json({ status: "error", message: "Reviewer notes are required when rejecting" });
    }

    const doc = await Details.findById(id);
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }

    doc.reviewStatus = reviewStatus;
    doc.reviewedBy = req.user?._id;
    doc.reviewedAt = new Date();
    doc.reviewerNotes = reviewStatus === "rejected" ? String(reviewerNotes).trim() : String(reviewerNotes || "");
    await doc.save();

    // Send status notification email
    if (doc.email) {
      const roleLabel = (doc.role || "partner").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const subjects = {
        accepted: `Your ${roleLabel} application has been approved – Medwell`,
        rejected: `Update on your ${roleLabel} application – Medwell`,
        hold:     `Your ${roleLabel} application is under review – Medwell`,
      };
      const bodies = {
        accepted: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#1a7a4a">Application Approved ✓</h2>
            <p>Great news! Your <strong>${roleLabel}</strong> application with Medwell has been <strong>approved</strong>.</p>
            <p>You can now log in and complete your profile to get started.</p>
            <p style="margin-top:24px;color:#888;font-size:12px">If you have questions, reply to this email.</p>
          </div>`,
        rejected: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#c0392b">Application Not Approved</h2>
            <p>Thank you for applying as a <strong>${roleLabel}</strong> with Medwell.</p>
            <p>After review, we were unable to approve your application at this time.</p>
            ${doc.reviewerNotes ? `<div style="margin:16px 0;padding:12px 16px;background:#fff3f3;border-left:4px solid #e13429;border-radius:4px"><strong>Reviewer notes:</strong><br/>${doc.reviewerNotes}</div>` : ""}
            <p>If you believe this is an error or would like to discuss further, please reach out to us.</p>
            <p style="margin-top:24px;color:#888;font-size:12px">Thank you for your interest in Medwell.</p>
          </div>`,
        hold: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#b7791f">Application Under Review</h2>
            <p>Your <strong>${roleLabel}</strong> application with Medwell is currently <strong>under review</strong>.</p>
            <p>We will notify you once a decision has been made. This typically takes a few business days.</p>
            <p style="margin-top:24px;color:#888;font-size:12px">Thank you for your patience.</p>
          </div>`,
      };
      try {
        await sendEmail({
          to: doc.email,
          subject: subjects[reviewStatus] || `Application update – Medwell`,
          html: bodies[reviewStatus] || bodies.hold,
        });
      } catch (emailErr) {
        console.error("Status email failed (non-fatal):", emailErr.message);
      }
    }

    return res.status(200).json({ status: "success", data: { reviewStatus, reviewerNotes: doc.reviewerNotes } });
  } catch (err) {
    console.error("PATCH /admin/vetting/:id/status error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

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

// PATCH /admin/event/:eventId — update any fields of an existing event
adminRouter.patch("/admin/event/:eventId", auth, isAuthorized("admin"), async (req, res) => {
  try {
    const { eventId } = req.params;

    const ALLOWED = [
      "name", "caption", "month", "imageUrl", "bannerImageUrl",
      "startsAt", "endsAt", "shortDescription", "longDescription",
      "actionSteps", "estimatedTime", "volunteerHours",
      "additionalInstructions", "certificateInfo",
      "requirements", "checkListItems", "FAQs", "isActive",
    ];

    const update = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const updated = await Event.findByIdAndUpdate(
      eventId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json({ message: "Event updated successfully.", event: updated });
  } catch (err) {
    console.error("PATCH /admin/event/:eventId error:", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = adminRouter;