const express = require('express');
const connectDB = require('./config/database.js')
const authRouter = require('./routes/authRouter.js');
const participantRouter = require('./routes/participantRouter.js');
const cookieParser = require('cookie-parser');
const doctorRouter = require('./routes/doctorRouter.js');
const cors = require('cors');
const adminRouter = require('./routes/adminRouter.js');

const app = express();

app.use(cors({
    origin:"http://localhost:5173",
    credentials: true,
}))

app.use(express.json());
app.use(cookieParser());

app.use('/', authRouter);
app.use('/',participantRouter);
app.use('/', doctorRouter);
app.use('/',adminRouter);

app.use('/', (req,res)=>{
    res.send("came through middleware");
})


connectDB().then(()=>{
    console.log("App is connect to DB");
    
    app.listen(7777, ()=>{
        console.log("App is running on port no 7777");
    })
})