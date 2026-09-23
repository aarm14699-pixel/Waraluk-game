export const announcements={
 day:{en:'Day {day}. Gather around the campfire. Who can you trust?',th:'วันที่ {day} มารวมตัวรอบกองไฟ ใครกันที่ไว้ใจได้'},
 vote:{en:'Time to vote. Choose carefully.',th:'ถึงเวลาโหวตแล้ว เลือกให้ดีนะ'},
 nightTransition:{en:'Night falls upon the village. Everyone, close your eyes.',th:'กลางคืนมาถึงแล้ว ทุกคนหลับตา'},
 night:{en:'The village sleeps. Special roles, make your choice.',th:'หมู่บ้านหลับใหล ผู้มีบทบาทพิเศษเลือกทำหน้าที่ได้เลย'},
 dawn:{en:'A new dawn. Lost last night: {names}.',th:'เช้าวันใหม่ ผู้จากไปเมื่อคืน: {names}'},
 safeDawn:{en:'Everyone survived the night!',th:'เมื่อคืนทุกคนปลอดภัย'},
 hunter:{en:'{name}, take your final shot.',th:'{name} เลือกยิงครั้งสุดท้ายได้เลย'},
 eliminated:{en:'{name} leaves the campfire. Night is falling.',th:'{name} ออกจากวงกองไฟ กลางคืนกำลังมา'},
 tie:{en:'A tied vote. Nobody leaves. Night is falling.',th:'คะแนนเสมอ ไม่มีใครถูกไล่ออก กลางคืนกำลังมา'},
 villagers:{en:'The village is safe. Villagers win!',th:'หมู่บ้านปลอดภัยแล้ว ชาวบ้านชนะ'},
 werewolves:{en:'The wolves take the village. Werewolves win!',th:'หมาป่าครองหมู่บ้านแล้ว หมาป่าชนะ'},
 spyStart:{en:'One friend is a spy. Ask questions without revealing the location.',th:'มีสายลับอยู่ในกลุ่ม ถามคำถามโดยอย่าเผยสถานที่'},
 spyWin:{en:'The spy wins this round!',th:'สายลับชนะในรอบนี้'},
 agentsWin:{en:'You caught the spy. Friends win!',th:'จับสายลับได้แล้ว ทุกคนชนะ'}
};
export function render(event,language='th') {
 let key=event?.key;if(key==='dawn'&&!event.args?.names)key='safeDawn';
 return (announcements[key]?.[language]||'').replace(/\{(\w+)\}/g,(_,k)=>String(event.args?.[k]??''));
}
