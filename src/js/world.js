import * as THREE from 'three';
import { CHIMNEYS, bocageBank, cottage, hedgeRow, hydrangea, laundry, oak, path, tree, well } from './regions/kit.js';
import { M, TM, TX, addBox, bake, box, cone, cyl, flat, mk, scene, solidBox, solidCircle, sph, textTex, world } from './engine.js';
import { S, t } from './state.js';

/* =====================================================================
   Monde
   ===================================================================== */
const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(140,110), TM(TX.grass,30)); groundMesh.rotation.x=-Math.PI/2; groundMesh.receiveShadow=true; scene.add(groundMesh);


/* Chemins de terre qui serpentent entre les maisons (le bruit des pas suit les chemins : onPath). */
/** Zones sans végétation (chemins), ajoutées au biome du village. */
export const VILLAGE_NOVEG=[];
const lane=(pts,w,o)=>VILLAGE_NOVEG.push(...path(pts,w,o));
lane([[-35.5,.3],[-32,-.15],[-28,.5],[-24,.15],[-20.5,-.3],[-16.5,.25],[-12.5,-.1],[-8.45,0]],2.4,{fade:[false,false],seed:1});    // rue principale (vers la gare)
lane([[.55,0],[2.6,.15],[5.1,0]],2.4,{fade:[false,false],seed:2});                                                                  // vers le bureau
lane([[-19.9,.6],[-19.3,2.6],[-18.5,4.6],[-18.9,6.9]],1.9,{fade:[false,true],seed:3});                                             // boulangerie
lane([[-20.2,-.6],[-20.6,-2.7],[-19.8,-4.9],[-20,-7.15]],1.7,{fade:[false,false],seed:4});                                         // potager
lane([[-6.5,4.55],[-6.9,6.8],[-7.6,9.1],[-7.1,11.3],[-7.9,13.1]],1.6,{style:'track',fade:[false,true],seed:5});                  // terrier
lane([[-27.6,-.7],[-28,-3.6],[-27.1,-6.6],[-27.5,-9.4],[-26.1,-11.75]],1,{style:'foot',fade:[false,false],seed:6});              // maison aux volets verts
lane([[-8.9,-4.5],[-9.6,-6.9],[-10.3,-9.5],[-11.95,-11.9]],1,{style:'foot',fade:[false,false],seed:7});                          // maison aux volets bleus
lane([[-23.6,.7],[-24.2,3.6],[-24.5,6.6],[-24.6,9.8],[-24.2,11.6],[-24.75,12.45]],1,{style:'foot',fade:[false,false],seed:8});   // maison ocre
/** Ancienne voirie (gardée pour compatibilité) : un chemin droit. */
function road(x,z,w,d){ return lane(w>d?[[x-w/2,z],[x+w/2,z]]:[[x,z-d/2],[x,z+d/2]],Math.min(w,d)); }
flat(9,9,TM(TX.cobble,3),-4,0);
box(9.3,.1,.16,'#b5a684',-4,.05,-4.6,world,false); box(9.3,.1,.16,'#b5a684',-4,.05,4.6,world,false); box(.16,.1,9.3,'#b5a684',-8.6,.05,0,world,false); box(.16,.1,9.3,'#b5a684',.6,.05,0,world,false);
const MUD={x:-11,z:5.3,r:1.15};
{ const m=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshLambertMaterial({color:'#6b4c33'})); m.rotation.x=-Math.PI/2; m.scale.set(MUD.r*1.25,MUD.r,1); m.position.set(MUD.x,.025,MUD.z); m.receiveShadow=true; world.add(m);
  const s=new THREE.Mesh(new THREE.CircleGeometry(.4,12),new THREE.MeshBasicMaterial({color:'#8a6a50'})); s.rotation.x=-Math.PI/2; s.position.set(MUD.x-.3,.03,MUD.z-.2); world.add(s); }
{ const m=new THREE.Mesh(new THREE.CircleGeometry(1.6,18),M('#8c6444')); m.rotation.x=-Math.PI/2; m.position.set(-8,.02,13.9); m.receiveShadow=true; world.add(m); }

