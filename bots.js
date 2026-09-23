import { randomUUID, randomInt } from 'node:crypto';
import * as wolf from '../games/werewolf.js';
import * as spy from '../games/spyfall.js';
const names=['Momo','Kero','Pino','Hachi','Lala','Taro','Nori','Sora','Mochi','Yuki','Boba','Dino','Poppy','Coco','Toto'];
export const questions=[{en:'Is it usually noisy here?',th:'ที่นี่เสียงดังเป็นปกติไหม'},{en:'What would you wear here?',th:'มาที่นี่ควรแต่งตัวยังไง'},{en:'Do people come here every day?',th:'คนมาที่นี่ทุกวันไหม'},{en:'Would children enjoy this place?',th:'เด็ก ๆ จะชอบที่นี่ไหม'},{en:'What time is it busiest?',th:'ช่วงไหนที่นี่คนเยอะที่สุด'},{en:'Do you need a ticket?',th:'ต้องใช้ตั๋วเข้าหรือเปล่า'}];
export function fill(room) {let i=0;while(room.players.length<room.settings.maxPlayers){room.players.push({id:randomUUID(),name:names[i%names.length],avatar:i%8,bot:true,connected:true});i++;}}
const pick=a=>a.length?a[randomInt(a.length)]:null;
export function tick(g,now=Date.now()) {
 let changed=false;
 for(const p of g.players.filter(p=>p.bot)) {
   try {
    if(g.type==='werewolf') {
     const targets=wolf.living(g).filter(t=>t.id!==p.id);
     if(g.phase==='hunter'&&g.hunter===p.id){const t=pick(targets);if(t){wolf.act(g,p.id,'shoot',t.id,now);changed=true;}continue;}
     if(!p.alive)continue;
     if(g.phase==='vote'&&!g.votes[p.id]) {
       const weights=targets.flatMap(t=>Array(1+Object.values(g.votes).filter(v=>v===t.id).length).fill(t));
       const t=pick(weights);if(t){wolf.act(g,p.id,'vote',t.id,now);changed=true;}
     }
     if(g.phase==='night'&&!g.actions[p.id]) {
      const action={werewolf:'kill',seer:'check',doctor:'protect'}[p.role];
      const t=pick(p.role==='werewolf'?targets.filter(t=>t.role!=='werewolf'):p.role==='doctor'?wolf.living(g):targets);
      if(action&&t){wolf.act(g,p.id,action,t.id,now);changed=true;}
     }
    }else {
     if(g.accusation&&g.accusation.votes[p.id]===undefined){spy.act(g,p.id,'verdict',randomInt(2)===1,now);changed=true;}
     if(!g.winner&&g.question?.to===p.id) {spy.act(g,p.id,'answer',null,now);changed=true;}
     else if(!g.winner&&g.turn===p.id&&!g.question){const t=pick(g.players.filter(t=>t.id!==p.id)),q=pick(questions);spy.act(g,p.id,'question',{to:t.id,text:q.th},now);g.question.i18n=q;changed=true;}
    }
   }catch(e){if(!['ended','invalidTarget'].includes(e.message))throw e;}
 }
 return changed;
}
