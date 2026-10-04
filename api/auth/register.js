const {validPin}=require('../../lib/pin');
const {sql}=require('../../lib/db');const {setSession,hashPassword}=require('../../lib/auth');const {postAllowed,fail}=require('../../lib/http');
module.exports=async(req,res)=>{
 if(!postAllowed(req,res))return;
 if(!process.env.AUTH_SECRET)return res.status(503).json({error:'ログイン設定が未完了です'});
 const {name,email,password,phone}=req.body||{};const e=String(email||'').trim().toLowerCase(),n=String(name||'').trim(),p=String(password||'');
 if(!n||n.length>100||!/^\S+@\S+\.\S+$/.test(e)||e.length>254||!validPin(password)||String(phone||'').length>40)return res.status(400).json({error:'氏名・メールアドレスを確認し、暗証番号は数字4桁で入力してください'});
 try{const q=sql();const rows=await q`INSERT INTO users(name,email,password_hash,phone) VALUES(${n},${e},${hashPassword(p)},${String(phone||'').trim()||null}) RETURNING id,name,email,phone`;setSession(res,rows[0].id);return res.status(201).json({user:rows[0]});}
 catch(error){if(error.code==='23505')return res.status(409).json({error:'このメールアドレスは登録済みです。ログインしてください'});return fail(res,error,'会員登録に失敗しました');}
};
