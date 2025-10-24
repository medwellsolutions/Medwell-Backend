const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {ParticipantDetails, Details} = require('../models/ParticipantVetting.js');

//s3 bucket
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


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

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `uploads/${Date.now()}_${fileName}`,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60 seconds
  const fileUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/uploads/${Date.now()}_${fileName}`;

  res.json({ uploadUrl, fileUrl });
});


module.exports = participantRouter;