const {sql}=require('../lib/db');
const {requireUser}=require('../lib/auth');
const {postAllowed,fail}=require('../lib/http');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(!postAllowed(req,res))return;
 const uid=requireUser(req,res);if(!uid)return;
 const id=String(req.body?.id||'');if(!/^\d+$/.test(id))return res.status(400).json({error:'予約番号が不正です'});
 try{const q=sql();const rows=await q`UPDATE bookings SET status='cancelled' WHERE id=${id} AND user_id=${uid} AND status::text IN ('pending_payment','confirmed','paid') AND (booking_date+start_time-interval '15 minutes') AT TIME ZONE 'Asia/Tokyo'>now() AND EXISTS(SELECT 1 FROM users WHERE id=${uid}) RETURNING id`;
 if(!rows.length)return res.status(409).json({error:'キャンセルできません。ご本人の予約で、準備開始前の予約のみキャンセルできます'});
 return res.json({ok:true,id:rows[0].id});}catch(e){return fail(res,e,'キャンセルできませんでした');}
};