// Arbres (automne) : chênes, quelques conifères
const AUTUMN=['#6f9e4f','#d98b3a','#c9a33d','#7fb05c','#e2a548'];
[[-30,-18,1.2],[-24,-19,1,1],[-14,-19,1.1],[-6,-18,1.3,1],[1,-18,1],[-31,-4,1.1,1],[-30,6,1],[-30,19,1.2,1],[-22,20,1],[-2,20,1.1],[2,14,1,1],
 [-12,17,1],[-4,18.6,.9,1],[-11,12.6,.8],[-1,-10,1],[2,8,.9,1],[31,-19,1],[31,19,1.1,1],[-30.4,-14.6,.9],[-17,15,1.1],[-24,16,.9,1]].forEach((a,i)=>tree(a[0],a[1],a[2],a[3]||0,i));

// Haies vives (même emprise qu'avant) et talus de bocage qui ferment l'horizon
function hedge(x,z,len,horiz=true){ if(horiz) hedgeRow(x-len/2,z,x+len/2,z); else hedgeRow(x,z-len/2,x,z+len/2); }
hedge(-12.5,-2.6,6.6); hedge(-13.5,2.6,4.6); hedge(-3.5,-16.5,9);
bocageBank(-33.6,-24,-33.6,-3.4,{oaks:3,seed:5}); bocageBank(-33.6,3.4,-33.6,23.5,{oaks:3,seed:7});      // ouest (trouée vers la gare)
bocageBank(-32.4,-22.6,-22.1,-22.6,{oaks:2,seed:9}); bocageBank(-14.9,-22.6,33,-22.6,{oaks:8,seed:11}); // nord (passage vers la forêt)

// Maisons vendéennes (cheminées : ambient.js)
function house(x,z,o){ return cottage(x,z,o); }
house(-26,-14,{w:5.2,d:3.6,roof:'#c8643c',shutter:'#6f9a6a',wins:[-1.45,1.45],chimney:-1,seed:1});
house(-11,-14,{w:4.4,d:3.2,roof:'#7d8794',slate:true,shutter:'#5b87a8',doorX:-.95,wins:[.95],chimney:1,flowers:'#f6d36b',seed:2});
house(-27,13,{rot:Math.PI/2,w:4.8,d:3.4,wall:'#f1e4c8',roof:'#d07a4a',shutter:'#7f9b8a',doorX:.55,wins:[-1.2],chimney:-1,flowers:'#f6a07a',seed:3});
// Jardins
hydrangea(-29.1,-11.5,1,'#8fa8e0',1); hydrangea(-22.6,-12.4,.85,'#e8a3c0',2);
laundry(-31.2,-9.2,-28.3,-9.2);
hydrangea(-7.8,-14.2,.9,'#a9b8ec',3);
laundry(-8.1,-10.4,-5.5,-10.4,1.7,['#f6efe0','#d6402f','#f6efe0','#8fc9df']);
hydrangea(-24.8,10.1,1,'#e8a3c0',4); hydrangea(-24.7,15.8,.95,'#b9a0d8',5);
well(-21.4,13.4,.4);

// Fontaine
const FOUNTAIN={x:-4,z:0,r:2.3};
// bassin creux : paroi extérieure, margelle arrondie (tore aplati) et eau visible (avant : un disque plein cachait l'eau)
mk(new THREE.CylinderGeometry(2.3,2.5,.6,28,1,true),M('#cfc6b4'),-4,.3,0,world);
{ const rim=mk(new THREE.TorusGeometry(2.2,.2,8,40),M('#c4baa6'),-4,.62,0,world,false); rim.rotation.x=-Math.PI/2; rim.scale.set(1,1,.5); }
const waterMat = new THREE.MeshLambertMaterial({color:'#ffffff', map:TX.water, transparent:true, opacity:.92});
const water=new THREE.Mesh(new THREE.CylinderGeometry(2.08,2.08,.1,28),waterMat); water.position.set(-4,.53,0); scene.add(water);
cyl(.25,.35,1.6,'#cfc6b4',-4,1.1,0,8); cyl(.75,.4,.25,'#cfc6b4',-4,1.9,0,10);
const bowlWater=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.06,12),waterMat); bowlWater.position.set(-4,2.03,0); scene.add(bowlWater);
solidCircle(-4,0,2.4,.9);

