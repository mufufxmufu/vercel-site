const {requireUser}=require('./auth');
function isAdmin(user){return !!process.env.ADMIN_USER_ID && String(user.id)===String(process.env.ADMIN_USER_ID) && String(user.email).toLowerCase()===String(process.env.ADMIN_EMAIL||'').toLowerCase();}
async function requireAdmin(req,res,q){const uid=requireUser(req,res);if(!uid)return null;const rows=await q`SELECT id,name,email,phone FROM users WHERE id=${uid}`;if(!rows.length||!isAdmin(rows[0])){res.status(403).json({error:'管理者のみ利用できます'});return null;}return rows[0];}
module.exports={isAdmin,requireAdmin};
