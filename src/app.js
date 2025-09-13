const express = require('express');
const connectDB = require('./config/database.js')

const app = express();

app.use('/',(req,res)=>{
    res.send("Server is working");
})


connectDB().then(()=>{
    console.log("App is connect to DB");
    
    app.listen(7777, ()=>{
        console.log("App is running on port no 7777");
    })
})