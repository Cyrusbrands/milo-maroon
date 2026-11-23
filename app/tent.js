import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {terrain} from './world.js';
const RETRIEVE=new Set(['laptop','radio','drone','selfie','painting','bananaPhone','metalDetector','parrot']);
export function enableTent(w,{enabled=true}={}){
 const state=w.tent={loaded:false,error:null,asset:'h31-tent-v1',triangles:0,meshes:[],fallback:[...w.camp.children],passage:false,previewUntil:0};
 const l=w.life,main=l.animateMain.bind(l),collect=w.contact.collectSolids.bind(w.contact);
 state.ready=(enabled?new GLTFLoader().loadAsync('./models/Tent.glb'):Promise.resolve(null)).then(gltf=>{
  if(!gltf)return false;
  const source=gltf.scene;source.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(source,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=2.1/size.y;
  const root=new T.Group();root.name='ImportedTent';root.position.set(-4,terrain(-4,.6),.6);
  // Entrance faces the open center of camp, away from the workbench. Bake the
  // transform, then conform only the groundsheet, peg bases and low ropes.
  source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),p=geometry.attributes.position;
   for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);v.sub(new T.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(scale);const h=v.y;v.y+=(terrain(root.position.x+v.x,root.position.z+v.z)-root.position.y)*(1-T.MathUtils.smoothstep(h,.2,.6))+.012;p.setXYZ(i,...v);}
   p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,o.material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);state.meshes.push(mesh);state.triangles+=(geometry.index?.count||p.count)/3;
  });
  w.scene.add(root);state.root=root;state.fallback.forEach(o=>o.visible=false);w.camp.visible=false;root.updateMatrixWorld(true);state.bounds=new T.Box3().setFromObject(root,true);
  const b=state.bounds,c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3());state.solid={id:'tent',x:c.x,z:c.z,halfX:s.x/2,halfZ:s.z/2};state.loaded=true;return true;
 }).catch(e=>{state.error=e.message;console.warn('Tent unavailable; retaining canvas shelter.',e);return false;});
 w.contact.collectSolids=()=>{const solids=collect();if(!state.loaded)return solids;const passage=RETRIEVE.has(w.story.id)&&w.storyTime/w.duration>=.08&&w.storyTime/w.duration<.26;return[...solids.filter(s=>s.id!=='tent'),...(passage?[]:[state.solid])];};
 l.animateMain=function(id,p,t,dt){main(id,p,t,dt);state.passage=false;if(!state.loaded||!RETRIEVE.has(id)||p>=.32)return;
  // Retrieval remains a short offscreen beat. Use the real front opening for
  // entry/exit, never the tent's side wall; conceal the actor inside the shelter.
  const approach=new T.Vector3(-4,0,2.8),inside=new T.Vector3(-4,0,.7),home=new T.Vector3(1.2,0,1.3),pos=new T.Vector3();let yaw=Math.PI;
  const route=[home,new T.Vector3(.1,0,3.7),new T.Vector3(-4,0,3.7),approach];
  const beachPath=(q,back=false)=>{const u=T.MathUtils.clamp(q,0,.999999)*3,i=Math.floor(u);pos.lerpVectors(route[i],route[i+1],T.MathUtils.smoothstep(u-i,0,1));yaw=Math.atan2(route[i+1].x-route[i].x,route[i+1].z-route[i].z)+(back?Math.PI:0);};
  if(p<.08)beachPath(p/.08);
  else if(p<.12){state.passage=true;pos.lerpVectors(approach,inside,T.MathUtils.smoothstep(p,.08,.12));}
  else if(p<.22){state.passage=true;pos.copy(inside);w.actor.g.visible=false;}
  else if(p<.26){state.passage=true;pos.lerpVectors(inside,approach,T.MathUtils.smoothstep(p,.22,.26));yaw=0;}
  else {beachPath(1-(p-.26)/.06,true);}
  // The compact entrance does not fit upright Milo. Hide him once his body
  // reaches the flap rather than showing an upright mesh through the canvas.
  if(state.passage&&pos.z<2.25)w.actor.g.visible=false;
  w.actor.g.position.set(pos.x,terrain(pos.x,pos.z)+.025,pos.z);w.actor.g.rotation.y=yaw;
 };
 state.preview=()=>{state.previewUntil=w.t+20;w.art.portraitUntil=0;for(const name of ['dolphin','shark','seabird','palm','turtle','claw'])if(w[name])w[name].previewUntil=0;};
 document.getElementById('tent-button').onclick=state.preview;
 for(const id of ['portrait','moments','swim','dive','next','dolphin-button','shark-button','seabird-button','palm-button','turtle-button','crab-button'])document.getElementById(id).addEventListener('click',()=>state.previewUntil=0);
 const after=l.after.bind(l);l.after=function(dt){after(dt);if(state.loaded&&state.previewUntil>w.t&&!w.ocean?.underwater){w.camera.position.copy(state.root.position).add(new T.Vector3(4,3.4,6));w.camera.lookAt(state.root.position.clone().add(new T.Vector3(0,1,0)));}};
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),tent:{loaded:state.loaded,error:state.error,triangles:state.triangles,asset:state.asset}});
}
