import {terrain} from './world.js';
// Conservative horizontal capsule clearance for the actor. All dimensions are world units.
export const SOLIDS=[
 {id:'tent',x:-2.5,z:-.6,r:1.25},
 {id:'workshop',x:-1.8,z:-2.6,r:.85},
 {id:'fire',x:-1.3,z:1,r:.65},
 {id:'crate',x:4,z:1,r:.55},
 ...[[1.9,-2.1],[4,-.7],[-3.8,-1.5],[.1,-3.2]].map(([x,z],i)=>({id:'palm'+i,x,z,r:.38}))
];
const WATER=new Set(['swim','snorkel','surfing','raft','dive','glowSwim']);
const TENT=new Set(['laptop','radio','drone','selfie','painting','bananaPhone','metalDetector','parrot']);
export function projectClear(x,z,solids=SOLIDS){
 for(let pass=0;pass<12;pass++)for(const s of solids){
  if(s.halfX!==undefined){
   const angle=s.yaw||0,c=Math.cos(angle),n=Math.sin(angle),dx=x-s.x,dz=z-s.z;
   let u=c*dx-n*dz,v=n*dx+c*dz;
   const hx=s.halfX+.48,hz=s.halfZ+.48;
   if(Math.abs(u)<hx&&Math.abs(v)<hz){if(hx-Math.abs(u)<hz-Math.abs(v))u=(u<0?-1:1)*(hx+.002);else v=(v<0?-1:1)*(hz+.002);x=s.x+c*u+n*v;z=s.z-n*u+c*v;}
  }else{const dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz),r=s.r+.48;if(d<r){x=s.x+(d>1e-6?dx/d:1)*(r+.002);z=s.z+(d>1e-6?dz/d:0)*(r+.002);}}
 }
 return{x,z};
}
export function enableContact(w){
 let last=null,step=0,wet=0,lifeSound=0;const a=w.actor;
 const footprints={raft:[1.14,.61],volleyball:[1.36,.07],easel:[.63,.36],chess:[.64,.64],castle:[.8,.62],pot:[.45,.45],chest:[.52,.4],laundry:[1.55,.05],radio:[.4,.22]};
 w.contact={lastSolids:[],collectSolids(){
  const id=w.story.id,p=w.storyTime/w.duration;
  const solids=SOLIDS.filter(s=>!(s.id==='tent'&&TENT.has(id)&&p>.08&&p<.24));
  for(const [name,[halfX,halfZ]]of Object.entries(footprints)){const o=w.life.props[name];if(o?.visible&&o.parent===w.scene)solids.push({id:name,x:o.position.x,z:o.position.z,halfX,halfZ,yaw:o.rotation.y});}
  for(const entry of w.contactObjects||[]){const o=entry.object;if(o.visible)solids.push({id:entry.id,x:o.position.x,z:o.position.z,halfX:entry.halfX,halfZ:entry.halfZ,yaw:o.rotation.y});}
  return solids;
 },correctPlacement(){
  const id=w.story.id,p=w.storyTime/w.duration;
  if(!a.g.visible||WATER.has(id)||['rest','sleepcruise'].includes(id)||id==='hammockFail'&&p<.6)return;
  const solids=this.collectSolids();this.lastSolids=solids;const pos=a.g.position,oldGround=terrain(pos.x,pos.z),q=projectClear(pos.x,pos.z,solids);pos.y+=terrain(q.x,q.z)-oldGround;pos.x=q.x;pos.z=q.z;last=pos.clone();
 },resolve(dt){const id=w.story.id,p=w.storyTime/w.duration;
  const solids=this.collectSolids();this.lastSolids=solids;
  if(a.g.visible&&!WATER.has(id)&&a.g.position.y>-.5){const from=last||a.g.position;let x=from.x,z=from.z;const target=a.g.position.clone();const count=Math.max(1,Math.ceil(Math.hypot(target.x-x,target.z-z)/.12));for(let i=0;i<count;i++){const q=projectClear(x+(target.x-x)/(count-i),z+(target.z-z)/(count-i),solids);x=q.x;z=q.z;}a.g.position.x=x;a.g.position.z=z;a.g.position.y=terrain(x,z)+.025;}
  const distance=last?Math.hypot(a.g.position.x-last.x,a.g.position.z-last.z):0;
  if(w.started&&dt>0&&distance>.003&&distance<.6&&!WATER.has(id)&&a.g.visible){step+=distance;if(step>.5){step=0;w.audio.cue('step');}}
  if(!w.ocean&&WATER.has(id)&&p>.28&&p<.75&&w.t-wet>3){wet=w.t;w.audio.cue(id==='dive'?'bubble':'splash');}
  if(w.started&&w.night>.65&&w.storm<.3&&w.t-lifeSound>13){lifeSound=w.t;w.audio.cue('insect');}
  if(id==='crab')w.life.once('pinch-voice',p,.56,()=>w.audio.cue('ow'));
  const sounds={cook:['wood',.38],repair:['wood',.45],garden:['dig',.45],treasure:['dig',.4],teatime:['sip',.54],postcard:['cloth',.4],laundry:['cloth',.4],hammockFail:['ow',.62],coconut:['ow',.57],door:['wood',.5]};
  if(sounds[id]){const [sound,at]=sounds[id];w.life.once('contact-sound-'+id,p,at,()=>w.audio.cue(sound));}
  // Keep the rigid rod/umbrella shaft beside the torso, rather than embedded in it.
  a.rod.position.x=.35;a.rod.position.z=.3;a.umbrella.position.x=.42;a.umbrella.position.z=.25;
  last=a.g.position.clone();
 }};
}
