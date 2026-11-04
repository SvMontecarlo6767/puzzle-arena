// In-Memory-Ersatz für die Firebase-compat-SDKs (nur für lokale Tests)
(function(){
const S=window.__STORE=window.__STORE||{docs:{}};
const seed=window.__SEED||{};Object.keys(seed).forEach(k=>S.docs[k]=JSON.parse(JSON.stringify(seed[k])));
const listeners=[];let cu=null;const authL=[];
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const err=(code,message)=>Object.assign(new Error(message||code),{code});
function parent(p){return p.split('/').slice(0,-1).join('/')}
function snapDoc(p){const d=S.docs[p];return{id:p.split('/').pop(),exists:d!==undefined,data:()=>clone(d),metadata:{hasPendingWrites:false,fromCache:false}}}
function colDocs(c,f){return Object.keys(S.docs).filter(p=>parent(p)===c&&(!f||f(S.docs[p]))).sort()}
function emit(path,type){listeners.forEach(l=>{if(l.kind==='doc'&&l.path===path)setTimeout(()=>l.cb(snapDoc(path)),0);
 if(l.kind==='col'&&l.path===parent(path))setTimeout(()=>l.fire([{type,path}]),0)})}
function rule(path,op,data){
 const u=cu&&cu.uid;if(!u)throw err('permission-denied');
 if(path.startsWith('members/')&&op==='set'){const g=S.docs['groups/main'];const ex=S.docs[path];
  if(!ex&&(!g||data.code!==g.code))throw err('permission-denied');}
 if(path==='groups/main'&&op==='set'&&cu.email!=='momo.haskamp@gmail.com')throw err('permission-denied');
}
function docRef(path){return{path,id:path.split('/').pop(),
 async get(){return snapDoc(path)},
 async set(d){rule(path,'set',d);const ex=S.docs[path]!==undefined;S.docs[path]=clone(d);emit(path,ex?'modified':'added')},
 async update(d){const ex=S.docs[path];if(ex===undefined)throw err('not-found');S.docs[path]=Object.assign({},ex,clone(d));emit(path,'modified')},
 async delete(){const ex=S.docs[path]!==undefined;delete S.docs[path];if(ex)emit(path,'removed')},
 onSnapshot(cb,eb){const l={kind:'doc',path,cb};listeners.push(l);setTimeout(()=>cb(snapDoc(path)),0);return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1)}}}}
function colRef(path,filter){
 const mk=(ids,ch)=>({size:ids.length,docs:ids.map(snapDoc),forEach(f){ids.map(snapDoc).forEach(f)},metadata:{fromCache:false,hasPendingWrites:false},
   docChanges:()=>ch.map(c=>({type:c.type,doc:snapDoc(c.path)}))});
 return{path,
  doc(id){return docRef(path+'/'+(id||('a'+Math.random().toString(36).slice(2,10))))},
  where(f,op,v){return colRef(path,d=>op==='>='?(d[f]>=v):true)},
  async add(d){const r=this.doc();await r.set(d);return r},
  async get(){return mk(colDocs(path,filter),[])},
  onSnapshot(cb,eb){const l={kind:'col',path,seen:new Set(),
    fire(changes){const ids=colDocs(path,filter);cb(mk(ids,changes.filter(c=>c.type==='removed'||ids.includes(c.path))))}};
   listeners.push(l);
   setTimeout(()=>{const ids=colDocs(path,filter);ids.forEach(i=>l.seen.add(i));cb(mk(ids,ids.map(p=>({type:'added',path:p}))))},0);
   return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1)}}}}
window.firebase={
 initializeApp(){},
 auth(){return{
  onAuthStateChanged(cb){authL.push(cb);setTimeout(()=>cb(cu),0);return()=>{}},
  async createUserWithEmailAndPassword(e,p){if(S.docs['__auth/'+e])throw err('auth/email-already-in-use');
    const u={uid:'u_'+e.split('@')[0],email:e};S.docs['__auth/'+e]={pw:p,uid:u.uid};cu=u;authL.forEach(f=>setTimeout(()=>f(cu),0));return{user:u}},
  async signInWithEmailAndPassword(e,p){const a=S.docs['__auth/'+e];if(!a||a.pw!==p)throw err('auth/invalid-credential');
    cu={uid:a.uid,email:e};authL.forEach(f=>setTimeout(()=>f(cu),0));return{user:cu}},
  async signOut(){cu=null;authL.forEach(f=>setTimeout(()=>f(null),0))},
  async sendPasswordResetEmail(){}}},
 firestore(){return{doc:docRef,collection:p=>colRef(p)}}
};
})();
