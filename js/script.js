const $ = (selector) => document.querySelector(selector);
const audio = $('#audio');
const themeToggle = $('#themeToggle');
const safeRead = (key, fallback = []) => {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
};
const safeWrite = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.error(error); return false; }
};

// 内置歌曲：文件已随网站打包，不需要访客上传。
const musicList = [
  { name: 'Take Me Hand', artist: 'DAISHI DANCE', src: 'assets/music/take-me-hand.mp3' }
];
let currentSongIndex = 0;
const playBtn = $('#playBtn');
const progress = $('#progress');
const formatTime = seconds => Number.isFinite(seconds) && seconds >= 0
  ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';

const savedTheme = (() => { try { return localStorage.getItem('mayrain-theme'); } catch { return null; } })();
if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;
function syncThemeButton() { themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'; }
syncThemeButton();
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('mayrain-theme', next); } catch {}
  syncThemeButton();
});

const menuToggle = $('#menuToggle');
const nav = $('#mainNav');
function closeMenu() {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
// 手机上点菜单外部或按 Esc 收起，避免菜单一直挂着挡住内容。
document.addEventListener('click', event => {
  if (!nav.classList.contains('open')) return;
  if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
  closeMenu();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
$('#year').textContent = new Date().getFullYear();

// Music player
function loadSong(index) {
  if (!musicList.length) return;
  currentSongIndex = (index + musicList.length) % musicList.length;
  const song = musicList[currentSongIndex];
  audio.pause();
  audio.src = song.src;
  audio.load();
  $('#trackName').textContent = song.name;
  $('#trackStatus').textContent = `${song.artist} · 点击播放`;
  $('#currentTime').textContent = '0:00';
  $('#duration').textContent = '0:00';
  progress.value = 0;
  syncPlayback();
}
function syncPlayback() {
  playBtn.textContent = audio.paused ? '▶' : 'Ⅱ';
  $('#vinyl').classList.toggle('spinning', !audio.paused);
}
// 微信内置浏览器（X5 / WKWebView）会拦截 audio.play()，必须走 WeixinJSBridge 才能出声。
function playWithBridge() {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const result = audio.play();
      if (result && typeof result.then === 'function') result.then(resolve).catch(reject);
      else resolve();
    };
    if (window.WeixinJSBridge && typeof window.WeixinJSBridge.invoke === 'function') {
      try { window.WeixinJSBridge.invoke('getNetworkType', {}, attempt, attempt); return; }
      catch { /* 桥接调用失败就退回普通播放 */ }
    }
    attempt();
  });
}
function isWeChat() { return /MicroMessenger/i.test(navigator.userAgent); }
async function startPlayback() {
  try {
    // iOS 上如果元数据还没加载完，在点击手势里补一次 load()，否则 play() 会被静默拒绝。
    if (audio.readyState === 0) audio.load();
    // 4MB 的音频在移动网络上要缓冲一会，先给个反馈，别让人以为按钮没反应。
    if (audio.readyState < 3) $('#trackStatus').textContent = '正在加载音频……';
    await playWithBridge();
    const fallback = $('#audioFallback');
    if (fallback) fallback.hidden = true;
  } catch (error) {
    console.error('Audio playback error:', error);
    if (error && error.name === 'NotAllowedError') {
      $('#trackStatus').textContent = isWeChat()
        ? '微信内置浏览器拦截了音频，点右上角「在浏览器打开」再播放'
        : '浏览器拦截了自动播放，请再点一次播放按钮';
    } else {
      $('#trackStatus').textContent = isWeChat()
        ? '微信内置浏览器播不了，点右上角「在浏览器打开」再试'
        : await describeAudioError();
    }
    const fallback = $('#audioFallback');
    if (fallback) fallback.hidden = false;
  }
}
playBtn.addEventListener('click', () => audio.paused ? startPlayback() : audio.pause());
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
// 只有一首曲目时不显示切歌按钮，避免“按钮在但点了没反应”。
const hasMultipleTracks = musicList.length > 1;
prevBtn.hidden = !hasMultipleTracks;
nextBtn.hidden = !hasMultipleTracks;
prevBtn.addEventListener('click', () => { if (hasMultipleTracks) { loadSong(currentSongIndex - 1); startPlayback(); } });
nextBtn.addEventListener('click', () => { if (hasMultipleTracks) { loadSong(currentSongIndex + 1); startPlayback(); } });
audio.addEventListener('play', syncPlayback);
audio.addEventListener('playing', () => {
  const song = musicList[currentSongIndex];
  if (song) $('#trackStatus').textContent = `${song.artist} · 正在播放`;
});
audio.addEventListener('pause', syncPlayback);
audio.addEventListener('loadedmetadata', () => { $('#duration').textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => {
  $('#currentTime').textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) progress.value = audio.currentTime / audio.duration * 100;
});
audio.addEventListener('ended', () => { if (hasMultipleTracks) { loadSong(currentSongIndex + 1); startPlayback(); } else { syncPlayback(); } });
// 失败时区分「文件没部署（404）」和「浏览器解码失败」，不要只给一句笼统提示。
async function describeAudioError() {
  try {
    const response = await fetch(audio.currentSrc || audio.src, { method: 'HEAD', cache: 'no-store' });
    if (response.status === 404) return '音频文件 404：assets/music/take-me-hand.mp3 没有部署上去，播放器本身没问题';
    if (!response.ok) return `音频文件返回 ${response.status}，请检查部署配置`;
    return '浏览器无法解码这个音频文件，请确认它确实是有效的 MP3';
  } catch { return '音频文件请求失败，请检查网络或部署路径'; }
}
audio.addEventListener('error', async () => {
  $('#trackStatus').textContent = '音频加载失败，正在检查原因……';
  $('#trackStatus').textContent = await describeAudioError();
  const fallback = $('#audioFallback');
  if (fallback) fallback.hidden = false;
  syncPlayback();
});
progress.addEventListener('input', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * Number(progress.value) / 100;
});
loadSong(0);

