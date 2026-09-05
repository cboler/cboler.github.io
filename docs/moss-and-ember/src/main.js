import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';

const canvas=document.getElementById('game-canvas');
const audio=new AudioManager();
const game=new Game(audio);
const renderer=new Renderer(canvas);
const ui=new UI(game);
const bindings={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'attack',KeyZ:'attack',Space:'dash',ShiftLeft:'dash',ShiftRight:'dash',KeyK:'magic',KeyX:'magic',KeyE:'interact',Enter:'interact',KeyQ:'potion'};
window.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLButtonElement && (event.code==='Space'||event.code==='Enter'))return;
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  if(bindings[event.code]){event.preventDefault();game.setTouch(bindings[event.code],true);}
  if(event.repeat)return;
  if(event.code==='Escape'){event.preventDefault();game.togglePause();}
  if(event.code==='KeyM'){event.preventDefault();game.toggleMap();}
  if(event.code==='KeyR'&&game.state==='dead')game.respawn();
});
window.addEventListener('keyup',event=>{if(bindings[event.code])game.setTouch(bindings[event.code],false);});
function pauseForFocusLoss(){
  game.releaseInput();
  if(game.state==='playing'&&!game.dialog){game.mapOpen=false;game.state='paused';game.save();}
}
window.addEventListener('blur',pauseForFocusLoss);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseForFocusLoss();game.save();}});
window.addEventListener('pagehide',()=>game.save());
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'||game.state!=='playing'||game.dialog||game.mapOpen)return;
  const rect=canvas.getBoundingClientRect();
  const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
  const px=(event.clientX-rect.left-(rect.width-canvas.width*scale)/2)/scale;
  const py=(event.clientY-rect.top-(rect.height-canvas.height*scale)/2)/scale;
  if(px<0||py<0||px>canvas.width||py>canvas.height)return;
  const x=px+game.camera.x-canvas.width/2;
  const y=py+game.camera.y-canvas.height/2;
  game.player.facing=Math.atan2(y-game.player.y,x-game.player.x);
  game.setTouch(event.button===2?'magic':'attack',true);audio.unlock();
});
window.addEventListener('pointerup',event=>{if(event.pointerType!=='touch'){game.setTouch('attack',false);game.setTouch('magic',false);}});
let previous=performance.now();
function frame(now){
  const dt=Math.min((now-previous)/1000,.04);previous=now;
  game.update(dt);renderer.render(game,dt);ui.update();
  requestAnimationFrame(frame);
}
ui.update();requestAnimationFrame(frame);
// A small inspection hook supports local debugging and browser smoke tests.
window.__MOSS_EMBER__={game,renderer,ui};
