require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const authRouter = express.Router();
const User = require('../models/userSchema.js');
const isValidated = require('../utils/validation.js');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { Details } = require('../models/ParticipantVetting.js');

const REGISTER_ROUTES = {
  doctor: "/doctor/register",
  sponsor: "/sponsor/register",
  supplier: "/supplier/register",
  "non-profit": "/nonprofit/register",
};

authRouter.post('/signup', async (req,res)=>{
    try{
        const { firstName, lastName, password, phone, location, age, emailId, gender, role } = req.body;
        const existingUser = await User.findOne({emailId});
        if(existingUser){
            return res.status(409).send("User already exists");
        }
        const hashedPassword =await bcrypt.hash(password,10);
        const status = req.body.role === "participant"? "accepted":"hold"
        isValidated(req);
        const user =new User({
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            location,
            emailId,
            role,
            status,
        });
        await user.save();
        res.status(201).send("user Signed-up");
    }catch(err){
        res.status(400).send(err.message);
    }
    
})

authRouter.post('/login',async (req,res)=>{
    const {emailId,password} = req.body;
    let nextRoute = '/home';
    try{
    if(!emailId || !validator.isEmail(emailId) || !password){
        return res.status(400).send("Invalid credentials");
    }

    const user = await User.findOne({emailId});
    if(!user){
        return res.status(401).send("account not found");
    }

    const truth = await bcrypt.compare(password, user.password);
    if(!truth){
        return res.status(401).send("Password Invalid");
    }
    // if(user.status !='accepted'){
    //     return res.status(401).send("Unauthorized");
    // }
    const token = jwt.sign({_id:user._id, role:user.role}, process.env.SECRET_KEY);
    res.cookie("token", token);
    if(user.role!='admin' && user.role!='participant'){
        const details = await Details.findOne({user:user._id});
        if(!details){
            nextRoute = REGISTER_ROUTES[user.role] || '/home';
        }
    }
    
    const userObj = user.toObject();
    if (userObj.password) delete userObj.password;
    res.json({
            message:"Login Success",
            data:{
                ...userObj, //takes all the keyvalue pairs and copies them in the data obj
                nextRoute
            }
            
        })

    }catch(err){
        res.send(err.message);
    }
    
})

authRouter.post('/logout',(req,res)=>{
    res.cookie( 'token', null, { expires: new Date( Date.now() ) } );
    res.send("Logout Successful");
})

module.exports = authRouter;