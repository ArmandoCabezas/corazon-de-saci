'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d'),audio=$('audio');
const keys=new Set(),visited=new Set(),overrides=new Map();let started=false,current=-1,near=-1,dwell=0,last=0,walking=false;
const W=2050,H=941,player={x:90,y:914,face:'right',vy:0,grounded:true};let sw=0,sh=0,scale=1,viewX=0,viewY=0;
const SONG_COUNT=TRACKS.length,SURPRISE_INDEX=SONG_COUNT;
const positions=[108,183,252,320,388,452,516,576,748,807,868,931,996,1059,1125,1195,1260,1325,1625,1707,1786];
const platforms=[{x:55,y:827,w:140},{x:222,y:813,w:130},{x:360,y:827,w:150},{x:513,y:813,w:114},{x:711,y:827,w:125},{x:842,y:813,w:123},{x:972,y:827,w:126},{x:1105,y:813,w:130},{x:1235,y:827,w:130},{x:1440,y:835,w:90},{x:1590,y:850,w:80},{x:1670,y:810,w:75},{x:1745,y:770,w:90},{x:1900,y:770,w:110}];
const paintings=TRACKS.map((t,i)=>({i,x:positions[i],y:i<8?735:i<SONG_COUNT-3?747:[760,720,680][i-(SONG_COUNT-3)],tx:positions[i],ty:platforms.find(p=>positions[i]>=p.x&&positions[i]<=p.x+p.w).y}));
paintings.push({i:SURPRISE_INDEX,x:1955,y:680,tx:1955,ty:770});
let surprisePool=[],lastSurpriseKey='',surpriseVisits=0;
let jumpQueued=false;const touchPointers=new Map();let audioPrimed=false;
const background=new Image();let artLoaded=false;background.onload=()=>{artLoaded=true;};background.onerror=()=>{$('status').textContent='Le falta cargar el escenario. Recargá la página.'};background.src='saci-elevation-v10.png';
const artAtlas=new Image();let atlasLoaded=false;artAtlas.onload=()=>{atlasLoaded=true};artAtlas.src='saci-gallery-v5.png';
const prefersReducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const atlasPositions=[108,183,252,320,388,452,516,576,748,807,868,931,996,1059,1125,1195];
function resize(){const r=canvas.getBoundingClientRect();sw=r.width;sh=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(sw*d);canvas.height=Math.round(sh*d);ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false;const compact=sw<900||sh<480;scale=compact?Math.max(.58,Math.min(.90,sh/520)):Math.max(1.15,Math.min(1.65,sw/850));}addEventListener('resize',resize);resize();
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
const spriteColors={o:'#ed7829',h:'#ffb84c',r:'#a94329',k:'#233242',b:'#694330',s:'#e8ae77',l:'#ffd19a',t:'#f6dfad',v:'#b89d78',u:'#a7b4a3',d:'#efe1bc',e:'#dcd5b4'};
const spriteFront=[
'.........kkkkkk.........',
'.......kkhhhhhhkk.......',
'......khoooooooohk......',
'.....khooooooooohhk.....',
'.....kooooooooohhhk.....',
'....kkrrrrrrrrrrrrk.....',
'..kroooooooooooorrk.....',
'..kkkkkrrrrrrrrrkk......',
'......kbsssssssslk......',
'......kbssksslsklk......',
'......kbssksslsklk......',
'.......ksssssssslk......',
'.......ksssslsslk.......',
'........kksssskk........',
'......kkutttttvukk......',
'.....kskuttttvukssk.....',
'.....kskuttttvukslk.....',
'.....kskuttttvukslk.....',
'.....kskuttttvukslk.....',
'......kkuttttvukk.......',
'.......kuttvvuk.........',
'.......kddddddk.........',
'.......kddkkddk.........',
'.......kddkkddk.........',
'.......kddkkddk.........',
'......keeekkeeek........',
'......kkkkkkkkkk........'];
function listeningPose(){
 const p=paintings[current];
 const listening=!!(p&&started&&player.grounded&&!walking&&!audio.paused&&!audio.ended&&Math.abs(player.x-p.tx)<27&&Math.abs(player.y-p.ty)<5);
 if(!listening)return {listening:false,nod:0,tilt:0,lift:0};
 const track=current<SURPRISE_INDEX?TRACKS[current]:surpriseItem;
 const period=60/(track?.bpm||104),time=audio.currentTime||0;
 const phase=(time-(track?.beatOffset||0))/period*Math.PI*2;
 const onsetChar=track?.energy?.[Math.floor(time/.025)];const onset=onsetChar?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(onsetChar)/63:0;
 return {listening:true,nod:prefersReducedMotion?0:Math.round((Math.cos(phase)*1.6+onset*1.4)),tilt:prefersReducedMotion?0:Math.sin(phase)*.045,lift:prefersReducedMotion?0:Math.max(0,1-time/.65)};
}
function isoBoy(time){
 const p={x:player.x,y:player.y},anim=walking?Math.floor(time/150)%2:0,size=3,pose=listeningPose();
 ellipse(p.x,p.y+4,24,8,'#102d2b66');
 const left=player.face==='left';
 function row(y){for(let x=0;x<spriteFront[y].length;x++){
  let c=spriteFront[y][x];if(y>=23&&y<=24&&c==='d')c='s';if(y===22&&c==='d')c='v';
  if(pose.lift>0&&y>=15&&y<=18&&(c==='s'||c==='l'))continue;
  if(!spriteColors[c])continue;const xx=left?spriteFront[y].length-1-x:x;
  const leg=y>=22?(x<12?anim:-anim):0;
  rect(Math.round((xx-12)*size),Math.round((y-26)*size+leg*size),size,size,spriteColors[c]);
 }}
 ctx.save();ctx.translate(p.x,p.y);for(let y=14;y<spriteFront.length;y++)row(y);
 ctx.save();ctx.translate(0,-42+pose.nod);ctx.rotate(pose.tilt);ctx.translate(0,42);for(let y=0;y<14;y++)row(y);
 // The visor extends behind the head, opposite the walking direction.
 rect(left?18:-30,-63,12,6,'#a94329');rect(left?21:-27,-63,9,3,'#f99838');
 if(pose.listening){
  // Black over-ear headphones: crown band over the backward orange cap.
  rect(-18,-84,36,6,'#080d10');rect(-24,-78,6,21,'#080d10');rect(18,-78,6,21,'#080d10');
  rect(-27,-60,12,21,'#080d10');rect(15,-60,12,21,'#080d10');
  rect(-24,-57,6,15,'#23292b');rect(18,-57,6,15,'#23292b');rect(-15,-84,27,3,'#3e4443');
 }
 ctx.restore();
 if(pose.lift>0){const yy=-39-Math.round((1-pose.lift)*12);rect(-24,yy,9,18,'#e8ae77');rect(18,yy,9,18,'#ffd19a');rect(-27,yy+9,6,12,'#233242');rect(24,yy+9,6,12,'#233242');}
 ctx.restore();
}
const atlasTitles=["EN MIS SUEÑOS", "SIRENA", "YO NO SE", "SAMBITA (Interludio)", "AHORA TU", "LOVE", "PRECIOSA MUJER", "UNA VEZ", "X VOS (ArM Version)", "COMO LE VOY A HACER?", "QUE SERÁ?", "UNA Y OTRA VEZ (Acoustic Version)", "YA SE ME OLVIDÓ", "AY AMOR", "NA NA NA (2025 Remastered Version)", "PARAISO (2025 Remastered Version)"];
function drawPainting(p){if(p.i===SURPRISE_INDEX){drawMystery(p);return;}const x=p.x-24,y=p.y-34;rect(x-2,y+3,59,79,'#19392e70');rect(x-6,y-6,60,81,'#172b31');rect(x-4,y-4,56,77,'#e0bc70');rect(x-2,y-2,52,73,'#695c3f');rect(x-4,y-4,56,2,'#fae4a2');rect(x-4,y-2,2,73,'#cab578');rect(x+52,y-2,2,73,'#403e2b');rect(x+17,y-18,15,4,'#27352d');rect(x+18,y-17,13,3,'#ffd77c');const glow=ctx.createRadialGradient(p.x,y-12,1,p.x,y+7,43);glow.addColorStop(0,'#ffe6a42b');glow.addColorStop(1,'#ffe6a400');ctx.fillStyle=glow;ctx.fillRect(x-17,y-22,82,110);const colors=[['#396c6c','#eed077','#abc391'],['#394555','#b1bea1','#ec9650'],['#354f4c','#b4c493','#ecd1a2']][p.i%3];rect(x,y,48,69,colors[0]);for(let row=0;row<23;row++)for(let col=0;col<16;col++){const n=(row*13+col*19+p.i*31)%27;if(n<4)rect(x+col*3,y+row*3,3,3,colors[n%3]);}const artIndex=atlasTitles.indexOf(TRACKS[p.i].title);if(artIndex>=0&&atlasLoaded){ctx.drawImage(artAtlas,atlasPositions[artIndex]-22,(artIndex<8?735:747)-32,44,65,x+2,y+2,44,65);return;}if(TRACKS[p.i].title==='NADA'){rect(x+3,y+3,42,63,'#183643');for(let j=0;j<12;j++)rect(x+5+(j*17)%37,y+6+(j*11)%52,2,2,'#c5ddd0');rect(x+8,y+53,32,3,'#7caca2');rect(x+21,y+14,7,36,'#cbbd8a');rect(x+23,y+17,3,30,'#183643');}if(TRACKS[p.i].title==='TROPIKAL'){rect(x+3,y+3,42,63,'#d97b4c');rect(x+3,y+37,42,29,'#237f76');rect(x+26,y+10,12,12,'#ffdb70');rect(x+13,y+24,4,37,'#263e36');for(let j=0;j<5;j++){rect(x+3+j*6,y+20+Math.abs(j-2)*3,12,4,'#4d7f48');rect(x+7+j*5,y+26+Math.abs(j-2)*3,10,3,'#274e3e');}for(let j=0;j<4;j++)rect(x+24,y+43+j*5,18,2,'#e4c98a');}if(TRACKS[p.i].title==='NADA'||TRACKS[p.i].title==='TROPIKAL'){ctx.save();ctx.globalAlpha=.25;for(let j=0;j<150;j++){const xx=x+3+(j*19)%42,yy=y+3+(j*29)%63;rect(xx,yy,2+(j%2),2,j%3===0?'#f6d98b':j%3===1?'#182f3b':'#769d74');}ctx.restore();}if(p.i===SONG_COUNT-3){rect(x+12,y+9,24,3,colors[1]);rect(x+9,y+12,30,18,colors[1]);rect(x+12,y+30,24,3,colors[1]);for(let j=0;j<4;j++)rect(x,y+42+j*6,48,3,j%2?'#94b487':'#538b80');}if(p.i===SONG_COUNT-2){rect(x+18,y+16,12,12,colors[2]);rect(x+15,y+28,18,19,colors[1]);rect(x+15,y+47,6,16,'#e0ba80');rect(x+27,y+47,6,16,'#e0ba80');}if(p.i===SONG_COUNT-1){rect(x+9,y+12,30,54,colors[2]);rect(x+15,y+18,18,48,'#65857a');rect(x+18,y+22,12,44,colors[1]);}}
function showChapter(i){$('mobileSurprise').classList.add('hidden');$('surpriseAgain').classList.add('hidden');const c=STORY.chapters[i];$('storyAct').textContent=c.act+' · '+c.stage+' / '+TRACKS.length;$('storyTitle').textContent=c.name;$('storyText').textContent=c.text;$('storySpace').textContent='Corazón de Sací · '+c.space;$('storyCard').classList.remove('hidden');$('storyReveal').classList.add('hidden');}
function drawVine(x,y,length,seed){for(let j=0;j<length;j+=6){const xx=x+Math.round(Math.sin((j+seed)/13)*3);rect(xx,y+j,2,7,'#365d49');rect(xx-4,y+j,4,3,'#799564');rect(xx+2,y+j+4,4,3,'#486f53');}}
function drawParallax(t){ctx.save();ctx.translate(-viewX*.28,-viewY);if(artLoaded)ctx.drawImage(background,0,0,W+450,H);else{rect(0,0,W+450,H,'#405c50');for(let x=0;x<W+450;x+=100){rect(x,200,90,210,'#78927a');rect(x+15,230,60,130,'#243d3b');}}ctx.restore();ctx.save();ctx.translate(-viewX*.62,-viewY);for(let x=18;x<W+350;x+=27)drawVine(x,430,42+(x*11)%83,x);for(let x=90;x<W+350;x+=165){rect(x,391,95,8,'#5b765a');for(let j=0;j<8;j++)rect(x+j*11,378+(j%3)*4,12,15,['#3c604b','#658651','#8a9d63'][j%3]);}ctx.restore();ctx.save();ctx.translate(-viewX*.18,-viewY);ctx.globalAlpha=.05;for(let x=710;x<1000;x+=35)rect(x,140,24,760,'#f8f0ba');ctx.restore();}
function drawGalleryWall(){rect(0,668,W,246,'#83947e');rect(0,665,W,7,'#b6bba0');for(let row=0;row<8;row++)for(let x=-60;x<W;x+=83){const yy=675+row*30,xx=x+(row%2)*40;const colors=['#8e9c84','#96a389','#85977e','#a3ac91'];rect(xx+2,yy+1,80,28,colors[((x+60)/83+row)%4|0]);rect(xx+2,yy+26,80,2,'#6c806e');for(let j=0;j<6;j++){const fx=xx+7+(j*17+row*13)%65,fy=yy+5+(j*7)%20;rect(fx,fy,3+(j%3)*2,2,j%2?'#b6b79c':'#7b8f76')}}if(artLoaded){ctx.save();ctx.globalAlpha=1;ctx.drawImage(background,0,670,background.naturalWidth,270,0,668,W,246);rect(0,668,W,246,'#a5ac7828');ctx.drawImage(background,0,390,background.naturalWidth,95,0,650,W,95);ctx.restore();}if(!artLoaded)for(let x=30;x<W;x+=330){rect(x,666,10,247,'#748970');rect(x+10,666,4,247,'#bec2a0')}for(let x=8;x<W;x+=13){const len=18+(x*17)%58;drawVine(x,663,len,x);rect(x-4,662-(x%3)*3,12,7,['#365d38','#668549','#9db861'][Math.floor(x/13)%3]);if(x%5===0){rect(x,673,4,4,'#ef8a35');rect(x+1,674,2,2,'#ffd273');}}rect(1545,625,295,40,'#8a9f7d');rect(1545,625,295,5,'#bcc5a2');for(let x=1550;x<1840;x+=28)drawVine(x,630,21+(x%18),x);}
function drawForeground(t){ctx.save();ctx.scale(scale,scale);ctx.translate(-viewX*1.13,-viewY);for(let x=0;x<W+350;x+=220){for(let j=0;j<8;j++){const xx=x+j*9,yy=939-(j%3)*8;rect(xx,yy,9,18,['#173f36','#3c674a','#628251'][j%3]);rect(xx+4,yy-5,4,5,'#76955a')}}ctx.restore();}
function draw(t){ctx.clearRect(0,0,sw,sh);rect(0,0,sw,sh,'#10252b');const visibleW=sw/scale;viewX=Math.max(0,Math.min(Math.max(0,W-visibleW),player.x-visibleW*.4));const touchLayout=sw<900||(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches);viewY=Math.max(0,H-(sh-(touchLayout?76:0))/scale);ctx.save();ctx.scale(scale,scale);drawParallax(t);ctx.save();const light=ctx.createLinearGradient(0,0,sw/scale,sh/scale);light.addColorStop(0,'#092c3025');light.addColorStop(.65,'#f8e69a0b');light.addColorStop(1,'#0a252825');ctx.fillStyle=light;ctx.fillRect(0,0,sw/scale,sh/scale);ctx.restore();ctx.translate(-viewX,-viewY);drawGalleryWall();for(const p of platforms){rect(p.x,p.y,p.w,6,'#c6c5a0');rect(p.x,p.y+6,p.w,13,'#64745f');rect(p.x,p.y+19,p.w,3,'#243b3e');for(let j=10;j<p.w;j+=24)rect(p.x+j,p.y+7,2,11,'#3d5350');}ctx.textAlign='center';ctx.font='11px Arial, sans-serif';ctx.fillStyle='#edddb4';ctx.fillText('IV · UN NUEVO INICIO',1700,605);ctx.font='8px Arial, sans-serif';ctx.fillText('OJOS COLOR SOL → X MI → VOLVÉ',1700,621);rect(0,914,W,5,'#a5ae8b');rect(0,919,W,22,'#4c6657');for(const p of paintings){const active=p.i===near;const discovered=visited.has(p.i);drawPainting(p);if(active){ctx.strokeStyle='#ffda84';ctx.lineWidth=3;ctx.strokeRect(p.x-26,p.y-38,52,75);ellipse(p.tx,p.ty+4,25,7,'#ffed9740');}const caption=(p.i===SURPRISE_INDEX?'SORPRESA':TRACKS[p.i].title).replace(/ \(.+\)/,'');const words=caption.split(' '),lines=[];let line='';for(const word of words){if(line&&(line+' '+word).length>11){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);const height=12+lines.length*9;rect(p.x-30,p.y+38,60,height,active?'#ede7c9':'#19392fec');ctx.textAlign='center';ctx.fillStyle=active?'#284236':'#c6d2b3';ctx.font='7px Arial, sans-serif';ctx.fillText(p.i===SURPRISE_INDEX?'?':String(p.i+1).padStart(2,'0'),p.x,p.y+46);ctx.font='8px Arial, sans-serif';lines.forEach((text,j)=>ctx.fillText(text,p.x,p.y+56+j*9,57));}for(let i=0;i<18;i++){const x=470+(i*57)%530,y=220+(i*61+(prefersReducedMotion?0:t/55))%490;rect(x,y,2,2,'#e8ffcf80')}isoBoy(t);ctx.restore();drawForeground(t)}
function collision(x,y){return x<35||x>W-35||y>914;}
function movePlayer(dx,dy){player.x=Math.max(35,Math.min(W-35,player.x+dx));player.y=Math.min(914,player.y+dy);}
function jump(){if(player.grounded){player.vy=-560;player.grounded=false;}}
function update(dt,t){walking=false;if(started&&!$('panel').classList.contains('open')){const touches=Array.from(touchPointers.values());const dx=(keys.has('ArrowRight')||keys.has('d')||touches.includes('ArrowRight')?1:0)-(keys.has('ArrowLeft')||keys.has('a')||touches.includes('ArrowLeft')?1:0);walking=dx!==0;player.x=Math.max(35,Math.min(W-35,player.x+dx*235*dt));if(dx)player.face=dx>0?'right':'left';if(jumpQueued){jump();jumpQueued=false;}const previousY=player.y;player.vy+=1200*dt;player.y+=player.vy*dt;player.grounded=false;if(player.vy>=0){let floor=914;for(const p of platforms)if(player.x+10>p.x&&player.x-10<p.x+p.w&&previousY<=p.y+.1&&player.y>=p.y)floor=Math.min(floor,p.y);if(player.y>=floor){player.y=floor;player.vy=0;player.grounded=true;}}const closest=paintings.find(p=>Math.abs(player.x-p.tx)<27&&Math.abs(player.y-p.ty)<5&&player.grounded);const n=closest?closest.i:-1;if(n!==near){near=n;dwell=0}if(near>=0&&!walking){dwell+=dt;if(dwell>.3&&current!==near){if(near===SURPRISE_INDEX)playSurprise();else play(near)}}else dwell=0;if(current>=0&&Math.hypot(player.x-paintings[current].tx,player.y-paintings[current].ty)>78){audio.pause();current=-1;$('mobileSurprise').classList.add('hidden');$('title').textContent='Seguí explorando Corazón de Sací';$('status').textContent='Saltá a las plataformas y detenete frente a un cuadro';$('bar').style.width='0';$('pause').textContent='▶'}$('hint').textContent=near<0?'← → Mover · ↑ Saltar · Seguí los cuadros 01 → 21':(near===SURPRISE_INDEX?'Cuadro sorpresa · R: otro fragmento':TRACKS[near].title)+' · P: pausar música';}draw(t)}
function frame(t){const dt=Math.min((t-last)/1000,.04);last=t;update(dt,t);requestAnimationFrame(frame)}requestAnimationFrame(frame);
function play(i){current=i;showChapter(i);audio.src=overrides.get(i)||TRACKS[i].url;audio.volume=+$('volume').value;audio.loop=true;$('title').textContent=TRACKS[i].title;$('status').textContent=overrides.has(i)?'ArM · Tu archivo completo':'ArM · Muestra oficial de Apple Music';visited.add(i);$('count').textContent=visited.size+' / '+TRACKS.length+' descubiertas';audio.play().catch(()=>{$('status').textContent='Tocá ▶ para habilitar el audio';$('pause').textContent='▶'});$('pause').textContent='Ⅱ'}
function toggle(){if(current<0)return;if(audio.paused){audio.play().catch(()=>{$('status').textContent='No se pudo cargar el audio. Revisá tu conexión.'});$('pause').textContent='Ⅱ'}else{audio.pause();$('pause').textContent='▶'}}
audio.addEventListener('error',()=>{$('status').textContent='Audio no disponible. Podés cargar tu MP3 en Las 21 obras.'});audio.addEventListener('timeupdate',()=>{$('bar').style.width=(audio.duration?audio.currentTime/audio.duration*100:0)+'%'});$('volume').oninput=()=>audio.volume=+$('volume').value;$('pause').onclick=toggle;
$('start').onclick=()=>{primeAudio();started=true;$('cover').classList.add('hidden');canvas.focus()};$('home').onclick=()=>{player.x=90;player.y=914;player.vy=0;player.grounded=true;clearInputs();audio.pause();current=-1;near=-1;dwell=0;$('title').textContent='Corazón de Sací';$('status').textContent='Acercate a los cuadros para escuchar';$('bar').style.width='0'};
addEventListener('keydown',e=>{if(!started||$('panel').classList.contains('open'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','p','r'].includes(k)){e.preventDefault();keys.add(k);if([' ','ArrowUp','w'].includes(k)&&!e.repeat)jumpQueued=true;if(k==='p'&&!e.repeat)toggle();if(k==='r'&&!e.repeat&&near===SURPRISE_INDEX)playSurprise()}});addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));addEventListener('blur',clearInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();audio.pause();$('pause').textContent='▶'}});
function clearInputs(){keys.clear();touchPointers.clear();jumpQueued=false;for(const b of document.querySelectorAll('[data-key]'))b.classList.remove('pressed');}
function primeAudio(){if(audioPrimed||current>=0)return;audio.src='audio-unlock.wav';audio.volume=1;audio.play().then(()=>{audioPrimed=true;if(current<0){audio.pause();audio.currentTime=0;}}).catch(()=>{});}
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();if(!started||$('panel').classList.contains('open'))return;primeAudio();b.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,b.dataset.key);b.classList.add('pressed');if(b.dataset.key==='ArrowUp')jumpQueued=true;};const release=e=>{touchPointers.delete(e.pointerId);if(!Array.from(touchPointers.values()).includes(b.dataset.key))b.classList.remove('pressed');};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;}
$('collection').onclick=()=>{clearInputs();$('panel').classList.add('open')};$('close').onclick=()=>{$('panel').classList.remove('open');canvas.focus()};addEventListener('keydown',e=>{if(e.key==='Escape')$('close').click()});
TRACKS.forEach((t,i)=>{const row=document.createElement('div');row.className='trackrow';const num=document.createElement('button');num.textContent=String(i+1).padStart(2,'0');num.title='Ir a esta obra';num.onclick=()=>{player.x=paintings[i].tx;player.y=paintings[i].ty;player.vy=0;player.grounded=true;started=true;current=-1;near=-1;dwell=0;keys.clear();$('cover').classList.add('hidden');$('close').click();play(i)};const label=document.createElement('span');label.textContent=t.title;const caption=document.createElement('small');caption.className='chapter-caption';caption.textContent=STORY.chapters[i].act+' · '+STORY.chapters[i].beat;label.append(caption);const btn=document.createElement('button');btn.textContent='Cargar MP3';const input=document.createElement('input');input.type='file';input.accept='audio/*';input.hidden=true;btn.onclick=()=>input.click();input.onchange=()=>{const file=input.files[0];if(!file)return;if(overrides.has(i))URL.revokeObjectURL(overrides.get(i));overrides.set(i,URL.createObjectURL(file));btn.textContent='MP3 cargado ✓';$('toast').textContent=t.title+': '+file.name;if(current===i)play(i)};row.append(num,label,btn,input);$('tracks').append(row)});



$('storyHide').onclick=()=>{$('storyCard').classList.add('hidden');$('storyReveal').classList.remove('hidden');canvas.focus()};$('storyReveal').onclick=()=>{if(current===SURPRISE_INDEX)showSurprise();else if(current>=0)showChapter(current)};$('projectText').textContent=STORY.project;$('storyNote').textContent=STORY.note;
const journal=$('journal');STORY.chapters.forEach((c,i)=>{const entry=document.createElement('details');const heading=document.createElement('summary');heading.textContent=String(c.stage).padStart(2,'0')+' · '+TRACKS[i].title+' — '+c.name;const paragraph=document.createElement('p');paragraph.textContent=c.text;const location=document.createElement('small');location.textContent=c.space;entry.append(heading,paragraph,location);journal.append(entry)});

function drawMystery(p){const x=p.x-24,y=p.y-34;rect(x-5,y-5,58,79,'#193c37');rect(x-3,y-3,54,75,'#e3ae65');rect(x,y,48,69,'#284e46');for(let j=0;j<22;j++)rect(x+(j*17)%45,y+(j*13)%66,3,3,j%3?'#617a55':'#dfa558');const q=['011110','110011','000011','000110','001100','001100','000000','001100'];q.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')rect(x+12+xx*4,y+16+yy*4,4,4,'#f5d78f')}));}
function chooseSurprise(){const pool=surprisePool.length?surprisePool:PUBLISHED_PREVIEWS;const choices=pool.filter(t=>t.key!==lastSurpriseKey);const available=choices.length?choices:pool;const item=available[Math.floor(Math.random()*available.length)];lastSurpriseKey=item.key;return item;}
let surpriseItem=null;
function showSurprise(){$('mobileSurprise').classList.remove('hidden');$('storyAct').textContent='EXTRA · EL CUADRO SORPRESA';$('storyTitle').textContent=(surpriseItem?.custom||surpriseItem?.published)?'Un adelanto de lo que viene':'Una escucha sorpresa';$('storyText').textContent=(surpriseItem?.custom||surpriseItem?.published)?'Este cuadro abre una ventana al próximo capítulo de ArM. Descubrí un fragmento de 30 segundos de uno de ocho demos inéditos. Cada visita elige uno al azar; podés pedir otra sorpresa.':'Cada visita elige una muestra al azar de Ojos color sol, X MI o Volvé. Podés pedir otra sorpresa. Para usar música inédita, cargá tus adelantos en el catálogo.';$('storySpace').textContent=surpriseItem?.title||'Más allá de los 21 capítulos';$('storyCard').classList.remove('hidden');$('storyReveal').classList.add('hidden');$('surpriseAgain').classList.remove('hidden');}
function playSurprise(){surpriseItem=chooseSurprise();current=SURPRISE_INDEX;surpriseVisits++;audio.src=surpriseItem.url;audio.volume=+$('volume').value;audio.loop=false;$('title').textContent='? · '+surpriseItem.title;$('status').textContent=surpriseItem.published?'ArM · Adelanto inédito · 30 segundos':surpriseItem.custom?'ArM · Adelanto cargado':'ArM · Muestra elegida al azar';showSurprise();audio.play().catch(()=>{$('status').textContent='Tocá ▶ para escuchar la sorpresa';$('pause').textContent='▶'});$('pause').textContent='Ⅱ';}
$('surpriseAgain').onclick=()=>{if(current===SURPRISE_INDEX)playSurprise()};
$('goSurprise').onclick=()=>{player.x=1955;player.y=770;player.vy=0;player.grounded=true;keys.clear();started=true;near=SURPRISE_INDEX;$('cover').classList.add('hidden');$('close').click();playSurprise()};
$('previewFiles').onchange=()=>{const files=Array.from($('previewFiles').files||[]);if(!files.length)return;surprisePool.forEach(t=>URL.revokeObjectURL(t.url));surprisePool=files.map((file,i)=>({title:file.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(file),key:file.name+'-'+file.size+'-'+i,custom:true}));lastSurpriseKey='';$('previewStatus').textContent=files.length+' adelanto(s) cargado(s) para esta sesión.';if(current===SURPRISE_INDEX)playSurprise();};

audio.addEventListener('ended',()=>{if(current===SURPRISE_INDEX){$('pause').textContent='▶';$('status').textContent='Terminó el adelanto · R o «Otra sorpresa» para descubrir otro';}});
$('previewStatus').textContent=PUBLISHED_PREVIEWS.length+' demos inéditos disponibles · fragmentos de 30 segundos.';

$('expandGame').onclick=()=>{clearInputs();document.body.classList.add('game-mode');resize();canvas.focus();};
$('leaveGame').onclick=()=>{clearInputs();document.body.classList.remove('game-mode');resize();};
$('mobileStory').onclick=()=>{if(!$('storyCard').classList.contains('hidden')){$('storyHide').click();return;}if(current>=0)$('storyReveal').click();else $('collection').click();};
$('mobileSurprise').onclick=()=>{if(current===SURPRISE_INDEX)playSurprise();};
if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);
if(typeof visualViewport!=='undefined')visualViewport.addEventListener('resize',resize);
addEventListener('orientationchange',()=>{clearInputs();requestAnimationFrame(resize);});
