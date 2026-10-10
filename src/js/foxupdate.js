import * as THREE from 'three';
import { dropHeld, foxForward } from './actions.js';
import { SFX, STEP } from './audio.js';
import { RM, flat2, resolve } from './engine.js';
import { fox, inPatch, stamp } from './fox.js';
import { emit } from './fx.js';
import { addProgress, onProgress, say } from './hud.js';
import { keys, stick } from './input.js';
import { interacts, items, props } from './items.js';
import { npcs } from './npc.js';
import { onPath } from './regions/kit.js';
import { lerpAngle } from './npclogic.js';
import { S, rnd, run, t } from './state.js';
import { MUD, OFFICE, SERVER } from './world.js';

/* =====================================================================
   Renard : mise à jour
   ===================================================================== */
// Petite fête après chaque bêtise : un saut avec un tour sur lui-même
onProgress(()=>{ fox.celebT=.8; });
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
/** Angle (relatif au renard) vers la chose intéressante la plus proche : PNJ, objet, interaction. */
function lookTarget(){
  let best=null, bd=4.2;
  const consider=(x,z)=>{ const d=Math.hypot(x-fox.pos.x,z-fox.pos.z); if(d<bd&&d>.6){ const rel=wrapA(Math.atan2(x-fox.pos.x,z-fox.pos.z)-fox.yaw); if(Math.abs(rel)<1.7){ bd=d; best=rel; } } };
  for(const n of npcs) if(n.group.visible) consider(n.pos.x,n.pos.z);
  for(const it of items) if(!it.gone&&!it.held&&it.mesh.visible) consider(it.pos.x,it.pos.z);
  for(const ia of interacts) consider(ia.pos.x,ia.pos.z);
  return best;
}
let lookCd=0, lookRel=null;
function updateFox(dt){
  let ix=0, iz=0;
  if(keys.KeyW||keys.KeyZ||keys.ArrowUp) iz-=1;
  if(keys.KeyS||keys.ArrowDown) iz+=1;
  if(keys.KeyA||keys.KeyQ||keys.ArrowLeft) ix-=1;
  if(keys.KeyD||keys.ArrowRight) ix+=1;
  ix+=stick.x; iz+=stick.y;
  let m=Math.hypot(ix,iz); if(m>1){ ix/=m; iz/=m; m=1; }
  // Étourdi après s'être fait attraper : pas de contrôle pendant un court instant
  if(fox.stunT>0){ fox.stunT-=dt; ix=iz=0; m=0; }
  fox.sneaking=!!(keys.KeyC||S.sneakToggle);
  fox.sneak+=((fox.sneaking?1:0)-fox.sneak)*Math.min(1,dt*10);
  const running=!fox.sneaking&&(keys.ShiftLeft||keys.ShiftRight||(!S.sneakToggle&&Math.hypot(stick.x,stick.y)>.85));
  const speed=(fox.sneaking?2:running?7.6:4.4)*(fox.held&&fox.held.kind==='prise'?.75:1)*(fox.speedK||1);
  fox.running=running;
  fox.vel.x+=(ix*speed-fox.vel.x)*Math.min(1,dt*12); fox.vel.z+=(iz*speed-fox.vel.z)*Math.min(1,dt*12);
  const bx=fox.pos.x, bz=fox.pos.z;
  fox.pos.addScaledVector(fox.vel,dt); resolve(fox.pos,fox.r);
  const v=Math.hypot(fox.vel.x,fox.vel.z);
  if(m>.1){ fox.yaw=lerpAngle(fox.yaw,Math.atan2(ix,iz),Math.min(1,dt*14)); fox.idle=0; } else fox.idle+=dt;
  // pousser les objets
  for(const p of props){
    const dx=p.pos.x-fox.pos.x, dz=p.pos.z-fox.pos.z, d=Math.hypot(dx,dz), mn=p.r+fox.r;
    if(d<mn&&d>1e-4){ const push=mn-d; p.pos.x+=dx/d*push*.85; p.pos.z+=dz/d*push*.85; fox.pos.x-=dx/d*push*.15; fox.pos.z-=dz/d*push*.15;
      p.vel.set(dx/d*v*.6,0,dz/d*v*.6);
      if(p.kind==='pot'&&!p.knocked&&v>5) knockPot(p,dx/d,dz/d);
      if(p.kind==='chair'&&!(p.scr>0)&&v>1){ p.scr=.5; SFX.scrape(); p.spin=rnd(-4,4); } }
  }
  // ---------- animation ----------
  const ph0=fox.phase; fox.phase+=dt*v*2.6;
  if(v>.8&&!fox.sneaking&&Math.floor(fox.phase/Math.PI)!==Math.floor(ph0/Math.PI)) STEP[surfaceAt(fox.pos)]?.();
  animateFox(dt,v);
  // Poussière sous les pattes quand il court
  if(v>6.4&&!RM&&Math.floor(fox.phase/Math.PI)!==Math.floor(ph0/Math.PI)){ const f=foxForward(); emit(new THREE.Vector3(fox.pos.x-f.x*.45,.08,fox.pos.z-f.z*.45),onPath(fox.pos.x,fox.pos.z)?'#e3d6b2':'#d9dcb8',{n:2,spd:.7,up:.6,life:.45,grav:-.4,size:.55}); }
  // traces de pas
  const inMud=flat2(fox.pos,MUD)<MUD.r, inSoil=inPatch(fox.pos)||flat2(fox.pos,{x:-8,z:13.9})<1.6;
  if(inMud){ if(fox.muddy<5.5&&v>1) SFX.mud(); fox.muddy=6; }
  fox.muddy-=dt;
  if(v>.8&&(inSoil||fox.muddy>0)){
    fox.stepAcc+=Math.hypot(fox.pos.x-bx,fox.pos.z-bz);
    if(fox.stepAcc>.42){ fox.stepAcc=0; fox.stepSide*=-1; const f=foxForward(); stamp(fox.pos.x+f.z*.12*fox.stepSide,fox.pos.z-f.x*.12*fox.stepSide,inPatch(fox.pos)?.05:.035,fox.yaw,!inSoil); }
  }
  if(fox.held){
    fox.mouth.getWorldPosition(fox.held.pos); fox.held.mesh.rotation.set(0,fox.yaw,0);
    if(fox.held.kind==='prise'&&Math.hypot(fox.held.pos.x-SERVER.socket.x,fox.held.pos.z-SERVER.socket.z)>5.5){ dropHeld(); say(fox,t().cable,'',1.4,1.9); }
  }
}

