import * as T from './vendor/three.module.js';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
// Local expression shapes for this specific single-surface Tripo mesh.
// Preserve its UVs, skin weights and original smile; shapes are additive GPU morphs.
export function createMiloFace(model,scale){
 const names=['mouthRest','mouthO','blinkLeft','blinkRight','browWorry','browRaise'],meshes=[];
 model.updateMatrixWorld(true);
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,pos=g.attributes.position,inv=mesh.matrixWorld.clone().invert(),arrays=names.map(()=>new Float32Array(pos.count*3));let affected=0;
  for(let i=0;i<pos.count;i++){
   const original=new T.Vector3().fromBufferAttribute(pos,i),p=original.clone().applyMatrix4(mesh.matrixWorld).divideScalar(scale),x=p.x,y=p.y,z=p.z;
   if(y<.78||z<.03)continue;
   const front=smooth(.035,.065,z),mouth=(1-smooth(.046,.072,Math.abs(x)))*smooth(.796,.818,y)*(1-smooth(.844,.852,y))*front*(1-smooth(.837,.846,y)*(1-smooth(.02,.032,Math.abs(x)))*smooth(.078,.092,z));
   const deltas=names.map(()=>new T.Vector3());
   deltas[0].y=(.836-y)*.85*mouth;deltas[0].z=-.002*mouth;
   deltas[1].x=-x*.3*mouth;deltas[1].y=-Math.max(0,.842-y)*.65*mouth;
   for(let side=0;side<2;side++){
    const cx=side===0?.032:-.032,eye=(1-smooth(.025,.037,Math.abs(x-cx)))*smooth(.86,.875,y)*(1-smooth(.918,.93,y))*front*(1-smooth(.075,.09,z));
    deltas[2+side].y=(.899-y)*.62*eye*smooth(.006,.015,Math.abs(x));
    const brow=(1-smooth(.02,.039,Math.abs(x-cx)))*smooth(.917,.924,y)*(1-smooth(.941,.95,y))*front;
    deltas[4].y=(.007-Math.abs(x-cx)*.44)*brow;deltas[5].y=.009*brow;
   }
   for(let j=0;j<names.length;j++)if(deltas[j].lengthSq()>0){const local=p.clone().add(deltas[j]).multiplyScalar(scale).applyMatrix4(inv).sub(original);arrays[j].set([...local],i*3);affected++;}
  }
  g.morphAttributes.position=arrays.map((array,i)=>{const a=new T.BufferAttribute(array,3);a.name=names[i];return a;});g.morphTargetsRelative=true;mesh.updateMorphTargets();meshes.push(mesh);
 });
 const values=names.map(()=>0),face={shapes:names,preview:null,mood:'neutral',values:{},blinkCount:0};let nextBlink=2.7,blinkAt=-100;
 face.update=(w,dt)=>{
  const id=w.story.id,p=w.storyTime/w.duration,t=w.t;
  const sleeping=['rest','sleepcruise','stargaze'].includes(id)||id==='hammockFail'&&p<.6;
  let mood=face.preview||(sleeping?'sleepy':w.artExpression==='startled'||id==='fishing'&&p>.48&&p<.73?'surprised':['warm','hopeful'].includes(w.artExpression)?'happy':w.storm>.4?'worried':'neutral');face.mood=mood;
  if(t>=nextBlink){blinkAt=t;nextBlink=t+3.1+Math.abs(Math.sin(t*2.718))*4;face.blinkCount++;}
  const age=t-blinkAt,blink=age>=0&&age<.23?Math.sin(age/.23*Math.PI):0;
  const shut=mood==='sleepy'?1:blink,targets=[mood==='happy'?.12:mood==='surprised'?0:1,mood==='surprised'?.85:0,shut,shut,mood==='worried'?1:0,mood==='surprised'?1:0];
  for(let i=0;i<names.length;i++){values[i]=T.MathUtils.lerp(values[i],targets[i],1-Math.exp(-dt*(i===2||i===3?45:8)));face.values[names[i]]=values[i];for(const mesh of meshes)mesh.morphTargetInfluences[i]=values[i];}
 };
 return face;
}
