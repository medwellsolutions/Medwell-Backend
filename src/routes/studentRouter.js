const express = require('express');
const bcrypt = require('bcrypt');
const studentRouter = express.Router();
const User = require('../models/userSchema.js');
const isValidated = require('../utils/validation.js');
const validator = require('validator');
const jwt = require('jsonwebtoken');

studentRouter.post('/signup/participant', async (req,res)=>{

    
    const hashedPassword =await bcrypt.hash(req.body.password,10);

    try{
        isValidated(req);
        const user =new User({
            firstName:req.body.firstName,
            lastName:req.body.lastName,
            password:hashedPassword,
            age:req.body.age,
            emailId:req.body.emailId,
            gender:req.body.gender,
            role:req.body.role,

        });
        await user.save();
        res.send("user Signed-up");
    }catch(err){
        res.status(404).send(err.message);
    }
    
})

studentRouter.post('/login/participant',async (req,res)=>{
    // console.log()
    const emailId = req.body?.emailId;
    const password = req.body?.password;
    try{
        if(!emailId || !validator.isEmail(emailId) || !password){
        throw new Error("Invalid credentials");
    }
    const user = await User.findOne({emailId,emailId});
    if(!user){
        throw new Error("Invalid Credentials");
    }
    const truth = await bcrypt.compare(password, user.password);
    if(!truth){
        throw new Error("Invalid credentials");
    }
    const token = jwt.sign({_id:user._id},'Medwell123@');
    res.cookie("token", token);

    res.json({
            message:"Login Success",
            data:user
        })

    }catch(err){
        res.send(err.message);
    }
    

})
studentRouter.get('/feed/participant',async (req,res)=>{
    try{
        const token = req.cookies.token;
        const decodedToken = jwt.verify(token,"Medwell123@");
        const user = await User.findById(decodedToken._id);
        if(user.role!='participant'){
            throw new Error('User is not autorised to this page');
        }
        res.json({
            message:"token valid",
            data:user
        })
    }catch(err){
        res.send(err.message);
    }
})




module.exports = studentRouter;