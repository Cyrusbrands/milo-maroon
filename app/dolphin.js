import * as T from './vendor/three.module.js';
import {makeMarine} from './art.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const Z=new T.Vector3(0,0,1),X=new T.Vector3(1,0,0);
// Measure the distal flukes in bind space and remove their generated roll.
// UVs, skin weights and the archived source GLB remain intact.
function levelFlukes(model,bones,length){
 const points=[],neck=bones.tripoSpine_2.getWorldPosition(new T.Vector3());
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(p.x<-.38*length)points.push(p);}});
 if(points.length<20)throw Error('Missing dolphin flukes');const mean=points.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(points.length);let yy=0,zz=0,yz=0;for(const p of points){const y=p.y-mean.y,z=p.z-mean.z;yy+=y*y;zz+=z*z;yz+=y*z;}
 const angle=.5*Math.atan2(2*yz,zz-yy);
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.geometry=mesh.geometry.clone();const g=mesh.geometry,a=g.attributes.position,n=g.attributes.normal,inv=mesh.matrixWorld.clone().invert(),toWorldNormal=new T.Matrix3().getNormalMatrix(mesh.matrixWorld),toLocalNormal=new T.Matrix3().getNormalMatrix(inv);
  for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld),weight=T.MathUtils.smoothstep(-p.x,.28*length,.37*length);if(weight===0)continue;const q=new T.Quaternion().setFromAxisAngle(X,angle*weight);p.sub(new T.Vector3(0,neck.y,neck.z)).applyQuaternion(q).add(new T.Vector3(0,neck.y,neck.z)).applyMatrix4(inv);a.setXYZ(i,...p);const normal=new T.Vector3().fromBufferAttribute(n,i).applyMatrix3(toWorldNormal).normalize().applyQuaternion(q).applyMatrix3(toLocalNormal).normalize();n.setXYZ(i,...normal);}
  a.needsUpdate=true;n.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 });
 return angle;
}
function cloneSkin(source){const result=source.clone(true),map=new Map();const pair=(a,b)=>{map.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);};pair(source,result);source.traverse(o=>{if(o.isSkinnedMesh){const mesh=map.get(o);mesh.skeleton=o.skeleton.clone();mesh.skeleton.bones=o.skeleton.bones.map(b=>map.get(b));mesh.bindMatrix.copy(o.bindMatrix);mesh.bindMatrixInverse.copy(o.bindMatrixInverse);}});return result;}
const SIZES=[2.65,2.3,1.85,1.55,2.1],TAU=Math.PI*2;
function beachBall(){const g=new T.Group(),colors=['#f8e7ba','#df6553','#f8e7ba','#499dc4','#f8e7ba','#e5bb42'];for(let i=0;i<6;i++)g.add(new T.Mesh(new T.SphereGeometry(.32,12,16,i*TAU/6,TAU/6),new T.MeshStandardMaterial({color:colors[i],roughness:.4})));g.visible=false;return g;}
export function enableDolphin(w,{enabled=true}={}){
 const l=w.life,after=l.after.bind(l),state=w.dolphin={loaded:false,error:null,bones:0,triangles:0,asset:'h31-dolphin-pod-v2',previewUntil:0,instances:[],previewCount:0,ballContacts:0},ball=beachBall();w.scene.add(ball);state.ball=ball;
 // A softly feathered clear-water patch reveals the submerged pod without lifting bodies above the sea.
 w.seaMat.uniforms.podClearWater={value:0};w.seaMat.transparent=true;w.seaMat.depthWrite=false;w.seaMat.fragmentShader='uniform float podClearWater;\n'+w.seaMat.fragmentShader.replace('gl_FragColor=vec4(base,1.);','float podDistance=length((vP.xz-vec2(-14.8,8.4))/vec2(6.5,5.5));float podWindow=(1.-smoothstep(.55,1.,podDistance))*podClearWater*(gl_FrontFacing?1.:0.);gl_FragColor=vec4(base,mix(1.,.48,podWindow));');w.seaMat.needsUpdate=true;
 for(let index=0;index<SIZES.length;index++){const host=index===0?l.dolphin:new T.Group();if(index)w.scene.add(host);host.children.forEach(o=>o.visible=false);const fallback=makeMarine('dolphin');fallback.scale.setScalar(SIZES[index]/2.8);host.add(fallback);host.visible=false;state.instances.push({host,fallback,index,size:SIZES[index],previousHeight:-3,poses:[],nose:new T.Vector3()});}
 state.ready=(enabled?new GLTFLoader().loadAsync('./models/Dolphin-Rigged.glb'):Promise.resolve(null)).then(gltf=>{
  if(!gltf)return false;const source=gltf.scene;source.updateMatrixWorld(true);const box=new T.Box3().setFromObject(source),length=box.max.x-box.min.x,bones={};source.traverse(o=>{if(o.isBone)bones[o.name]=o;});for(const name of ['tripoSpine_0','tripoSpine_1','tripoSpine_2','bone_4','bone_8','bone_10','bone_6'])if(!bones[name])throw Error('Missing dolphin bone '+name);
  state.tailRoll=levelFlukes(source,bones,length);state.bones=Object.keys(bones).length;const centerY=bones.tripoSpine_0.getWorldPosition(new T.Vector3()).y;
  source.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;state.triangles+=o.geometry.index.count/3;o.material.roughness=Math.max(.4,o.material.roughness);}});
  const prepared=state.instances.map(inst=>{const model=cloneSkin(source),bones={};model.updateMatrixWorld(true);model.traverse(o=>{if(o.isBone)bones[o.name]=o;});const configs=[['tripoSpine_0',Z,.035,0],['tripoSpine_1',Z,.1,.45],['tripoSpine_2',Z,.14,.9],['bone_4',Z,.07,1.2],['bone_8',X,-.055,.4],['bone_10',X,.055,.4]],poses=configs.map(([name,axis,amplitude,phase])=>{const bone=bones[name];return{bone,rest:bone.quaternion.clone(),axis:axis.clone().applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert()).normalize(),amplitude,phase};});const wrapper=new T.Group();wrapper.name='ImportedDolphin';wrapper.scale.setScalar(inst.size/length);model.position.y=-centerY;wrapper.add(model);return{...inst,model,bones,poses,wrapper};});
  state.instances=prepared;for(const inst of prepared){inst.host.add(inst.wrapper);inst.fallback.visible=false;}state.loaded=true;state.wrapper=prepared[0].wrapper;state.model=prepared[0].model;state.getBones=()=>prepared[0].bones;return true;
 }).catch(error=>{state.error=error.message;console.warn('Dolphin model unavailable; keeping procedural pod.',error);return false;});
 function encounter(event){if(event.pod)return event.pod;const playBall=event.playBall??l.r.next()<.24;event.pod={playBall,phase:event.phase||0,jumps:SIZES.map((_,i)=>[5+l.r.range(0,6)+i*.45,19+l.r.range(0,4)+i*.6]),lastContact:-1,whistled:false,lastSplashSound:-9};return event.pod;}
 state.preview=(playBall=true)=>{if(!w.started)window.castaway.nextStory(0);let event=l.ambient.find(e=>e.type==='dolphin');if(!event){l.forceAmbient('dolphin',40);event=l.ambient.find(e=>e.type==='dolphin');}event.age=0;event.duration=40;event.playBall=playBall;delete event.pod;state.previewUntil=w.t+41;state.previewCount++;for(const inst of state.instances)inst.previousHeight=-3;if(w.seabird)w.seabird.previewUntil=0;if(w.shark)w.shark.previewUntil=0;w.art.portraitUntil=0;};
 document.getElementById('dolphin-button').onclick=()=>state.preview();
 l.after=function(dt){after(dt);const event=l.ambient.find(e=>e.type==='dolphin');ball.visible=false;w.seaMat.uniforms.podClearWater.value=event?Math.min(T.MathUtils.smoothstep(event.age,0,3),T.MathUtils.smoothstep(event.duration-event.age,0,3)):0;
  if(!event){for(const inst of state.instances){inst.host.visible=false;inst.previousHeight=-3;}}else{
   const pod=encounter(event),age=event.age,fade=Math.min(T.MathUtils.smoothstep(age,0,3),T.MathUtils.smoothstep(event.duration-age,0,3));
   for(const inst of state.instances){const i=inst.index,angle=age*.14+i*TAU/5+pod.phase,peaks=pod.playBall?[4+i*3.5,21.5+i*3.5]:pod.jumps[i];let leap=0,pitch=0;for(const peak of peaks){const q=(age-peak+1.25)/2.5;if(q>0&&q<1){leap=Math.sin(q*Math.PI)*(i===3?1.45:2.1);pitch=Math.cos(q*Math.PI)*.65;}}
    const height=-.48-(1-fade)*2.8+leap;inst.host.visible=true;inst.host.position.set(-14.8+Math.cos(angle)*4,height,8.4+Math.sin(angle)*3.3);inst.host.rotation.set(0,Math.atan2(-Math.cos(angle)*3.3,-Math.sin(angle)*4),pitch,'YXZ');
    if(age>1&&((inst.previousHeight<-.14&&height>=-.14)||(inst.previousHeight>=-.14&&height<-.14))){w.splashAt(inst.host.position.x,.08,inst.host.position.z,i===3?6:10);if(age-pod.lastSplashSound>1.8){w.audio.cue('dolphinSplash');pod.lastSplashSound=age;}}
    inst.previousHeight=height;
    if(state.loaded){for(const j of inst.poses){const speed=j.bone.name==='bone_8'||j.bone.name==='bone_10'?1.5:4.1+i*.17;const a=Math.sin(w.t*speed-j.phase+i*.9)*j.amplitude;j.bone.quaternion.copy(j.rest).multiply(new T.Quaternion().setFromAxisAngle(j.axis,a));}inst.host.updateWorldMatrix(true,true);inst.bones.bone_6.getWorldPosition(inst.nose);}else{inst.fallback.userData.tail.rotation.z=Math.sin(w.t*(4+i*.17)+i)*.2;inst.host.updateWorldMatrix(true,true);inst.nose.set(inst.size*.48,0,0).applyMatrix4(inst.host.matrixWorld);}
   }
   if(age>6&&!pod.whistled){pod.whistled=true;w.audio.cue('dolphin');}
   if(pod.playBall&&age>2&&age<event.duration-2){const volley=Math.max(0,(age-4)/3.5),turn=Math.floor(volley),q=volley-turn,a=state.instances[turn%5].nose,b=state.instances[(turn+1)%5].nose;ball.visible=true;ball.position.lerpVectors(a,b,q);ball.position.y+=.36+4*q*(1-q)*2.3;ball.rotation.set(age*.6,age*1.9,age*.7);ball.scale.setScalar(Math.min(T.MathUtils.smoothstep(age,2,4),T.MathUtils.smoothstep(event.duration-age,2,4)));if(age>=4&&turn!==pod.lastContact){pod.lastContact=turn;state.ballContacts++;w.audio.cue('dolphinBall');}}
   state.playingBall=pod.playBall;state.encounter=pod;
  }
  if(state.previewUntil>w.t&&!w.ocean?.underwater){w.camera.position.set(-7,4.6,18);w.camera.lookAt(-14.8,.7,8.4);}
 };
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),dolphin:{loaded:state.loaded,error:state.error,bones:state.bones,triangles:state.triangles,asset:state.asset,instances:state.instances.length,sizes:SIZES,playingBall:!!eventForDebug()?.pod?.playBall,ballVisible:ball.visible,tailRollDegrees:(state.tailRoll||0)*180/Math.PI}});function eventForDebug(){return l.ambient.find(e=>e.type==='dolphin');}
}
