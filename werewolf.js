import { randomInt } from 'node:crypto';
export const living = g => g.players.filter(p => p.alive);
export function shuffle(items) { const a = [...items]; for (let i=a.length-1;i>0;i--) { const j=randomInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function create(players, settings, now=Date.now()) {
  const n=players.length, wolves=Math.max(1, Math.floor(n/4));
  const roles=[...Array(wolves).fill('werewolf'),'seer','doctor',...(n>=6?['hunter']:[])];
  while(roles.length<n) roles.push('villager');
  const deck=shuffle(roles);
  return {type:'werewolf',players:players.map((p,i)=>({...p,role:deck[i],alive:true})),phase:'day',day:1,deadline:now+settings.daySeconds*1000,daySeconds:settings.daySeconds,votes:{},actions:{},checks:{},history:[],event:{key:'day',args:{day:1}},winner:null};
}
export function checkWin(g) {
  const a=living(g), w=a.filter(p=>p.role==='werewolf').length;
  if(!w) g.winner='villagers'; else if(w>=a.length-w) g.winner='werewolves';
  if(g.winner) {g.phase='ended';g.deadline=0;g.event={key:g.winner,args:{}};}
  return g.winner;
}
function setPhase(g,phase,seconds,now,key=phase,args={}) {g.phase=phase;g.deadline=now+seconds*1000;g.event={key,args};}
function kill(g,id,continuation,now) {
  const p=g.players.find(x=>x.id===id && x.alive); if(!p) return false;
  p.alive=false;g.history.push({id:p.id,day:g.day,cause:continuation});
  if(p.role==='hunter'&&!p.shot) {g.hunter=p.id;g.continuation=continuation;setPhase(g,'hunter',25,now,'hunter',{name:p.name});return true;}
  return false;
}
function continueAfterDeath(g,where,now) {
  if(checkWin(g)) return;
  if(where==='vote') setPhase(g,'nightTransition',5,now,'nightTransition');
  else setPhase(g,'dawn',6,now,'dawn',{names:g.lastVictims?.join(', ')||''});
}
export function act(g,id,action,targetId,now=Date.now()) {
  if(g.winner) throw new Error('ended');
  const p=g.players.find(x=>x.id===id),t=g.players.find(x=>x.id===targetId&&x.alive);
  if(!p||!t) throw new Error('invalidTarget');
  if(g.phase==='hunter'&&g.hunter===id&&action==='shoot'&&targetId!==id) {
    if(p.shot) throw new Error('alreadyActed'); p.shot=true;t.alive=false;
    g.history.push({id:t.id,day:g.day,cause:'hunter'});g.lastVictims=[...(g.lastVictims||[]),t.name];
    continueAfterDeath(g,g.continuation,now);return;
  }
  if(!p.alive) throw new Error('dead');
  if(g.phase==='vote'&&action==='vote'&&id!==targetId) {g.votes[id]=targetId;return;}
  if(g.phase!=='night') throw new Error('wrongPhase');
  if(g.actions[id]) throw new Error('alreadyActed');
  if(action==='kill'&&p.role==='werewolf'&&t.role!=='werewolf') g.actions[id]=targetId;
  else if(action==='protect'&&p.role==='doctor') g.actions[id]=targetId;
  else if(action==='check'&&p.role==='seer'&&id!==targetId) {g.actions[id]=targetId;(g.checks[id]??={})[targetId]=t.role;}
  else throw new Error('invalidAction');
}
export function advance(g,now=Date.now()) {
  if(g.winner||now<g.deadline) return false;
  if(g.phase==='day') {g.votes={};setPhase(g,'vote',35,now);}
  else if(g.phase==='vote') {
    const tally={};for(const [v,t] of Object.entries(g.votes)) if(living(g).some(p=>p.id===v)&&living(g).some(p=>p.id===t)) tally[t]=(tally[t]||0)+1;
    const sorted=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
    const victim=sorted.length&&(!sorted[1]||sorted[0][1]>sorted[1][1])?sorted[0][0]:null;
    g.lastEliminated=victim?g.players.find(p=>p.id===victim).name:null;
    if(victim&&kill(g,victim,'vote',now)) return true;
    continueAfterDeath(g,'vote',now);
    if(!g.winner) g.event={key:victim?'eliminated':'tie',args:{name:g.lastEliminated||''}};
  } else if(g.phase==='nightTransition') {g.actions={};setPhase(g,'night',40,now);}
  else if(g.phase==='night') {
    const tally={},protectedIds=new Set();
    for(const p of living(g)) {const t=g.actions[p.id];if(!t)continue;if(p.role==='werewolf')tally[t]=(tally[t]||0)+1;if(p.role==='doctor')protectedIds.add(t);}
    const max=Math.max(0,...Object.values(tally)), tied=Object.keys(tally).filter(id=>tally[id]===max);
    const victim=tied.length?tied[randomInt(tied.length)]:null;
    g.lastVictims=[];
    if(victim&&!protectedIds.has(victim)) {g.lastVictims.push(g.players.find(p=>p.id===victim).name);if(kill(g,victim,'night',now))return true;}
    continueAfterDeath(g,'night',now);
  } else if(g.phase==='hunter') {g.players.find(p=>p.id===g.hunter).shot=true;continueAfterDeath(g,g.continuation,now);}
  else if(g.phase==='dawn') {g.day++;setPhase(g,'day',g.daySeconds,now,'day',{day:g.day});}
  return true;
}
export function view(g,id) {
  const p=g.players.find(p=>p.id===id);
  return {type:g.type,phase:g.phase,day:g.day,deadline:g.deadline,winner:g.winner,event:g.event,history:g.history,
    players:g.players.map(({id,name,avatar,bot,alive,role})=>({id,name,avatar,bot,alive,...(g.winner?{role}:{})})),
    me:{role:p?.role,alive:p?.alive,checks:g.checks[id]||{},acted:!!g.actions[id],vote:g.votes[id]||null,pack:p?.role==='werewolf'?g.players.filter(x=>x.role==='werewolf').map(x=>x.id):[]},
    hunter:g.phase==='hunter'?g.hunter:null,voteCount:Object.keys(g.votes).length};
}