// Potager + clôture (portillon au sud)
const PATCH={minX:-23.2,maxX:-16.8,minZ:-10.8,maxZ:-7.2};
flat(6.2,3.4,TM(TX.soil,2,1),-20,-9,.04);
function fenceLine(x0,z0,x1,z1){
  const len=Math.hypot(x1-x0,z1-z0), n=Math.max(1,Math.round(len/1.1)), ang=Math.atan2(x1-x0,z1-z0);
  for(let i=0;i<=n;i++){ const k=i/n; box(.12,.75,.12,'#c9a77a',x0+(x1-x0)*k,.37,z0+(z1-z0)*k); }
  [.3,.6].forEach(y=>{ const r=box(.06,.08,len,'#d8b88a',(x0+x1)/2,y,(z0+z1)/2); r.rotation.y=ang; });
  addBox(Math.min(x0,x1)-.08,Math.max(x0,x1)+.08,Math.min(z0,z1)-.08,Math.max(z0,z1)+.08,.75);
}
fenceLine(PATCH.minX,PATCH.minZ,PATCH.maxX,PATCH.minZ); fenceLine(PATCH.minX,PATCH.minZ,PATCH.minX,PATCH.maxZ); fenceLine(PATCH.maxX,PATCH.minZ,PATCH.maxX,PATCH.maxZ);
fenceLine(PATCH.minX,PATCH.maxZ,-20.85,PATCH.maxZ); fenceLine(-19.15,PATCH.maxZ,PATCH.maxX,PATCH.maxZ);
cyl(.06,.06,1.8,'#8a5a3b',-17.6,.9,-10.2); box(1.1,.08,.08,'#8a5a3b',-17.6,1.4,-10.2); box(.5,.6,.25,'#6f8fb3',-17.6,1.25,-10.2); sph(.22,'#e8cf7a',-17.6,1.75,-10.2); cone(.32,.25,'#c9a33d',-17.6,1.98,-10.2,8);

// Boulangerie
const STALL={x:-19,z:8};
box(4.4,1,1.5,'#d8a86a',STALL.x,.5,STALL.z); box(4.6,.12,1.7,'#b8834a',STALL.x,1.04,STALL.z,world,false);
[-2.1,2.1].forEach(dx=>{ cyl(.08,.08,2.6,'#8a5a3b',STALL.x+dx,1.3,STALL.z+.7,5); cyl(.08,.08,2.6,'#8a5a3b',STALL.x+dx,1.3,STALL.z-.7,5); });
for(let i=0;i<6;i++) box(.76,.1,2,i%2?'#f6efe0':'#d9705a',STALL.x-1.9+i*.76,2.65,STALL.z,world,false);
for(let i=0;i<3;i++){ const b=sph(.32,'#d9a25a',STALL.x+1.2+i*.3,1.3,STALL.z-.3); b.scale.set(1,.7,1); }
{ const slate=textTex(256,180,(g,w,h)=>{ g.fillStyle='#2f3a33'; g.fillRect(0,0,w,h); g.strokeStyle='#8a5a3b'; g.lineWidth=16; g.strokeRect(0,0,w,h); g.fillStyle='#f3efe4'; g.textAlign='center';
    g.font='bold 36px "Patrick Hand",cursive'; g.fillText(S.lang==='fr'?'Pain du jour':'Fresh bread',w/2,72); g.font='30px "Patrick Hand",cursive'; g.fillText('baguette · 1€30',w/2,122); });
  const sl=new THREE.Mesh(new THREE.PlaneGeometry(.9,.64),new THREE.MeshLambertMaterial({map:slate})); sl.position.set(STALL.x-2.62,.75,STALL.z-.86); sl.rotation.y=Math.PI+.3; world.add(sl);
  box(.9,.64,.05,'#8a5a3b',STALL.x-2.6,.75,STALL.z-.82,world,false).rotation.y=.3; }
solidBox(STALL.x,STALL.z,4.4,1.5,1);

