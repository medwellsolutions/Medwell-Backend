require('dotenv').config();
const mongoose = require('mongoose');

const db = process.env.DB;

const connectDB = async()=>{

   await mongoose.connect(db);
}
module.exports = connectDB;