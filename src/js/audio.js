import { fox } from './fox.js';
import { DAY, S, rnd, saved, store } from './state.js';

/* =====================================================================
   Audio
   ===================================================================== */
let actx=null;
// Le son ne démarre qu'après un geste de l'utilisateur (règle des navigateurs) : sinon, après un rechargement automatique,
// chaque tentative laisserait un avertissement dans la console. Le premier clic ou la première touche le lance.
const gestured=()=>!navigator.userActivation||navigator.userActivation.hasBeenActive;
function audio(){ if(!gestured()) return actx; if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx&&actx.state==='suspended') actx.resume(); return actx; }
for(const ev of ['pointerdown','keydown']) addEventListener(ev,()=>audio(),{once:true,capture:true});
let VOL=1;   // atténuation par la distance (voir SFX.at)
function tone(f0,f1,dur,type='sine',vol=.2,delay=0){
  const a=actx; if(!a||S.muted||VOL<=0) return; vol*=VOL;
  const tt=a.currentTime+delay, o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,tt); o.frequency.exponentialRampToValueAtTime(Math.max(f1,30),tt+dur);
  g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(vol,tt+.015); g.gain.exponentialRampToValueAtTime(0.0001,tt+dur);
  o.connect(g).connect(a.destination); o.start(tt); o.stop(tt+dur+.02);
}
function noise(dur,vol=.2,freq=900,delay=0,q=1){
  const a=actx; if(!a||S.muted||VOL<=0) return; vol*=VOL;
  const b=a.createBuffer(1,Math.max(1,a.sampleRate*dur|0),a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain();
  f.type='bandpass'; f.frequency.value=freq; f.Q.value=q; g.gain.value=vol; s.buffer=b; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime+delay);
}
/* Musique générative douce (pentatonique) */
const MUSIC={on:saved.music!==false, gain:null, next:0, step:0, timer:null};
function note(f,t0,dur,type,vol,dest){ const a=actx, o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g).connect(dest); o.start(t0); o.stop(t0+dur+.05); }
const PROG=[[130.81,[261.63,293.66,329.63,392,440,523.25]],[110,[261.63,329.63,392,440,523.25,587.33]],[87.31,[261.63,293.66,349.23,440,523.25]],[98,[293.66,392,440,493.88,587.33]]];
/* Ambiances musicales par région : tempo, accords, timbres, batterie, valse… */
const AM=[[110,[220,261.63,293.66,329.63,392,440]],[98,[196,246.94,293.66,329.63,392]],[87.31,[220,261.63,349.23,392,440]],[82.41,[246.94,293.66,329.63,392,493.88]]];
const MAJ=[[130.81,[261.63,329.63,392,523.25,659.25]],[174.61,[349.23,440,523.25,698.46]],[196,[392,493.88,587.33,783.99]],[130.81,[329.63,392,523.25,659.25]]];
const STYLES={
  village:{bpm:96,prog:PROG,lead:'triangle',lv:.05,bass:'sine'},
  foret:{bpm:80,prog:AM,lead:'sine',lv:.06,bass:'sine',sparse:.4},
  sport:{bpm:122,prog:MAJ,lead:'square',lv:.025,bass:'triangle',drum:1},
  moto:{bpm:136,prog:[[82.41,[164.81,196,246.94,329.63]],[73.42,[146.83,185,220,293.66]],[98,[196,246.94,293.66,392]],[110,[220,261.63,329.63,440]]],lead:'square',lv:.022,bass:'sawtooth',bv:.05,drum:2},
  riviere:{bpm:88,prog:PROG,lead:'sine',lv:.06,bass:'sine',sparse:.35},
  plage:{bpm:90,prog:[[146.83,[293.66,369.99,440,587.33,739.99]],[123.47,[246.94,293.66,369.99,493.88]],[98,[293.66,392,493.88,587.33]],[110,[277.18,329.63,440,554.37]]],lead:'triangle',lv:.05,bass:'sine'},
  gare:{bpm:100,prog:PROG,lead:'triangle',lv:.045,bass:'triangle'},
  nantes:{bpm:108,prog:[[110,[220,261.63,329.63,440,523.25]],[146.83,[293.66,349.23,440,587.33]],[164.81,[329.63,415.3,493.88,659.25]],[110,[261.63,329.63,440,523.25]]],lead:'square',lv:.02,bass:'triangle',arp:1},
  paris:{bpm:156,prog:[[130.81,[261.63,329.63,392,523.25]],[98,[293.66,349.23,392,493.88]],[130.81,[329.63,392,523.25,659.25]],[87.31,[349.23,440,523.25,698.46]]],lead:'sawtooth',lv:.018,bass:'triangle',waltz:1},
  montagne:{bpm:70,prog:AM,lead:'sine',lv:.07,bass:'sine',sparse:.3,bell:1},
  cloud:{bpm:112,prog:AM,lead:'square',lv:.018,bass:'sawtooth',bv:.04,arp:1},
  ile:{bpm:100,prog:MAJ,lead:'triangle',lv:.06,bass:'sine',bell:1},
  terrier:{bpm:72,prog:PROG,lead:'sine',lv:.055,bass:'sine',sparse:.35,bell:1},
};
let style=STYLES.village, styleKey='village';
/** Change d'ambiance (appelé quand le renard change de région). */
function setMood(m){ const k=(m&&m.music)||'village'; S.mood=m; if(k===styleKey) return; styleKey=k; style=STYLES[k]||STYLES.village; MUSIC.step=0; }
let melIdx=2;
function musicTick(){
  // coupé : on garde l'horloge de la musique à l'heure (sinon toutes les notes manquées partent d'un coup à la reprise)
  if(!actx||!MUSIC.on||S.muted){ if(actx&&MUSIC.gain) MUSIC.next=Math.max(MUSIC.next,actx.currentTime+.05); return; }
  if(!MUSIC.gain){ MUSIC.gain=actx.createGain(); MUSIC.gain.gain.value=.5; MUSIC.gain.connect(actx.destination); MUSIC.next=actx.currentTime+.1; }
  const st0=style, per=st0.waltz?6:8, spb=60/st0.bpm/2;
  while(MUSIC.next<actx.currentTime+.4){
    const t0=MUSIC.next, st=MUSIC.step, bar=(st/per|0)%st0.prog.length, [bass,scale]=st0.prog[bar], b=st%per;
    if(st0.waltz){ if(b===0) note(bass,t0,spb*1.8,st0.bass,.09,MUSIC.gain); if(b===2||b===4){ note(scale[1],t0,spb*.9,'triangle',.03,MUSIC.gain); note(scale[2],t0,spb*.9,'triangle',.03,MUSIC.gain); } }
    else { if(b===0) note(bass,t0,spb*7,st0.bass,st0.bv||.09,MUSIC.gain); if(b===4) note(bass*1.5,t0,spb*3,st0.bass,(st0.bv||.09)*.55,MUSIC.gain); }
    if(st0.arp){ note(scale[st%scale.length],t0,spb*.8,st0.lead,st0.lv,MUSIC.gain); }
    else if(Math.random()<(st0.sparse||.55)){ melIdx=Math.max(0,Math.min(scale.length-1,melIdx+(Math.random()*3|0)-1)); note(scale[melIdx],t0,spb*(st0.bell?3:1.8),st0.lead,st0.lv,MUSIC.gain); if(st0.bell) note(scale[melIdx]*2,t0,spb*2,'sine',st0.lv*.3,MUSIC.gain); }
    if(st0.drum){ const d=t0-actx.currentTime; if(b%4===0) tone(140,45,.18,'sine',.09,d); if(b%2===1) noise(.03,.03,7000,d,1); if(st0.drum===2&&b%4===2) noise(.09,.07,1800,d,1); }
    else if(st%2===0&&Math.random()<.3) note(scale[0]*2,t0,.05,'square',.008,MUSIC.gain);
    MUSIC.step++; MUSIC.next+=spb;
  }
}
setInterval(musicTick,150);
function setMusic(on){ MUSIC.on=on; saved.music=on; store.set(saved); if(MUSIC.gain&&actx) MUSIC.gain.gain.setTargetAtTime(on?.5:0,actx.currentTime,.2); if(on&&actx) MUSIC.next=Math.max(MUSIC.next,actx.currentTime+.05); }
const STEP={
  sand(){ noise(.07,.05,1200,0,.6); }, snow(){ noise(.09,.07,1800,0,.7); }, wood(){ tone(260,200,.05,'triangle',.06); }, asphalt(){ noise(.04,.05,3000,0,1.2); }, metal(){ tone(1200,900,.04,'square',.025); },
  grass(){ noise(.06,.05,2200,0,.8); }, gravel(){ noise(.05,.09,3600,0,1.6); }, cobble(){ tone(820,560,.035,'triangle',.05); noise(.03,.04,4200,0,2); },
  tile(){ tone(1500,1150,.03,'sine',.05); }, soil(){ noise(.08,.09,420,0,1); }, mud(){ noise(.12,.14,260,0,3); },
  water(){ noise(.14,.1,1300,0,1.4); tone(700,1100,.06,'sine',.03,.02); },
};
/* Nappes d'ambiance continues (bruit filtré en boucle, fondu selon la région, la pluie et l'heure) :
   vent dans les feuilles, eau qui court, ressac, rumeur de foule ou de ville, pluie. */
