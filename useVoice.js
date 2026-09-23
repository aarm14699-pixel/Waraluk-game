import {useEffect,useRef,useState} from 'react';
import {socket,request} from './useSocket';
import {useStore} from '../store';
export function useVoice(allowed){
 const {room,me,iceServers,connected}=useStore(),[enabled,setEnabled]=useState(false),[loading,setLoading]=useState(false),[talking,setTalking]=useState(false),[muted,setMuted]=useState({}),[error,setError]=useState('');
 const generation=useRef(0),stream=useRef(null),peers=useRef(new Map()),audios=useRef(new Map()),live=useRef(null),localTrack=useRef(null),allowedRef=useRef(allowed),hold=useRef(false),mutedRef=useRef(muted),mode=room?.voiceMode;
 allowedRef.current=allowed;mutedRef.current=muted;
 function playback(id,media){const old=audios.current.get(id);if(old){old.pause();old.srcObject=null;}const a=new Audio();a.autoplay=true;a.srcObject=media;a.muted=!!mutedRef.current[id]||!allowedRef.current;audios.current.set(id,a);a.play().catch(()=>setError('audioBlocked'));}
 function stop(){hold.current=false;stream.current?.getTracks().forEach(t=>t.enabled=false);localTrack.current?.mute();setTalking(false);if(socket.connected)request('speaking',{active:false},true).catch(()=>{});}
 function cleanup(){generation.current++;stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;localTrack.current?.stop();localTrack.current=null;live.current?.disconnect();live.current=null;peers.current.forEach(p=>p.close());peers.current.clear();audios.current.forEach(a=>{a.pause();a.srcObject=null;});audios.current.clear();setEnabled(false);if(socket.connected)request('voiceReady',{ready:false},true).catch(()=>{});}
 async function enable(){if(loading)return;setLoading(true);setError('');const ticket=++generation.current;try{
  if(mode==='sfu'){
   if(!room.sfuAvailable)throw new Error('sfuUnavailable');
   const {Room,RoomEvent,createLocalAudioTrack}=await import('livekit-client');
   const {url,token}=await request('voiceToken',{},true);const r=new Room();if(ticket!==generation.current)return;live.current=r;
   r.on(RoomEvent.TrackSubscribed,(track,_,participant)=>{if(track.kind==='audio')playback(participant.identity,new MediaStream([track.mediaStreamTrack]));});
   await r.connect(url,token);const track=await createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});if(ticket!==generation.current){track.stop();r.disconnect();return;}localTrack.current=track;await track.mute();await r.localParticipant.publishTrack(track);
  }else {if(!navigator.mediaDevices?.getUserMedia)throw new Error('httpsRequired');const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});if(ticket!==generation.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;stream.current.getAudioTracks().forEach(t=>t.enabled=false);}
  if(ticket!==generation.current)return;setEnabled(true);await request('voiceReady',{ready:true},true);
 }catch(e){cleanup();setError(e.name==='NotAllowedError'?'micDenied':['sfuUnavailable','httpsRequired'].includes(e.message)?e.message:'voiceFailed');}finally{setLoading(false);}}
 function peer(id){if(peers.current.has(id))return peers.current.get(id);const pc=new RTCPeerConnection({iceServers});pc.pending=[];stream.current?.getTracks().forEach(t=>pc.addTrack(t,stream.current));pc.onicecandidate=e=>{if(e.candidate)request('signal',{to:id,signal:{candidate:e.candidate}},true).catch(()=>{});};pc.ontrack=e=>playback(id,e.streams[0]);pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')setError('voiceFailed');};peers.current.set(id,pc);return pc;}
 useEffect(()=>{if(!enabled||mode!=='mesh')return;const ids=new Set(room.players.filter(p=>p.id!==me&&!p.bot&&p.connected&&p.voice).map(p=>p.id));for(const [id,p]of peers.current)if(!ids.has(id)){p.close();peers.current.delete(id);const a=audios.current.get(id);if(a){a.pause();a.srcObject=null;audios.current.delete(id);}}
  for(const id of ids)if(me<id&&!peers.current.has(id)){const pc=peer(id);(async()=>{await pc.setLocalDescription(await pc.createOffer());await request('signal',{to:id,signal:{description:pc.localDescription}},true);})().catch(()=>setError('voiceFailed'));}
 },[enabled,mode,room?.players.map(p=>`${p.id}:${p.voice}:${p.connected}`).join('|')]);
 useEffect(()=>{const receive=async({from,signal})=>{if(!stream.current||mode!=='mesh')return;try{const pc=peer(from);if(signal.description){await pc.setRemoteDescription(signal.description);for(const c of pc.pending)await pc.addIceCandidate(c);pc.pending=[];if(signal.description.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());await request('signal',{to:from,signal:{description:pc.localDescription}},true);}}else if(signal.candidate){if(pc.remoteDescription)await pc.addIceCandidate(signal.candidate);else pc.pending.push(signal.candidate);}}catch{setError('voiceFailed');}};socket.on('signal',receive);return()=>socket.off('signal',receive);},[mode,me,iceServers]);
 async function begin(){if(!enabled||!allowedRef.current)return;hold.current=true;audios.current.forEach(a=>a.play().catch(()=>{}));stream.current?.getAudioTracks().forEach(t=>t.enabled=true);if(localTrack.current){await localTrack.current.unmute();if(!hold.current||!allowedRef.current){await localTrack.current.mute();return;}}setTalking(true);request('speaking',{active:true},true).catch(()=>{});}
 useEffect(()=>{if(!allowed)stop();audios.current.forEach((a,id)=>a.muted=!!mutedRef.current[id]||!allowed);},[allowed]);
 useEffect(()=>{if(!connected)cleanup();},[connected]);
 useEffect(()=>{cleanup();return cleanup;},[mode,room?.code]);
 useEffect(()=>{const down=e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)&&!e.repeat){e.preventDefault();begin();}},up=e=>{if(e.code==='Space')stop();},hidden=()=>{if(document.hidden)stop();};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden);};},[enabled,allowed]);
 function toggleMute(id){setMuted(old=>{const next={...old,[id]:!old[id]};const a=audios.current.get(id);if(a)a.muted=next[id]||!allowedRef.current;return next;});}
 return {enabled,loading,talking,muted,error,enable,disable:cleanup,begin,stop,toggleMute};
}
