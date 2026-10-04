const OPEN=9*60,CLOSE=21*60+30,BUFFER=15,DURATION=60;
function timeMinutes(value){if(!/^\d{2}:\d{2}$/.test(String(value)))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;}
function formatTime(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function validateBooking(body,now=Date.now()){
 const {date,room,start,termsAccepted}=body||{};
 if(termsAccepted!==true)return {error:'利用規約への同意が必要です'};
 if(!['A','B'].includes(room)||!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))return {error:'日付または部屋が不正です'};
 const midnight=Date.parse(date+'T00:00:00+09:00');
 if(!Number.isFinite(midnight)||new Date(midnight+9*3600000).toISOString().slice(0,10)!==date)return {error:'日付が不正です'};
 const m=timeMinutes(start);
 if(!Number.isFinite(m)||m%60!==15||m-BUFFER<OPEN||m+DURATION+BUFFER>CLOSE)return {error:'予約可能時間外です'};
 const preparation=midnight+(m-BUFFER)*60000;
 if(preparation<=now)return {error:'準備開始時刻を過ぎた時間は予約できません'};
 const today=new Date(now+9*3600000).toISOString().slice(0,10);
 const max=new Date(Date.parse(today+'T00:00:00Z')+60*86400000).toISOString().slice(0,10);
 if(date>max)return {error:'予約は60日先までです'};
 return {date,room,start,end:formatTime(m+DURATION)};
}
function conflicts(a,b){return timeMinutes(a.start)-BUFFER<timeMinutes(b.end)+BUFFER&&timeMinutes(a.end)+BUFFER>timeMinutes(b.start)-BUFFER;}
module.exports={validateBooking,timeMinutes,formatTime,conflicts};
