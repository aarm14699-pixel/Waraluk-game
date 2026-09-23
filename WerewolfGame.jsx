import {useState} from 'react';import {Eye,EyeOff,Shield,Moon,Sun} from 'lucide-react';import {useI18n} from '../../../hooks/useGame';import {send} from '../../../hooks/useSocket';import {useStore} from '../../../store';import Avatar from '../../characters/Avatar';
export default function WerewolfGame({game}){const {t}=useI18n(),{me,busy}=useStore(),[reveal,setReveal]=useState(false),role=game.me.role;
 const action=game.phase==='vote'?'vote':game.phase==='hunter'&&game.hunter===me?'shoot':game.phase==='night'?({werewolf:'kill',seer:'check',doctor:'protect'}[role]):null;
 const active=action&&(game.me.alive||action==='shoot')&&(!game.me.acted||action==='vote'||action==='shoot');
 const targets=game.players.filter(p=>p.alive&&(action==='protect'||p.id!==me)&&!(action==='kill'&&game.me.pack.includes(p.id)));
 return <div className="game-panel"><div className="role-card"><div className="role-symbol">{role==='werewolf'?'🐺':role==='seer'?'🔮':role==='doctor'?'🌿':role==='hunter'?'🏹':'🏡'}</div><div><span className="eyebrow">{t('yourSecret')}</span><h3>{reveal?t('roles.'+role):t('hiddenRole')}</h3>{reveal&&<p>{t('roleHelp.'+role)}</p>}</div><button className="icon-button" aria-label={t(reveal?'hide':'reveal')} onClick={()=>setReveal(!reveal)}>{reveal?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
 {!game.me.alive&&action!=='shoot'&&<p className="notice">{t('spectating')}</p>}
 {active?<><h3>{t('actions.'+action)}</h3><p className="muted">{t(action==='vote'?'voteHint':'nightHint')}</p><div className="target-grid">{targets.map(p=><button disabled={busy} key={p.id} className={`target ${game.me.vote===p.id?'selected':''}`} onClick={()=>send('action',{action,target:p.id})}><Avatar type={p.avatar} size={54}/><span>{p.name}</span>{game.me.vote===p.id&&<span>✓</span>}</button>)}</div></>:<div className="phase-note">{game.phase==='night'?<Moon/>:<Sun/>}<p>{t(game.me.acted&&game.phase==='night'?'actionSaved':'phaseHelp.'+game.phase)}</p></div>}
 {game.phase==='vote'&&<p className="muted">{t('votesCast',{count:game.voteCount})}</p>}
 {reveal&&Object.keys(game.me.checks).length>0&&<div className="check-results"><h4><Shield size={16}/>{t('seerResults')}</h4>{Object.entries(game.me.checks).map(([id,r])=><p key={id}>{game.players.find(p=>p.id===id)?.name} · {t('roles.'+r)}</p>)}</div>}
 </div>;
}
