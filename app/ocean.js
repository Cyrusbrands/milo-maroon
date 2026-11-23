import * as T from './vendor/three.module.js';
import {ball,box,stick,mat,terrain} from './world.js';
const WATER=new Set(['swim','snorkel','dive','glowSwim','surfing']),PI=Math.PI,clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const radial=(x,z)=>Math.hypot(x/7.8,z/5.7);
export function seabed(x,z){const r=radial(x,z);return r<1.03?terrain(x,z):-.08-Math.min(8,(r-1.03)*5);}
const shore=new T.Vector3(5.6,0,4.4),launch=new T.Vector3(7.5,0,6),home=new T.Vector3(2.8,0,3.3);
export function journey(p,id){const pos=new T.Vector3();let phase,heading=new T.Vector3(1,0,.8),pitch=0;
 if(p<.18){phase='walk';pos.lerpVectors(home,shore,smooth(p/.18));pos.y=terrain(pos.x,pos.z)+.025;}
 else if(p<.27){phase='wade';pos.lerpVectors(shore,launch,smooth((p-.18)/.09));pos.y=Math.max(-.72,seabed(pos.x,pos.z));}
 else if(p<.34){phase='entry';const q=(p-.27)/.07;pos.lerpVectors(launch,new T.Vector3(9,0,7),q);pos.y=lerp(-.72,.06,q)+Math.sin(q*PI)*.8;pitch=PI/2*smooth(q);}
 else if(p<.72){phase=id==='dive'?'underwater':'swim';const q=(p-.34)/.38;pos.set(9+Math.sin(q*PI)*2.4,.06,7+Math.sin(q*PI*2)*1.2);heading.set(Math.cos(q*PI)*2.4,0,Math.cos(q*PI*2)*2.4);pitch=PI/2;if(id==='dive')pos.y=.06-Math.sin(q*PI)*2.5;}
 else if(p<.82){phase='return';pos.lerpVectors(new T.Vector3(9,.06,7),launch,smooth((p-.72)/.1));pitch=PI/2;heading.set(-1,0,-.8);}
 else if(p<.9){phase='stand';const q=smooth((p-.82)/.08);pos.lerpVectors(launch,shore,q);pos.y=lerp(.06,terrain(shore.x,shore.z)+.025,q);pitch=PI/2*(1-q);heading.set(-1,0,-.8);}
 else{phase='ashore';pos.lerpVectors(shore,home,smooth((p-.9)/.1));pos.y=terrain(pos.x,pos.z)+.025;heading.set(-1,0,-.8);}
 return{pos,phase,pitch,yaw:Math.atan2(heading.x,heading.z),depth:Math.max(0,-seabed(pos.x,pos.z))};}
