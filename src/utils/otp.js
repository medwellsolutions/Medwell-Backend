const bcrypt = require('bcrypt');

const generateOTP = ()=>{
    const num = crypto.randomInt(0,1000000);
    return num.toString().padStart(6,"0"); //fills the number with 0 on left side until the length of the string is 6;
}
const hashOTP = (otp)=>{
    return bcrypt.hash(otp, 10);
}
const verifyOTP = (otp, hashotp)=>{
    return bcrypt.compare(otp, hashotp);
}

module.exports = {generateOTP, hashOTP, verifyOTP};