// Terrier + panneau
const BURROW={x:-8,z:15.2};
{ // butte herbeuse (plusieurs masses), tablier de terre, pierres et racines autour de l'entrée, jeune chêne au sommet
  const K='#8db466';
  sph(2.6,K,-8,0,17.6,world,2,false).scale.set(1.04,.6,1); sph(1.5,'#89b063',-10.3,0,17.6,world,1,false).scale.set(1,.46,1.1); sph(1.4,'#90b56a',-5.8,0,17.9,world,1,false).scale.set(1,.44,1.1);
  sph(1,'#8c6444',-8,.02,15.2,world,1,false).scale.set(1.25,.18,.62);
  const hole=new THREE.Mesh(new THREE.CircleGeometry(.75,14),new THREE.MeshBasicMaterial({color:'#1f150f'})); hole.position.set(-8,.55,15.38); hole.rotation.x=-.5; hole.scale.set(1,.8,1); world.add(hole);
  mk(new THREE.TorusGeometry(.78,.13,5,14,Math.PI),M('#7a5236'),-8,.55,15.36,world,false).rotation.x=-.5;
  [[-9.05,15.45,.32],[-6.9,15.5,.26],[-9.4,16.1,.2]].forEach(([x,z,r])=>{ const st=sph(r,'#a59d8e',x,r*.35,z,world,0); st.scale.set(1.2,.7,1); });
  [[-.6,.3],[.5,-.4]].forEach(([dx,a])=>{ const rt=cyl(.04,.06,.9,'#6b5440',-8+dx,1.15,15.55,4,world,false); rt.rotation.set(-.9,0,a); });
  [[-9.8,15.6],[-6.3,15.8],[-10.6,17.4],[-5.6,17.8]].forEach(([x,z],i)=>{ sph(.7,'#79a356',x,.45,z); sph(.5,'#86b062',x+.4,.6,z+.2,world,1,false); if(i<2) [0,1,2].forEach(k=>sph(.07,['#f6d36b','#f5f0e6','#f2b8c6'][k],x-.3+k*.3,1.02,z+.25,world,0,false)); });
  oak(-8.6,18.6,.62,4,1.25);
  for(let i=0;i<14;i++){ const a=i*2.4, r=1.2+(i%4)*.35, fx=-8+Math.cos(a)*r, fz=17.6+Math.sin(a)*r*.8; if(fz<16.2) continue; const fy=.6*2.6*Math.sqrt(Math.max(0,1-((fx+8)**2+(fz-17.6)**2)/(2.6*2.6))); sph(.07,['#f6d36b','#f5f0e6','#b9a5e8','#f2b8c6'][i%4],fx,fy+.04,fz,world,0,false); }
  solidCircle(-8,17.6,2.3); solidCircle(-9.8,15.6,.6); solidCircle(-6.3,15.8,.6);
}
const SIGN={x:-5.3,z:12.6};
const signTex=textTex(512,200,(g,w,h)=>{ g.fillStyle='#b8834a'; g.fillRect(0,0,w,h); for(let i=0;i<5;i++){ g.fillStyle=i%2?'#ad7a43':'#c08d55'; g.fillRect(0,i*h/5,w,h/5-3); }
  g.fillStyle='#3a2a1f'; g.textAlign='center'; g.textBaseline='middle'; const txt='← '+t().sign; let fs=96; do { g.font=`bold ${fs}px "Patrick Hand",cursive`; fs-=4; } while(g.measureText(txt).width>w-50&&fs>30); g.fillText(txt,w/2,h/2+4); });
cyl(.09,.11,2.2,'#7a5236',SIGN.x,1.1,SIGN.z,6); box(3.1,1.2,.12,'#9b6a3a',SIGN.x,1.95,SIGN.z);
{ const face=new THREE.Mesh(new THREE.PlaneGeometry(3.02,1.14),new THREE.MeshLambertMaterial({map:signTex})); face.position.set(SIGN.x,1.95,SIGN.z+.065); world.add(face); }
solidCircle(SIGN.x,SIGN.z,.2,.5);

