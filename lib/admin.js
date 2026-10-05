const {requireUser}=require('./auth');
function isAdmin(user){
 if(!user)return false;
 const matches=entry=>entry&&/^\d+$/.test(String(entry.id))&&String(user.id)===String(entry.id)&&typeof entry.email==='string'&&entry.email.length>0&&String(user.email).toLowerCase()===entry.email.toLowerCase();
 if(matches({id:process.env.ADMIN_USER_ID,email:process.env.ADMIN_EMAIL}))return true;
 try{const entries=JSON.parse(process.env.ADMIN_ACCOUNTS||'[]');return Array.isArray(entries)&&entries.some(matches);}catch{return false;}
}
async function requireAdmin(req,res,q){const uid=requireUser(req,res);if(!uid)return null;const rows=await q`SELECT id,name,email,phone FROM users WHERE id=${uid}`;if(!rows.length||!isAdmin(rows[0])){res.status(403).json({error:'管理者のみ利用できます'});return null;}return rows[0];}
module.exports={isAdmin,requireAdmin};