export function surfJourney(p){
 const pos=new T.Vector3(),start=new T.Vector3(9.5,.20,6.7);let phase='walk',pitch=0,yaw=.8;
 if(p<.18){pos.lerpVectors(home,shore,smooth(p/.18));pos.y=terrain(pos.x,pos.z)+.025;}
 else if(p<.30){phase='board';pos.lerpVectors(shore,start,smooth((p-.18)/.12));pos.y=.20;}
 else if(p<.68){phase='ride';const q=(p-.30)/.38;pos.set(9.5+Math.sin(q*PI)*2,.20,6.7+Math.sin(q*2*PI)*.6);yaw=Math.atan2(Math.cos(q*PI)*2,Math.cos(q*2*PI)*1.2);}
 else if(p<.76){phase='wipeout';const q=smooth((p-.68)/.08);pos.set(9.5+q*.5,lerp(.20,.02,q),6.7+q*.5);pitch=q*PI/2;}
 else if(p<.87){phase='return';pos.lerpVectors(new T.Vector3(10,.02,7.2),launch,smooth((p-.76)/.11));pos.y=.02;pitch=PI/2;yaw=-2.3;}
 else if(p<.94){phase='stand';const q=smooth((p-.87)/.07);pos.lerpVectors(launch,shore,q);pos.y=lerp(.02,terrain(shore.x,shore.z)+.025,q);pitch=(1-q)*PI/2;yaw=-2.3;}
 else{phase='ashore';pos.lerpVectors(shore,home,smooth((p-.94)/.06));pos.y=terrain(pos.x,pos.z)+.025;yaw=-2.3;}
 return{pos,phase,pitch,yaw,depth:Math.max(0,-seabed(pos.x,pos.z))};
}
export function enableOcean(w){const a=w.actor,l=w.life,main=l.animateMain.bind(l),after=l.after.bind(l);let lastPhase='',lastStroke=-1,wetness=0;
 w.ocean={phase:'land',depth:0,wetness:0,underwater:false};
 // Continuous sloping seabed surrounding the existing island, in the same coordinates.
 const geo=new T.PlaneGeometry(65,55,120,100);geo.rotateX(-PI/2);const pa=geo.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,radial(pa.getX(i),pa.getZ(i))<1.03?-.6:seabed(pa.getX(i),pa.getZ(i)));geo.computeVertexNormals();const sand=mat('#bcceaa',{flatShading:false});sand.onBeforeCompile=s=>{s.uniforms.oceanTime={value:0};sand.userData.shader=s;s.vertexShader='varying vec3 vBed;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvBed=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='uniform float oceanTime;varying vec3 vBed;\n'+s.fragmentShader.replace('#include <dithering_fragment>','float c=pow(max(0.,sin(vBed.x*3.+oceanTime)*sin(vBed.z*3.4-oceanTime*.7)),12.);gl_FragColor.rgb+=vec3(.08,.14,.1)*c;\n#include <dithering_fragment>');};const bed=new T.Mesh(geo,sand);bed.receiveShadow=true;w.scene.add(bed);
 const ecology=new T.Group();w.scene.add(ecology);const fish=[];for(let i=0;i<42;i++){const x=9+Math.sin(i*4)*5,z=8+Math.cos(i*7)*5,y=seabed(x,z);if(y>-.8)continue;for(let j=0;j<3;j++)stick(ecology,[x,y,z],[x+Math.sin(j*2)*.3,y+.5+(i%3)*.13,z+Math.cos(j*2)*.3],.055,mat(['#c78282','#b3a8c3','#c9b481'][i%3]));const g=new T.Group();ecology.add(g);ball(g,mat(i%2?'#efc67a':'#73c3b3'),[0,0,0],[.18,.075,.065]);box(g,mat('#9cc8b3'),[-.19,0,0],[.08,.14,.025]);fish.push(g);}
 w.ocean.fishGroups=fish;
 // Fixed-size pools for wakes, ripples and bubbles: no unbounded allocation.
 const rings=[];for(let i=0;i<12;i++){const mesh=new T.Mesh(new T.RingGeometry(.4,.44,36),new T.MeshBasicMaterial({color:'#e1fff3',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));mesh.rotation.x=-PI/2;w.scene.add(mesh);rings.push(mesh);}
 const bubbles=[];for(let i=0;i<24;i++)bubbles.push(ball(w.scene,mat('#a9d9d6',{transparent:true,opacity:.3}),[0,-20,0],[.035,.035,.035]));
 // Add thumbs/finger hints, cuffs, eyebrows and articulated knees without scaling bones.
 const cuffs=mat('#eea174');a.arms.forEach((arm,i)=>{ball(arm,cuffs,[0,-.1,0],[.11,.14,.11]);const hand=arm.userData.hand;for(let j=0;j<3;j++)ball(hand,mat('#dca36f'),[(j-1)*.025,-.085,.015],[.018,.045,.022]);ball(hand,mat('#dca36f'),[i?-.075:.075,-.02,.03],[.035,.05,.03]);});
 const knees=[];a.legs.forEach(leg=>{const old=[...leg.children];old.forEach(o=>o.visible=false);stick(leg,[0,0,0],[0,-.21,0],.095,mat('#dca36f'));const knee=new T.Group();knee.position.y=-.21;leg.add(knee);ball(knee,mat('#dca36f'),[0,0,0],[.1,.09,.1]);stick(knee,[0,0,0],[0,-.2,0],.085,mat('#dca36f'));ball(knee,mat('#dca36f'),[0,-.23,.075],[.12,.075,.18]);knees.push(knee);});
 const cloth=[];a.body.traverse(o=>{if(o.isMesh&&o.material?.color?.getHexString()==='df694e'){o.material=o.material.clone();cloth.push(o.material);}});
 l.animateMain=function(id,p,t,dt){if(!WATER.has(id)){main(id,p,t,dt);return;}this.reset();const j=id==='surfing'?surfJourney(p):journey(p,id);a.g.position.copy(j.pos);a.g.rotation.y=j.yaw;a.body.rotation.x=j.pitch;a.body.position.set(0,0,-1.05*Math.sin(j.pitch));a.head.rotation.x=-.08;
  const swimming=['swim','underwater','return','wipeout'].includes(j.phase);if(swimming){a.body.rotation.z=Math.sin(t*3.5)*.08;for(let i=0;i<2;i++){a.arms[i].rotation.x=-1.4+Math.sin(t*2.5+i*PI)*1.1;a.arms[i].userData.elbow.rotation.x=-.22;a.legs[i].rotation.x=Math.sin(t*4.5+i*PI)*.12;}a.head.rotation.z=id==='dive'?0:Math.max(0,Math.sin(t*1.25))*.2;}else{for(let i=0;i<2;i++){a.legs[i].rotation.x=Math.sin(t*6+i*PI)*.35;a.arms[i].rotation.x=-Math.sin(t*6+i*PI)*.2;}}
  if(id==='surfing'){const board=this.props.board;board.visible=['board','ride','wipeout'].includes(j.phase);board.position.set(j.pos.x,.08+Math.sin(t*1.4)*.025,j.pos.z);board.rotation.set(0,j.yaw,Math.sin(t*1.2)*.035);if(j.phase==='ride'||j.phase==='board'){a.arms[0].rotation.z=.7;a.arms[1].rotation.z=-.7;a.legs[0].rotation.x=.12;a.legs[1].rotation.x=-.12;}}
  if(id==='snorkel'&&p>.25&&p<.85){this.props.mask.visible=true;this.props.fins.visible=true;}
 };
 const cameraPos=w.camera.position.clone(),cameraAim=new T.Vector3(0,1,0);
 l.after=function(dt){after(dt);const id=w.story.id,p=w.storyTime/w.duration,t=w.t;const active=WATER.has(id),j=active?(id==='surfing'?surfJourney(p):journey(p,id)):null;
  // Apply after the older extensions so no legacy diorama can teleport the actor.
  if(active){a.g.position.copy(j.pos);a.g.rotation.y=j.yaw;a.body.rotation.x=j.pitch;a.body.position.set(0,0,-1.05*Math.sin(j.pitch));w.ocean.phase=j.phase;w.ocean.depth=j.depth;
   if(j.phase!==lastPhase){if(j.phase==='entry'||j.phase==='stand'||j.phase==='wipeout'){w.splashAt(j.pos.x,.05,j.pos.z,j.phase==='entry'||j.phase==='wipeout'?30:10);w.audio.cue('splash');}lastPhase=j.phase;}
   if(['swim','underwater','return'].includes(j.phase)){wetness=1;const beat=Math.floor(t*1.8);if(beat!==lastStroke){lastStroke=beat;if(j.pos.y>-.25){a.g.updateWorldMatrix(true,true);const hand=a.arms[beat%2].userData.hand.getWorldPosition(new T.Vector3());if(radial(hand.x,hand.z)>1.1)w.splashAt(hand.x,.05,hand.z,5);}else w.audio.cue('bubble');}}
   if(j.pos.y<-.4){w.scene.fog.color.set('#247887');w.scene.fog.density=.045;}
   if(w.settings.motion&&w.settings.camera!=='fixed'){const below=j.pos.y<-.4,target=j.pos.clone().add(new T.Vector3(below?4:7,below?1.2:5,below?5:9));cameraPos.lerp(target,1-Math.exp(-dt*1.6));cameraAim.lerp(j.pos.clone().add(new T.Vector3(0,below?.5:1,0)),1-Math.exp(-dt*2));w.camera.position.copy(cameraPos);w.camera.lookAt(cameraAim);}
  }else{a.body.position.z=0;lastPhase='';cameraPos.copy(w.camera.position);cameraAim.copy(a.g.position);wetness=Math.max(0,wetness-dt/100);w.ocean.phase='land';}
  const under=active&&j.pos.y<-.4;w.ocean.underwater=under;w.ocean.wetness=wetness;w.audio.underwater=under;
  if(active)l.sharks.forEach((s,i)=>{if(Math.hypot(s.position.x-a.g.position.x,s.position.z-a.g.position.z)<2.6)s.position.set(a.g.position.x+3+i*.5,.04,a.g.position.z+2);});
  fish.forEach((f,i)=>{const q=t*.25+i;f.position.set(11+Math.cos(q)*3,-1.6+Math.sin(q*.7)*.4,8+Math.sin(q)*3);f.rotation.y=-q;if(f.position.distanceTo(a.g.position)<1.2)f.position.z+=1.8;});
  rings.forEach((r,i)=>{r.visible=active&&['swim','return','entry'].includes(j.phase)&&j.pos.y>-.3;const q=(t*.65+i/12)%1;r.position.set(a.g.position.x-Math.sin(a.g.rotation.y)*q*1.5,.12,a.g.position.z-Math.cos(a.g.rotation.y)*q*1.5);r.scale.setScalar(.5+q*2);r.material.opacity=(1-q)*.15;});
  bubbles.forEach((b,i)=>{b.visible=under;const q=(t*.5+i/24)%1;b.position.set(a.g.position.x+Math.sin(i*4)*.2,a.g.position.y+q*1.5,a.g.position.z+Math.cos(i*7)*.2);});
  knees.forEach((k,i)=>k.rotation.x=active&&j.pitch>.8?Math.max(0,Math.sin(t*4.5+i*PI))*.12:Math.max(0,-a.legs[i].rotation.x)*.7);
  cloth.forEach(m=>m.color.set('#df694e').multiplyScalar(1-wetness*.2));a.head.rotation.z+=!active&&wetness>.8?Math.sin(t*12)*.035:0;
  if(sand.userData.shader)sand.userData.shader.uniforms.oceanTime.value=t;
 };
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),ocean:{phase:w.ocean.phase,depth:w.ocean.depth,wetness:w.ocean.wetness,underwater:w.ocean.underwater}});
}

