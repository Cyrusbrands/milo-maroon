import * as T from './vendor/three.module.js';
import {ball,box,stick,mat,terrain} from './world.js';
const BEACON=['beaconBuild','beaconMoths','beaconUpgrade','beaconBoat','beaconLamp'];
export function makeReefFish(){
 const g=new T.Group(),silver=mat('#a4d7cf',{flatShading:false,roughness:.32,metalness:.2}),blue=mat('#237f9d',{flatShading:false,roughness:.4});
 const points=[[-.84,.015],[-.62,.09],[-.35,.23],[0,.29],[.38,.25],[.62,.15],[.72,.025]].map(([y,r])=>new T.Vector2(r,y));
 const geo=new T.LatheGeometry(points,20);geo.rotateZ(-Math.PI/2);const colors=[];for(let i=0;i<geo.attributes.position.count;i++){const y=geo.attributes.position.getY(i);const c=new T.Color('#c6e1cc').lerp(new T.Color('#176b94'),T.MathUtils.clamp((y+.1)*3,0,1));colors.push(c.r,c.g,c.b);}geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const m=new T.Mesh(geo,mat('#ffffff',{vertexColors:true,flatShading:false,roughness:.32,metalness:.15}));g.add(m);const outline=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#285465',side:T.BackSide}));outline.scale.setScalar(1.025);g.add(outline);
 const tail=new T.Group();tail.position.x=-.74;g.add(tail);const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(-.42,.35);shape.lineTo(-.25,0);shape.lineTo(-.42,-.35);shape.closePath();tail.add(new T.Mesh(new T.ShapeGeometry(shape),mat('#317b94',{side:T.DoubleSide})));
 for(const side of [-1,1]){ball(g,silver,[.48,.04,side*.16],[.11,.12,.035]);ball(g,mat('#153446',{roughness:.15}),[.5,.05,side*.19],[.07,.075,.02]);ball(g,mat('#ffffff'),[.52,.08,side*.208],[.018,.02,.009]);const fin=box(g,blue,[-.1,-.05,side*.2],[.27,.025,.2]);fin.rotation.y=side*.55;}
 const dorsal=new T.BufferGeometry();dorsal.setAttribute('position',new T.Float32BufferAttribute([-.3,.18,0,-.18,.55,0,.2,.24,0],3));dorsal.computeVertexNormals();g.add(new T.Mesh(dorsal,mat('#458da1',{side:T.DoubleSide})));g.userData.tail=tail;return g;
}
export function enableCompany(w){const l=w.life,d=l.director,a=w.actor,main=l.animateMain.bind(l),after=l.after.bind(l),tick=l.tick.bind(l);const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
 // Smooth shading, restrained specular response and warmer skin instead of faceted primitives.
 w.scene.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial){o.material.flatShading=false;o.material.needsUpdate=true;}});
 const skin=mat('#dfaa7a',{flatShading:false,roughness:.72});for(const side of [-1,1]){ball(a.head,mat('#d89073',{flatShading:false}),[side*.24,-.09,.25],[.08,.055,.035]);for(let i=0;i<3;i++)ball(a.head,mat('#ae7254'),[side*(.2+i*.025),-.065,.29],[.008,.008,.005]);}
 const brows=a.head.children.filter(o=>o.isMesh&&o.geometry?.type==='BoxGeometry');const lids=[];for(const x of [-.14,.14]){const lid=ball(a.head,skin,[x,.12,.31],[.095,.025,.04]);lids.push(lid);}
 // Upgrade visible reef fish in existing schools without changing their path groups.
 const swimmers=[];for(const group of [...l.fishSchool,...w.scene.children.filter(o=>o.isGroup&&o.children.length===2&&o.children[0]?.geometry?.type==='SphereGeometry')]){
  if(group===a.g||group===w.crab.g)continue;
  if(l.fishSchool.includes(group)||group.children[0]?.scale.x===.18){group.children.forEach(c=>c.visible=false);const fish=makeReefFish();fish.scale.setScalar(.22);group.add(fish);swimmers.push(fish);}
 }
 // Ocean ecology sits in a single group containing coral meshes and fish groups.
 for(const group of w.scene.children.filter(o=>o.isGroup&&o.children.length>50))for(const child of group.children){if(child.isGroup&&child.children.length===2&&child.children[0]?.scale.x===.18){child.children.forEach(c=>c.visible=false);const fish=makeReefFish();fish.scale.setScalar(.24);child.add(fish);swimmers.push(fish);}}
 w.reefFish=swimmers;
 const heroFish=makeReefFish();heroFish.visible=false;w.scene.add(heroFish);const beacon=new T.Group();w.scene.add(beacon);beacon.position.set(-.3,terrain(-.3,2),2);stick(beacon,[0,0,0],[0,1.8,0],.07,mat('#966548'));const lamp=ball(beacon,mat('#f7d68d',{emissive:'#e9b54e',emissiveIntensity:.5,flatShading:false}),[0,1.9,0],[.23,.3,.23]);const lampLight=new T.PointLight('#ffda90',0,5);lampLight.position.y=1.9;beacon.add(lampLight);const moths=[];for(let i=0;i<10;i++)moths.push(ball(w.scene,mat('#fff0c4'),[0,0,0],[.035,.016,.06]));
 const cap=box(w.scene,mat('#b4c9ba',{metalness:.4}),[0,0,0],[.12,.03,.12]);const biscuit=ball(w.scene,mat('#d6aa6e'),[0,0,0],[.1,.025,.08]);const timber=new T.Group();w.scene.add(timber);for(let i=0;i<4;i++)stick(timber,[-.6,i*.07,0],[.6,i*.07,.1],.06,mat('#aa8258'));timber.position.set(4.8,terrain(4.8,2),2);(w.contactObjects??=[]).push({id:'timber',object:timber,halfX:.67,halfZ:.18},{id:'beacon',object:beacon,halfX:.1,halfZ:.1});
 const party=new T.Group();w.scene.add(party);box(party,mat('#d5ded0'),[0,.25,0],[4,.6,1.5]);box(party,mat('#3d929d'),[0,.8,0],[2.4,.6,1.1]);for(let i=0;i<5;i++)ball(party,mat(['#f2b873','#da859a','#9fceac'][i%3]),[-1+i*.5,1.2,0],[.08,.12,.08]);
 const glow=[];for(let i=0;i<90;i++){const m=ball(w.scene,new T.MeshBasicMaterial({color:i%2?'#63eacb':'#8ddaf5',transparent:true,opacity:.65}),[0,-20,0],[.025,.025,.025]);glow.push(m);}
 const whale=new T.Group();w.scene.add(whale);ball(whale,mat('#4c7a8a',{flatShading:false}),[0,-.4,0],[2.7,.85,1]);ball(whale,mat('#a6c6c4',{flatShading:false}),[.7,-.7,0],[1.8,.3,.7]);const tail=new T.Group();tail.position.x=-2.5;whale.add(tail);for(const side of [-1,1]){const fluke=ball(tail,mat('#4c7a8a',{flatShading:false}),[-.3,0,side*.55],[.65,.1,.65]);fluke.rotation.y=side*.45;}
 const jellies=[];for(let i=0;i<8;i++){const g=new T.Group();w.scene.add(g);ball(g,mat('#b6dadd',{transparent:true,opacity:.38,flatShading:false,emissive:'#3b727f',emissiveIntensity:.3}),[0,0,0],[.25,.18,.25]);for(let k=0;k<5;k++)stick(g,[Math.sin(k)*.14,0,Math.cos(k)*.14],[Math.sin(k)*.2,-.6,Math.cos(k)*.2],.012,mat('#8bccc7',{transparent:true,opacity:.4}));jellies.push(g);}
 const letter=box(w.scene,mat('#f2dab1'),[0,0,0],[.3,.02,.22]);
 w.companyAssets={whale,heroFish,party,swimmers};
 let rare=null,rareAge=0,nextRare=l.r.range(420,900),previousStorm=0,expression='curious',weatherBeat=false,stageStart=a.g.position.clone();
 l.tick=function(dt){tick(dt);if(!w.started)return;nextRare-=dt;if(nextRare<=0&&!rare){rare=w.night>.6?'jellyfish':'whale';rareAge=0;nextRare=l.r.range(1200,2100);w.onWorldEvent?.(rare==='whale'?'A gentle giant is resting offshore.':'The lagoon is holding a lantern parade.');}if(rare){rareAge+=dt;if(rareAge>65)rare=null;}if(previousStorm>.4&&w.storm<.4){weatherBeat=true;d.camp.driftwood++;}previousStorm=w.storm;};
 l.animateMain=function(id,p,t,dt){if(!BEACON.includes(id)&&!['crabGift','birdTrade','driftwood'].includes(id)){main(id,p,t,dt);return;}this.reset();this.pose(id==='birdTrade'?2.5:.9,2.4,dt,{bend:p>.22&&p<.5?.2:0});const anticipation=smooth(p/.25);a.head.rotation.x=-.15;a.arms[1].rotation.x=-anticipation;
  if(id==='beaconBuild'||id==='beaconUpgrade'){a.arms[1].rotation.x=-.7+Math.sin(t*4)*.2;this.sayOnce('build',p,.5,'Absolutely foolproof. Probably.','wood');}
  if(id==='beaconMoths')this.sayOnce('moths',p,.6,'You are not a helicopter.','gull');
  if(id==='beaconBoat'){a.arms[0].rotation.z=2.1+Math.sin(t*4)*.2;this.sayOnce('party',p,.6,'Rescue! Not encore!','ship');}
  if(id==='beaconLamp')this.sayOnce('lamp',p,.6,'At least someone needed it.','bottle');
  if(id==='crabGift'){a.head.rotation.x=.35;a.arms[0].rotation.x=-.8;this.sayOnce('gift',p,.6,d.camp.crabTrust>2?'Another one? You remembered.':'For me? Thank you, Captain.','crab');}
  if(id==='birdTrade')this.sayOnce('trade',p,.6,'One biscuit. No negotiations.','cloth');
  if(id==='driftwood')this.sayOnce('wood',p,.6,'The weather brought building supplies.','wood');
 };
 l.after=function(dt){after(dt);const id=w.story.id,p=w.storyTime/w.duration,t=w.t,c=d.camp;
  expression=['crab','coconut','hammockFail'].includes(id)&&p>.5?'startled':BEACON.includes(id)&&p>.55?'hopeful':['crabGift','feedTurtle','beaconLamp'].includes(id)?'warm':id==='quiet'?'peaceful':'curious';
  w.artExpression=expression;const surprise=expression==='startled',warm=expression==='warm';brows.forEach((b,i)=>{b.position.y=.19+(surprise?.06:0);b.rotation.z=(i?-1:1)*(warm?.04:surprise?.32:.12);});lids.forEach(lid=>{lid.position.y=expression==='peaceful'?.07:.13;});a.mouth.scale.set(.085,surprise?.065:warm?.035:.025,.018);if(surprise)a.head.rotation.x-=.12;
  beacon.visible=c.beacon>0||BEACON.includes(id);const miniature=c.beacon>=5||id==='beaconLamp';beacon.scale.setScalar(miniature?.3:1);lamp.material.emissiveIntensity=c.beacon>=3?1.8:.65;lampLight.intensity=beacon.visible?(w.night>.5?1.4:.3):0;
  moths.forEach((m,i)=>{m.visible=id==='beaconMoths'||c.beacon===2&&w.night>.5;m.position.set(-.3+Math.sin(t*2+i)*.55,terrain(-.3,2)+1.9+Math.cos(t*3+i)*.3,2+Math.cos(t*2+i)*.5);});
  party.visible=id==='beaconBoat'&&p>.2&&p<.85;party.position.set(-24+p*48,.1+Math.sin(t)*.05,-12);
  cap.visible=id==='crabGift';if(cap.visible){const actor=a.g.position;l.extraCrab.g.position.set(actor.x+.65,terrain(actor.x+.65,actor.z+.4),actor.z+.4);cap.position.copy(l.extraCrab.g.position).add(new T.Vector3(0,.4,0));}
  biscuit.visible=id==='birdTrade';if(biscuit.visible){a.arms[1].userData.hand.updateWorldMatrix(true,false);biscuit.position.copy(a.arms[1].userData.hand.getWorldPosition(new T.Vector3()));l.pelican.g.position.copy(a.g.position).add(new T.Vector3(.8,1.5,.5));}
  timber.visible=c.driftwood>0||id==='driftwood';if(weatherBeat&&id==='quiet'&&w.storm<.2){weatherBeat=false;l.say('A fresh start. With extra timber.');}
  if(id==='painting'&&w.storm>.35){a.head.rotation.x=-.3;a.arms[0].rotation.z=2.4;l.once('wet-paint',p,.3,()=>l.say('The sky is helping. Too much.'));}
  letter.visible=id==='postcard'&&p>.6&&w.storm>.2;if(letter.visible){const q=(p-.6)/.4;letter.position.copy(a.g.position).add(new T.Vector3(q*8,1.5+Math.sin(q*Math.PI)*2,q*3));letter.rotation.set(t*2,t*.4,t);}

  if(id==='postcard'&&p>.6&&w.storm>.2){a.arms[0].rotation.z=2.2;l.once('wind-letter',p,.61,()=>{l.say('Express delivery! Wrong direction.');w.audio.cue('cloth');});}
  if(id==='quiet'&&c.crabTrust>0){const actor=a.g.position;l.extraCrab.g.position.set(actor.x+.9,terrain(actor.x+.9,actor.z+.4),actor.z+.4);}
  if(id==='quiet'&&c.beacon>=5){l.extraCrab.g.position.set(-.3,terrain(-.3,2),2.3);}
  swimmers.forEach((f,i)=>f.userData.tail.rotation.y=Math.sin(t*7+i)*.3);
  heroFish.visible=id==='fishing'&&p>.48&&p<.73;if(heroFish.visible){w.fish.visible=false;heroFish.position.copy(w.fish.position);heroFish.rotation.copy(w.fish.rotation);heroFish.userData.tail.rotation.y=Math.sin(t*12)*.5;}
  const glowing=id==='glowSwim'||rare==='jellyfish',center=id==='glowSwim'?a.g.position:{x:10,z:8};glow.forEach((m,i)=>{m.visible=glowing;m.position.set(center.x+Math.sin(i*7+t*.2)*(1+i%4),.04+Math.sin(t+i)*.02,center.z+Math.cos(i*5+t*.2)*(1+i%3));m.material.opacity=.3+Math.sin(t*2+i)*.2;});
  whale.visible=rare==='whale';whale.position.set(17+Math.sin(rareAge*.035)*3,-.1+Math.sin(t*.4)*.08,-5);whale.rotation.y=-.3;tail.rotation.z=Math.sin(t*.6)*.12;
  jellies.forEach((g,i)=>{g.visible=rare==='jellyfish';g.position.set(9+Math.sin(t*.09+i)*3,.1+Math.sin(t*.4+i)*.06,8+Math.cos(t*.09+i)*3);g.scale.setScalar(.8+Math.sin(t*1.5+i)*.08);});
 };
 l.previewSpectacle=type=>{if(['whale','jellyfish'].includes(type)){rare=type;rareAge=0;nextRare=1800;}};
 const choices=['beaconBuild','beaconMoths','beaconUpgrade','beaconBoat','beaconLamp','crabGift','birdTrade','glowSwim','whale','jellyfish'];let moment=0;document.getElementById('moments').onclick=()=>{const id=choices[moment++%choices.length];if(['whale','jellyfish'].includes(id))l.previewSpectacle(id);else window.castaway.nextStory(d.stories.findIndex(s=>s.id===id));};
 const debug=l.debug.bind(l);l.debug=()=>({...debug(),company:{expression,beacon:d.camp.beacon,crabTrust:d.camp.crabTrust,birdTrust:d.camp.birdTrust,rare,nextRare,fish:swimmers.length}});
}