// ---------- Bureau (vue en coupe, murs bas) ----------
const OFFICE={minX:5,maxX:29,minZ:-15,maxZ:15, door:{z0:-2.2,z1:2.2}};
{ flat(24,30,TM(TX.tile,12,15),17,0,.03);
  const W='#f4f1ea', Tk=.35, H=1.1;
  const wall=(x,z,w,d)=>{ box(w,H,d,W,x,H/2,z); box(w+.02,.08,d+.02,'#8b97a6',x,H+.04,z,world,false); solidBox(x,z,w,d); };
  wall(17,-15,24,Tk); wall(17,15,24,Tk); wall(29,0,Tk,30);
  wall(5,(-15+OFFICE.door.z0)/2,Tk,OFFICE.door.z0+15); wall(5,(15+OFFICE.door.z1)/2,Tk,15-OFFICE.door.z1);
  wall(17.5,3,3,Tk); wall(26.5,3,5,Tk); wall(16,9,Tk,12);
  flat(9,8,M('#b9c7d6'),22.5,9,.04);
  flat(1.4,3.2,M('#a8664a'),6,0,.04);
}
const chairs=[];
function desk(x,z,{chair=true,postit=false}={}){
  const g=new THREE.Group(); g.position.set(x,0,z); world.add(g);
  box(2.2,.1,1.1,'#c9a982',0,.82,0,g); [[-1,-.45],[1,-.45],[-1,.45],[1,.45]].forEach(([a,b])=>box(.08,.8,.08,'#6b6b6b',a,.4,b,g,false));
  box(.9,.55,.08,'#2f3640',0,1.2,-.35,g); box(.6,.04,.25,'#e0e0e0',0,.89,.1,g,false); box(.12,.2,.12,'#2f3640',0,.95,-.35,g,false);
  if(postit){ const p=new THREE.Mesh(new THREE.PlaneGeometry(.2,.2),M('#ffe066')); p.position.set(.36,1.32,-.305); p.rotation.z=.12; g.add(p); }
  if(chair) chairs.push({x, z:z+.95});
  solidBox(x,z,2.2,1.1,.9);
}
desk(10,-1); desk(10,5.5); desk(14,-6); desk(14,-1,{postit:true}); desk(12.6,10.5); desk(21,-12,{chair:false});
[[6.2,-14],[28,-14],[6.2,14],[15.3,14]].forEach(([x,z])=>{ cyl(.35,.28,.6,'#d9705a',x,.3,z,8); sph(.55,'#5f8f4a',x,.95,z); solidCircle(x,z,.4); });
{ const tx=textTex(256,340,(g,w,h)=>{ g.fillStyle='#24427a'; g.fillRect(0,0,w,h); g.fillStyle='#f6f2e8'; g.beginPath(); g.arc(w/2,120,62,0,7); g.fill();
    g.fillStyle='#24427a'; g.beginPath(); [[-22,10,26],[8,-6,32],[34,14,22]].forEach(([dx,dy,r])=>{ g.moveTo(w/2+dx+r,120+dy); g.arc(w/2+dx,120+dy,r,0,7); }); g.fill(); g.fillRect(w/2-48,124,96,22);
    g.fillStyle='#f6f2e8'; g.textAlign='center'; g.font='bold 36px "Baloo 2",sans-serif'; g.fillText('CLOUD',w/2,236); g.fillText(S.lang==='fr'?'SOUVERAIN':'SOVEREIGN',w/2,274); g.font='22px "Baloo 2",sans-serif'; g.fillStyle='#ffcf9e'; g.fillText('made in France',w/2,314); });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.45),new THREE.MeshLambertMaterial({map:tx})); p.position.set(17,1.6,-14.8); world.add(p); box(1.2,1.55,.04,'#2f2a24',17,1.6,-14.83,world,false); }

// Machine à café (animée)
const COFFEE={x:8,z:-13.6, mouth:new THREE.Vector3(7.6,0,-12.6)};
box(2.6,.95,1,'#9aa7b3',COFFEE.x+.4,.48,COFFEE.z); box(2.7,.08,1.1,'#7c8894',COFFEE.x+.4,.98,COFFEE.z,world,false);
const coffeeMachine=new THREE.Group(); coffeeMachine.position.set(COFFEE.x-.4,0,COFFEE.z-.05); scene.add(coffeeMachine);
box(.8,1.1,.7,'#2f3640',0,1.55,0,coffeeMachine); box(.5,.2,.06,'#e8742a',0,1.8,.36,coffeeMachine,false); box(.3,.12,.3,'#1f2328',0,1.08,.25,coffeeMachine,false);
solidBox(COFFEE.x+.4,COFFEE.z,2.6,1,1);

// Imprimante (animée)
const PRINTER={x:6.4,z:8.2};
const printer=new THREE.Group(); printer.position.set(PRINTER.x,0,PRINTER.z); scene.add(printer);
box(.9,.75,1.2,'#e9e6df',0,.375,0,printer); box(.9,.3,1.1,'#d4d0c7',0,.9,0,printer); box(.5,.04,.8,'#ffffff',.2,1.07,0,printer,false); box(.06,.1,.18,'#58e07a',.46,.95,.35,printer,false);
solidBox(PRINTER.x,PRINTER.z,.9,1.2,1);

