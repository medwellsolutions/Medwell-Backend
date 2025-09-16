 const jwt = require('jsonwebtoken');
const auth = (req,res,next)=>{
    const token = req.cookies?.token;
    if(!token){
         return res.status(401).send("Invalid token")
    }
    try{
        req.user = jwt.verify(token,"Medwell123@");
        next();
    }catch(err){
        res.send(err.message);
    }
    
}
const isAuthorized = (role)=>{
    return (req, res, next)=>{
        if(!req.user){
            res.status(401).send("Unauthorized");
        }
        if(req.user?.role!=role){
            return res.status(403).send("Forbidden");
        }
        next();
    }
} 
module.exports = {auth,isAuthorized};