// Gallery: preview image uses same PNG source, click opens original in dialog.
const imageDialog = $('#imageDialog');
// 旧版 iOS Safari 不支持 <dialog>.showModal，退化成普通覆盖层，避免点了没反应。
function openLightbox() {
  if (typeof imageDialog.showModal === 'function') { imageDialog.showModal(); return; }
  imageDialog.setAttribute('open', '');
  imageDialog.classList.add('dialog-fallback');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  if (typeof imageDialog.close === 'function') { imageDialog.close(); return; }
  imageDialog.removeAttribute('open');
  imageDialog.classList.remove('dialog-fallback');
  document.body.style.overflow = '';
}
document.querySelectorAll('.gallery-item').forEach(item => item.addEventListener('click', () => {
  $('#lightboxImage').src = item.dataset.full;
  $('#imageCaption').textContent = item.querySelector('span')?.textContent || '';
  openLightbox();
}));
$('#closeImage').addEventListener('click', closeLightbox);
imageDialog.addEventListener('click', event => { if (event.target === imageDialog) closeLightbox(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && imageDialog.open) closeLightbox(); });

// Game sub-pages. Edit these values to fill in your real game account statistics.
const gameProfiles = {
  minecraft: {
    eyebrow: 'GAME PROFILE / 01',
    title: '我的世界',
    subtitle: 'Minecraft Player',
    intro: '记录 MayRain 在 Java 版与网易版 Minecraft 中的游戏兴趣。不同版本有不同的玩法偏好。',
    symbol: '▦',
    facts: [['Java 版游戏 ID','mayrainlove'],['网易版游戏 ID','五玥雨'],['Java 版偏好','整合包 / 生存内容'],['网易版偏好','小游戏类型地图'],['喜欢的体验','探索、收集与创造'],['游戏方式','按不同版本选择喜欢的玩法']],
    bio: 'Java 版比较喜欢玩整合包和生存内容，享受探索世界、收集资源与逐步发展存档的过程；网易版则更喜欢小游戏类型的地图。',
    records: '这里会慢慢收录 Minecraft 的游戏截图、喜欢的地图、整合包体验和生存存档记录。'
  },
  delta: {
    eyebrow: 'GAME PROFILE / 02',
    title: '三角洲行动',
    subtitle: 'Delta Force Player',
    intro: '记录 MayRain 在三角洲行动中的游戏经历与个人状态。',
    symbol: '⌖',
    facts: [['游戏昵称 / ID','MayRain丶'],['游戏类型','手游'],['玩家阶段','萌新玩家'],['游戏经历','已经体验过几个赛季'],['常见队友','朋友组队'],['游戏态度','边玩边熟悉，慢慢进步']],
    bio: '目前还是三角洲行动手游的萌新玩家，玩过几个赛季，平时经常和朋友一起玩。数据和技术都还有很大的进步空间，主要享受和朋友组队的过程。',
    records: '暂时不展示具体战绩数据。之后可以补充赛季记录、常玩模式、喜欢的干员或和朋友一起完成的有趣对局。'
  }
};
function openGame(key) {
  const data = gameProfiles[key];
  if (!data) return;
  $('#mainContent').hidden = true;
  $('#gameView').hidden = false;
  document.body.classList.add('game-page-active');
  $('#gameEyebrow').textContent = data.eyebrow;
  $('#gameTitle').textContent = data.title;
  $('#gameIntro').textContent = data.intro;
  $('#gameSubTitle').textContent = data.subtitle;
  $('#gameSymbol').textContent = data.symbol;
  $('#gameBio').textContent = data.bio;
  $('#gameRecords').textContent = data.records;
  const facts = $('#gameFacts');
  facts.replaceChildren();
  data.facts.forEach(([label,value]) => {
    const row = document.createElement('div'); row.className = 'fact-row';
    const left = document.createElement('span'); left.textContent = label;
    const right = document.createElement('strong'); right.textContent = value;
    row.append(left,right); facts.append(row);
  });
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.game)));
$('#backToSite').addEventListener('click', () => {
  $('#gameView').hidden = true;
  $('#mainContent').hidden = false;
  document.body.classList.remove('game-page-active');
  window.scrollTo({top:document.querySelector('#games').offsetTop - 70,behavior:'smooth'});
});

