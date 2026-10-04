const {sql}=require('../lib/db');
const {requireUser}=require('../lib/auth');
const {postAllowed,fail}=require('../lib/http');
const {validateBooking}=require('../lib/rules');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'対応していない操作です'});}
 if(req.method==='POST'&&!postAllowed(req,res))return;
 const uid=requireUser(req,res);if(!uid)return;
 try{
  const q=sql();
  if(req.method==='GET'){
   const rows=await q`SELECT id,to_char(booking_date,'YYYY-MM-DD') AS booking_date,start_time,end_time,room,status FROM bookings WHERE user_id=${uid} ORDER BY booking_date DESC,start_time DESC`;
   return res.json({bookings:rows});
  }
  const v=validateBooking(req.body);if(v.error)return res.status(400).json({error:v.error});
  // Separate statements are essential: after waiting for the lock, READ COMMITTED
  // takes a new snapshot for the INSERT and sees the previous request's booking.
  const results=await q.transaction([
   q`SELECT pg_advisory_xact_lock(hashtext(${v.room+'|'+v.date}))`,
   q`INSERT INTO bookings(user_id,room,booking_date,start_time,end_time,status)
    SELECT ${uid},${v.room},${v.date}::date,${v.start}::time,${v.end}::time,'pending_payment'
    WHERE EXISTS(SELECT 1 FROM users WHERE id=${uid})
    AND NOT EXISTS(SELECT 1 FROM bookings WHERE booking_date=${v.date}::date AND room=${v.room} AND status::text IN ('pending_payment','confirmed','paid')
     AND start_time-interval '15 minutes'<${v.end}::time+interval '15 minutes'
     AND end_time+interval '15 minutes'>${v.start}::time-interval '15 minutes')
    RETURNING id,to_char(booking_date,'YYYY-MM-DD') AS booking_date,start_time,end_time,room,status`
  ],{isolationLevel:'ReadCommitted'});
  if(!results[1].length)return res.status(409).json({error:'準備・片付け時間を含め、この時間帯は予約できません。別の時間を選択してください'});
  return res.status(201).json({booking:results[1][0],price:v.price});
 }catch(error){if(['23505','23P01'].includes(error.code))return res.status(409).json({error:'この時間帯は予約済みです'});return fail(res,error,'予約処理に失敗しました');}
};
