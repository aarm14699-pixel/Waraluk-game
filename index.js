import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomInt,randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AccessToken } from 'livekit-server-sdk';
import * as werewolf from './games/werewolf.js';
import * as spyfall from './games/spyfall.js';
import * as bots from './ai/bots.js';
import { render } from './ai/gamemaster.js';
export function createPlatform(options={}) {
 const app=express(),http=createServer(app),rooms=new Map(),sessions=new Map();
 const origin=process.env.CLIENT_ORIGIN?.split(',');
 app.use(helmet({contentSecurityPolicy:false}));
 app.use('/api',(req,res,next)=>{if(origin?.includes(req.headers.origin)){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}next();});
 const io=new Server(http,{cors:{origin:origin||false},maxHttpBufferSize:16384,allowRequest:(req,cb)=>{const o=req.headers.origin;cb(null,!o||!!origin?.includes(o)||o===`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`);}});
 const modules={werewolf,spyfall};
 app.get('/api/health',(_,res)=>res.json({ok:true}));
 app.get('/api/catalog',(_,res)=>res.json({locations:spyfall.locations.map(({id,en,th})=>({id,en,th}))}));
 const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
 if(process.env.TURN_URL)iceServers.push({urls:process.env.TURN_URL,username:process.env.TURN_USERNAME,credential:process.env.TURN_CREDENTIAL});
 const sfu=!!(process.env.LIVEKIT_URL&&process.env.LIVEKIT_API_KEY&&process.env.LIVEKIT_API_SECRET);
 const voiceAllowed=(r,p)=>!r.game||(r.game.type==='spyfall'&&!r.game.winner)||(r.game.type==='werewolf'&&r.game.phase==='day'&&r.game.players.find(x=>x.id===p.id)?.alive);
 function snapshot(r,id) {
  const game=r.game?modules[r.game.type].view(r.game,id):null;
  if(game)game.gm={en:render(game.event,'en'),th:render(game.event,'th')};
  return {code:r.code,host:r.host,settings:r.settings,players:r.players.map(({id,name,avatar,bot,connected,speaking,voice})=>({id,name,avatar,bot,connected,speaking,voice})),game,chat:r.chat,serverTime:Date.now(),voiceMode:r.players.filter(p=>!p.bot).length>6?'sfu':'mesh',sfuAvailable:sfu};
 }
 function broadcast(r) {for(const p of r.players.filter(p=>!p.bot)){if(!voiceAllowed(r,p))p.speaking=false;}for(const p of r.players)if(p.socketId)io.to(p.socketId).emit('state',snapshot(r,p.id));}
 function current(socket) {const session=sessions.get(socket.data.token);const room=rooms.get(session?.code);const player=room?.players.find(p=>p.id===session?.id);if(!room||!player||player.socketId!==socket.id)throw new Error('notInRoom');return {r:room,p:player};}
 function requireHost(r,p){if(r.host!==p.id)throw new Error('hostOnly');}
 function attach(socket,r,p,token) {socket.join(r.code);socket.data.token=token;p.socketId=socket.id;p.connected=true;p.disconnectedAt=null;p.voice=false;p.speaking=false;sessions.set(token,{code:r.code,id:p.id});socket.emit('session',{token,id:p.id,code:r.code,iceServers});broadcast(r);}
 function remove(r,p) {if(p.socketId){const s=io.sockets.sockets.get(p.socketId);s?.emit('removed');s?.leave(r.code);if(s)s.data.token=null;}r.players=r.players.filter(x=>x.id!==p.id);for(const [token,s] of sessions)if(s.id===p.id)sessions.delete(token);if(r.host===p.id)r.host=r.players.find(x=>!x.bot&&x.connected)?.id||r.players.find(x=>!x.bot)?.id;if(!r.players.some(x=>!x.bot)){rooms.delete(r.code);return;}broadcast(r);}
 io.on('connection',socket=>{
  const counts=new Map();
  const on=(name,fn)=>socket.on(name,async(data={},ack=()=>{})=>{if(typeof ack!=='function')return;try{const now=Date.now(),c=counts.get(name)||{time:now,n:0};if(now-c.time>1000){c.time=now;c.n=0;}if(++c.n>(name==='signal'?80:12))throw new Error('rateLimit');counts.set(name,c);const result=await fn(data||{});ack({ok:true,...result});}catch(e){ack({ok:false,error:e.message||'error'});}});
  on('resume',({token})=>{if(typeof token!=='string')throw new Error('notInRoom');const s=sessions.get(token),r=rooms.get(s?.code),p=r?.players.find(p=>p.id===s.id);if(!p)throw new Error('notInRoom');if(p.socketId&&p.socketId!==socket.id)io.sockets.sockets.get(p.socketId)?.disconnect(true);attach(socket,r,p,token);});
  const playerData=data=>{if(typeof data.name!=='string'||!data.name.trim()||data.name.length>24)throw new Error('invalidName');return {id:randomUUID(),name:data.name.trim(),avatar:Number.isInteger(data.avatar)&&data.avatar>=0&&data.avatar<8?data.avatar:0,bot:false,connected:true};};
  on('create',data=>{if(socket.data.token)throw new Error('alreadyInRoom');if(rooms.size>=500)throw new Error('serverFull');let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));const p=playerData(data),r={code,host:p.id,settings:{game:'werewolf',maxPlayers:8,botFill:true,daySeconds:120},players:[p],chat:[],game:null};rooms.set(code,r);attach(socket,r,p,randomUUID());return {code};});
  on('join',data=>{if(socket.data.token)throw new Error('alreadyInRoom');const r=rooms.get(String(data.code));if(!r)throw new Error('roomMissing');if(r.game)throw new Error('gameStarted');if(r.players.length>=r.settings.maxPlayers)throw new Error('roomFull');const p=playerData(data);r.players.push(p);attach(socket,r,p,randomUUID());return {code:r.code};});
  on('settings',data=>{const {r,p}=current(socket);requireHost(r,p);if(r.game)throw new Error('gameStarted');if(!['werewolf','spyfall'].includes(data.game)||!Number.isInteger(data.maxPlayers)||data.maxPlayers<4||data.maxPlayers>16||data.maxPlayers<r.players.length||!Number.isInteger(data.daySeconds)||data.daySeconds<120||data.daySeconds>600||typeof data.botFill!=='boolean')throw new Error('invalidSettings');r.settings={game:data.game,maxPlayers:data.maxPlayers,botFill:data.botFill,daySeconds:data.daySeconds};broadcast(r);});
  on('kick',({id})=>{const {r,p}=current(socket);requireHost(r,p);if(r.game||id===p.id)throw new Error('invalidAction');const target=r.players.find(x=>x.id===id);if(!target)throw new Error('invalidTarget');remove(r,target);});
  on('start',()=>{const {r,p}=current(socket);requireHost(r,p);if(r.game)throw new Error('gameStarted');if(r.settings.botFill)bots.fill(r);if(r.players.length<4)throw new Error('notEnough');r.game=modules[r.settings.game].create(r.players.map(({id,name,avatar,bot})=>({id,name,avatar,bot})),r.settings);broadcast(r);});
  on('rematch',()=>{const {r,p}=current(socket);requireHost(r,p);if(!r.game?.winner)throw new Error('wrongPhase');r.game=null;r.players=r.players.filter(x=>!x.bot);broadcast(r);});
  on('action',({action,target})=>{const {r,p}=current(socket);if(!r.game)throw new Error('wrongPhase');if(modules[r.game.type].advance(r.game,Date.now()))broadcast(r);modules[r.game.type].act(r.game,p.id,action,target);broadcast(r);});
  on('chat',({text})=>{const {r,p}=current(socket);if(typeof text!=='string'||!text.trim()||text.length>300)throw new Error('invalidMessage');if(r.game?.type==='werewolf'&&!voiceAllowed(r,p)&&!r.game.winner)throw new Error('silent');r.chat.push({id:randomUUID(),name:p.name,playerId:p.id,text:text.trim(),at:Date.now()});r.chat=r.chat.slice(-80);broadcast(r);});
  on('voiceReady',({ready})=>{const {r,p}=current(socket);p.voice=!!ready;p.speaking=false;broadcast(r);});
  on('speaking',({active})=>{const {r,p}=current(socket);p.speaking=!!active&&voiceAllowed(r,p)&&p.voice;broadcast(r);});
  on('signal',({to,signal})=>{const {r,p}=current(socket),target=r.players.find(x=>x.id===to&&x.connected&&x.voice);if(!p.voice||!target||to===p.id||!signal||JSON.stringify(signal).length>12000)throw new Error('invalidAction');io.to(target.socketId).emit('signal',{from:p.id,signal});});
  on('voiceToken',async()=>{const {r,p}=current(socket);if(!sfu)throw new Error('sfuUnavailable');const token=new AccessToken(process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET,{identity:p.id,name:p.name,ttl:3600});token.addGrant({roomJoin:true,room:`tiny-${r.code}`,canPublish:true,canSubscribe:true});return {token:await token.toJwt(),url:process.env.LIVEKIT_URL};});
  on('leave',()=>{const {r,p}=current(socket);if(r.game&&!r.game.winner){p.connected=false;p.voice=false;p.speaking=false;p.disconnectedAt=Date.now();socket.leave(r.code);p.socketId=null;socket.data.token=null;for(const [t,s]of sessions)if(s.id===p.id)sessions.delete(t);broadcast(r);}else remove(r,p);});
  socket.on('disconnect',()=>{try{const {r,p}=current(socket);p.connected=false;p.voice=false;p.speaking=false;p.socketId=null;p.disconnectedAt=Date.now();broadcast(r);}catch{}});
 });
 const interval=setInterval(()=>{
  const now=Date.now();
  for(const r of rooms.values()) {
   if(!r.players.some(p=>!p.bot&&p.connected)){r.emptySince??=now;if(now-r.emptySince>300000){rooms.delete(r.code);for(const [t,s]of sessions)if(s.code===r.code)sessions.delete(t);}continue;}r.emptySince=null;
   let changed=false;
   const host=r.players.find(p=>p.id===r.host);if(!host?.connected&&now-(host?.disconnectedAt||0)>30000){r.host=r.players.find(p=>!p.bot&&p.connected).id;changed=true;}
   if(!r.game){for(const p of [...r.players])if(!p.connected&&now-p.disconnectedAt>90000){remove(r,p);changed=true;}}
   if(r.game&&!r.game.winner){changed=modules[r.game.type].advance(r.game,now)||changed;if(now-(r.lastBotAt||0)>4500){r.lastBotAt=now;changed=bots.tick(r.game,now)||changed;}
    if(r.game.type==='spyfall'){const id=r.game.question?.to||r.game.turn;if(!r.players.find(p=>p.id===id)?.connected&&!r.players.find(p=>p.id===id)?.bot){r.stalledSince??=now;if(now-r.stalledSince>30000){r.game.question=null;r.game.turn=r.players.find(p=>p.connected&&!p.bot).id;r.stalledSince=null;changed=true;}}else r.stalledSince=null;}
   }
   if(changed)broadcast(r);
  }
 },options.tickMs||500);
 const clientPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../client/dist');
 app.use(express.static(clientPath));app.get('*',(_,res)=>res.sendFile(path.join(clientPath,'index.html')));
 return {app,http,io,rooms,close:async()=>{clearInterval(interval);await new Promise(resolve=>io.close(resolve));}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {const platform=createPlatform();platform.http.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log('Tiny Together listening'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await platform.close();process.exit(0);});}
