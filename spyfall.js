import { randomInt } from 'node:crypto';
export const locations=[
 ['space','Space Station','สถานีอวกาศ',['Commander','Engineer','Astronaut'],['ผู้บัญชาการ','วิศวกร','นักบินอวกาศ']],
 ['pirate','Pirate Ship','เรือโจรสลัด',['Captain','Cook','Lookout'],['กัปตัน','พ่อครัว','คนเฝ้ายาม']],
 ['hospital','Hospital','โรงพยาบาล',['Doctor','Nurse','Patient'],['หมอ','พยาบาล','ผู้ป่วย']],
 ['school','School','โรงเรียน',['Teacher','Student','Librarian'],['ครู','นักเรียน','บรรณารักษ์']],
 ['beach','Beach','ชายหาด',['Lifeguard','Surfer','Tourist'],['ไลฟ์การ์ด','นักโต้คลื่น','นักท่องเที่ยว']],
 ['casino','Casino','คาสิโน',['Dealer','Guard','Guest'],['เจ้ามือ','เจ้าหน้าที่รักษาความปลอดภัย','แขก']],
 ['circus','Circus','คณะละครสัตว์',['Acrobat','Clown','Trainer'],['นักกายกรรม','ตัวตลก','ครูฝึก']],
 ['base','Military Base','ค่ายทหาร',['Commander','Soldier','Medic'],['ผู้บังคับบัญชา','ทหาร','แพทย์ทหาร']],
 ['hotel','Hotel','โรงแรม',['Receptionist','Guest','Porter'],['พนักงานต้อนรับ','แขก','พนักงานยกกระเป๋า']],
 ['train','Train','รถไฟ',['Driver','Conductor','Passenger'],['คนขับ','พนักงานตรวจตั๋ว','ผู้โดยสาร']],
 ['submarine','Submarine','เรือดำน้ำ',['Captain','Navigator','Engineer'],['กัปตัน','ต้นหน','วิศวกร']],
 ['restaurant','Restaurant','ร้านอาหาร',['Chef','Waiter','Customer'],['เชฟ','พนักงานเสิร์ฟ','ลูกค้า']],
 ['zoo','Zoo','สวนสัตว์',['Keeper','Vet','Visitor'],['ผู้ดูแลสัตว์','สัตวแพทย์','ผู้มาเที่ยว']],
 ['airport','Airport','สนามบิน',['Pilot','Security','Passenger'],['นักบิน','เจ้าหน้าที่รักษาความปลอดภัย','ผู้โดยสาร']],
 ['theater','Theater','โรงละคร',['Actor','Director','Audience'],['นักแสดง','ผู้กำกับ','ผู้ชม']],
 ['bank','Bank','ธนาคาร',['Teller','Manager','Customer'],['พนักงาน','ผู้จัดการ','ลูกค้า']],
 ['farm','Farm','ฟาร์ม',['Farmer','Vet','Worker'],['ชาวนา','สัตวแพทย์','คนงาน']],
 ['museum','Museum','พิพิธภัณฑ์',['Guide','Curator','Visitor'],['ไกด์','ภัณฑารักษ์','ผู้เข้าชม']],
 ['mountain','Mountain Camp','แคมป์บนภูเขา',['Guide','Hiker','Ranger'],['ไกด์','นักเดินป่า','เจ้าหน้าที่ป่าไม้']],
 ['factory','Factory','โรงงาน',['Engineer','Supervisor','Worker'],['วิศวกร','หัวหน้างาน','คนงาน']],
 ['library','Library','ห้องสมุด',['Librarian','Student','Reader'],['บรรณารักษ์','นักเรียน','ผู้อ่าน']],
 ['wedding','Wedding','งานแต่งงาน',['Photographer','Guest','Musician'],['ช่างภาพ','แขก','นักดนตรี']],
 ['stadium','Stadium','สนามกีฬา',['Athlete','Coach','Fan'],['นักกีฬา','โค้ช','แฟนกีฬา']],
 ['bakery','Bakery','ร้านเบเกอรี่',['Baker','Cashier','Customer'],['คนทำขนม','พนักงานคิดเงิน','ลูกค้า']]
].map(([id,en,th,enRoles,thRoles])=>({id,en,th,roles:{en:enRoles,th:thRoles}}));
export function create(players,settings,now=Date.now()) {
 const location=locations[randomInt(locations.length)],spy=players[randomInt(players.length)].id;
 return {type:'spyfall',players:players.map((p,i)=>({...p,role:p.id===spy?'spy':i%3,alive:true})),spy,location,phase:'questions',deadline:now+480000,turn:players[0].id,question:null,accusation:null,cooldowns:{},winner:null,event:{key:'spyStart',args:{}}};
}
function end(g,winner,key) {g.winner=winner;g.phase='ended';g.deadline=0;g.event={key,args:{}};}
export function act(g,id,action,target,now=Date.now()) {
 if(g.winner)throw new Error('ended');
 if(!g.players.some(p=>p.id===id))throw new Error('invalidAction');
 if(action==='guess') {if(id!==g.spy)throw new Error('invalidAction');if(!locations.some(l=>l.id===target))throw new Error('invalidTarget');end(g,target===g.location.id?'spy':'agents',target===g.location.id?'spyWin':'agentsWin');return;}
 if(action==='accuse') {
   if(g.accusation||(g.cooldowns[id]||0)>now)throw new Error('cooldown');
   if(id===target||!g.players.some(p=>p.id===target))throw new Error('invalidTarget');
   g.accusation={target,by:id,votes:{[id]:true},deadline:now+30000};g.cooldowns[id]=now+60000;return;
 }
 if(action==='verdict') {
   if(!g.accusation||typeof target!=='boolean')throw new Error('invalidAction');
   g.accusation.votes[id]=target;resolveAccusation(g);return;
 }
 if(action==='question') {
   if(g.turn!==id||g.question)throw new Error('wrongTurn');
   if(!target||typeof target.text!=='string'||!target.text.trim()||target.to===id||!g.players.some(p=>p.id===target.to))throw new Error('invalidTarget');
   g.question={from:id,to:target.to,text:target.text.trim().slice(0,250)};return;
 }
 if(action==='answer') {if(!g.question||g.question.to!==id)throw new Error('wrongTurn');g.turn=id;g.question=null;return;}
 throw new Error('invalidAction');
}
function resolveAccusation(g) {
 const a=g.accusation;if(!a)return;
 const yes=Object.values(a.votes).filter(Boolean).length;
 if(yes>g.players.length/2) end(g,a.target===g.spy?'agents':'spy',a.target===g.spy?'agentsWin':'spyWin');
 else if(Object.keys(a.votes).length===g.players.length)g.accusation=null;
}
export function advance(g,now=Date.now()) {
 if(g.winner)return false;
 if(now>=g.deadline){end(g,'spy','spyWin');return true;}
 if(g.accusation&&now>=g.accusation.deadline){resolveAccusation(g);if(!g.winner)g.accusation=null;return true;}
 return false;
}
export function view(g,id) {
 const p=g.players.find(p=>p.id===id),spy=id===g.spy;
 return {type:g.type,phase:g.phase,deadline:g.deadline,winner:g.winner,event:g.event,players:g.players.map(({id,name,avatar,bot})=>({id,name,avatar,bot,alive:true})),turn:g.turn,question:g.question,accusation:g.accusation?{target:g.accusation.target,by:g.accusation.by,deadline:g.accusation.deadline,count:Object.values(g.accusation.votes).filter(Boolean).length,myVote:g.accusation.votes[id]}:null,
 me:{role:spy?'spy':'agent',location:!spy||g.winner?g.location.id:null,job:spy?null:{en:g.location.roles.en[p.role],th:g.location.roles.th[p.role]}},spy:g.winner?g.spy:null,location:g.winner?g.location.id:null};
}
