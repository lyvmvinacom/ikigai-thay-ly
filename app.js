(()=>{
const SUPABASE_URL='https://vfimwlijbxamudirejiq.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_IETjbMWeJthqXscH9fkrXg_x2QZiL8D';
const ROOM='N5-01'; const TEACHER_ROLE='teacher';
const $=id=>document.getElementById(id); const safe=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,channel=null,user=null,nickname='Học viên',isTeacher=false,joined=false,xp=0,coins=0,people={},chatHistory=[],currentTopic=null,qIndex=0,score=0,wrongCount=0,selected=-1,answered=false,reconnectTimer=null,reconnectAttempts=0,roomEpoch=0,positionSendAt=0,positionSendPending=false;
let myPos={x:48,y:70},keysDown={},moveTimer=null,lastTrack=0,avatarMap={},studentGender='male',studentAvatar=0,studentOutfit=0,studentExpression=0,pendingBubbles={};
const localKey='ikigai_anime_v1';try{const s=JSON.parse(localStorage.getItem(localKey)||'{}');xp=s.xp||0;coins=s.coins||0}catch(e){}
function save(){try{localStorage.setItem(localKey,JSON.stringify({xp,coins}))}catch(e){}$('xp').textContent=xp;$('coins').textContent=coins;$('level').textContent=Math.floor(xp/100)+1}
save();function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}
const bubbleTimers=new Map();
function bubble(text,who='teacher',id=null,attempt=0){
 const targetId=id?String(id):(who==='teacher'?'teacher-npc':null);
 let el=targetId?document.querySelector('[data-user-id="'+CSS.escape(targetId)+'"] .speech'):null;
 if(!el&&who==='teacher')el=document.querySelector('[data-user-id="teacher-npc"] .speech');
 if(!el){
  if(id){pendingBubbles[String(id)]=String(text);if(attempt<12)setTimeout(()=>bubble(text,who,id,attempt+1),180)}
  return;
 }
 if(targetId&&bubbleTimers.has(targetId))clearTimeout(bubbleTimers.get(targetId));
 el.textContent=String(text);el.classList.add('show');
 const timer=setTimeout(()=>{el.classList.remove('show');if(targetId)bubbleTimers.delete(targetId)},5200);
 if(targetId)bubbleTimers.set(targetId,timer);
}
function addMessage(name,text,teacher=false,time=new Date()){const d=document.createElement('div');d.className='msg'+(teacher?' teacher':'');const tm=time.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});d.innerHTML='<b>'+safe(name)+'</b><small>'+tm+'</small><br>'+safe(text);$('messages').appendChild(d);$('messages').scrollTop=$('messages').scrollHeight;}
function setupClient(){if(!window.supabase){$('loginStatus').textContent='Không tải được thư viện kết nối. Kiểm tra Internet.';return false}client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);return true}
async function enterStudent(){nickname=$('studentName').value.trim();studentGender=selectedGender;studentAvatar=selectedAvatar;studentOutfit=selectedOutfit;studentExpression=selectedExpression;if(!nickname){$('loginStatus').textContent='Em hãy nhập tên trước nhé!';return}if(!setupClient())return;$('studentEnter').disabled=true;$('loginStatus').textContent='Đang kết nối lớp học...';try{let {data:{session}}=await client.auth.getSession();if(!session){const r=await client.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}user=session.user;isTeacher=false;await enterRoom()}catch(e){$('loginStatus').textContent='Lỗi kết nối: '+e.message;$('studentEnter').disabled=false}}
async function enterTeacher(){const email=$('teacherEmail').value.trim(),password=$('teacherPassword').value;if(!email||!password){$('loginStatus').textContent='Nhập email và mật khẩu giáo viên.';return}if(!setupClient())return;$('teacherEnter').disabled=true;$('loginStatus').textContent='Đang xác thực giáo viên...';try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;isTeacher=user.app_metadata?.role===TEACHER_ROLE;if(!isTeacher){await client.auth.signOut();throw new Error('Tài khoản đã đăng nhập nhưng chưa được cấp quyền teacher. Hãy thực hiện bước cấp quyền trong README.')}nickname='リー先生';studentGender='male';studentAvatar=0;await enterRoom()}catch(e){$('loginStatus').textContent=e.message;$('teacherEnter').disabled=false}}
function chibiSVG(kind='student',variant=0,gender='male',outfit=0,expression=0){
 const teacher=kind==='teacher';
 const female=gender==='female'&&!teacher;
 // Original transparent character art generated for IKIGAI WORLD.
 // Two distinct illustrated looks per gender; outfit selection switches the illustrated base.
 let asset;
 if(teacher) asset='teacher_lee.png';
 else if(female) asset=(Number(outfit)%2===1||Number(variant)%2===1)?'female_glasses.png':'female_pink.png';
 else asset=(Number(outfit)%2===1||Number(variant)%2===1)?'male_hoodie.png':'male_school.png';
 const emotes=['','😉','😮','😂','😏'];
 const emote=emotes[Math.max(0,Math.min(4,Number(expression)||0))];
 const outfitClass='costume-'+(Number(outfit)%6);
 const mirror=(Number(variant)>=4)?' mirror':'';
 return `<span class="anime-sprite-wrap ${outfitClass}${mirror}"><img class="anime-sprite" src="assets/characters/${asset}" alt="${teacher?'リー先生':(female?'Anime nữ sinh':'Anime nam sinh')}" draggable="false" loading="eager">${emote?`<span class="anime-emote">${emote}</span>`:''}</span>`;
}
function renderPeople(){
 const chars=$('characters');if(!chars)return;
 const list=Object.values(people||{}).flat();
 // Keep the current player visible locally while Presence is syncing.
 if(user&&!list.some(p=>(p.user_id||p.id)===user.id)){
  list.push({user_id:user.id,name:nickname,role:isTeacher?'teacher':'student',gender:studentGender,avatar:studentAvatar,outfit:studentOutfit,expression:studentExpression,x:myPos.x,y:myPos.y,xp});
 }
 const teacherOnline=list.find(p=>p.role==='teacher');
 const activeIds=new Set();
 // Teacher character is always visible; a signed-in teacher Presence takes over the same sprite.
 const teacherId=teacherOnline?String(teacherOnline.user_id||teacherOnline.id||'teacher-npc'):'teacher-npc';
 activeIds.add(teacherId);
 let teacherEl=chars.querySelector('.teacher-char');
 if(!teacherEl){teacherEl=document.createElement('div');teacherEl.className='character teacher-char';teacherEl.dataset.userId='teacher-npc';teacherEl.innerHTML='<div class="speech"></div><div class="avatar"></div><div class="halo"></div><div class="nameplate"></div>';chars.appendChild(teacherEl)}
 teacherEl.dataset.userId=teacherId;teacherEl.classList.add('teacher-char');
 const t=teacherOnline||{};teacherEl.querySelector('.avatar').innerHTML=chibiSVG('teacher',0,'male',0,0);teacherEl.querySelector('.nameplate').textContent='👑 リー先生';
 teacherEl.style.left=String(t.x??50)+'%';teacherEl.style.top=String(t.y??34)+'%';
 list.forEach((p,i)=>{
  const id=String(p.user_id||p.id||'');if(!id||p.role==='teacher')return;activeIds.add(id);
  let el=chars.querySelector(`[data-user-id="${CSS.escape(id)}"]`);
  if(!el){el=document.createElement('div');el.className='character';el.dataset.userId=id;el.innerHTML='<div class="speech"></div><div class="avatar"></div><div class="halo"></div><div class="nameplate"></div>';chars.appendChild(el)}
  el.querySelector('.avatar').innerHTML=chibiSVG('student',Number(p.avatar??i),p.gender||'male',Number(p.outfit||0),Number(p.expression||0));el.querySelector('.nameplate').textContent=p.name||'Học viên';
  el.style.left=String(p.x??(25+(i%4)*17))+'%';el.style.top=String(p.y??68)+'%';el.classList.toggle('moving',!!p.moving);
 });
 [...chars.querySelectorAll('.character')].forEach(el=>{if(!activeIds.has(el.dataset.userId))el.remove()});
 const unique=list.filter((p,i,a)=>a.findIndex(q=>(q.user_id||q.id)===(p.user_id||p.id))===i);$('onlineCount').textContent=unique.length||1;
}
// Presence stores identity/profile only. Broadcast carries frequent movement updates.
async function trackPresence(){
 if(!channel||!joined||!user)return;
 try{
  const result=await channel.track({user_id:user.id,name:nickname,role:isTeacher?'teacher':'student',gender:studentGender,avatar:studentAvatar,outfit:studentOutfit,expression:studentExpression,x:myPos.x,y:myPos.y,xp,online_at:new Date().toISOString()});
  if(result&&result==='error')throw new Error('Presence track returned error');
 }catch(e){console.warn('[IKIGAI] Presence profile error:',e)}
}
async function sendPosition(force=false){
 if(!channel||!joined||!user)return;
 const now=Date.now();
 if(!force&&now-positionSendAt<120){positionSendPending=true;return}
 positionSendAt=now;positionSendPending=false;
 try{
  await channel.send({type:'broadcast',event:'room-position',payload:{user_id:user.id,x:myPos.x,y:myPos.y,moving:!!(keysDown.ArrowUp||keysDown.ArrowDown||keysDown.ArrowLeft||keysDown.ArrowRight||keysDown.w||keysDown.a||keysDown.s||keysDown.d||keysDown.joyX||keysDown.joyY),at:now}});
 }catch(e){console.warn('[IKIGAI] Position broadcast error:',e)}
}
function applyRemotePosition(payload){
 if(!payload||!payload.user_id||payload.user_id===user?.id)return;
 const id=String(payload.user_id);
 const el=document.querySelector(`[data-user-id="${CSS.escape(id)}"]`);
 if(el){el.style.left=String(payload.x)+'%';el.style.top=String(payload.y)+'%';el.classList.toggle('moving',!!payload.moving)}
 // Keep the latest coordinates for future re-renders.
 const states=Object.values(people||{}).flat();
 const p=states.find(v=>String(v.user_id||v.id)===id);
 if(p){p.x=payload.x;p.y=payload.y;p.moving=!!payload.moving}
}
async function requestRoomPositions(){
 if(!channel||!joined||!user)return;
 await channel.send({type:'broadcast',event:'room-position-request',payload:{requester_id:user.id,at:Date.now()}});
}
function setPosition(dx,dy){
 if(!joined)return;
 const speed=2.1;myPos.x=Math.max(5,Math.min(95,myPos.x+dx*speed));myPos.y=Math.max(12,Math.min(92,myPos.y+dy*speed));
 const el=document.querySelector(`[data-user-id="${CSS.escape(user.id)}"]`);if(el){el.style.left=myPos.x+'%';el.style.top=myPos.y+'%';el.classList.toggle('moving',!!(dx||dy))}
 sendPosition();
}
function movementLoop(){
 if(moveTimer)return;
 moveTimer=setInterval(()=>{
  let dx=0,dy=0;
  if(keysDown.ArrowLeft||keysDown.a||keysDown.A)dx--;
  if(keysDown.ArrowRight||keysDown.d||keysDown.D)dx++;
  if(keysDown.ArrowUp||keysDown.w||keysDown.W)dy--;
  if(keysDown.ArrowDown||keysDown.s||keysDown.S)dy++;dx+=Number(keysDown.joyX||0);dy+=Number(keysDown.joyY||0);
  if(dx||dy){const len=Math.hypot(dx,dy);setPosition(dx/len,dy/len)}
 },50);
}
function setupMovement(){
 movementLoop();
 setInterval(()=>{if(joined&&positionSendPending)sendPosition(true)},150);
 window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&!['INPUT'].includes(document.activeElement?.tagName))e.preventDefault();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)&&!['INPUT'].includes(document.activeElement?.tagName))keysDown[e.key]=true});
 window.addEventListener('keyup',e=>{keysDown[e.key]=false;sendPosition(true)});window.addEventListener('blur',()=>{keysDown={};sendPosition(true)});
 const pad=$('joystick'),stick=$('joyStick');if(pad&&stick){let active=false,cx=0,cy=0;const reset=()=>{active=false;keysDown.joyX=0;keysDown.joyY=0;stick.style.transform='translate(-50%,-50%)'};pad.addEventListener('pointerdown',e=>{e.preventDefault();active=true;pad.setPointerCapture(e.pointerId);const r=pad.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;update(e)});function update(e){if(!active)return;const max=34,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),scale=len>max?max/len:1,x=dx*scale,y=dy*scale;stick.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;keysDown.joyX=x/max;keysDown.joyY=y/max}pad.addEventListener('pointermove',e=>{e.preventDefault();update(e)});pad.addEventListener('pointerup',e=>{e.preventDefault();reset();sendPosition(true)});pad.addEventListener('pointercancel',reset);}
}
setupMovement();

