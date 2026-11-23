import * as T from './vendor/three.module.js';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
// Calibrated in the exported H3.1 model's bind coordinates. The source is
// neutral: never apply the old smiling model's mouth-closing deformation.
export function createNeutralMiloFace(model,scale){
 const names=['mouthRest','mouthO','blinkLeft','blinkRight','browWorry','browRaise','smile'],meshes=[];
 model.updateMatrixWorld(true);
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,pos=g.attributes.position,inv=mesh.matrixWorld.clone().invert(),arrays=names.map(()=>new Float32Array(pos.count*3));
  for(let i=0;i<pos.count;i++){
   const original=new T.Vector3().fromBufferAttribute(pos,i),p=original.clone().applyMatrix4(mesh.matrixWorld).divideScalar(scale),x=p.x,y=p.y,z=p.z;
   if(y<.75||z<.03)continue;
   const front=smooth(.035,.06,z),deltas=names.map(()=>new T.Vector3());
   const mouth=(1-smooth(.033,.055,Math.abs(x)))*smooth(.767,.779,y)*(1-smooth(.801,.811,y))*front*(1-smooth(.098,.114,z));
   // A restrained lower-lip movement; this mesh has no internal mouth cavity.
   deltas[1].y=-.004*mouth*(1-smooth(.786,.795,y));
   deltas[6].y=.005*mouth*smooth(.006,.033,Math.abs(x));
   for(let side=0;side<2;side++){
    const cx=side===0?.032:-.032,eye=(1-smooth(.022,.034,Math.abs(x-cx)))*smooth(.818,.833,y)*(1-smooth(.865,.88,y))*front*(1-smooth(.078,.09,z))*smooth(.007,.016,Math.abs(x));
    deltas[2+side].y=(.849-y)*.84*eye;
    const brow=(1-smooth(.019,.034,Math.abs(x-cx)))*smooth(.87,.88,y)*(1-smooth(.903,.913,y))*front*(1-smooth(.09,.105,z));
    deltas[4].y=(.006-Math.abs(x-cx)*.35)*brow;deltas[5].y=.007*brow;
    const cheek=(1-smooth(.022,.038,Math.abs(x-cx)))*smooth(.798,.817,y)*(1-smooth(.828,.836,y))*front*(1-smooth(.083,.1,z));deltas[6].y+=.002*cheek;
   }
   for(let j=0;j<names.length;j++)if(deltas[j].lengthSq()>0){const local=p.clone().add(deltas[j]).multiplyScalar(scale).applyMatrix4(inv).sub(original);arrays[j].set([...local],i*3);}
  }
  g.morphAttributes.position=arrays.map((array,i)=>{const a=new T.BufferAttribute(array,3);a.name=names[i];return a;});g.morphTargetsRelative=true;mesh.updateMorphTargets();meshes.push(mesh);
 });
 const values=names.map(()=>0),face={asset:'h31-neutral-v2',shapes:names,preview:null,mood:'neutral',values:{},blinkCount:0};let nextBlink=2.7,blinkAt=-100;
 face.update=(w,dt)=>{
  const id=w.story.id,p=w.storyTime/w.duration,t=w.t,sleeping=['rest','sleepcruise','stargaze'].includes(id)||id==='hammockFail'&&p<.6;
  const mood=face.preview||(sleeping?'sleepy':w.artExpression==='startled'||id==='fishing'&&p>.48&&p<.73?'surprised':['warm','hopeful'].includes(w.artExpression)?'happy':w.storm>.4?'worried':'neutral');face.mood=mood;
  if(t>=nextBlink){blinkAt=t;nextBlink=t+3.1+Math.abs(Math.sin(t*2.718))*4;face.blinkCount++;}
  const age=t-blinkAt,blink=age>=0&&age<.23?Math.sin(age/.23*Math.PI):0,shut=mood==='sleepy'?1:blink;
  const targets=[mood==='happy'?.12:mood==='surprised'?0:1,mood==='surprised'?.85:0,shut,shut,mood==='worried'?1:0,mood==='surprised'?1:0,mood==='happy'?1:0];
  for(let i=0;i<names.length;i++){values[i]=T.MathUtils.lerp(values[i],targets[i],1-Math.exp(-dt*(i===2||i===3?45:8)));face.values[names[i]]=values[i];for(const mesh of meshes)mesh.morphTargetInfluences[i]=values[i];}
 };
 return face;
}
