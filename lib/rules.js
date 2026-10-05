const OPEN=9*60,CLOSE=22*60,BUFFER=15,DURATION=60,STEP=120;
function timeMinutes(value){if(!/^\d{2}:\d{2}$/.test(String(value)))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;}
function formatTime(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function bookingDeadline(date,months){const [y,m,d]=date.split('-').map(Number),first=new Date(Date.UTC(y,m-1+months,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d,last));return first.toISOString().slice(0,10);}
function validateBooking(body,now=Date.now(),months=1){
 const {date,room,start,termsAccepted}=body||{};
 const hours=body?.hours??1;if(!Number.isInteger(hours)||hours<1||hours>7)return {error:'予約枠は1〜7枠で選択してください'};const duration=(hours-1)*STEP+DURATION;
 if(termsAccepted!==true)return {error:'利用規約への同意が必要です'};
 if(!['A','B'].includes(room)||!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))return {error:'日付または部屋が不正です'};
 const midnight=Date.parse(date+'T00:00:00+09:00');
 if(!Number.isFinite(midnight)||new Date(midnight+9*3600000).toISOString().slice(0,10)!==date)return {error:'日付が不正です'};
 const m=timeMinutes(start);
 if(!Number.isFinite(m)||(m-OPEN)%STEP!==0||m<OPEN||m+duration>CLOSE)return {error:'予約可能時間外です'};
 const preparation=midnight+(m-BUFFER)*60000;
 if(preparation<=now)return {error:'準備開始時刻を過ぎた時間は予約できません'};
 const today=new Date(now+9*3600000).toISOString().slice(0,10);
 const max=bookingDeadline(today,months);
 if(date>max)return {error:`予約は${months}カ月先までです`};
 const ranges=[{date,room,start,end:formatTime(m+duration)}];
 return {date,room,start,end:formatTime(m+duration),hours,price:duration/60*1200,ranges};
}
function exitMinutes(end){return Math.min(timeMinutes(end)+BUFFER,CLOSE);}
function conflicts(a,b){return timeMinutes(a.start)-BUFFER<exitMinutes(b.end)&&exitMinutes(a.end)>timeMinutes(b.start)-BUFFER;}
module.exports={bookingDeadline,validateBooking,timeMinutes,formatTime,exitMinutes,conflicts};

