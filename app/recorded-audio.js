// Recorded effects belong to a live actor, activity or ambient event. Never
// start an arbitrary long file and leave it running after its owner disappears.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const LEVEL={fire:.055,rain:.085,insects:.030,underwater:.065,plane:.22,swim:.075,typing:.10,drips:.04,reel:.085,'step-dry':.19,'step-wet':.18,hammer:.23,dig:.16,gull:.15,dolphin:.17,snore:.12,horn:.23,chest:.18,sip:.16,splash:.18,bubbles:.085,whale:.19,creak:.13,hammock:.15,ouch:.25,surprise:.19,thunder:.13};
const CAP={hammer:.6,dig:1.4,gull:2.3,dolphin:4.5,snore:3.9,horn:6.2,chest:4.5,sip:1.9,splash:3.7,bubbles:1.8,whale:4,creak:3.8,hammock:3.5,ouch:.5,surprise:1.2,thunder:9.1,'step-dry':.5,'step-wet':.6};
const REST=new Set(['rest','sleepcruise','hammockFail','stargaze']);

export function enableRecordedAudio(w){
 const a=w.audio,m=a.recorded=new RecordedSoundscape(w),start=a.start.bind(a),cue=a.cue.bind(a),update=a.update.bind(a),apply=a.apply.bind(a);
 a.start=async()=>{await start();if(a.ctx){if(w.paused)await a.ctx.suspend();await m.start();}};
 a.cue=name=>{if(!m.ready||!m.cue(name))cue(name);};
 a.update=(t,storm,night)=>{update(t,storm,night);m.update(t,storm,night);};
 a.apply=()=>{apply();if(!a.settings.audio)m.stopAll('muted');};
 const next=w.life.next.bind(w.life);w.life.next=function(index){m.epoch++;m.stopOwner('story','activity changed');return next(index);};
 window.addEventListener('pagehide',()=>m.stopAll('window closed',0));
}

