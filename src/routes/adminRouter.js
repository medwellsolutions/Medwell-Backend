const express = require('express');
const { auth, isAuthorized } = require('../middleware/auth');
const adminRouter = express.Router();
const {Details} = require('../models/ParticipantVetting');
const User = require('../models/userSchema');

adminRouter.get('/applicantdetails', auth, isAuthorized('admin'), async (req,res)=>{
    const user = req.body.userId;

})

adminRouter.get('/admin/applications', auth, isAuthorized('admin'), async (req,res)=>{
    try{
        const applicants = await User.find({status:'hold'}, {_id:1,firstName:1, lastName:1, role:1, createdAt:1});
        res.json({
            status:"success",
            data:applicants
        });
    }catch(err){
        res.send(err.message);
    }
})

module.exports = adminRouter;