// Account-based guestbook. Authentication is enforced by the Worker; no password is stored in the browser.
let currentUser = null;
const API_BASE = '';
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { credentials:'include', ...options,
    headers:{'Content-Type':'application/json', ...(options.headers || {})} });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) {
    const err = new Error(data.error || `API ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}
// 把接口错误翻译成用户看得懂的话：Worker 没部署/邮件没配置是最常见的两种情况。
function friendlyApiError(err){
  const text=String((err&&err.message)||err||'请求失败');
  if(err&&(err.status===404||err.status===501)) return `接口不可用（HTTP ${err.status}），请确认 Worker 已部署到最新版本。`;
  if(text==='email_service_not_configured') return '邮件服务尚未配置：请在 Worker 里设置 RESEND_API_KEY 与 MAIL_FROM。';
  if(err&&err.status===403&&text==='origin_not_allowed') return '当前域名不在 Worker 白名单（SITE_ORIGIN）里。';
  if(err&&err.status===503&&text==='server_not_configured') return 'Worker 缺少 D1 数据库或 SESSION_SECRET 配置。';
  return text;
}
let authMode='login';
const AUTH_HINTS={
  login:'用注册时填写的邮箱和密码登录。还没有账号？先点「注册」。',
  register:'注册三步：填写邮箱 → 点「发送验证码」并填入邮件里的 6 位验证码 → 设置至少 10 位密码。',
  forgot:'填写注册邮箱，我们会把密码重置链接发到该邮箱。'
};
const AUTH_SUBMIT_LABEL={login:'登录',register:'完成注册',forgot:'发送找回邮件'};
function setAuthMode(mode){
  authMode=mode;
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===mode));
  $('#authEmailWrap').hidden=false;
  $('#authCodeWrap').hidden=mode!=='register';
  $('#authPasswordWrap').hidden=mode==='forgot';
  $('#authCode').required=mode==='register';
  $('#authPassword').placeholder=mode==='register'?'至少10位':'请输入密码';
  $('#authSubmit').textContent=AUTH_SUBMIT_LABEL[mode];
  $('#authHint').textContent=AUTH_HINTS[mode]||'';
  $('#authPassword').autocomplete=mode==='register'?'new-password':'current-password';
  $('#authMessage').textContent='';
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authTab)));
$('#authOpenBtn').addEventListener('click',()=>{$('#authForm').hidden=!$('#authForm').hidden;setAuthMode('login');});
$('#logoutBtn').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'});}catch{}currentUser=null;$('#authMessage').textContent='';updateAuthUI();});
function updateAuthUI(){
  $('#loginState').textContent=currentUser?`已登录：${currentUser.username}`:'尚未登录';
  $('#authOpenBtn').hidden=!!currentUser;$('#logoutBtn').hidden=!currentUser;
  $('#guestMessage').disabled=!currentUser;$('#guestSubmit').disabled=!currentUser;
  $('#guestMessage').placeholder=currentUser?'写下你想说的话……':'请先注册并登录后留言';
  $('#guestbookNote').textContent=currentUser?`当前已登录为 ${currentUser.email}，留言将以账号名称显示。`:'请先注册并登录，再发布留言。未注册账号无法登录。';
  if(typeof loadNudge==='function')loadNudge();
}
async function checkLogin(){try{const r=await api('/api/me');currentUser=r.user||null;}catch{currentUser=null;}updateAuthUI();}

// 催更：只有登录用户可以点，每个账号每天一次。
const nudgeBtn=$('#nudgeBtn'), nudgeCount=$('#nudgeCount');
function renderNudge(state){
  if(!state)return;
  nudgeCount.textContent=`今天 ${Number(state.today||0)} 次 · 累计 ${Number(state.total||0)} 次`;
  if(currentUser){
    nudgeBtn.disabled=!!state.nudged;
    nudgeBtn.textContent=state.nudged?'今天已催更':'催更一下 ↑';
    nudgeBtn.title=state.nudged?'每个账号每天可以催更一次':'点一下提醒作者更新';
  }else{
    nudgeBtn.disabled=true;nudgeBtn.textContent='催更一下 ↑';nudgeBtn.title='注册并登录后可以催更';
  }
}
async function loadNudge(){try{renderNudge(await api('/api/nudge'));}catch{/* 催更不可用时保持禁用态 */}}
nudgeBtn.addEventListener('click',async()=>{
  if(!currentUser){$('#authForm').hidden=false;setAuthMode('register');$('#authEmail').focus();return;}
  nudgeBtn.disabled=true;
  try{renderNudge(await api('/api/nudge',{method:'POST'}));}
  catch(err){await loadNudge();console.warn('nudge failed:',err);}
});
loadNudge();

// 验证码 60 秒重发冷却，按钮上显示倒计时。
let codeCooldown=0, codeTimer=null;
function startCooldown(seconds){
  const btn=$('#sendCodeBtn');
  codeCooldown=Math.max(1,Math.floor(seconds));
  btn.disabled=true;btn.textContent=`${codeCooldown}s 后重发`;
  clearInterval(codeTimer);
  codeTimer=setInterval(()=>{
    codeCooldown-=1;
    if(codeCooldown<=0){clearInterval(codeTimer);codeTimer=null;codeCooldown=0;btn.disabled=false;btn.textContent='发送验证码';return;}
    btn.textContent=`${codeCooldown}s 后重发`;
  },1000);
}
$('#sendCodeBtn').addEventListener('click',async()=>{
  if(codeCooldown>0)return;
  const email=$('#authEmail').value.trim(),msg=$('#authMessage');
  if(!email){msg.textContent='请先填写邮箱地址。';$('#authEmail').focus();return;}
  msg.textContent='正在发送验证码……';
  const btn=$('#sendCodeBtn');btn.disabled=true;
  try{
    const r=await api('/auth/send-code',{method:'POST',body:JSON.stringify({email})});
    msg.textContent=r.message||'验证码已发送，请检查邮箱。';
    startCooldown(60);
    $('#authCode').focus();
  }catch(err){
    const text=String(err.message||'');
    msg.textContent=friendlyApiError(err);
    const wait=Number((text.match(/(\d+)\s*秒/)||[])[1]);
    if(wait>0) startCooldown(wait); else btn.disabled=false;
  }
});
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();const msg=$('#authMessage');msg.textContent='处理中……';
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value,code=$('#authCode').value.trim();
  try{
    if(authMode==='forgot'){
      const r=await api('/auth/forgot',{method:'POST',body:JSON.stringify({email})});msg.textContent=r.message||'如果邮箱已注册，将收到重置邮件。';return;
    }
    const path=authMode==='register'?'/auth/register':'/auth/login';
    const body=authMode==='register'?{email,password,code}:{email,password};
    const r=await api(path,{method:'POST',body:JSON.stringify(body)});currentUser=r.user;$('#authMessage').textContent='';updateAuthUI();$('#authForm').hidden=true;$('#authForm').reset();
  }catch(err){msg.textContent=friendlyApiError(err);}
});
const resetToken=new URLSearchParams(location.search).get('reset');
if(resetToken){$('#resetForm').hidden=false;$('#authForm').hidden=true;}
$('#resetForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#resetMessage');msg.textContent='正在更新……';try{const r=await api('/auth/reset',{method:'POST',body:JSON.stringify({token:resetToken,password:$('#resetPassword').value})});msg.textContent=r.message||'密码已更新';}catch(err){msg.textContent=friendlyApiError(err);}});
async function renderGuestbook(){
  const list=$('#guestList');list.replaceChildren();
  try{const result=await api('/api/guestbook');(result.entries||[]).forEach(entry=>{
    const item=document.createElement('div');item.className='guest-entry';const author=document.createElement('strong');author.textContent=String(entry.display_name||'注册用户');
    const time=document.createElement('time');time.textContent=String(entry.created_at||'');const message=document.createElement('p');message.textContent=String(entry.message||'');item.append(author,time,message);list.append(item);
  });}catch{const n=document.createElement('p');n.className='muted';n.textContent='留言列表暂时无法加载。';list.append(n);}
}
$('#guestForm').addEventListener('submit',async e=>{
  e.preventDefault();const message=$('#guestMessage').value.trim();if(!message)return;
  if(!currentUser){alert('请先注册并登录后再留言。');$('#authForm').hidden=false;setAuthMode('register');return;}
  try{await api('/api/guestbook',{method:'POST',body:JSON.stringify({message})});$('#guestMessage').value='';await renderGuestbook();}
  catch(err){alert(err.message==='login_required'?'登录状态已失效，请重新登录。':'留言发布失败，请稍后重试。');}
});
checkLogin();renderGuestbook();

// Progressive reveal, with reduced-motion support.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(items => items.forEach(item => {
    if (item.isIntersecting) { item.target.classList.add('revealed'); observer.unobserve(item.target); }
  }), {threshold:.12});
  document.querySelectorAll('.section,.panel,.game-card,.post-card').forEach(el => {
    el.classList.add('reveal'); observer.observe(el);
  });
}