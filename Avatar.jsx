import {useId} from 'react';
export const animals=['bunny','frog','penguin','dog','cat','bear','fox','sheep'];
const colors=['#ffe2d5','#92c879','#6584b4','#d69a61','#eab6a7','#bc8c63','#e59a59','#f4e7d6'];
export default function Avatar({type=0,size=64,speaking=false,dead=false}){
 const id=useId().replace(/:/g,''),a=animals[type%8],c=colors[type%8];
 return <svg className={`avatar ${speaking?'speaking':''} ${dead?'departed':''}`} width={size} height={size} viewBox="0 0 100 115" aria-hidden="true"><defs><radialGradient id={id} cx="35%" cy="25%" r="80%"><stop stopColor={c}/><stop offset=".7" stopColor={c}/><stop offset="1" stopColor="#3b2931" stopOpacity=".55"/></radialGradient></defs>{speaking&&<g className="sound-waves" fill="none" stroke="#e0ed9b" strokeWidth="3" strokeLinecap="round"><path d="M7 46Q-2 58 7 70M93 46Q102 58 93 70"/><path d="M13 52Q8 58 13 64M87 52Q92 58 87 64"/></g>}<ellipse cx="50" cy="108" rx="31" ry="5" fill="#000" opacity=".2"/><ellipse cx="50" cy="85" rx="27" ry="23" fill={c}/><ellipse cx="50" cy="88" rx="17" ry="18" fill="#fff0da"/><ellipse cx="29" cy="103" rx="12" ry="7" fill={c}/><ellipse cx="71" cy="103" rx="12" ry="7" fill={c}/>
 {a==='bunny'&&<><ellipse cx="33" cy="25" rx="11" ry="24" fill={c} transform="rotate(-10 33 25)"/><ellipse cx="67" cy="25" rx="11" ry="24" fill={c} transform="rotate(10 67 25)"/><ellipse cx="33" cy="24" rx="5" ry="16" fill="#ed9eaa"/><ellipse cx="67" cy="24" rx="5" ry="16" fill="#ed9eaa"/></>}
 {['cat','fox'].includes(a)&&<><path d="M15 49L15 14L42 34M58 34L85 14L85 49" fill={c}/><path d="M20 34L20 23L34 35M65 35L80 23L80 34" fill="#e29494"/></>}
 {['bear','sheep','dog'].includes(a)&&<><ellipse cx="20" cy="42" rx="14" ry={a==='dog'?25:15} fill={c}/><ellipse cx="80" cy="42" rx="14" ry={a==='dog'?25:15} fill={c}/></>}
 <ellipse cx="50" cy="57" rx="37" ry="32" fill={`url(#${id})`}/>
 {a==='penguin'&&<path d="M22 57Q25 36 42 50Q50 35 60 50Q77 35 81 60Q82 82 51 84Q23 82 22 57" fill="#ffefd7"/>}
 {a==='fox'&&<path d="M17 55L46 68L50 56L56 68L83 55Q82 85 50 86Q18 84 17 55" fill="#fff1d8"/>}
 {a==='frog'&&<><circle cx="29" cy="32" r="14" fill={c}/><circle cx="71" cy="32" r="14" fill={c}/><circle cx="29" cy="32" r="7" fill="#203b28"/><circle cx="71" cy="32" r="7" fill="#203b28"/><circle cx="27" cy="29" r="2" fill="white"/><circle cx="69" cy="29" r="2" fill="white"/></>}
 {a==='sheep'&&Array.from({length:8},(_,i)=><circle key={i} cx={23+i*8} cy={34+Math.sin(i)*4} r="10" fill="#fff1e2"/>)}
 {a!=='frog'&&<><ellipse cx="35" cy="57" rx="4" ry="5" fill="#2e2a30"/><ellipse cx="65" cy="57" rx="4" ry="5" fill="#2e2a30"/><circle cx="34" cy="55" r="1.2" fill="white"/><circle cx="64" cy="55" r="1.2" fill="white"/></>}
 <ellipse cx="26" cy="68" rx="7" ry="4" fill="#ef9693" opacity=".65"/><ellipse cx="74" cy="68" rx="7" ry="4" fill="#ef9693" opacity=".65"/>
 {a==='penguin'?<path d="M43 65Q50 60 57 65L50 72Z" fill="#f7b650"/>:<><path d="M46 64Q50 61 54 64L50 68Z" fill="#614541"/><path d="M42 71Q47 75 50 69Q53 75 58 71" fill="none" stroke="#614541" strokeWidth="2" strokeLinecap="round"/></>}
 <path d="M26 82Q50 94 75 82L71 91Q51 100 29 91Z" fill={['#7298af','#eab55f','#db9b68','#7eae86'][type%4]}/><path d="M62 90L71 90L68 105L59 102Z" fill={['#7298af','#eab55f','#db9b68','#7eae86'][type%4]}/></svg>;
}
