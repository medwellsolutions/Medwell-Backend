const express = require('express');
const { auth, isAuthorized } = require('../middleware/auth');
const adminRouter = express.Router();
const {Details} = require('../models/ParticipantVetting');
const User = require('../models/userSchema');
const {mongoose } = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

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

adminRouter.get('/admin/application/:id', auth, isAuthorized('admin'), async (req,res)=>{
    try{
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid id' });
        }
        const user = await Details.findOne({user:id}).lean();
        if(!user){
            return res.status(404).send("No userDetails Found"); 
        }
        res.status(200).json({
            data:user
        })
    }catch(err){
        res.send(err.message);
    }
})

adminRouter.get('/admin/applications', auth, isAuthorized('admin'), async (req,res)=>{
    try{
        const applicants = await User.find({status:'hold'}, {_id:1,firstName:1, lastName:1, role:1, createdAt:1});
        res.json({
            status:"success",
            data:applicants
        });
    }catch(err){
        res.send(`${err.message} error`);
    }
})

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

const ALLOWED = ["hold", "accepted", "rejected"];

/**
 * PATCH /admin/application/:id/status
 * Body: { reviewStatus: "hold" | "accepted" | "rejected" }
 */
adminRouter.patch("/admin/application/:id/status", auth, isAuthorized("admin"), async (req, res) => {
    const { id } = req.params;
    const { reviewStatus } = req.body;
    const adminId = req.user?._id;

    try {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid application id" });
      }

      if (!ALLOWED.includes(reviewStatus)) {
        return res
          .status(400)
          .json({ error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` });
      }

      // Find the application
      const application = await Details.findById(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Update the application
      application.reviewStatus = reviewStatus;
      application.updatedAt = new Date();
      application.updatedBy = adminId;
      await application.save();

      // Update linked user (same status field)
      if (application.user) {
        await User.findByIdAndUpdate(application.user, {
          status: reviewStatus,
          updatedAt: new Date(),
          updatedBy: adminId,
        });
      }

      return res.json({
        message: "Status updated successfully",
        data: { reviewStatus },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
);


module.exports = adminRouter;
