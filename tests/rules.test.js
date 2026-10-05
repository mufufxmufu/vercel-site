const test=require('node:test');const assert=require('node:assert/strict');
const {validateBooking,conflicts}=require('../lib/rules');
const auth=require('../lib/auth');
const now=Date.parse('2026-10-04T15:00:00+09:00');
const valid={date:'2026-10-05',room:'A',start:'09:00',termsAccepted:true};
test('booking includes a full hour and validates opening/closing buffers',()=>{
 assert.equal(validateBooking(valid,now).end,'10:00');
 assert.equal(validateBooking({...valid,start:'19:30'},now).end,'20:30');
 for(const start of ['09:15','08:00','20:00','21:00','10:45','bad'])assert.ok(validateBooking({...valid,start},now).error);
});
test('reject invalid calendar dates, past preparation, missing consent and too-far date',()=>{
 for(const body of [{...valid,date:'2026-02-30'},{...valid,date:'2026-10-04',start:'14:00'},{...valid,termsAccepted:false},{...valid,date:'2027-01-01'},{...valid,room:'C'}])assert.ok(validateBooking(body,now).error);
});
test('90-minute blocks allow adjacent reservations while retaining buffers',()=>{
 const existing={start:'09:00',end:'10:00'};
 assert.equal(conflicts(existing,{start:'10:00',end:'11:00'}),true);
 assert.equal(conflicts(existing,{start:'10:30',end:'11:30'}),false);
 assert.equal(conflicts(existing,{start:'09:00',end:'10:00'}),true);
});
test('signed sessions accept valid cookie and reject tampering',()=>{
 process.env.AUTH_SECRET='a'.repeat(64);let cookie;
 auth.setSession({setHeader:(key,value)=>{cookie=value}},'123');
 assert.equal(auth.userId({headers:{cookie}}),'123');
 assert.equal(auth.userId({headers:{cookie:cookie.replace('studio136_session=','studio136_session=x')}}),null);
 assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('Secure'));
});
test('passwords are salted and verify without exposing plaintext',()=>{
 const first=auth.hashPassword('password123'),second=auth.hashPassword('password123');
 assert.notEqual(first,second);assert.ok(auth.checkPassword('password123',first));assert.equal(auth.checkPassword('wrong',first),false);
});
test('booking API refuses anonymous and cross-site writes before database access',async()=>{
 const handler=require('../api/bookings');const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(v){this.body=v;return this;}});
 let res=response();await handler({method:'POST',headers:{'content-type':'application/json',host:'studio.test'},body:valid},res);assert.equal(res.statusCode,401);assert.equal(res.body.error,'ログインが必要です');
 res=response();await handler({method:'POST',headers:{'content-type':'application/json',host:'studio.test',origin:'https://other.test'},body:valid},res);assert.equal(res.code,403);
});


test('all eight 90-minute blocks are available back to back for either room',()=>{for(const room of ['A','B']){const frames=validateBooking({...valid,room,hours:8},now).ranges;assert.equal(frames.length,8);assert.equal(frames.at(-1).end,'20:30');for(let i=1;i<frames.length;i++){assert.equal(conflicts(frames[i-1],frames[i]),false);assert.equal(conflicts(frames[i],frames[i-1]),false);}assert.ok(validateBooking({...valid,room,hours:9},now).error);}});
