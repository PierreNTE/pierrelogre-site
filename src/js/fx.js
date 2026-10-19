import * as THREE from 'three';
import { scene } from './engine.js';
import { pick, rnd } from './state.js';

/* =====================================================================
   Particules (instanciées)
   ===================================================================== */
/** Échelle du nombre de particules (réduite par la qualité adaptative). */
export const PQ={scale:1};
const PMAX=260;
const pMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08,0),new THREE.MeshLambertMaterial({color:'#ffffff'}),PMAX); pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
pMesh.setColorAt(0,new THREE.Color()); pMesh.count=0; pMesh.frustumCulled=false; scene.add(pMesh);
const parts=[]; const _o=new THREE.Object3D();
function emit(p,col,{n=10,spd=2,up=4,life=1,size=1,grav=14,shape=0}={}){ if(n>1) n=Math.max(1,Math.round(n*PQ.scale)); for(let i=0;i<n;i++){ if(parts.length>=PMAX) parts.shift();
  const a=Math.random()*Math.PI*2, s=spd*(.4+Math.random()*.6); parts.push({p:p.clone(),v:new THREE.Vector3(Math.cos(a)*s,up*(.6+Math.random()*.6),Math.sin(a)*s),t:life*(.8+Math.random()*.4),life,col:new THREE.Color(col),size,grav,shape,rot:Math.random()*6}); } }
const dirt=p=>emit(new THREE.Vector3(p.x,.25,p.z),'#7a5236',{n:14,spd:2.2,up:4});
const splash=p=>emit(new THREE.Vector3(p.x,.7,p.z),'#bfe3f0',{n:24,spd:2.4,up:6});
const LEAVES=46; const leafMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.24,.15),new THREE.MeshLambertMaterial({side:THREE.DoubleSide}),LEAVES);
leafMesh.frustumCulled=false; scene.add(leafMesh); const leafCols=['#d98b3a','#c9a33d','#b9531a','#e2a548','#9a7a3a'];
const leaves=[...Array(LEAVES)].map((_,i)=>{ leafMesh.setColorAt(i,new THREE.Color(pick(leafCols))); return {x:rnd(-20,20),y:rnd(0,9),z:rnd(-16,14),ph:rnd(0,6),sp:rnd(.5,1.1),rest:0}; });

export { PMAX, pMesh, parts, _o, emit, dirt, splash, LEAVES, leafMesh, leafCols, leaves };
