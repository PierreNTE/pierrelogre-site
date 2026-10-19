import * as THREE from 'three';
import { M, blob, box, cone, cyl, mergeRig, noShadowCast, scene, sph, textTex } from './engine.js';
import { baker, gardener, itguy, sales } from './npc.js';
import { COFFEE, PRINTER, SERVER, SIGN, STALL, chairs, updateCable } from './world.js';

/* =====================================================================
   Objets attrapables & interactions
   ===================================================================== */
const items=[];
function makeItem(o){
  const mesh=o.build(); noShadowCast(mesh); scene.add(mesh); mergeRig(mesh,[mesh]);
  const it=Object.assign({mesh, pos:new THREE.Vector3(o.x,o.y||0,o.z), home:new THREE.Vector3(o.x,o.y||0,o.z), held:false, carrier:null, gone:false, vel:null}, o);
  it.mesh.position.copy(it.pos); it.shadow=blob(o.sh||.3); items.push(it); return it;
}
function carrotMesh(){ const g=new THREE.Group(); cone(.13,.6,'#ee8a33',0,.05,0,6,g).rotation.x=Math.PI;
  [-.08,0,.08].forEach(x=>{ cone(.06,.35,'#5fa045',x,.45,0,4,g,false).rotation.z=x*3; }); return g; }
const carrots=[-22,-20,-18].map((x,i)=>makeItem({kind:'carotte', id:'c'+i, x, z:-9.6+(i%2)*.9, y:-.12, planted:true, owner:gardener, build:carrotMesh, bring:new THREE.Vector3(x,0,-6.5)}));
const baguette=makeItem({kind:'baguette', x:STALL.x-.8, z:STALL.z-.25, y:1.16, owner:baker, sh:.5, bring:new THREE.Vector3(STALL.x-.8,0,9.5), build:()=>{ const g=new THREE.Group(); cyl(.12,.12,1.3,'#d9a25a',0,0,0,7,g).rotation.z=Math.PI/2;
  for(let i=-1;i<=1;i++){ box(.05,.03,.2,'#f1d39b',i*.35,.11,0,g,false).rotation.y=.6; } return g; }});
const mugLabel=textTex(128,64,(g,w)=>{ g.fillStyle='#ffffff'; g.fillRect(0,0,w,64); g.fillStyle='#123f8c'; g.font='bold 22px sans-serif'; g.textAlign='center'; g.fillText('OVHcloud',w/2,40); });
const mug=makeItem({kind:'mug', x:COFFEE.x+1.1, z:COFFEE.z+.15, y:1.13, owner:sales, sh:.22, bring:new THREE.Vector3(COFFEE.x+1.1,0,-12.4), build:()=>{ const g=new THREE.Group();
  cyl(.16,.14,.3,'#ffffff',0,.06,0,14,g);
  const lab=new THREE.Mesh(new THREE.CylinderGeometry(.163,.143,.14,14,1,true,-.9,1.8),new THREE.MeshLambertMaterial({map:mugLabel})); lab.position.y=.06; g.add(lab);
  const h=new THREE.Mesh(new THREE.TorusGeometry(.08,.025,5,10),M('#ffffff')); h.position.set(-.17,.06,0); g.add(h); return g; }});
const plug=makeItem({kind:'prise', x:SERVER.socket.x, z:SERVER.socket.z+.12, y:SERVER.socket.y, owner:itguy, plugged:true, sh:.2, bring:new THREE.Vector3(SERVER.socket.x,0,-11.4),
  build:()=>{ const g=new THREE.Group(); box(.24,.18,.22,'#f2f2f2',0,0,0,g); box(.04,.06,.1,'#c9c9c9',-.05,0,.14,g,false); box(.04,.06,.1,'#c9c9c9',.05,0,.14,g,false); return g; }});
const hat=makeItem({kind:'chapeau', x:-22.4, z:-6.5, y:2, owner:gardener, worn:true, sh:.5, build:()=>{ const g=new THREE.Group(); cyl(.62,.62,.05,'#e8cf7a',0,0,0,12,g); cyl(.3,.34,.24,'#e8cf7a',0,.13,0,12,g); cyl(.345,.345,.06,'#d9705a',0,.05,0,12,g,false); return g; }});
updateCable(plug.pos.clone());

// objets poussables
const props=[];
function pot(x,z){ const g=new THREE.Group(); cyl(.32,.24,.5,'#c9714a',0,.25,0,10,g); cyl(.34,.34,.08,'#b5603d',0,.5,0,10,g,false); sph(.3,'#6f9e4f',0,.66,0,g);
  ['#f2b8c6','#f6d36b','#f5f0e6'].forEach((c,i)=>sph(.09,c,Math.cos(i*2)*.2,.86,Math.sin(i*2)*.2,g,0,false));
  noShadowCast(g); g.position.set(x,0,z); scene.add(g); mergeRig(g,[g]); props.push({kind:'pot', id:'p'+props.length, g, pos:new THREE.Vector3(x,0,z), vel:new THREE.Vector3(), r:.38, knocked:false, fall:0, axis:new THREE.Vector3(), sh:blob(.45)}); }
function chair(x,z){ const g=new THREE.Group(); box(.6,.08,.6,'#3d4a5c',0,.5,0,g); box(.6,.6,.08,'#3d4a5c',0,.85,.3,g); cyl(.04,.04,.42,'#6b6b6b',0,.25,0,5,g,false); cyl(.3,.3,.04,'#6b6b6b',0,.04,0,5,g,false);
  noShadowCast(g); g.position.set(x,0,z); scene.add(g); mergeRig(g,[g]); props.push({kind:'chair', g, pos:new THREE.Vector3(x,0,z), vel:new THREE.Vector3(), r:.38, spin:0, sh:blob(.45)}); }
pot(.2,4.4); pot(-8.2,-4.2); pot(-9.4,-12.1);
chairs.forEach(c=>chair(c.x,c.z));

const interacts=[{kind:'printer', pos:new THREE.Vector3(PRINTER.x+.95,0,PRINTER.z), r:1.6}];
const eggs=[
  {key:'whiteboard', pos:new THREE.Vector3(27.2,0,9), anchor:new THREE.Vector3(28.4,2.4,9), r:2},
  {key:'postit', pos:new THREE.Vector3(14,0,.2), anchor:new THREE.Vector3(14.4,1.7,-1.3), r:1.6},
  {key:'poster', pos:new THREE.Vector3(17,0,-13.6), anchor:new THREE.Vector3(17,2.5,-14.8), r:1.8},
  {key:'slate', pos:new THREE.Vector3(STALL.x-2.6,0,STALL.z-1.9), anchor:new THREE.Vector3(STALL.x-2.65,1.4,STALL.z-.9), r:1.5},
  {key:'sign', pos:new THREE.Vector3(SIGN.x,0,SIGN.z-.9), anchor:new THREE.Vector3(SIGN.x,2.9,SIGN.z), r:1.8},
].map(e=>Object.assign(e,{inside:false}));

export { items, makeItem, carrotMesh, carrots, baguette, mugLabel, mug, plug, hat, props, pot, chair, interacts, eggs };