/* ---------- Animation du renard ----------
   Allures : trot en diagonale (marche), bond (course : les pattes avant puis arrière ensemble), pas feutrés (discrétion).
   La patte qui avance se soulève (et le jarret se plie) ; le corps roule un peu, penche dans les virages, se cabre
   en accélérant ; la tête compense le balancement ; oreilles, queue et paupières vivent indépendamment. */
const lerp=(a,b,k)=>a+(b-a)*k, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TROT=[0,Math.PI,Math.PI,0], BOUND=[0,.35,Math.PI,Math.PI+.35];
const A={ blinkT:2.5, blink:0, acc:0, pv:0, lean:0 };
function animateFox(dt,v){
  const now=performance.now()/1000;
  const walkK=clamp(v/4.4,0,1), runK=clamp((v-4.6)/2.6,0,1)*(1-fox.sneak);
  const sitting=fox.idle>4&&!fox.held;
  fox.sit+=((sitting?1:0)-fox.sit)*Math.min(1,dt*4);
  const s=fox.sit, cyc=(fox.idle-4)%14;
  const scratching=sitting&&cyc>3&&cyc<5.2, yawning=sitting&&cyc>8&&cyc<9.8;
  const crouch=fox.sneak*(1-s), carry=fox.held?1:0;
  // allure : décalage de phase de chaque patte (trot → bond), amplitude, levée de la patte qui avance
  const amp=(.5*walkK+.22*runK)*(1-s)*(1-.35*crouch), lift=(.06+.05*runK+.04*crouch)*walkK*(1-s);
  fox.legs.forEach((l,i)=>{
    const ph=fox.phase+lerp(TROT[i],BOUND[i],runK), sw=Math.sin(ph), up=Math.max(0,-Math.cos(ph));
    const hindL=i>1;
    // pose assise : pattes avant droites (compensent le corps cabré), pattes arrière repliées sous la cuisse
    const sitRot=hindL?.25:.3, sitKnee=-1.45;
    let rx=sw*amp+sitRot*s;
    if(hindL&&i===3&&scratching) rx=-.5+Math.sin(now*25)*.35;
    l.rotation.x+=(rx-l.rotation.x)*(dt?Math.min(1,dt*18):1);
    l.position.y=l.userData.y0+up*lift;
    l.scale.y=1+(hindL?0:.12*s);
    if(l.knee){ const kr=up*lift*5+.08*walkK+sitKnee*s+(i===3&&scratching?.6:0); l.knee.rotation.x+=(kr-l.knee.rotation.x)*(dt?Math.min(1,dt*18):1); }
  });
  // petit saut (prise d'objet, coup de pied), fête, écrasement à l'atterrissage
  fox.hopT-=dt; const hop=fox.hopT>0?Math.sin((1-fox.hopT/.3)*Math.PI)*.35:0;
  if(fox.hopT>0) fox.wasHop=true; else if(fox.wasHop){ fox.wasHop=false; fox.squash=1; }
  fox.squash=Math.max(0,(fox.squash||0)-dt*6); const sq=Math.sin((fox.squash||0)*Math.PI)*.12;
  // accélération (lissée) : le corps se cabre en démarrant, plonge un peu en freinant
  if(dt){ const a=(v-A.pv)/dt; A.pv=v; A.acc+=(clamp(a,-30,30)-A.acc)*Math.min(1,dt*6); }
  // virage : inclinaison vers l'intérieur
  const yr=dt?wrapA(fox.yaw-(fox.pyaw??fox.yaw))/dt:0; fox.pyaw=fox.yaw;
  A.lean+=(clamp(-yr*.045,-.16,.16)*Math.min(1,v/3)-A.lean)*Math.min(1,dt*8);
  // corps
  const bob=Math.abs(Math.sin(fox.phase))*.055*walkK*(1-runK)*(1-crouch*.5), rock=Math.sin(fox.phase*2)*.07*runK;
  const breathe=Math.sin(now*2.1)*.012*(1-walkK);
  fox.body.position.y=bob+Math.max(0,Math.sin(fox.phase*2+.6))*.06*runK+hop-.15*crouch-.05*s;
  fox.body.position.z=.06*s;
  fox.body.rotation.x=(-.03*runK+rock-A.acc*.004)*(1-s)-.32*s+.04*crouch;
  fox.body.rotation.z=A.lean+Math.sin(fox.phase)*.03*walkK*(1-runK);
  const st=Math.min(1,v/7.6)*(1-s);
  fox.body.scale.set(1+sq*.8-st*.02,1-sq-st*.03+breathe,1+sq*.5+st*.07);
  // tête : compense le balancement, plus basse et en avant quand il se faufile, relevée quand il porte un objet
  fox.yapT-=dt; fox.grabT=Math.max(0,(fox.grabT||0)-dt);
  const dip=fox.grabT>0?Math.sin((1-fox.grabT/.35)*Math.PI)*.45:0;
  const headX=(fox.yapT>0?-.45:yawning?-.55:scratching?.25:Math.sin(now*1.1)*.04)+.3*s*(scratching?0:1)+.22*crouch-.12*carry-rock*.8+.06*runK+dip;
  fox.head.rotation.x+=(headX-fox.head.rotation.x)*(dt?Math.min(1,dt*14):1);
  fox.head.position.y=.98-bob*.6-.1*crouch; fox.head.position.z=.6+.06*crouch;
  fox.head.rotation.z=scratching?Math.sin(now*20)*.08+.2:-A.lean*.6;
  fox.jaw.rotation.x+=((fox.yapT>0?.5:yawning?.75:0)-fox.jaw.rotation.x)*Math.min(1,dt*16||1);
  // oreilles : vivent seules, se couchent en courant, en se faufilant, en jappant
  fox.earT-=dt; if(fox.earT<-.18) fox.earT=rnd(1.5,4.5);
  fox.ears.forEach((e,i)=>{ const tgt=fox.yapT>0?-.7:(fox.earT<0&&i===0?-.55:0)+(yawning?-.4:0)-1.0*crouch-.55*runK+Math.sin(fox.phase*2+i)*.06*walkK; e.rotation.x+=(tgt-e.rotation.x)*Math.min(1,dt*20||1); });
  // paupières : clignement toutes les 2 à 5 s (yeux mi-clos en baillant)
  A.blinkT-=dt; if(A.blinkT<0){ A.blink=.14; A.blinkT=rnd(2,5); } A.blink=Math.max(0,A.blink-dt);
  const eyeY=A.blink>0?.12:yawning?.35:fox.stunT>0?.6:1; fox.eyes.scale.y+=(eyeY-fox.eyes.scale.y)*Math.min(1,dt*30||1);
  if(fox.stunT>0) fox.head.rotation.z=Math.sin(now*18)*.25;
  // queue : balancement au pas, tendue en arrière à la course, basse et immobile quand il se faufile,
  // enroulée sur le côté quand il est assis ; inertie dans les virages (ressort amorti)
  fox.wagT-=dt; const wag=fox.wagT>0;
  const tailAmp=(wag?.55:.25*(v>.5?1:.45))*(1-.7*crouch)*(1-.6*runK), tailF=wag?24:5.5;
  if(dt){ fox.tsv=(fox.tsv||0)+((-Math.max(-6,Math.min(6,yr))*.11-(fox.tsx||0))*55-(fox.tsv||0)*8)*dt; fox.tsx=(fox.tsx||0)+fox.tsv*dt; }
  fox.tailSegs.forEach((sg,i)=>{ sg.rotation.y=Math.sin(now*tailF-i*.9)*tailAmp*(1+i*.35)+(fox.tsx||0)*(.7+i*.35)+s*(.45+i*.25); });
  fox.tail.rotation.x=-.16-.12*runK+(wag?-.1:0)+.75*s+.38*crouch+Math.sin(fox.phase*2)*.08*walkK;
  // lookTarget : la tête se tourne vers ce qui est intéressant à proximité (PNJ, objets)
  lookCd-=dt; if(lookCd<=0){ lookCd=.2; lookRel=v<5&&!scratching&&!fox.held?lookTarget():null; }
  const hy=lookRel==null?0:Math.max(-.7,Math.min(.7,lookRel))*(1-s*.5);
  fox.head.rotation.y+=(hy-fox.head.rotation.y)*Math.min(1,dt*6||1);
  // fête : saut + tour complet (simple saut si les animations sont réduites)
  let spin=0, jump=0;
  if(fox.celebT>0){ fox.celebT=Math.max(0,fox.celebT-dt); const kk=1-fox.celebT/.8, e=kk<.5?2*kk*kk:1-Math.pow(-2*kk+2,2)/2; spin=RM?0:e*Math.PI*2; jump=Math.sin(kk*Math.PI)*.55; if(fox.celebT===0) fox.squash=1; }
  fox.group.position.set(fox.pos.x,(fox.lift||0)+jump,fox.pos.z); fox.group.rotation.y=fox.yaw+spin;
  fox.shadow.position.set(fox.pos.x,(fox.ground||0)+.03,fox.pos.z); const sh=(1-hop*.8-jump*.6)*Math.max(.3,1-((fox.lift||0)-(fox.ground||0))*.25); fox.shadow.scale.set(sh,sh,sh);
}
/** Bruit de pas selon le style du chemin. */
const PATH_STEP={forest:'soil',track:'soil',mx:'soil',sand:'sand',snow:'snow',stone:'cobble',brook:'water'};
/** Les régions ajoutent ici leur propre sol (sable, neige, bois…). */
const surfaceHooks=[];
function surfaceAt(p){
  for(const h of surfaceHooks){ const s=h(p); if(s) return s; }
  if(flat2(p,MUD)<MUD.r) return 'mud';
  if(inPatch(p)||flat2(p,{x:-8,z:13.9})<1.6) return 'soil';
  if(p.x>OFFICE.minX&&p.x<OFFICE.maxX&&p.z>OFFICE.minZ&&p.z<OFFICE.maxZ) return 'tile';
  if(Math.abs(p.x+4)<4.5&&Math.abs(p.z)<4.5) return 'cobble';
  const ps=onPath(p.x,p.z); if(ps) return PATH_STEP[ps]||'gravel';
  return 'grass';
}
function knockPot(p,nx,nz){
  p.knocked=true; p.fall=0; p.axis.set(nz,0,-nx).normalize(); p.vel.set(nx*3,0,nz*3);
  SFX.crack(); emit(new THREE.Vector3(p.pos.x,.4,p.pos.z),'#7a5236',{n:12,spd:2,up:3}); emit(new THREE.Vector3(p.pos.x,.4,p.pos.z),'#c9714a',{n:6,spd:2.5,up:3});
  say({anchor:new THREE.Vector3(p.pos.x,1.5,p.pos.z)},t().crack,'',.9,0,'pot'+p.id);
  if(!run.knockedPots.includes(p.id)) run.knockedPots.push(p.id); if(p.onKnock) p.onKnock(p); addProgress(p.goal||'pots',p.id);
}
const easeOutBounce=x=>{ const n1=7.5625,d1=2.75; if(x<1/d1) return n1*x*x; if(x<2/d1) return n1*(x-=1.5/d1)*x+.75; if(x<2.5/d1) return n1*(x-=2.25/d1)*x+.9375; return n1*(x-=2.625/d1)*x+.984375; };
function updateProps(dt){
  for(const p of props){
    // objets d'un lieu pas encore ouvert : immobiles (sa zone praticable n'existe pas encore : la collision les
    // aurait ramenés au bord du village)
    if(p.region&&!p.live) continue;
    if(p.scr>0) p.scr-=dt;
    p.pos.addScaledVector(p.vel,dt); p.vel.multiplyScalar(Math.pow(p.kind==='pot'?.08:.02,dt)); resolve(p.pos,p.r);
    if(p.kind==='pot'){
      if(p.knocked&&p.fall<1){ p.fall=Math.min(1,p.fall+dt*4); p.g.quaternion.setFromAxisAngle(p.axis,Math.PI/2*easeOutBounce(p.fall)); }
      p.g.position.set(p.pos.x,p.knocked?.3*Math.min(1,p.fall*1.5):0,p.pos.z);
    } else { p.g.rotation.y+=p.spin*dt; p.spin*=Math.pow(.05,dt); p.g.position.set(p.pos.x,0,p.pos.z); }
    p.sh.position.set(p.pos.x,.03,p.pos.z);
  }
}

export { surfaceHooks, updateFox, surfaceAt, knockPot, easeOutBounce, updateProps };
