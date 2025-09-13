const mongoose = require('mongoose');

const connectDB = async()=>{
   await mongoose.connect('mongodb+srv://pranaisaireddy:pranaisaireddy@pranaireddycluster.hxkhfks.mongodb.net/MedwellSolutions');
}
module.exports = connectDB;