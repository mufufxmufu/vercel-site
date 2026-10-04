const {sql}=require('../../lib/db');const {requireUser,checkPassword,hashPassword}=require('../../lib/auth');const {postAllowed,fail}=require('../../lib/http');const {validPin,takeAttempt,successfulAttempt,locked}=require('../../lib/pin');
module.exports=async(req,res)=>{
 if(!postAllowed(req,res))return;const uid=requireUser(req,res);if(!uid)return;
 const {currentPassword,newPin}=req.body||{};
 if(typeof currentPassword!=='string'||!currentPassword||currentPassword.length>128||!validPin(newPin))return res.status(400).json({error:'現在のパスワードと、新しい数字4桁の暗証番号を入力してください'});
 try{const q=sql();const rows=await q`SELECT email,password_hash FROM users WHERE id=${uid}`;if(!rows.length)return res.status(401).json({error:'ログインが必要です'});
 const attempt=await takeAttempt(q,rows[0].email);if(!attempt.allowed)return locked(res);
 if(!checkPassword(currentPassword,rows[0].password_hash))return res.status(401).json({error:'現在のパスワードが違います'});
 const updated=await q`UPDATE users SET password_hash=${hashPassword(newPin)} WHERE id=${uid} AND password_hash=${rows[0].password_hash} RETURNING id`;
 if(!updated.length)return res.status(409).json({error:'パスワードが更新されています。現在のパスワードを確認してください'});
 await successfulAttempt(q,attempt.key);return res.json({ok:true});
 }catch(e){return fail(res,e,'暗証番号の変更に失敗しました');}
};
