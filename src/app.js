const express = require('express');
const connectDB = require('./config/database.js')
const authRouter = require('./routes/authRouter.js');
const participantRouter = require('./routes/participantRouter.js');
const cookieParser = require('cookie-parser');
const doctorRouter = require('./routes/doctorRouter.js');
const supplierRouter = require('./routes/supplierRouter.js');
const cors = require('cors');
const adminRouter = require('./routes/adminRouter.js');
const sponsorRouter = require('./routes/sponsorRouter.js');
const nonProfitRouter = require('./routes/nonprofitRouter.js');
const profileRouter = require('./routes/profileRouter.js');
const commonRouter = require('./routes/commonRouter.js');
const app = express();

app.use(cors({
    origin:"http://localhost:5173",
    credentials: true,
}))

app.use(express.json());
app.use(cookieParser());

app.use('/', authRouter);
app.use('/', commonRouter);
app.use('/', participantRouter);
app.use('/', doctorRouter);
app.use('/', adminRouter);
app.use('/', supplierRouter);
app.use('/', sponsorRouter);
app.use('/', nonProfitRouter);
app.use('/', profileRouter);


const { sendEmail } = require("./services/emailService.js");

app.post("/test-email", async (req, res) => {
  try {
    const { to } = req.body;

    const url = "https://example.com";
    await sendEmail({
      to,
      subject: "SES test - Medwell",
      html: `<h2>SES works ✅</h2><p>Link: <a href="${url}">${url}</a></p>`,
      text: `SES works. Link: ${url}`,
    });

    res.json({ ok: true, message: "Email sent" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});



app.use('/', (req,res)=>{
    res.send("came through middleware");
})






connectDB().then(()=>{
    console.log("App is connect to DB");
    
    app.listen(7777, ()=>{
        console.log("App is running on port no 7777");
    })
})