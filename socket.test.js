import test from 'node:test';import assert from 'node:assert/strict';import {io} from 'socket.io-client';import {createPlatform} from '../server/index.js';
const req=(s,event,data={})=>new Promise((resolve,reject)=>s.timeout(2000).emit(event,data,(err,r)=>err?reject(err):resolve(r)));
const once=(s,e)=>new Promise(resolve=>s.once(e,resolve));
test('rooms, host authorization, privacy, reconnect and signaling isolation',async()=>{
 const platform=createPlatform({tickMs:100});await new Promise(r=>platform.http.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${platform.http.address().port}`,clients=[];
 const client=async()=>{const s=io(url,{transports:['websocket'],forceNew:true});clients.push(s);await once(s,'connect');return s;};
 try{const host=await client(),sessionPromise=once(host,'session');assert.equal((await req(host,'create',{name:'อาร์ม',avatar:0})).ok,true);const session=await sessionPromise;const friend=await client();assert.equal((await req(friend,'join',{code:session.code,name:'Friend',avatar:1})).ok,true);assert.equal((await req(friend,'settings',{game:'spyfall',maxPlayers:4,daySeconds:120,botFill:true})).error,'hostOnly');
 const outsider=await client();assert.equal((await req(outsider,'chat',{text:'attack'})).error,'notInRoom');
 assert.equal((await req(host,'settings',{game:'werewolf',maxPlayers:6,daySeconds:120,botFill:true})).ok,true);const state=new Promise(resolve=>{const handler=s=>{if(s.game){friend.off('state',handler);resolve(s);}};friend.on('state',handler);});assert.equal((await req(host,'start')).ok,true);const view=await state;assert.equal(view.players.length,6);assert.ok(view.game.players.every(p=>!('role'in p)));assert.ok(!('actions'in view.game));assert.equal((await req(outsider,'join',{code:session.code,name:'Late',avatar:0})).error,'gameStarted');
 await req(host,'voiceReady',{ready:true});assert.equal((await req(host,'signal',{to:'foreign-player',signal:{candidate:{}}})).error,'invalidAction');
 host.disconnect();const resumed=await client(),resumeState=once(resumed,'state');assert.equal((await req(resumed,'resume',{token:session.token})).ok,true);assert.equal((await resumeState).host,session.id);assert.equal((await req(resumed,'chat',{text:'rejoined'})).ok,true);
 }finally{clients.forEach(c=>c.disconnect());await platform.close();}
});
