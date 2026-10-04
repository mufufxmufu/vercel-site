const crypto=require('crypto');
const validPin=value=>typeof value==='string'&&/^[0-9]{4}$/.test(value);
async function takeAttempt(q,email){
 const key=crypto.createHmac('sha256',process.env.AUTH_SECRET).update(String(email).trim().toLowerCase()).digest('hex');
 const rows=await q`INSERT INTO studio136_login_attempts(account_key,attempt_count,window_started_at) VALUES(${key},1,now())
 ON CONFLICT(account_key) DO UPDATE SET attempt_count=CASE WHEN studio136_login_attempts.window_started_at<=now()-interval '15 minutes' THEN 1 ELSE studio136_login_attempts.attempt_count+1 END,
 window_started_at=CASE WHEN studio136_login_attempts.window_started_at<=now()-interval '15 minutes' THEN now() ELSE studio136_login_attempts.window_started_at END RETURNING attempt_count`;
 return {key,allowed:Number(rows[0].attempt_count)<=5};
}
async function successfulAttempt(q,key){await q`UPDATE studio136_login_attempts SET attempt_count=GREATEST(attempt_count-1,0) WHERE account_key=${key}`;}
function locked(res){res.setHeader('Retry-After','900');return res.status(429).json({error:'ログイン試行の上限に達しました。15分後に再度お試しください'});}
module.exports={validPin,takeAttempt,successfulAttempt,locked};
