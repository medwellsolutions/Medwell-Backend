const mongoose = require('mongoose');
const validator = require('validator');


const EmailVerifySchema = new mongoose.Schema({
    otpHash:{
        type:String
    },
    expiresAt:{
        type:Date
    },
    attempts:{
        type:Number,
        default:0
    },
    resendCount:{
        type:Number,
        default:0
    },
    lastSentAt:{
        type:Date
    }
},{
    _id:false
})
const UserSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        minLength:4
    },
    lastName:{
        type:String,
        required:true
    },
    emailId:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Email is not valid");
            }
        }
    },
    password:{
        type:String,
        required:true,
        minLength:true,
        trim:true,
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Password is not Strong enough");
            }
        }
    },
    age:{
        type:Number,
        required:true
    },
    gender:{
        type:String,
        required:true,
        validate(value){
            if(value!='male' && value!='female' && value!= 'others'){
                throw new Error('Gender Invalid');
            }
        }
    },
    role:{
        type:String,
        required:true,
        validate(value){
            if(value!='participant' && value!= 'admin' && value!= 'organizer'){
                throw new Error("Invalid role");
            }
        }
    },
    status:{
        type:String,
        required:true,
        default:"hold",
        validate(value){
            if(value!='hold' && value !='accepted' && value != 'rejected'){
                throw new Error('status not allowed');
            }
        }
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    emailVerification:{
        type:EmailVerifySchema,
        default:{}
    }

},
{
    timestamps:true
}
)
const userModel = mongoose.model("user", UserSchema);

module.exports = userModel;