import {enableSeafaring} from './seafaring.js';
import {enableEcology} from './ecology.js';
import {enableRecordedAudio} from './recorded-audio.js';
import {enableWorldLife} from './world-life.js';
import {enableEnvironment} from './environment.js';
import {enableAssetCollection} from './island-assets.js';
import {enableTent} from './tent.js';
import {enableCrabs} from './crab.js';
import {enableTurtles} from './turtle.js';
import {enablePalms} from './palms.js';
import {enableSeabirds} from './seabird.js';
import {enableSharks} from './shark.js';
import {enableDolphin} from './dolphin.js';
import {enableRiggedCharacter} from './rigged-character.js';
import {enableArt} from './art.js';
import {enableCompany} from './company.js';
import {enableOcean} from './ocean.js';
import {enableContact} from './contact.js';
import {enableMilo} from './milo.js';
import {enablePersistentIsland} from './persistent.js';
import {enablePatientIsland} from './patient.js';
import {IslandWorld,STORIES} from './world.js';
import {IslandAudio} from './audio.js';
import {enableLivingIsland,ALL_STORIES} from './life.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),mode=params.get('mode')||'app',isSaver=mode==='saver',isPreview=mode==='preview',native=!!window.chrome?.webview;
const defaults={audio:true,volume:35,music:false,time:'auto',pace:'cinematic',motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,captions:true,quality:'high',camera:'cinematic',chaos:'lively',character:params.get('character')==='classic'?'classic':'rigged'};
let settings;try{settings={...defaults,...JSON.parse(localStorage.getItem('castaway-after-the-tide-v1')||'{}')};}catch{settings={...defaults};}
settings.volume=Math.max(0,Math.min(100,Number(settings.volume)||0));
if(params.get('qa')==='1')settings.volume=0;
if(isPreview)settings={...settings,audio:false,music:false,motion:false,quality:'low'};
const audio=new IslandAudio(settings);let world,started=false,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2700);}
function save(){if(!isPreview){try{localStorage.setItem('castaway-after-the-tide-v1',JSON.stringify(settings));}catch{}}audio.apply();document.body.classList.toggle('muted',!settings.audio);$('volume-value').textContent=settings.volume+'%';}
function sync(){for(const key of ['music','motion','captions'])$(key).checked=settings[key];$('audio-enabled').checked=settings.audio;$('volume').value=settings.volume;for(const key of ['time','pace','quality','camera','chaos','character'])$(key).value=settings[key];save();}
async function begin(){if(started)return;started=true;document.body.classList.add('started');$('episode').hidden=!settings.captions||isSaver||isPreview;world.start();if(!isPreview)await audio.start();if(native)window.chrome.webview.postMessage({type:'ready'});}
try{world=new IslandWorld($('world'),settings,audio);enableLivingIsland(world,{preview:isPreview});enablePatientIsland(world);enablePersistentIsland(world);enableMilo(world);enableContact(world);enableOcean(world);enableCompany(world);enableArt(world);enableRiggedCharacter(world);enableDolphin(world);enableSharks(world);enableSeabirds(world);enablePalms(world);enableTurtles(world);enableCrabs(world);enableTent(world);enableAssetCollection(world);enableEnvironment(world);enableWorldLife(world);enableEcology(world);enableSeafaring(world);enableRecordedAudio(world);world.onStory=(story,index)=>{$('episode-number').textContent=`ISLAND STORY ${index<0?'—':String(index+1).padStart(2,'0')}`;$('episode-title').textContent=story.title;$('episode-description').textContent=story.description;$('episode-tag').textContent=story.tag;};world.onStory(ALL_STORIES[0],0);world.onWorldEvent=text=>{$('elsewhere').textContent=text;$('elsewhere').classList.add('visible');clearTimeout(window.worldEventTimer);window.worldEventTimer=setTimeout(()=>$('elsewhere').classList.remove('visible'),7000);};world.onProgress=p=>{$('progress').style.width=`${p*100}%`;const day=1+Math.floor(world.t/690);$('clock').textContent=`DAY ${String(day).padStart(2,'0')}`;$('world-status').textContent=world.storm>.4?'A PASSING TROPICAL STORM':world.night>.65?'UNDER A THOUSAND STARS':world.night>.23?'THE GOLDEN HOURS':'SUNLIT SHORES';};let previous=performance.now(),acc=0;function loop(now){requestAnimationFrame(loop);const dt=Math.max(0,Math.min((now-previous)/1000,.1));previous=now;if(document.hidden&&!isSaver)return;acc+=dt;if(world.frameInterval&&acc<world.frameInterval)return;world.update(acc);acc=0;}requestAnimationFrame(loop);$('loading').hidden=true;window.castaway={world,settings,audio,stories:ALL_STORIES,nextStory:i=>{if(!started)begin();world.next(i);},getState:()=>({story:world.story.id,progress:world.storyTime/world.duration,night:world.night,storm:world.storm,frames:world.frames,started,paused:world.paused,audioState:audio.ctx?.state||'not-started',life:world.life.debug(),recordings:audio.recordingsLoaded||[]})};sync();if(isSaver||isPreview){document.body.classList.add('saver');begin();}}catch(e){console.error(e);$('loading').hidden=true;$('error').hidden=false;$('error-detail').textContent='This experience needs hardware-accelerated WebGL. Please enable graphics acceleration in your browser, or use the Windows app. '+e.message;if(native)window.chrome.webview.postMessage({type:'error',message:e.message});}
$('begin').addEventListener('click',begin);
$('dive').addEventListener('click',()=>{if(!started)begin();world.next(ALL_STORIES.findIndex(s=>s.id==='dive'));});
$('swim').addEventListener('click',()=>{if(!started)begin();world.next(ALL_STORIES.findIndex(s=>s.id==='swim'));});
$('next').addEventListener('click',()=>{if(!started)begin();world.next(world.life.director.choose({night:world.night,storm:world.storm,cruiseReady:world.t>=world.life.nextCruiseAt}));});
$('settings-button').addEventListener('click',()=>$('settings').hidden=!$('settings').hidden);
$('close-settings').addEventListener('click',()=>$('settings').hidden=true);
$('sound').addEventListener('click',async()=>{settings.audio=!settings.audio;$('audio-enabled').checked=settings.audio;await audio.start();save();toast(settings.audio?'The island is listening. Sound on.':'A little peace and quiet. Sound off.');});
$('fullscreen').addEventListener('click',async()=>{if(native){window.chrome.webview.postMessage({type:'fullscreen'});return;}try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Use the Windows app for full-screen mode.');}});
for(const key of ['music','motion','captions'])$(key).addEventListener('change',e=>{settings[key]=e.target.checked;if(key==='captions')$('episode').hidden=!settings.captions||!started||isSaver;save();});
$('audio-enabled').addEventListener('change',async e=>{settings.audio=e.target.checked;await audio.start();save();});
$('volume').addEventListener('input',e=>{settings.volume=Number(e.target.value);save();});
for(const key of ['time','pace','quality','camera','chaos','character'])$(key).addEventListener('change',e=>{settings[key]=e.target.value;if(key==='quality')world.applyQuality();if(key==='camera')world.life.pickShot();save();});
if(native&&!isSaver&&!isPreview){$('install').hidden=false;$('install').addEventListener('click',()=>window.chrome.webview.postMessage({type:'install'}));}
let initialMouse=null,startedAt=performance.now();
function exitSaver(){if(params.get('qa')==='1')return;if(native)window.chrome.webview.postMessage({type:'exit'});else window.close();}
window.addEventListener('pointermove',e=>{if(!isSaver)return;if(performance.now()-startedAt<1800){initialMouse={x:e.screenX,y:e.screenY};return;}if(!initialMouse){initialMouse={x:e.screenX,y:e.screenY};return;}if(Math.hypot(e.screenX-initialMouse.x,e.screenY-initialMouse.y)>14)exitSaver();});
window.addEventListener('pointerdown',()=>{if(isSaver&&performance.now()-startedAt>1800)exitSaver();});
window.addEventListener('keydown',async e=>{if(isSaver){exitSaver();return;}if(e.target.matches('input,select,textarea')&&e.key!=='Escape')return;if(e.code==='Space'){e.preventDefault();world.paused=!world.paused;if(world.paused)audio.ctx?.suspend();else if(started)audio.ctx?.resume();toast(world.paused?'A moment, held still.':'Back to island time.');}if(e.key.toLowerCase()==='n'){if(!started)begin();world.next(world.life.director.choose({night:world.night,storm:world.storm,cruiseReady:world.t>=world.life.nextCruiseAt}));}if(e.key.toLowerCase()==='c'){const modes=['cinematic','orbit','fixed'];settings.camera=modes[(modes.indexOf(settings.camera)+1)%3];$('camera').value=settings.camera;save();toast('Camera: '+settings.camera);}if(e.key.toLowerCase()==='f')$('fullscreen').click();if(e.key==='Escape'){$('settings').hidden=true;if(native)window.chrome.webview.postMessage({type:'escape'});}});
document.addEventListener('visibilitychange',()=>{if(!audio.ctx)return;if(document.hidden)audio.ctx.suspend();else if(started&&!world.paused)audio.ctx.resume();});

const explore=$('explore');$('explore-button').onclick=()=>{explore.hidden=!explore.hidden;$('explore-button').setAttribute('aria-expanded',String(!explore.hidden));$('settings').hidden=true;};$('explore-close').onclick=()=>{explore.hidden=true;$('explore-button').setAttribute('aria-expanded','false');};explore.querySelectorAll('.text-button').forEach(b=>b.addEventListener('click',()=>{explore.hidden=true;$('explore-button').setAttribute('aria-expanded','false');}));window.addEventListener('keydown',e=>{if(e.key==='Escape')explore.hidden=true;});
