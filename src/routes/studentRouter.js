const express = require('express');
const studentRouter = express.Router();

studentRouter.post('/signup/student', (req,res)=>{
    res.send("Student Signup");
})

module.exports = studentRouter;