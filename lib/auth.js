const crypto = require('crypto');
const COOKIE = 'studio136_session';
function secret(){ if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32) throw new Error('AUTH_SECRET is not configured'); return process.env.AUTH_SECRET; }
function b64u(v){ return Buffer.from(v).toString('base64url'); }
function sign(payload){ const body=b64u(JSON.stringify(payload)); const sig=crypto.createHmac('sha256',secret()).update(body).digest('base64url'); return body+'.'+sig; }
function verify(token){ try{ const [body,sig]=String(token||'').split('.'); if(!body||!sig)return null; const expected=crypto.createHmac('sha256',secret()).update(body).digest('base64url'); if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null; const p=JSON.parse(Buffer.from(body,'base64url').toString()); if(!p.exp||p.exp<Date.now())return null; return p; }catch{return null;} }
function setSession(res,userId){ const token=sign({uid:userId,exp:Date.now()+1000*60*60*24*14}); res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`); }
function clearSession(res){ res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function userId(req){ const raw=req.headers.cookie||''; const m=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'=')); return verify(m?.slice(COOKIE.length+1))?.uid||null; }
function requireUser(req,res){ const uid=userId(req); if(!uid){res.statusCode=401;res.json({error:'ログインが必要です'});return null;} return uid; }
function hashPassword(password){ const salt=crypto.randomBytes(16); const hash=crypto.scryptSync(password,salt,64); return salt.toString('base64')+':'+hash.toString('base64'); }
function checkPassword(password,stored){ try{const [s,h]=stored.split(':'); const hash=crypto.scryptSync(password,Buffer.from(s,'base64'),64); return crypto.timingSafeEqual(hash,Buffer.from(h,'base64'));}catch{return false;} }
module.exports={setSession,clearSession,userId,requireUser,hashPassword,checkPassword};
