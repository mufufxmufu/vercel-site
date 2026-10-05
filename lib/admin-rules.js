const {validateBooking,formatTime,timeMinutes}=require('./rules');
function monthBounds(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)))return null;const [y,m]=month.split('-').map(Number);if(y<2000||y>2100)return null;return {first:month+'-01',next:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10)};}
function adminRanges(body,now=Date.now()){
 const bounds=monthBounds(body?.month),slots=body?.slots;
 if(!bounds||!['A','B'].includes(body?.room)||!Array.isArray(slots)||!slots.length||slots.length>372)return {error:'月・部屋・時間枠を確認してください'};
 const seen=new Set(),valid=[];
 for(const s of slots){const v=validateBooking({...s,room:body.room,hours:1,termsAccepted:true},now,3);if(v.error)return v;if(s.date.slice(0,7)!==body.month)return {error:'選択した月の時間枠を選んでください'};const key=s.date+'|'+s.start;if(seen.has(key))return {error:'時間枠が重複しています'};seen.add(key);valid.push(v);}
 valid.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));const ranges=[];
 for(const {ranges:unused,...v} of valid){const previous=ranges.at(-1);if(previous&&previous.date===v.date&&timeMinutes(v.start)===timeMinutes(previous.end)+60){previous.end=v.end;previous.hours+=1;previous.price=(timeMinutes(previous.end)-timeMinutes(previous.start))/60*1200;}else ranges.push({...v});}
 return {ranges,price:ranges.reduce((sum,r)=>sum+r.price,0)};
}
module.exports={monthBounds,adminRanges};

