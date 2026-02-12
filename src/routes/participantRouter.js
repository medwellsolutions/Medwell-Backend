const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {ParticipantDetails, Details} = require('../models/ParticipantVetting.js');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
participantRouter.post("/activity/submission", auth, async (req, res) => {
  try {
    const { event, stepNumber, proofImageUrl, socialLink, experience } = req.body;

    if (!event || !stepNumber || !experience) {
      return res.status(400).json({
        success: false,
        message: "event, stepNumber, and experience are required",
      });
    }

    if (!proofImageUrl && !socialLink) {
      return res.status(400).json({
        success: false,
        message: "Either SocialLink or ProofImage are required",
      });
    }

    // ✅ Convert proofImageUrl into media[] to match your schema
    const media = proofImageUrl
      ? [
          {
            kind: "image",
            url: proofImageUrl,
            // optional:
            contentType: "image/jpeg",
            transcodingStatus: "none",
          },
        ]
      : [];

    const newSubmission = new EventSubmission({
      user: req.user._id,
      event,
      stepNumber,
      media, // ✅ correct field
      socialLink: socialLink || null,
      experience,
      status: "pending",
    });

    const saved = await newSubmission.save();

    return res.status(201).json({
      success: true,
      message: "Submission created successfully",
      submission: saved,
    });
  } catch (err) {
    console.error("Error creating submission:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


module.exports = participantRouter;