let selectedGender='male',selectedAvatar=0,selectedOutfit=0,selectedExpression=0;
const avatarNames={male:['Nam sinh','Năng động','Học giả','Thể thao','Senpai','Street style','Mùa đông','Yukata'],female:['Nữ sinh','Dịu dàng','Năng động','Thời trang','Idol','Street style','Mùa đông','Yukata']};
function renderAvatarChoices(){
 const host=$('avatarChoices');if(!host)return;host.innerHTML='';
 [0,1,2].forEach(offset=>{const idx=(selectedAvatar+offset)%8;const b=document.createElement('button');b.type='button';b.className='avatar-option'+(offset===0?' selected':'');b.innerHTML=chibiSVG('student',idx,selectedGender,selectedOutfit,selectedExpression);b.title=avatarNames[selectedGender][idx];b.onclick=()=>{selectedAvatar=idx;renderAvatarChoices()};host.appendChild(b)});
 $('avatarCaption').textContent=avatarNames[selectedGender][selectedAvatar]+' · Mẫu '+(selectedAvatar+1);
}
document.querySelectorAll('[data-gender]').forEach(b=>b.onclick=()=>{selectedGender=b.dataset.gender;document.querySelectorAll('[data-gender]').forEach(x=>x.classList.toggle('active',x===b));selectedAvatar=0;renderAvatarChoices();renderStyleChoices()});
$('avatarPrev').onclick=()=>{selectedAvatar=(selectedAvatar+7)%8;renderAvatarChoices()};
$('avatarNext').onclick=()=>{selectedAvatar=(selectedAvatar+1)%8;renderAvatarChoices()};
renderAvatarChoices();
const outfitLabels=['Đồng phục','Hoodie','Áo N5','Cardigan','Áo khoác','Yukata'];
const faceLabels=['Vui vẻ','Nháy mắt','Ngạc nhiên','Cười lớn','Tinh nghịch'];
function renderStyleChoices(){
 const outfits=$('outfitChoices'),faces=$('faceChoices');if(!outfits||!faces)return;
 outfits.innerHTML=outfitLabels.map((x,i)=>`<button type="button" class="${i===selectedOutfit?'active':''}" data-outfit="${i}">${x}</button>`).join('');
 faces.innerHTML=faceLabels.map((x,i)=>`<button type="button" class="${i===selectedExpression?'active':''}" data-face="${i}">${x}</button>`).join('');
 outfits.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{selectedOutfit=Number(b.dataset.outfit);renderStyleChoices();renderAvatarChoices()});
 faces.querySelectorAll('[data-face]').forEach(b=>b.onclick=()=>{selectedExpression=Number(b.dataset.face);renderStyleChoices();renderAvatarChoices()});
}
renderStyleChoices();

