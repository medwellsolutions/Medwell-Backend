const Auth = (req,res,next)=>{
    if(true){
        next();
    }
    res.send("unauthorised user");
}
module.exports = Auth;