const express = require('express');
const studentRouter = express.Router();
const User = require('../models/userSchema.js');

studentRouter.post('/signup/participant', async (req,res)=>{

    try{
        const user = new User(req.body);
        await user.save();
        res.send("user Signed-up");
    }catch(err){
        res.status(404).send(err.message);
    }
    
})


module.exports = studentRouter;