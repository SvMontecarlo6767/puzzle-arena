/* Puzzle Arena – Login, Freundesgruppe, Ranglisten, Duell, Reaktionen.
   Läuft VOR dem Tracker-Skript; der Tracker wird erst nach dem Login gestartet (bootTracker). */
(function(){
'use strict';
const ADMIN_EMAIL='momo.haskamp@gmail.com';
const FBCFG={
  apiKey:"AIzaSyDry0MDP_dXqhZgpP4PLNs5tMQbZbDotMI",
  authDomain:"puzzle-arena-c0f1a.firebaseapp.com",
  projectId:"puzzle-arena-c0f1a",
  storageBucket:"puzzle-arena-c0f1a.firebasestorage.app",
  messagingSenderId:"818353954357",
  appId:"1:818353954357:web:0e305c761bffc12d73db7c"
};
const EMOJIS=['👏','🔥','😮','😂','💀'];
const DEFAULT_LINKS={ner:'https://nerdlegame.com',glo:'https://globle-game.com',tra:'https://travle.earth',tim:'https://timeguessr.com',kri:'https://krillion.io',satl:'https://satle.ca',rsq:'https://rangesqueeze.com',fla:'https://flagle-game.com/daily',geo:'https://geotrivia.com/de/georankle',hm:'https://howmanydaily.com',ff:'https://farflung.game',blf:'https://www.bluffer.lol/herald.html',mpt:'https://maptap.gg',szw:'https://www.sueddeutsche.de/raetsel/wordle/aktuell?reduced=true'};
const TABS=[['me','🧩 Mein Tracker'],['board','🏆 Rangliste'],['rank','📅 Tagesranking'],['games','🎮 Spiele'],['games','🎮 Spiele'],['duel','⚔️ Duell'],['feed','💬 Feed'],['group','👥 Gruppe']];

firebase.initializeApp(FBCFG);
const auth=firebase.auth(),fs=firebase.firestore();
window.__FS=fs;

const A={user:null,uid:null,member:null,members:{},pubM:{},pubDays:{},pubSubs:{},pubReady:false,ver:{},cache:{},feed:[],
 game:null,gsort:'avg',tab:'me',booted:false,subs:[],rankDate:null,board:'week',cmp:'all',duel:{opp:null,per:'30'},profile:null,feedMine:false,threads:{},
 links:{},meDays:null,meDirty:true,pending:null,authMode:'login'};

const $g=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayIso=()=>isoOf(new Date());
const ad=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return isoOf(d)};
const fd=s=>s.split('-').reverse().join('.');
const fmt=n=>n==null?'–':(+n.toFixed(1)).toLocaleString('de-DE');
const nickOf=u=>(A.members[u]&&A.members[u].nick)||'Ehemalig';
const poss=n=>/[sxzß]$/i.test(n)?n+'’':n+'s';
const lk=()=>A.uid+':';
const joinDate=u=>isoOf(new Date((A.members[u]&&A.members[u].joined)||0));
function gameUrl(id){const u=(id in A.links)?A.links[id]:DEFAULT_LINKS[id];return /^https?:\/\//i.test(u||'')?u:''}
function linkHTML(id){const u=gameUrl(id);return u?` <a class="paLink" href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="Spiel öffnen">↗</a>`:''}
window.__linkHTML=linkHTML;
/* Reihenfolge der Eingabefelder: Admin (Momo) behält die Standard-Reihenfolge, alle anderen bekommen eine feste, persönliche Reihenfolge */
function seededOrder(arr,seed){
 let h=2166136261;for(const ch of seed){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 const rnd=()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
 const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;
}
window.__order=arr=>{
 const momo=(A.user&&(A.user.email||'').toLowerCase()===ADMIN_EMAIL)||(A.uid&&A.uid===A.groupAdmin);
 return momo||!A.uid?arr:seededOrder(arr,A.uid);
};
const medal=r=>r===1?'🥇':r===2?'🥈':r===3?'🥉':String(r);

/* ============ Screens ============ */
function showScreen(html){$g('paScreen').innerHTML=html;$g('paScreen').style.display='block';$g('paApp').hidden=true}
function showApp(){$g('paScreen').style.display='none';$g('paScreen').innerHTML='';$g('paApp').hidden=false}
function authErr(e){
 const c=(e&&e.code)||'';
 if(c==='auth/email-already-in-use')return 'Diese E-Mail ist schon registriert – bitte einloggen.';
 if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(c))return 'E-Mail oder Passwort falsch.';
 if(c==='auth/weak-password')return 'Passwort: mindestens 6 Zeichen.';
 if(c==='auth/invalid-email')return 'Bitte eine gültige E-Mail eingeben.';
 if(c==='auth/too-many-requests')return 'Zu viele Versuche – bitte kurz warten.';
 if(c==='auth/network-request-failed')return 'Keine Verbindung – bitte Internet prüfen.';
 if(c==='permission-denied')return 'Einladungscode falsch.';
 return (e&&e.message)||'Fehler';
}
function authScreen(msg,info){
 const reg=A.authMode==='register';
 showScreen(`<div class="paAuth card">
  <h1>🧩 Puzzle Arena</h1>
  <div class="hint" style="margin-bottom:12px">Tägliche Puzzles – im Wettbewerb mit deinen Freunden.</div>
  <div class="tools"><button data-a="mode" data-m="login" class="${reg?'':'on'}">Einloggen</button><button data-a="mode" data-m="register" class="${reg?'on':''}">Registrieren</button></div>
  <form id="paAuthForm" autocomplete="on">
   ${reg?'<label>Spitzname (so sehen dich deine Freunde)</label><input id="paNick" maxlength="20" placeholder="z. B. Momo" autocomplete="nickname" required>':''}
   <label>E-Mail</label><input id="paEmail" type="email" autocomplete="email" required>
   <label>Passwort</label><input id="paPw" type="password" autocomplete="${reg?'new-password':'current-password'}" required minlength="6">
   ${reg?'<label>Einladungscode</label><input id="paCode" placeholder="Code von Momo" autocapitalize="characters" required>':''}
   <button class="paBtn" type="submit">${reg?'Konto erstellen':'Einloggen'}</button>
  </form>
  ${reg?'':'<div style="margin-top:10px"><a href="#" data-a="reset" class="hint">Passwort vergessen?</a></div>'}
  <div class="paMsg ${info?'ok':''}" id="paAuthMsg">${esc(msg||'')}</div></div>`);
 const f=$g('paAuthForm');
 f.onsubmit=async ev=>{
  ev.preventDefault();const m=$g('paAuthMsg');m.className='paMsg';m.textContent='…';
  const email=$g('paEmail').value.trim().toLowerCase(),pw=$g('paPw').value;
  try{
   if(reg){
    const nick=$g('paNick').value.trim(),code=$g('paCode').value.trim().toUpperCase();
    if(nick.length<2||nick.length>20){m.textContent='Spitzname: 2–20 Zeichen.';return}
    A.pending={nick,code};
    await auth.createUserWithEmailAndPassword(email,pw);
  }else await auth.signInWithEmailAndPassword(email,pw);
  }catch(e){A.pending=null;m.textContent=authErr(e)}
 };
}
$g('paScreen').addEventListener('click',async ev=>{
 const t=ev.target.closest('[data-a]');if(!t)return;ev.preventDefault();
 if(t.dataset.a==='mode'){A.authMode=t.dataset.m;authScreen()}
 if(t.dataset.a==='reset'){
  const em=($g('paEmail').value||'').trim().toLowerCase();
  if(!em){$g('paAuthMsg').textContent='Bitte oben deine E-Mail eintragen.';return}
  try{await auth.sendPasswordResetEmail(em);authScreen('Mail zum Zurücksetzen ist unterwegs.',true)}catch(e){$g('paAuthMsg').textContent=authErr(e)}
 }
 if(t.dataset.a==='logout')doLogout();
});
function joinScreen(msg,canCreate){
 const pn=(A.pending&&A.pending.nick)||'',pc=(A.pending&&A.pending.code)||'';
 showScreen(`<div class="paAuth card"><h1>🧩 Fast geschafft</h1>
  <div class="hint" style="margin-bottom:10px">Angemeldet als ${esc(A.user.email)}. ${canCreate?'Du bist der Admin: lege jetzt die Freundesgruppe an.':'Gib den Einladungscode ein, um der Gruppe beizutreten.'}</div>
  <form id="paJoinForm">
   <label>Spitzname</label><input id="paNick" maxlength="20" value="${esc(pn)}" required>
   ${canCreate?'':`<label>Einladungscode</label><input id="paCode" value="${esc(pc)}" autocapitalize="characters" required>`}
   <button class="paBtn" type="submit">${canCreate?'Gruppe anlegen':'Beitreten'}</button>
  </form>
  <div class="paMsg" id="paJoinMsg">${esc(msg||'')}</div>
  <div style="margin-top:12px"><a href="#" data-a="logout" class="hint">Abmelden</a></div></div>`);
 $g('paJoinForm').onsubmit=async ev=>{
  ev.preventDefault();const m=$g('paJoinMsg');m.textContent='…';
  const nick=$g('paNick').value.trim();
  if(nick.length<2||nick.length>20){m.textContent='Spitzname: 2–20 Zeichen.';return}
  try{
   if(canCreate)await createGroup(nick);else await joinGroup(nick,$g('paCode').value.trim().toUpperCase());
  }catch(e){m.textContent=authErr(e)}
 };
}
async function joinGroup(nick,code){
 await fs.doc('members/'+A.uid).set({nick,code,joined:Date.now()});
 A.member={nick,code};A.pending=null;enter();
}
async function createGroup(nick){
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';
 const r=new Uint32Array(8);crypto.getRandomValues(r);r.forEach(v=>code+=chars[v%chars.length]);
 await fs.doc('groups/main').set({code,adminUid:A.uid,created:Date.now()});
 A.groupAdmin=A.uid;
 await joinGroup(nick,code);
}
function doLogout(){auth.signOut().then(()=>location.reload())}

/* ============ Auth-Fluss ============ */
auth.onAuthStateChanged(async u=>{
 if(A.booted&&(!u||u.uid!==A.uid)){location.reload();return}
 A.user=u;A.uid=u&&u.uid;
 if(!u){authScreen();return}
 showScreen('<div class="paAuth card"><h1>🧩 Puzzle Arena</h1><div class="hint">Lade …</div></div>');
 try{
  const m=await fs.doc('members/'+u.uid).get();
  if(m.exists){A.member=m.data();enter();return}
 }catch(e){}
 let groupExists=true;
 if((u.email||'').toLowerCase()===ADMIN_EMAIL){
  try{groupExists=(await fs.doc('groups/main').get()).exists}catch(e){groupExists=true}
 }
 if(A.pending&&groupExists){
  try{await joinGroup(A.pending.nick,A.pending.code);return}catch(e){joinScreen(authErr(e));return}
 }
 joinScreen('',!groupExists);
});

/* ============ App starten ============ */
function enter(){
 window.__UID=A.uid;window.__LK=lk();
 window.__pubHook=()=>{A.meDirty=true;A.ver[A.uid]=(A.ver[A.uid]||0)+1;clearTimeout(A.pubT);A.pubT=setTimeout(pubSync,1500);if(A.booted&&A.tab!=='me')scheduleRender()};
 showApp();
 startListeners();renderBar();showTab('me');
 if(!A.booted){
  A.booted=true;
  const s=document.createElement('script');s.textContent=$g('trackerSrc').textContent;document.body.appendChild(s);
 }
}
function stopListeners(){A.subs.forEach(f=>{try{f()}catch(e){}});A.subs=[];Object.values(A.pubSubs).forEach(f=>{try{f()}catch(e){}});A.pubSubs={}}
function startListeners(){
 stopListeners();
 A.subs.push(fs.collection('members').onSnapshot(s=>{
  const m={};s.forEach(d=>m[d.id]=d.data());A.members=m;
  if(!m[A.uid]&&s.size&&!s.metadata.fromCache){showScreen('<div class="paAuth card"><h1>Hinweis</h1><div class="hint">Du bist nicht mehr Mitglied der Gruppe.</div><div style="margin-top:12px"><a href="#" data-a="logout">Abmelden</a></div></div>');return}
  syncPubSubs();renderBar();scheduleRender();
 },e=>console.warn('members',e)));
 A.subs.push(fs.doc('groups/main').onSnapshot(g=>{if(!g.exists)return;const d=g.data()||{};A.groupAdmin=d.adminUid;A.links=d.links||{};
  const ae=document.activeElement;if(typeof form==='function'&&!(ae&&ae.closest&&ae.closest('#form')))try{form()}catch(e){}
  scheduleRender()},e=>console.warn('group',e)));
 const cut=ad(todayIso(),-120);
 A.subs.push(fs.collection('feed').where('date','>=',cut).onSnapshot(s=>{
  A.feed=s.docs.map(d=>Object.assign({id:d.id},d.data()));renderBar();scheduleRender();
 },e=>console.warn('feed',e)));
}
function syncPubSubs(){
 Object.keys(A.members).forEach(uid=>{
  if(A.pubSubs[uid])return;
  A.pubSubs[uid]=fs.collection('pub/'+uid+'/months').onSnapshot(s=>{
   const m=A.pubM[uid]=A.pubM[uid]||{};
   s.docChanges().forEach(c=>{if(c.type==='removed')delete m[c.doc.id];else m[c.doc.id]=(c.doc.data()||{}).days||{}});
   const flat={};Object.keys(m).sort().forEach(k=>Object.assign(flat,m[k]));
   A.pubDays[uid]=flat;A.ver[uid]=(A.ver[uid]||0)+1;
   if(uid===A.uid&&!A.pubReady){A.pubReady=true;pubSync()}
   scheduleRender();
  },e=>console.warn('pub',e));
 });
}

/* ============ Öffentliche Ergebnisse veröffentlichen ============ */
function stripDays(src){
 const out={};
 for(const d in src){const day=src[d],o={};
  for(const k in day){if(k==='note')continue;const e=day[k];if(!e||typeof e!=='object')continue;
   const c={};if(e.s!=null&&e.s!=='')c.s=String(e.s);if(e.w!=null)c.w=e.w;if(e.hint)c.hint=true;
   if(Object.keys(c).length)o[k]=c}
  if(Object.keys(o).length)out[d]=o}
 return out;
}
function daysOf(uid){
 if(uid===A.uid){if(A.meDirty||!A.meDays){A.meDays=stripDays(D);A.meDirty=false}return A.meDays}
 return A.pubDays[uid]||{};
}
let pubBusy=false;
async function pubSync(){
 if(!A.uid||!A.booted)return;
 if(!A.pubReady){setTimeout(pubSync,1000);return}
 if(pubBusy){A.pubAgain=true;return}
 pubBusy=true;
 try{
  const mine=daysOf(A.uid),months={};
  Object.keys(mine).forEach(d=>{const m=d.slice(0,7);(months[m]=months[m]||{})[d]=mine[d]});
  const have=A.pubM[A.uid]||{};
  for(const m of Object.keys(months)){
   if(canon(have[m]||null)===canon(months[m]))continue;
   await fs.doc('pub/'+A.uid+'/months/'+m).set({days:months[m],t:Date.now()});
  }
  for(const m of Object.keys(have))if(!months[m])await fs.doc('pub/'+A.uid+'/months/'+m).delete();
 }catch(e){console.warn('pubSync',e);setTimeout(pubSync,8000)}
 pubBusy=false;
 if(A.pubAgain){A.pubAgain=false;pubSync()}
}

/* ============ Auswertung (nutzt die Tracker-Funktionen mit getauschten Daten) ============ */
function withData(days,fn){
 const sD=D,sR=RANGE;
 D=JSON.parse(JSON.stringify(days));RANGE={mode:'all',from:null,to:null};
 try{return fn()}finally{D=sD;RANGE=sR}
}
function streakOf(dates){
 const set=new Set(dates);let cur=0,d=todayIso();
 if(!set.has(d))d=ad(d,-1);
 while(set.has(d)){cur++;d=ad(d,-1)}
 let best=0,run=0,prev=null;
 [...dates].sort().forEach(x=>{run=(prev&&ad(prev,1)===x)?run+1:1;if(run>best)best=run;prev=x});
 return{cur,best};
}
function summary(uid){
 const v=A.ver[uid]||0,c=A.cache[uid];
 if(c&&c.v===v)return c.s;
 const days=daysOf(uid);
 const s=withData(days,()=>{
  const per={};GA.forEach(g=>{per[g.id]=gameRatingSeries(g)});
  const tl=overallTimeline(per);
  const last=tl.overallSeries[tl.overallSeries.length-1];
  const dates=Object.keys(D).sort(),dp={};
  dates.forEach(d=>{const p=dayPct(d);if(p!=null)dp[d]=p});
  const gs={};
  G.forEach(g=>{const st=stats(g);
   gs[g.id]={played:st.played,wins:st.wins,avg:st.avg,bt:st.bt,rate:g.win&&st.played?st.wins/st.played:null,rating:tl.current[g.id]!=null?tl.current[g.id]:null}});
  const dc=computeDopamineCtx(),dper={};G.forEach(g=>{dper[g.id]=dc.perGame[g.id].sumTotal});
  const dday={};dc.daySeries.forEach(x=>{dday[x.date]=x.delta});
  return{rating:last?last.overall:null,series:tl.overallSeries,calib:Object.keys(tl.current).length,dp,dates,gs,dop:{total:dc.totalAll,per:dper,day:dday}};
 });
 s.streak=streakOf(s.dates);{const k=Object.keys(s.dp);const all=k.length?k.reduce((a,d)=>a+s.dp[d],0)/k.length:null,f7=avgLast(s.dp,7);s.trend=(k.length>=8&&all!=null&&f7!=null)?f7-all:null;s.f7=f7;s.fall=all}
 A.cache[uid]={v,s};return s;
}
const avgLast=(dp,n)=>{const k=Object.keys(dp).sort().slice(-n);return k.length?k.reduce((a,d)=>a+dp[d],0)/k.length:null};
function entryKey(g,e){
 if(!e)return null;
 if((e.s==null||e.s==='')&&e.w==null)return null;
 if(e.w===0)return -Infinity;
 let n=num(e.s);
 if(n!=null){
  if(g.hint&&e.hint)n=g.dir==='low'?n+HINT_PENALTY:n-HINT_PENALTY;
  if(g.dir)return g.dir==='low'?-n:n;
 }
 if(e.w===1)return Infinity;
 return -Infinity;
}
function valText(g,e){
 if(!e)return '–';
 if(e.w===0)return '✗';
 return (e.s!=null&&e.s!==''?e.s:'✓')+(e.hint?' 💡':'');
}
function boardFor(date,g){
 const arr=[],uids=Object.keys(A.members);
 if(!uids.some(u=>entryKey(g,(daysOf(u)[date]||{})[g.id])!=null))return arr;
 uids.forEach(uid=>{
  const e=(daysOf(uid)[date]||{})[g.id],k=entryKey(g,e);
  if(k!=null)arr.push({uid,e,k:k===-Infinity?-1e300:k,np:false});
  else if(g.active!==false&&date>=joinDate(uid))arr.push({uid,e:null,k:-Infinity,np:true});
 });
 arr.sort((a,b)=>a.k===b.k?0:(a.k>b.k?-1:1));
 arr.forEach(r=>{r.rank=1+arr.filter(x=>x.k>r.k).length});
 return arr;
}
function periodAll(from,to){
 const tot={},per={};
 Object.keys(A.members).forEach(u=>tot[u]={pts:0,wins:0,games:0});
 G.forEach(g=>{per[g.id]={};Object.keys(A.members).forEach(u=>per[g.id][u]={pts:0,wins:0,games:0})});
 for(let d=from;d<=to;d=ad(d,1)){
  G.forEach(g=>{
   const b=boardFor(d,g);if(b.length<2)return;
   b.filter(r=>!r.np).forEach(r=>{
    const worse=b.filter(x=>x.k<r.k).length,tie=b.filter(x=>x.k===r.k&&x!==r).length,pts=worse+tie*0.5,w=r.rank===1?1:0;
    [tot[r.uid],per[g.id][r.uid]].forEach(o=>{o.pts+=pts;o.games++;o.wins+=w});
   });
  });
 }
 return{tot,per};
}
const periodStats=(from,to)=>periodAll(from,to).tot;
function rangeFrom(mode,t){
 if(mode==='week')return mondayOf(t);
 if(mode==='month')return t.slice(0,8)+'01';
 let first=t;Object.keys(A.members).forEach(u=>{const k=Object.keys(daysOf(u)).sort()[0];if(k&&k<first)first=k});
 return first;
}

/* ============ Rendering ============ */
let renderPending=false;
function scheduleRender(){
 const ae=document.activeElement;
 if(ae&&ae.tagName==='INPUT'&&ae.closest&&ae.closest('#paView')&&A.tab!=='me'){renderPending=true;return}
 renderView();
}
document.addEventListener('focusout',()=>{if(renderPending){renderPending=false;setTimeout(renderView,50)}});
function unseenCount(){
 let seen=0;try{seen=+localStorage.getItem(lk()+'pa-feedseen')||0}catch(e){}
 return A.feed.filter(x=>x.to===A.uid&&x.from!==A.uid&&x.ts>seen).length;
}
function renderBar(){
 if(!A.uid)return;
 const n=unseenCount();
 $g('paBar').innerHTML=`<div class="paTop"><b>🧩 Puzzle Arena</b><span class="paWho">${esc(nickOf(A.uid)||'')}</span></div>
  <div class="paTabs">${TABS.map(([k,l])=>`<button data-tab="${k}" class="${A.tab===k?'on':''}">${l}${k==='feed'&&n?` <span class="paBadge">${n}</span>`:''}</button>`).join('')}</div>`;
}
function showTab(t){
 A.tab=t;
 $g('trackerView').style.display=t==='me'?'':'none';
 $g('paView').style.display=t==='me'?'none':'';
 if(t==='feed'){try{localStorage.setItem(lk()+'pa-feedseen',String(Date.now()))}catch(e){}}
 renderBar();renderView();
 if(t==='me')window.scrollTo(0,0);
}
function renderView(){
 if(A.tab==='me'||typeof D==='undefined')return;
 const v=$g('paView'),fn={board:viewBoard,rank:viewRank,games:viewGames,duel:viewDuel,feed:viewFeed,group:viewGroup}[A.tab];
 if(!fn)return;
 try{v.innerHTML=fn()}catch(e){console.error(e);v.innerHTML='<div class="card hint">Anzeige-Fehler: '+esc(e.message)+'</div>'}
 if(A.tab==='feed')renderBar();
}
$g('paBar').addEventListener('click',ev=>{const b=ev.target.closest('[data-tab]');if(b)showTab(b.dataset.tab)});

/* --- Rangliste --- */
function leagueBadge(r){
 if(r==null)return '';
 const lg=TIERS[leagueOfRating(r)];
 return `<span class="paLg" style="background:${lg.c}">${lg.n}</span>`;
}
function viewBoard(){
 const t=todayIso(),uids=Object.keys(A.members);
 if(!['week','month','all','dop'].includes(A.board))A.board='week';
 const mode=A.board;
 if(mode==='dop')return viewDop(uids,t);
 const from=rangeFrom(mode,t);
 const ps=periodStats(from,t);
 const rows=uids.map(uid=>({uid,x:ps[uid]})).sort((a,b)=>b.x.pts-a.x.pts||b.x.wins-a.x.wins);
 const info={week:'Mo bis heute',month:'dieser Monat',all:'seit dem ersten Eintrag'}[mode];
 let h=`<div class="card"><h2>Rangliste<small>${info}</small></h2>
  <div class="tools"><button data-board="week" class="${mode==='week'?'on':''}">Woche</button><button data-board="month" class="${mode==='month'?'on':''}">Monat</button><button data-board="all" class="${mode==='all'?'on':''}">Gesamt</button><button data-board="dop" class="${mode==='dop'?'on':''}">🧠 Dopamin</button></div>
  <div class="hint" style="margin-bottom:6px">Punkte: pro Spiel und Tag 1 Punkt für jeden Mitspieler, den du schlägst (Gleichstand 0,5). Nicht gespielt = Letzter, ohne Punkte.</div>`;
 h+=rows.map((r,i)=>`<div class="paRow paClick ${r.uid===A.uid?'me':''}" data-prof="${r.uid}">
   <div class="paRk">${medal(i+1)}</div>
   <div class="paMain"><div class="paNm">${esc(nickOf(r.uid))}${r.uid===A.uid?' <small>(du)</small>':''}</div><div class="hint">${r.x.wins} Tagessiege · ${r.x.games} gespielte Wertungen</div></div>
   <div class="paBig">${fmt(r.x.pts)}</div></div>`).join('');
 h+='</div>';
 if(A.profile&&A.members[A.profile])h+=profileHTML(A.profile);
 else h+='<div class="hint" style="margin:0 4px 12px">Tippe auf einen Namen, um das Dashboard zu sehen.</div>';
 return h;
}
function viewDop(uids,t){
 const rows=uids.map(u=>{const s=summary(u),d=s.dop;
  const sum=n=>{let x=0;for(let i=0;i<n;i++)x+=d.day[ad(t,-i)]||0;return x};
  return{uid:u,total:d.total,today:d.day[t]||0,w7:sum(7)}}).sort((a,b)=>b.total-a.total);
 let h=`<div class="card"><h2>Rangliste<small>wer hat am meisten Dopamin?</small></h2>
  <div class="tools"><button data-board="week">Woche</button><button data-board="month">Monat</button><button data-board="all">Gesamt</button><button data-board="dop" class="on">🧠 Dopamin</button></div>
  <div class="hint" style="margin-bottom:6px">Dopamin-Punkte aus dem Tracker: Punkte pro Ergebnis, Highscores und Abzüge für ✗. Wer mehr spielt, sammelt mehr.</div>`;
 h+=rows.map((r,i)=>{const rk=dopRankOf(r.total).cur;
  return `<div class="paRow paClick ${r.uid===A.uid?'me':''}" data-prof="${r.uid}"><div class="paRk">${medal(i+1)}</div>
   <div class="paMain"><div class="paNm">${esc(nickOf(r.uid))}${r.uid===A.uid?' <small>(du)</small>':''}</div><div class="hint">${rk.icon} ${esc(rk.n)} · heute ${r.today>=0?'+':''}${Math.round(r.today)} · 7 Tage ${r.w7>=0?'+':''}${Math.round(r.w7)}</div></div>
   <div class="paBig">${Math.round(r.total).toLocaleString('de-DE')}</div></div>`}).join('')+'</div>';
 if(A.profile&&A.members[A.profile])h+=profileHTML(A.profile);
 return h;
}
function viewGames(){
 const t=todayIso(),uids=Object.keys(A.members),mode=A.cmp,from=rangeFrom(mode,t),pa=periodAll(from,t);
 let h=`<div class="card"><h2>Spiele-Vergleich<small>wer ist bei welchem Spiel am besten?</small></h2>
  <div class="tools"><button data-cmp="week" class="${mode==='week'?'on':''}">Woche</button><button data-cmp="month" class="${mode==='month'?'on':''}">Monat</button><button data-cmp="all" class="${mode==='all'?'on':''}">Gesamt</button></div>
  <div class="hint">Sortiert nach Punkten aus den Direktvergleichen. Ø, Bestwert und Dopamin gelten über alle Einträge.</div></div>`;
 G.forEach(g=>{
  const sums=uids.map(u=>({u,s:summary(u).gs[g.id],d:summary(u).dop.per[g.id],x:pa.per[g.id][u]}));
  if(!sums.some(r=>r.s.played>0))return;
  sums.sort((a,b)=>b.x.pts-a.x.pts||b.x.wins-a.x.wins||(b.s.played-a.s.played));
  h+=`<div class="card"><h2>${esc(g.n)}${linkHTML(g.id)}${g.active===false?' <small>(inaktiv)</small>':''}</h2><div class="scroll"><table class="paTbl"><tr><th></th><th>Name</th><th>Pkt</th><th>Siege</th><th>Ø</th><th>Best</th><th>🧠</th></tr>`+
   sums.map((r,i)=>`<tr class="${r.u===A.uid?'paMeRow':''}"><td>${medal(i+1)}</td><td>${esc(nickOf(r.u))}</td><td><b>${fmt(r.x.pts)}</b></td><td>${r.x.wins}</td><td>${r.s.played?fmt(r.s.avg):'–'}</td><td>${r.s.played?fmt(r.s.bt):'–'}</td><td>${r.s.played?Math.round(r.d):'–'}</td></tr>`).join('')+'</table></div></div>';
 });
 return h;
}
function profileHTML(uid){
 const t=todayIso(),all=daysOf(uid),hist={};
 Object.keys(all).forEach(d=>{hist[d]=all[d]});
 const nick=nickOf(uid);
 const body=withData(hist,()=>{
  const days=Object.keys(D).sort();
  if(!days.length)return '<div class="hint">Noch keine Einträge.</div>';
  const ST=G.map(g=>[g,stats(g)]);
  let played=0,wins=0,wp=0;ST.forEach(([g,s])=>{played+=s.played;if(g.win){wins+=s.wins;wp+=s.played}});
  const full=days.filter(d=>GA.every(g=>D[d][g.id])).length;
  const st=streakOf(days);
  const per={};GA.forEach(g=>{per[g.id]=gameRatingSeries(g)});
  const tl=overallTimeline(per),last=tl.overallSeries[tl.overallSeries.length-1];
  const dp=dayStats(),avgAll=dp.length?dp.reduce((a,b)=>a+b.p,0)/dp.length:null;
  const l7=dp.slice(-7),f7=l7.length?l7.reduce((a,b)=>a+b.p,0)/l7.length:null;
  const bestDay=dp.length?dp.reduce((a,b)=>b.p>a.p?b:a):null;
  let h=`<div class="chips">${chip(days.length,'Tage erfasst')+chip(st.best,'Längste Serie')+chip(played,'Puzzles gespielt')+chip(wp?Math.round(wins/wp*100)+' %':'–','Siegquote')+chip(full,'Komplette Tage')+chip(last?Math.round(last.overall):'–','Rating')}</div>`;
  if(tl.overallSeries.length>1){
   const pts=tl.overallSeries.slice(-60).map(p=>p.overall),mn=Math.min(...pts),mx=Math.max(...pts),sp=(mx-mn)||1,W=300,H=60;
   h+=`<h3>Rating-Verlauf ${last?`<span class="paLg" style="background:${TIERS[leagueOfRating(last.overall)].c}">${TIERS[leagueOfRating(last.overall)].n}</span>`:''}</h3><svg viewBox="0 0 ${W} ${H}" class="paSpark"><polyline fill="none" stroke="var(--ac)" stroke-width="2" points="${pts.map((v,i)=>`${(2+i*(W-4)/(pts.length-1)).toFixed(1)},${(H-4-(v-mn)*(H-8)/sp).toFixed(1)}`).join(' ')}"/></svg>`;
  }
  h+=`<h3>Tagesform</h3><div class="chips">${chip(fmt(avgAll),'Ø aller Tage')+chip(fmt(f7),'Ø 7 Tage')+chip(bestDay?fd(bestDay.d)+' ('+fmt(bestDay.p)+')':'–','Bester Tag')}</div>${dayLine(dp)}`;
  h+=`<h3>Form aktuell</h3>${radarChart()}<h3>Wochentage</h3>${weekdayBars()}`;
  const dd=[];for(let i=27;i>=0;i--)dd.push(ad(t,-i));
  h+=`<h3>Aktivität (letzte 28 Tage)</h3><div class="paAct">${dd.map(d=>{const n=D[d]?Object.keys(D[d]).length:0;return `<i title="${fd(d)}: ${n} Spiele" style="${n?`background:var(--ac);opacity:${Math.min(1,.25+n*.1)}`:''}"></i>`}).join('')}</div>`;
  return h+'@@GAMES@@'+ST.filter(([g,s])=>s.played>0).map(([g,s])=>{
   const rec=records().find(r=>r[0].id===g.id);
   return `<div class="paGame"><h3>${esc(g.n)}${linkHTML(g.id)}${g.active===false?' <small>(inaktiv)</small>':''}</h3>
   <div class="chips">${chip(s.played,'Gespielt')+chip(fmt(s.avg),'Ø')+chip(rec&&rec[1]!=null?fmt(rec[1]):'–','Bestwert')}</div>${line(g,s)}${dist(g,s)}</div>`}).join('');
 });
 const [top,games]=body.split('@@GAMES@@');
 return `<div class="card"><h2>Dashboard: ${esc(nick)}<small>nur Ergebnisse, keine Lösungen</small></h2>${top}</div>${games?`<div class="card"><h2>Spiele</h2>${games}</div>`:''}`;
}

/* --- Tagesranking --- */
function reactionBar(to,date,g){
 const items=A.feed.filter(x=>x.to===to&&x.date===date&&x.gid===g.id);
 const key=`${to}|${date}|${g.id}`;
 const cm=items.filter(x=>x.kind==='c').sort((a,b)=>a.ts-b.ts);
 let h='<div class="paReact">';
 EMOJIS.forEach((em,i)=>{
  const rs=items.filter(x=>x.kind==='r'&&x.emoji===em),mine=rs.some(x=>x.from===A.uid);
  h+=`<button class="paEm ${mine?'on':''}" data-react="${i}" data-k="${esc(key)}" title="${esc(rs.map(x=>nickOf(x.from)).join(', '))}">${em}${rs.length?` <b>${rs.length}</b>`:''}</button>`;
 });
 h+=`<button class="paEm" data-thread="${esc(key)}">💬${cm.length?` <b>${cm.length}</b>`:''}</button></div>`;
 if(A.threads[key]){
  h+=`<div class="paThread">${cm.map(c=>`<div class="paCm"><b>${esc(nickOf(c.from))}</b> ${esc(c.text)}${c.from===A.uid?` <a href="#" data-delc="${c.id}" class="hint">löschen</a>`:''}</div>`).join('')}
   <div class="paCin"><input maxlength="300" placeholder="Kommentar …" data-cin="${esc(key)}"><button data-send="${esc(key)}">Senden</button></div></div>`;
 }
 return h;
}
function viewRank(){
 const d=A.rankDate||todayIso();
 let h=`<div class="card"><h2>Tagesranking</h2>
  <div class="datebar"><button data-rd="-1">‹</button><input type="date" id="paRankDate" value="${d}"><button data-rd="1">›</button><button data-rd="0">Heute</button></div>
  <div class="hint">Wer war bei welchem Spiel am besten? Reagiere mit Emojis oder schreib einen Kommentar.</div></div>`;
 let any=false;
 G.forEach(g=>{
  const b=boardFor(d,g);if(!b.length)return;any=true;
  h+=`<div class="card"><h2>${esc(g.n)}${linkHTML(g.id)}<small>${b.filter(r=>!r.np).length} gespielt</small></h2>`+
   b.map(r=>r.np?`<div class="paRowW ${r.uid===A.uid?'me':''}"><div class="paRow"><div class="paRk">–</div>
     <div class="paMain"><div class="paNm">${esc(nickOf(r.uid))}${r.uid===A.uid?' <small>(du)</small>':''}</div></div>
     <div class="paBig sm hint">nicht gespielt</div></div></div>`:`<div class="paRowW ${r.uid===A.uid?'me':''}"><div class="paRow"><div class="paRk">${medal(r.rank)}</div>
     <div class="paMain"><div class="paNm">${esc(nickOf(r.uid))}${r.uid===A.uid?' <small>(du)</small>':''}</div></div>
     <div class="paBig sm">${esc(valText(g,r.e))}</div></div>${reactionBar(r.uid,d,g)}</div>`).join('')+'</div>';
 });
 if(!any)h+='<div class="card hint">Für diesen Tag hat noch niemand etwas eingetragen.</div>';
 return h;
}

/* --- Spiele-Vergleich --- */
function viewGames(){
 const uids=Object.keys(A.members),sums={};uids.forEach(u=>sums[u]=summary(u));
 const withData_=g=>uids.some(u=>sums[u].gs[g.id].played>0);
 const gl=G.filter(withData_);
 if(!A.game||!gl.some(g=>g.id===A.game))A.game=(gl[0]||{}).id;
 const g=G.find(x=>x.id===A.game);
 let h='';
 if(g){
  const rows=uids.filter(u=>sums[u].gs[g.id].played>0).map(u=>({u,x:Object.assign({},sums[u].gs[g.id],{dop:sums[u].dop.per[g.id]||0})}));
  const sk=A.gsort,dirLow=g.dir==='low';
  const key={avg:r=>r.x.avg==null?null:(dirLow?-r.x.avg:r.x.avg),best:r=>r.x.bt==null?null:(dirLow?-r.x.bt:r.x.bt),rate:r=>r.x.rate,dop:r=>r.x.dop,played:r=>r.x.played}[sk];
  rows.sort((a,b)=>{const x=key(a),y=key(b);return (y==null?-1e18:y)-(x==null?-1e18:x)});
  h+=`<div class="card"><h2>Spiele-Vergleich${linkHTML(g.id)}</h2><select id="paGameSel">${gl.map(x=>`<option value="${x.id}" ${x.id===g.id?'selected':''}>${esc(x.n)}</option>`).join('')}</select>
   <div class="tools" style="margin-top:8px">${[['avg','Ø'],['best','Bestwert'],['rate','Quote'],['dop','Dopamin'],['played','Gespielt']].map(([k,l])=>`<button data-gsort="${k}" class="${sk===k?'on':''}">${l}</button>`).join('')}</div>
   <div class="scroll"><table class="paTbl"><tr><th></th><th>Spieler</th><th>Ø</th><th>Best</th><th>Quote</th><th>Dopamin</th><th>Gesp.</th></tr>`+
   rows.map((r,i)=>`<tr class="${r.u===A.uid?'paMeRow':''}"><td>${medal(i+1)}</td><td>${esc(nickOf(r.u))}</td><td>${fmt(r.x.avg)}</td><td>${fmt(r.x.bt)}</td><td>${r.x.rate==null?'–':Math.round(r.x.rate*100)+' %'}</td><td>${r.x.dop}</td><td>${r.x.played}</td></tr>`).join('')+
   `</table></div><div class="hint" style="margin-top:6px">${dirLow?'Niedrigerer Wert ist besser.':g.dir==='high'?'Höherer Wert ist besser.':''} Alle Einträge, auch heute.</div></div>`;
 }
 // Champions
 const champs=gl.map(x=>{
  const c=uids.map(u=>({u,a:sums[u].gs[x.id]})).filter(r=>r.a.played>=3&&r.a.avg!=null);
  if(c.length<2)return null;
  c.sort((p,q)=>x.dir==='low'?p.a.avg-q.a.avg:q.a.avg-p.a.avg);return[x,c[0]];
 }).filter(Boolean);
 if(champs.length)h+=`<div class="card"><h2>Bester je Spiel<small>nach Ø, mind. 3 Einträge</small></h2>`+champs.map(([x,c])=>`<div class="paRow"><div class="paMain"><div class="paNm">${esc(x.n)}${linkHTML(x.id)}</div></div><div class="paNm">🥇 ${esc(nickOf(c.u))}</div><div class="paBig sm">${fmt(c.a.avg)}</div></div>`).join('')+'</div>';
 // Dopamin
 const dopT=u=>sums[u].dop.total||0;
 const dop=[...uids].sort((a,b)=>dopT(b)-dopT(a));
 h+=`<div class="card"><h2>Dopamin<small>wer hat am meisten gefarmt</small></h2>`+dop.map((u,i)=>{const r=[...DOP_RANKS].reverse().find(x=>dopT(u)>=x.th)||DOP_RANKS[0];
  return `<div class="paRow ${u===A.uid?'me':''}"><div class="paRk">${medal(i+1)}</div><div class="paMain"><div class="paNm">${esc(nickOf(u))}${u===A.uid?' <small>(du)</small>':''}</div><div class="hint">${r.icon} ${esc(r.n)}</div></div><div class="paBig">${Math.round(dopT(u)).toLocaleString('de-DE')}</div></div>`}).join('')+'</div>';
 // Aufsteiger
 const up=[...uids].sort((a,b)=>(sums[b].trend==null?-1e9:sums[b].trend)-(sums[a].trend==null?-1e9:sums[a].trend));
 h+=`<div class="card"><h2>Aufsteiger<small>Tagesform der letzten 7 Tage minus Ø aller Tage</small></h2>`+up.map((u,i)=>{const x=sums[u];
  return `<div class="paRow ${u===A.uid?'me':''}"><div class="paRk">${x.trend==null?'–':medal(i+1)}</div><div class="paMain"><div class="paNm">${esc(nickOf(u))}${u===A.uid?' <small>(du)</small>':''}</div><div class="hint">7 Tage ${fmt(x.f7)} % · alle Tage ${fmt(x.fall)} %</div></div><div class="paBig ${x.trend>0?'paW':''}">${x.trend==null?'–':(x.trend>=0?'+':'')+fmt(x.trend)}</div></div>`}).join('')+
  '<div class="hint" style="margin-top:6px">Ab 8 Tagen mit Einträgen. Tagesform ist relativ zur eigenen Historie, so zählt echte Verbesserung.</div></div>';
 return h;
}

/* --- Duell --- */
function viewDuel(){
 const others=Object.keys(A.members).filter(u=>u!==A.uid);
 if(!others.length)return '<div class="card"><h2>Duell</h2><div class="hint">Sobald ein Freund beigetreten ist, kannst du dich hier direkt vergleichen.</div></div>';
 if(!A.duel.opp||!A.members[A.duel.opp]||A.duel.opp===A.uid)A.duel.opp=others[0];
 const opp=A.duel.opp,per=A.duel.per,t=todayIso();
 const from={'7':ad(t,-6),'30':ad(t,-29),'90':ad(t,-89),'all':'0000-01-01',week:mondayOf(t),month:t.slice(0,8)+'01'}[per];
 const R={games:{},a:0,b:0,t:0,days:[]},da=daysOf(A.uid),db=daysOf(opp);
 const allDates=[...new Set([...Object.keys(da),...Object.keys(db)])].filter(d=>d>=from&&d<=t).sort();
 allDates.forEach(d=>{
  let x=0,y=0;
  G.forEach(g=>{
   const ea=(da[d]||{})[g.id],eb=(db[d]||{})[g.id],ka=entryKey(g,ea),kb=entryKey(g,eb);
   if(ka==null&&kb==null)return;
   if((ka==null&&d<joinDate(A.uid))||(kb==null&&d<joinDate(opp)))return;
   if((ka==null||kb==null)&&g.active===false)return;
   const r=R.games[g.id]=R.games[g.id]||{a:0,b:0,t:0,na:[],nb:[]};
   const na=ea?num(ea.s):null,nb=eb?num(eb.s):null;if(na!=null&&ea.w!==0)r.na.push(na);if(nb!=null&&eb.w!==0)r.nb.push(nb);
   const va=ka==null?-Infinity:ka,vb=kb==null?-Infinity:kb;
   if(ka==null&&kb!=null){r.b++;R.b++;y++}else if(kb==null&&ka!=null){r.a++;R.a++;x++}
   else if(va>vb){r.a++;R.a++;x++}else if(vb>va){r.b++;R.b++;y++}else{r.t++;R.t++}
  });
  if(x+y>0||G.some(g=>entryKey(g,(da[d]||{})[g.id])!=null&&entryKey(g,(db[d]||{})[g.id])!=null))R.days.push({d,x,y});
 });
 const sa=summary(A.uid),sb=summary(opp),tot=R.a+R.b+R.t;
 const pa=tot?R.a/tot*100:50,pb=tot?R.b/tot*100:50;
 const avg=a=>a.length?fmt(a.reduce((p,c)=>p+c,0)/a.length):'–';
 let h=`<div class="card"><h2>Duell</h2>
  <select id="paOpp">${others.map(u=>`<option value="${u}" ${u===opp?'selected':''}>${esc(nickOf(u))}</option>`).join('')}</select>
  <div class="tools" style="margin-top:8px">${[['week','Woche'],['month','Monat'],['7','7 Tage'],['30','30 Tage'],['90','90 Tage'],['all','Alles']].map(([k,l])=>`<button data-dper="${k}" class="${per===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="paVs"><div><b>${R.a}</b><span>Du</span></div><div class="paVsMid">:</div><div><b>${R.b}</b><span>${esc(nickOf(opp))}</span></div></div>
  <div class="paVsBar"><u style="width:${pa}%"></u><u class="b" style="width:${pb}%"></u></div>
  <div class="hint">${tot?`${tot} Spiel-Vergleiche (nicht gespielt = verloren, wenn der andere es gespielt hat)${R.t?`, ${R.t} Unentschieden`:''}.`:'Noch keine gemeinsamen Spiele in diesem Zeitraum.'}</div></div>`;
 h+=`<div class="card"><h2>Vergleich</h2><div class="paCmp">
  <div></div><div class="hint">Du</div><div class="hint">${esc(nickOf(opp))}</div>
  <div>Rating</div><div>${sa.rating==null?'–':Math.round(sa.rating)}</div><div>${sb.rating==null?'–':Math.round(sb.rating)}</div>
  <div>Form 7 Tage</div><div>${fmt(avgLast(sa.dp,7))} %</div><div>${fmt(avgLast(sb.dp,7))} %</div>
  <div>Streak</div><div>${sa.streak.cur}</div><div>${sb.streak.cur}</div>
  <div>Tage gespielt</div><div>${sa.dates.length}</div><div>${sb.dates.length}</div></div></div>`;
 const gl=G.filter(g=>R.games[g.id]);
 if(gl.length)h+=`<div class="card"><h2>Je Spiel</h2><div class="scroll"><table class="paTbl"><tr><th>Spiel</th><th>Du</th><th>=</th><th>${esc(nickOf(opp))}</th><th>Ø Du</th><th>Ø ${esc(nickOf(opp))}</th></tr>`+
  gl.map(g=>{const r=R.games[g.id];return `<tr><td>${esc(g.n)}${linkHTML(g.id)}</td><td class="${r.a>r.b?'paW':''}">${r.a}</td><td>${r.t}</td><td class="${r.b>r.a?'paW':''}">${r.b}</td><td>${avg(r.na)}</td><td>${avg(r.nb)}</td></tr>`}).join('')+'</table></div></div>';
 const last=R.days.slice(-10).reverse();
 if(last.length)h+=`<div class="card"><h2>Letzte gemeinsame Tage</h2>`+last.map(x=>`<div class="paRow"><div class="paMain">${fd(x.d)}</div><div class="paBig sm ${x.x>x.y?'paW':''}">${x.x} : ${x.y}</div></div>`).join('')+'</div>';
 return h;
}

/* --- Feed --- */
function viewFeed(){
 const items=[...A.feed].sort((a,b)=>b.ts-a.ts).filter(x=>!A.feedMine||x.to===A.uid).slice(0,80);
 const gname=id=>{const g=G.find(x=>x.id===id);return g?g.n:id};
 let h=`<div class="card"><h2>Feed<small>Reaktionen & Kommentare</small></h2>
  <div class="tools"><button data-feed="all" class="${A.feedMine?'':'on'}">Alle</button><button data-feed="mine" class="${A.feedMine?'on':''}">An mich</button></div>`;
 h+=items.length?items.map(x=>{
  const who=x.to===A.uid?'dein':(poss(nickOf(x.to)));
  return `<div class="paFeedI"><div><b>${esc(nickOf(x.from))}</b> ${x.kind==='r'?'reagierte mit '+esc(x.emoji):'kommentierte'} bei ${esc(who)} <b>${esc(gname(x.gid))}</b> <span class="hint">(${fd(x.date)})</span></div>${x.kind==='c'?`<div class="paQuote">${esc(x.text)}</div>`:''}</div>`}).join(''):'<div class="hint" style="margin-top:10px">Noch nichts los – reagiere im Tagesranking auf die Ergebnisse deiner Freunde.</div>';
 return h+'</div>';
}

/* --- Gruppe --- */
function viewGroup(){
 const isAdmin=A.member&&A.groupAdmin===A.uid;
 const list=Object.keys(A.members).map(u=>({u,n:nickOf(u),j:A.members[u].joined||0})).sort((a,b)=>a.j-b.j);
 let h=`<div class="card"><h2>Gruppe<small>${list.length} Mitglieder</small></h2>`+
  list.map(m=>`<div class="paRow paClick" data-prof="${m.u}"><div class="paMain"><div class="paNm">${esc(m.n)}${m.u===A.uid?' <small>(du)</small>':''}${m.u===A.groupAdmin?' <small>👑</small>':''}</div></div>${isAdmin&&m.u!==A.uid?`<button data-kick="${m.u}" class="paSm">Entfernen</button>`:''}</div>`).join('')+'</div>';
 h+=`<div class="card"><h2>Einladungscode</h2><div class="paCode" id="paCode">${esc((A.member&&A.member.code)||'')}</div>
  <div class="hint">Diesen Code gibst du Freunden – sie registrieren sich damit auf dieser Seite.</div>
  <button data-copycode style="margin-top:8px">Code kopieren</button></div>`;
 h+=`<div class="card"><h2>Mein Konto</h2><div class="hint" style="margin-bottom:6px">${esc(A.user.email)}</div>
  <label class="hint">Spitzname</label><div class="paCin"><input id="paNickEdit" maxlength="20" value="${esc(nickOf(A.uid))}"><button data-savenick>Speichern</button></div>
  <button data-logout style="margin-top:12px">Abmelden</button>
  <div class="hint paMsg" id="paAccMsg"></div></div>`;
 if(isAdmin)h+=`<div class="card"><h2>Spiel-Links<small>für alle sichtbar</small></h2><div class="hint" style="margin-bottom:8px">Adresse leer lassen = kein Link.</div>${GA.map(g=>`<div class="paLinkRow"><span>${esc(g.n)}</span><input data-linkid="${g.id}" placeholder="https://…" value="${esc(gameUrl(g.id))}"></div>`).join('')}<button data-savelinks style="margin-top:8px">Links speichern</button><div class="hint paMsg" id="paLinkMsg"></div></div>`;
 h+='<div class="card hint">🔒 Deine Freunde sehen nur Ergebnisse und Statistiken. Notizen, Lösungs-Album und Weltkarte bleiben privat.</div>';
 return h;
}

/* ============ Aktionen ============ */
document.addEventListener('click',async ev=>{
 const t=ev.target;if(!t.closest||!t.closest('#paView'))return;
 let b;
 if((b=t.closest('[data-board]'))){A.board=b.dataset.board;renderView();return}
 if((b=t.closest('[data-prof]'))){A.profile=b.dataset.prof;if(A.tab!=='board'){showTab('board')}else renderView();window.scrollTo(0,0);return}
 if((b=t.closest('[data-rd]'))){const n=+b.dataset.rd;A.rankDate=n===0?todayIso():ad(A.rankDate||todayIso(),n);renderView();return}
 if((b=t.closest('[data-cmp]'))){A.cmp=b.dataset.cmp;renderView();return}
 if((b=t.closest('[data-gsort]'))){A.gsort=b.dataset.gsort;renderView();return}
 if((b=t.closest('[data-dper]'))){A.duel.per=b.dataset.dper;renderView();return}
 if((b=t.closest('[data-feed]'))){A.feedMine=b.dataset.feed==='mine';renderView();return}
 if((b=t.closest('[data-thread]'))){const k=b.dataset.thread;A.threads[k]=!A.threads[k];renderView();return}
 if((b=t.closest('[data-react]'))){
  const [to,date,gid]=b.dataset.k.split('|'),i=+b.dataset.react,id=`r_${A.uid}_${to}_${date}_${gid}_${i}`;
  try{
   if(A.feed.some(x=>x.id===id))await fs.doc('feed/'+id).delete();
   else await fs.doc('feed/'+id).set({kind:'r',from:A.uid,nick:nickOf(A.uid),to,date,gid,emoji:EMOJIS[i],text:'',ts:Date.now()});
  }catch(e){console.warn(e)}
  return}
 if((b=t.closest('[data-send]'))){await sendComment(b.dataset.send);return}
 if((b=t.closest('[data-delc]'))){ev.preventDefault();try{await fs.doc('feed/'+b.dataset.delc).delete()}catch(e){}return}
 if((b=t.closest('[data-kick]'))){
  const u=b.dataset.kick;if(confirm(nickOf(u)+' wirklich aus der Gruppe entfernen?'))try{await fs.doc('members/'+u).delete()}catch(e){alert(authErr(e))}
  return}
 if(t.closest('[data-copycode]')){const c=(A.member&&A.member.code)||'';try{await navigator.clipboard.writeText(c)}catch(e){prompt('Code kopieren:',c)}return}
 if(t.closest('[data-savelinks]')){
  const m=$g('paLinkMsg'),map={};let bad='';
  document.querySelectorAll('[data-linkid]').forEach(i=>{const id=i.dataset.linkid;let v=i.value.trim();if(v&&!/^https?:\/\//i.test(v)){if(/^[\w.-]+\.[a-z]{2,}/i.test(v))v='https://'+v;else bad=id}
   const def=DEFAULT_LINKS[id]||'';if(v!==def)map[id]=v});
  if(bad){m.textContent='Ungültige Adresse bei: '+bad;return}
  try{await fs.doc('groups/main').update({links:map});m.textContent='Gespeichert ✓'}catch(e){m.textContent=authErr(e)}
  return}
 if(t.closest('[data-logout]')){doLogout();return}
 if(t.closest('[data-savenick]')){
  const v=$g('paNickEdit').value.trim(),m=$g('paAccMsg');
  if(v.length<2||v.length>20){m.textContent='Spitzname: 2–20 Zeichen.';return}
  try{await fs.doc('members/'+A.uid).set({nick:v,code:A.member.code,joined:A.member.joined||Date.now()});A.member.nick=v;m.textContent='Gespeichert ✓'}catch(e){m.textContent=authErr(e)}
  return}
});
document.addEventListener('change',ev=>{
 const t=ev.target;
 if(t.id==='paGameSel'){A.game=t.value;renderView()}
 if(t.id==='paOpp'){A.duel.opp=t.value;renderView()}
 if(t.id==='paRankDate'&&t.value){A.rankDate=t.value;renderView()}
});
document.addEventListener('keydown',ev=>{
 const t=ev.target;
 if(ev.key==='Enter'&&t.dataset&&t.dataset.cin){ev.preventDefault();sendComment(t.dataset.cin)}
});
async function sendComment(key){
 const inp=document.querySelector(`[data-cin="${CSS.escape(key)}"]`);if(!inp)return;
 const text=inp.value.trim();if(!text)return;
 const [to,date,gid]=key.split('|');inp.value='';
 try{await fs.collection('feed').add({kind:'c',from:A.uid,nick:nickOf(A.uid),to,date,gid,emoji:'',text,ts:Date.now()})}catch(e){console.warn(e);inp.value=text}
}

/* ============ Tag aus dem Artefakt importieren ============ */
function importDay(raw){
 let o;try{o=JSON.parse(raw)}catch(e){throw new Error('Das ist kein gültiger Export.')}
 const list=Array.isArray(o)?o:[o];
 if(!list.length||!list.every(x=>x&&x.pa==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.day&&typeof x.day==='object'))throw new Error('Das ist kein Tages-Export aus dem Artefakt.');
 list.forEach(x=>{Object.keys(x.day).forEach(k=>{if(k!=='note'&&!G.some(g=>g.id===k))delete x.day[k]})});
 list.forEach(x=>{D[x.date]=Object.assign(JSON.parse(JSON.stringify(D[x.date]||{})),JSON.parse(JSON.stringify(x.day)));if(!Object.keys(D[x.date]).length)delete D[x.date]});
 mig();save(list.map(x=>x.date));
 cur=list[list.length-1].date;const di=document.getElementById('date');if(di)di.value=cur;
 form();render();
 return list.map(x=>fd(x.date)).join(', ');
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('#paImpBtn');if(!b)return;
 const ta=document.getElementById('paImpTxt'),m=document.getElementById('paImpMsg');
 try{const r=importDay(ta.value.trim());ta.value='';m.className='hint paMsg ok';m.textContent='Importiert: '+r+' ✓'}
 catch(e){m.className='hint paMsg';m.textContent=e.message}
});

document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('#paDayClear');if(!b)return;
 const day=D[cur],n=day?Object.keys(day).length:0;
 if(!n){alert('Am '+fd(cur)+' ist nichts eingetragen.');return}
 if(!confirm('Wirklich ALLE Einträge (und die Notiz) vom '+fd(cur)+' löschen? Auch deine Freunde sehen sie dann nicht mehr.'))return;
 delete D[cur];save([cur]);form();render();
});
window.Arena=A;
})();
