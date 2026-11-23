import * as T from './vendor/three.module.js';
import {Random} from './director.js';
import {cloneSkin} from './asset-utils.js';

const TAU=Math.PI*2,clamp=T.MathUtils.clamp,radial=p=>Math.hypot(p.x/7.8,p.z/5.7);
const inspectorStories=new Set(['laptop','birdTrade','reclaim','telescope','painting','yoga','radio','selfie','meditation','picnic','magic']);
export function enableEcology(w){
 const life=w.life,previous=life.after.bind(life),r=new Random(Math.floor(life.r.next()*0xffffffff));
 const between=(a,b)=>r.range(a,b),v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const state=w.ecology={version:'0.15.0',clock:0,birds:[],schools:[],fish:[],butterflies:[],dive:null,nextDive:between(55,100),nextLull:between(165,240),lullUntil:0,stats:{dives:0,catches:0,arrivals:0,departures:0,lulls:0,turns:0},previewUntil:0};
 const waterPoint=(a,b,y)=>{const angle=between(0,TAU),radius=between(a,b);return v(Math.cos(angle)*7.8*radius,y,Math.sin(angle)*5.7*radius);};
 const clear=(a,b,min=1.27)=>{for(let i=0;i<=12;i++)if(radial(a.clone().lerp(b,i/12))<min)return false;return true;};
 function waterTarget(from,a,b,y){for(let i=0;i<50;i++){const p=waterPoint(a,b,y);if(clear(from,p))return p;}return from.clone().multiplyScalar(1.2).setY(y);}
 function steer(s,target,speed,dt,turn=1.2){const desired=target.clone().sub(s.pos);if(desired.lengthSq()>.00001)desired.normalize().multiplyScalar(speed);s.vel.lerp(desired,1-Math.exp(-turn*dt));s.pos.addScaledVector(s.vel,dt);}
 function safeFish(p){const radius=radial(p);if(radius<1.27){p.x*=1.27/Math.max(.001,radius);p.z*=1.27/Math.max(.001,radius);}const floor=-.08-Math.min(8,(radial(p)-1.03)*5);p.y=clamp(p.y,floor+.35,-.27);}
 function makeBird(host,index,inspector=false){const pos=waterPoint(1.4,2.1,between(3.2,7));return{host,index,inspector,pos,yaw:0,vel:v(),target:waterPoint(1.3,2.4,between(3,8)),mode:index>3?'absent':'flight',until:between(24,80),speed:between(1.3,2.3),phase:between(0,TAU),beat:between(4.5,6.5),glideAt:between(3,9),glideUntil:0,bank:0,carryUntil:0};}
 state.birds=[...w.birds.map((b,i)=>makeBird(b.g,i)),makeBird(life.pelican.g,w.birds.length,true)];
 function makeSchool(hosts,reef,index){const pos=waterPoint(1.5,2.3,reef?between(-2.7,-1.2):between(-.7,-.35));const s={index,reef,pos,vel:v(),target:waterTarget(pos,1.35,2.4,pos.y),mode:'feeding',until:between(35,95),speed:between(.22,.55),members:[]};hosts.forEach((host,i)=>{const f={host,school:s,index:i,pos:pos.clone(),yaw:0,offset:v(between(-.9,.9),between(-.15,.1),between(-.7,.7)),phase:between(0,TAU),speed:between(4,7),hiddenUntil:0,scatterUntil:0,escape:v()};s.members.push(f);state.fish.push(f);});state.schools.push(s);}
 for(let i=0;i<3;i++)makeSchool(life.fishSchool.filter((_,j)=>j%3===i),false,i);
 for(let i=0;i<4;i++)makeSchool((w.ocean?.fishGroups||[]).filter((_,j)=>j%4===i),true,i+3);
 state.butterflies=life.butterflies.map((host,i)=>({host,pos:v(2,2,-.7),vel:v(),target:v(between(-1,4),between(.8,2.7),between(-2,1)),mode:'flight',until:between(5,18),phase:between(0,TAU),speed:between(16,23)}));

 function beginDeparture(s){if(s.mode==='absent'||s.mode==='depart')return;s.mode='depart';s.target=s.pos.clone();s.target.y=s.inspector?6:between(5,9);const horizontal=v(s.pos.x,0,s.pos.z);if(horizontal.length()<1)horizontal.set(1,0,1);horizontal.normalize().multiplyScalar(s.members?37:45);s.target.x=horizontal.x;s.target.z=horizontal.z;if(s.members)s.target.y=-5.5;state.stats.departures++;}
 function initArrival(s){s.mode=s.members?'feeding':'flight';s.pos.copy(waterPoint(s.members?3.2:4.3,s.members?3.6:4.8,s.members?(s.reef?-4:-1.1):between(5,8)));s.vel.set(0,0,0);s.target=s.members?waterTarget(s.pos,1.4,2.2,s.reef?-1.8:-.45):waterPoint(1.3,2.2,between(3,7));s.until=state.clock+between(35,95);if(s.members)for(const f of s.members)f.pos.copy(s.pos).add(f.offset);state.stats.arrivals++;}
 const quiet=()=>state.clock<state.lullUntil||w.storm>.65||w.night>.8;
 function stepSchools(dt){
  for(const s of state.schools){
   if(quiet())beginDeparture(s);
   if(s.mode==='absent'){if(!quiet()&&state.clock>s.until)initArrival(s);}
   else{if(s.mode==='feeding'&&state.clock>s.until)beginDeparture(s);if(s.mode==='feeding'&&s.pos.distanceTo(s.target)<1){s.target=waterTarget(s.pos,1.35,2.5,s.reef?between(-3,-1.1):between(-.85,-.34));s.speed=between(.2,.62);state.stats.turns++;}steer(s,s.target,s.mode==='depart'?.65:s.speed,dt,.7);safeFish(s.pos);if(s.mode==='depart'&&radial(s.pos)>4.4){s.mode='absent';s.until=state.clock+between(22,85);}}
   for(const f of s.members){
    // The mermaid's two greeting fish retain their authored interaction.
    if(!s.reef&&life.fishSchool.indexOf(f.host)<2&&w.collection?.mermaidState?.phase==='surface'&&w.collection.mermaidHost.visible){f.pos.copy(f.host.position);continue;}
    const prey=state.dive?.prey===f&&['approach','plunge'].includes(state.dive.phase);
    let target=s.pos.clone().add(f.offset);if(prey)target.copy(state.dive.strike).setY(-.30);
    if(state.clock<f.scatterUntil)target.add(f.escape);target.y+=Math.sin(state.clock*.8+f.phase)*.07;safeFish(target);
    f.pos.lerp(target,1-Math.exp(-dt*(prey?3:1.3)));safeFish(f.pos);
    // Gentle separation prevents fish sharing one point in tight turns.
    for(const other of s.members)if(other!==f){const d=f.pos.clone().sub(other.pos),length=d.length();if(length>.001&&length<.22)f.pos.addScaledVector(d,dt*(.22-length)/length);}
    const actor=w.actor.g.position,away=f.pos.clone().sub(actor);away.y=0;if(actor.y<.5&&away.length()<1.15&&away.length()>.001)f.pos.addScaledVector(away,dt*1.8/away.length());safeFish(f.pos);
    f.host.position.copy(f.pos);const heading=s.vel.clone();if(state.clock<f.scatterUntil)heading.add(f.escape);if(heading.lengthSq()>.001){const yaw=-Math.atan2(heading.z,heading.x),delta=Math.atan2(Math.sin(yaw-f.yaw),Math.cos(yaw-f.yaw));f.yaw+=delta*(1-Math.exp(-dt*3));f.host.rotation.y=f.yaw;}
    const density=w.settings.quality==='high'?2:w.settings.quality==='balanced'?3:4,globalIndex=s.reef?w.ocean.fishGroups.indexOf(f.host):life.fishSchool.indexOf(f.host);
    f.host.visible=s.mode!=='absent'&&state.clock>f.hiddenUntil&&globalIndex%density===0&&f.pos.distanceTo(w.camera.position)>.65;
    const instance=w.collection?.instances?.find(x=>x.host===f.host);if(instance)for(const j of instance.configs||[]){if(!j.bone||!j.axis)continue;j.bone.quaternion.copy(instance.rest.get(j.bone)).multiply(new T.Quaternion().setFromAxisAngle(j.axis,Math.sin(state.clock*f.speed+f.phase+(j.phase||0))*(j.amplitude||.1)));}
   }
  }
 }
 function beginDive(force=false){
  if(state.dive||(!force&&(quiet()||w.ocean?.underwater)))return false;
  const candidates=state.fish.filter(f=>!f.school.reef&&f.host.visible&&state.clock>f.hiddenUntil&&radial(f.pos)>1.3);
  if(!candidates.length)return false;const prey=r.pick(candidates),available=state.birds.filter(b=>!b.inspector&&b.mode==='flight'),b=force?state.birds[0]:(available.sort((a,b)=>a.pos.distanceToSquared(prey.pos)-b.pos.distanceToSquared(prey.pos))[0]||state.birds[0]);if(b.mode==='absent')initArrival(b);
  const strike=prey.pos.clone().setY(.04),direction=v(-strike.z/(5.7*5.7),0,strike.x/(7.8*7.8)).normalize().multiplyScalar(r.next()<.5?-1:1); // Tangent to the shore ellipse: entry and low climb remain over water.
  state.dive={bird:b,prey,strike,direction,start:b.pos.clone(),age:0,phase:'approach',success:r.next()<.68,contact:false};b.mode='dive';state.stats.dives++;return true;
 }
 state.inviteDive=()=>{if(state.dive)return true;const s=state.schools[0];s.mode='feeding';s.until=state.clock+65;s.pos.copy(waterPoint(1.55,1.8,-.4));s.target=waterTarget(s.pos,1.4,2,-.4);for(const f of s.members){f.pos.copy(s.pos).add(f.offset);safeFish(f.pos);f.hiddenUntil=0;f.host.visible=true;}const ok=beginDive(true);if(ok){state.previewUntil=state.clock+19;w.collection.previewMermaidUntil=0;w.worldLife.previewUntil=0;w.worldLife.cameraFocus=null;w.seabird.previewUntil=0;w.art.portraitUntil=0;w.dolphin.previewUntil=0;w.shark.previewUntil=0;}return ok;};
 state.inviteQuiet=()=>{state.lullUntil=state.clock+100;state.nextLull=state.lullUntil+between(280,480);state.stats.lulls++;};
 function stepDive(dt){
  const d=state.dive;if(!d)return;d.age+=dt;const b=d.bird,entry=d.strike.clone().addScaledVector(d.direction,-.30).setY(.23),approach=entry.clone().addScaledVector(d.direction,-3.2).setY(4.2);
  const old=b.pos.clone();
  if(d.age<5){d.phase='approach';b.pos.copy(d.start).lerp(approach,T.MathUtils.smoothstep(d.age/5,0,1));}
  else if(d.age<6.7){d.phase='plunge';const t=T.MathUtils.smoothstep((d.age-5)/1.7,0,1);b.pos.copy(approach).lerp(entry,t);}
  else if(d.age<7.25){d.phase='skim';b.pos.copy(entry).addScaledVector(d.direction,(d.age-6.7)*1.8);if(!d.contact){d.contact=true;w.splashAt(d.strike.x,.05,d.strike.z,18);const audio=w.audio.recorded;if(audio?.has('splash'))audio.play('splash',{position:()=>d.strike,owner:()=>state.dive===d,ownerType:'ambient',gain:.24,cooldown:1});else w.audio.cue('splash');for(const f of d.prey.school.members){f.scatterUntil=state.clock+between(3,6);f.escape.copy(f.pos).sub(d.strike).setY(0);if(f.escape.length()<.1)f.escape.set(1,0,1);f.escape.normalize().multiplyScalar(1.7);f.escape.y=-.65;}if(d.success){state.stats.catches++;d.prey.hiddenUntil=state.clock+between(32,65);b.carryUntil=state.clock+8;}}}
  else if(d.age<11){d.phase='climb';const t=(d.age-7.25)/3.75;b.pos.copy(entry).addScaledVector(d.direction,1+t*5);b.pos.y=.25+4.4*T.MathUtils.smoothstep(t,0,1);}
  else{b.mode='flight';b.until=state.clock+between(15,40);b.target=waterPoint(1.6,2.8,between(4,7));state.nextDive=state.clock+between(85,190);state.dive=null;}
  b.vel.copy(b.pos).sub(old).divideScalar(Math.max(.001,dt));
 }
 function carryFish(b){if(b.carry||!w.collection?.assets?.['05']?.scene)return;const model=cloneSkin(w.collection.assets['05'].scene),box=new T.Box3().setFromObject(model),size=box.getSize(v()),center=box.getCenter(v()),wrapper=new T.Group();model.position.sub(center);wrapper.add(model);wrapper.scale.setScalar(.26/Math.max(size.x,size.y,size.z));wrapper.position.set(0,-.10,.32);wrapper.rotation.z=.3;b.host.add(wrapper);wrapper.visible=false;b.carry=wrapper;}
 function stepBirds(dt){
  for(const b of state.birds){const host=b.host,protectedRole=b.inspector&&(inspectorStories.has(w.story.id)||life.ambient.some(e=>e.type==='pelican'));
   if(protectedRole){b.pos.copy(host.position);b.yaw=host.rotation.y;b.vel.set(0,0,0);continue;}
   if(b.mode!=='dive'){
    if(quiet()&&state.previewUntil<state.clock)beginDeparture(b);
    if(b.mode==='absent'){if(!quiet()&&state.clock>b.until)initArrival(b);}
    else{if(b.mode==='flight'&&state.clock>b.until)beginDeparture(b);if(b.mode==='flight'&&b.pos.distanceTo(b.target)<1.5){b.target=waterPoint(1.3,2.8,between(2.8,8));b.speed=between(1.2,2.6);state.stats.turns++;}steer(b,b.target,b.speed,dt,.8);if(b.mode==='depart'&&radial(b.pos)>5.2){b.mode='absent';b.until=state.clock+between(25,95);}}
   }
   host.visible=b.mode!=='absent';host.position.copy(b.pos);host.scale.setScalar(1);
   if(!host.visible)continue;
   const horizontal=Math.hypot(b.vel.x,b.vel.z);if(horizontal>.02){const yaw=Math.atan2(b.vel.x,b.vel.z),delta=Math.atan2(Math.sin(yaw-b.yaw),Math.cos(yaw-b.yaw));b.yaw+=delta*(1-Math.exp(-dt*4));host.rotation.y=b.yaw;b.bank=T.MathUtils.lerp(b.bank,clamp(-delta*.5,-.45,.45),1-Math.exp(-dt*2));host.rotation.x=clamp(-Math.atan2(b.vel.y,horizontal),-.65,1.05);host.rotation.z=b.bank;}
   const cameraGap=b.pos.clone().sub(w.camera.position);if(!state.dive&&state.previewUntil<state.clock&&w.seabird.previewUntil<=w.t&&cameraGap.length()<3.5){cameraGap.normalize().multiplyScalar(3.5);host.position.copy(w.camera.position).add(cameraGap);}
   if(state.clock>b.glideAt){b.glideUntil=state.clock+between(2,5);b.glideAt=b.glideUntil+between(3,8);}const diving=state.dive?.bird===b&&state.dive.phase==='plunge',gliding=diving||state.clock<b.glideUntil;
   const instance=w.seabird.instances.find(s=>s.bird.g===host);if(instance){for(const j of instance.wings){const angle=j.side*(diving?.55:.09+(gliding?0:Math.sin(state.clock*b.beat+b.phase)*.48*j.gain));j.bone.quaternion.copy(j.rest).multiply(new T.Quaternion().setFromAxisAngle(j.axis,angle));}instance.attitude.rotation.z=0;instance.model.updateWorldMatrix(true,true);}
   else for(const [i,wing]of(w.birds[b.index]?.wings||[]).entries())wing.rotation.z=Math.sin(state.clock*b.beat+b.phase)*.35*(i?1:-1);
   carryFish(b);if(b.carry)b.carry.visible=state.clock<b.carryUntil;
  }
 }
 function stepButterflies(dt){for(const b of state.butterflies){if(state.clock>b.until){b.mode=b.mode==='rest'?'flight':r.next()<.35?'rest':'flight';b.target.set(between(-.8,4.5),b.mode==='rest'?between(.55,.9):between(1,2.8),between(-1.8,1.2));b.until=state.clock+between(5,16);}steer(b,b.target,b.mode==='rest'?.25:.5,dt,2);b.host.position.copy(b.pos);b.host.visible=w.storm<.4&&w.night<.55;b.host.rotation.y=Math.atan2(b.vel.x,b.vel.z);for(const [i,wing]of b.host.userData.wings.entries())wing.rotation.z=(b.mode==='rest'&&b.pos.distanceTo(b.target)<.15?.15:Math.sin(state.clock*b.speed+b.phase)*.8)*(i?1:-1);}}
 state.step=dt=>{state.clock+=dt;if(state.clock>state.nextLull)state.inviteQuiet();stepSchools(dt);if(state.clock>state.nextDive&&!state.dive){if(!beginDive())state.nextDive=state.clock+between(12,25);}stepDive(dt);stepBirds(dt);stepButterflies(dt);
  // Preview cameras follow the final ecological position, after the older hooks.
  const subject=state.previewUntil>state.clock?state.dive?.bird||state.birds[0]:w.seabird.previewUntil>w.t?state.birds[0]:null;
  if(subject&&!w.ocean?.underwater){const offset=state.previewUntil>state.clock?v(5,3.2,7):v(1.8,.7,3.1).applyAxisAngle(v(0,1,0),subject.host.rotation.y);w.camera.position.copy(subject.pos).add(offset);w.camera.lookAt(state.dive&&state.previewUntil>state.clock?subject.pos.clone().lerp(state.dive.strike,.25):subject.pos);}
 };
 life.after=function(dt){previous(dt);state.step(dt);};
 const preview=w.seabird.preview;w.seabird.preview=()=>{const b=state.birds[0];if(b.mode==='absent')initArrival(b);b.until=state.clock+25;preview();};document.getElementById('seabird-button').onclick=w.seabird.preview;
 document.getElementById('bird-fishing-button').onclick=()=>state.inviteDive();
 for(const id of ['portrait','moments','swim','dive','next','shark-button','dolphin-button','mermaid-button','visitors-button'])document.getElementById(id)?.addEventListener('click',()=>{state.previewUntil=0;});
 const debug=life.debug.bind(life);life.debug=()=>({...debug(),ecology:state.debug()});state.debug=()=>({version:state.version,clock:state.clock,stats:{...state.stats},birds:state.birds.filter(b=>b.host.visible).length,fish:state.fish.filter(f=>f.host.visible).length,dive:state.dive?.phase||null,quiet:state.clock<state.lullUntil,schools:state.schools.map(s=>s.mode)});
 return state;
}
