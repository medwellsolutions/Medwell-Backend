const express = require('express');
const bcrypt = require('bcrypt');
const authRouter = express.Router();
const User = require('../models/userSchema.js');
const isValidated = require('../utils/validation.js');
const validator = require('validator');
const jwt = require('jsonwebtoken');

authRouter.post('/signup/', async (req,res)=>{

    
    const hashedPassword =await bcrypt.hash(req.body.password,10);  
    var status = "hold";
    try{
        if(req.body?.role == 'participant'){
            status = "accepted";
        }
        isValidated(req);
        const user =new User({
            firstName:req.body.firstName,
            lastName:req.body.lastName,
            password:hashedPassword,
            age:req.body.age,
            emailId:req.body.emailId,
            gender:req.body.gender,
            role:req.body.role,
            status:status
        });
        await user.save();
        res.send("user Signed-up");
    }catch(err){
        res.status(404).send(err.message);
    }
    
})

authRouter.post('/login',async (req,res)=>{
    const emailId = req.body?.emailId;
    const password = req.body?.password;
    try{
        
    const user = await User.findOne({emailId,emailId});

    if(!emailId || !validator.isEmail(emailId) || !password){
        throw new Error("Invalid credentials");
    }
    if(!user){
        throw new Error("Invalid Credentials");
    }
    const truth = await bcrypt.compare(password, user.password);
    if(!truth){
        throw new Error("Invalid credentials");
    }
    if(user?.status !='accepted'){
        res.status(401).send("unAuthorized");
    }
    const token = jwt.sign({_id:user._id, role:user.role},'Medwell123@');
    res.cookie("token", token);

    res.json({
            message:"Login Success",
            data:user
        })

    }catch(err){
        res.send(err.message);
    }
    

})






module.exports = authRouter;