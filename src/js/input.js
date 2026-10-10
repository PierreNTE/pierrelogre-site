import { closeBurrow, grabOrDrop, yap } from './actions.js';
import { cam, canvas, isTouch, setZoom } from './engine.js';
import { fox } from './fox.js';
import { $, closeFact, toggleNotebook } from './hud.js';
import { closeJournal, closeTravel, journalOpen, openJournal, travelOpen } from './journal.js';
import { S } from './state.js';

/* =====================================================================
   Entrées
   ===================================================================== */
const keys={};
if(isTouch) document.documentElement.classList.add('is-touch');
addEventListener('keydown',e=>{
  if(S.mg) return;
  if(!$('#burrow').hidden){ if(e.key==='Escape') closeBurrow(); return; }
  if(!$('#factCard').hidden){ if(e.key==='Escape'||e.key==='Enter'){ e.preventDefault(); closeFact(); } return; }
  if(journalOpen()){ if(e.key==='Escape'||e.code==='KeyM'){ e.preventDefault(); closeJournal(); } return; }
  if(travelOpen()){ if(e.key==='Escape'){ e.preventDefault(); closeTravel(); } return; }
  if(e.code==='KeyM'&&!e.repeat&&S.started&&!S.paused&&!S.mg){ openJournal(); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(S.paused) return;
  keys[e.code]=true; fox.idle=0;
  if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) yap(); }
  if(e.code==='KeyE'&&!e.repeat) grabOrDrop();
  if(e.code==='Tab'){ e.preventDefault(); toggleNotebook(); }
  if(e.code==='Equal'||e.code==='NumpadAdd'||e.key==='+') setZoom(cam.zoomT/1.2);
  if(e.code==='Minus'||e.code==='NumpadSubtract'||e.key==='-') setZoom(cam.zoomT*1.2);
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
canvas.addEventListener('wheel',e=>{ if(S.paused) return; e.preventDefault(); setZoom(cam.zoomT*Math.exp(e.deltaY*.0012)); },{passive:false});
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
const stick={x:0,y:0,id:null};
{
  const base=$('#stick'), knob=$('#knob');
  const move=e=>{ const r=base.getBoundingClientRect(); let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2); const m=Math.hypot(dx,dy), max=r.width/2-14;
    if(m>max){ dx*=max/m; dy*=max/m; } knob.style.transform=`translate(${dx}px,${dy}px)`; stick.x=dx/max; stick.y=dy/max; };
  base.addEventListener('pointerdown',e=>{ stick.id=e.pointerId; base.setPointerCapture(e.pointerId); move(e); });
  base.addEventListener('pointermove',e=>{ if(e.pointerId===stick.id) move(e); });
  const end=e=>{ if(e.pointerId!==stick.id) return; stick.id=null; stick.x=stick.y=0; knob.style.transform=''; };
  base.addEventListener('pointerup',end); base.addEventListener('pointercancel',end);
  $('#tYap').addEventListener('pointerdown',e=>{ e.preventDefault(); if(!S.paused) yap(); });
  $('#tGrab').addEventListener('pointerdown',e=>{ e.preventDefault(); if(!S.paused) grabOrDrop(); });
  $('#tZoom').addEventListener('pointerdown',e=>{ e.preventDefault(); setZoom(cam.zoomT>1.3?1:1.9); });
  $('#tSneak').addEventListener('pointerdown',e=>{ e.preventDefault(); S.sneakToggle=!S.sneakToggle; $('#tSneak').setAttribute('aria-pressed',String(S.sneakToggle)); });
}

export { keys, stick };
