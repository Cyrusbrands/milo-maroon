import * as T from './vendor/three.module.js';
import {ball,box,stick,mat,terrain} from './world.js';
const special=['repair','clue','dive','door','reclaim','feedTurtle'];
export function enablePersistentIsland(w){
 const l=w.life,d=l.director,c=d.camp,main=l.animateMain.bind(l),after=l.after.bind(l),tick=l.tick.bind(l),debug=l.debug.bind(l);
 const wood=mat('#936444'),gold=mat('#edca71'),green=mat('#72a678');
 function group(){const g=new T.Group();w.scene.add(g);return g;}
 const workshop=group();workshop.position.set(-1.8,terrain(-1.8,-2.6),-2.6);box(workshop,wood,[0,.55,0],[1.3,.12,.65]);for(const x of [-.5,.5])stick(workshop,[x,0,0],[x,.55,0],.04,wood);const planks=[];for(let i=0;i<5;i++)planks.push(box(workshop,wood,[(i-2)*.2,.7,0],[.15,.08,.65]));
 const nest=group();nest.position.set(3,terrain(3,-1)+.1,-1);for(let i=0;i<9;i++)stick(nest,[Math.sin(i)*.4,0,Math.cos(i)*.4],[Math.sin(i+.8)*.45,.1,Math.cos(i+.8)*.45],.03,wood);const loot=[];for(let i=0;i<4;i++)loot.push(box(nest,i%2?gold:mat('#789cab'),[(i-1)*.15,.16,.1],[.12,.1,.15]));
 const hatch=group();hatch.position.set(-2,terrain(-2,2.8)+.03,2.8);const lid=box(hatch,wood,[0,.05,0],[1.1,.1,.85]);const hinge=new T.Group();hinge.position.z=-.4;hatch.add(hinge);hinge.attach(lid);const glow=box(hatch,mat('#63e4cc',{emissive:'#2ebbad',emissiveIntensity:.7}),[0,.01,0],[.95,.03,.7]);
 const map=group();box(map,mat('#f0daa0'),[0,0,0],[.65,.025,.5]);for(let i=0;i<3;i++)ball(map,wood,[(i-1)*.17,.02,.05],[.03,.01,.03]);
 const hammer=group();w.handTools={hammer};stick(hammer,[0,0,0],[0,.35,0],.035,wood);box(hammer,mat('#899e9b'),[0,.38,0],[.28,.12,.12]);
 const pebble=group();w.pebble=pebble;ball(pebble,green,[0,.12,0],[.25,.13,.21]);ball(pebble,green,[.27,.1,0],[.1,.08,.08]);for(const x of [-.15,.15])for(const z of [-.2,.2])ball(pebble,green,[x,.05,z],[.1,.025,.06]);
 // A separate underwater diorama avoids clipping the surface island or moving the main world.
 const reef=group();reef.position.set(0,-60,0);const aqua=new T.MeshBasicMaterial({color:'#236c80',side:T.BackSide,fog:false});ball(reef,aqua,[0,0,0],[24,24,24]);box(reef,mat('#bcb98b'),[0,-2.5,0],[35,.5,35]);
 for(let i=0;i<28;i++){const x=Math.sin(i*9)*11,z=Math.cos(i*7)*9;for(let j=0;j<3;j++)stick(reef,[x,-2.3,z],[x+Math.sin(j*2)*.35,-1.6+(i%4)*.2,z+Math.cos(j*2)*.3],.07,mat(['#e38a7a','#b4afdb','#dfbe73'][i%3]));}
 const fish=[];for(let i=0;i<24;i++){const g=new T.Group();reef.add(g);ball(g,mat(i%2?'#edc870':'#6bc5bc'),[0,0,0],[.25,.1,.1]);box(g,gold,[-.25,0,0],[.12,.16,.025]);fish.push(g);}
 const shark=new T.Group();reef.add(shark);ball(shark,mat('#87a6ac'),[0,0,0],[1.5,.35,.45]);const fin=box(shark,mat('#78979e'),[0,.4,0],[.4,.55,.035]);fin.rotation.z=.3;
 const bubbles=[];for(let i=0;i<35;i++)bubbles.push(ball(reef,mat('#b5eeea',{transparent:true,opacity:.25}),[0,0,0],[.04,.04,.04]));
 const disc=group();box(disc,mat('#375864'),[0,-1,0],[5,.1,5]);disc.position.set(0,-61,0);for(let i=0;i<8;i++)ball(disc,mat(['#eb8eb0','#66dacb','#e3c56a'][i%3],{emissive:'#4a908f'}),[Math.sin(i)*3,-.5,Math.cos(i)*3],[.18,.18,.18]);
 w.persistentAssets={workshop,reef,fish};
 let previousStorm=0,stealWait=180,elapsed=0,underwater=false;
 l.tick=function(dt){tick(dt);if(!w.started)return;elapsed+=dt;stealWait-=dt;if(w.storm>.55)c.damage=Math.min(1,c.damage+dt*.002);if(previousStorm>.3&&w.storm<.3&&c.damage>.3)w.onWorldEvent?.('The storm left a few repairs for tomorrow.');previousStorm=w.storm;
  if(stealWait<=0){stealWait=l.r.range(420,900);if(c.stolen<4){c.stolen++;w.onWorldEvent?.('Inspector Peake has added something to the lost-property nest.');}}
 };
 l.animateMain=function(id,p,t,dt){if(!special.includes(id)){main(id,p,t,dt);return;}this.reset();this.pose(id==='repair'?-1.7:id==='reclaim'?2.3:-1, id==='repair'?-1.3:id==='reclaim'?-.6:2,dt,{bend:id==='repair'?.2:id==='feedTurtle'?.25:0,sit:false});const a=w.actor;
  if(id==='repair'){a.arms[1].rotation.x=-.8+Math.sin(t*5)*.4;this.sayOnce('fix',p,.7,'That should survive Tuesday.','bonk');}
  if(id==='clue'){a.arms.forEach(a=>a.rotation.x=-1);a.head.rotation.x=.35;this.sayOnce('map',p,.5,`Clue ${Math.min(3,c.clues+1)}: below the tide.`,'bottle');}
  if(id==='door'){a.head.rotation.x=.5;a.arms[1].rotation.x=-.9;this.sayOnce('door',p,.6,'An underwater disco. Naturally.','magic');}
  if(id==='dive'){this.pose(7,4,dt);a.g.position.y=.05;a.body.rotation.x=-Math.PI/2;a.arms.forEach((a,i)=>a.rotation.x=t*2+i*Math.PI);this.sayOnce('dive',p,.2,'Following the bubbles.','splash');}
  if(id==='reclaim'){a.arms[0].rotation.z=2.2;this.sayOnce('bird',p,.6,'I have the receipt.','gull');}
  if(id==='feedTurtle'){a.arms[0].rotation.x=-1;a.head.rotation.x=.4;this.sayOnce('friend',p,.65,'Same time tomorrow, Pebble?','turtle');}
 };
 l.after=function(dt){after(dt);const id=w.story.id,p=w.storyTime/w.duration,t=w.t,a=w.actor;workshop.visible=w.started;nest.visible=w.started;loot.forEach((o,i)=>o.visible=i<c.stolen);planks.forEach((o,i)=>{o.rotation.z=Math.sin(i*2)*c.damage*.6;o.position.y=.7-(i%2)*c.damage*.25;});hatch.visible=c.clues>0||id==='door';hinge.rotation.x=id==='door'?-Math.max(0,Math.min(1,(p-.4)*3))*1.3:c.discovered?-.35:0;glow.visible=c.discovered||id==='door'&&p>.5;
  map.visible=id==='clue';if(map.visible){a.body.updateWorldMatrix(true,false);map.position.copy(a.body.localToWorld(new T.Vector3(0,1,.5)));map.quaternion.copy(a.g.quaternion);}
  hammer.visible=id==='repair';if(hammer.visible){a.arms[1].userData.hand.updateWorldMatrix(true,false);hammer.position.copy(a.arms[1].userData.hand.getWorldPosition(new T.Vector3()));hammer.quaternion.copy(a.arms[1].userData.hand.getWorldQuaternion(new T.Quaternion()));}
  pebble.visible=d.arcs.egg===3;pebble.position.set(2+Math.sin(t*.08),terrain(2+Math.sin(t*.08),2.8)+.02,2.8);if(id==='feedTurtle')pebble.position.set(.3,terrain(.3,3.3),3.3);pebble.scale.setScalar(1+Math.min(.5,c.turtleTrust*.04));
  if(id==='reclaim'&&p>.5){l.pelican.g.position.set(3,terrain(3,-1)+1,-1);l.pelican.g.rotation.y=t*.3;}
  // Two-bone IK puts the wrists at the keyboard without changing bone lengths.
  if(id==='laptop'&&p>.32&&p<.9)for(let i=0;i<2;i++){const arm=a.arms[i],dy=-.24,dz=.4+Math.sin(t*12+i)*.012,dist=Math.hypot(dy,dz),bend=Math.acos(T.MathUtils.clamp((dist*dist-.29*.29-.28*.28)/(2*.29*.28),-1,1));arm.rotation.set(-Math.atan2(dz,-dy)+Math.atan2(.28*Math.sin(bend),.29+.28*Math.cos(bend)),0,0);arm.userData.elbow.rotation.x=-bend;}
  a.mouth.scale.y=.025*(1+(id==='quiet'?0:Math.sin(t*2)*.2));
  underwater=!w.ocean&&id==='dive'&&p>.28&&p<.78;reef.visible=underwater;disc.visible=underwater&&c.discovered;
  if(underwater){a.g.position.set(Math.sin(t*.3)*2,-60,1);a.g.rotation.y=.7;a.body.rotation.x=-Math.PI/2;a.arms.forEach((arm,i)=>arm.rotation.x=t*2+i*Math.PI);disc.rotation.y=t*.1;fish.forEach((f,i)=>{const q=t*.3+i;f.position.set(Math.cos(q)*5,Math.sin(q*.7)*.5,Math.sin(q)*4);f.rotation.y=-q;});shark.position.set(Math.cos(t*.1)*8,.3,Math.sin(t*.1)*7);shark.rotation.y=-t*.1;bubbles.forEach((b,i)=>b.position.set(Math.sin(i*4)*8,-2+(t*.3+i*.2)%6,Math.cos(i*7)*7));w.camera.position.set(10,-57,14);w.camera.lookAt(0,-60,0);w.scene.fog.color.set('#387f91');w.scene.fog.density=.018;}
 };
 l.debug=()=>({...debug(),camp:{...c},underwater});
}
