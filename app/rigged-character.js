import * as T from './vendor/three.module.js';
import {createNeutralMiloFace} from './face-neutral.js';
import {limitTextures} from './asset-utils.js';
import {terrain} from './world.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const DOWN=new T.Vector3(0,-1,0);
export function enableRiggedCharacter(w){
 const a=w.actor,l=w.life,after=l.after.bind(l),state=w.rigged={loaded:false,error:null,bones:0,triangles:0};
 const propRoots=new Set([a.rod,a.umbrella,...Object.values(l.props)]),legacy=new Map();
 function capture(o){if(propRoots.has(o))return;if(o.isMesh)legacy.set(o,o.visible);for(const child of o.children)capture(child);}capture(a.body);
 const keyboard=l.props.laptop,keyboardRest=keyboard.position.clone();
 const wrapper=new T.Group();wrapper.name='ImportedMilo';wrapper.visible=false;
 let poseClips={},model,bones={},rest=new Map(),joints=[],fingers=[],handFrames={},swimFeet={};const quat=new T.Quaternion(),dir=new T.Vector3(),parentQ=new T.Quaternion(),rootQ=new T.Quaternion();
 state.load=()=>{state.loading=true;return state.ready=new GLTFLoader().loadAsync('./models/Milo-Hero.glb').then(async g=>{await limitTextures(g.scene,w.settings.quality==='high'?4096:w.settings.quality==='low'?1024:2048);return g;}).then(gltf=>{
  model=gltf.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;const scale=2.2/height;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;wrapper.add(model);model.updateMatrixWorld(true);const bindRootInverse=wrapper.getWorldQuaternion(new T.Quaternion()).invert();
  model.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig:?/,'')]=o;if(o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;state.triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;o.material.roughness=Math.max(.55,o.material.roughness);}});
  for(const b of Object.values(bones))rest.set(b,{q:b.quaternion.clone(),world:b.getWorldQuaternion(new T.Quaternion()).premultiply(bindRootInverse)});
  const pairs=[['RightArm','RightForeArm',a.arms[0],false],['RightForeArm','RightHand',a.arms[0],true],['LeftArm','LeftForeArm',a.arms[1],false],['LeftForeArm','LeftHand',a.arms[1],true],['RightUpLeg','RightLeg',a.legs[0],false],['RightLeg','RightFoot',a.legs[0],true],['LeftUpLeg','LeftLeg',a.legs[1],false],['LeftLeg','LeftFoot',a.legs[1],true]];
  for(const [name,child,source,lower]of pairs){if(!bones[name]||!bones[child])throw Error('Missing bone '+name);joints.push({bone:bones[name],child:bones[child],source,lower,leg:name.includes('Leg'),restDir:bones[child].getWorldPosition(new T.Vector3()).sub(bones[name].getWorldPosition(new T.Vector3())).normalize().applyQuaternion(bindRootInverse)});}
  for(const side of ['Left','Right']){
   const hand=bones[side+'Hand'],middle=bones[side+'HandMiddle1'],index=bones[side+'HandIndex1'],pinky=bones[side+'HandPinky1'];if(!hand||!middle||!index||!pinky)continue;
   const along=middle.getWorldPosition(new T.Vector3()).sub(hand.getWorldPosition(new T.Vector3())).normalize(),across=pinky.getWorldPosition(new T.Vector3()).sub(index.getWorldPosition(new T.Vector3())).normalize(),normal=along.clone().cross(across).normalize();if(normal.z<0)normal.negate();const handInv=hand.getWorldQuaternion(new T.Quaternion()).invert();handFrames[side]={along:along.clone().applyQuaternion(handInv),normal:normal.clone().applyQuaternion(handInv)};
   for(const [name,b]of Object.entries(bones)){if(!name.startsWith(side+'Hand')||!/Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(name))continue;const child=b.children.find(c=>c.isBone);if(!child)continue;const along=child.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())).normalize(),axis=along.cross(normal).normalize().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert());fingers.push({bone:b,axis,side,thumb:name.includes('Thumb')});}
  }
  for(const side of ['Left','Right'])swimFeet[side]=bones[side+'Foot'].getWorldPosition(new T.Vector3());
  state.face={mood:'neutral',update(){},capability:'head-pose; facial morphs pending'};state.asset='hero-v2-8k';state.model=model;state.clips=gltf.animations;state.mixer=new T.AnimationMixer(model);for(const clip of gltf.animations)poseClips[clip.name.includes('Walk')?'walk':'idle']={duration:clip.duration,tracks:clip.tracks.filter(track=>/Arm|Hand|Shoulder|Leg|Foot|Toe/.test(track.name)).map(track=>({bone:bones[track.name.split('.')[0].replace(/^mixamorig:?/,'')],sample:track.createInterpolant(new Float32Array(4))})).filter(track=>track.bone)};a.g.add(wrapper);state.bones=Object.keys(bones).length;state.loaded=true;return true;
 }).catch(error=>{state.error=error.message;console.warn('Imported Milo unavailable; keeping classic character.',error);return false;});};
 if(w.settings.character!=='classic')state.load();
 function aim(j){dir.copy(DOWN).applyQuaternion(j.source.quaternion);
  const side=j.source===a.arms[0]?-1:j.source===a.arms[1]?1:0;
  if(j.lower){const lower=j.leg?j.source.children.find(c=>c.isGroup):j.source.userData.elbow;if(lower)dir.copy(DOWN).applyQuaternion(lower.quaternion).applyQuaternion(j.source.quaternion);}
  // Old stick-figure poses sometimes point the humerus through the chest.
  // Keep the elbow on its own side when the arm is not reaching forward.
  if(side&&dir.x*side<.12&&Math.abs(dir.z)<.6){dir.x=side*(j.lower?.32:.38);dir.z=Math.max(j.lower?.32:.18,dir.z);}
  if(j.lower){
   // Inherit the upper limb's roll. Independently aiming both bind-pose bones
   // gives them opposite twists in raised poses and collapses the skinned elbow.
   const current=j.child.getWorldPosition(new T.Vector3()).sub(j.bone.getWorldPosition(new T.Vector3())).normalize();
   dir.normalize().applyQuaternion(rootQ);
   quat.setFromUnitVectors(current,dir).multiply(j.bone.getWorldQuaternion(new T.Quaternion()));
  }else{quat.setFromUnitVectors(j.restDir,dir.normalize()).multiply(rest.get(j.bone).world).premultiply(rootQ);}
  j.bone.parent.getWorldQuaternion(parentQ);j.bone.quaternion.copy(parentQ.invert().multiply(quat)).normalize();j.bone.updateWorldMatrix(false,true);
 }
 function swingBone(bone,child,direction){
  const current=child.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
  const target=new T.Quaternion().setFromUnitVectors(current,direction.clone().normalize()).multiply(bone.getWorldQuaternion(new T.Quaternion()));
  const parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();bone.quaternion.copy(parent.multiply(target));bone.updateWorldMatrix(false,true);
 }
 // Evaluate the final animated wrists, palms and forearms in body space.
 // Finite bone transforms alone do not detect a hand buried inside the torso.
 function armClearance(){
  if(!state.loaded||!wrapper.visible)return;
  wrapper.updateWorldMatrix(true,true);wrapper.getWorldQuaternion(rootQ);
  const inside=p=>p.y>.82&&p.y<1.78&&(p.x/.48)**2+((p.y-1.27)/.53)**2+(p.z/.42)**2<1;
  const point=b=>wrapper.worldToLocal(b.getWorldPosition(new T.Vector3()));
  const samples=(side)=>{const elbow=point(bones[side+'ForeArm']),wrist=point(bones[side+'Hand']),palm=point(bones[side+'HandMiddle1']);return [wrist,palm,elbow.clone().lerp(wrist,.35),elbow.clone().lerp(wrist,.7)];};
  state.armSafety={corrected:[],fallback:[],violations:[]};
  for(const side of ['Right','Left']){
   const sign=side==='Left'?1:-1;
   if(samples(side).some(inside)){
    const wrist=point(bones[side+'Hand']);
    const target=new T.Vector3(sign*Math.max(.55,Math.abs(wrist.x)),T.MathUtils.clamp(wrist.y,.9,1.78),Math.max(.42,wrist.z));
    solveLimb(bones[side+'Arm'],bones[side+'ForeArm'],bones[side+'Hand'],wrapper.localToWorld(target),new T.Vector3(sign,-.25,.1).applyQuaternion(rootQ));
    state.armSafety.corrected.push(side);
   }
   if(samples(side).some(inside)){
    // If a requested interaction is unreachable, keep a safe bind-pose arm
    // instead of displaying the hand inside the body.
    for(const suffix of ['Arm','ForeArm','Hand']){const b=bones[side+suffix];b.quaternion.copy(rest.get(b).q);b.updateWorldMatrix(false,true);}
    state.armSafety.fallback.push(side);
   }
   if(samples(side).some(inside))state.armSafety.violations.push(side);
  }
  model.updateWorldMatrix(true,true);
 }
 state.correctArmClearance=armClearance;
 function keyboardArm(side,target){
  const upper=bones[side+'Arm'],lower=bones[side+'ForeArm'],hand=bones[side+'Hand'],start=upper.getWorldPosition(new T.Vector3()),elbow=lower.getWorldPosition(new T.Vector3()),wrist=hand.getWorldPosition(new T.Vector3());
  const l1=start.distanceTo(elbow),l2=elbow.distanceTo(wrist),direction=target.clone().sub(start),distance=T.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+.002,l1+l2-.002);direction.normalize();
  const pole=new T.Vector3(side==='Left'?1:-1,-.2,.15).applyQuaternion(rootQ);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=start.clone().addScaledVector(direction,along).addScaledVector(pole,height);
  swingBone(upper,lower,bend.sub(start));swingBone(lower,hand,target.clone().sub(lower.getWorldPosition(new T.Vector3())));
  const frame=handFrames[side];if(frame){const local=new T.Matrix4().makeBasis(frame.along,frame.normal,frame.along.clone().cross(frame.normal)).invert(),forward=new T.Vector3(0,0,1).applyQuaternion(rootQ),down=new T.Vector3(0,-1,0).applyQuaternion(rootQ),world=new T.Matrix4().makeBasis(forward,down,forward.clone().cross(down)).multiply(local),rotation=new T.Quaternion().setFromRotationMatrix(world);hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));hand.updateWorldMatrix(false,true);}
 }
 function solveLimb(upper,middle,end,target,pole){
  const start=upper.getWorldPosition(new T.Vector3()),joint=middle.getWorldPosition(new T.Vector3()),finish=end.getWorldPosition(new T.Vector3()),l1=start.distanceTo(joint),l2=joint.distanceTo(finish),direction=target.clone().sub(start),distance=T.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+.002,l1+l2-.003);direction.normalize();pole=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=start.clone().addScaledVector(direction,along).addScaledVector(pole,height);swingBone(upper,middle,bend.sub(start));swingBone(middle,end,target.clone().sub(middle.getWorldPosition(new T.Vector3())));
 }
 function swimPose(){
  state.swimming=true;const cycle=w.t*.42;state.swimContacts=[];
  for(const [i,side]of ['Right','Left'].entries()){const sign=side==='Left'?1:-1,q=(cycle+i*.5)%1,points=[[.32,2.02,.02],[.48,1.78,.23],[.42,1.18,.30],[.36,.88,.05],[.48,1.47,-.19]],k=q*points.length,index=Math.floor(k),f=k-index,u=f*f*(3-2*f),from=new T.Vector3(...points[index]),to=new T.Vector3(...points[(index+1)%points.length]),local=from.lerp(to,u);local.x*=sign;const target=wrapper.localToWorld(local);solveLimb(bones[side+'Arm'],bones[side+'ForeArm'],bones[side+'Hand'],target,new T.Vector3(sign,.05,-.35).applyQuaternion(rootQ));const frame=handFrames[side];if(frame){const desired=target.clone().sub(bones[side+'ForeArm'].getWorldPosition(new T.Vector3())).normalize(),normal=new T.Vector3(0,0,1).applyQuaternion(rootQ);normal.addScaledVector(desired,-normal.dot(desired)).normalize();const basis=new T.Matrix4().makeBasis(desired,normal,desired.clone().cross(normal)),original=new T.Matrix4().makeBasis(frame.along,frame.normal,frame.along.clone().cross(frame.normal)).invert(),world=new T.Quaternion().setFromRotationMatrix(basis.multiply(original)),hand=bones[side+'Hand'];hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));hand.updateWorldMatrix(false,true);}state.swimContacts.push({side,target});
   const footTarget=swimFeet[side].clone();footTarget.y+=.015;footTarget.z+=Math.sin(w.t*4.5+i*Math.PI)*.075;solveLimb(bones[side+'UpLeg'],bones[side+'Leg'],bones[side+'Foot'],wrapper.localToWorld(footTarget),new T.Vector3(0,-.2,-1).applyQuaternion(rootQ));const toe=bones[side+'ToeBase'];if(toe)swingBone(bones[side+'Foot'],toe,new T.Vector3(0,-1,.25).applyQuaternion(rootQ));
  }
 }
 l.after=function(dt){after(dt);w.contact?.correctPlacement();if(w.settings.character!=='classic'&&!state.loading)state.load();const use=state.loaded&&w.settings.character!=='classic';wrapper.visible=use;if(!use){keyboard.position.copy(keyboardRest);a.rod.position.y=0;a.rod.quaternion.identity();if(state.wasActive)for(const[m,v]of legacy)m.visible=v;state.wasActive=false;return;}
  if(w.story.id==='fishing'&&a.rod.visible){a.arms[1].rotation.set(-.9,0,.25);a.arms[0].rotation.set(-.7,0,-.25);a.arms.forEach(arm=>arm.userData.elbow.rotation.x=-.65);}
  state.wasActive=true;for(const m of legacy.keys())m.visible=false;
  wrapper.position.copy(a.body.position);wrapper.quaternion.copy(a.body.quaternion);wrapper.scale.setScalar(1);const idNow=w.story.id;if(['rest','sleepcruise'].includes(idNow)||idNow==='hammockFail'&&w.storyTime/w.duration<.6){a.g.updateWorldMatrix(true,false);const hammockQ=w.hammock.getWorldQuaternion(new T.Quaternion()),bedQ=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,0,1),new T.Vector3(1,0,0),new T.Vector3(0,1,0))),globalQ=hammockQ.multiply(bedQ);wrapper.quaternion.copy(a.g.getWorldQuaternion(new T.Quaternion()).invert().multiply(globalQ));const center=a.g.worldToLocal(w.hammock.position.clone().add(new T.Vector3(0,.75,0)));wrapper.position.copy(center.sub(new T.Vector3(0,1.3,0).applyQuaternion(wrapper.quaternion)));}wrapper.updateWorldMatrix(true,true);wrapper.getWorldQuaternion(rootQ);
  for(const b of Object.values(bones))b.quaternion.copy(rest.get(b).q);model.updateWorldMatrix(true,true);
  for(const joint of joints)aim(joint);state.swimming=false;if(['swim','snorkel','dive','glowSwim','surfing'].includes(w.story.id)&&['swim','underwater','return','wipeout'].includes(w.ocean.phase))swimPose();
  state.keyboardContacts=[];if(w.story.id==='laptop'&&keyboard.visible&&w.storyTime/w.duration>.32&&w.storyTime/w.duration<.9){keyboard.position.set(0,1.24,.55);keyboard.updateWorldMatrix(true,true);for(const side of ['Right','Left']){const target=keyboard.localToWorld(new T.Vector3(side==='Left'?.2:-.2,.12,.04));keyboardArm(side,target);state.keyboardContacts.push({side,target});}}else keyboard.position.copy(keyboardRest);
  for(const name of ['Neck','Head']){const b=bones[name];if(!b)continue;quat.copy(a.head.quaternion);if(name==='Neck')quat.slerp(new T.Quaternion(),.6);quat.multiply(rest.get(b).world).premultiply(rootQ);b.parent.getWorldQuaternion(parentQ);b.quaternion.copy(parentQ.invert().multiply(quat));b.updateWorldMatrix(false,true);}
  model.updateWorldMatrix(true,true);
  const water=['swim','snorkel','dive','glowSwim','surfing','raft'].includes(w.story.id),resting=['rest','sleepcruise','hammockFail','stargaze','meditation'].includes(w.story.id);
  const moving=!water&&!resting&&Math.abs(a.body.rotation.x)<.25&&(w.story.id==='quiet'?w.storyTime<6:w.storyTime/w.duration<.19);
  const standingQuiet=w.story.id==='quiet'&&w.storyTime>=6&&Math.abs(a.body.position.y)<.1&&Math.abs(a.arms[0].rotation.z)<.5&&Math.abs(a.arms[1].rotation.x)<.4;
  state.poseMode=moving?'walk':standingQuiet?'idle':'activity';
  const clip=poseClips[moving?'walk':'idle'];if(clip&&(moving||standingQuiet)){for(const track of clip.tracks)track.bone.quaternion.fromArray(track.sample.evaluate(w.t%clip.duration));model.updateWorldMatrix(true,true);}
  armClearance();
  if(a.rod.visible){const wrist=bones.LeftHand.getWorldPosition(new T.Vector3());if(bones.LeftHandMiddle1)wrist.lerp(bones.LeftHandMiddle1.getWorldPosition(new T.Vector3()),.55);a.body.updateWorldMatrix(true,false);a.rod.quaternion.identity();a.rod.position.copy(a.body.worldToLocal(wrist)).sub(new T.Vector3(.3,1.05,.1));}
  state.syncHandProps();
  state.face?.update(w,dt);
  const id=w.story.id,holding=['fishing','repair','workout','bananaPhone','metalDetector','kite'].includes(id);
  for(const f of fingers){const active=holding&&(f.side==='Left'||['workout','kite'].includes(id));f.bone.quaternion.copy(rest.get(f.bone).q).multiply(new T.Quaternion().setFromAxisAngle(f.axis,active?(f.thumb?.18:.55):(f.thumb?.025:.065)));}

 };
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),rigged:{loaded:state.loaded,error:state.error,bones:state.bones,triangles:state.triangles,asset:state.asset,active:!!state.wasActive}});
 state.syncHandProps=()=>{if(!state.loaded)return;  const hand=bones[w.story.id==='shellMusic'?'RightHand':'LeftHand'];if(hand){const target=hand.getWorldPosition(new T.Vector3());if(w.handProps?.held.visible){w.handProps.held.position.copy(target).add(new T.Vector3(0,.07,.04).applyQuaternion(a.g.quaternion));w.handProps.held.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()));}if(w.handTools?.hammer.visible){w.handTools.hammer.position.copy(target);w.handTools.hammer.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()));}}
 };
 state.groundFeet=()=>{
  if(!state.loaded||w.settings.character==='classic'||!a.g.visible||['swim','snorkel','dive','glowSwim','surfing','raft','rest','sleepcruise','hammockFail'].includes(w.story.id)||a.body.position.y<-.15)return;
  wrapper.updateWorldMatrix(true,true);wrapper.getWorldQuaternion(rootQ);state.footContacts=[];
  for(const side of ['Left','Right']){const foot=bones[side+'Foot'],p=foot.getWorldPosition(new T.Vector3()),floor=terrain(p.x,p.z)+.11;if(p.y<floor){p.y=floor;solveLimb(bones[side+'UpLeg'],bones[side+'Leg'],foot,p,new T.Vector3(0,0,1).applyQuaternion(rootQ));state.footContacts.push(side);}}
 };
 state.wrapper=wrapper;state.getBones=()=>bones;state.rest=rest;
 state.fishingHands=()=>{if(!state.loaded)return;for(const [side,x,y,z]of [['Left',.18,1.25,.55],['Right',.02,1.17,.46]]){solveLimb(bones[side+'Arm'],bones[side+'ForeArm'],bones[side+'Hand'],wrapper.localToWorld(new T.Vector3(x,y,z)),new T.Vector3(side==='Left'?1:-1,-.2,.3).applyQuaternion(rootQ));const frame=handFrames[side];if(frame){const along=new T.Vector3(0,-1,.12).normalize().applyQuaternion(rootQ),normal=new T.Vector3(side==='Left'?-1:1,0,0).applyQuaternion(rootQ),basis=new T.Matrix4().makeBasis(along,normal,along.clone().cross(normal)),original=new T.Matrix4().makeBasis(frame.along,frame.normal,frame.along.clone().cross(frame.normal)).invert(),q=new T.Quaternion().setFromRotationMatrix(basis.multiply(original)),hand=bones[side+'Hand'];hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));hand.updateWorldMatrix(false,true);}}for(const f of fingers)f.bone.quaternion.copy(rest.get(f.bone).q).multiply(new T.Quaternion().setFromAxisAngle(f.axis,f.thumb?.16:.55));model.updateWorldMatrix(true,true);};
}
