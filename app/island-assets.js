import {poseMermaid} from './mermaid-life.js';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {cloneSkin,limitTextures} from './asset-utils.js';
import {terrain} from './world.js';
const TAU=Math.PI*2;
export function enableAssetCollection(w){
 const l=w.life,state=w.collection={loaded:false,errors:[],assets:{},instances:[],version:'0.15.1',mermaidVisits:0},loader=new GLTFLoader(),replacements=[];
 function attach(id,host,{length=1,axis='x',yaw=0,center=false,water=0,offset=[0,0,0],role=''}={}){
  const asset=state.assets[id];if(!asset||!host)return null;
  const fallback=[...host.children].filter(o=>!o.userData.keepWithImportedAsset),model=cloneSkin(asset.scene),orientation=new T.Group();orientation.rotation.y=yaw;orientation.add(model);orientation.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(orientation,true),size=bounds.getSize(new T.Vector3()),c=bounds.getCenter(new T.Vector3()),root=new T.Group(),scale=length/size[axis];
  orientation.position.set(-c.x,-(center?c.y:bounds.min.y+size.y*water),-c.z);root.add(orientation);host.updateWorldMatrix(true,false);const hostScale=host.getWorldScale(new T.Vector3()).x;root.scale.setScalar(scale/Math.max(.001,hostScale));root.position.set(...offset);host.add(root);fallback.forEach(o=>o.visible=false);
  const bones={},rest=new Map();model.traverse(o=>{if(o.isBone){bones[o.name]=o;rest.set(o,o.quaternion.clone());}if(o.isMesh){o.castShadow=!['04','05','06','16'].includes(id);o.receiveShadow=true;o.frustumCulled=!o.isSkinnedMesh;}});
  const configs=asset.configs.map(c=>({...c,bone:bones[c.name],axis:new T.Vector3(...(c.localAxis||c.axis))})).filter(c=>c.bone);
  host.updateWorldMatrix(true,true);const footprint=new T.Box3().setFromObject(root,true).applyMatrix4(host.matrixWorld.clone().invert());
  const instance={footprint,id,host,root,model,fallback,bones,rest,configs,role,length,axis,scale};replacements.push(instance);state.instances.push(instance);return instance;
 }
 const mermaidHost=new T.Group();w.scene.add(mermaidHost);mermaidHost.visible=false;state.mermaidHost=mermaidHost;let mermaid=null,visit=null,nextVisit=l.r.range(120,240),lastTailSplash=-20;
 state.mermaidVisit=()=>visit?{...visit}:null;
 state.mermaidSchedule=()=>({nextVisit,active:!!visit});
 state.visitMermaid=()=>{if(!mermaid)return;visit={start:w.t,duration:l.r.range(64,86),mood:l.r.pick(['wave','shy','dolphins']),side:l.r.next()>.5?1:-1};state.mermaidVisits++;nextVisit=w.t+l.r.range(540,960);w.onWorldEvent?.('Someone is taking the scenic route around the reef.');};
 state.showcase=id=>{if(id==='mermaid'){state.visitMermaid();return;}const story={cruise:'sleepcruise',pirate:'pirates',whale:'whale',ufo:'ufo',sailboat:'ship'}[id];if(story){if(id==='cruise'){l.nextCruiseAt=w.t;l.forceAmbient('cruise');}window.castaway?.nextStory(window.castaway.stories.findIndex(s=>s.id===story));}else if(id==='plane')l.forceAmbient('plane');};
 state.ready=(async()=>{
  const response=await fetch('./island-assets.json');if(!response.ok)throw Error('Asset catalog unavailable');const catalog=await response.json();let queue=Object.values(catalog);
  // Two concurrent decodes bound startup memory; textures and geometry are shared by instances.
  await Promise.all([0,1].map(async()=>{while(queue.length){const entry=queue.shift();try{const g=await loader.loadAsync(entry.file);await limitTextures(g.scene,w.settings.quality==='low'?512:1024);state.assets[entry.id]={...entry,scene:g.scene};}catch(error){state.errors.push({id:entry.id,message:error.message});}}}));
  attach('01',l.cruise,{length:8.8,water:.16,role:'ambient cruise'});attach('01',w.companyAssets.party,{length:5.5,water:.16,role:'beacon cruise'});
  attach('02',l.pirate,{length:5.1,water:.1,role:'story and ambient pirate'});
  attach('03',w.ship,{length:4.2,yaw:Math.PI/2,axis:'z',water:.12,role:'rescue sailboat'});
  attach('04',w.whale,{length:5.2,center:true,role:'whale story'});attach('04',w.companyAssets.whale,{length:6.4,center:true,offset:[0,-.3,0],role:'rare whale'});
  const seen=new Set(),fishHosts=[w.fish,w.companyAssets.heroFish,...l.fishSchool,...w.reefFish,...w.ocean.fishGroups,...w.persistentAssets.fish];
  fishHosts.forEach((host,i)=>{if(seen.has(host))return;for(let parent=host.parent;parent;parent=parent.parent)if(seen.has(parent))return;seen.add(host);const hero=host===w.fish||host===w.companyAssets.heroFish;attach(i%3===0?'06':'05',host,{length:hero?.72:l.fishSchool.includes(host)?.45:.40,center:true,yaw:i%3===0?0:Math.PI,role:hero?'fishing catch':'reef school'});});
  attach('07',l.props.parrot,{length:.48,axis:'y',center:true,role:'Milo companion'});
  attach('08',w.hammock,{length:3.25,role:'camp hammock'});
  const chest=attach('09',l.props.chest,{length:1.05,role:'opening treasure chest'});attach('09',w.crate,{length:1,role:'camp storage'});
  attach('10',w.persistentAssets.workshop,{length:1.0,axis:'y',role:'workshop'});
  attach('11',l.props.pot,{length:.7,axis:'y',role:'cooking pot'});
  const raft=attach('12',l.props.raft,{length:2.7,axis:'z',role:'buildable raft'});
  const rod=attach('13',w.actor.rod,{length:2.15,axis:'z',role:'fishing rod'});if(rod){const g=state.assets['13'].acceptance.gripCandidate;rod.grip=new T.Vector3(...g);rod.tip=new T.Vector3(...state.assets['13'].acceptance.tipLineCandidate);}
  const plane=attach('14',l.airplane,{length:4.8,yaw:Math.PI/2,axis:'z',center:true,role:'passing aircraft'});
  const ufo=attach('15',w.ufo,{length:4.4,center:true,role:'UFO visitor'});if(ufo){w.beam.visible=true;ufo.fallback=ufo.fallback.filter(o=>o!==w.beam&&!w.ufoLights.includes(o));w.ufoLights.forEach((o,i)=>{const angle=i/10*TAU;o.position.set(Math.cos(angle)*2,-.05,Math.sin(angle)*2);o.scale.setScalar(1.1);});}
  mermaid=attach('16',mermaidHost,{length:2.6,axis:'y',center:true,role:'rare mermaid'});state.mermaid=mermaid;
  // Separate animated lights and steam stay outside the generated meshes.
  const steam=new T.Group();l.props.pot.add(steam);for(let i=0;i<6;i++){const o=new T.Mesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:'#e3eee6',transparent:true,opacity:.12,depthWrite:false}));steam.add(o);}state.steam=steam;
  if(chest){chest.hinge=chest.model.getObjectByName('Chest_Lid_Hinge');chest.fallback=chest.fallback.filter(o=>o!==l.props.chest.userData.treasure);}if(plane)plane.propeller=plane.model.getObjectByName('Propeller_Pivot');state.chest=chest;state.raft=raft;state.rod=rod;
  state.loaded=true;document.getElementById('asset-status').textContent=state.errors.length?'Some residents could not arrive. Their original versions are keeping the island alive.':'The full island cast is here. Milo and 16 new models, ready to explore.';return state.errors.length===0;
 })().catch(error=>{state.errors.push({id:'catalog',message:error.message});return false;});
 w.seaMat.uniforms.mermaidClear={value:new T.Vector3(0,0,0)};w.seaMat.uniforms.mermaidWindow={value:0};w.seaMat.fragmentShader='uniform vec3 mermaidClear;uniform float mermaidWindow;\n'+w.seaMat.fragmentShader.replace('#include <tonemapping_fragment>','float m=1.-smoothstep(.8,2.2,length((vP.xz-mermaidClear.xz)/vec2(1.5,1.)));if(gl_FrontFacing)gl_FragColor.a*=1.-m*.55*mermaidWindow;\n#include <tonemapping_fragment>');w.seaMat.needsUpdate=true;
 const after=l.after.bind(l);l.after=function(dt){after(dt);if(!state.loaded)return;const t=w.t,p=w.storyTime/w.duration,id=w.story.id;
  for(const instance of replacements){instance.fallback.forEach(o=>o.visible=false);instance.root.visible=true;if(!visible(instance.host))continue;instance.rest.forEach((q,b)=>b.quaternion.copy(q));for(const c of instance.configs)c.bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(c.axis,Math.sin(t*(instance.id==='04'?.8:instance.id==='16'?1.8:3.1)+instance.root.id*.7-c.phase)*c.amplitude));
   if(instance.propeller)instance.propeller.rotation.z=t*27;
  }
  const parrot=replacements.find(i=>i.id==='07');if(parrot&&l.props.parrot.visible&&w.rigged.loaded){const bone=w.rigged.getBones().RightArm;bone.getWorldPosition(l.props.parrot.position);l.props.parrot.position.y+=.12;}
  if(w.ocean.underwater){for(const animal of [...(w.shark?.instances||[]),...(w.dolphin?.instances||[])]){if(animal.host.position.distanceTo(w.camera.position)<3)animal.host.visible=false;}}
  if(state.chest?.hinge){state.chest.hinge.rotation.x=-Math.PI/2*T.MathUtils.smoothstep(p,.28,.56);const treasure=l.props.chest.userData.treasure;treasure.visible=id==='treasure'&&p>.56;treasure.position.y=.48;}
  if(state.raft){const stage=id==='raft'&&p>.25?3:Math.max(1,Math.min(3,l.director.inventory.raftAttempts||1));state.raft.model.traverse(o=>{const role=o.userData.constructionRole;if(role)o.visible=stage===3||role==='deck'||role==='deck-bindings'||stage===2&&role==='mast';});if(id==='raft'&&p>.25&&p<.8){const raft=l.props.raft;w.actor.g.position.set(raft.position.x,raft.position.y+.30,raft.position.z+.25);}}
  if(state.rod&&w.rigged.loaded&&w.actor.rod.visible){w.rigged.fishingHands();w.rigged.correctArmClearance();fitRod(state.rod,w);}
  if(state.steam){state.steam.visible=id==='cook';state.steam.children.forEach((o,i)=>{const q=(t*.22+i/6)%1;o.position.set(Math.sin(i*3+q)*.09,.35+q*.5,Math.cos(i*4+q)*.09);o.scale.setScalar(.4+q*1.4);o.material.opacity=(1-q)*.10;});}
  // Use measured footprints for the larger camp props, then correct the actor before rendering.
  if(w.started){w.contact.correctPlacement();}
  if(!visit&&t>nextVisit&&w.started&&w.storm<.35&&!w.ocean.underwater&&l.ambient.length<2)state.visitMermaid();
  if(visit&&mermaid){const age=t-visit.start,q=age/visit.duration;mermaidHost.visible=q<1;if(q>=1){visit=null;state.mermaidState={phase:'absent'};}else poseMermaid(w,mermaid,visit,age);}else mermaidHost.visible=false;
  w.seaMat.uniforms.mermaidClear.value.copy(mermaidHost.position);w.seaMat.uniforms.mermaidWindow.value=mermaidHost.visible?1:0;
  if(mermaidHost.visible&&state.previewMermaidUntil>w.t&&w.settings.camera!=='fixed'){const target=mermaidHost.position.clone().add(new T.Vector3(4,3,5));w.camera.position.lerp(target,1-Math.exp(-dt*.7));w.camera.lookAt(mermaidHost.position);}
  const density=w.settings.quality==='high'?2:w.settings.quality==='low'?4:3;w.ocean.fishGroups.forEach((host,i)=>host.visible=i%density===0);
  // Background schools remain outside the sand footprint.
  for(const [index,host]of l.fishSchool.entries()){host.visible=host.visible&&index%density===0;const radial=Math.hypot(host.position.x/7.8,host.position.z/5.7);if(radial<1.18){host.position.x*=1.18/radial;host.position.z*=1.18/radial;}host.position.y=-.24;}
 };
 const collect=w.contact.collectSolids.bind(w.contact);w.contact.collectSolids=()=>{const solids=collect();for(const instance of replacements){if(!['09','10','11','12'].includes(instance.id)||instance.host.parent!==w.scene||!instance.host.visible)continue;const skip=instance.id==='12'&&w.story.id==='raft';if(skip)continue;instance.host.updateWorldMatrix(true,true);const bounds=instance.footprint.clone().applyMatrix4(instance.host.matrixWorld),size=bounds.getSize(new T.Vector3()),c=bounds.getCenter(new T.Vector3());const key=instance.id==='10'?'workshop':instance.host===w.crate?'crate':instance.id==='11'?'pot':instance.id==='12'?'raft':'chest';const old=solids.findIndex(s=>s.id===key);if(old>=0)solids.splice(old,1);solids.push({id:key,x:c.x,z:c.z,halfX:size.x/2,halfZ:size.z/2});}return solids;};
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),collection:{loaded:state.loaded,assets:Object.keys(state.assets).length,instances:state.instances.length,errors:state.errors,mermaidVisits:state.mermaidVisits}});
 document.getElementById('mermaid-button').onclick=async()=>{if(!w.started)document.getElementById('begin').click();await state.ready;state.visitMermaid();state.previewMermaidUntil=w.t+(visit?.duration||86)+3;};
 for(const id of ['next','swim','dive','portrait','moments','palm-button','turtle-button','dolphin-button','shark-button','seabird-button','crab-button','tent-button','visitors-button'])document.getElementById(id)?.addEventListener('click',()=>state.previewMermaidUntil=0);
 let showcase=0;document.getElementById('visitors-button').onclick=()=>{if(!w.started)document.getElementById('begin').click();state.showcase(['sailboat','pirate','whale','plane','ufo','cruise'][showcase++%6]);};
}
function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true;}
function fitRod(instance,w){const T0=T,host=w.actor.rod,bones=w.rigged.getBones(),hand=bones.LeftHand;if(!hand)return;host.updateWorldMatrix(true,true);const wrist=hand.getWorldPosition(new T0.Vector3());if(bones.LeftHandMiddle1)wrist.lerp(bones.LeftHandMiddle1.getWorldPosition(new T0.Vector3()),.6);const root=instance.root,model=instance.model;
 // Fit the authored grip to the wrist and point the tip out to open water.
 const rotation=new T0.Quaternion().setFromUnitVectors(new T0.Vector3(0,0,-1),new T0.Vector3(.35,.65,.7).normalize());root.quaternion.copy(rotation);host.updateWorldMatrix(true,true);const grip=model.localToWorld(instance.grip.clone()),delta=host.worldToLocal(wrist.clone()).sub(host.worldToLocal(grip));root.position.add(delta);
}
