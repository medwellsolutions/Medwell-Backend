require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const authRouter = express.Router();
const User = require('../models/userSchema.js');
const isValidated = require('../utils/validation.js');
const validator = require('validator');
const jwt = require('jsonwebtoken');

authRouter.post('/signup', async (req,res)=>{
    try{
        const { firstName, lastName, password, phone, location, age, emailId, gender, role, student } = req.body;
        const existingUser = await User.findOne({emailId});
        // console.log(existingUser);
        if(existingUser){
            return res.status(409).send("User already exists");
        }
        const hashedPassword =await bcrypt.hash(password,10);
        const status = req.body.role === "participant"? "accepted":"hold"
        isValidated(req);
        // const numAge = parseInt(age);
        const user =new User({
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            location,
            age:parseInt(age),
            emailId,
            gender,
            role,
            status,
            student
        });
        await user.save();
        res.status(201).send("user Signed-up");
    }catch(err){
        res.status(400).send(err.message);
    }
    
})

authRouter.post('/login',async (req,res)=>{
    const {emailId,password} = req.body;
    try{

    if(!emailId || !validator.isEmail(emailId) || !password){
        return res.status(400).send("Invalid credentials");
    }

    const user = await User.findOne({emailId});
    if(!user){
        return res.status(401).send("Invalid credentials");
    }

    const truth = await bcrypt.compare(password, user.password);
    if(!truth){
        return res.status(401).send("Invalid credentials");
    }
    if(user.status !='accepted'){
        return res.status(401).send("Unauthorized");
    }
    const token = jwt.sign({_id:user._id, role:user.role}, process.env.SECRET_KEY);
    res.cookie("token", token);

    const userObj = user.toString();
    delete userObj.password;
    res.json({
            message:"Login Success",
            data:userObj
        })

    }catch(err){
        res.send(err.message);
    }
    

})






module.exports = authRouter;