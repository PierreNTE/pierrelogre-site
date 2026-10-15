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
  // Échap ferme aussi la carte de fin de partie (continuer) et celle du mini-jeu (retour au terrain)
  if(!$('#endCard').hidden){ if(e.key==='Escape'){ const b=!$('#contBtn').hidden?$('#contBtn'):null; if(b){ e.preventDefault(); b.click(); } } return; }
  if(!$('#mgEnd').hidden){ if(e.key==='Escape'&&e.target!==$('#mgPseudo')){ e.preventDefault(); $('#mgQuit').click(); } return; }
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
/* Joystick flottant : toute la moitié basse gauche de l'écran répond. Si le pouce se pose dans le cercle, il le prend
   où il est ; sinon le cercle vient se placer sous le pouce. Petite zone morte au centre, course près du bord. */
const stick={x:0,y:0,id:null};
const DEAD=.12;
{
  const zone=$('#stickZone'), base=$('#stick'), knob=$('#knob');
  let cx=0, cy=0, max=51;
  const move=e=>{ let dx=e.clientX-cx, dy=e.clientY-cy; const m=Math.hypot(dx,dy);
    if(m>max){ dx*=max/m; dy*=max/m; } knob.style.transform=`translate(${dx}px,${dy}px)`;
    const raw=Math.min(1,m/max), k=raw<DEAD?0:(raw-DEAD)/(1-DEAD);
    stick.x=m>0?dx/Math.min(m,max)*k:0; stick.y=m>0?dy/Math.min(m,max)*k:0; };
  zone.addEventListener('pointerdown',e=>{
    if(stick.id!=null||S.paused) return; e.preventDefault();
    base.style.transform=''; const r=base.getBoundingClientRect(), R=r.width/2, rx=r.left+R, ry=r.top+R; max=R-14;
    if(Math.hypot(e.clientX-rx,e.clientY-ry)<R*1.1){ cx=rx; cy=ry; }
    else { cx=Math.max(R+6,Math.min(innerWidth-R-6,e.clientX)); cy=Math.max(R+6,Math.min(innerHeight-R-6,e.clientY)); base.style.transform=`translate(${cx-rx}px,${cy-ry}px)`; }
    stick.id=e.pointerId; try{ zone.setPointerCapture(e.pointerId); }catch(err){ /* pointeur déjà relâché */ }
    base.classList.add('on'); fox.idle=0; move(e); });
  zone.addEventListener('pointermove',e=>{ if(e.pointerId===stick.id) move(e); });
  const end=e=>{ if(e.pointerId!==stick.id) return; stick.id=null; stick.x=stick.y=0; knob.style.transform=''; base.style.transform=''; base.classList.remove('on'); };
  zone.addEventListener('pointerup',end); zone.addEventListener('pointercancel',end); zone.addEventListener('lostpointercapture',end);
  // Boutons : réaction immédiate au toucher (pointerdown), enfoncement visible
  const press=(id,fn)=>{ const b=$(id); b.addEventListener('pointerdown',e=>{ e.preventDefault(); b.classList.add('down'); fn(); });
    for(const ev of ['pointerup','pointercancel','pointerleave']) b.addEventListener(ev,()=>b.classList.remove('down')); };
  press('#tYap',()=>{ if(!S.paused) yap(); });
  press('#tGrab',()=>{ if(!S.paused) grabOrDrop(); });
  press('#tZoom',()=>setZoom(cam.zoomT>1.3?1:1.9));
  press('#tSneak',()=>{ S.sneakToggle=!S.sneakToggle; $('#tSneak').setAttribute('aria-pressed',String(S.sneakToggle)); });
}
export { keys, stick };
