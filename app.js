// IKIGAI WORLD Anime Edition — multiplayer foundation
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let dpr=1,W=innerWidth,H=innerHeight,player={x:W/2,y:H*.68},players={},keys={},stick={x:0,y:0},speed=190;
let nickname='Học viên',room='N5-01',xp=0,nearTeacher=false,channel=null,supabase=null,lastBroadcast=0;
const SUPABASE_URL='https://vfimwlijbxamudirejiq.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_IETjbMWeJthqXscH9fkrXg_x2QZiL8D';
let currentUser=null;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function rounded(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawCharacter(x,y,name,color='#45cbbb',teacher=false){ctx.save();ctx.translate(x,y);ctx.fillStyle='#15233b44';ctx.beginPath();ctx.ellipse(0,15,16,6,0,0,Math.PI*2);ctx.fill();
 // anime/chibi placeholder sprite: layered head, hair, eyes, body
 rounded(-12,-8,24,25,8,color);rounded(-11,-31,22,25,8,'#ffd5b8');rounded(-12,-34,24,12,7,teacher?'#27334d':'#503c59');rounded(-13,-29,7,13,4,teacher?'#27334d':'#503c59');rounded(6,-29,7,13,4,teacher?'#27334d':'#503c59');
 ctx.fillStyle='#233047';ctx.beginPath();ctx.arc(-5,-19,2,0,Math.PI*2);ctx.arc(5,-19,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a94e5b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-14,3,0,Math.PI);ctx.stroke();
 rounded(-10,15,8,12,3,'#293954');rounded(2,15,8,12,3,'#293954');ctx.fillStyle='#f4f7ff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(name.slice(0,12),0,-43);ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#85c69a';ctx.fillRect(0,0,W,H);
 // warm anime classroom floor
 for(let y=0;y<H;y+=42)for(let x=0;x<W;x+=42){ctx.fillStyle=((x/42+y/42)%2)?'#e8d7b8':'#e2cfad';ctx.fillRect(x,y,40,40)}
 rounded(W*.13,H*.13,W*.74,H*.72,20,'#c99f79');rounded(W*.15,H*.15,W*.70,H*.68,14,'#f4e5c9');
 rounded(W*.36,H*.19,W*.28,65,8,'#315d63');ctx.fillStyle='#eaffed';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('いらっしゃい！',W/2,H*.25);ctx.font='12px system-ui';ctx.fillText('IKIGAI 日本語教室',W/2,H*.29);
 // windows and desks
 for(let i=0;i<4;i++){rounded(W*.19+i*W*.16,H*.16,55,22,4,'#83d5d1')}
 for(let r=0;r<2;r++)for(let c=0;c<4;c++){let x=W*(.25+c*.16),y=H*(.48+r*.19);rounded(x-22,y-10,44,26,5,'#986a4b');rounded(x-18,y-8,36,18,3,'#c39267')}
 drawCharacter(W/2,H*.42,'THẦY LY','#1a8290',true);
 nearTeacher=Math.hypot(player.x-W/2,player.y-H*.48)<100;
 Object.values(players).forEach(p=>drawCharacter(p.x*W,p.y*H,p.name,p.color||'#e78cae'));
 drawCharacter(player.x,player.y,nickname,'#42c9b6');
 if(nearTeacher){rounded(W/2-62,H*.48,124,27,8,'#173a53');ctx.fillStyle='white';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('✦ TƯƠNG TÁC',W/2,H*.48+18)}
}
function update(dt){let dx=stick.x,dy=stick.y;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;let l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}player.x=Math.max(50,Math.min(W-50,player.x+dx*speed*dt));player.y=Math.max(150,Math.min(H-60,player.y+dy*speed*dt));}
let last=0;function frame(t){let dt=Math.min((t-last)/1000||0,.04);last=t;if(!$('welcome').classList.contains('visible'))update(dt);draw();if(channel&&Date.now()-lastBroadcast>90){lastBroadcast=Date.now();channel.track({name:nickname,x:player.x/W,y:player.y/H,color:'#e78cae',xp})}requestAnimationFrame(frame)}requestAnimationFrame(frame);
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1800)}
function open(id){$(id).classList.add('visible')}function closeAll(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('visible'))}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeAll);
$('enter').onclick=async()=>{nickname=$('nickname').value.trim()||'Học viên';room=$('roomCode').value.trim()||'N5-01';$('roomLabel').textContent=room;closeAll();await connectRoom();toast('Chào mừng '+nickname+' đến lớp '+room)};
async function connectRoom(){
 if(!window.supabase){toast('Không tải được thư viện Supabase. Kiểm tra kết nối Internet.');return}
 try{
   if(!supabase) supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
   // Reuse the anonymous session on this device; otherwise create one.
   let {data:sessionData,error:sessionError}=await supabase.auth.getSession();
   if(sessionError) throw sessionError;
   let user=sessionData.session?.user;
   if(!user){
     const {data,error}=await supabase.auth.signInAnonymously();
     if(error) throw error;
     user=data.user;
   }
   currentUser=user;
   // Save the chosen display name against this anonymous account.
   const {error:profileError}=await supabase.from('player_profiles').upsert({
     id:user.id,
     display_name:nickname,
     avatar_id:'avatar-01'
   },{onConflict:'id'});
   if(profileError) throw profileError;

   channel=supabase.channel('ikigai-room-'+room,{
     config:{presence:{key:user.id}}
   });
   channel.on('presence',{event:'sync'},()=>{
     const state=channel.presenceState();
     players={};
     Object.entries(state).forEach(([key,entries])=>{
       const p=entries?.[0];
       if(p && key!==user.id) players[key]=p;
     });
     $('online').textContent=Object.keys(state).length;
   });
   channel.on('presence',{event:'join'},()=>{$('online').textContent=Object.keys(channel.presenceState()).length});
   channel.on('presence',{event:'leave'},()=>{$('online').textContent=Object.keys(channel.presenceState()).length});
   await channel.subscribe(async status=>{
     if(status==='SUBSCRIBED'){
       await channel.track({
         name:nickname,
         x:player.x/W,
         y:player.y/H,
         color:'#e78cae',
         xp,
         user_id:user.id
       });
       toast('Đã kết nối phòng trực tuyến');
     }
   });
 }catch(e){
   console.error(e);
   toast('Kết nối thất bại: '+(e.message||'Kiểm tra cấu hình Supabase'));
 }
}
$('interact').onclick=()=>{if(nearTeacher)open('dialog');else toast('Hãy đến gần Thầy Ly nhé!')};
$('rankBtn').onclick=()=>open('ranking');
document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{let topic=b.dataset.topic;$('quizPrompt').textContent=topic==='Ngữ pháp N5'?'わたしは学生（　）です。':topic==='Từ vựng N5'?'「りんご」は何ですか。':topic==='Kanji N5'?'「山」の読み方は？':'A: ありがとうございます。B: ＿＿＿';let opts=topic==='Ngữ pháp N5'?['は','を','に','で']:topic==='Từ vựng N5'?['Quả táo','Quả cam','Quả chuối','Quả nho']:topic==='Kanji N5'?['やま','かわ','そら','うみ']:['どういたしまして','すみません','いただきます','さようなら'];$('answers').innerHTML=opts.map((v,i)=>`<button class="answer" data-answer="${i}">${'ABCD'[i]}. ${v}</button>`).join('');$('feedback').textContent='';document.querySelectorAll('[data-answer]').forEach(a=>a.onclick=()=>{let correct=0,ok=Number(a.dataset.answer)===correct;if(ok){xp+=10;$('xp').textContent=xp;$('feedback').textContent='Chính xác! +10 XP';if(channel)channel.track({name:nickname,x:player.x/W,y:player.y/H,xp})}else $('feedback').textContent='Chưa đúng, hãy thử lại nhé!'});});
$('run').onpointerdown=()=>speed=270;$('run').onpointerup=$('run').onpointerleave=()=>speed=190;
addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '||e.key==='Enter')$('interact').click()});addEventListener('keyup',e=>keys[e.key]=false);
const joy=$('joystick'),knob=$('knob');let pointer=null;function joyMove(e){let r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,m=r.width*.3,l=Math.hypot(dx,dy);if(l>m){dx=dx/l*m;dy=dy/l*m}stick.x=dx/m;stick.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}joy.onpointerdown=e=>{pointer=e.pointerId;joy.setPointerCapture(pointer);joyMove(e)};joy.onpointermove=e=>{if(e.pointerId===pointer)joyMove(e)};function joyEnd(){pointer=null;stick.x=stick.y=0;knob.style.transform=''}joy.onpointerup=joy.onpointercancel=joyEnd;
