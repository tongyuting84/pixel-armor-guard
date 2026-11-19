(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = s => document.querySelector(s);
  const ui = { health:$('#health'), core:$('#core-health'), enemies:$('#enemies'), timer:$('#timer'), start:$('#start-screen'), end:$('#end-screen'), pause:$('#pause-label') };
  const keys = Object.create(null);
  let W=0,H=0,dpr=1,last=0, running=false, paused=false, elapsed=0, score=0, shake=0, spawnClock=0, particles=[], bullets=[], enemies=[], pickups=[];
  let walls=[];
  const player={x:0,y:0,r:20,a:-Math.PI/2,speed:190,hp:100,cool:0,flash:0};
  const core={x:0,y:0,r:32,hp:100,pulse:0};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  function resize(){ dpr=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight; canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); if(!running){ player.x=W/2;player.y=H*.7;core.x=W/2;core.y=H*.84; } }
  addEventListener('resize',resize); resize();

  function reset(){
    running=true;paused=false;elapsed=0;score=0;shake=0;spawnClock=.8;particles=[];bullets=[];enemies=[];pickups=[];
    player.x=W/2;player.y=H*.68;player.a=-Math.PI/2;player.hp=100;player.cool=0;player.flash=0;
    core.x=W/2;core.y=H*.86;core.hp=100; core.pulse=0;
    walls=[
      {x:W*.22,y:H*.34,w:Math.min(180,W*.2),h:18},{x:W*.62,y:H*.34,w:Math.min(180,W*.2),h:18},
      {x:W*.12,y:H*.58,w:18,h:Math.min(150,H*.18)},{x:W*.86,y:H*.58,w:18,h:Math.min(150,H*.18)},
      {x:W*.36,y:H*.53,w:Math.min(110,W*.13),h:18},{x:W*.55,y:H*.53,w:Math.min(110,W*.13),h:18},
      {x:W*.34,y:H*.79,w:Math.min(90,W*.11),h:15},{x:W*.58,y:H*.79,w:Math.min(90,W*.11),h:15}
    ];
    ui.start.classList.remove('visible');ui.end.classList.remove('visible');ui.pause.classList.remove('visible');updateHUD();
  }
  function rectHitCircle(o,w){ const x=clamp(o.x,w.x,w.x+w.w),y=clamp(o.y,w.y,w.y+w.h);return Math.hypot(o.x-x,o.y-y)<o.r; }
  function blocked(o){ return walls.some(w=>rectHitCircle(o,w)); }
  function move(obj,dx,dy){ const ox=obj.x,oy=obj.y;obj.x=clamp(obj.x+dx,obj.r+8,W-obj.r-8);if(blocked(obj))obj.x=ox;obj.y=clamp(obj.y+dy,obj.r+70,H-obj.r-8);if(blocked(obj))obj.y=oy; }
  function burst(x,y,color,n=12){ for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2),s=rand(40,180);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.75),max:1,color,size:rand(1.5,4)}); } }
  function shoot(){ if(!running||paused||player.cool>0)return;player.cool=.28; const c=Math.cos(player.a),s=Math.sin(player.a);bullets.push({x:player.x+c*25,y:player.y+s*25,vx:c*390,vy:s*390,r:4,team:'player',life:1.8});burst(player.x+c*24,player.y+s*24,'#8df7ff',4); }
  function enemyShoot(e){ const a=Math.atan2(core.y-e.y,core.x-e.x)+rand(-.16,.16);bullets.push({x:e.x+Math.cos(a)*20,y:e.y+Math.sin(a)*20,vx:Math.cos(a)*235,vy:Math.sin(a)*235,r:4,team:'enemy',life:3}); }
  function spawnEnemy(){ const side=Math.floor(rand(0,3)); let x,y;if(side===0){x=rand(34,W-34);y=86;}else if(side===1){x=30;y=rand(110,H*.5);}else{x=W-30;y=rand(110,H*.5);} const heavy=Math.random()<.25;enemies.push({x,y,r:heavy?22:18,hp:heavy?3:1,speed:heavy?45:rand(55,78),a:0,cool:rand(.7,1.8),heavy,flash:0}); }
  function damagePlayer(n){ player.hp=Math.max(0,player.hp-n);player.flash=.2;shake=8;burst(player.x,player.y,'#ff7b55',10);if(player.hp<=0)finish(false,'先锋装甲车已失去战斗能力'); }
  function damageCore(n){ core.hp=Math.max(0,core.hp-n);shake=10;burst(core.x,core.y,'#ff4f6d',14);if(core.hp<=0)finish(false,'能源核心失守'); }
  function finish(win,msg){ if(!running)return;running=false;ui.end.classList.add('visible');$('#end-kicker').textContent=win?'MISSION COMPLETE':'MISSION FAILED';$('#end-title').textContent=win?'防线稳固':'任务失败';$('#end-message').textContent=msg;$('#final-score').textContent=score;$('#final-time').textContent=formatTime(elapsed); }
  const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  function updateHUD(){ui.health.textContent=Math.ceil(player.hp);ui.core.textContent=Math.ceil(core.hp);ui.enemies.textContent=Math.max(0,12-score/100|0);ui.timer.textContent=formatTime(Math.max(0,180-elapsed));}

  function update(dt){
    if(!running||paused)return;elapsed+=dt;player.cool-=dt;player.flash-=dt;core.pulse+=dt;
    let dx=0,dy=0;if(keys.ArrowLeft||keys.KeyA)dx--;if(keys.ArrowRight||keys.KeyD)dx++;if(keys.ArrowUp||keys.KeyW)dy--;if(keys.ArrowDown||keys.KeyS)dy++;
    if(dx||dy){ const l=Math.hypot(dx,dy);dx/=l;dy/=l;player.a=Math.atan2(dy,dx);move(player,dx*player.speed*dt,dy*player.speed*dt); }
    if(keys.Space)shoot();
    spawnClock-=dt;if(spawnClock<=0&&enemies.length+(score/100)<12){spawnEnemy();spawnClock=rand(1.5,2.4);}
    bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(walls.some(w=>rectHitCircle(b,w))){b.life=0;burst(b.x,b.y,b.team==='player'?'#74edff':'#ff8d61',5);}});
    enemies.forEach(e=>{
      e.cool-=dt;e.flash-=dt;const target=dist(e,player)<220?player:core;e.a=Math.atan2(target.y-e.y,target.x-e.x);const ox=e.x,oy=e.y;move(e,Math.cos(e.a)*e.speed*dt,Math.sin(e.a)*e.speed*dt);if(blocked(e)){e.x=ox;e.y=oy;e.a+=rand(-1,1);}
      if(e.cool<=0&&dist(e,target)<430){enemyShoot(e);e.cool=e.heavy?1.25:rand(1.5,2.4);}
      if(dist(e,core)<e.r+core.r){damageCore(e.heavy?18:12);e.hp=0;}else if(dist(e,player)<e.r+player.r){damagePlayer(e.heavy?22:14);e.hp=0;}
    });
    bullets.forEach(b=>{ if(b.life<=0)return;if(b.team==='player'){enemies.forEach(e=>{if(e.hp>0&&dist(b,e)<b.r+e.r){e.hp--;e.flash=.12;b.life=0;burst(e.x,e.y,'#ff9c61',e.hp<=0?18:7);if(e.hp<=0){score+=100;if(Math.random()<.18)pickups.push({x:e.x,y:e.y,r:10,life:8});}}});}else{if(dist(b,player)<b.r+player.r){b.life=0;damagePlayer(12);}else if(dist(b,core)<b.r+core.r){b.life=0;damageCore(9);}} });
    pickups.forEach(p=>{p.life-=dt;if(dist(p,player)<p.r+player.r){p.life=0;player.hp=Math.min(100,player.hp+25);burst(p.x,p.y,'#6dff9d',14);}});
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;});
    bullets=bullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>40&&b.y<H+20);enemies=enemies.filter(e=>e.hp>0);pickups=pickups.filter(p=>p.life>0);particles=particles.filter(p=>p.life>0);
    shake*=.88;updateHUD();if(score>=1200)finish(true,'全部无人战车已被清除');else if(elapsed>=180)finish(false,'增援抵达前未能清除威胁');
  }

  function roundRect(x,y,w,h,r){r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function polygon(sides,r,rotation=0){ctx.beginPath();for(let i=0;i<sides;i++){const a=rotation+i*Math.PI*2/sides,x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();}
  function grid(){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#07101d');bg.addColorStop(.52,'#081827');bg.addColorStop(1,'#040a13');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(core.x,core.y,10,core.x,core.y,Math.max(W,H)*.55);glow.addColorStop(0,'rgba(16,157,190,.17)');glow.addColorStop(.5,'rgba(7,62,91,.07)');glow.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(89,174,196,.07)';ctx.lineWidth=1;const s=64;for(let y=72;y<H;y+=s){for(let x=(Math.floor(y/s)%2)*s/2;x<W+s;x+=s){ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i,xp=x+Math.cos(a)*34,yp=y+Math.sin(a)*34;i?ctx.lineTo(xp,yp):ctx.moveTo(xp,yp);}ctx.stroke();}}
    ctx.strokeStyle='rgba(72,221,239,.12)';ctx.setLineDash([18,22]);ctx.lineDashOffset=-elapsed*10;ctx.beginPath();ctx.moveTo(W*.5,75);ctx.lineTo(W*.5,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(66,210,231,.18)';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(W*.5,110+i*150,2.4,0,Math.PI*2);ctx.fill();}
  }
  function drawWall(w){
    const vertical=w.h>w.w,g=ctx.createLinearGradient(w.x,w.y,vertical?w.x+w.w:w.x,vertical?w.y:w.y+w.h);g.addColorStop(0,'#213849');g.addColorStop(.5,'#102330');g.addColorStop(1,'#091722');
    ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;roundRect(w.x,w.y,w.w,w.h,Math.min(8,w.w/3,w.h/3));ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(102,198,216,.38)';ctx.lineWidth=1.2;ctx.stroke();
    ctx.strokeStyle='rgba(125,229,239,.22)';ctx.lineWidth=2;if(vertical){ctx.beginPath();ctx.moveTo(w.x+w.w*.5,w.y+7);ctx.lineTo(w.x+w.w*.5,w.y+w.h-7);ctx.stroke();}else{ctx.beginPath();ctx.moveTo(w.x+7,w.y+w.h*.5);ctx.lineTo(w.x+w.w-7,w.y+w.h*.5);ctx.stroke();}ctx.restore();
  }
  function drawTank(t,playerTank=false){
    const heavy=!playerTank&&t.heavy,accent=playerTank?'#57e6f3':heavy?'#ff5f61':'#ff9b54',body=playerTank?'#197b91':heavy?'#8b333c':'#8b4f39';
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.a);if(t.flash>0)ctx.globalAlpha=.48;ctx.shadowColor=accent;ctx.shadowBlur=playerTank?14:8;
    ctx.fillStyle='#050c13';roundRect(-20,-17,34,34,9);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#152735';roundRect(-19,-19,30,7,3.5);ctx.fill();roundRect(-19,12,30,7,3.5);ctx.fill();
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-13,-13);ctx.lineTo(11,-13);ctx.quadraticCurveTo(20,-10,21,0);ctx.quadraticCurveTo(20,10,11,13);ctx.lineTo(-13,13);ctx.quadraticCurveTo(-18,7,-18,0);ctx.quadraticCurveTo(-18,-7,-13,-13);ctx.closePath();ctx.fill();
    const sheen=ctx.createLinearGradient(-14,-12,18,12);sheen.addColorStop(0,'rgba(255,255,255,.19)');sheen.addColorStop(.42,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(0,0,0,.22)');ctx.fillStyle=sheen;ctx.fill();
    ctx.strokeStyle=accent;ctx.globalAlpha=playerTank?.75:.5;ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle='#07131c';ctx.beginPath();ctx.arc(2,0,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=accent;roundRect(4,-3,27+(heavy?5:0),6,3);ctx.fill();ctx.shadowColor=accent;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(2,0,4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=playerTank?'#d8ffff':'#ffe0c4';ctx.beginPath();ctx.arc(-9,0,2.3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawCore(){
    const p=.5+.5*Math.sin(core.pulse*3.5);ctx.save();ctx.translate(core.x,core.y);ctx.shadowColor='#4be7f4';ctx.shadowBlur=20+p*10;
    ctx.strokeStyle=`rgba(80,232,244,${.3+p*.3})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,42+p*3,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    ctx.save();ctx.rotate(core.pulse*.28);ctx.strokeStyle='#287e96';ctx.lineWidth=7;ctx.setLineDash([24,11]);ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.stroke();ctx.restore();
    const g=ctx.createRadialGradient(-5,-7,1,0,0,24);g.addColorStop(0,'#e3feff');g.addColorStop(.2,'#68e9f4');g.addColorStop(.62,'#14677d');g.addColorStop(1,'#092433');ctx.fillStyle=g;polygon(6,23,Math.PI/6);ctx.fill();ctx.strokeStyle='#7cf1fa';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e8ffff';ctx.beginPath();ctx.arc(0,0,5+p*2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawPickup(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(elapsed*1.8);ctx.shadowColor='#69ffa2';ctx.shadowBlur=14;ctx.fillStyle='rgba(35,118,76,.82)';polygon(6,13,Math.PI/6);ctx.fill();ctx.strokeStyle='#73ffac';ctx.lineWidth=1.5;ctx.stroke();ctx.rotate(-elapsed*1.8);ctx.fillStyle='#d8ffe5';roundRect(-2,-7,4,14,2);ctx.fill();roundRect(-7,-2,14,4,2);ctx.fill();ctx.restore();}
  function drawBullet(b){const color=b.team==='player'?'#b9fbff':'#ff9a62',a=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(a);ctx.shadowColor=color;ctx.shadowBlur=16;const g=ctx.createLinearGradient(-13,0,7,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.58,color);g.addColorStop(1,'#fff');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,10,3.2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function draw(){ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));grid();walls.forEach(drawWall);drawCore();pickups.forEach(drawPickup);enemies.forEach(e=>drawTank(e));drawTank(player,true);bullets.forEach(drawBullet);particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.size*.72,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;});ctx.restore();}
  function loop(ts){const dt=Math.min((ts-last)/1000,.034)||0;last=ts;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyP'&&running){paused=!paused;ui.pause.classList.toggle('visible',paused);}});
  addEventListener('keyup',e=>keys[e.code]=false);
  document.querySelectorAll('[data-key]').forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();keys[k]=true;btn.classList.add('active');};const off=e=>{e.preventDefault();keys[k]=false;btn.classList.remove('active');};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off);});
  const fire=$('#fire-btn');fire.addEventListener('pointerdown',e=>{e.preventDefault();keys.Space=true;fire.classList.add('active');shoot();});['pointerup','pointercancel','pointerleave'].forEach(ev=>fire.addEventListener(ev,e=>{e.preventDefault();keys.Space=false;fire.classList.remove('active');}));
  $('#start-btn').addEventListener('click',reset);$('#restart-btn').addEventListener('click',reset);
})();
