const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
const {ParticipantDetails, Details} = require('../models/ParticipantVetting.js');
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




module.exports = participantRouter;