// Baie serveur
const SERVER={x:26,z:-13.4, socket:new THREE.Vector3(26,.4,-12.78)};   // prise fixée sur la face avant de la baie
box(1.6,2.6,1,'#2b3138',SERVER.x,1.3,SERVER.z);
const leds=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.08,.04),new THREE.MeshBasicMaterial({color:'#ffffff'}),15); leds.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(45),3); scene.add(leds);
{ const o=new THREE.Object3D(); let i=0; for(let r=0;r<5;r++) for(let c=0;c<3;c++){ o.position.set(SERVER.x-.5+c*.18,.6+r*.42,SERVER.z+.52); o.updateMatrix(); leds.setMatrixAt(i++,o.matrix); box(1.3,.04,.02,'#454d57',SERVER.x+.05,.45+r*.42,SERVER.z+.51,world,false); } }
box(.4,.3,.12,'#dcdcdc',SERVER.socket.x,SERVER.socket.y,SERVER.socket.z-.06,world,false);
solidBox(SERVER.x,SERVER.z,1.6,1);
let cableMesh=null; const cableMat=M('#1f2328');
function updateCable(end){
  const s=SERVER.socket.clone(); s.z+=.05; const mid=s.clone().lerp(end,.5); mid.y=Math.max(.04,Math.min(s.y,end.y)-.25);
  if(cableMesh){ cableMesh.geometry.dispose(); scene.remove(cableMesh); }
  cableMesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(s,mid,end),14,.045,5),cableMat); scene.add(cableMesh);
}

// Salle de réunion
box(5,.12,2.4,'#c9a982',22.5,.85,9); [[20.3,8],[24.7,8],[20.3,10],[24.7,10]].forEach(([x,z])=>box(.1,.8,.1,'#6b6b6b',x,.4,z,world,false));
// Chaises de la salle de réunion : assise, dossier, pied central et étoile à cinq branches (elles ne flottent plus)
[[21.4,7.1],[23.8,10.9],[24,7.1],[21.2,10.9]].forEach(([x,z])=>{ box(.6,.08,.6,'#3d4a5c',x,.5,z); box(.6,.55,.08,'#3d4a5c',x,.8,z+(z<9?-.3:.3));
  cyl(.035,.035,.42,'#2f3640',x,.26,z,6,world,false); for(let k=0;k<5;k++){ const a=k/5*Math.PI*2, b=box(.3,.035,.05,'#2f3640',x+Math.cos(a)*.15,.06,z+Math.sin(a)*.15,world,false); b.rotation.y=-a; } });
{ const wb=textTex(512,384,(g,w,h)=>{ g.fillStyle='#ffffff'; g.fillRect(0,0,w,h); g.fillStyle='#2563c9'; g.font='bold 42px "Patrick Hand",cursive'; g.fillText('PIPELINE Q4',30,60);
    [[S.lang==='fr'?'500 hôpitaux':'500 hospitals',420],['35 leads',300],['CAIH ✓',190]].forEach(([l,wd],i)=>{ const y=95+i*82, x=(w-wd)/2; const c=i===2?'#e8742a':'#2563c9'; g.strokeStyle=c; g.lineWidth=5; g.strokeRect(x,y,wd,62); g.fillStyle=c; g.font='34px "Patrick Hand",cursive'; g.textAlign='center'; g.fillText(l,w/2,y+44); g.textAlign='left'; });
    g.strokeStyle='#d6402f'; g.lineWidth=4; g.beginPath(); g.arc(w-70,h-55,30,0,7); g.stroke(); g.fillStyle='#d6402f'; g.font='bold 30px "Patrick Hand",cursive'; g.fillText('!',w-76,h-44); });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.95),new THREE.MeshLambertMaterial({map:wb})); p.position.set(28.6,1.75,9); p.rotation.y=-Math.PI/2; world.add(p); box(.08,2.05,2.7,'#c9cdd3',28.68,1.75,9,world,false);
  for(const dz of [-1.3,1.3]){ box(.06,.8,.06,'#9aa3ad',28.62,.4,9+dz,world,false); box(.55,.05,.07,'#9aa3ad',28.62,.03,9+dz,world,false); } }   // tableau blanc sur pieds
solidBox(22.5,9,5,2.4,.9);

export { CHIMNEYS, groundMesh, road, MUD, AUTUMN, tree, hedge, house, FOUNTAIN, waterMat, water, bowlWater, PATCH, fenceLine, STALL, BURROW, SIGN, signTex, OFFICE, chairs, desk, COFFEE, coffeeMachine, PRINTER, printer, SERVER, leds, cableMesh, cableMat, updateCable, bake };
