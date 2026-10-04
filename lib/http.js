function postAllowed(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).json({error:'この操作はPOSTのみです'});return false;}
 if(!String(req.headers['content-type']||'').startsWith('application/json')){res.status(415).json({error:'送信形式が不正です'});return false;}
 const origin=req.headers.origin;
 if(origin){let host;try{host=new URL(origin).host;}catch{}if(host!==req.headers.host){res.status(403).json({error:'送信元が不正です'});return false;}}
 if(req.headers['sec-fetch-site']==='cross-site'){res.status(403).json({error:'送信元が不正です'});return false;}
 return true;
}
function fail(res,error,message){console.error('Studio API failure',{code:error.code,message:error.message});return res.status(503).json({error:message+'。時間をおいて再度お試しください'});}
module.exports={postAllowed,fail};
