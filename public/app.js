'use strict';
const $=id=>document.getElementById(id);
const roomNames={A:'136スタジオ',B:'136パーソナルトレーニングスペース'};
const paypayURL={A:'https://qr.paypay.ne.jp/28180105pFKugJcXRiFHWQGk',B:'https://qr.paypay.ne.jp/28180105Kemx3d5r910Tbx3c'};
let currentUser=null,room='A',selected=null,selectedHours=1,busy=false,slotRequest=0,slotsReady=false,booked=[];
function bookingDeadline(date,months){const [y,m,d]=date.split('-').map(Number),first=new Date(Date.UTC(y,m-1+months,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d,last));return first.toISOString().slice(0,10);}
const japanDate=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
const time=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,options={}){
 const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})},credentials:'same-origin',cache:'no-store'});
 let d;try{d=await r.json();}catch{throw new Error('予約サービスの応答が不正です。再度お試しください');}
 if(!r.ok){const error=new Error(d.error||'通信に失敗しました');error.status=r.status;throw error;}return d;
}
function show(id){if(id==='mypage'&&!currentUser){id='home';authTab('login');}document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(id).classList.remove('hidden');if(id==='mypage')renderMy();}
function authTab(t){$('loginBox').classList.toggle('hidden',t!=='login');$('regBox').classList.toggle('hidden',t!=='reg');$('tabLogin').classList.toggle('on',t==='login');$('tabReg').classList.toggle('on',t==='reg');}
async function register(){if(busy)return;if(!/^[0-9]{4}$/.test($('rpass').value)){$('rmsg').textContent='暗証番号は半角数字4桁で入力してください';return;}busy=true;$('rmsg').textContent='登録中…';try{const d=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:$('rname').value.trim(),email:$('remail').value.trim(),password:$('rpass').value,phone:$('rphone').value.trim()})});currentUser=d.user;$('rpass').value='';$('rmsg').textContent='';await init();}catch(e){$('rmsg').textContent=e.message;}finally{busy=false;$('reserveButton').disabled=!slotsReady;}}
async function login(){if(busy)return;busy=true;$('lmsg').textContent='ログイン中…';try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('lemail').value.trim(),password:$('lpass').value})});currentUser=d.user;$('lpass').value='';$('lmsg').textContent='';await init();}catch(e){$('lmsg').textContent=e.message;}finally{busy=false;$('reserveButton').disabled=!slotsReady;}}
async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'});currentUser=null;resetSelection();await init();show('home');}catch(e){alert(e.message);}}
async function init(){
 const today=japanDate();$('date').min=today;$('date').max=bookingDeadline(today,currentUser?.isAdmin?3:1);$('date').value=$('date').value||today;
 $('booking').classList.remove('hidden');const availability=renderSlots();
 try{const d=await api('/api/me');currentUser=d.user;$('loginNotice').innerHTML='<div class="ok">ログイン中：'+escapeHtml(currentUser.name)+' さん</div>';$('booking').classList.remove('hidden');$('auth').classList.add('hidden');}
 catch(e){currentUser=null;$('loginNotice').innerHTML=e.status===401?'<h2>ご利用には会員登録が必要です</h2><p class="small">空き状況は下で確認できます。予約にはログインまたは会員登録が必要です。</p>':'<p role="alert">'+escapeHtml(e.message)+'</p>';$('auth').classList.remove('hidden');}
 $('date').max=bookingDeadline(today,currentUser?.isAdmin?3:1);if($('date').value>$('date').max){$('date').value=$('date').max;resetSelection();await renderSlots();}
 $('termsConsent').classList.toggle('hidden',!currentUser);$('reserveButton').textContent=currentUser?'予約内容を確認する':'ログインして予約する';await availability;
}
function resetSelection(){selected=null;selectedHours=1;$('selected').classList.add('hidden');$('termsAgree').checked=false;}
function changeDate(){resetSelection();renderSlots();}
function pickRoom(r){room=r;resetSelection();$('roomA').classList.toggle('sel',r==='A');$('roomB').classList.toggle('sel',r==='B');renderSlots();}
function unavailable(s,d){if(d<japanDate()||d>bookingDeadline(japanDate(),currentUser?.isAdmin?3:1))return true;const m=minutes(s);if(Date.parse(d+'T'+time(m-15)+':00+09:00')<=Date.now())return true;return booked.some(b=>m-15<minutes(b.end)+15&&m+75>minutes(b.start)-15);}
async function renderSlots(){
 const d=$('date').value,r=room,request=++slotRequest;if(!d)return;
 slotsReady=false;$('reserveButton').disabled=true;$('slots').textContent='予約状況を読み込んでいます…';
 try{const data=await api('/api/slots?date='+encodeURIComponent(d)+'&room='+r);if(request!==slotRequest)return;booked=data.booked;if(selected&&rangeUnavailable(selected,selectedHours,d))resetSelection();
 $('slots').replaceChildren();for(let h=9;h<=20;h++){const s=time(h*60+15),disabled=unavailable(s,d),button=document.createElement('button');button.type='button';button.dataset.start=s;button.className='slot'+(disabled?' busy':'')+(selected===s?' sel':'');button.disabled=disabled;button.innerHTML=s+'〜'+time(h*60+75)+'<br><span class="small">'+(disabled?'予約不可':'空き')+'</span>';button.onclick=()=>pickSlot(s);$('slots').appendChild(button);}updateSelected();renderSlotButtons();slotsReady=true;$('reserveButton').disabled=busy;
 }catch(e){if(request!==slotRequest)return;resetSelection();$('slots').textContent=e.message;$('reserveButton').disabled=true;}
}
function updateSelected(){if(!selected)return;const m=minutes(selected),end=m+selectedHours*60;$('selected').classList.remove('hidden');$('selected').innerHTML='<b>'+roomNames[room]+'</b><br>'+$('date').value+'　'+selected+'〜'+time(end)+'（'+selectedHours+'時間）<br>準備：'+time(m-15)+'〜'+selected+'／片付け：'+time(end)+'〜'+time(end+15)+'<br><b>'+ (selectedHours*1200).toLocaleString()+'円</b>';}
function rangeUnavailable(start,hours,d){const m=minutes(start),end=m+hours*60;return d<japanDate()||d>bookingDeadline(japanDate(),currentUser?.isAdmin?3:1)||end+15>21*60+30||Date.parse(d+'T'+time(m-15)+':00+09:00')<=Date.now()||booked.some(b=>m-15<minutes(b.end)+15&&end+15>minutes(b.start)-15);}
function pickSlot(s){if(busy)return;if(!selected){if(unavailable(s,$('date').value))return;selected=s;selectedHours=1;}else{const a=Math.min(minutes(selected),minutes(s)),end=Math.max(minutes(selected)+selectedHours*60,minutes(s)+60),hours=(end-a)/60;if(rangeUnavailable(time(a),hours,$('date').value)){alert('選んだ範囲に予約・準備・片付け時間が重なっています。');return;}if(selected===s&&selectedHours===1){resetSelection();renderSlots();return;}selected=time(a);selectedHours=hours;}updateSelected();renderSlotButtons();}
function renderSlotButtons(){document.querySelectorAll('.slot').forEach(b=>{const s=b.dataset.start,m=minutes(s),inRange=selected&&m>=minutes(selected)&&m<minutes(selected)+selectedHours*60;b.classList.toggle('sel',!!inRange);if(selected){const a=Math.min(minutes(selected),m),end=Math.max(minutes(selected)+selectedHours*60,m+60);b.disabled=rangeUnavailable(time(a),(end-a)/60,$('date').value);}else b.disabled=unavailable(s,$('date').value);});}
function clearRange(){resetSelection();renderSlots();}
function openTerms(e){e?.preventDefault();$('termsModal').classList.remove('hidden');}
function closeTerms(){$('termsModal').classList.add('hidden');}
async function reserve(){
 if(busy)return;if(!currentUser){show('home');authTab('login');$('lmsg').textContent='予約にはログインまたは新規会員登録が必要です。';$('auth').scrollIntoView({behavior:'smooth',block:'start'});return;}if(!selected){alert('予約時間を選択してください');return;}if(!$('termsAgree').checked){alert('利用規約を確認して同意してください');openTerms();return;}
 const request={date:$('date').value,room,start:selected,hours:selectedHours,termsAccepted:true},m=minutes(selected),duration=selectedHours*60,price=selectedHours*1200;
 if(!confirm(roomNames[room]+'\n'+request.date+'　'+selected+'〜'+time(m+duration)+'\n料金：'+price.toLocaleString()+'円\n\nこの内容で予約を登録しますか？'))return;
 busy=true;$('reserveButton').disabled=true;$('reserveButton').textContent='予約を登録しています…';
 try{const data=await api('/api/bookings',{method:'POST',body:JSON.stringify(request)});if(!data.booking?.id)throw new Error('予約番号を確認できませんでした。マイページで予約履歴を確認してください');
  $('paypaySummary').innerHTML='<b>予約登録完了</b><br>予約番号：'+escapeHtml(data.booking.id)+'<br>'+roomNames[request.room]+'<br>'+request.date+'　'+request.start+'〜'+time(m+duration)+'<br><b>'+price.toLocaleString()+'円（PayPay支払い待ち）</b>';
  $('paymentAmount').textContent=price.toLocaleString()+'円';$('paymentInput').textContent=price.toLocaleString()+'円';$('paymentNotice').textContent='予約を登録しました。選んだ部屋のQRコードから'+price.toLocaleString()+'円をお支払いください。決済状況は自動確認されません。';$('paypayQRImg').src='/assets/paypay-'+request.room+'.png';$('paypayQRImg').alt=roomNames[request.room]+' PayPay QRコード';$('paypayLink').href=paypayURL[request.room];$('paypayInstruction').textContent='※'+roomNames[request.room]+'の支払い先です。支払い状況は運営者が確認します。';$('paypayModal').classList.remove('hidden');resetSelection();
 }catch(e){alert(e.message);if(e.status===401)await init();}
 finally{busy=false;$('reserveButton').textContent='予約内容を確認する';await renderSlots();if(currentUser)await renderMy();}
}
function closePaypay(){$('paypayModal').classList.add('hidden');}
function completePayment(){closePaypay();show('mypage');}
async function renderMy(){if(!currentUser)return;$('member').innerHTML='<b>'+escapeHtml(currentUser.name)+'</b><br>'+escapeHtml(currentUser.email)+'<br>'+escapeHtml(currentUser.phone);try{const d=await api('/api/bookings');$('history').innerHTML=d.bookings.length?d.bookings.map(b=>'<div class="history">予約番号：'+escapeHtml(b.id)+'<br><b>'+escapeHtml(b.booking_date)+'</b><br>'+escapeHtml(roomNames[b.room]||b.room)+'<br>'+escapeHtml(String(b.start_time).slice(0,5))+'〜'+escapeHtml(String(b.end_time).slice(0,5))+'　'+((minutes(String(b.end_time))-minutes(String(b.start_time)))/60*1200).toLocaleString()+'円<br><span class="small">'+escapeHtml(b.status==='pending_payment'?'予約登録済み・PayPay支払い待ち':b.status==='confirmed'?'支払い確認済み':b.status==='cancelled'?'キャンセル済み':b.status)+'</span>'+(['pending_payment','confirmed','paid'].includes(b.status)&&Date.parse(b.booking_date+'T'+String(b.start_time).slice(0,5)+':00+09:00')-15*60000>Date.now()?'<br><button type="button" onclick="cancelMyBooking('+escapeHtml(b.id)+')">この予約をキャンセル</button>':'')+'</div>').join(''):'予約はありません。';}catch(e){$('history').textContent=e.message;}}
$('roomA').classList.add('sel');init();
setInterval(()=>{if(!busy&&!document.hidden)renderSlots();},30000);

async function changePin(){const pin=$('newPin').value;if(!/^[0-9]{4}$/.test(pin)){$('pinMessage').textContent='新しい暗証番号は半角数字4桁で入力してください';return;}$('pinButton').disabled=true;try{await api('/api/auth/pin',{method:'POST',body:JSON.stringify({currentPassword:$('currentPassword').value,newPin:pin})});$('currentPassword').value='';$('newPin').value='';$('pinMessage').textContent='暗証番号を変更しました。次回から数字4桁でログインできます。';}catch(e){$('pinMessage').textContent=e.message;}finally{$('pinButton').disabled=false;}}

async function cancelMyBooking(id){if(busy||!confirm('この予約をキャンセルしますか？支払い済みの場合、返金は運営者への確認が必要です。'))return;busy=true;try{await api('/api/cancel',{method:'POST',body:JSON.stringify({id})});await renderMy();await renderSlots();}catch(e){alert(e.message);}finally{busy=false;$('reserveButton').disabled=!slotsReady;}}
