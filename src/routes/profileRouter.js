const express = require('express');
const profileRouter = express.Router();
const {auth} = require('../middleware/auth');
const bcrypt = require('bcrypt');
const validator = require('validator');
const User = require('../models/userSchema');


//Change Password
profileRouter.patch('/profile/editPassword', auth, async (req,res)=>{

    try{
        const {oldPassword, newPassword} = req.body;
        if(!oldPassword || !newPassword){
            throw new Error("Both current and new Passwords are required");
        }
        if(oldPassword === newPassword){
            throw new Error("new password cannot be same as current password");
        }

        const user = await User.findById(req.user._id);

        const isValidated = await user.validatePassword(oldPassword);
        if(!isValidated){
            throw new Error("your current password is wrong");
        }
        if(!validator.isStrongPassword(newPassword)){
            throw new Error("Password is not strong enough");
        }
        
        user.password = await bcrypt.hash(newPassword, 10);
        
        await user.save(); //this will run validators in the schema and save it to the DB
        res.send("Password Changed Successfully");
    }catch(err){
        res.send(err.message);
    }
    
})

module.exports = profileRouter;