function scheduleRoomReconnect(reason='connection-lost',epoch=roomEpoch){
 if(epoch!==roomEpoch||reconnectTimer)return;
 joined=false;
 $('connectionStatus').textContent='● Mất kết nối · đang thử kết nối lại…';
 $('connectionStatus').className='connection-pill bad';
 const wait=Math.min(15000,1000*Math.pow(2,Math.min(reconnectAttempts,4)));
 reconnectAttempts++;
 console.warn('[IKIGAI Realtime] reconnect scheduled:',reason,'in',wait,'ms');
 reconnectTimer=setTimeout(async()=>{
  reconnectTimer=null;
  if(epoch!==roomEpoch||!user||!client)return;
  const old=channel;channel=null;
  if(old){try{await client.removeChannel(old)}catch(e){console.warn('remove old channel',e)}}
  await enterRoom(true);
 },wait);
}
async function enterRoom(isReconnect=false){
 if(!client||!user)return;
 if(channel&&joined&&!isReconnect)return;
 const epoch=++roomEpoch;
 try{
  const ch=client.channel('ikigai-room-'+ROOM,{config:{presence:{key:user.id},broadcast:{ack:false,self:false}}});
  channel=ch;
  ch.on('presence',{event:'sync'},()=>{
   if(channel!==ch||epoch!==roomEpoch)return;
   people=ch.presenceState();renderPeople();
   $('connectionStatus').textContent='● Đã kết nối · '+Object.values(people).flat().length+' online';
   $('connectionStatus').className='connection-pill ok';
   Object.entries(pendingBubbles).forEach(([id,msg])=>bubble(msg,'student',id));pendingBubbles={};
  });
  ch.on('presence',{event:'join'},()=>{
   if(channel!==ch||epoch!==roomEpoch)return;
   people=ch.presenceState();renderPeople();
   // New member has appeared: send our current coordinates once.
   sendPosition(true);
  });
  ch.on('presence',{event:'leave'},()=>{
   if(channel!==ch||epoch!==roomEpoch)return;
   people=ch.presenceState();renderPeople();
  });
  ch.on('broadcast',{event:'room-position'},({payload})=>applyRemotePosition(payload));
  ch.on('broadcast',{event:'room-position-request'},({payload})=>{
   if(payload?.requester_id&&payload.requester_id!==user.id)sendPosition(true);
  });
  ch.on('broadcast',{event:'room-chat'},({payload})=>{
   if(!payload||payload.user_id===user?.id)return;
   addMessage(payload.name||'Học viên',payload.text||'',!!payload.teacher);
   if(payload.user_id)bubble(payload.text,payload.teacher?'teacher':'student',payload.user_id);
  });
  ch.on('broadcast',{event:'room-emote'},({payload})=>{if(payload){const txt=(payload.name||'Bạn')+' '+payload.emote;if(payload.user_id&&document.querySelector(`[data-user-id="${CSS.escape(String(payload.user_id))}"]`))bubble(txt,'student',payload.user_id);else if(payload.user_id)pendingBubbles[payload.user_id]=txt;}});
  ch.on('broadcast',{event:'teacher-quiz'},({payload})=>{if(payload?.text)bubble(payload.text,'teacher')});
  ch.subscribe(async status=>{
   if(channel!==ch||epoch!==roomEpoch)return;
   console.info('[IKIGAI Realtime]',status);
   $('connectionStatus').textContent='● '+status;
   $('connectionStatus').className='connection-pill '+(status==='SUBSCRIBED'?'ok':(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)?'bad':''));
   if(status==='SUBSCRIBED'){
    if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}
    reconnectAttempts=0;joined=true;
    await trackPresence();
    await sendPosition(true);
    await requestRoomPositions();
    people=ch.presenceState();renderPeople();
    $('login').classList.add('hidden');$('teacherBtn').classList.toggle('hidden',!isTeacher);$('teacherTools').classList.toggle('show',isTeacher);
    if(!isReconnect){toast(isTeacher?'Chào mừng リー先生! Chế độ Giáo viên đã bật.':'Chào mừng '+nickname+' đến lớp N5-01!');addMessage('Hệ thống',nickname+' đã vào lớp.',isTeacher);if(isTeacher)bubble('みなさん、こんにちは！ リー先生 đã vào lớp.','teacher')}
   }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
    scheduleRoomReconnect(status,epoch);
   }
  });
 }catch(e){
  console.error('[IKIGAI Realtime] enterRoom failed',e);
  $('connectionStatus').textContent='● Lỗi kết nối · đang thử lại';
  $('connectionStatus').className='connection-pill bad';
  scheduleRoomReconnect(e.message,epoch);
 }
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&user&&client&&(!joined||!channel)){
  if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}
  scheduleRoomReconnect('tab-visible');
 }
});
window.addEventListener('online',()=>{
 if(user&&client&&!joined){if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}scheduleRoomReconnect('network-online')}
});
async function sendChat(text){
 text=text.trim();if(!text||!channel||!joined)return;
 if(isTeacher===false&&text.length>240)return;
 const payload={user_id:user?.id,name:nickname,text,teacher:isTeacher,at:new Date().toISOString()};
 try{
  const result=await channel.send({type:'broadcast',event:'room-chat',payload});
  if(result==='error')throw new Error('Không gửi được tin nhắn Realtime');
  addMessage(nickname,text,isTeacher);bubble(text,isTeacher?'teacher':'student',user?.id);
  $('chatInput').value='';
 }catch(e){console.error('[IKIGAI chat]',e);toast('Tin nhắn chưa gửi được. Hãy thử lại khi Realtime ổn định.')}
}
$('studentEnter').onclick=enterStudent;$('teacherEnter').onclick=enterTeacher;$('showTeacher').onclick=()=>{$('teacherLogin').classList.toggle('show');$('studentLogin').classList.toggle('hidden')};$('sendBtn').onclick=()=>sendChat($('chatInput').value);$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat($('chatInput').value)});
$('chatTab').onclick=()=>{$('chatTab').classList.add('active');$('memberTab').classList.remove('active');$('messages').classList.remove('hidden')};$('memberTab').onclick=()=>{$('memberTab').classList.add('active');$('chatTab').classList.remove('active');const names=Object.values(people).flat();$('messages').innerHTML='';const seen=new Set();names.forEach(p=>{const id=p.user_id||p.id;if(seen.has(id))return;seen.add(id);const d=document.createElement('div');d.className='member-row';d.innerHTML='<span class="member-dot"></span><span>'+safe(p.role==='teacher'?'リー先生':(p.name||'Học viên'))+'</span><span style="margin-left:auto;color:#7b69a7">'+(p.role==='teacher'?'Giáo viên':'Học viên')+'</span>';$('messages').appendChild(d)});if(!names.length)$('messages').textContent='Đang chờ thành viên kết nối…';};
document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>sendChat(b.dataset.quick));document.querySelectorAll('[data-emote]').forEach(b=>b.onclick=async()=>{bubble(nickname+' '+b.dataset.emote,'student');if(channel)await channel.send({type:'broadcast',event:'room-emote',payload:{user_id:user?.id,name:nickname,emote:b.dataset.emote}})});
$('speakBtn').onclick=()=>{const s=prompt('Nhập câu tiếng Nhật em muốn nói:');if(s)sendChat(s)};
const topics=[{id:'vocab',name:'Từ vựng N5',icon:'📘',qs:[['「りんご」は何ですか。',['Quả táo','Quả cam','Quả chuối','Quả nho'],0,'りんご nghĩa là quả táo.'],['「学校」の読み方は？',['がっこう','がこう','がっこ','かっこう'],0,'学校（がっこう）nghĩa là trường học.'],['「きのう」はいつですか。',['Hôm qua','Hôm nay','Ngày mai','Tuần sau'],0,'きのう nghĩa là hôm qua.'],['「先生」は何ですか。',['Giáo viên','Học sinh','Bác sĩ','Nhân viên'],0,'先生（せんせい）là giáo viên.']]},{id:'grammar',name:'Ngữ pháp N5',icon:'✏️',qs:[['わたしは 学生（　）です。',['は','を','に','で'],0,'Dùng は để nêu chủ đề.'],['毎日 7時（　）起きます。',['に','を','で','へ'],0,'に chỉ thời điểm cụ thể.'],['これは だれ（　）かばんですか。',['の','を','に','で'],0,'の biểu thị sở hữu.'],['学校（　）行きます。',['へ','を','が','で'],0,'へ chỉ phương hướng.']]},{id:'kanji',name:'Kanji N5',icon:'🈶',qs:[['「山」の読み方は？',['やま','かわ','そら','うみ'],0,'山（やま）nghĩa là núi.'],['「水」は何ですか。',['Nước','Lửa','Đất','Gió'],0,'水（みず）nghĩa là nước.'],['「木」の意味は？',['Cây','Kim loại','Đá','Hoa'],0,'木（き）nghĩa là cây.']]},{id:'kaiwa',name:'Hội thoại N5',icon:'💬',qs:[['A: おはようございます。 B: ＿＿＿',['おはようございます','こんばんは','さようなら','おやすみなさい'],0,'Buổi sáng đáp lại おはようございます.'],['A: ありがとうございます。 B: ＿＿＿',['どういたしまして','すみません','いただきます','いってきます'],0,'Đáp lại lời cảm ơn: どういたしまして.'],['A: お名前は？ B: ＿＿＿',['リンです','学生ですか','日本です','はい、そうです'],0,'リンです = Tôi tên là Linh.']] }];
function showPanel(title,html){$('panelTitle').textContent=title;$('panelBody').innerHTML=html;$('panel').classList.add('show')}function closePanel(){$('panel').classList.remove('show')}$('closePanel').onclick=closePanel;
function openLessons(){showPanel('📚 Bài học & luyện tập',`<p>Chọn nội dung muốn luyện hôm nay:</p><div class="choices">${topics.map(t=>`<button class="choice" data-topic="${t.id}">${t.icon} ${t.name}<br><small>${t.qs.length} câu luyện tập</small></button>`).join('')}</div>`);document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>startQuiz(b.dataset.topic))}
function startQuiz(id){currentTopic=topics.find(t=>t.id===id);qIndex=0;score=0;wrongCount=0;renderQuestion()}
function renderQuestion(){selected=-1;answered=false;const q=currentTopic.qs[qIndex];showPanel(currentTopic.name,`<div style="font-weight:900;color:#7654c5">CÂU ${qIndex+1}/${currentTopic.qs.length} · Đúng ${score} · Sai ${wrongCount}</div><div class="quizq">${q[0]}</div><div class="choices">${q[1].map((a,i)=>`<button class="choice" data-answer="${i}">${'ABCD'[i]}. ${safe(a)}</button>`).join('')}</div><div id="feedback"></div><div class="row"><button class="primary" id="submit">XÁC NHẬN</button></div>`);document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(answered)return;selected=+b.dataset.answer;document.querySelectorAll('[data-answer]').forEach(x=>x.classList.toggle('sel',x===b))});$('submit').onclick=checkAnswer}
function checkAnswer(){if(answered)return;if(selected<0){toast('Em hãy chọn một đáp án nhé!');return}answered=true;const q=currentTopic.qs[qIndex],ok=selected===q[2];if(ok){score++;xp+=10;coins+=2;save();sendPosition(true)}else wrongCount++;document.querySelectorAll('[data-answer]').forEach((b,i)=>{if(i===q[2])b.classList.add('ok');if(i===selected&&!ok)b.classList.add('no')});let penalty='';if(!ok){penalty=wrongCount===1?'💪 Phạt đẩy tạ 10 lần!':wrongCount>1?'🏃 Phạt chạy 5 vòng bờ hồ!':''}const msg=ok?'🎉 Chính xác! +10 XP, +2 xu 🌸':'💦 Chưa đúng rồi! '+penalty;$('feedback').innerHTML=`<div class="feedback ${ok?'good':'bad'}"><b>${msg}</b><br>${safe(q[3])}</div>`;$('submit').textContent=qIndex===currentTopic.qs.length-1?'XEM KẾT QUẢ':'CÂU TIẾP THEO';$('submit').onclick=()=>{qIndex++;if(qIndex<currentTopic.qs.length)renderQuestion();else finishQuiz()};if(channel&&!ok)channel.send({type:'broadcast',event:'teacher-quiz',payload:{text:nickname+' vừa làm sai một câu. '+penalty}})}
function finishQuiz(){const total=currentTopic.qs.length,rate=Math.round(score/total*100),bonus=score===total?30:rate>=60?15:5;xp+=bonus;coins+=Math.round(bonus/5);save();sendPosition(true);const penalty=wrongCount>1?'🏃 Phạt chạy 5 vòng bờ hồ!':wrongCount===1?'💪 Phạt đẩy tạ 10 lần!':'🌟 Không có hình phạt, tuyệt vời!';showPanel('🏆 Hoàn thành nhiệm vụ',`<div style="text-align:center"><div style="font-size:58px">${rate===100?'🏆':'🌸'}</div><h2>${score}/${total} câu đúng</h2><p>Tỷ lệ chính xác: ${rate}%</p><div class="feedback ${rate>=60?'good':'bad'}"><b>${penalty}</b><br>${rate===100?'すばらしい！ Xuất sắc!':rate>=60?'よくできました！ Làm tốt lắm!':'もう一度！ Hãy cố gắng thêm nhé!'}</div><h3>+${bonus} XP · +${Math.round(bonus/5)} xu</h3><div class="row"><button class="primary" id="again">LÀM LẠI</button><button class="subtle" id="back">ĐÓNG</button></div></div>`);$('again').onclick=()=>startQuiz(currentTopic.id);$('back').onclick=closePanel}
$('lessonBtn').onclick=openLessons;$('practiceBtn').onclick=openLessons;$('quizBtn').onclick=()=>startQuiz('grammar');$('taskBtn').onclick=()=>showPanel('🎯 Nhiệm vụ hôm nay','IKIGAI DAILY QUEST','<p>🌸 Hoàn thành 1 bài từ vựng N5<br>🗣️ Gửi 1 câu tiếng Nhật vào khung chat<br>📚 Ôn lại 5 từ mới trong ngày</p>');$('rankBtn').onclick=()=>{
 const roster=Object.values(people).flat().map(p=>({name:p.name||'Học viên',xp:Number(p.xp||0),role:p.role||'student',id:p.user_id||p.id||''}));
 if(!roster.some(p=>p.id===user?.id))roster.push({name:nickname,xp,role:isTeacher?'teacher':'student',id:user?.id||'me'});
 roster.sort((a,b)=>b.xp-a.xp);
 const rows=roster.map((p,i)=>`<div class="rankitem ${p.id===user?.id?'me':''}"><span>${['🥇','🥈','🥉'][i]||('#'+(i+1))} ${safe(p.name)} ${p.role==='teacher'?'👑':''}</span><strong>${p.xp} XP</strong></div>`).join('');
 showPanel('🏆 Bảng xếp hạng · N5-01',`<p>Thành viên đang trực tuyến trong phòng. Điểm XP được xếp theo phiên hiện tại.</p><div class="ranklist">${rows||'<p>Chưa có thành viên.</p>'}</div><div class="row"><button class="subtle" id="refreshRank">LÀM MỚI</button></div>`);
 $('refreshRank').onclick=()=>{$('rankBtn').click()};
 };
