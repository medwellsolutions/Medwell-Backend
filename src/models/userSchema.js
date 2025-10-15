const mongoose = require('mongoose');
const validator = require('validator');


// const EmailVerifySchema = new mongoose.Schema({
//     otpHash:{
//         type:String
//     },
//     expiresAt:{
//         type:Date
//     },
//     attempts:{
//         type:Number,
//         default:0
//     },
//     resendCount:{
//         type:Number,
//         default:0
//     },
//     lastSentAt:{
//         type:Date
//     }
// },{
//     _id:false
// })
const roles = ["participant", "supplier", "non-profit", "sponsor", "doctor"];
const UserSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        minLength:4,
        maxLength:20
    },
    lastName:{
        type:String,
        required:true,
        maxLength:20
    },
    emailId:{
        type:String,
        maxLength:30,
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
    phone:{
        type:String,
        unique:true,
        required:true,
        minLength:10,
        maxLength:15,
        validate(value){
            if(!validator.isMobilePhone(value,"any")){
                throw new Error('phone number is not valid');
            }
        }
    },
    location:{
        type:String,
        required:true,
        minLength:6,
        maxLength:100
    },
    password:{
        type:String,
        required:true,
        trim:true,
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Password is not Strong enough");
            }
        }
    },
    age:{
        type:Number,
        min:18,
        max:150,
        validate(value){
            if(!Number.isInteger(value)){
                throw new Error('given age value is not an integer');
            }
        }
    },
    gender:{
        type:String,
        validate(value){
            if(value!='male' && value!='female' && value!= 'others'){
                throw new Error('Gender Invalid');
            }
        }
    },
    student:{
        type:Boolean,
        required:true,
    },
    college:{
        type:String,
        maxLength:70
    },
    clubs:{
        type:Boolean
    },
    role:{
        type:String,
        maxLength:15,
        required:true,
        default:'participant',
        validate(value){
            if(!roles.includes(value)){
                throw new Error("Invalid role!");
            }
        }
    },
    status:{
        type:String,
        maxLength:15,
        required:true,
        default:"hold",
        validate(value){
            if(value!='hold' && value !='accepted' && value != 'rejected'){
                throw new Error('status not allowed');
            }
        }
    },
    passwordChangedAt:{
        type:Date //useful to invalidate old JWTs
    }
    // isEmailVerified:{
    //     type:Boolean,
    //     default:false
    // },
    // emailVerification:{
    //     type:EmailVerifySchema,
    //     default:{}
    // }

},
{
    timestamps:true
}
)
const userModel = mongoose.model("user", UserSchema);

module.exports = userModel;