import * as T from './vendor/three.module.js';

// Same coordinates, amplitude and phase as the rendered sea vertex shader.
export function seaHeight(x,z,time,storm=0){const a=.075+storm*.12;return -.02+Math.sin(x*.52+time*.65)*a+Math.sin(-z*.72+time*.85)*a*.55;}
const clamp=T.MathUtils.clamp;
export function enableSeafaring(w){
 const previous=w.life.after.bind(w.life),state=w.seafaring={version:'0.15.1',boats:[]};
 const definitions=[
  {id:'cruise',asset:'01',host:w.life.cruise,turn:Math.PI,length:8.8,draft:0},
  {id:'party',asset:'01',host:w.companyAssets.party,turn:Math.PI,length:5.5,draft:0},
  {id:'pirate',asset:'02',host:w.life.pirate,turn:Math.PI,length:5.1,draft:.025},
  {id:'sailboat',asset:'03',host:w.ship,turn:-Math.PI/2,length:4.2,draft:.50}
 ];
 const courses=definitions.map(()=>new T.Vector4()),properties=definitions.map(()=>new T.Vector4());
 w.seaMat.uniforms.vesselCourse={value:courses};w.seaMat.uniforms.vesselWake={value:properties};
 const foam=`
 if(gl_FrontFacing){for(int boat=0;boat<4;boat++){
  vec4 course=vesselCourse[boat];vec4 wake=vesselWake[boat];
  if(wake.w>.001){
   vec2 relative=vP.xz-course.xy;float along=dot(relative,course.zw);
   float across=abs(dot(relative,vec2(-course.w,course.z)));
   float behind=-along-wake.x*.43;float trailLength=clamp(wake.z*3.,2.,12.);
   float spread=wake.y*.28+max(0.,behind)*.16;
   float edges=(1.-smoothstep(.045,.19,abs(across-spread)))*smoothstep(0.,.45,behind)*(1.-smoothstep(trailLength*.3,trailLength,behind));
   float churn=(1.-smoothstep(0.,spread,across))*smoothstep(0.,.3,behind)*(1.-smoothstep(0.,trailLength*.65,behind))*.23;
   float bow=exp(-pow((along-wake.x*.43+across*.35)/.12,2.))*(1.-smoothstep(wake.y*.22,wake.y*.57,across));
   float ripple=.68+.32*sin(behind*5.-time*3.+across*9.);
   float foam=clamp((edges*.55+churn+bow*.65)*ripple*wake.w,0.,.65);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.78,.96,.94)*(1.-night*.65),foam);
   float hull=length(vec2(along/(wake.x*.48),across/(wake.y*.5)));
   gl_FragColor.rgb*=1.-(1.-smoothstep(.92,1.12,hull))*.08*wake.w;
  }
 }}
 `;
 w.seaMat.fragmentShader='uniform vec4 vesselCourse[4];uniform vec4 vesselWake[4];\n'+w.seaMat.fragmentShader.replace('#include <tonemapping_fragment>',foam+'\n#include <tonemapping_fragment>');w.seaMat.needsUpdate=true;
 function prepare(){if(state.boats.length||!w.collection.loaded)return;
  for(const d of definitions){const instance=w.collection.instances.find(i=>i.host===d.host&&i.id===d.asset);if(!instance)continue;
   // Authored models: cruise/pirate bow is -X; fitted sailboat bow is -Z.
   // Normalize the imported root once, independently of the scene's heading.
   instance.root.rotation.y=d.turn;d.host.updateWorldMatrix(true,true);
   // Occlude the submerged hull against this same wave field. This also keeps
   // clear-water wildlife windows from making a ship's underside look airborne.
   instance.model.traverse(mesh=>{if(!mesh.isMesh)return;const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];const fitted=originals.map(original=>{const material=original.clone(),before=original.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{before?.call(material,shader,renderer);shader.uniforms.hullSeaTime=w.seaMat.uniforms.time;shader.uniforms.hullStorm=w.seaMat.uniforms.storm;
     shader.vertexShader='varying vec3 hullWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nhullWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
     shader.fragmentShader='varying vec3 hullWorld;uniform float hullSeaTime;uniform float hullStorm;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat hullA=.075+hullStorm*.12;float hullWater=-.02+sin(hullWorld.x*.52+hullSeaTime*.65)*hullA+sin(-hullWorld.z*.72+hullSeaTime*.85)*hullA*.55;if(cameraPosition.y>hullWater&&hullWorld.y<hullWater-.025)discard;');
    };material.customProgramCacheKey=()=> 'milo-wave-hull-v1';return material;});mesh.material=Array.isArray(mesh.material)?fitted:fitted[0];});
   const box=new T.Box3().setFromObject(instance.root),span=box.getSize(new T.Vector3());
   state.boats.push({...d,instance,beam:Math.min(span.x,span.z),previous:new T.Vector3(),velocity:new T.Vector3(),forward:new T.Vector3(1,0,0),seen:false,lastTime:0,owner:null,yaw:0,heave:0,pitch:0,roll:0,fade:0,index:definitions.indexOf(d)});
  }
 }
 function route(b){const l=w.life,id=w.story.id;
  if(b.id==='cruise'){const e=l.ambient.find(e=>e.type==='cruise');return{owner:e,direction:e?.side===-1?-1:1,speed:52/(e?.duration||34)};}
  if(b.id==='pirate'){const e=id!=='pirates'&&l.ambient.find(e=>e.type==='pirate');return{owner:e||id,direction:e?-1:1,speed:e?50/e.duration:id==='pirates'?40/w.duration:46/(w.worldLife.quietVisitor?.duration||52)};}
  return{owner:id,direction:1,speed:(b.id==='party'?48:60)/w.duration};
 }
 state.step=dt=>{prepare();for(const b of state.boats){const host=b.host,visible=host.visible&&b.instance.root.visible;
   if(!visible){b.seen=false;b.fade=Math.max(0,b.fade-dt*.4);properties[b.index].w=b.fade;continue;}
   const raw=new T.Vector3(host.position.x,0,host.position.z),path=route(b),delta=raw.clone().sub(b.previous);
   const fresh=!b.seen||b.owner!==path.owner||Math.abs(w.t-b.lastTime-dt)>.25||delta.length()>Math.max(.8,b.length*.4);
   if(fresh){b.velocity.set(path.direction*path.speed,0,0);b.yaw=path.direction<0?Math.PI:0;}else if(dt>.00001)b.velocity.copy(delta).divideScalar(dt);
   b.previous.copy(raw);b.owner=path.owner;b.lastTime=w.t;b.seen=true;
   const speed=b.velocity.length();if(speed>.015){const desired=-Math.atan2(b.velocity.z,b.velocity.x),difference=Math.atan2(Math.sin(desired-b.yaw),Math.cos(desired-b.yaw));b.yaw+=difference*(1-Math.exp(-dt*3));}
   b.forward.set(Math.cos(b.yaw),0,-Math.sin(b.yaw));const side=new T.Vector3(-b.forward.z,0,b.forward.x),halfL=b.length*.39,halfB=b.beam*.45;
   const sample=(along,across)=>seaHeight(raw.x+b.forward.x*along+side.x*across,raw.z+b.forward.z*along+side.z*across,w.t,w.storm);
   const bow=sample(halfL,0),stern=sample(-halfL,0),port=sample(0,-halfB),starboard=sample(0,halfB),center=sample(0,0);
   const heave=(bow+stern+port+starboard+center*2)/6-b.draft;
   const angleLimit=b.id==='cruise'?.035:.075,pitch=clamp(Math.atan2(bow-stern,halfL*2),-angleLimit,angleLimit),roll=clamp(-Math.atan2(starboard-port,halfB*2),-angleLimit,angleLimit);
   // Large hulls respond to the average surface, not one wave crest.
   const smoothing=1-Math.exp(-dt*(b.id==='cruise'?2.2:3.5));
   if(fresh){b.heave=heave;b.pitch=pitch;b.roll=roll;}else{b.heave=T.MathUtils.lerp(b.heave,heave,smoothing);b.pitch=T.MathUtils.lerp(b.pitch,pitch,smoothing);b.roll=T.MathUtils.lerp(b.roll,roll,smoothing);}
   host.position.y=b.heave;host.rotation.order='YXZ';host.rotation.set(b.roll,b.yaw,b.pitch);
   b.fade=Math.min(1,b.fade+dt*2);courses[b.index].set(raw.x,raw.z,b.forward.x,b.forward.z);properties[b.index].set(b.length,b.beam,clamp(speed,0,4),b.fade*clamp(speed/.25,0,1));
  }
 };
 w.life.after=function(dt){previous(dt);state.step(dt);};
 state.debug=()=>state.boats.map(b=>({id:b.id,visible:b.host.visible,position:b.host.position.toArray(),forward:b.forward.toArray(),velocity:b.velocity.toArray(),yaw:b.yaw,pitch:b.pitch,roll:b.roll,waterline:b.heave,draft:b.draft,wake:properties[b.index].toArray()}));
 return state;
}
