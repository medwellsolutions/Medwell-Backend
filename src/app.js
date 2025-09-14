const express = require('express');
const connectDB = require('./config/database.js')
const Auth = require('./middleware/auth.js');
const studentRouter = require('./routes/studentRouter.js');


const app = express();

app.use(express.json());

app.use('/', studentRouter);
app.use('/', (req,res)=>{
    res.send("came through middleware");
})


connectDB().then(()=>{
    console.log("App is connect to DB");
    
    app.listen(7777, ()=>{
        console.log("App is running on port no 7777");
    })
})