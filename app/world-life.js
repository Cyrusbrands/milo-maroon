import * as T from './vendor/three.module.js';
import {terrain} from './world.js';
import {projectClear} from './contact.js';
import {cloneSkin} from './asset-utils.js';
import {ASSET_ROLES} from './asset-roles.js';
import {seabed} from './ocean.js';
const TAU=Math.PI*2,Y=new T.Vector3(0,1,0),smooth=T.MathUtils.smoothstep;
const WATER=new Set(['swim','snorkel','dive','glowSwim','surfing','raft']);

export function enableWorldLife(w){
 const l=w.life,d=l.director,c=d.camp;
 const memory=c.worldLife={growth:0,meals:0,stormFinds:0,discoveries:[],seen:{},...(c.worldLife||{})};
 const state=w.worldLife={version:'0.15.1',roles:ASSET_ROLES,memory,lastSeen:{},wetness:0,footprints:0,washedPrints:0,planeVisits:0,nextPlane:w.t+l.r.range(125,235),previewUntil:0,cameraFocus:null,nextFocus:0};
 const group=new T.Group();group.name='Living shoreline';w.scene.add(group);
 // Use the same seabed height as the swimming controller, so the new visible
 // shallows cannot create a different floor for the swimmer to intersect.
 const shelfPositions=[],shelfColors=[],shelfIndices=[];
 for(let j=0;j<=12;j++)for(let i=0;i<=128;i++){const a=i/128*TAU,r=1.01+j*.10,x=Math.cos(a)*7.8*r,z=Math.sin(a)*5.7*r;shelfPositions.push(x,seabed(x,z)-.12,z);const color=new T.Color('#c6cda7').lerp(new T.Color('#3f888e'),j/12);shelfColors.push(color.r,color.g,color.b);if(j<12&&i<128){const k=j*129+i;shelfIndices.push(k,k+1,k+129,k+1,k+130,k+129);}}
 const shelfGeometry=new T.BufferGeometry();shelfGeometry.setAttribute('position',new T.Float32BufferAttribute(shelfPositions,3));shelfGeometry.setAttribute('color',new T.Float32BufferAttribute(shelfColors,3));shelfGeometry.setIndex(shelfIndices);shelfGeometry.computeVertexNormals();group.add(new T.Mesh(shelfGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide})));
 w.seaMat.fragmentShader=w.seaMat.fragmentShader.replace('#include <tonemapping_fragment>','float shoreR=length(vP.xz/vec2(7.8,5.7));float shallowWindow=smoothstep(.98,1.10,shoreR)*(1.-smoothstep(1.3,1.9,shoreR));if(gl_FrontFacing)gl_FragColor.a*=1.-shallowWindow*.40;\n#include <tonemapping_fragment>');w.seaMat.needsUpdate=true;
 const oval=new T.CircleGeometry(1,18),dummy=new T.Object3D();
 const flat=(parent,material,x,z,sx,sz)=>{const m=new T.Mesh(oval,material);m.rotation.x=-Math.PI/2;m.position.set(x,terrain(x,z)+.025,z);m.scale.set(sx,sz,1);parent.add(m);return m;};

 // Swash follows the actual sloping island mesh; the collision terrain stays stable.
 w.foams.forEach(o=>o.visible=false);
 const foamMaterial=new T.MeshBasicMaterial({color:'#edf9e5',transparent:true,opacity:.20,side:T.DoubleSide,depthWrite:false});
 const bands=[];
 for(let k=0;k<3;k++){
  const geometry=new T.BufferGeometry(),positions=new Float32Array(129*2*3),indices=[];
  for(let i=0;i<128;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(indices);
  const mesh=new T.Mesh(geometry,foamMaterial.clone());mesh.frustumCulled=false;group.add(mesh);bands.push(mesh);
 }
 const tide={value:0},rain={value:0},sandCompile=w.islandGround.material.onBeforeCompile;
 w.islandGround.material.onBeforeCompile=s=>{sandCompile(s);s.uniforms.livingTide=tide;s.uniforms.rainWet=rain;s.fragmentShader='uniform float livingTide;uniform float rainWet;\n'+s.fragmentShader.replace('float wet=smoothstep(.83,1.04,radial);','float wet=max(rainWet*.65,smoothstep(.80+livingTide*.025,1.02+livingTide*.025,radial));');};
 w.islandGround.material.needsUpdate=true;
 const printMesh=new T.InstancedMesh(oval,new T.MeshBasicMaterial({color:'#b59d74',transparent:true,opacity:.31,depthWrite:false}),160);
 printMesh.frustumCulled=false;group.add(printMesh);const prints=Array.from({length:160},()=>({life:0,x:0,z:0,yaw:0}));let printIndex=0,stepDistance=0,lastPosition=null,stepSide=1;
 for(let i=0;i<160;i++){dummy.scale.setScalar(0);dummy.updateMatrix();printMesh.setMatrixAt(i,dummy.matrix);}
 const puddles=[];for(const [x,z,sx,sz]of [[-3,2.2,.48,.22],[2.1,3.1,.35,.17],[-.2,1.4,.45,.23],[4.4,.1,.32,.2]])puddles.push(flat(group,new T.MeshStandardMaterial({color:'#8abbb5',metalness:.3,roughness:.19,transparent:true,opacity:0,depthWrite:false}),x,z,sx,sz));
 const dripPositions=new Float32Array(36*3),dripGeometry=new T.BufferGeometry();dripGeometry.setAttribute('position',new T.BufferAttribute(dripPositions,3));
 const drips=new T.Points(dripGeometry,new T.PointsMaterial({color:'#c6ebe5',size:.026,transparent:true,opacity:.3,depthWrite:false}));group.add(drips);

 // Two shallow tide pools, with small imported reef fish and shell-dwelling crabs.
 const pools=[];
 const poolSites=[0,1].map(side=>{let best=null;for(let i=0;i<20;i++)for(const r of [.77,.81,.85]){const a=(side?.45:1.8)+i*.035,x=Math.cos(a)*7.8*r,z=Math.sin(a)*5.7*r;const clearance=Math.min(...w.shoreStones.map(stone=>Math.hypot(x-stone.position.x,z-stone.position.z)-(stone.geometry.parameters.radius||.4)*Math.max(...stone.scale)));const score=clearance-Math.abs(z-3.8)*.08;if(!best||score>best.score)best={x,z,score};}return[best.x,best.z];});
 for(const [x,z]of poolSites){
  const pool=new T.Group();pool.position.set(x,terrain(x,z)+.035,z);group.add(pool);
  const water=new T.Mesh(oval,new T.MeshStandardMaterial({color:'#53aaa6',metalness:.25,roughness:.2,transparent:true,opacity:.7,side:T.DoubleSide}));water.rotation.x=-Math.PI/2;water.scale.set(.65,.40,1);pool.add(water);
  for(let i=0;i<12;i++){const a=i/12*TAU,stone=new T.Mesh(new T.IcosahedronGeometry(.10+i%3*.015,1),new T.MeshStandardMaterial({color:i%3?'#a0a58d':'#d9c7a6',roughness:.92}));stone.position.set(Math.cos(a)*.67,.01,Math.sin(a)*.42);stone.scale.y=.65;pool.add(stone);}
  const shell=new T.Mesh(new T.SphereGeometry(.07,10,7),new T.MeshStandardMaterial({color:'#dcac79',roughness:.65}));shell.scale.set(1,.7,.85);for(const side of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.009,6,5),new T.MeshBasicMaterial({color:'#233e3c'}));eye.position.set(side*.027,.03,.06);shell.add(eye);const claw=new T.Mesh(new T.SphereGeometry(.017,6,5),new T.MeshStandardMaterial({color:'#cc8d68'}));claw.position.set(side*.063,-.025,.052);shell.add(claw);for(let k=0;k<2;k++){const leg=new T.Mesh(new T.CylinderGeometry(.004,.005,.065,5),new T.MeshStandardMaterial({color:'#a47958'}));leg.position.set(side*.061,-.035,k*.04-.02);leg.rotation.z=side*1.15;shell.add(leg);}}pool.add(shell);pools.push({group:pool,water,shell,fish:[],x,z});
  (w.contactObjects??=[]).push({id:'tide-pool-'+x,object:pool,halfX:.67,halfZ:.44});
 }
 state.pools=pools;
 const souvenirs=new T.Group();souvenirs.position.set(-3.5,terrain(-3.5,1.8)+.03,1.8);group.add(souvenirs);
 for(let i=0;i<4;i++){const shell=new T.Mesh(new T.SphereGeometry(.065,10,6),new T.MeshStandardMaterial({color:['#eec5a5','#eee3b1','#a9c9bb','#d6b0b6'][i]}));shell.position.set(i*.17,0,0);shell.scale.y=.45;souvenirs.add(shell);}
 // Growing flowers remain after gardening. Growth is simulated only while running.
 const garden=new T.Group();garden.position.set(.6,terrain(.6,3.65)+.025,3.65);group.add(garden);state.garden=garden;
 for(let i=0;i<6;i++){const plant=new T.Group();plant.position.set((i%3-.9)*.3,0,Math.floor(i/3)*.24);garden.add(plant);const stem=new T.Mesh(new T.CylinderGeometry(.012,.017,.35,6),new T.MeshStandardMaterial({color:'#5b884c'}));stem.position.y=.17;plant.add(stem);for(let j=0;j<4;j++){const petal=new T.Mesh(new T.SphereGeometry(.045,7,5),new T.MeshStandardMaterial({color:i%2?'#f1bd72':'#e6a7a4'}));petal.position.set(Math.sin(j*Math.PI/2)*.04,.35,Math.cos(j*Math.PI/2)*.04);petal.scale.y=.45;plant.add(petal);}}
 (w.contactObjects??=[]).push({id:'persistent-garden',object:garden,halfX:.48,halfZ:.28});
 const invention=new T.Group();invention.userData.keepWithImportedAsset=true;w.persistentAssets.workshop.add(invention);invention.position.set(0,1.02,0);
 const blueprint=new T.Mesh(new T.PlaneGeometry(.35,.24),new T.MeshStandardMaterial({color:'#477c92',side:T.DoubleSide}));blueprint.rotation.x=-Math.PI/2;invention.add(blueprint);
 const rotor=new T.Mesh(new T.BoxGeometry(.46,.025,.06),new T.MeshStandardMaterial({color:'#ceae76'}));rotor.position.y=.30;invention.add(rotor);state.invention=invention;
 const mast=new T.Mesh(new T.CylinderGeometry(.015,.02,.3,6),new T.MeshStandardMaterial({color:'#9b7952'}));mast.position.y=.15;invention.add(mast);
 const greetingRing=new T.Mesh(new T.RingGeometry(.5,.55,48),new T.MeshBasicMaterial({color:'#ddfff0',transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false}));greetingRing.rotation.x=-Math.PI/2;group.add(greetingRing);
 const seat=new T.Mesh(new T.CylinderGeometry(.29,.33,.50,14),new T.MeshStandardMaterial({color:'#916b46',roughness:.94}));seat.visible=false;group.add(seat);
 const seatRing=new T.Mesh(new T.RingGeometry(.19,.20,24),new T.MeshBasicMaterial({color:'#bd9564',side:T.DoubleSide}));seatRing.rotation.x=-Math.PI/2;seatRing.position.y=.252;seat.add(seatRing);

 const weights=l.props.weights,weightParts=[...weights.children],dumbbells=[];
 for(let i=0;i<2;i++){const holder=new T.Group(),center=new T.Vector3(i?.65:-.65,1,.1);weights.add(holder);holder.position.copy(center);for(const part of weightParts.slice(i*3,i*3+3)){part.position.sub(center);holder.add(part);}dumbbells.push(holder);}
 const finish=d.finish.bind(d);d.finish=function(){const before=this.completed;finish();if(this.completed===before)return;const id=this.lastChosen;if(id==='garden')memory.growth=Math.min(1,memory.growth+.1);if(id==='cook')memory.meals++;if(['treasure','clue','metalDetector','door'].includes(id)&&!memory.discoveries.includes(id))memory.discoveries.push(id);};
 const ambient=l.forceAmbient.bind(l);let previewFlight=false;
 l.forceAmbient=function(type,duration){
  if(type==='plane'&&!previewFlight&&w.t<state.nextPlane)return;
  ambient(type,duration);
  if(type==='plane'){const e=this.ambient.find(e=>e.type==='plane');if(e&&!e.livingFlight){e.livingFlight=true;e.route=['rest','sleepcruise'].includes(w.story.id)?'missed':this.r.next()<.35?'search':'flyby';e.duration=duration||this.r.range(33,44);e.sound=true;e.nextEngine=0;state.planeVisits++;state.nextPlane=w.t+this.r.range(600,1000);}}
 };
 const showcase=w.collection.showcase;w.collection.showcase=id=>{previewFlight=id==='plane';showcase(id);previewFlight=false;};
 const pickShot=l.pickShot.bind(l);l.pickShot=function(){pickShot();this.shotDuration=this.r.range(125,265);};l.shotDuration=Math.max(125,l.shotDuration);
 let quietVisitor=null,nextQuietVisitor=w.t+l.r.range(330,570);state.nextQuietVisitor=nextQuietVisitor;let previousStorm=w.storm,previewTarget=null,previewKind=null,nextDiscovery=w.t+l.r.range(150,260),rainSound=0;
 const focus=(target,duration=10)=>{if(w.settings.camera!=='cinematic'||!w.settings.motion||w.t<state.nextFocus||w.ocean.underwater)return;state.cameraFocus={target:target.clone(),until:w.t+duration};state.nextFocus=w.t+l.r.range(220,380);};
 state.preview=kind=>{
  if(!w.started)document.getElementById('begin').click();w.collection.previewMermaidUntil=0;w.art.portraitUntil=0;for(const name of ['palm','turtle','claw','shark','seabird','dolphin','tent'])if(w[name])w[name].previewUntil=0;previewKind=kind;state.previewUntil=w.t+24;
  if(kind==='plane'){previewFlight=true;l.forceAmbient('plane',38);previewFlight=false;}
  if(kind==='shore'){previewTarget=pools[0].group.position.clone().add(new T.Vector3(0,.2,0));}
  if(kind==='garden'){previewTarget=garden.position.clone();}
  if(kind==='after-rain'){state.wetness=1;previewTarget=new T.Vector3(0,1,1);}
 };
 const previews=[['plane-button','Aircraft','plane'],['shore-button','Tide pools','shore'],['garden-button','Garden','garden'],['rain-button','After the rain','after-rain']];
 const grid=document.querySelector('.explore-grid');for(const [id,label,kind]of previews){const button=document.createElement('button');button.id=id;button.className='text-button';button.textContent=label;button.onclick=()=>state.preview(kind);grid.append(button);}
 const roster=document.createElement('details');roster.className='asset-roster';const summary=document.createElement('summary');summary.textContent='The island cast · 24 assets and their roles';roster.append(summary);
 for(const role of ASSET_ROLES){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=role.name+': ';p.append(strong,document.createTextNode(role.role));roster.append(p);}document.getElementById('explore').append(roster);
 state.audit=()=>ASSET_ROLES.map(role=>{const id=role.id,numeric=/^\d/.test(id),instances=numeric?w.collection.instances.filter(i=>i.id===id):[],loaded=numeric?!!w.collection.assets[id]:id==='hero'?w.rigged.loaded:!!w[id]?.loaded;return{...role,loaded,instances:numeric?instances.length:id==='hero'?1:w[id]?.instances?.length||1,seen:memory.seen[id]||0};});

 const after=l.after.bind(l);l.after=function(dt){
  after(dt);if(!w.started)return;const t=w.t,id=w.story.id,p=w.storyTime/w.duration;
  tide.value=Math.sin(t*.025);state.tide=tide.value;state.wetness=T.MathUtils.clamp(state.wetness+dt*(w.storm>.25?w.storm*.06:-.003),0,1);rain.value=state.wetness;
  bands.forEach((mesh,k)=>{const q=(t*.085+k/3)%1,r=8.25-q*1.08,a=mesh.geometry.attributes.position;for(let i=0;i<=128;i++){const angle=i/128*TAU,n=1+.035*Math.sin(angle*5)+.022*Math.cos(angle*9);for(let j=0;j<2;j++){const radius=(r+j*.055)*n,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius*.73;a.setXYZ(i*2+j,x,Math.max(.025,terrain(x,z)+.018),z);}}a.needsUpdate=true;mesh.material.opacity=Math.sin(q*Math.PI)*.15*(1+w.storm*.5);});
  const actor=w.actor.g,land=!WATER.has(id)&&!['rest','sleepcruise','hammockFail'].includes(id)&&w.actor.body.position.y>-.15;
  seat.visible=actor.visible&&['teatime','laptop','chess','sandcastle'].includes(id)&&w.actor.body.position.y<-.2;seat.position.set(actor.position.x,terrain(actor.position.x,actor.position.z)+.25,actor.position.z);
  if(lastPosition&&actor.visible&&land){const distance=actor.position.distanceTo(lastPosition);if(distance<.6)stepDistance+=distance;if(stepDistance>.34){stepDistance=0;stepSide*=-1;const right=new T.Vector3(.13*stepSide,0,0).applyQuaternion(actor.quaternion),pos=actor.position.clone().add(right);prints[printIndex]={life:1,x:pos.x,z:pos.z,yaw:actor.rotation.y};printIndex=(printIndex+1)%prints.length;}}
  lastPosition=actor.position.clone();let active=0;
  prints.forEach((f,i)=>{const radial=Math.hypot(f.x/7.8,f.z/5.7),wash=radial>.88&&Math.sin(t*.53+i*.2)>.5;const old=f.life;f.life=Math.max(0,f.life-dt*(wash?.8:w.storm>.4?.03:.004));if(old>0&&f.life===0&&wash)state.washedPrints++;if(f.life>0)active++;dummy.position.set(f.x,terrain(f.x,f.z)+.021,f.z);dummy.rotation.set(-Math.PI/2,0,f.yaw);dummy.scale.set(.055*f.life,.13*f.life,1);dummy.updateMatrix();printMesh.setMatrixAt(i,dummy.matrix);});printMesh.instanceMatrix.needsUpdate=true;state.footprints=active;
  puddles.forEach(m=>{m.visible=state.wetness>.04;m.material.opacity=state.wetness*.3;});
  drips.visible=w.storm>.25||state.wetness>.65;for(let i=0;i<36;i++){const k=i%4,base=[[1.9,-2.1],[4,-.7],[-3.8,-1.5],[.1,-3.2]][k],q=(t*.65+i*.17)%1;dripPositions[i*3]=base[0]+Math.sin(i*4)*.7;dripPositions[i*3+1]=terrain(...base)+3.4-q*3;dripPositions[i*3+2]=base[1]+Math.cos(i*3)*.8;}dripGeometry.attributes.position.needsUpdate=true;
  if(!w.audio.recorded?.has('drips')&&state.wetness>.65&&w.storm<.25&&t-rainSound>18){rainSound=t;w.audio.noiseHit(.10,.018,1600,Math.sin(t));}
  if(previousStorm>.4&&w.storm<.4){memory.stormFinds++;if(!memory.discoveries.includes('storm-shell'))memory.discoveries.push('storm-shell');w.onWorldEvent?.('The shower left puddles, dripping palms and something new on the beach.');}previousStorm=w.storm;
  if(t>nextDiscovery&&w.storm<.3&&!w.ocean.underwater){nextDiscovery=t+l.r.range(600,1100);if(!memory.discoveries.includes('tide-pool'))memory.discoveries.push('tide-pool');w.onWorldEvent?.('The falling water has uncovered a tiny world between the stones.');focus(pools[0].group.position);}
  pools.forEach((pool,k)=>{pool.water.material.opacity=.6+Math.sin(t*1.4+k)*.08;pool.shell.position.set(Math.sin(t*.13+k)*.36,.055,Math.cos(t*.13+k)*.23);pool.shell.rotation.y=t*.13;
   if(!pool.fish.length&&w.collection.assets['05']&&w.collection.assets['06'])for(let i=0;i<2;i++){const model=cloneSkin(w.collection.assets[i?'06':'05'].scene),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),host=new T.Group();model.position.sub(center);host.add(model);host.scale.setScalar(.19/Math.max(...size));pool.group.add(host);pool.fish.push(host);}
   pool.fish.forEach((fish,i)=>{const a=t*.65+i*Math.PI;fish.position.set(Math.cos(a)*.30,.018,Math.sin(a)*.18);fish.rotation.y=-a;});
  });
  memory.growth=Math.min(1,memory.growth+(c.garden>0?dt*.00016:0));garden.visible=c.garden>0||(state.previewUntil>t&&previewKind==='garden');const growth=garden.visible?Math.max(.18,Math.min(1,c.garden*.12+memory.growth)):0;garden.children.forEach((plant,i)=>plant.scale.setScalar(growth*(.8+i%3*.1)));
  invention.visible=c.repairs>0||d.arcs.power>0||d.inventory.raftAttempts>0;rotor.visible=mast.visible=d.arcs.power>1;rotor.rotation.y=t*(.4+l.weather.breeze);souvenirs.children.forEach((o,i)=>o.visible=i<memory.discoveries.length);
  if(id==='quiet'&&memory.meals>0){l.props.pot.visible=true;l.props.pot.position.set(-.9,terrain(-.9,.65)+.06,.65);}
  if((id==='quiet'&&c.birdTrust>0||id==='garden')&&w.collection.assets['07']){l.props.parrot.visible=true;l.props.parrot.position.copy(w.crate.position).add(new T.Vector3(0,1.05,0));l.props.parrot.rotation.y=Math.sin(t*.2)*.3;}
  if(id==='quiet'&&c.turtleTrust>0&&d.arcs.egg===3&&w.turtle?.loaded){const pebble=w.turtle.instances.find(i=>i.role==='pebble'),target=actor.position.clone().add(new T.Vector3(1.1,0,.65)),old=pebble.host.position.clone(),q=projectClear(target.x,target.z,w.contact.collectSolids());state.pebblePosition??=old.clone();const direction=new T.Vector3(q.x-state.pebblePosition.x,0,q.z-state.pebblePosition.z),distance=direction.length();if(distance>.02)state.pebblePosition.addScaledVector(direction,Math.min(1,dt*.18/distance));const safe=projectClear(state.pebblePosition.x,state.pebblePosition.z,w.contact.collectSolids());state.pebblePosition.set(safe.x,terrain(safe.x,safe.z)+.045,safe.z);pebble.host.position.copy(state.pebblePosition);if(distance>.04)pebble.host.rotation.y=Math.atan2(direction.x,direction.z);pebble.host.visible=true;state.pebbleFollowing=true;}else{state.pebbleFollowing=false;state.pebblePosition=null;}
  if(id==='quiet'&&c.crabTrust>0&&w.claw?.loaded){const target=memory.discoveries.length?w.crate.position:actor.position,q=projectClear(target.x+1,target.z+.8,w.contact.collectSolids());l.extraCrab.g.position.set(q.x,terrain(q.x,q.z)+.025,q.z);state.clawAtHome=true;}else state.clawAtHome=false;
  if(w.collection.mermaidHost.visible&&w.collection.mermaidState?.phase==='surface'){
   state.dolphinGreeting=false;const pos=w.collection.mermaidHost.position;if(state.focusedMermaidVisit!==w.collection.mermaidVisits){state.focusedMermaidVisit=w.collection.mermaidVisits;focus(pos,14);if(state.cameraFocus)state.cameraFocus.kind='mermaid';}for(let i=0;i<2;i++){const fish=l.fishSchool[i];fish.position.set(pos.x+Math.sin(t*.8+i)*1.6,-.28,pos.z+Math.cos(t*.8+i)*1.3);fish.visible=true;}greetingRing.visible=true;greetingRing.position.set(pos.x,.04,pos.z);greetingRing.scale.setScalar(.8+(t*.25%1));greetingRing.material.opacity=(1-t*.25%1)*.18;
   const pod=l.ambient.find(e=>e.type==='dolphin');if(pod&&!pod.pod?.playBall&&w.dolphin?.loaded){const friend=w.dolphin.instances.at(-1);friend.host.position.set(pos.x+2+Math.sin(t*.7),-.48,pos.z+.7+Math.cos(t*.7));friend.host.rotation.y=-t*.7;state.dolphinGreeting=true;}
  }else{greetingRing.visible=false;state.dolphinGreeting=false;}
  if(t>nextQuietVisitor&&!quietVisitor&&w.storm<.3&&!w.ocean.underwater&&!w.collection.mermaidHost.visible&&l.ambient.length===0){
   const types=['sailboat','pirate',...(w.night>.65?['ufo']:[])],kind=types.sort((a,b)=>(state.lastSeen[{sailboat:'03',pirate:'02',ufo:'15'}[a]]||0)-(state.lastSeen[{sailboat:'03',pirate:'02',ufo:'15'}[b]]||0))[0];
   quietVisitor={kind,start:t,duration:l.r.range(42,62)};nextQuietVisitor=t+l.r.range(720,1200);state.nextQuietVisitor=nextQuietVisitor;w.onWorldEvent?.(kind==='ufo'?'A very unusual light is taking its time offshore.':kind==='pirate'?'A questionable flag appears beyond the reef.':'A small sail is tracing the horizon.');
  }
  if(quietVisitor){const q=(t-quietVisitor.start)/quietVisitor.duration,kind=quietVisitor.kind,host=kind==='sailboat'?w.ship:kind==='pirate'?l.pirate:w.ufo,story=kind==='sailboat'?'ship':kind==='pirate'?'pirates':'ufo';if(q>=1||id===story){quietVisitor=null;}else{host.visible=true;host.position.set(-23+q*46,kind==='ufo'?6.5+Math.sin(t*.7)*.15:.06,-10);host.rotation.y=0;if(kind==='ufo')w.beam.visible=false;state.quietVisitor={kind,progress:q};}}
  else state.quietVisitor=null;
  if(id==='ufo')w.beam.visible=true;
  if(t>=state.nextPlane&&w.storm<.4&&!w.ocean.underwater&&l.ambient.length<2)l.forceAmbient('plane');
  const plane=l.ambient.find(e=>e.type==='plane');if(plane){const q=plane.age/plane.duration,search=plane.route==='search',cycles=search?3:1,x=search?-plane.side*26*Math.cos(q*Math.PI*cycles):plane.side*(-27+q*54),z=search?-9+Math.sin(q*Math.PI*cycles)*4:-7+Math.sin(q*Math.PI)*2,dx=search?plane.side*26*Math.PI*cycles*Math.sin(q*Math.PI*cycles):plane.side*54,dz=search?4*Math.cos(q*Math.PI*cycles)*Math.PI*cycles:Math.cos(q*Math.PI)*Math.PI*2;l.airplane.position.set(x,5.6+Math.sin(q*Math.PI)*.8,z);l.airplane.rotation.set(0,-Math.atan2(dz,dx),search?Math.sin(q*Math.PI*cycles)*.25:.03);const aircraft=w.collection.instances.find(i=>i.id==='14');if(aircraft?.propeller){l.airplane.updateWorldMatrix(true,true);const nose=aircraft.propeller.getWorldPosition(new T.Vector3()).sub(l.airplane.position);if(nose.x*dx+nose.z*dz<0)l.airplane.rotation.y+=Math.PI;}
   state.flight={route:plane.route||'flyby',progress:q,position:l.airplane.position.toArray()};
   if(!w.audio.recorded?.has('plane')&&plane.age>plane.nextEngine){plane.nextEngine=plane.age+3.4;w.audio.tone(90,3.5,Math.sin(q*Math.PI)*.018,'triangle',T.MathUtils.clamp(x/25,-1,1),82);}
   if(!plane.noticed&&q>.36){plane.noticed=true;if(!['rest','sleepcruise'].includes(id)){l.say('This way! Excellent beach. Terrible reception.');focus(l.airplane.position,9);}else w.onWorldEvent?.('A search plane passes while Milo dreams of a quieter island.');}
  }else state.flight=null;
  if(!w.ocean.underwater){w.contact.correctPlacement();w.rigged.groundFeet?.();w.rigged.syncHandProps?.();}
  if(weights.visible&&w.rigged.loaded){weights.updateWorldMatrix(true,true);for(const [i,side]of ['Right','Left'].entries()){const bones=w.rigged.getBones(),palm=bones[side+'Hand'].getWorldPosition(new T.Vector3()).lerp(bones[side+'HandMiddle1'].getWorldPosition(new T.Vector3()),.5);dumbbells[i].position.copy(weights.worldToLocal(palm));}}
  for(const role of ASSET_ROLES){let seen=false;if(/^\d/.test(role.id))seen=w.collection.instances.some(i=>i.id===role.id&&hierarchyVisible(i.host));else if(role.id==='hero')seen=actor.visible;else if(role.id==='tent'||role.id==='palm')seen=!!w[role.id]?.loaded;else seen=(w[role.id]?.instances||[]).some(i=>hierarchyVisible(i.host||i.bird?.g));if(seen&&(!state.lastSeen[role.id]||t-state.lastSeen[role.id]>30)){state.lastSeen[role.id]=Math.max(1,t);memory.seen[role.id]=Math.max(1,t);}}
  const preview=state.previewUntil>t,mermaidPreview=w.collection.previewMermaidUntil>t&&w.collection.mermaidHost.visible;
  const otherPreview=['art','dolphin','shark','seabird','turtle','claw','tent','palm'].some(name=>(w[name]?.previewUntil||w[name]?.portraitUntil||0)>t);
  if(preview&&previewKind==='plane'&&plane)previewTarget=l.airplane.position.clone();
  const mermaidFocus=mermaidPreview||!preview&&state.cameraFocus?.until>t&&state.cameraFocus.kind==='mermaid';
  const target=mermaidPreview?w.collection.mermaidHost.position.clone().setY(.2):preview?previewTarget:state.cameraFocus?.until>t?state.cameraFocus.target:null;
  if(target&&!w.ocean.underwater&&w.settings.camera!=='fixed'&&(preview||mermaidPreview||w.settings.motion)&&!otherPreview){
   const offset=mermaidFocus?new T.Vector3(-target.x,0,-target.z).normalize().multiplyScalar(4).add(new T.Vector3(0,1.8,0)):previewKind==='plane'&&preview?new T.Vector3(8,4,12):previewKind==='shore'&&preview?new T.Vector3(1.4,2.2,3):new T.Vector3(4,3.7,6);
   state.focusPosition??=w.camera.position.clone();state.focusAim??=target.clone();state.focusPosition.lerp(target.clone().add(offset),1-Math.exp(-dt*.65));state.focusAim.lerp(target,1-Math.exp(-dt*.8));
   if(preview&&previewKind==='plane')state.focusAim.copy(target);
   w.camera.position.copy(state.focusPosition);w.camera.lookAt(state.focusAim);l.camPos.copy(w.camera.position);l.camAim.copy(state.focusAim);
  }else{state.focusPosition=null;state.focusAim=null;}

 };
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),worldLife:{version:state.version,footprints:state.footprints,wetness:state.wetness,planeVisits:state.planeVisits,nextPlane:state.nextPlane,discoveries:[...memory.discoveries],assetRoles:ASSET_ROLES.length}});
}
function hierarchyVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return !!object;}
