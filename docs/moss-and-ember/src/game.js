import { createForest, createTemple, distance, isBlocked, moveBody, TILE } from './world.js';

export const SAVE_KEY = 'moss-and-ember-save-v1';
const freshProgress = () => ({ westShrine:false, eastShrine:false, templeOpened:false, templeKey:false, westSwitch:false, eastSwitch:false, bossGate:false, bossDefeated:false, won:false, chests:[], defeated:[] });
const ENEMY = {
  slime: {hp:4,speed:47,radius:12,damage:1},
  wisp: {hp:3,speed:59,radius:9,damage:1},
  knight: {hp:7,speed:53,radius:13,damage:1},
  boss: {hp:42,speed:43,radius:25,damage:2}
};
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const silentAudio = { unlock(){}, play(){}, update(){}, toggleMute(){}, muted:true };

export class Game {
  constructor(audio=silentAudio, storage=null) {
    this.audio=audio;
    try { this.storage=storage || globalThis.window?.localStorage; } catch { this.storage=null; }
    this.state='title'; this.time=0; this.mapOpen=false; this.dialog=null; this.toast=null;
    this.progress=freshProgress(); this.stats={kills:0,time:0,deaths:0};
    this.player=this.newPlayer(); this.world=createForest(this.progress);
    Object.assign(this.player,this.world.spawn);
    this.camera={...this.world.spawn,shake:0};
    this.enemies=[]; this.projectiles=[]; this.particles=[]; this.pickups=[]; this.effects=[];
    this.input=new Set(); this.pressed=new Set(); this.nearby=null; this.transition=0; this.bossActive=false;
    this.lastSave=0; this.loadEnemies();
  }

  newPlayer() { return {x:0,y:0,facing:Math.PI/2,moving:false,hp:6,maxHp:6,mana:6,maxMana:6,coins:0,potions:3,magic:false,attackTimer:0,attackCooldown:0,dashTimer:0,dashCooldown:0,hurtTimer:0,magicCooldown:0,manaClock:0,combo:0,dashX:0,dashY:1}; }
  get hasSave() { return !!this.readSave(); }
  get quest() {
    const p=this.progress;
    if(p.won) return 'The Mosswood is alive again. Your story is complete.';
    if(p.bossDefeated) return 'Reclaim the Heart Ember from the northern altar. [E]';
    if(this.world.id==='temple') {
      if(!p.templeKey) return 'Find the guardian key in the western chamber.';
      if(!p.westSwitch || !p.eastSwitch) return 'Awaken both floor seals. Approach a seal and press E.';
      if(!p.bossGate) return 'Use the key at the northern guardian door. [E]';
      return 'Defeat the Hollow Warden. Dash through its attacks.';
    }
    if(!p.westShrine && !p.eastShrine) return 'Kindle the two woodland shrines. Follow the path north.';
    if(!p.westShrine) return 'Find the western shrine beyond the crossroads.';
    if(!p.eastShrine) return 'Cross the river and kindle the eastern shrine.';
    return 'The temple is open. Follow the northern path.';
  }

