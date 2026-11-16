// MayRain account + guestbook Worker. Requires D1 binding DB and Resend-compatible email API.
const COOKIE = 'mr_session';
const encoder = new TextEncoder();
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
async function digest(value){ return b64u(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function passwordHash(password, salt){
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},material,256);
  return b64u(bits);
}
async function sign(payload, secret){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const body=b64u(encoder.encode(JSON.stringify(payload)));
  return `${body}.${b64u(await crypto.subtle.sign('HMAC',key,encoder.encode(body)))}`;
}
async function verify(token,secret){
  try{
    const [body,sig]=String(token||'').split('.'); if(!body||!sig) return null;
    const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('HMAC',key,unb64u(sig),encoder.encode(body))) return null;
    const payload=JSON.parse(new TextDecoder().decode(unb64u(body)));
    return payload.exp>Date.now()/1000?payload:null;
  }catch{return null;}
}
function cookie(value,maxAge=604800){return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;}
function getCookie(request,name){return (request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
function allowed(request,env){const expected=env.SITE_ORIGIN||'https://mayrain.me';const requestOrigin=request.headers.get('Origin');return new URL(request.url).origin===expected&&(!requestOrigin||requestOrigin===expected);}
function headers(env){return {'Access-Control-Allow-Origin':env.SITE_ORIGIN||'https://mayrain.me','Access-Control-Allow-Credentials':'true','Vary':'Origin'};}
async function currentUser(request,env){const s=await verify(getCookie(request,COOKIE),env.SESSION_SECRET); if(!s?.uid)return null; return env.DB.prepare('SELECT id, username, email FROM users WHERE id=?').bind(s.uid).first();}
async function sendMail(env,to,subject,html,text){
  if(!env.RESEND_API_KEY||!env.MAIL_FROM) throw new Error('email_not_configured');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject,html,text})});
  if(!r.ok) throw new Error(`email_provider_${r.status}`);
}
function validUsername(s){return /^[a-zA-Z0-9_]{3,20}$/.test(s);}
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;}
async function handle(request,env){
  const url=new URL(request.url); const h=headers(env);
  if(request.method==='OPTIONS') return new Response(null,{headers:{...h,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}});
  if(!allowed(request,env)) return json({error:'origin_not_allowed'},403,h);
  if(!env.DB||!env.SESSION_SECRET) return json({error:'server_not_configured'},503,h);
  try{
    if(url.pathname==='/api/me'&&request.method==='GET'){
      const u=await currentUser(request,env); return json({user:u?{id:u.id,username:u.username,email:u.email}:null},200,h);
    }
    if(url.pathname==='/auth/register'&&request.method==='POST'){
      const b=await request.json(); const username=String(b.username||'').trim(); const email=String(b.email||'').trim().toLowerCase(); const password=String(b.password||'');
      if(!validUsername(username))return json({error:'用户名需为3-20位字母、数字或下划线'},400,h);
      if(!validEmail(email))return json({error:'邮箱格式不正确'},400,h);
      if(password.length<10||password.length>128)return json({error:'密码长度需为10-128位'},400,h);
      const id=crypto.randomUUID(),salt=b64u(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt);
      try{await env.DB.prepare('INSERT INTO users(id,username,email,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)').bind(id,username,email,hash,salt,new Date().toISOString()).run();}
      catch{return json({error:'用户名或邮箱已被注册'},409,h);}
      const session=await sign({uid:id,exp:Date.now()/1000+604800},env.SESSION_SECRET);
      return json({ok:true,user:{id,username,email},message:'注册成功'},200,{...h,'Set-Cookie':cookie(session)});
    }
    if(url.pathname==='/auth/login'&&request.method==='POST'){
      const b=await request.json();const login=String(b.login||'').trim();const password=String(b.password||'');
      const u=await env.DB.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE LIMIT 1').bind(login,login).first();
      const hash=u?await passwordHash(password,u.password_salt):'';
      if(!u||hash!==u.password_hash)return json({error:'账号或密码错误'},401,h);
      const session=await sign({uid:u.id,exp:Date.now()/1000+604800},env.SESSION_SECRET);
      return json({ok:true,user:{id:u.id,username:u.username,email:u.email}},200,{...h,'Set-Cookie':cookie(session)});
    }
    if(url.pathname==='/auth/logout'&&request.method==='POST')return json({ok:true},200,{...h,'Set-Cookie':cookie('',0)});
    if(url.pathname==='/auth/forgot'&&request.method==='POST'){
      const b=await request.json();const email=String(b.email||'').trim().toLowerCase();
      if(!validEmail(email))return json({error:'邮箱格式不正确'},400,h);
      const u=await env.DB.prepare('SELECT id,email FROM users WHERE email=?').bind(email).first();
      if(u){const raw=b64u(crypto.getRandomValues(new Uint8Array(32)));const tokenHash=await digest(raw);const expires=Date.now()+30*60*1000;
        await env.DB.prepare('DELETE FROM password_resets WHERE user_id=?').bind(u.id).run();
        await env.DB.prepare('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash,u.id,expires).run();
        const link=`${env.SITE_ORIGIN}/?reset=${encodeURIComponent(raw)}#contact`;
        await sendMail(env,email,'MayRain 账号密码重置',`<p>你申请了密码重置。</p><p><a href="${link}">点击此处重置密码</a>（30分钟内有效）。</p><p>如果不是你本人操作，请忽略此邮件。</p>`,`重置密码：${link}\n链接30分钟内有效。`);
      }
      return json({ok:true,message:'如果该邮箱已注册，重置邮件将发送到邮箱。'},200,h);
    }
    if(url.pathname==='/auth/reset'&&request.method==='POST'){
      const b=await request.json();const token=String(b.token||'');const password=String(b.password||'');
      if(password.length<10||password.length>128)return json({error:'新密码长度需为10-128位'},400,h);
      const tokenHash=await digest(token);const row=await env.DB.prepare('SELECT user_id,expires_at FROM password_resets WHERE token_hash=?').bind(tokenHash).first();
      if(!row||row.expires_at<Date.now())return json({error:'重置链接无效或已过期'},400,h);
      const salt=b64u(crypto.getRandomValues(new Uint8Array(16)));const hash=await passwordHash(password,salt);
      await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(hash,salt,row.user_id),env.DB.prepare('DELETE FROM password_resets WHERE user_id=?').bind(row.user_id)]);
      return json({ok:true,message:'密码已更新，请重新登录'},200,{...h,'Set-Cookie':cookie('',0)});
    }
    if(url.pathname==='/api/guestbook'&&request.method==='GET'){
      const rows=await env.DB.prepare('SELECT id,display_name,anonymous,message,created_at FROM guestbook ORDER BY created_at DESC LIMIT 100').all();
      return json({entries:rows.results||[]},200,h);
    }
    if(url.pathname==='/api/guestbook'&&request.method==='POST'){
      const b=await request.json();const message=String(b.message||'').trim();if(!message||message.length>240)return json({error:'留言需为1-240字'},400,h);
      const anonymous=Boolean(b.anonymous);const u=anonymous?null:await currentUser(request,env);if(!anonymous&&!u)return json({error:'login_required'},401,h);
      const id=crypto.randomUUID();const displayName=anonymous?'匿名访客':u.username;
      await env.DB.prepare('INSERT INTO guestbook(id,user_id,display_name,anonymous,message,created_at) VALUES(?,?,?,?,?,?)').bind(id,u?.id||null,displayName,anonymous?1:0,message,new Date().toISOString()).run();
      return json({ok:true},200,h);
    }
    return new Response('Not found',{status:404});
  }catch(e){console.error('MayRain Worker error',e);return json({error:e.message==='email_not_configured'?'email_service_not_configured':'server_error'},e.message==='email_not_configured'?503:500,h);}
}
export default {fetch:handle};
