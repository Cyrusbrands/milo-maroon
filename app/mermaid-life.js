import * as T from './vendor/three.module.js';
const Y=new T.Vector3(0,1,0),smooth=T.MathUtils.smoothstep;

// Native model: head is +Y, face is +Z. Swim with the tail and spine,
// then bring the upper body upright without switching to a human swim cycle.
export function poseMermaid(w,instance,visit,age){
 const q=T.MathUtils.clamp(age/visit.duration,0,1),host=instance.host,side=visit.side;
 const rise=smooth(q,.16,.30),leave=smooth(q,.62,.82),upright=rise*(1-leave);
 let x=side*(16-12*smooth(q,0,.28)),z=8.4+Math.sin(q*Math.PI)*.6;
 if(q>.28&&q<.62)x=side*(4+Math.sin(age*.12)*.35);
 if(q>=.62)x=T.MathUtils.lerp(side*4,-side*17,smooth(q,.62,1));
 const heading=new T.Vector3(-side,0,.08).normalize();
 const axis=heading.clone(),face=Y.clone();
 if(q>.70){axis.y=-Math.sin(smooth(q,.70,.88)*Math.PI)*.75;axis.normalize();face.addScaledVector(axis,-face.dot(axis)).normalize();}
 const glide=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(axis.clone().cross(face).normalize(),axis,face));
 const towardIsland=new T.Vector3(-x,0,-z).normalize();
 const vertical=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Y.clone().cross(towardIsland),Y,towardIsland));
 host.position.set(x,0,z);host.quaternion.copy(glide).slerp(vertical,upright);
 for(const c of instance.configs){
  let angle=0;
  if(c.name.startsWith('Tail'))angle=Math.sin(age*(upright>.5?1.9:3.2)-c.phase)*(c.amplitude*2.2+.035)*(upright>.5?.55:1);
  else if(c.name==='Head')angle=Math.sin(age*.7)*.07;
  else if(c.name==='L_Upperarm'&&upright>.8&&q>.36&&q<.52)angle=.6+Math.sin(age*2)*.12;
  else if(c.name.includes('Forearm'))angle=.08+Math.sin(age*.8)*.025;
  else angle=Math.sin(age*.65)*.025;
  c.bone.quaternion.copy(instance.rest.get(c.bone)).multiply(new T.Quaternion().setFromAxisAngle(c.axis,angle));
 }
 for(const name of ['Spine01','Spine02']){const b=instance.bones[name];if(b)b.quaternion.copy(instance.rest.get(b)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.sin(age*2.5)*.025*(1-upright)));}
 host.updateWorldMatrix(true,true);
 const waist=instance.bones.Tail_01,waistY=waist.getWorldPosition(new T.Vector3()).y;
 const depth=T.MathUtils.lerp(-.56,-.14,upright)-smooth(q,.80,1)*1.1;
 host.position.y+=depth-waistY+Math.sin(age*1.7)*.025;
 host.updateWorldMatrix(true,true);
 const head=instance.bones.Head.getWorldPosition(new T.Vector3()),tail=instance.bones.Tail_Fluke.getWorldPosition(new T.Vector3());
 const phase=q<.16?'glide':q<.30?'rise':q<.62?'surface':q<.82?'dive':'depart';
 w.collection.mermaidState={phase,age,q,upright,headY:head.y,tailY:tail.y,waistY:waist.getWorldPosition(new T.Vector3()).y};
 if(phase==='dive'&&!visit.splashed){visit.splashed=true;w.splashAt(x,.03,z,9);w.audio.cue('dolphinSplash');}
 if(phase==='surface'&&!visit.greeted){visit.greeted=true;w.audio.cue('bubble');w.onWorldEvent?.(visit.mood==='shy'?'Someone is watching the campsite from the reef.':'A visitor has stopped to say hello.');}
 if(phase==='surface'&&visit.mood==='dolphins'&&!visit.calledPod){visit.calledPod=true;w.life.forceAmbient('dolphin',40);}
 return upright;
}
