(()=>{
const SUPABASE_URL='https://vfimwlijbxamudirejiq.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_IETjbMWeJthqXscH9fkrXg_x2QZiL8D';
const ROOM='N5-01'; const TEACHER_ROLE='teacher';
const $=id=>document.getElementById(id); const safe=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,channel=null,user=null,nickname='Học viên',isTeacher=false,joined=false,xp=0,coins=0,people={},chatHistory=[],currentTopic=null,qIndex=0,score=0,wrongCount=0,selected=-1,answered=false,reconnectTimer=null,reconnectAttempts=0,roomEpoch=0,positionSendAt=0,positionSendPending=false;
let myPos={x:48,y:70},keysDown={},moveTimer=null,lastTrack=0,avatarMap={},studentGender='male',studentAvatar=0,studentOutfit=0,studentExpression=0,pendingBubbles={},quizAnswers=[];
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
 if(!isTeacher){try{const {error:profileError}=await client.from('ikigai_student_profiles').upsert({user_id:user.id,nickname,room_code:ROOM,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(profileError)console.warn('[IKIGAI profile]',profileError.message)}catch(e){console.warn(e)}}
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
   Object.entries(pendingBubbles).forEach(([id,msg])=>bubble(msg,'student',id));pendingBubbles={},quizAnswers=[];
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

// ===== IKIGAI N5 LMS v3.0 =====
let dbQuestions=[],dbAssignments=[];
function isTeacherUser(){return !!(user&&user.app_metadata&&user.app_metadata.role==='teacher')}
function escapeAttr(v){return safe(v).replace(/`/g,'&#96;')}
async function loadBank(category=null,lessonNo=null){
 if(!client)throw new Error('Chưa kết nối Supabase');
 let q=client.from('ikigai_questions').select('*').eq('active',true).order('lesson_no').order('question_code');
 if(category)q=q.eq('category',category);
 if(lessonNo)q=q.eq('lesson_no',Number(lessonNo));
 const {data,error}=await q;
 if(error)throw error;return data||[];
}
function categoryLabel(c){return ({vocabulary:'Từ vựng',grammar:'Ngữ pháp',kanji:'Kanji',reading:'Đọc hiểu',listening:'Nghe hiểu',kaiwa:'Hội thoại'})[c]||c}
function cleanExplanation(value){
 const banned='Đối chiếu danh sách Kanji tu vung ngu phap N5 IKIGAI gửi; câu hỏi kiểm tra cách đọc Hiragana của từ Kanji.';
 return String(value??'').replace(/\*\*/g,'').replace(banned,'').replace(/\s{2,}/g,' ').trim().replace(/^[;；、,\s]+|[;；、,\s]+$/g,'');
}

async function openLessons(){
 try{
  const rows=await loadBank();
  if(rows.length){
   dbQuestions=rows;
   const groups=[...new Map(rows.map(q=>[q.category+'-'+q.lesson_no,{category:q.category,lesson_no:Number(q.lesson_no)||0,count:rows.filter(x=>x.category===q.category&&Number(x.lesson_no)===Number(q.lesson_no)).length}])).values()];
    const order={kanji:0,vocabulary:1,grammar:2};
    groups.sort((a,b)=>(order[a.category]??9)-(order[b.category]??9)||
      (a.category==='kanji'?(a.lesson_no===0?99:b.lesson_no===0?-99:a.lesson_no-b.lesson_no):a.lesson_no-b.lesson_no));
   showPanel('📚 Ngân hàng luyện tập N5',`<p>Chọn nội dung muốn luyện. Dữ liệu được tải từ ngân hàng IKIGAI.</p><div class="choices">${groups.map(g=>`<button class="choice" data-dbcat="${g.category}" data-dblesson="${g.lesson_no}">${categoryLabel(g.category)} · ${g.lesson_no===0?'Tổng hợp':'Bài '+g.lesson_no}<br><small>${g.count} câu hỏi</small></button>`).join('')}</div>`);
   document.querySelectorAll('[data-dbcat]').forEach(b=>b.onclick=()=>startDatabaseQuiz(b.dataset.dbcat,Number(b.dataset.dblesson)));
  }else{
   showPanel('📚 Bài học & luyện tập',`<p>Chưa có câu hỏi trong ngân hàng trực tuyến. Thầy/cô có thể nhập file Excel ở mục Giáo viên. Tạm thời em vẫn có thể luyện bộ câu hỏi mẫu.</p><div class="choices">${topics.map(t=>`<button class="choice" data-topic="${t.id}">${t.icon} ${t.name}<br><small>${t.qs.length} câu luyện tập mẫu</small></button>`).join('')}</div>`);
   document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>startQuiz(b.dataset.topic));
  }
 }catch(e){toast('Chưa tải được ngân hàng: '+e.message);showPanel('📚 Luyện tập mẫu',`<div class="choices">${topics.map(t=>`<button class="choice" data-topic="${t.id}">${t.icon} ${t.name}</button>`).join('')}</div>`);document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>startQuiz(b.dataset.topic))}
}
function startDatabaseQuiz(category,lessonNo){
 const rows=dbQuestions.filter(q=>q.category===category&&Number(q.lesson_no)===Number(lessonNo));
 if(!rows.length){toast('Chưa có câu hỏi ở mục này.');return}
 currentTopic={id:'db-'+category+'-'+lessonNo,name:categoryLabel(category)+' · '+(lessonNo?'Bài '+lessonNo:'Tổng hợp'),qs:rows.map(q=>[q.prompt,q.options,q.correct_index,q.explanation,q.id]),db:true,category,lessonNo};
 qIndex=0;score=0;wrongCount=0;quizAnswers=[];renderQuestion();
}
async function saveAttempt(){
 if(!currentTopic?.db||!user)return;
 const localAttempt={nickname,category:currentTopic.category,lesson_no:currentTopic.lessonNo,assignment_id:currentTopic.assignmentId||null,total_questions:currentTopic.qs.length,correct_answers:score,score_percent:Math.round(score/currentTopic.qs.length*100),answers:quizAnswers.slice(),created_at:new Date().toISOString(),synced:false};
 try{const saved=JSON.parse(localStorage.getItem('ikigai_attempts_local')||'[]');saved.push(localAttempt);localStorage.setItem('ikigai_attempts_local',JSON.stringify(saved.slice(-200)))}catch(e){}
 try{
  const ids=currentTopic.qs.map(q=>q[4]);
  const answers=quizAnswers.map(a=>a===undefined?-1:a);
  const {data,error}=await client.rpc('submit_ikigai_attempt',{p_question_ids:ids,p_answers:answers,p_nickname:nickname,p_duration_seconds:0,p_assignment_id:currentTopic.assignmentId||null});
  if(error)throw error;
  if(data?.xp_awarded!==undefined){xp=Math.max(xp,Number(xp));save()}
  try{const saved=JSON.parse(localStorage.getItem('ikigai_attempts_local')||'[]');if(saved.length)saved[saved.length-1].synced=true;localStorage.setItem('ikigai_attempts_local',JSON.stringify(saved))}catch(e){}
  toast('Đã lưu kết quả lên hệ thống IKIGAI.');
 }catch(e){console.error('[IKIGAI LMS] save attempt',e);toast('Chưa đồng bộ được kết quả. Hãy kiểm tra SQL LMS và thử lại.')}
}
async function openTeacherLMS(){
 if(!isTeacher){toast('Chỉ giáo viên được sử dụng.');return}
 showPanel('👑 IKIGAI · Quản lý học tập',`
 <p>Quản lý ngân hàng N5, giao bài và xem kết quả học viên.</p>
 <div class="choices">
 <button class="choice" id="lmsImport">📥 Nhập câu hỏi Excel<br><small>Thêm mới hoặc cập nhật theo mã câu hỏi</small></button>
 <button class="choice" id="lmsAdd">➕ Thêm câu hỏi trực tiếp<br><small>Soạn câu hỏi ngay trong game</small></button>
 <button class="choice" id="lmsAssign">📝 Giao bài cho học viên<br><small>Giao theo bài Minna hoặc Kanji</small></button>
 <button class="choice" id="lmsReport">📊 Tiến độ & kết quả<br><small>Xem bài đã làm và điểm số</small></button>
 <button class="choice" id="lmsBank">📚 Xem ngân hàng câu hỏi<br><small>Danh sách, sửa hoặc ngừng sử dụng</small></button>
 </div>
 <input id="lmsExcel" type="file" accept=".xlsx,.xls,.csv" style="display:none">
 `);
 $('lmsImport').onclick=()=>$('lmsExcel').click();
 $('lmsExcel').onchange=async e=>{const f=e.target.files[0];if(f)await importQuestionExcel(f)};
 $('lmsAdd').onclick=showAddQuestion;
 $('lmsAssign').onclick=showAssignForm;
 $('lmsReport').onclick=showLmsReport;
 $('lmsBank').onclick=showBankList;
}
async function importQuestionExcel(file){
 if(!window.XLSX){toast('Không tải được thư viện Excel.');return}
 try{
  const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  const mapped=rows.filter(r=>r.ma_cau_hoi||r.question_code).map(r=>{
   const code=String(r.ma_cau_hoi||r.question_code).trim();
   const options=[r.dap_an_A||r.option_a,r.dap_an_B||r.option_b,r.dap_an_C||r.option_c,r.dap_an_D||r.option_d].map(x=>String(x||'').trim());
   const raw=String(r.dap_an_dung||r.correct_index||'').trim().toUpperCase();
   const correct='ABCD'.indexOf(raw)>=0?'ABCD'.indexOf(raw):Number(raw);
   return {question_code:code,level:'N5',category:String(r.nhom||r.category||'vocabulary').trim().toLowerCase(),lesson_no:Number(r.bai||r.lesson_no||0),prompt:String(r.cau_hoi||r.prompt||'').trim(),options,correct_index:correct,explanation:String(r.giai_thich||r.explanation||''),active:true};
  }).filter(q=>q.question_code&&q.prompt&&q.options.every(Boolean)&&q.correct_index>=0&&q.correct_index<=3);
  if(!mapped.length)throw new Error('Không tìm thấy dòng hợp lệ. Kiểm tra tên cột theo file mẫu.');
  const {error}=await client.from('ikigai_questions').upsert(mapped,{onConflict:'question_code'});
  if(error)throw error;
  toast('Đã nhập/cập nhật '+mapped.length+' câu hỏi.');
  showPanel('✅ Nhập Excel thành công',`<p>Đã xử lý <b>${mapped.length}</b> câu hỏi.</p><p>Các mã câu hỏi trùng sẽ được cập nhật, mã mới sẽ được thêm.</p><button class="primary" id="lmsBack">QUAY LẠI QUẢN LÝ</button>`);$('lmsBack').onclick=openTeacherLMS;
 }catch(e){console.error(e);toast('Lỗi nhập Excel: '+e.message)}
}
function showAddQuestion(){
 showPanel('➕ Thêm câu hỏi N5',`
 <div class="lms-form">
 <label>Mã câu hỏi</label><input id="qCode" placeholder="VD: V01-001">
 <label>Nhóm kiến thức</label><select id="qCategory"><option value="vocabulary">Từ vựng</option><option value="grammar">Ngữ pháp</option><option value="kanji">Kanji</option><option value="reading">Đọc hiểu</option><option value="listening">Nghe hiểu</option><option value="kaiwa">Hội thoại</option></select>
 <label>Bài số (0 = tổng hợp/Kanji)</label><input id="qLesson" type="number" min="0" max="25" value="1">
 <label>Câu hỏi</label><textarea id="qPrompt" rows="3" placeholder="Nhập câu hỏi tiếng Nhật hoặc tiếng Việt"></textarea>
 <label>Đáp án A</label><input id="qA"><label>Đáp án B</label><input id="qB"><label>Đáp án C</label><input id="qC"><label>Đáp án D</label><input id="qD">
 <label>Đáp án đúng</label><select id="qCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
 <label>Giải thích</label><textarea id="qExplain" rows="2"></textarea>
 <button class="primary" id="qSave">LƯU CÂU HỎI</button><button class="subtle" id="qBack">QUAY LẠI</button></div>`);
 $('qBack').onclick=openTeacherLMS;
 $('qSave').onclick=async()=>{
  const row={question_code:$('qCode').value.trim(),level:'N5',category:$('qCategory').value,lesson_no:Number($('qLesson').value),prompt:$('qPrompt').value.trim(),options:[$('qA').value,$('qB').value,$('qC').value,$('qD').value],correct_index:Number($('qCorrect').value),explanation:$('qExplain').value.trim(),active:true};
  if(!row.question_code||!row.prompt||row.options.some(x=>!x.trim())){toast('Hãy nhập mã, câu hỏi và đủ 4 đáp án.');return}
  const {error}=await client.from('ikigai_questions').upsert(row,{onConflict:'question_code'});
  if(error){toast('Không lưu được: '+error.message);return}
  toast('Đã lưu câu hỏi.');openTeacherLMS();
 };
}
async function showBankList(){
 try{const {data,error}=await client.from('ikigai_questions').select('*').order('lesson_no').order('question_code');if(error)throw error;
 showPanel('📚 Ngân hàng câu hỏi',`<p>Tổng số: ${data.length} câu. Chọn câu để sửa hoặc ẩn khỏi học viên.</p><div class="lms-list">${data.map(q=>`<div class="lms-row"><div><b>${safe(q.question_code)}</b> · ${categoryLabel(q.category)} · Bài ${q.lesson_no}<br><small>${safe(q.prompt)}</small></div><button data-editq="${q.id}">Sửa</button><button data-disableq="${q.id}">${q.active?'Ẩn':'Đã ẩn'}</button></div>`).join('')}</div><button class="subtle" id="bankBack">QUAY LẠI</button>`);
 $('bankBack').onclick=openTeacherLMS;
 data.forEach(q=>{const edit=document.querySelector(`[data-editq="${q.id}"]`),disable=document.querySelector(`[data-disableq="${q.id}"]`);edit.onclick=()=>editQuestion(q);disable.onclick=async()=>{const {error}=await client.from('ikigai_questions').update({active:!q.active}).eq('id',q.id);if(error)toast(error.message);else showBankList()}});
 }catch(e){toast('Không tải được ngân hàng: '+e.message)}
}
function editQuestion(q){
 showPanel('✏️ Sửa câu hỏi',`<div class="lms-form"><label>Câu hỏi</label><textarea id="eqPrompt" rows="3">${safe(q.prompt)}</textarea>${q.options.map((o,i)=>`<label>Đáp án ${'ABCD'[i]}</label><input id="eq${i}" value="${escapeAttr(o)}">`).join('')}<label>Đáp án đúng</label><select id="eqCorrect">${['A','B','C','D'].map((x,i)=>`<option value="${i}" ${i===q.correct_index?'selected':''}>${x}</option>`).join('')}</select><label>Giải thích</label><textarea id="eqExplain">${safe(q.explanation||'')}</textarea><button class="primary" id="eqSave">LƯU THAY ĐỔI</button><button class="subtle" id="eqBack">QUAY LẠI</button></div>`);
 $('eqBack').onclick=showBankList;$('eqSave').onclick=async()=>{const patch={prompt:$('eqPrompt').value,options:[0,1,2,3].map(i=>$('eq'+i).value),correct_index:Number($('eqCorrect').value),explanation:$('eqExplain').value};const {error}=await client.from('ikigai_questions').update(patch).eq('id',q.id);if(error)toast(error.message);else showBankList()};
}
async function showAssignForm(){
 try{
  const qs=await loadBank();const {data:profiles, error:profilesError}=await client.from('ikigai_student_profiles').select('user_id,nickname').order('nickname');if(profilesError)throw profilesError;
  showPanel('📝 Giao bài tập',`<div class="lms-form"><label>Tên nhiệm vụ</label><input id="aTitle" value="Ôn tập N5"><label>Nhóm kiến thức</label><select id="aCategory">${['vocabulary','grammar','kanji','reading','listening','kaiwa'].map(c=>`<option value="${c}">${categoryLabel(c)}</option>`).join('')}</select><label>Bài số (0 = toàn bộ)</label><input id="aLesson" type="number" min="0" max="25" value="1"><label>Hạn hoàn thành</label><input id="aDue" type="datetime-local"><label>Giao cho</label><select id="aScope"><option value="all">Tất cả học viên</option><option value="selected">Chọn học viên cụ thể</option></select><label>Chọn học viên (giữ Ctrl để chọn nhiều)</label><select id="aStudents" multiple size="5">${(profiles||[]).map(p=>`<option value="${p.user_id}">${safe(p.nickname)}</option>`).join('')}</select><button class="primary" id="aSave">GIAO BÀI</button><button class="subtle" id="aBack">QUAY LẠI</button></div>`);
  $('aBack').onclick=openTeacherLMS;
  $('aSave').onclick=async()=>{const cat=$('aCategory').value,lesson=Number($('aLesson').value);const ids=qs.filter(q=>q.category===cat&&(!lesson||Number(q.lesson_no)===lesson)).map(q=>q.id);if(!ids.length){toast('Chưa có câu hỏi ở lựa chọn này.');return}
   const selectedIds=Array.from($('aStudents').selectedOptions).map(o=>o.value);if($('aScope').value==='selected'&&!selectedIds.length){toast('Hãy chọn ít nhất một học viên.');return}const {error}=await client.from('ikigai_assignments').insert({title:$('aTitle').value.trim()||'Bài tập N5',category:cat,lesson_no:lesson,question_ids:ids,due_at:$('aDue').value?new Date($('aDue').value).toISOString():null,assigned_to:$('aScope').value==='all'?null:selectedIds,created_by:user.id});
   if(error){toast('Lỗi giao bài: '+error.message);return}toast('Đã giao bài cho toàn bộ học viên.');openTeacherLMS();
  };
 }catch(e){toast('Không tải được dữ liệu giao bài: '+e.message)}
}
async function showLmsReport(){
 try{const {data,error}=await client.from('ikigai_attempts').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
 showPanel('📊 Kết quả học viên',`<p>100 lượt làm bài gần nhất.</p><div class="lms-list">${data.map(a=>`<div class="lms-row"><div><b>${safe(a.nickname)}</b> · ${categoryLabel(a.category)}<br><small>${new Date(a.created_at).toLocaleString('vi-VN')} · ${a.correct_answers}/${a.total_questions} câu đúng</small></div><strong>${a.score_percent}% · ${a.xp_awarded} XP</strong></div>`).join('')||'<p>Chưa có lượt làm bài.</p>'}</div><button class="subtle" id="reportBack">QUAY LẠI</button>`);$('reportBack').onclick=openTeacherLMS;
 }catch(e){toast('Không tải được báo cáo: '+e.message)}
}
async function openStudentAssignments(){
 try{const {data,error}=await client.from('ikigai_assignments').select('*').order('created_at',{ascending:false});if(error)throw error;const {data:mine}=await client.from('ikigai_attempts').select('assignment_id').eq('user_id',user.id);const done=new Set((mine||[]).map(x=>x.assignment_id).filter(Boolean));const rows=(data||[]).filter(a=>!a.assigned_to||(a.assigned_to||[]).includes(user.id));
 showPanel('🎯 Bài tập được giao',`<div class="lms-list">${rows.map(a=>`<div class="lms-row"><div><b>${safe(a.title)}</b><br><small>${categoryLabel(a.category)} · ${a.question_ids.length} câu · ${a.due_at?'Hạn '+new Date(a.due_at).toLocaleString('vi-VN'):'Không giới hạn'} · ${done.has(a.id)?'✅ Đã hoàn thành':'🕒 Chưa hoàn thành'}</small></div><button data-assignment="${a.id}">${done.has(a.id)?'LÀM LẠI':'LÀM BÀI'}</button></div>`).join('')||'<p>Hiện chưa có bài được giao.</p>'}</div>`);
 rows.forEach(a=>document.querySelector(`[data-assignment="${a.id}"]`).onclick=async()=>{const {data:qs,error}=await client.from('ikigai_questions').select('*').in('id',a.question_ids);if(error){toast(error.message);return}dbQuestions=qs||[];currentTopic={id:'assignment-'+a.id,name:a.title,qs:dbQuestions.map(q=>[q.prompt,q.options,q.correct_index,q.explanation,q.id]),db:true,category:a.category,lessonNo:a.lesson_no,assignmentId:a.id};qIndex=0;score=0;wrongCount=0;quizAnswers=[];renderQuestion()});
 }catch(e){toast('Không tải được bài tập: '+e.message)}
}

const topics=[{id:'vocab',name:'Từ vựng N5',icon:'📘',qs:[['「りんご」は何ですか。',['Quả táo','Quả cam','Quả chuối','Quả nho'],0,'りんご nghĩa là quả táo.'],['「学校」の読み方は？',['がっこう','がこう','がっこ','かっこう'],0,'学校（がっこう）nghĩa là trường học.'],['「きのう」はいつですか。',['Hôm qua','Hôm nay','Ngày mai','Tuần sau'],0,'きのう nghĩa là hôm qua.'],['「先生」は何ですか。',['Giáo viên','Học sinh','Bác sĩ','Nhân viên'],0,'先生（せんせい）là giáo viên.']]},{id:'grammar',name:'Ngữ pháp N5',icon:'✏️',qs:[['わたしは 学生（　）です。',['は','を','に','で'],0,'Dùng は để nêu chủ đề.'],['毎日 7時（　）起きます。',['に','を','で','へ'],0,'に chỉ thời điểm cụ thể.'],['これは だれ（　）かばんですか。',['の','を','に','で'],0,'の biểu thị sở hữu.'],['学校（　）行きます。',['へ','を','が','で'],0,'へ chỉ phương hướng.']]},{id:'kanji',name:'Kanji N5',icon:'🈶',qs:[['「山」の読み方は？',['やま','かわ','そら','うみ'],0,'山（やま）nghĩa là núi.'],['「水」は何ですか。',['Nước','Lửa','Đất','Gió'],0,'水（みず）nghĩa là nước.'],['「木」の意味は？',['Cây','Kim loại','Đá','Hoa'],0,'木（き）nghĩa là cây.']]},{id:'kaiwa',name:'Hội thoại N5',icon:'💬',qs:[['A: おはようございます。 B: ＿＿＿',['おはようございます','こんばんは','さようなら','おやすみなさい'],0,'Buổi sáng đáp lại おはようございます.'],['A: ありがとうございます。 B: ＿＿＿',['どういたしまして','すみません','いただきます','いってきます'],0,'Đáp lại lời cảm ơn: どういたしまして.'],['A: お名前は？ B: ＿＿＿',['リンです','学生ですか','日本です','はい、そうです'],0,'リンです = Tôi tên là Linh.']] }];
function showPanel(title,html){$('panelTitle').textContent=title;$('panelBody').innerHTML=html;$('panel').classList.add('show')}function closePanel(){$('panel').classList.remove('show')}$('closePanel').onclick=closePanel;

function startQuiz(id){currentTopic=topics.find(t=>t.id===id);qIndex=0;score=0;wrongCount=0;quizAnswers=[];renderQuestion()}
function renderQuestion(){selected=-1;answered=false;const q=currentTopic.qs[qIndex];showPanel(currentTopic.name,`<div style="font-weight:900;color:#7654c5">CÂU ${qIndex+1}/${currentTopic.qs.length} · Đúng ${score} · Sai ${wrongCount}</div><div class="quizq">${q[0]}</div><div class="choices">${q[1].map((a,i)=>`<button class="choice" data-answer="${i}">${'ABCD'[i]}. ${safe(a)}</button>`).join('')}</div><div id="feedback"></div><div class="row"><button class="primary" id="submit">XÁC NHẬN</button></div>`);document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(answered)return;selected=+b.dataset.answer;document.querySelectorAll('[data-answer]').forEach(x=>x.classList.toggle('sel',x===b))});$('submit').onclick=checkAnswer}
function checkAnswer(){if(answered)return;if(selected<0){toast('Em hãy chọn một đáp án nhé!');return}answered=true;const q=currentTopic.qs[qIndex],ok=selected===q[2];quizAnswers[qIndex]=selected;if(ok){score++;xp+=10;coins+=2;save();sendPosition(true)}else wrongCount++;document.querySelectorAll('[data-answer]').forEach((b,i)=>{if(i===q[2])b.classList.add('ok');if(i===selected&&!ok)b.classList.add('no')});let penalty='';if(!ok){penalty=wrongCount===1?'💪 Phạt đẩy tạ 10 lần!':wrongCount>1?'🏃 Phạt chạy 5 vòng bờ hồ!':''}const msg=ok?'🎉 Chính xác! +10 XP, +2 xu 🌸':'💦 Chưa đúng rồi! '+penalty;$('feedback').innerHTML=`<div class="feedback ${ok?'good':'bad'}"><b>${msg}</b><br>${safe(cleanExplanation(q[3]))}</div>`;$('submit').textContent=qIndex===currentTopic.qs.length-1?'XEM KẾT QUẢ':'CÂU TIẾP THEO';$('submit').onclick=()=>{qIndex++;if(qIndex<currentTopic.qs.length)renderQuestion();else finishQuiz()};if(channel&&!ok)channel.send({type:'broadcast',event:'teacher-quiz',payload:{text:nickname+' vừa làm sai một câu. '+penalty}})}
async function finishQuiz(){const total=currentTopic.qs.length,rate=Math.round(score/total*100),bonus=score===total?30:rate>=60?15:5;xp+=bonus;coins+=Math.round(bonus/5);save();sendPosition(true);if(currentTopic.db)await saveAttempt();const penalty=wrongCount>1?'🏃 Phạt chạy 5 vòng bờ hồ!':wrongCount===1?'💪 Phạt đẩy tạ 10 lần!':'🌟 Không có hình phạt, tuyệt vời!';showPanel('🏆 Hoàn thành nhiệm vụ',`<div style="text-align:center"><div style="font-size:58px">${rate===100?'🏆':'🌸'}</div><h2>${score}/${total} câu đúng</h2><p>Tỷ lệ chính xác: ${rate}%</p><div class="feedback ${rate>=60?'good':'bad'}"><b>${penalty}</b><br>${rate===100?'すばらしい！ Xuất sắc!':rate>=60?'よくできました！ Làm tốt lắm!':'もう一度！ Hãy cố gắng thêm nhé!'}</div><h3>+${bonus} XP · +${Math.round(bonus/5)} xu</h3><div class="row"><button class="primary" id="again">LÀM LẠI</button><button class="subtle" id="back">ĐÓNG</button></div></div>`);$('again').onclick=()=>startQuiz(currentTopic.id);$('back').onclick=closePanel}
$('lessonBtn').onclick=openLessons;$('practiceBtn').onclick=openLessons;$('quizBtn').onclick=openJFT;$('taskBtn').onclick=()=>user?openStudentAssignments():showPanel('🎯 Nhiệm vụ hôm nay','IKIGAI DAILY QUEST','<p>🌸 Hoàn thành 1 bài từ vựng N5<br>🗣️ Gửi 1 câu tiếng Nhật vào khung chat<br>📚 Ôn lại 5 từ mới trong ngày</p>');$('rankBtn').onclick=async()=>{try{const {data,error}=await client.rpc('get_ikigai_leaderboard');if(!error&&data?.length){const agg={};data.forEach(a=>{agg[a.user_id]=agg[a.user_id]||{name:a.nickname,xp:0,attempts:0,correct:0,days:a.study_days};agg[a.user_id].xp=Number(a.total_xp||0);agg[a.user_id].attempts=Number(a.attempts||0);agg[a.user_id].correct=Number(a.avg_score||0)});const rows=Object.values(agg).sort((a,b)=>b.xp-a.xp);showPanel('🏆 Bảng xếp hạng IKIGAI',`<p>Xếp hạng theo XP từ các lượt làm bài đã đồng bộ.</p><div class="ranklist">${rows.map((p,i)=>`<div class="rankitem"><span>${['🥇','🥈','🥉'][i]||('#'+(i+1))} ${safe(p.name)} <small>· ${p.attempts} lượt · ${p.days} ngày học</small></span><strong>${p.xp} XP</strong></div>`).join('')}</div>`);return}}catch(e){console.warn(e)}
 const roster=Object.values(people).flat().map(p=>({name:p.name||'Học viên',xp:Number(p.xp||0),role:p.role||'student',id:p.user_id||p.id||''}));
 if(!roster.some(p=>p.id===user?.id))roster.push({name:nickname,xp,role:isTeacher?'teacher':'student',id:user?.id||'me'});
 roster.sort((a,b)=>b.xp-a.xp);
 const rows=roster.map((p,i)=>`<div class="rankitem ${p.id===user?.id?'me':''}"><span>${['🥇','🥈','🥉'][i]||('#'+(i+1))} ${safe(p.name)} ${p.role==='teacher'?'👑':''}</span><strong>${p.xp} XP</strong></div>`).join('');
 showPanel('🏆 Bảng xếp hạng · N5-01',`<p>Thành viên đang trực tuyến trong phòng. Điểm XP được xếp theo phiên hiện tại.</p><div class="ranklist">${rows||'<p>Chưa có thành viên.</p>'}</div><div class="row"><button class="subtle" id="refreshRank">LÀM MỚI</button></div>`);
 $('refreshRank').onclick=()=>{$('rankBtn').click()};
 };
$('teacherBtn').onclick=()=>{if(!isTeacher)return;showPanel('👑 Bảng điều khiển Giáo viên','リー先生 · IKIGAI',`<p><b>Quyền giáo viên đang bật.</b></p><div class="choices"><button class="choice" id="announce">📣 Thông báo cả lớp</button><button class="choice" id="assign">📝 Giao nhiệm vụ</button><button class="choice" id="praise">🌟 Khen thưởng</button><button class="choice" id="test">🧪 Mở bài kiểm tra</button><button class="choice" id="manageLMS">📚 Ngân hàng & Giao bài</button><button class="choice" id="studentTasks">📋 Bài tập đã giao</button></div><p style="font-size:12px;color:#74688b">Các lệnh được gửi qua kênh lớp học hiện tại.</p>`);$('announce').onclick=()=>{closePanel();sendChat('📣 Cả lớp chú ý nhé! リー先生 có thông báo.')};$('assign').onclick=()=>{closePanel();sendChat('📝 Nhiệm vụ: hoàn thành bài tập N5 và gửi câu trả lời vào nhóm.')};$('praise').onclick=()=>{closePanel();sendChat('🌟 すばらしい！ リー先生 khen cả lớp đã cố gắng!')};$('test').onclick=()=>{closePanel();sendChat('🧪 リー先生 bắt đầu bài kiểm tra ngữ pháp N5!');startQuiz('grammar')};$('manageLMS').onclick=openTeacherLMS;$('studentTasks').onclick=openStudentAssignments};
window.addEventListener('beforeunload',()=>{if(channel)channel.untrack()});

// ===== IKIGAI JFT-BASIC A2 MODULE v1.0 =====
// PDF question pages are rendered with PDF.js. Answer keys are only evaluated after submission.
let jftData=null, jftPdf=null, jftCurrent=null, jftAnswers={}, jftPageIndex=0, jftTimer=null, jftSeconds=0;
const JFT_PDF_URL='assets/jft/jft-basic-a2-tests.pdf';
const JFT_STORE='ikigai_jft_attempts_v1';
function jftEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function jftLoadHistory(){try{return JSON.parse(localStorage.getItem(JFT_STORE)||'[]')}catch(e){return []}}
function jftSaveHistory(item){const h=jftLoadHistory();h.unshift(item);localStorage.setItem(JFT_STORE,JSON.stringify(h.slice(0,100)))}
async function openJFT(){
 try{
  if(!jftData){const r=await fetch('assets/jft/answer-key.json');if(!r.ok)throw new Error('Không tải được dữ liệu đề');jftData=await r.json()}
  const hist=jftLoadHistory();
  showPanel('🎓 IKIGAI · Thi thử JFT-Basic A2',`
   <p>10 đề thi thử · 50 câu/đề · 60 phút/đề · gồm 4 phần theo tài liệu.</p>
   <div class="jft-grid">${jftData.tests.map(t=>{const last=hist.find(x=>x.testId===t.id);return `<button class="choice jft-test" data-jft-test="${t.id}"><b>📝 ${t.name}</b><small>50 câu · 60 phút</small><small>${last?`Lần gần nhất: ${last.score}/50 (${last.percent}%)`:'Chưa làm bài'}</small></button>`}).join('')}</div>
   <div class="jft-actions"><button class="choice" id="jftHistory">📊 Lịch sử kết quả</button><button class="choice" id="jftGuide">📖 Hướng dẫn thi</button></div>
   <p class="jft-note">Lưu ý: phần nghe trong tài liệu hiện là kịch bản hội thoại dạng chữ, chưa có âm thanh. Hãy sử dụng theo đúng tài liệu được cung cấp.</p>
  `);
  document.querySelectorAll('[data-jft-test]').forEach(b=>b.onclick=()=>jftStart(Number(b.dataset.jftTest)));
  $('jftHistory').onclick=jftShowHistory;
  $('jftGuide').onclick=()=>showPanel('📖 Hướng dẫn thi JFT',`<ul><li>Mỗi đề gồm 50 câu, thời gian 60 phút.</li><li>Chọn A/B/C cho từng câu.</li><li>Có thể chuyển trang tài liệu và quay lại câu trả lời.</li><li>Nộp bài để xem điểm, đáp án và câu chưa làm.</li><li>Kết quả được lưu trên thiết bị đang sử dụng.</li></ul><button class="primary" onclick="openJFT()">Đã hiểu</button>`);
 }catch(e){console.error(e);toast('Không mở được module JFT: '+e.message)}
}
async function jftStart(id){
 const test=jftData.tests.find(x=>x.id===id);if(!test)return;
 if(!window.pdfjsLib){toast('Không tải được trình đọc PDF. Kiểm tra kết nối mạng rồi thử lại.');return}
 jftCurrent=test;jftAnswers={};jftPageIndex=0;jftSeconds=test.minutes*60;
 showPanel(`🎓 ${test.name} · JFT-Basic A2`,`
  <div class="jft-exam-head"><b id="jftClock">60:00</b><span id="jftProgress">0/50 câu đã chọn</span></div>
  <div class="jft-toolbar"><button class="choice" id="jftPrevPage">◀ Trang trước</button><span id="jftPageLabel">Trang 1</span><button class="choice" id="jftNextPage">Trang sau ▶</button></div>
  <div class="jft-pdf-wrap"><canvas id="jftCanvas"></canvas></div>
  <div class="jft-answer-title">PHIẾU TRẢ LỜI · Chọn đáp án</div>
  <div class="jft-answer-grid" id="jftAnswerGrid"></div>
  <div class="jft-submit-row"><button class="choice" id="jftExit">Thoát đề</button><button class="primary" id="jftSubmit">NỘP BÀI & CHẤM ĐIỂM</button></div>
  <p class="jft-note">Chọn đáp án cho 50 câu. Hệ thống không hiển thị đáp án đúng trước khi nộp.</p>
 `);
 document.querySelector('#jftExit').onclick=()=>{if(confirm('Thoát đề thi? Các câu trả lời chưa nộp sẽ bị mất.')){clearInterval(jftTimer);openJFT()}};
 document.querySelector('#jftSubmit').onclick=()=>jftSubmit(false);
 document.querySelector('#jftPrevPage').onclick=()=>jftRenderPage(-1);
 document.querySelector('#jftNextPage').onclick=()=>jftRenderPage(1);
 jftBuildAnswers(); 
 try{if(!jftPdf){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';jftPdf=await pdfjsLib.getDocument(JFT_PDF_URL).promise}await jftRenderPage(0)}catch(e){console.error(e);toast('Không tải được PDF đề thi.')}
 clearInterval(jftTimer);jftUpdateClock();jftTimer=setInterval(()=>{jftSeconds--;jftUpdateClock();if(jftSeconds<=0)jftSubmit(true)},1000);
}
function jftBuildAnswers(){
 const el=$('jftAnswerGrid');el.innerHTML=Array.from({length:50},(_,i)=>`<div class="jft-answer-item" data-jft-item="${i+1}"><b>${i+1}.</b>${['A','B','C'].map(a=>`<button data-jft-q="${i+1}" data-jft-a="${a}">${a}</button>`).join('')}</div>`).join('');
 el.querySelectorAll('[data-jft-q]').forEach(b=>b.onclick=()=>{jftAnswers[b.dataset.jftQ]=b.dataset.jftA;jftUpdateAnswers()});
 jftUpdateAnswers();
}
function jftUpdateAnswers(){
 document.querySelectorAll('[data-jft-item]').forEach(row=>{const q=row.dataset.jftItem;row.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',jftAnswers[q]===b.dataset.jftA))});
 const n=Object.keys(jftAnswers).length;$('jftProgress').textContent=`${n}/50 câu đã chọn`;
}
async function jftRenderPage(delta){
 if(!jftPdf||!jftCurrent)return;
 const total=jftCurrent.endPage-jftCurrent.startPage+1;
 jftPageIndex=Math.max(0,Math.min(total-1,jftPageIndex+delta));
 const page=await jftPdf.getPage(jftCurrent.startPage+jftPageIndex);
 const canvas=$('jftCanvas'),ctx=canvas.getContext('2d');
 const box=canvas.parentElement.clientWidth-16,base=page.getViewport({scale:1});
 const scale=Math.min(1.65,box/base.width);
 const viewport=page.getViewport({scale});
 canvas.width=viewport.width*devicePixelRatio;canvas.height=viewport.height*devicePixelRatio;
 canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
 await page.render({canvasContext:ctx,viewport:page.getViewport({scale:scale*devicePixelRatio})}).promise;
 $('jftPageLabel').textContent=`Trang ${jftPageIndex+1}/${total}`;
 $('jftPrevPage').disabled=jftPageIndex===0;$('jftNextPage').disabled=jftPageIndex===total-1;
}
function jftUpdateClock(){const m=Math.floor(Math.max(0,jftSeconds)/60),s=Math.max(0,jftSeconds)%60;const el=$('jftClock');if(el){el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.classList.toggle('urgent',jftSeconds<=300)}}
function jftSubmit(auto){
 if(!jftCurrent)return;clearInterval(jftTimer);
 const answers=jftCurrent.answers;let score=0,details=[];
 for(let i=1;i<=50;i++){const given=jftAnswers[i]||null,correct=answers[i-1];if(given===correct)score++;details.push({no:i,given,correct,ok:given===correct})}
 const item={testId:jftCurrent.id,testName:jftCurrent.name,score,percent:Math.round(score/50*100),date:new Date().toISOString(),details};
 jftSaveHistory(item);jftCurrent=null;
 showPanel('📊 KẾT QUẢ THI JFT-BASIC A2',`
  <div class="jft-score"><strong>${score}/50</strong><span>${Math.round(score/50*100)}% câu đúng</span><small>${auto?'Hết giờ – hệ thống tự động nộp bài.': 'Đã nộp bài thành công.'}</small></div>
  <p><b>${details.filter(x=>!x.given).length}</b> câu chưa trả lời · <b>${50-score}</b> câu chưa đúng.</p>
  <div class="jft-review" id="jftReview">${details.map(x=>`<div class="${x.ok?'correct':'wrong'}"><b>Câu ${x.no}</b><span>Chọn: ${x.given||'—'} · Đáp án: <strong>${x.correct}</strong></span></div>`).join('')}</div>
  <div class="jft-submit-row"><button class="choice" id="jftBack">Danh sách đề</button><button class="primary" id="jftAgain">Làm lại đề này</button></div>
 `);
 $('jftBack').onclick=openJFT;$('jftAgain').onclick=()=>jftStart(item.testId);
}
function jftShowHistory(){
 const h=jftLoadHistory();
 showPanel('📊 Lịch sử thi JFT',h.length?`<div class="jft-history">${h.map(x=>`<div><b>${jftEsc(x.testName)}</b><span>${x.score}/50 · ${x.percent}%</span><small>${new Date(x.date).toLocaleString('vi-VN')}</small></div>`).join('')}</div><button class="choice" id="jftHistoryBack">Quay lại</button>`:'<p>Chưa có kết quả thi nào trên thiết bị này.</p><button class="choice" id="jftHistoryBack">Quay lại</button>');
 $('jftHistoryBack').onclick=openJFT;
}

})();
