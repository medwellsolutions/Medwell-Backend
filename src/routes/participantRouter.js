const express = require('express');
const participantRouter = express.Router();
const User = require('../models/userSchema.js');
const {auth, isAuthorized} = require('../middleware/auth.js');
// const  = require('../middleware/auth.js');

participantRouter.get('/feed/participant',auth, isAuthorized('participant'),async (req,res)=>{
    try{
       const user = await User.findById(req.user._id);
        res.json({
            message:"200",
            data:user
        })
    }catch(err){
        res.send(err.message);
    }
})

module.exports = participantRouter;