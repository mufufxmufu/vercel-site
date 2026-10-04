const {sql}=require('../lib/db');
const {fail}=require('../lib/http');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GETのみです'});}
 const {date,room}=req.query||{};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||!['A','B'].includes(room))return res.status(400).json({error:'日付または部屋が不正です'});
 try{const q=sql();const rows=await q`SELECT start_time,end_time FROM bookings WHERE booking_date=${date}::date AND room=${room} AND status::text IN ('pending_payment','confirmed','paid')`;
 return res.json({booked:rows.map(r=>({start:String(r.start_time).slice(0,5),end:String(r.end_time).slice(0,5)}))});}
 catch(error){return fail(res,error,'空き状況を取得できませんでした');}
};
