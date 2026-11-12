const $ = (selector) => document.querySelector(selector);
const audio = $('#audio');
const themeToggle = $('#themeToggle');
const savedTheme = localStorage.getItem('mayrain-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('mayrain-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀' : '☾';
});

$('#menuToggle').addEventListener('click', () => {
  const nav = $('#mainNav');
  const open = nav.classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded', String(open));
});
$('#mainNav').querySelectorAll('a').forEach(a => a.addEventListener('click', () => $('#mainNav').classList.remove('open')));
$('#year').textContent = new Date().getFullYear();

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};
$('#audioFile').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  audio.src = URL.createObjectURL(file);
  $('#trackName').textContent = file.name.replace(/\.[^.]+$/, '');
  $('#trackStatus').textContent = '本地音频 · 仅当前页面会话使用';
  audio.play().catch(() => {});
  $('#playBtn').textContent = 'Ⅱ';
});
$('#playBtn').addEventListener('click', () => {
  if (!audio.src) { $('#trackStatus').textContent = '请先选择音频文件'; return; }
  if (audio.paused) { audio.play(); $('#playBtn').textContent = 'Ⅱ'; }
  else { audio.pause(); $('#playBtn').textContent = '▶'; }
});
audio.addEventListener('timeupdate', () => {
  $('#currentTime').textContent = formatTime(audio.currentTime);
  $('#duration').textContent = formatTime(audio.duration);
  $('#progress').value = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
});
audio.addEventListener('ended', () => $('#playBtn').textContent = '▶');
$('#progress').addEventListener('input', e => {
  if (audio.duration) audio.currentTime = audio.duration * Number(e.target.value) / 100;
});

const imageDialog = $('#imageDialog');
document.querySelectorAll('.gallery-item').forEach(item => item.addEventListener('click', () => {
  $('#lightboxImage').src = item.dataset.full;
  imageDialog.showModal();
}));
$('#closeImage').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', e => { if (e.target === imageDialog) imageDialog.close(); });

const postDialog = $('#postDialog');
$('#newPostBtn').addEventListener('click', () => postDialog.showModal());
$('#postForm').addEventListener('submit', e => {
  if (e.submitter?.value === 'cancel') return;
  e.preventDefault();
  const title = $('#postTitle').value.trim(), body = $('#postBody').value.trim();
  if (!title || !body) return;
  const posts = JSON.parse(localStorage.getItem('mayrain-posts') || '[]');
  posts.unshift({title, body, date: new Date().toLocaleDateString('zh-CN')});
  localStorage.setItem('mayrain-posts', JSON.stringify(posts));
  renderPosts(); postDialog.close(); $('#postForm').reset();
});
function renderPosts() {
  const posts = JSON.parse(localStorage.getItem('mayrain-posts') || '[]');
  const list = $('#blogList');
  list.querySelectorAll('[data-user-post]').forEach(el => el.remove());
  posts.forEach(post => {
    const article = document.createElement('article');
    article.className = 'post-card'; article.dataset.userPost = 'true';
    const date = document.createElement('span'); date.className = 'post-date'; date.textContent = `${post.date} · JOURNAL`;
    const title = document.createElement('h3'); title.textContent = post.title;
    const body = document.createElement('p'); body.textContent = post.body;
    const label = document.createElement('span'); label.className = 'mini-label'; label.textContent = 'PERSONAL NOTE';
    article.append(date, title, body, label); list.prepend(article);
  });
}
renderPosts();

$('#guestForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#guestName').value.trim(), message = $('#guestMessage').value.trim();
  if (!name || !message) return;
  const entries = JSON.parse(localStorage.getItem('mayrain-guestbook') || '[]');
  entries.unshift({name, message, date: new Date().toLocaleString('zh-CN')});
  localStorage.setItem('mayrain-guestbook', JSON.stringify(entries.slice(0, 30)));
  renderGuestbook(); e.target.reset();
});
function renderGuestbook() {
  const list = $('#guestList'); list.replaceChildren();
  const entries = JSON.parse(localStorage.getItem('mayrain-guestbook') || '[]');
  entries.forEach(entry => {
    const item = document.createElement('div'); item.className = 'guest-entry';
    const name = document.createElement('strong'); name.textContent = entry.name;
    const time = document.createElement('time'); time.textContent = entry.date;
    const message = document.createElement('p'); message.textContent = entry.message;
    item.append(name, time, message); list.append(item);
  });
}
renderGuestbook();

// Lightweight reveal animation, with reduced-motion accessibility support.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(items => items.forEach(item => {
    if (item.isIntersecting) { item.target.classList.add('revealed'); observer.unobserve(item.target); }
  }), {threshold: .12});
  document.querySelectorAll('.section, .panel, .game-card, .post-card').forEach(el => {
    el.classList.add('reveal'); observer.observe(el);
  });
                     }
