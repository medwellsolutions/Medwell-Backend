const validator = require('validator');
const isValidated = ({body})=>{
    if(body.password== null || !validator.isStrongPassword(body.password)){
        throw new Error("Password is Invalid");
    }
}
module.exports = isValidated;