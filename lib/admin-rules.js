const {validateBooking,formatTime,timeMinutes}=require('./rules');
function monthBounds(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)))return null;const [y,m]=month.split('-').map(Number);if(y<2000||y>2100)return null;return {first:month+'-01',next:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10)};}
function adminRanges(body,now=Date.now()){
 const bounds=monthBounds(body?.month),slots=body?.slots;
 if(!bounds||!['A','B'].includes(body?.room)||!Array.isArray(slots)||!slots.length||slots.length>372)return {error:'月・部屋・時間枠を確認してください'};
 const seen=new Set(),valid=[];
 for(const s of slots){const v=validateBooking({...s,room:body.room,hours:1,termsAccepted:true},now,3);if(v.error)return v;if(s.date.slice(0,7)!==body.month)return {error:'選択した月の時間枠を選んでください'};const key=s.date+'|'+s.start;if(seen.has(key))return {error:'時間枠が重複しています'};seen.add(key);valid.push(v);}
 valid.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));const ranges=[];
 for(const v of valid){const prior=ranges.at(-1);if(prior&&prior.date===v.date&&prior.end===v.start)prior.end=v.end;else ranges.push({...v});}
 return {ranges,price:slots.length*1200};
}
module.exports={monthBounds,adminRanges};