$('teacherBtn').onclick=()=>{if(!isTeacher)return;showPanel('👑 Bảng điều khiển Giáo viên','リー先生 · IKIGAI',`<p><b>Quyền giáo viên đang bật.</b></p><div class="choices"><button class="choice" id="announce">📣 Thông báo cả lớp</button><button class="choice" id="assign">📝 Giao nhiệm vụ</button><button class="choice" id="praise">🌟 Khen thưởng</button><button class="choice" id="test">🧪 Mở bài kiểm tra</button></div><p style="font-size:12px;color:#74688b">Các lệnh được gửi qua kênh lớp học hiện tại.</p>`);$('announce').onclick=()=>{closePanel();sendChat('📣 Cả lớp chú ý nhé! リー先生 có thông báo.')};$('assign').onclick=()=>{closePanel();sendChat('📝 Nhiệm vụ: hoàn thành bài tập N5 và gửi câu trả lời vào nhóm.')};$('praise').onclick=()=>{closePanel();sendChat('🌟 すばらしい！ リー先生 khen cả lớp đã cố gắng!')};$('test').onclick=()=>{closePanel();sendChat('🧪 リー先生 bắt đầu bài kiểm tra ngữ pháp N5!');startQuiz('grammar')}};
window.addEventListener('beforeunload',()=>{if(channel)channel.untrack()});
})();