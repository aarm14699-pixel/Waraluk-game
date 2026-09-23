import {io} from 'socket.io-client';
import {useStore} from '../store';
export const socket=io(import.meta.env.VITE_SERVER_URL||undefined,{autoConnect:false,reconnection:true,reconnectionDelay:500,reconnectionDelayMax:5000,timeout:10000});
let started=false;
export function connect(){if(started)return;started=true;
 socket.on('connect',()=>{useStore.getState().patch({connected:true,error:''});const token=sessionStorage.getItem('tiny-session');if(token)socket.emit('resume',{token},r=>{if(!r.ok){sessionStorage.removeItem('tiny-session');useStore.getState().patch({room:null,me:null,error:r.error});}});});
 socket.on('disconnect',()=>useStore.getState().patch({connected:false}));
 socket.on('connect_error',()=>useStore.getState().patch({connected:false}));
 socket.on('session',s=>{sessionStorage.setItem('tiny-session',s.token);useStore.getState().patch({me:s.id,iceServers:s.iceServers});});
 socket.on('state',room=>useStore.getState().patch({room,offset:room.serverTime-Date.now()}));
 socket.on('removed',()=>{sessionStorage.removeItem('tiny-session');useStore.getState().patch({room:null,me:null,error:'removed'});});socket.connect();
}
export function request(event,data={},quiet=false){return new Promise((resolve,reject)=>{if(!socket.connected){const e=new Error('offline');if(!quiet)useStore.getState().patch({error:e.message});reject(e);return;}if(!quiet)useStore.getState().patch({busy:true,error:''});socket.timeout(10000).emit(event,data,(err,res)=>{if(!quiet)useStore.getState().patch({busy:false});if(err||!res?.ok){const e=new Error(err?'timeout':res.error);if(!quiet)useStore.getState().patch({error:e.message});reject(e);}else resolve(res);});});}
export function send(event,data){return request(event,data).catch(()=>null);}
