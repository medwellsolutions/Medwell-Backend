require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const authRouter = express.Router();
const User = require('../models/userSchema.js');
const isValidated = require('../utils/validation.js');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { Details } = require('../models/ParticipantVetting.js');
const crypto = require("crypto");
const { sendEmail } = require("../services/emailService");

const REGISTER_ROUTES = {
  doctor: "/doctor/register",
  sponsor: "/sponsor/register",
  supplier: "/supplier/register",
  "non-profit": "/nonprofit/register",
};

// authRouter.post('/signup', async (req,res)=>{
//     try{
//         const { firstName, lastName, password, phone, location, age, emailId, gender, role } = req.body;
//         const existingUser = await User.findOne({emailId});
//         if(existingUser){
//             return res.status(409).send("User already exists");
//         }
//         const hashedPassword =await bcrypt.hash(password,10);
//         const status = req.body.role === "participant"? "accepted":"hold"
//         isValidated(req);
//         const user =new User({
//             firstName,
//             lastName,
//             password: hashedPassword,
//             phone,
//             location,
//             emailId,
//             role,
//             status,
//         });
//         await user.save();
//         res.status(201).send("user Signed-up");
//     }catch(err){
//         res.status(400).send(err.message);
//     }
    
// })

authRouter.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, password, phone, location, age, emailId, gender, role } = req.body;

    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        return res.status(409).json({
          code: "UNVERIFIED",
          message: "An account with this email exists but hasn't been verified. Please verify your email or request a new link.",
        });
      }
      return res.status(409).json({
        code: "EXISTS",
        message: "An account with this email already exists. Please log in.",
      });
    }

    isValidated(req);

    const status = role === "participant" ? "accepted" : "hold";

    // ✅ hash password here (since you don't have presave)
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ generate verification token ONCE
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = new User({
      firstName,
      lastName,
      password: hashedPassword,
      phone,
      location,
      age,
      gender,
      emailId,
      role,
      status,

      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await sendEmail({
      to: user.emailId,
      subject: "Verify your email - Medwell",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Verify your email</h2>
          <p>Click below to verify:</p>
          <a href="${verifyUrl}" style="background:#1e90ff;padding:10px 18px;color:#fff;border-radius:6px;text-decoration:none;">
            Verify Email
          </a>
          <p>This link expires in 1 hour.</p>
        </div>
      `,
      text: `Verify your email: ${verifyUrl}`,
    });

    return res.status(201).json({
      message: "User signed up. Please verify your email.",
    });
  } catch (err) {
    return res.status(400).send(err.message);
  }
});


authRouter.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token missing" });

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

authRouter.post("/resend-verification", async (req, res) => {
  try {
    const { emailId } = req.body;
    if (!emailId || !validator.isEmail(emailId)) {
      return res.status(400).json({ message: "Valid email is required." });
    }

    const user = await User.findOne({ emailId });
    if (!user) {
      // Don't reveal whether email exists
      return res.status(200).json({ message: "If that account exists and is unverified, a new link has been sent." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: "This email is already verified. Please log in." });
    }

    // Generate a fresh token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: user.emailId,
      subject: "Verify your email - Medwell",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Verify your email</h2>
          <p>Click below to verify:</p>
          <a href="${verifyUrl}" style="background:#1e90ff;padding:10px 18px;color:#fff;border-radius:6px;text-decoration:none;">
            Verify Email
          </a>
          <p>This link expires in 1 hour.</p>
        </div>
      `,
      text: `Verify your email: ${verifyUrl}`,
    });

    return res.status(200).json({ message: "Verification email sent. Please check your inbox." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

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
    if(!user.isEmailVerified){
        return res.status(401).send("Email is not verified or account does not exist");
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