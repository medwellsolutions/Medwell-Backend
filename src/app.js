const express = require('express');
const connectDB = require('./config/database.js')
const authRouter = require('./routes/authRouter.js');
const participantRouter = require('./routes/participantRouter.js');
const cookieParser = require('cookie-parser');

const app = express();


app.use(express.json());
app.use(cookieParser());

app.use('/', authRouter);
app.use('/',participantRouter);

app.use('/', (req,res)=>{
    res.send("came through middleware");
})


connectDB().then(()=>{
    console.log("App is connect to DB");
    
    app.listen(7777, ()=>{
        console.log("App is running on port no 7777");
    })
})