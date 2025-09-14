const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
        trim:true
    },
    password:{
        type:String,
        required:true,
        minLength:true,
        trim:true
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
},
{
    timestamps:true
}
)

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;