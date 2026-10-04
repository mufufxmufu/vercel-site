const {clearSession}=require('../../lib/auth');const {postAllowed}=require('../../lib/http');
module.exports=(req,res)=>{if(!postAllowed(req,res))return;clearSession(res);return res.json({ok:true});};
