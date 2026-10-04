const {requireUser}=require('../../lib/auth');
const {sql}=require('../../lib/db');const {requireAdmin}=require('../../lib/admin');const {postAllowed,fail}=require('../../lib/http');const {monthBounds,adminRanges}=require('../../lib/admin-rules');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'対応していない操作です'});if(req.method==='POST'&&!postAllowed(req,res))return;if(!requireUser(req,res))return;
 try{const q=sql(),admin=await requireAdmin(req,res,q);if(!admin)return;
 if(req.method==='GET'){const b=monthBounds(req.query?.month);if(!b)return res.status(400).json({error:'月が不正です'});const bookings=await q`SELECT b.id,b.room,to_char(b.booking_date,'YYYY-MM-DD') AS booking_date,b.start_time,b.end_time,b.status,u.id AS user_id,u.name,u.email,u.phone FROM bookings b JOIN users u ON b.user_id=u.id WHERE b.booking_date>=${b.first}::date AND b.booking_date<${b.next}::date ORDER BY b.booking_date,b.start_time,b.room`;const users=await q`SELECT id,name,email,phone FROM users ORDER BY name,id`;return res.json({bookings,users});}
 if(req.body?.action==='cancel'){const ids=req.body.ids;if(!Array.isArray(ids)||!ids.length||ids.length>372||!ids.every(x=>/^\d+$/.test(String(x))))return res.status(400).json({error:'予約番号が不正です'});
 const results=await q.transaction(ids.map(id=>q`UPDATE bookings SET status='cancelled' WHERE id=${String(id)} AND status::text IN ('pending_payment','confirmed','paid') RETURNING id`));return res.json({ok:true,cancelled:results.flat().map(x=>x.id)});}
 const v=adminRanges(req.body);if(v.error)return res.status(400).json({error:v.error});const userId=String(req.body.userId||admin.id);if(!/^\d+$/.test(userId))return res.status(400).json({error:'会員を選択してください'});
 // Locks are acquired in date order. Inserts share one transaction; the exclusion
 // constraint aborts the entire batch if any range conflicts, including concurrent writes.
 const locks=[...new Set(v.ranges.map(x=>x.room+'|'+x.date))].sort().map(key=>q`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
 const inserts=v.ranges.map(x=>q`INSERT INTO bookings(user_id,room,booking_date,start_time,end_time,status) VALUES(${userId},${x.room},${x.date}::date,${x.start}::time,${x.end}::time,'pending_payment') RETURNING id`);
 const results=await q.transaction([...locks,...inserts],{isolationLevel:'ReadCommitted'});return res.status(201).json({ok:true,bookings:results.slice(locks.length).flat(),price:v.price});
 }catch(e){if(['23505','23P01'].includes(e.code))return res.status(409).json({error:'選択した時間帯に予約・準備・片付け時間が重なっています。予約は一件も追加していません。更新して選び直してください'});if(e.code==='23503')return res.status(400).json({error:'選択した会員が見つかりません'});return fail(res,e,'管理者の予約処理に失敗しました');}
};