  loadEnemies() {
    this.enemies=this.world.spawns.filter(s=>!this.progress.defeated.includes(s.id)).map(s=>({ ...s,...ENEMY[s.type],maxHp:ENEMY[s.type].hp,homeX:s.x,homeY:s.y,facing:Math.PI/2,state:'idle',timer:1,attackCycle:0,hurtTimer:0,dead:false,telegraph:null,active:s.type!=='boss' }));
  }
  setTouch(action,down) { if(down) { if(!this.input.has(action)) this.pressed.add(action); this.input.add(action); } else this.input.delete(action); }
  releaseInput() { this.input.clear(); this.pressed.clear(); }
  startNew() {
    this.audio.unlock(); this.progress=freshProgress(); this.stats={kills:0,time:0,deaths:0}; this.player=this.newPlayer();
    this.state='playing'; this.dialog=null; this.mapOpen=false; this.changeWorld('forest',false);
    this.showDialog('Rowan · Keeper of the Mosswood','The forest’s heart has gone cold, little wanderer. Kindle the two old shrines, then enter the temple to the north. Your blade will clear the way.\n\nMove with WASD or the arrow keys. J swings your sword; Space lets you dash through danger. Press E near people and relics.');
    this.save();
  }
  restart() { this.startNew(); }
  continueGame() {
    const saved=this.readSave();
    if(!saved) { this.startNew(); return; }
    this.audio.unlock(); this.progress={...freshProgress(),...saved.progress};
    this.player={...this.newPlayer(),...saved.player};
    this.player.hp=this.player.maxHp; this.player.mana=this.player.maxMana;
    this.stats={kills:0,time:0,deaths:0,...saved.stats};
    this.state=this.progress.won?'won':'playing'; this.mapOpen=false; this.dialog=null;
    this.changeWorld(saved.world==='temple'?'temple':'forest',false);
    if(saved.position && !isBlocked(this.world,saved.position.x,saved.position.y,11)) Object.assign(this.player,saved.position);
    this.camera.x=this.player.x; this.camera.y=this.player.y;
    this.notify('Welcome back, wanderer. Your adventure is saved.');
  }
  readSave() {
    try {
      const data=JSON.parse(this.storage?.getItem(SAVE_KEY)||'null');
      if(!data || data.version!==1 || !data.player || !data.progress) return null;
      if(!Number.isFinite(data.player.maxHp)||data.player.maxHp<1||data.player.maxHp>20) return null;
      if(!Number.isFinite(data.player.coins)||!Number.isFinite(data.player.potions)) return null;
      if(!Array.isArray(data.progress.chests)||!Array.isArray(data.progress.defeated)) return null;
      if(data.position && (!Number.isFinite(data.position.x)||!Number.isFinite(data.position.y))) return null;
      return data;
    } catch { return null; }
  }
  save() {
    if(this.state==='title') return;
    try {
      const {maxHp,maxMana,coins,potions,magic}=this.player;
      this.storage?.setItem(SAVE_KEY,JSON.stringify({version:1,world:this.world.id,position:{x:this.player.x,y:this.player.y},player:{maxHp,maxMana,coins,potions,magic},progress:this.progress,stats:this.stats}));
    } catch { /* Play remains available when storage is restricted. */ }
    this.lastSave=0;
  }
  changeWorld(id,save=true) {
    this.world=id==='temple'?createTemple(this.progress):createForest(this.progress);
    Object.assign(this.player,this.world.spawn);
    if(id==='forest' && save) {this.player.x=28.5*TILE;this.player.y=11*TILE;}
    this.player.hurtTimer=1; this.player.dashTimer=0; this.player.attackTimer=0;
    this.camera={x:this.player.x,y:this.player.y,shake:0};
    this.projectiles=[];this.pickups=[];this.effects=[];this.particles=[];this.nearby=null;
    this.bossActive=false; this.mapOpen=false; this.transition=1;
    this.loadEnemies(); this.releaseInput();
    if(save) {this.audio.play('door');this.notify(this.world.name);this.save();}
  }
  togglePause() {
    if(this.mapOpen) {this.mapOpen=false;this.releaseInput();return;}
    if(this.dialog) {this.closeDialog();return;}
    if(this.state==='playing') {this.state='paused';this.save();}
    else if(this.state==='paused') this.state='playing';
    this.releaseInput();
  }
  toggleMap() { if(this.state==='playing'&&!this.dialog) {this.mapOpen=!this.mapOpen;this.releaseInput();} }
  showDialog(speaker,text) {this.dialog={speaker,text};this.releaseInput();}
  closeDialog() {this.dialog=null;this.releaseInput();}
  notify(text) {this.toast={text,timer:4.5};}

