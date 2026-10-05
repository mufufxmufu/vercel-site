const {sql}=require('../lib/db');
const {isAdmin}=require('../lib/admin');
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
  const members=await q`SELECT id,email FROM users WHERE id=${uid}`;
  if(!members.length)return res.status(401).json({error:'ログインし直してください'});
  const v=validateBooking(req.body,Date.now(),isAdmin(members[0])?3:1);if(v.error)return res.status(400).json({error:v.error});
  // Separate statements are essential: after waiting for the lock, READ COMMITTED
  // takes a new snapshot for the INSERT and sees the previous request's booking.
  const results=await q.transaction([
   q`SELECT pg_advisory_xact_lock(hashtext(${v.room+'|'+v.date}))`,
   q`INSERT INTO bookings(user_id,room,booking_date,start_time,end_time,status)
    SELECT ${uid},${v.room},${v.date}::date,x.start::time,x.finish::time,'pending_payment'
    FROM jsonb_to_recordset(${JSON.stringify(v.ranges.map(r=>({start:r.start,finish:r.end})))}::jsonb) AS x(start text,finish text)
    WHERE EXISTS(SELECT 1 FROM users WHERE id=${uid})
    AND NOT EXISTS(SELECT 1 FROM bookings WHERE booking_date=${v.date}::date AND room=${v.room} AND status::text IN ('pending_payment','confirmed','paid')
     AND EXISTS(SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(v.ranges.map(r=>({start:r.start,finish:r.end})))}::jsonb) AS frame(start text,finish text)
      WHERE start_time-interval '15 minutes'<LEAST(frame.finish::time+interval '15 minutes','22:00'::time)
      AND LEAST(end_time+interval '15 minutes','22:00'::time)>frame.start::time-interval '15 minutes'))
    RETURNING id,to_char(booking_date,'YYYY-MM-DD') AS booking_date,start_time,end_time,room,status`
  ],{isolationLevel:'ReadCommitted'});
  if(!results[1].length)return res.status(409).json({error:'準備・片付け時間を含め、この時間帯は予約できません。別の時間を選択してください'});
  return res.status(201).json({booking:results[1][0],bookings:results[1],price:v.price});
 }catch(error){if(['23505','23P01'].includes(error.code))return res.status(409).json({error:'この時間帯は予約済みです'});return fail(res,error,'予約処理に失敗しました');}
};