class RecordedSoundscape{
 constructor(w){this.w=w;this.audio=w.audio;this.ready=false;this.errors=[];this.groups=new Map();this.voices=new Map();this.pending=new Set();this.cooldowns=new Map();this.previousClip=new Map();this.counts={};this.stopLog=[];this.epoch=0;this.serial=0;this.maxVoices=0;this.nextBird=20;this.nextThunder=55;this.last={};}
 has(group){return this.ready&&!!this.groups.get(group)?.length;}
 async start(){
  if(this.loading)return this.loading;
  this.loading=(async()=>{try{
   const response=await fetch('./sounds/recorded/manifest.json');if(!response.ok)throw Error('Recorded sound catalog unavailable');this.manifest=await response.json();const queue=[...this.manifest.clips];
   await Promise.all([0,1].map(async()=>{while(queue.length){const clip=queue.shift();try{const response=await fetch('./sounds/recorded/'+clip.file);if(!response.ok)throw Error('HTTP '+response.status);const buffer=await this.audio.ctx.decodeAudioData(await response.arrayBuffer());const list=this.groups.get(clip.group)||[];list.push({...clip,buffer});this.groups.set(clip.group,list);}catch(error){this.errors.push({file:clip.file,error:error.message});}}}));
   this.ready=true;const status=document.getElementById('recorded-audio-status');if(status)status.textContent=this.errors.length?'Some recordings could not load; fallback sounds remain available.':'Recorded island soundscape is ready.';
  }catch(error){this.errors.push({error:error.message});}return this.ready;})();return this.loading;
 }
 actorPosition(){const p=this.w.actor.g.position.clone();p.y+=1.1;return p;}
 visible(point){this.w.camera.updateMatrixWorld(true);const p=point.clone().project(this.w.camera);return p.z>=-1&&p.z<=1?clamp((1.16-Math.abs(p.x))/.22)*clamp((1.16-Math.abs(p.y))/.22):0;}
 spatial(point,reference=24){if(!point)return{gain:1,pan:0};const camera=this.w.camera,p=point.clone().sub(camera.position),distance=p.length(),e=camera.matrixWorld.elements;return{gain:1/(1+(distance/reference)**2),pan:clamp((p.x*e[0]+p.y*e[1]+p.z*e[2])/Math.max(5,distance),-1,1)};}
 play(group,options={}){
  if(!this.has(group)||!this.audio.active||!this.audio.settings.audio)return null;
  const c=this.audio.ctx,now=c.currentTime,loop=!!options.loop,cooldown=options.cooldown??(group.startsWith('step')?.12:group==='gull'?5:group==='dolphin'?3:group==='thunder'?20:.35);
  if(!loop&&now-(this.cooldowns.get(group)??-100)<cooldown)return null;
  const position=options.position,point=position?.();if(options.requireVisible&&point&&this.visible(point)<=.01)return null;
  if(this.voices.size+this.pending.size>=14)return null;
  let choices=this.groups.get(group),available=choices.filter(x=>x.id!==this.previousClip.get(group));if(!available.length)available=choices;const clip=available[Math.floor(Math.random()*available.length)];this.previousClip.set(group,clip.id);
  const source=c.createBufferSource(),envelope=c.createGain(),volume=c.createGain(),pan=c.createStereoPanner(),filter=c.createBiquadFilter();source.buffer=clip.buffer;source.loop=loop;filter.type='lowpass';filter.frequency.value=options.lowpass||12000;source.connect(envelope);envelope.connect(volume);volume.connect(pan);pan.connect(filter);filter.connect(options.ambient?this.audio.ambient:this.audio.fx);
  const rate=options.rate??(loop||['horn','snore','thunder'].includes(group)?1:.97+Math.random()*.06);source.playbackRate.value=rate;
  const duration=Math.min(clip.buffer.duration/rate,options.cap??CAP[group]??5),key=options.key||group+':'+(++this.serial),epoch=this.epoch;
  const voice={key,group,clip:clip.id,source,envelope,volume,pan,filter,position,requireVisible:!!options.requireVisible,reference:options.reference||24,base:options.gain??LEVEL[group]??.12,owner:options.owner||(()=>this.epoch===epoch),ownerType:options.ownerType||'story',loop,start:now,end:loop?Infinity:now+duration};
  const spatial=this.spatial(point,voice.reference);volume.gain.value=voice.base*spatial.gain;pan.pan.value=spatial.pan;envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(1,now+(loop?.18:group==='thunder'?.35:group==='horn'?.25:.012));
  if(!loop){const release=group==='thunder'?.8:group==='horn'?.35:.075;envelope.gain.setValueAtTime(1,now+Math.max(.015,duration-release));envelope.gain.linearRampToValueAtTime(0,now+duration);source.start(now,0,Math.min(clip.buffer.duration,duration*rate));source.stop(now+duration+.01);}else source.start(now,Math.random()*Math.max(0,clip.buffer.duration-.25));
  this.voices.set(key,voice);this.cooldowns.set(group,now);this.counts[group]=(this.counts[group]||0)+1;this.maxVoices=Math.max(this.maxVoices,this.voices.size);
  voice.cleanup=()=>{if(voice.disposed)return;voice.disposed=true;if(voice.releaseTimer)clearTimeout(voice.releaseTimer);if(this.voices.get(key)===voice)this.voices.delete(key);this.pending.delete(voice);source.disconnect();envelope.disconnect();volume.disconnect();pan.disconnect();filter.disconnect();};source.onended=voice.cleanup;return voice;
 }
 stop(key,reason='owner ended',fade=.16){const v=this.voices.get(key);if(!v)return;const c=this.audio.ctx,now=c.currentTime;this.voices.delete(key);this.pending.add(v);v.end=now+fade;v.envelope.gain.cancelScheduledValues(now);v.envelope.gain.setValueAtTime(v.envelope.gain.value,now);v.envelope.gain.linearRampToValueAtTime(0,now+fade);try{v.source.stop(now+fade+.01);}catch{}v.releaseTimer=setTimeout(()=>{try{v.source.stop();}catch{}v.cleanup();},(fade+.05)*1000);this.stopLog.push({group:v.group,reason,fade});if(this.stopLog.length>50)this.stopLog.shift();}
 stopOwner(owner,reason){for(const [key,v]of this.voices)if(v.ownerType===owner)this.stop(key,reason);}
 stopAll(reason,fade=.16){for(const key of [...this.voices.keys()])this.stop(key,reason,fade);}
 ensure(key,group,wanted,options={}){const id='loop:'+key,v=this.voices.get(id);if(!wanted){if(v)this.stop(id,key+' inactive');return null;}if(v)return v;return this.play(group,{...options,key:id,loop:true});}
 cue(name){
  const w=this.w,id=w.story.id,p=w.storyTime/w.duration,actor=()=>this.actorPosition();let group,options={position:actor,requireVisible:true};
  if(name==='plane'&&this.has('plane')||name==='typing'&&this.has('typing')||name==='insect'&&this.has('insects')||name==='sizzle'&&this.has('fire'))return true;
  if(name==='step')group=w.ocean?.wetness>.2||Math.hypot(w.actor.g.position.x/7.8,w.actor.g.position.z/5.7)>.86?'step-wet':'step-dry';
  else if(name==='bonk')group='hammer';
  else if(name==='wood')group=['repair','beaconBuild','beaconUpgrade','raft'].includes(id)?'hammer':'creak';
  else if(name==='dig'){if(id==='treasure'&&p>.30)return this.has('dig');group='dig';}
  else if(name==='ow')group='ouch';
  else if(name==='panic'||name==='boing')group='surprise';
  else if(name==='sip')group='sip';
  else if(name==='splash'||name==='dolphinSplash'){group='splash';options.cap=name==='dolphinSplash'?2.3:3.7;options.requireVisible=false;options.cooldown=.6;if(name==='dolphinSplash')options.position=()=>w.dolphin?.instances?.find(i=>i.host.visible)?.host.position||this.actorPosition();}
  else if(name==='bubble'){group='bubbles';options.cap=1.2;options.cooldown=.8;options.requireVisible=false;}
  else if(name==='snore')group='snore';
  else if(name==='gull'){group='gull';options={position:()=>w.life.pelican.g.position,owner:()=>w.started,ownerType:'ambient',reference:40,cooldown:7};}
  else if(name==='dolphin'){group='dolphin';const event=w.life.ambient.find(e=>e.type==='dolphin');options={position:()=>w.dolphin?.instances?.[0]?.host.position,owner:()=>w.life.ambient.includes(event),ownerType:'event',reference:35,cooldown:3};}
  else if(name==='thunder'){group='thunder';options={owner:()=>w.storm>.10,ownerType:'weather',cap:9,cooldown:20,gain:.12};}
  else if(name==='ship'||name==='cruise'){
   group='horn';const event=w.life.ambient.find(e=>e.type==='cruise');options=event?{position:()=>w.life.cruise.position,owner:()=>w.life.ambient.includes(event),ownerType:'event',reference:45,cap:6.2,cooldown:8,requireVisible:true}:{position:()=>id==='beaconBoat'?w.companyAssets.party.position:w.ship.position,reference:40,cap:6.2,cooldown:8,requireVisible:true};
  }
  if(!group||!this.has(group))return false;this.play(group,options);this.audio.cueCounts??={};this.audio.cueCounts[name]=(this.audio.cueCounts[name]||0)+1;return true;
 }
 once(key,condition,fn){if(condition&&!this.last[key])fn();this.last[key]=condition;}
 update(t,storm,night){
  if(!this.ready||!this.audio.ctx||!this.audio.active)return;const w=this.w,a=this.audio,now=a.ctx.currentTime;if(!w.started){this.stopAll('island not started');return;}if(!a.settings.audio){this.stopAll('muted');return;}
  for(const [key,v]of [...this.voices]){if(!v.owner()){this.stop(key,'owner ended');continue;}const point=v.position?.();if(v.requireVisible&&point&&this.visible(point)<=.01){this.stop(key,'left view');continue;}const spatial=this.spatial(point,v.reference);v.volume.gain.setTargetAtTime(v.base*spatial.gain,now,.07);v.pan.pan.setTargetAtTime(spatial.pan,now,.08);}
  if(this.lastEpoch!==this.epoch){this.lastEpoch=this.epoch;this.last={};}
  const underwater=!!w.ocean?.underwater,id=w.story.id,p=w.storyTime/w.duration,actor=()=>this.actorPosition(),visible=w.actor.g.visible&&this.visible(this.actorPosition())>.01;
  const fire=this.ensure('fire','fire',!underwater&&storm<.85,{position:()=>w.fire.position,owner:()=>w.started,ownerType:'ambient',ambient:true,gain:LEVEL.fire*(1-storm*.75),reference:13,lowpass:3500});if(fire)fire.base=LEVEL.fire*(1-storm*.75);
  const rain=this.ensure('rain','rain',storm>.025,{owner:()=>w.started,ownerType:'ambient',ambient:true,gain:LEVEL.rain*storm,lowpass:4500});if(rain)rain.base=LEVEL.rain*storm;
  const insects=this.ensure('insects','insects',night>.45&&storm<.5&&!underwater,{owner:()=>w.started,ownerType:'ambient',ambient:true,gain:LEVEL.insects*clamp((night-.4)*2),lowpass:7000});if(insects)insects.base=LEVEL.insects*clamp((night-.4)*2)*(1-storm);
  this.ensure('underwater','underwater',underwater,{owner:()=>w.started,ownerType:'ambient',ambient:true,lowpass:1000});
  this.ensure('drips','drips',!underwater&&storm<.25&&(w.worldLife?.wetness||0)>.65,{owner:()=>w.started,ownerType:'weather',ambient:true,position:()=>w.hammock.position,reference:16,gain:.04});
  const plane=w.life.ambient.find(e=>e.type==='plane'),planeVisible=!!plane&&w.life.airplane.visible&&!underwater&&this.visible(w.life.airplane.position)>.015;
  this.ensure('plane','plane',planeVisible,{owner:()=>w.life.ambient.includes(plane),ownerType:'event',position:()=>w.life.airplane.position,reference:32,gain:LEVEL.plane,lowpass:1800});
  this.ensure('typing','typing',visible&&['laptop','coconutPower','windPower'].includes(id)&&p>.32&&p<.86&&w.life.props.laptop.visible&&Math.sin(t*.85)>-.7,{position:actor,ownerType:'story',reference:28});
  this.ensure('reel','reel',visible&&id==='fishing'&&p>.48&&p<.73&&w.actor.rod.visible,{position:actor,ownerType:'story',reference:28});
  this.ensure('swim','swim',visible&&!underwater&&['swim','return','wipeout'].includes(w.ocean?.phase)&&['swim','snorkel','dive','glowSwim','surfing'].includes(id),{position:actor,ownerType:'story',gain:.075,reference:24});
  this.once('chest:'+this.epoch,id==='treasure'&&p>.28&&p<.6,()=>this.play('chest',{position:actor,requireVisible:true,cap:4.5}));
  this.once('hammock:'+this.epoch,['rest','sleepcruise','hammockFail'].includes(id)&&p>.15&&p<.6,()=>this.play('hammock',{position:()=>w.hammock.position,requireVisible:true,cap:3.5}));
  this.once('whale:'+this.epoch,id==='whale'&&p>.30&&p<.70,()=>this.play('whale',{position:()=>w.whale.position,requireVisible:true,reference:40,cap:4}));
  if(t>this.nextBird&&night<.55&&storm<.4&&!underwater){this.nextBird=t+24+Math.random()*25;const bird=w.birds.filter(b=>b.g.visible).sort((a,b)=>a.g.position.distanceTo(w.camera.position)-b.g.position.distanceTo(w.camera.position))[0];if(bird)this.play('gull',{position:()=>bird.g.position,owner:()=>w.started,ownerType:'ambient',reference:40,gain:.12,cooldown:7});}
  if(t>this.nextThunder&&storm>.6){this.nextThunder=t+45+Math.random()*35;this.cue('thunder');}
  if(visible&&((id==='garden'&&p>.3&&p<.65)||(id==='treasure'&&p>.12&&p<.28))&&Math.sin(t*3)>.75&&t-(this.lastDig||0)>1.4){this.lastDig=t;this.play('dig',{position:actor,cap:1.4});}
 }
 debug(){return{context:this.audio.ctx?{state:this.audio.ctx.state,time:this.audio.ctx.currentTime}:null,ready:this.ready,sources:this.manifest?.sources.length||0,clips:[...this.groups.values()].reduce((n,g)=>n+g.length,0),errors:this.errors,active:[...this.voices.values()].map(v=>({key:v.key,group:v.group,clip:v.clip,loop:v.loop,owner:v.ownerType,remaining:Number.isFinite(v.end)?Math.max(0,v.end-this.audio.ctx.currentTime):null,gain:v.volume.gain.value,pan:v.pan.pan.value})),fading:[...this.pending].map(v=>({group:v.group,remaining:Math.max(0,v.end-this.audio.ctx.currentTime)})),counts:{...this.counts},stops:[...this.stopLog],maxVoices:this.maxVoices};}
}
