import {useEffect,useState} from 'react';
import {useStore} from '../store';
import th from '../locales/th.json';import en from '../locales/en.json';
const dictionaries={th,en};
export function useI18n(){const lang=useStore(s=>s.lang);return {lang,t:(key,args={})=>{const v=key.split('.').reduce((a,k)=>a?.[k],dictionaries[lang]);return String(v??key).replace(/\{(\w+)\}/g,(_,k)=>args[k]??'');}};}
export function useCountdown(deadline){const offset=useStore(s=>s.offset),[now,setNow]=useState(Date.now());useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id);},[]);const left=Math.max(0,Math.ceil(((deadline||0)-now-offset)/1000));return `${Math.floor(left/60).toString().padStart(2,'0')}:${(left%60).toString().padStart(2,'0')}`;}