  update(dt) {
    dt=clamp(dt,0,.04); this.time+=dt;
    this.transition=Math.max(0,this.transition-dt*1.8);
    this.camera.shake=Math.max(0,this.camera.shake-dt*22);
    this.audio.update(dt,this.world.id);
    if(this.toast) {this.toast.timer-=dt;if(this.toast.timer<=0)this.toast=null;}
    if(this.state!=='playing'||this.mapOpen||this.dialog) {
      if(this.dialog && (this.pressed.has('interact')||this.pressed.has('attack'))) this.closeDialog();
      this.pressed.clear();return;
    }
    this.stats.time+=dt;this.lastSave+=dt;
    const p=this.player;
    for(const key of ['hurtTimer','attackTimer','attackCooldown','dashTimer','dashCooldown','magicCooldown']) p[key]=Math.max(0,p[key]-dt);
    p.manaClock+=dt;
    if(p.manaClock>1.5) {p.mana=Math.min(p.maxMana,p.mana+1);p.manaClock=0;}
    let dx=(this.input.has('right')?1:0)-(this.input.has('left')?1:0);
    let dy=(this.input.has('down')?1:0)-(this.input.has('up')?1:0);
    const len=Math.hypot(dx,dy); if(len) {dx/=len;dy/=len; if(p.dashTimer<=0)p.facing=Math.atan2(dy,dx);}
    p.moving=!!len;
    if(this.pressed.has('dash') && p.dashCooldown<=0) {
      p.dashTimer=.2;p.dashCooldown=.68;p.hurtTimer=Math.max(p.hurtTimer,.24);
      p.dashX=len?dx:Math.cos(p.facing);p.dashY=len?dy:Math.sin(p.facing);
      this.audio.play('dash');
    }
    if(p.dashTimer>0) {
      moveBody(this.world,p,p.dashX*430*dt,p.dashY*430*dt,10);
      this.particles.push({x:p.x,y:p.y-7,vx:0,vy:0,life:.2,maxLife:.2,color:'#c8e7ce',size:7});
    } else {
      const speed=p.attackTimer>0?85:146;
      moveBody(this.world,p,dx*speed*dt,dy*speed*dt,10);
    }
    if((this.input.has('attack')||this.pressed.has('attack'))&&p.attackCooldown<=0) this.attack();
    if((this.input.has('magic')||this.pressed.has('magic'))&&p.magicCooldown<=0) this.castMagic();
    if(this.pressed.has('potion')) this.usePotion();
    this.findNearby();
    if(this.pressed.has('interact')) this.interact();
    if(this.dialog || this.state!=='playing') {this.pressed.clear();return;}
    for(const enemy of this.enemies) this.updateEnemy(enemy,dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    for(const part of this.particles) {part.x+=part.vx*dt;part.y+=part.vy*dt;part.life-=dt;part.vx*=.96;part.vy*=.96;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const effect of this.effects) effect.life-=dt;
    this.effects=this.effects.filter(e=>e.life>0);
    if(this.lastSave>15) this.save();
    this.pressed.clear();
  }

  attack() {
    const p=this.player;if(p.dashTimer>0)return;
    p.attackTimer=.28;p.attackCooldown=.34;p.combo=(p.combo+1)%3;
    this.audio.play('sword');
    this.effects.push({type:'slash',x:p.x,y:p.y,angle:p.facing,r:65,life:.22,maxLife:.22,color:'#ffecb2'});
    const inArc=target=>{const d=distance(p,target);return d<76 && (d<29 || (Math.cos(p.facing)*(target.x-p.x)+Math.sin(p.facing)*(target.y-p.y))/d>-.05);};
    for(const enemy of this.enemies) if(!enemy.dead && inArc(enemy)) this.hitEnemy(enemy,2,p.facing,15);
    for(const prop of this.world.props) if(prop.breakable&&!prop.broken&&inArc(prop)) {
      prop.broken=true;prop.solid=false;this.burst(prop.x,prop.y,'#90b777',9);
      this.pickups.push({x:prop.x,y:prop.y,type:'coin',bob:Math.random()*6});
    }
  }
  castMagic() {
    const p=this.player;
    if(!p.magic) {if(this.pressed.has('magic'))this.notify('Kindle a woodland shrine to awaken Ember magic.');return;}
    if(p.mana<1) {p.magicCooldown=.35;if(this.pressed.has('magic'))this.notify('Your Ember is recharging.');return;}
    p.mana--;p.magicCooldown=.38;p.manaClock=0;
    this.projectiles.push({x:p.x+Math.cos(p.facing)*22,y:p.y+Math.sin(p.facing)*22,vx:Math.cos(p.facing)*335,vy:Math.sin(p.facing)*335,owner:'player',life:1.6,radius:7,damage:3});
    this.audio.play('magic');
  }
  hitEnemy(enemy,damage,angle,knockback=0) {
    if(enemy.dead || enemy.type==='boss'&&!enemy.active)return;
    enemy.hp-=damage;enemy.hurtTimer=.18;
    moveBody(this.world,enemy,Math.cos(angle)*knockback,Math.sin(angle)*knockback,enemy.radius);
    this.burst(enemy.x,enemy.y,enemy.type==='wisp'?'#95e6e0':'#ffda87',7);
    this.audio.play('hit');
    if(enemy.hp<=0) {
      enemy.dead=true;enemy.telegraph=null;this.stats.kills++;
      if(!this.progress.defeated.includes(enemy.id))this.progress.defeated.push(enemy.id);
      this.burst(enemy.x,enemy.y,enemy.type==='boss'?'#ffd779':'#9ed7b4',22);
      const count=enemy.type==='boss'?16:enemy.type==='knight'?5:3;
      for(let i=0;i<count;i++)this.pickups.push({x:enemy.x+(Math.random()-.5)*28,y:enemy.y+(Math.random()-.5)*22,type:'coin',bob:Math.random()*6});
      if(this.stats.kills%3===0)this.pickups.push({x:enemy.x+12,y:enemy.y,type:'heart',bob:0});
      if(enemy.type==='boss') {
        this.progress.bossDefeated=true;this.bossActive=false;this.projectiles=this.projectiles.filter(p=>p.owner==='player');
        const altar=this.world.props.find(p=>p.type==='altar');if(altar)altar.active=true;
        this.player.hp=this.player.maxHp;this.camera.shake=9;
        this.notify('The Warden falls. Reclaim the Heart Ember at the altar.');this.audio.play('shrine');this.save();
      }
    }
  }
  hurtPlayer(damage,source) {
    const p=this.player;if(p.hurtTimer>0||this.state!=='playing')return;
    p.hp=Math.max(0,p.hp-damage);p.hurtTimer=1.0;this.camera.shake=5;
    const a=Math.atan2(p.y-source.y,p.x-source.x);moveBody(this.world,p,Math.cos(a)*20,Math.sin(a)*20,10);
    this.burst(p.x,p.y,'#f09274',10);this.audio.play('hurt');
    if(p.hp<=0) {this.state='dead';this.stats.deaths++;this.bossActive=false;this.releaseInput();this.audio.play('dead');}
  }
  usePotion() {
    if(this.state!=='playing'||this.dialog||this.mapOpen)return;
    if(this.player.potions<=0){this.notify('No tonics left. Rest at a spring or visit Rowan.');return;}
    if(this.player.hp===this.player.maxHp){this.notify('Your hearts are already full.');return;}
    this.player.potions--;this.player.hp=Math.min(this.player.maxHp,this.player.hp+4);
    this.burst(this.player.x,this.player.y,'#b6f0ba',18);this.audio.play('shrine');this.notify('Moonleaf tonic · four hearts restored');this.save();
  }
  respawn() {
    this.player.hp=this.player.maxHp;this.player.mana=this.player.maxMana;this.player.coins=Math.floor(this.player.coins*.8);
    this.state='playing';this.dialog=null;this.changeWorld(this.world.id,false);
    this.notify('The forest gives you another chance. 20% of your acorns were lost.');this.save();
  }

  updateEnemy(e,dt) {
    if(e.dead)return;
    e.hurtTimer=Math.max(0,e.hurtTimer-dt);
    const p=this.player,d=distance(e,p),angle=Math.atan2(p.y-e.y,p.x-e.x);
    if(e.type==='boss') {this.updateBoss(e,dt,d,angle);return;}
    if(d>450){e.state='idle';e.telegraph=null;return;}
    e.timer-=dt;
    if(e.state==='windup') {
      if(e.timer<=0) {
        if(e.type==='wisp') this.shoot(e,e.facing,135);
        else if(e.type==='slime') {e.state='attack';e.timer=.28;e.dashX=Math.cos(e.facing);e.dashY=Math.sin(e.facing);return;}
        else {if(d<71 && Math.cos(angle-e.facing)>-.15)this.hurtPlayer(1,e);this.effects.push({type:'slash',x:e.x,y:e.y,angle:e.facing,r:59,life:.2,maxLife:.2,color:'#f7a783'});}
        e.state='recover';e.timer=e.type==='wisp'?1.7:.9;e.telegraph=null;
      }
      return;
    }
    if(e.state==='attack') {
      moveBody(this.world,e,e.dashX*190*dt,e.dashY*190*dt,e.radius);
      if(d<e.radius+13)this.hurtPlayer(1,e);
      if(e.timer<=0){e.state='recover';e.timer=.9;e.telegraph=null;}
      return;
    }
    if(e.state==='recover'&&e.timer>0)return;
    const range=e.type==='wisp'?230:e.type==='slime'?95:62;
    if(d<range) {
      e.state='windup';e.timer=e.type==='slime'?.62:.7;e.facing=angle;
      if(e.type!=='wisp')e.telegraph={shape:'line',x:e.x,y:e.y,angle,length:e.type==='slime'?87:65};
    } else if(d<310) {
      e.state='chase';e.facing=angle;
      moveBody(this.world,e,Math.cos(angle)*e.speed*dt,Math.sin(angle)*e.speed*dt,e.radius);
    } else {e.state='idle';e.facing=angle;}
  }
  updateBoss(e,dt,d,angle) {
    if(!e.active) {
      if(this.player.y<13*TILE&&this.progress.bossGate){e.active=true;e.timer=1.4;e.state='recover';this.bossActive=true;this.notify('The Hollow Warden awakens. Watch the amber warnings.');}
      else return;
    }
    this.bossActive=true;e.timer-=dt;
    if(this.player.y>14*TILE) { // The doorway remains an escape route; the Warden returns to its vigil.
      e.active=false;e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;e.state='idle';e.telegraph=null;this.bossActive=false;
      this.projectiles=this.projectiles.filter(p=>p.owner==='player');return;
    }
    if(e.state==='windup') {
      if(e.timer<=0) {
        const phase=e.hp<e.maxHp*.5;
        if(e.attackKind==='slam') {
          this.effects.push({type:'ring',x:e.x,y:e.y,r:115,life:.55,maxLife:.55,color:'#f8bb62'});
          if(d<114)this.hurtPlayer(2,e);
          this.camera.shake=7;this.audio.play('hit');
          if(phase)for(let i=0;i<8;i++)this.shoot(e,i*Math.PI/4,100);
          e.state='recover';e.timer=phase?.65:1.1;
        } else if(e.attackKind==='volley') {
          const count=phase?7:5;
          for(let i=0;i<count;i++)this.shoot(e,e.facing+(i-(count-1)/2)*.25,phase?160:130);
          e.state='recover';e.timer=.95;
        } else {e.state='attack';e.timer=.6;e.dashX=Math.cos(e.facing);e.dashY=Math.sin(e.facing);}
        e.telegraph=null;
      }
      return;
    }
    if(e.state==='attack') {
      moveBody(this.world,e,e.dashX*280*dt,e.dashY*280*dt,e.radius);
      if(d<e.radius+17)this.hurtPlayer(2,e);
      if(e.timer<=0){e.state='recover';e.timer=1.2;this.camera.shake=4;}
      return;
    }
    if(e.timer>0) {
      if(d>100&&e.timer<.6)moveBody(this.world,e,Math.cos(angle)*e.speed*dt,Math.sin(angle)*e.speed*dt,e.radius);
      return;
    }
    e.attackCycle++;e.attackKind=d<108?'slam':e.attackCycle%3===0?'charge':'volley';
    e.state='windup';e.timer=e.hp<e.maxHp*.5?.7:1;e.facing=angle;
    e.telegraph=e.attackKind==='slam'?{shape:'circle',x:e.x,y:e.y,r:115}:{shape:'line',x:e.x,y:e.y,angle,length:e.attackKind==='charge'?210:280};
  }
  shoot(e,angle,speed) {this.projectiles.push({x:e.x+Math.cos(angle)*20,y:e.y+Math.sin(angle)*20,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:'enemy',life:3.2,radius:6,damage:e.type==='boss'?2:1});}
  updateProjectiles(dt) {
    for(const shot of this.projectiles) {
      shot.life-=dt;
      const steps=Math.max(1,Math.ceil(Math.hypot(shot.vx,shot.vy)*dt/5));
      for(let i=0;i<steps&&shot.life>0;i++) {
        shot.x+=shot.vx*dt/steps;shot.y+=shot.vy*dt/steps;
        if(isBlocked(this.world,shot.x,shot.y,3)){shot.life=0;this.burst(shot.x,shot.y,'#efba79',4);break;}
        if(shot.owner==='player') {
          for(const enemy of this.enemies) if(!enemy.dead&&distance(shot,enemy)<enemy.radius+shot.radius) {
            this.hitEnemy(enemy,shot.damage,Math.atan2(shot.vy,shot.vx),8);shot.life=0;break;
          }
        } else if(distance(shot,this.player)<shot.radius+10) {this.hurtPlayer(shot.damage,shot);shot.life=0;}
      }
      if(shot.life>0&&Math.random()<.5)this.particles.push({x:shot.x,y:shot.y,vx:0,vy:0,life:.2,maxLife:.2,color:shot.owner==='player'?'#ffd482':'#8bd8e2',size:3});
    }
    this.projectiles=this.projectiles.filter(p=>p.life>0);
  }
  updatePickups(dt) {
    this.pickups=this.pickups.filter(p=>{
      p.bob+=dt*3;
      const d=distance(p,this.player);
      if(d<85&&d>14){p.x+=(this.player.x-p.x)/d*160*dt;p.y+=(this.player.y-p.y)/d*160*dt;}
      if(d<19){if(p.type==='coin')this.player.coins++;else if(p.type==='heart')this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);else this.player.mana=Math.min(this.player.maxMana,this.player.mana+2);this.audio.play('coin');return false;}
      return true;
    });
  }
  burst(x,y,color,count=10) {
    for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=22+Math.random()*85,life=.25+Math.random()*.45;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,color,size:2+Math.floor(Math.random()*3)});}
  }
  findNearby() {
    const allowed=['keeper','sign','shrine','portal','chest','well','switch','gate','altar'];
    this.nearby=this.world.props.filter(p=>allowed.includes(p.type)&&!(p.type==='chest'&&p.opened)&&!(p.type==='gate'&&p.opened)&&distance(p,this.player)<(p.type==='gate'?100:p.type==='portal'?85:65)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]||null;
  }
  interact() {
    if(this.dialog){this.closeDialog();return;}
    if(this.state!=='playing'||this.mapOpen)return;
    this.findNearby();const p=this.nearby;if(!p)return;
    if(p.type==='keeper') {
      if(this.player.coins>=12 && this.player.potions<5) {this.player.coins-=12;this.player.potions++;this.audio.play('coin');this.showDialog('Rowan · Keeper of the Mosswood','A dozen acorns, a little moonleaf, and a pinch of hope. Here’s a fresh tonic. Press Q when your hearts run low.');}
      else this.showDialog('Rowan · Keeper of the Mosswood','The western shrine lies beyond the left fork. The eastern shrine is across the wooden bridge. Clear the creatures around each shrine, then press E to kindle it.\n\nSprings restore your hearts and refill an empty tonic flask. Bring me 12 acorns and I’ll brew an extra tonic, up to five. Open your map with M if you lose the trail.');
    } else if(p.type==='sign') this.showDialog('The old trail marker','← Western Shrine  ·  Eastern Shrine →\n↑ The Hollow Temple  ·  ↓ Keeper’s Camp\n\nA forgotten cache sleeps along the western path, near the camp.');
    else if(p.type==='well') {
      this.player.hp=this.player.maxHp;this.player.mana=this.player.maxMana;this.player.potions=Math.max(1,this.player.potions);
      this.burst(p.x,p.y,'#abe8e1',20);this.audio.play('shrine');this.notify('Restored · hearts, Ember, and one empty tonic flask');
    } else if(p.type==='shrine') {
      if(p.active){this.notify('This shrine burns brightly. '+this.quest);return;}
      const guards=this.enemies.filter(e=>!e.dead&&distance(e,p)<165);
      if(guards.length){this.notify('The shrine is troubled. Defeat the nearby creatures first.');return;}
      p.active=true;this.progress[p.id==='west-shrine'?'westShrine':'eastShrine']=true;
      this.burst(p.x,p.y,'#ffe6a7',42);this.audio.play('shrine');this.player.hp=this.player.maxHp;
      if(!this.player.magic){this.player.magic=true;this.showDialog('A spark remembers','Ember magic awakened. Press K to send a bolt of living flame in the direction you face. Your Ember refills over time.\n\nOne shrine still sleeps. Find it, and the path to the temple will open.');}
      else this.notify('Both shrines are kindled. The Hollow Temple opens to the north.');
      if(this.progress.westShrine&&this.progress.eastShrine){this.progress.templeOpened=true;this.world.props.find(p=>p.id==='temple-entrance').active=true;}
    } else if(p.type==='portal') {
      if(this.world.id==='forest') {if(!this.progress.templeOpened){this.notify('Two empty sockets. Kindle both woodland shrines to open the temple.');return;}this.changeWorld('temple');}
      else this.changeWorld('forest');
      return;
    } else if(p.type==='chest') {
      if(p.opened)return;
      if(p.id==='temple-key'&&this.enemies.some(e=>!e.dead&&distance(e,p)<155)){this.notify('Defeat the guardians of this chest first.');return;}
      p.opened=true;this.audio.play('coin');this.burst(p.x,p.y,'#ffe1a0',24);
      if(p.id==='temple-key'){this.progress.templeKey=true;this.notify('Guardian key found. Awaken both floor seals to open the northern door.');}
      else {this.progress.chests.push(p.id);if(p.id==='west-chest'){this.player.maxHp+=2;this.player.hp=this.player.maxHp;this.showDialog('Moonstone vessel','Two new hearts. A little of the forest’s old strength flows into you. Your maximum health has increased.');}else{this.player.coins+=20;this.player.potions=Math.min(5,this.player.potions+2);this.notify('A wanderer’s cache · 20 acorns and two moonleaf tonics');}}
    } else if(p.type==='switch') {
      p.active=true;this.progress[p.id==='west-switch'?'westSwitch':'eastSwitch']=true;this.audio.play('shrine');this.burst(p.x,p.y,'#e7ce89',18);
      this.notify(this.progress.westSwitch&&this.progress.eastSwitch?'Both seals are awake. Take the key to the northern door.':'A seal awakens. Find its partner in the opposite chamber.');
    } else if(p.type==='gate') {
      if(!this.progress.templeKey){this.notify('The guardian door needs a key. Search the western chamber.');return;}
      if(!this.progress.westSwitch||!this.progress.eastSwitch){this.notify('Two floor seals hold the door shut. Awaken both with E.');return;}
      p.opened=true;p.solid=false;this.progress.bossGate=true;this.audio.play('door');this.notify('The guardian door opens. The Warden is waiting.');
    } else if(p.type==='altar') {
      if(!this.progress.bossDefeated){this.notify('The Hollow Warden still binds the Heart Ember.');return;}
      this.progress.won=true;this.state='won';this.releaseInput();this.audio.play('win');this.burst(p.x,p.y,'#ffdf91',60);
    }
    this.save();
  }
}
