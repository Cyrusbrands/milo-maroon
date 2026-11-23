import * as T from './vendor/three.module.js';
import {ball,box,stick,mat,terrain} from './world.js';
const IDs=['postcard','teatime','rainDance','shellMusic','telescope','garden'];
export function enableMilo(w){
 const l=w.life,main=l.animateMain.bind(l),after=l.after.bind(l),a=w.actor,cream=mat('#f5dfac'),wood=mat('#916346');
 const held=new T.Group();w.scene.add(held);const cup=new T.Group();held.add(cup);ball(cup,cream,[0,0,0],[.12,.14,.12]);const handle=new T.Mesh(new T.TorusGeometry(.075,.025,6,12),cream);handle.position.x=.13;cup.add(handle);
 const card=box(held,cream,[0,0,0],[.3,.2,.025]);const shell=ball(held,mat('#edbca4'),[0,0,0],[.15,.08,.12]);
 w.handProps={held,cup,card,shell};
 const scope=new T.Group();w.scene.add(scope);stick(scope,[0,0,0],[0,1.1,0],.04,wood);for(const x of [-.4,.4])stick(scope,[x,0,.2],[0,.8,0],.03,wood);stick(scope,[-.4,1.2,0],[.5,1.4,0],.13,mat('#bfa777'));scope.position.set(2,terrain(2,2),2);(w.contactObjects??=[]).push({id:'telescope',object:scope,halfX:.45,halfZ:.3});
 const garden=new T.Group();w.scene.add(garden);garden.position.set(3.8,terrain(3.8,3),3);box(garden,mat('#654b36'),[0,.02,0],[1.4,.08,.7]);const shoots=[];(w.contactObjects??=[]).push({id:'garden',object:garden,halfX:.72,halfZ:.38});for(let i=0;i<5;i++){const plant=new T.Group();garden.add(plant);plant.position.set((i-2)*.24,0,0);stick(plant,[0,0,0],[0,.3,0],.025,mat('#74a960'));ball(plant,mat('#a2bd71'),[.08,.2,0],[.12,.035,.07]);shoots.push(plant);}
 l.animateMain=function(id,p,t,dt){if(!IDs.includes(id)){main(id,p,t,dt);return;}this.reset();this.pose(id==='garden'?3.8:1, 2,dt,{sit:['teatime','postcard'].includes(id),bend:id==='garden'?.5:0});
  const anticipate=Math.max(0,Math.min(1,(p-.15)/.2));a.head.rotation.x=.15;a.arms[1].rotation.x=-anticipate;
  if(id==='rainDance'){a.arms.forEach((arm,i)=>arm.rotation.z=(i?-1:1)*(1.2+Math.sin(t*3)*.5));a.body.position.y=Math.abs(Math.sin(t*3))*.13;this.once('rain',p,.6,()=>{this.weather.storm=.7;this.say('I meant a LITTLE rain.');});}
  if(id==='shellMusic'){a.arms[0].rotation.x=-1.5;this.once('music',p,.4,()=>w.audio.cue('dance'));}
  if(id==='telescope'){a.head.rotation.x=.3;a.arms[0].rotation.x=-1.2;this.sayOnce('beak',p,.65,'That is a magnificent beak.','gull');}
  if(id==='postcard')this.sayOnce('letter',p,.65,'Dear everyone. Bring biscuits.','typing');
  if(id==='teatime'){a.arms[1].rotation.x=-1.7;this.sayOnce('tea',p,.65,'A perfectly adequate Tuesday.','bottle');}
  if(id==='garden'){a.arms[1].rotation.x=-.8+Math.sin(t*3)*.2;this.sayOnce('seed',p,.6,'Please grow something edible.','bottle');}
 };
 const previous=a.arms.map(arm=>arm.quaternion.clone());const heldPos=new T.Vector3();
 l.after=function(dt){after(dt);const id=w.story.id,p=w.storyTime/w.duration;
  // Smooth the existing joint poses across activity boundaries without stretching geometry.
  a.arms.forEach((arm,i)=>{previous[i].slerp(arm.quaternion,1-Math.exp(-dt*12));arm.quaternion.copy(previous[i]);});
  held.visible=['postcard','teatime','shellMusic'].includes(id)&&p>.2;cup.visible=id==='teatime';card.visible=id==='postcard';shell.visible=id==='shellMusic';
  if(held.visible){a.arms[1].userData.hand.updateWorldMatrix(true,false);a.arms[1].userData.hand.getWorldPosition(heldPos);held.position.copy(heldPos);held.quaternion.copy(a.arms[1].userData.hand.getWorldQuaternion(new T.Quaternion()));}
  scope.visible=id==='telescope';if(scope.visible&&p>.6)l.pelican.g.position.set(2.4,terrain(2,2)+1.6,2);
  garden.visible=l.director.camp.garden>0||id==='garden';shoots.forEach((plant,i)=>{plant.visible=i<l.director.camp.garden||id==='garden'&&i<p*5;plant.scale.y=.5+Math.min(1,l.director.camp.garden*.15);});
 };
 const panel=document.getElementById('journal'),entries=document.getElementById('journal-entries');
 function journal(){entries.replaceChildren();const d=l.director,c=d.camp;const rows=[['THE DAYS',`${d.completed} adventures completed. ${Object.keys(d.visits).length} activities encountered.`],['THE RESIDENTS','Captain Claw steals scenes. Inspector Peake steals everything else. Pebble is learning to trust Milo.'],['THE CAMPSITE',`${c.repairs} repairs · ${c.stolen} items in the pelican’s stash · ${c.garden} garden visits`],['THE MYSTERY',`${c.clues}/3 clues found. ${c.discovered?'The hidden hatch is open.':'Some secrets take their time.'}`],['MILO & COMPANY',`Beacon chapter ${c.beacon}/5 · Captain Claw trust ${c.crabTrust} · Inspector Peake trust ${c.birdTrust}`],['LETTERS HOME',`${c.postcards} postcards entrusted to an unreliable postal service.`],['RECENT DAYS',d.history.slice(-6).map(id=>d.stories.find(s=>s.id===id)?.title||id).join(' · ')]];for(const [title,text] of rows){const row=document.createElement('div');row.className='journal-row';const h=document.createElement('strong');h.textContent=title;row.append(h,document.createTextNode(text));entries.append(row);}}
 document.getElementById('journal-button').onclick=()=>{journal();panel.hidden=!panel.hidden;};document.getElementById('journal-close').onclick=()=>panel.hidden=true;window.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true;});
}
