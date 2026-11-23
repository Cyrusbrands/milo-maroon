import * as T from './vendor/three.module.js';
import {ball,box,stick,mat,terrain} from './world.js';
const QUIET={id:'quiet',title:'Island time',tag:'NO APPOINTMENTS TODAY',description:'Some days, watching the water is enough.',category:'quiet'};
export function enablePatientIsland(w){
 const life=w.life,r=life.r,advance=life.next.bind(life),animate=w.animateStory.bind(w),after=life.after.bind(life);
 life.quiet=false;life.quietCount=0;life.nextCruiseAt=r.range(480,900);life.shotDuration=r.range(100,220);
 Object.defineProperty(w,'story',{configurable:true,get:()=>life.quiet?QUIET:life.director.stories[w.storyIndex]});
 life.next=function(index){
  const explicit=index!==undefined&&index!==null;
  if(!explicit&&w.started&&this.storySerial&&!this.quiet&&r.next()<.88){
   this.director.finish();this.storySerial=0;this.save();this.quiet=true;this.quietCount++;this.quietStyle=Math.floor(r.next()*5);this.quietStart=w.actor.g.position.clone();this.quietTarget=new T.Vector3(...r.pick([[1.3,0,2.2],[-1.7,0,2.5],[3.7,0,1.7],[.3,0,1.8]]));this.quietTarget.y=terrain(this.quietTarget.x,this.quietTarget.z)+.025;
   this.duration=r.range(w.settings.pace==='lively'?15:30,w.settings.pace==='relaxed'?180:115);w.storyTime=0;w.events.clear();this.thoughtUntil=0;w.onStory?.(QUIET,-1);return;
  }
  this.quiet=false;advance(index);
 };
 // Quiet animation never cues a gag or visitor; the ecosystem keeps running independently.
 w.animateStory=function(id,p,t,dt){if(id!=='quiet'){animate(id,p,t,dt);return;}life.reset();const a=w.actor,route=Math.min(1,w.storyTime/6),q=route*route*(3-2*route);a.g.position.lerpVectors(life.quietStart,life.quietTarget,q);a.g.rotation.y+=T.MathUtils.euclideanModulo(.35-a.g.rotation.y+Math.PI,Math.PI*2)-Math.PI>0?dt*.04:-dt*.04;
  if(route<1){for(let i=0;i<2;i++){a.legs[i].rotation.x=Math.sin(t*5+i*Math.PI)*.35;a.arms[i].rotation.x=-Math.sin(t*5+i*Math.PI)*.2;}}
  else{a.head.rotation.y=Math.sin(t*.17)*.42;a.head.rotation.x=Math.sin(t*.11)*.08;a.body.position.y=Math.sin(t*1.3)*.012;if(life.quietStyle===1){a.body.position.y=-.42;a.legs.forEach(l=>l.rotation.x=-1.3);}if(life.quietStyle===2&&Math.sin(t*.3)>.8){a.arms[0].rotation.z=2.2;a.head.rotation.z=.12;}if(life.quietStyle===3){a.head.rotation.x=.4;a.arms[1].rotation.x=-.8;}a.eyes.forEach(e=>e.scale.y=.056*(Math.sin(t*1.3)>.997?.12:1));}
 };
 // Recurring characters have names and a slowly changing relationship, rather than a new actor per gag.
 life.residents={crab:'Captain Claw',pelican:'Inspector Peake',turtle:'Pebble'};
 const cream=mat('#f4dfb0'),wood=mat('#926543'),green=mat('#5d9e73'),dark=mat('#28434b');
 const props={};const prop=name=>{const g=new T.Group();w.scene.add(g);g.visible=false;props[name]=g;return g;};
 const egg=prop('egg');ball(egg,cream,[0,.28,0],[.24,.32,.24]);for(let i=0;i<6;i++)ball(egg,green,[Math.sin(i*2)*.21,.25+Math.cos(i)*.12,Math.cos(i*2)*.21],[.035,.04,.015]);
 const nest=prop('nest');for(let i=0;i<12;i++)stick(nest,[Math.sin(i)*.35,.05,Math.cos(i)*.35],[Math.sin(i+.8)*.45,.08,Math.cos(i+.8)*.45],.025,wood);
 const station=prop('station');box(station,wood,[0,.3,0],[1.1,.1,.6]);for(const x of [-.32,.32]){ball(station,wood,[x,.55,0],[.2,.24,.2]);stick(station,[x,.65,0],[x,.9,0],.015,dark);}stick(station,[-.3,.9,0],[.3,.9,0],.015,dark);
 const turbine=prop('turbine');stick(turbine,[0,0,0],[0,2,0],.045,wood);const rotor=new T.Group();rotor.position.y=2;turbine.add(rotor);for(let i=0;i<3;i++){const blade=box(rotor,cream,[0,0,0],[.12,.85,.045]);blade.position.set(Math.sin(i*Math.PI*2/3)*.43,Math.cos(i*Math.PI*2/3)*.43,0);blade.rotation.z=-i*Math.PI*2/3;}
 const guard=prop('guard');box(guard,wood,[0,.18,0],[.8,.25,.55]);for(const x of [-.5,.5]){stick(guard,[x,0,-.3],[x,.8,-.3],.03,wood);stick(guard,[x,.8,-.3],[-x,.8,-.3],.015,cream);}ball(guard,cream,[0,.35,0],[.28,.07,.18]);
 const sub=prop('sub');ball(sub,mat('#e6b956'),[0,0,0],[1,.35,.4]);stick(sub,[0,.2,0],[0,.8,0],.06,dark);stick(sub,[0,.8,0],[.3,.8,0],.06,dark);box(sub,cream,[0,.42,.45],[.65,.08,.65]);
 const ghost=prop('ghost');box(ghost,mat('#c2e2de',{transparent:true,opacity:.35}),[0,.4,0],[4,.6,1.2]);stick(ghost,[0,.5,0],[0,3,0],.04,cream);box(ghost,mat('#c9e1d8',{transparent:true,opacity:.4}),[0,2,0],[1.8,1.5,.035]);
 const baby=prop('baby');w.babyTurtle=baby;ball(baby,green,[0,.12,0],[.25,.12,.2]);ball(baby,green,[.27,.1,0],[.1,.08,.08]);for(const x of [-.15,.15])for(const z of [-.2,.2])ball(baby,green,[x,.06,z],[.1,.035,.06]);
 (w.contactObjects??=[]).push({id:'coconut-station',object:station,halfX:.58,halfZ:.33},{id:'turbine',object:turbine,halfX:.12,halfZ:.12},{id:'sandwich-table',object:guard,halfX:.53,halfZ:.36});
 const locate=(g,x,z,y=0)=>{g.visible=true;g.position.set(x,terrain(x,z)+y,z);return g;};
 const main=life.animateMain.bind(life);
 life.animateMain=function(id,p,t,dt){
  if(!['sandwichGuard','coconutPower','windPower','eggwatch','hatch','pizza','ghost'].includes(id)){main(id,p,t,dt);return;}
  this.reset();this.pose(.4,2,dt,{sit:['eggwatch','hatch'].includes(id),bend:.12});const a=w.actor;
  if(id==='sandwichGuard'){locate(guard,1.4,2.5);a.arms[0].rotation.x=-.8;this.extraCrab.g.position.set(1.4,terrain(1.4,2.5)+.45,2.5);this.sayOnce('security',p,.65,this.director.arcs.lunch>1?'He knows the code AGAIN.':'How did you get in?','crab');}
  if(id==='coconutPower'||id==='windPower'){locate(station,1.5,2.4);this.props.laptop.visible=true;a.arms.forEach(a=>a.rotation.x=-1);if(id==='windPower'){locate(turbine,2,1.8);rotor.rotation.z=t*2;this.sayOnce('power',p,.65,'The bird stole a blade.','gull');}else this.sayOnce('power',p,.6,'Battery: still zero.','typing');}
  if(id==='eggwatch'||id==='hatch'){locate(nest,1.2,2.5);locate(egg,1.2,2.5);this.props.book.visible=id==='eggwatch';egg.rotation.z=Math.sin(t*8)*(id==='hatch'?.12:.015);if(id==='hatch'&&p>.58){egg.visible=false;locate(baby,1.2+(p-.58)*5,2.5+(p-.58)*2);this.sayOnce('baby',p,.59,'Hello, Pebble.','turtle');}}
  if(id==='pizza'){sub.visible=p>.12&&p<.9;sub.position.set(8,.05+Math.sin(t)*.03,4);this.pose(4.6,2.3,dt,{yaw:1});this.sayOnce('pizza',p,.5,'Finally. Room service.','bottle');}
  if(id==='ghost'){ghost.visible=p>.1&&p<.9;ghost.position.set(-20+p*40,.1,-13);this.sayOnce('ghost',p,.55,'You are lost too?','ship');}
 };
 life.after=function(dt){for(const g of Object.values(props))g.visible=false; // main animation has run; restore relevant props below
  const id=w.story.id,p=w.storyTime/w.duration;w.scene.fog.density=id==='ghost'?.023:.009;
  if(['eggwatch','hatch'].includes(id)){locate(nest,1.2,2.5);if(id==='eggwatch'||p<=.58)locate(egg,1.2,2.5);else locate(baby,1.2+(p-.58)*5,2.5+(p-.58)*2);}
  if(['coconutPower','windPower'].includes(id))locate(station,1.5,2.4);if(id==='windPower')locate(turbine,2,1.8);if(id==='sandwichGuard')locate(guard,1.4,2.5);if(id==='pizza')sub.visible=p>.12&&p<.9;if(id==='ghost')ghost.visible=p>.1&&p<.9;
  after(dt);
  if(id==='windPower'&&p>.6){this.pelican.g.position.set(2+Math.sin(w.t)*.3,terrain(2,1.8)+2.2,1.8);rotor.children[0].visible=false;}else rotor.children[0].visible=true;
  if(id==='sandwichGuard')this.extraCrab.g.position.set(1.4,terrain(1.4,2.5)+.45,2.5);
  // A raft improves across attempts; the bird still interferes with construction.
  if(id==='raft'){const stage=Math.min(3,this.director.inventory.raftAttempts);this.props.raft.children.forEach((part,i)=>part.visible=i<3+stage*2);if(p<.25){this.pelican.g.position.set(3,2.4,2.7);}}
  else if(this.props.raft)this.props.raft.children.forEach(part=>part.visible=true);
  // Bend elbows for object handling without scaling any bone or hand.
  const a=w.actor;for(let i=0;i<2;i++){const arm=a.arms[i];arm.scale.setScalar(1);arm.userData.elbow.rotation.x=['laptop','coconutPower','windPower','eggwatch'].includes(id)?-.85:id==='swim'||id==='snorkel'?-.3:Math.max(-.7,-Math.abs(arm.rotation.x)*.35);}
  // An ongoing project remains visible during subsequent quiet moments.
  if(id==='quiet'){const arcs=this.director.arcs;if(arcs.power>0){locate(station,-1,1.8);if(arcs.power>=2)locate(turbine,-1.5,1.2);}if(arcs.egg>0&&arcs.egg<3){locate(nest,2,1.4);locate(egg,2,1.4);}if(arcs.egg===3){const x=3+Math.sin(w.t*.09);locate(baby,x,2.6);}if(arcs.lunch>1)locate(guard,1.4,2.5);
   if(this.director.inventory.raftAttempts){const raft=this.props.raft;raft.visible=true;raft.position.set(3,terrain(3,2),2);raft.children.forEach((part,i)=>part.visible=i<3+Math.min(3,this.director.inventory.raftAttempts)*2);}
   if(this.director.inventory.crabFriendship>2){const a=w.actor.g.position;this.extraCrab.g.position.set(a.x+.8,terrain(a.x+.8,a.z+.3),a.z+.3);}
}
 };
 const debug=life.debug.bind(life);life.debug=()=>({...debug(),quiet:life.quiet,quietCount:life.quietCount,arcs:{...life.director.arcs},residents:life.residents,nextCruiseAt:life.nextCruiseAt});
}