let beds=null, bedAcc=0;
function makeBeds(){
  const a=actx, len=a.sampleRate*3, b=a.createBuffer(1,len,a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  const mk=(type,freq,q)=>{ const s=a.createBufferSource(); s.buffer=b; s.loop=true; s.loopStart=Math.random(); const f=a.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q; const g=a.createGain(); g.gain.value=0; s.connect(f).connect(g).connect(a.destination); s.start(); return {s,f,g}; };
  beds={ wind:mk('bandpass',900,.6), water:mk('bandpass',2300,1.3), surf:mk('lowpass',480,.7), crowd:mk('bandpass',640,1.2), city:mk('lowpass',260,.8), rain:mk('highpass',2600,.4) };
}
const BED={ village:{wind:.009}, foret:{wind:.016}, riviere:{wind:.007,water:.026}, plage:{surf:.06,wind:.005}, ile:{surf:.06,wind:.004}, gare:{wind:.009}, sport:{crowd:.012,wind:.005},
  moto:{wind:.009,crowd:.005}, nantes:{city:.03,crowd:.004}, paris:{city:.034,crowd:.006}, montagne:{wind:.03}, cloud:{city:.012} };
function updateBeds(dt){
  if(!actx) return; if(!beds) makeBeds(); if((bedAcc+=dt)<.12) return; bedAcc=0;
  const now=actx.currentTime, z=BED[styleKey]||{}, on=!S.muted;
  for(const k in beds){
    let v=on?(z[k]||0):0;
    if(k==='wind') v*= .7+.3*Math.sin(now*.23)+.15*Math.sin(now*.71+1);
    if(k==='surf') v*= .2+.8*Math.pow(Math.max(0,Math.sin(now*.9)),2);
    if(k==='water') v*= .85+.15*Math.sin(now*3.1);
    if(k==='crowd') v*= 1-.6*DAY.eve;
    if(k==='rain') v= on? .05*DAY.rain : 0;
    beds[k].g.gain.setTargetAtTime(Math.max(0,v), now, .5);
  }
  beds.wind.f.frequency.setTargetAtTime(styleKey==='montagne'? 520+260*Math.sin(now*.17) : 900+200*Math.sin(now*.31), now, .6);
}
let birdCd=4, ambCd=3, nightCd=2;
/** Bruits d'ambiance selon la région (oiseaux, vagues, moteurs, foule…), l'heure et la pluie. */
function ambience(dt){
  if(!actx) return; updateBeds(dt); if(S.muted) return; birdCd-=dt; ambCd-=dt; nightCd-=dt;   // les nappes se taisent aussi quand le son est coupé
  const k=styleKey, day=DAY.eve<.45&&DAY.rain<.5;
  // Oiseaux (le jour) : mésanges, merle qui siffle une phrase, coucou et pigeon ramier en forêt
  if(birdCd<0){ birdCd=rnd(4,9); if(day&&((k==='village'&&fox.pos.x<4)||k==='foret'||k==='riviere'||k==='gare')){
    const r=Math.random();
    if(r<.45){ const f=rnd(2400,3400); for(let i=0;i<3;i++) tone(f,f*1.25,.07,'sine',.025,i*.11); }
    else if(r<.75){ let t0=0; for(let i=0;i<5;i++){ const f=rnd(1300,2600), d=rnd(.08,.18); tone(f,f*rnd(.8,1.3),d,'sine',.03,t0); t0+=d+rnd(.02,.08); } }
    else if(k==='foret'&&r<.88){ tone(745,740,.26,'sine',.045); tone(590,585,.36,'sine',.045,.34); }
    else { for(let i=0;i<3;i++) tone(430,400,i===1?.34:.22,'sine',.03,i*.42); } } }
  // Le soir : grillons dans les prés, hibou en forêt
  if(nightCd<0){ nightCd=rnd(.7,2); if(DAY.eve>.4&&DAY.rain<.5){
    if(k==='foret'&&Math.random()<.12){ tone(400,380,.45,'sine',.05); tone(380,360,.3,'sine',.04,.75); tone(390,370,.3,'sine',.04,1.1); }
    else if(k!=='montagne'&&k!=='cloud'&&k!=='paris'&&k!=='nantes'){ const f=rnd(4200,4700); for(let i=0;i<3+(Math.random()*3|0);i++) tone(f,f,.025,'square',.006*DAY.eve,i*.05); } } }
  if(ambCd<0){
    ambCd=rnd(2.5,6);
    if(k==='plage'||k==='ile'){ noise(2.4,.05,500,0,.6); if(Math.random()<.5){ const f=rnd(1300,1700); tone(f,f*.7,.25,'sawtooth',.012); tone(f*.9,f*.6,.25,'sawtooth',.01,.3); } }
    else if(k==='sport'){ noise(1.4,.035,900,0,.5); if(Math.random()<.3) tone(2600,2500,.25,'square',.012); }
    else if(k==='moto'){ const f=rnd(90,140); tone(f,f*1.8,1.2,'sawtooth',.02); tone(f*1.01,f*1.7,1.2,'square',.008); }
    else if(k==='paris'){ if(Math.random()<.4){ tone(1900,1900,.08,'triangle',.03); tone(1900,1900,.08,'triangle',.03,.14); } else noise(1.2,.02,700,0,.5); }
    else if(k==='nantes'){ for(let i=0;i<3;i++) noise(.06,.05,1400,i*.3,6); tone(70,55,.6,'sawtooth',.02,.1); }
    else if(k==='montagne'){ noise(3,.03,400,0,.4); }
    else if(k==='cloud'){ tone(55,55,1.5,'sine',.02); }
    else if(k==='foret'&&Math.random()<.25){ tone(420,380,.25,'sine',.04); tone(380,340,.35,'sine',.04,.35); }
  }
}
const SFX = {
  yap(){ const p=1+Math.random()*.15; tone(700*p,1500*p,.09,'sawtooth',.16); tone(1300*p,800*p,.12,'square',.07,.07); },
  grab(){ tone(300,700,.08,'triangle',.25); }, drop(){ tone(500,200,.1,'triangle',.2); },
  pull(){ noise(.25,.35,500); tone(200,500,.15,'triangle',.2,.05); },
  splash(){ noise(.5,.4,1200); tone(900,200,.3,'sine',.12); },
  mud(){ noise(.18,.3,300,0,2); },
  scribble(){ noise(.35,.22,3000); },
  alarm(){ for(let i=0;i<3;i++){ tone(880,880,.12,'square',.07,i*.25); tone(660,660,.12,'square',.07,i*.25+.12);} },
  shout(){ tone(400,250,.25,'sawtooth',.05); },
  crack(){ noise(.12,.5,2200,0,3); noise(.3,.3,700,.05); tone(300,90,.2,'triangle',.15); },
  scrape(){ noise(.22,.12,1500,0,4); },
  printer(){ for(let i=0;i<8;i++){ noise(.12,.18,2600,i*.16,6); tone(180,190,.1,'square',.03,i*.16); } },
  flutter(){ for(let i=0;i<6;i++) noise(.05,.25,1800,i*.05,2); },
  slurp(){ tone(200,90,.4,'sawtooth',.08); noise(.4,.2,600,.1); },
  pop(){ tone(500,1200,.08,'sine',.18); },
  question(){ tone(420,620,.12,'sine',.12); tone(620,560,.1,'sine',.08,.12); },
  slip(){ noise(.35,.4,280,0,2); tone(500,120,.5,'sawtooth',.06,.05); noise(.2,.3,600,.3,3); },
  acorn(){ [784,988,1175,1568].forEach((f,i)=>tone(f,f,.16,'triangle',.13,i*.07)); },
  stun(){ [1200,900,1300,800].forEach((f,i)=>tone(f,f*.9,.08,'sine',.07,i*.08)); },
  splashSmall(){ noise(.3,.25,1400,0,1.5); },
  whistle(){ tone(2600,2500,.18,'square',.05); tone(2600,2550,.3,'square',.05,.22); },
  cheer(){ noise(1.6,.12,900,0,.5); noise(1.2,.06,2400,.1,.8); },
  kick(){ tone(180,60,.12,'sine',.25); noise(.05,.15,1500); },
  goal(){ [523,659,784,1047].forEach((f,i)=>tone(f,f,.18,'square',.06,i*.08)); noise(1.4,.1,900,.1,.5); },
  save(){ tone(300,120,.25,'triangle',.18); noise(.15,.2,700); },
  engine(){ tone(90,260,.9,'sawtooth',.05); tone(92,250,.9,'square',.02); },
  horn(){ tone(330,330,.35,'square',.05); tone(415,415,.35,'square',.04); },
  trumpet(){ tone(300,700,.5,'sawtooth',.08); tone(700,520,.7,'sawtooth',.06,.45); },
  clank(){ for(let i=0;i<4;i++) noise(.05,.12,1600+i*300,i*.12,8); tone(80,60,.4,'sawtooth',.04); },
  steam(){ noise(.9,.12,5000,0,.4); },
  bell(){ [1318,1318].forEach((f,i)=>tone(f,f*.98,.6,'sine',.08,i*.35)); },
  train(){ tone(520,520,.6,'triangle',.06); tone(659,659,.6,'triangle',.05); },
  chime(){ [659,523,587,392].forEach((f,i)=>tone(f,f,.4,'sine',.07,i*.35)); },
  coin(){ tone(988,1319,.12,'square',.05); },
  fanfare(){ [523,659,784,1047,784,1047].forEach((f,i)=>tone(f,f,.22,'triangle',.18,i*.12)); },
  // Animaux (voir fauna.js) : joués via SFX.at(position, nom), plus doux au loin
  cluck(){ const f=rnd(380,460); tone(f,f*.8,.06,'square',.035); tone(f*1.1,f*.85,.07,'square',.03,.1); },
  crow(){ tone(560,640,.13,'sawtooth',.045); tone(600,700,.13,'sawtooth',.045,.17); tone(650,880,.16,'sawtooth',.05,.34); tone(880,560,.6,'sawtooth',.05,.52); },
  quack(){ tone(520,360,.13,'sawtooth',.05); noise(.1,.04,900,0,3); tone(500,340,.13,'sawtooth',.045,.2); },
  peep(){ tone(2300,2900,.06,'sine',.035); tone(2500,3100,.06,'sine',.03,.12); },
  hiss(){ noise(.5,.14,4200,0,.7); },
  chatter(){ for(let i=0;i<5;i++) tone(3100,2600,.03,'square',.018,i*.06); },
  clack(){ noise(.03,.08,3800,0,6); noise(.03,.07,3400,.08,6); },
  plop(){ tone(900,300,.12,'sine',.07); noise(.12,.05,1500,.02,2); },
  moo(){ const a=actx; if(!a||S.muted||VOL<=0) return; const t0=a.currentTime, o=a.createOscillator(), lp=a.createBiquadFilter(), g=a.createGain(), v=.11*VOL;
    o.type='sawtooth'; o.frequency.setValueAtTime(125,t0); o.frequency.linearRampToValueAtTime(140,t0+.25); o.frequency.linearRampToValueAtTime(98,t0+1.1);
    lp.type='lowpass'; lp.frequency.setValueAtTime(380,t0); lp.frequency.linearRampToValueAtTime(900,t0+.3); lp.frequency.linearRampToValueAtTime(420,t0+1.1);
    g.gain.setValueAtTime(.0001,t0); g.gain.exponentialRampToValueAtTime(v,t0+.18); g.gain.setValueAtTime(v,t0+.8); g.gain.exponentialRampToValueAtTime(.0001,t0+1.2);
    o.connect(lp).connect(g).connect(a.destination); o.start(t0); o.stop(t0+1.25); },
  /** Joue un son à une position du monde : volume selon la distance au renard (inaudible au-delà de 20 m). */
  at(p,name){ const d=Math.hypot(p.x-fox.pos.x,p.z-fox.pos.z); const k=Math.max(0,1-d/20); if(k<=0||!SFX[name]) return; VOL=k*k; try{ SFX[name](); } finally { VOL=1; } },
};

export { actx, audio, tone, noise, MUSIC, note, PROG, musicTick, setMusic, setMood, STEP, ambience, SFX };
