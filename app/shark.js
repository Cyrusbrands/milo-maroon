import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const Y=new T.Vector3(0,1,0);
// Share geometry and textures, but give each shark its own skeleton and pose.
function cloneSkin(source){const result=source.clone(true),map=new Map();const pair=(a,b)=>{map.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);};pair(source,result);source.traverse(o=>{if(o.isSkinnedMesh){const mesh=map.get(o);mesh.skeleton=o.skeleton.clone();mesh.skeleton.bones=o.skeleton.bones.map(b=>map.get(b));mesh.bindMatrix.copy(o.bindMatrix);mesh.bindMatrixInverse.copy(o.bindMatrixInverse);}});return result;}
export function enableSharks(w,{enabled=true}={}){
 const l=w.life,after=l.after.bind(l),state=w.shark={loaded:false,error:null,bones:0,triangles:0,asset:'h31-shark-v1',instances:[],previewUntil:0};
 state.ready=(enabled?new GLTFLoader().loadAsync('./models/Shark-Rigged.glb'):Promise.resolve(null)).then(gltf=>{
  if(!gltf)return false;const source=gltf.scene;source.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(source),length=bounds.max.x-bounds.min.x;
  const prepared=l.sharks.map((host,index)=>{const model=cloneSkin(source),bones={};model.updateMatrixWorld(true);model.traverse(o=>{if(o.isBone)bones[o.name]=o;});for(const name of ['tripoSpine_0','tripoSpine_1','tripoSpine_2','tripoSpine_3','tripoSpine_4','tripoTail_0'])if(!bones[name])throw Error('Missing shark bone '+name);
   const poses=[['tripoSpine_0',.025,0],['tripoSpine_1',.045,.4],['tripoSpine_2',.07,.8],['tripoSpine_3',.1,1.2],['tripoSpine_4',.13,1.6],['tripoTail_0',.16,2]].map(([name,amplitude,phase])=>{const bone=bones[name];return{bone,rest:bone.quaternion.clone(),axis:Y.clone().applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert()).normalize(),amplitude,phase};});
   const wrapper=new T.Group();wrapper.name='ImportedShark';wrapper.scale.setScalar((2.8-index*.2)/length);model.position.y=-bones.tripoSpine_0.getWorldPosition(new T.Vector3()).y;wrapper.add(model);let triangles=0;model.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;triangles+=o.geometry.index.count/3;}});return{host,model,wrapper,bones,poses,triangles,index,fallback:[...host.children]};});
  for(const s of prepared){s.host.add(s.wrapper);s.fallback.forEach(o=>o.visible=false);}state.instances=prepared;state.bones=Object.keys(prepared[0].bones).length;state.triangles=prepared[0].triangles;state.loaded=true;return true;
 }).catch(error=>{state.error=error.message;console.warn('Shark model unavailable; keeping procedural sharks.',error);return false;});
 state.preview=()=>{l.forceAmbient('sharks',24);state.previewUntil=w.t+16;if(w.seabird)w.seabird.previewUntil=0;w.art.portraitUntil=0;w.dolphin.previewUntil=0;};
 document.getElementById('shark-button').onclick=state.preview;
 l.after=function(dt){after(dt);for(const s of state.instances){for(const j of s.poses)j.bone.quaternion.copy(j.rest).multiply(new T.Quaternion().setFromAxisAngle(j.axis,Math.sin(w.t*(2+s.index*.17)-j.phase+s.index)*j.amplitude));s.host.position.y=-.25+Math.sin(w.t*1.1+s.index)*.025;s.model.updateWorldMatrix(true,true);}if(state.previewUntil>w.t&&!w.ocean?.underwater){w.camera.position.set(16,-1.15,10);w.camera.lookAt(12.8,-.25,3.8);w.audio.underwater=true;}};
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),shark:{loaded:state.loaded,error:state.error,bones:state.bones,triangles:state.triangles,instances:state.instances.length,asset:state.asset}});
}
