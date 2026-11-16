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
  { name: 'Take Me Hand', artist: 'DAISHI DANCE', src: 'assets/music/DAISHI%20DANCE%20(%E3%83%80%E3%82%A4%E3%82%B7%E3%83%BB%E3%83%80%E3%83%B3%E3%82%B9)%20-%20Take%20Me%20Hand%20%5Bmqms2%5D.mp3' }
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
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
}));
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
async function startPlayback() {
  try { await audio.play(); }
  catch (error) {
    $('#trackStatus').textContent = '播放失败，请检查音频文件或浏览器设置';
    console.error('Audio playback error:', error);
  }
}
playBtn.addEventListener('click', () => audio.paused ? startPlayback() : audio.pause());
$('#prevBtn').addEventListener('click', () => { loadSong(currentSongIndex - 1); startPlayback(); });
$('#nextBtn').addEventListener('click', () => { loadSong(currentSongIndex + 1); startPlayback(); });
audio.addEventListener('play', syncPlayback);
audio.addEventListener('pause', syncPlayback);
audio.addEventListener('loadedmetadata', () => { $('#duration').textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => {
  $('#currentTime').textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) progress.value = audio.currentTime / audio.duration * 100;
});
audio.addEventListener('ended', () => { loadSong(currentSongIndex + 1); startPlayback(); });
audio.addEventListener('error', () => { $('#trackStatus').textContent = '音乐文件加载失败，请检查 assets/music/ 中的文件'; syncPlayback(); });
progress.addEventListener('input', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * Number(progress.value) / 100;
});
loadSong(0);

// Gallery: preview image uses same PNG source, click opens original in dialog.
const imageDialog = $('#imageDialog');
document.querySelectorAll('.gallery-item').forEach(item => item.addEventListener('click', () => {
  $('#lightboxImage').src = item.dataset.full;
  $('#imageCaption').textContent = item.querySelector('span')?.textContent || '';
  imageDialog.showModal();
}));
$('#closeImage').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });

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

// Blog local drafts
function renderPosts() {
  const posts = safeRead('mayrain-posts');
  const list = $('#blogList');
  list.querySelectorAll('[data-user-post]').forEach(el => el.remove());
  posts.forEach(post => {
    if (!post || typeof post !== 'object') return;
    const article = document.createElement('article'); article.className = 'post-card'; article.dataset.userPost = 'true';
    const date = document.createElement('span'); date.className = 'post-date'; date.textContent = `${String(post.date || '')} · JOURNAL`;
    const title = document.createElement('h3'); title.textContent = String(post.title || '无标题');
    const body = document.createElement('p'); body.textContent = String(post.body || '');
    const label = document.createElement('span'); label.className = 'mini-label'; label.textContent = 'PERSONAL NOTE';
    article.append(date,title,body,label); list.prepend(article);
  });
}
renderPosts();
const postDialog = $('#postDialog');
$('#newPostBtn').addEventListener('click', () => postDialog.showModal());
$('#postForm').addEventListener('submit', event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const title = $('#postTitle').value.trim(), body = $('#postBody').value.trim();
  if (!title || !body) return;
  const posts = safeRead('mayrain-posts');
  posts.unshift({title,body,date:new Date().toLocaleDateString('zh-CN')});
  if (!safeWrite('mayrain-posts',posts)) return alert('日志保存失败，请检查浏览器存储空间。');
  renderPosts(); postDialog.close(); $('#postForm').reset();
});

// Account-based guestbook. Authentication is enforced by the Worker; no password is stored in the browser.
let currentUser = null;
const API_BASE = '';
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { credentials:'include', ...options,
    headers:{'Content-Type':'application/json', ...(options.headers || {})} });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || `API ${response.status}`);
  return data;
}
let authMode='login';
function setAuthMode(mode){
  authMode=mode;
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===mode));
  $('#authUsernameWrap').hidden=mode==='forgot';
  $('#authEmailWrap').hidden=mode==='login';
  $('#authPasswordWrap').hidden=mode==='forgot';
  $('#authSubmit').textContent=({login:'登录',register:'创建账号',forgot:'发送找回邮件'})[mode];
  $('#authMessage').textContent='';
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authTab)));
$('#authOpenBtn').addEventListener('click',()=>{$('#authForm').hidden=!$('#authForm').hidden;setAuthMode('login');});
$('#logoutBtn').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'});}catch{}currentUser=null;updateAuthUI();});
function updateAuthUI(){
  $('#loginState').textContent=currentUser?`已登录：${currentUser.username}`:'尚未登录';
  $('#authOpenBtn').hidden=!!currentUser;$('#logoutBtn').hidden=!currentUser;
  $('#guestbookNote').textContent=currentUser?`当前账号：${currentUser.username}。可使用账号昵称留言，也可匿名。`:'登录后显示注册昵称；匿名留言无需登录。';
}
async function checkLogin(){try{const r=await api('/api/me');currentUser=r.user||null;}catch{currentUser=null;}updateAuthUI();}
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();const msg=$('#authMessage');msg.textContent='处理中……';
  const username=$('#authUsername').value.trim(),email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  try{
    if(authMode==='forgot'){
      const r=await api('/auth/forgot',{method:'POST',body:JSON.stringify({email})});msg.textContent=r.message||'如果邮箱已注册，将收到重置邮件。';return;
    }
    const path=authMode==='register'?'/auth/register':'/auth/login';
    const body=authMode==='register'?{username,email,password}:{login:username,password};
    const r=await api(path,{method:'POST',body:JSON.stringify(body)});currentUser=r.user;updateAuthUI();$('#authForm').hidden=true;$('#authForm').reset();
  }catch(err){msg.textContent=err.message==='email_service_not_configured'?'邮件服务尚未配置，暂时无法发送找回邮件。':err.message;}
});
const resetToken=new URLSearchParams(location.search).get('reset');
if(resetToken){$('#resetForm').hidden=false;$('#authForm').hidden=true;}
$('#resetForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#resetMessage');msg.textContent='正在更新……';try{const r=await api('/auth/reset',{method:'POST',body:JSON.stringify({token:resetToken,password:$('#resetPassword').value})});msg.textContent=r.message||'密码已更新';}catch(err){msg.textContent=err.message;}});
async function renderGuestbook(){
  const list=$('#guestList');list.replaceChildren();
  try{const result=await api('/api/guestbook');(result.entries||[]).forEach(entry=>{
    const item=document.createElement('div');item.className='guest-entry';const author=document.createElement('strong');author.textContent=entry.anonymous?'匿名访客':String(entry.display_name||'注册用户');
    const time=document.createElement('time');time.textContent=String(entry.created_at||'');const message=document.createElement('p');message.textContent=String(entry.message||'');item.append(author,time,message);list.append(item);
  });}catch{const n=document.createElement('p');n.className='muted';n.textContent='留言列表暂时无法加载。';list.append(n);}
}
$('#guestForm').addEventListener('submit',async e=>{
  e.preventDefault();const message=$('#guestMessage').value.trim();if(!message)return;
  const anonymous=document.querySelector('input[name="identityMode"]:checked').value==='anonymous';
  if(!anonymous&&!currentUser){alert('请先登录或注册；也可以选择匿名留言。');$('#authForm').hidden=false;setAuthMode('login');return;}
  try{await api('/api/guestbook',{method:'POST',body:JSON.stringify({message,anonymous})});$('#guestMessage').value='';await renderGuestbook();}
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
