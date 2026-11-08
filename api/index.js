import {Redis} from "@upstash/redis";
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
const redis=new Redis({url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN});
const AP=()=>process.env.ADMIN_PASSWORD||"";
const SEC=()=>"k:"+(process.env.SECRET||AP());
const mac=p=>createHmac("sha256",SEC()).update(p).digest("base64url");
const sign=o=>{const p=Buffer.from(JSON.stringify({...o,e:Date.now()+30*864e5})).toString("base64url");return p+"."+mac(p)};
const ver=t=>{try{const [p,s]=t.split(".");const g=mac(p);if(s.length!==g.length||!timingSafeEqual(Buffer.from(s),Buffer.from(g)))return;const o=JSON.parse(Buffer.from(p,"base64url"));return o.e>Date.now()?o:void 0}catch{}};
const hx=k=>createHmac("sha256","x").update(String(k)).digest();
const hp=(p,s)=>scryptSync(p,s,32).toString("hex");
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json"}});
const E=m=>{throw new Error(m)};
const r2=n=>Math.round(n*100)/100;
const im=(s,m)=>typeof s==="string"&&s.startsWith("data:image/")&&s.length<m?s:"";
const Q0=()=>({id:"qris",name:"QRIS",cur:"IDR",uniq:true,img:"",note:"Scan QRIS lalu bayar sesuai total.",fields:[],on:true});
const seed=()=>({cfg:{brand:"Sheilla Store",banner:"CEPAT \u2022 MURAH \u2022 AMAN",sub:"Top Up Game",wa:"6285281676468",notice:"",neg:0,negu:0},games:[{id:"sg",name:"Stumble Guys",icon:"\u{1F3AE}",d:""}],
 products:[{id:"a",gid:"sg",n:"800 Gems",d:"",p:14000,pop:false},{id:"b",gid:"sg",n:"1600 Gems",d:"",p:21000,pop:true},{id:"c",gid:"sg",n:"5000 Gems",d:"",p:48000,pop:false}],methods:[Q0()],users:{},tx:[]});
const slugify=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);
const fixSlugs=gs=>{const used=new Set();for(const g of gs){let s=slugify(g.slug)||slugify(g.name)||g.id,b=s,n=2;while(used.has(s))s=b+"-"+n++;used.add(s);g.slug=s}};
const norm=db=>{if(!Array.isArray(db.games))db.games=[{id:"sg",name:"Stumble Guys",icon:"\u{1F3AE}",d:""}];
 db.games.forEach(g=>{if(!g.cat)g.cat="Games";g.img=g.img||""});fixSlugs(db.games);
 db.products.forEach(p=>{if(!p.gid)p.gid=db.games[0]?db.games[0].id:"sg";p.pu=p.pu||0;p.img=p.img||""});
 if(!Array.isArray(db.methods))db.methods=[Q0()];db.cfg.neg=db.cfg.neg||0;db.cfg.negu=db.cfg.negu||0;if(db.cfg.footer===undefined)db.cfg.footer="Cepat murah aman di Sheilla Store tempatnya 🔥🔥";if(db.cfg.footon===undefined)db.cfg.footon=true;if(db.cfg.toast===undefined)db.cfg.toast=true;return db};
const code=(db,price)=>{let c,i=0;do{c=100+Math.floor(Math.random()*900);i++}while(i<60&&db.tx.some(x=>x.st==="pending"&&x.method!=="bal"&&(x.cur||"IDR")==="IDR"&&x.total===price+c));return c};
const fm=(n,c)=>c==="USD"?"$"+Number(n).toFixed(2):"Rp "+Number(n).toLocaleString("id-ID");
async function sendMail(text){
 const k=process.env.RESEND_API_KEY,to=process.env.NOTIFY_EMAIL;
 if(!k||!to)return;
 try{await fetch("https://api.resend.com/emails",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+k},body:JSON.stringify({from:"Sheilla Store <onboarding@resend.dev>",to:[to],subject:String(text).split("\n")[0].slice(0,100),text:String(text).slice(0,5000)}),signal:AbortSignal.timeout(4000)})}catch{}
}
async function sendWA(db,text,force){
 await sendMail(text);
 const n=db.notif;if(!n||!n.token||!n.target||(!n.on&&!force))return{ok:false,detail:"Notifikasi belum aktif atau belum lengkap"};
 try{const fd=new FormData();fd.append("target",n.target);fd.append("message",text);fd.append("countryCode","62");
  const r=await fetch("https://api.fonnte.com/send",{method:"POST",headers:{Authorization:n.token},body:fd,signal:AbortSignal.timeout(4000)});
  const t=await r.text();let j={};try{j=JSON.parse(t)}catch{}
  return{ok:r.ok&&j.status!==false,detail:String(j.reason||j.detail||t).slice(0,200)};
 }catch(e){return{ok:false,detail:String(e&&e.message||e).slice(0,200)}}}
let RC={t:0,v:0};
const getJ=async u=>{const r=await fetch(u,{signal:AbortSignal.timeout(3500)});if(!r.ok)throw new Error("http "+r.status);return r.json()};
const rateCG=async()=>Number((await getJ("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr")).tether.idr);
const rateBN=async()=>Number((await getJ("https://api.binance.com/api/v3/ticker/price?symbol=USDTIDR")).price);
// Kurs USDT -> IDR (real-time, cache 60 detik). Sumber utama sesuai pengaturan admin, lalu sumber lain, lalu kurs cadangan.
async function usdtRate(m){
 if(RC.v&&Date.now()-RC.t<6e4)return RC.v;
 for(const f of(m.src==="binance"?[rateBN,rateCG]:[rateCG,rateBN])){try{const v=await f();if(v>1000&&v<100000){RC={t:Date.now(),v};return v}}catch{}}
 if(m.fb>0)return m.fb;E("Kurs USDT belum tersedia, coba lagi sebentar atau pilih metode lain")}
const usdtInfo=async(m,idr)=>{const mk=await usdtRate(m),rate=Math.round(mk*(1+(m.mark||0)/100)*100)/100;return{usdt:Math.ceil(idr/rate*1e4)/1e4,rate,exp:Date.now()+(m.expm||15)*6e4}};
const tid=()=>"T"+Date.now().toString(36)+randomBytes(2).toString("hex");
async function handle(req){
 if(req.method!=="POST")return J({err:"POST only"},405);
 try{
  const b=await req.json().catch(()=>({}));
  const s=ver((req.headers.get("authorization")||"").slice(7));
  const db=norm((await redis.get("db"))||seed());
  const save=()=>{if(db.tx.length>3000)db.tx.splice(0,db.tx.length-3000);return redis.set("db",db)};
  const nm=String(b.u||"").trim().toLowerCase();
  const usr=()=>{const u=s&&s.u&&db.users[s.u];return u||E("Silakan masuk dulu")};
  const adm=()=>{if(!(s&&s.r==="admin"))E("Tidak diizinkan")};
  const origin=new URL(req.url).origin;
  const cur=b.cur==="USD"?"USD":"IDR",K=cur==="USD"?"balu":"bal";
  const meth=()=>db.methods.find(x=>x.id===b.method&&x.on&&x.cur===cur)||E("Metode pembayaran tidak tersedia");
  const usdOk=u=>{if(cur==="USD"&&!u.usd)E("Akun belum diaktifkan untuk USD")};
  switch(b.a){
  case "pub":{const sold={},rec=[];
   for(let i=db.tx.length-1;i>=0;i--){const t=db.tx[i];if(t.type==="order"&&t.st==="sukses"&&t.game){sold[t.game]=(sold[t.game]||0)+1;if(rec.length<8)rec.push({n:t.n,game:t.game,t:t.t})}}
   return J({cfg:db.cfg,games:db.games,products:db.products,methods:db.methods.filter(m=>m.on).map(m=>({...m,mark:0,fb:0,src:""})),gcid:process.env.GOOGLE_CLIENT_ID||"",sold,rec});}
  case "recent":{const L=[];for(let i=db.tx.length-1;i>=0&&L.length<10;i--){const t=db.tx[i];if(t.type!=="order"||t.st==="pending")continue;const g=t.gid||"";
   L.push({n:t.n,game:t.game||"",st:t.st,t:t.t,id:g?(g.length>3?g.slice(0,2)+"***"+g.slice(-1):"***"):""})}return J({list:L});}
  case "track":{const t=db.tx.find(x=>x.id===String(b.id||"").trim())||E("Invoice tidak ditemukan");const g=t.gid||"";
   return J({tx:{id:t.id,type:t.type,n:t.n,game:t.game||"",total:t.total,cur:t.cur||"IDR",st:t.st,t:t.t,note:t.note||"",hash:!!t.hash,usdt:t.usdt||0,gid:g?(g.length>3?g.slice(0,2)+"***"+g.slice(-1):"***"):""}});}
  case "reg":{
   if(nm.length>120||!/^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,}$/.test(nm))E("Format email tidak valid");
   if(String(b.p||"").length<6)E("Password minimal 6 karakter");
   if(db.users[nm])E("Email sudah terdaftar, silakan masuk");
   const sl=randomBytes(8).toString("hex");db.users[nm]={s:sl,h:hp(b.p,sl),bal:0,balu:0,usd:false,t:Date.now()};await save();
   return J({token:sign({u:nm})});}
  case "login":{
   const u=db.users[nm];if(!u||!timingSafeEqual(Buffer.from(hp(String(b.p||""),u.s)),Buffer.from(u.h)))E("Email atau password salah");
   return J({token:sign({u:nm})});}
  case "google":{
   const cid=process.env.GOOGLE_CLIENT_ID;if(!cid)E("Login Google belum diaktifkan");
   const r=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(String(b.cred||"")));const g=await r.json().catch(()=>({}));
   if(!r.ok||g.aud!==cid||String(g.email_verified)!=="true")E("Login Google gagal");
   const em=String(g.email).toLowerCase();
   if(!db.users[em]){const sl=randomBytes(8).toString("hex");db.users[em]={s:sl,h:hp(randomBytes(16).toString("hex"),sl),bal:0,balu:0,usd:false,google:1,t:Date.now()};await save()}
   return J({token:sign({u:em})});}
  case "adminlogin":{
   if(!AP())E("ADMIN_PASSWORD belum diatur di Netlify");
   if(!timingSafeEqual(hx(String(b.p||"").trim()),hx(AP().trim())))E("Password salah");
   return J({token:sign({r:"admin"})});}
  case "me":{const u=usr();return J({u:s.u,bal:u.bal||0,balu:u.balu||0,usd:!!u.usd,tx:db.tx.filter(t=>t.u===s.u).slice(-100).reverse()});}
  case "order":{
   const p=db.products.find(x=>x.id===b.pid)||E("Produk tidak ditemukan");
   const gid=String(b.gid||"").trim().slice(0,40);if(!gid)E("Isi Username/ID game");
   const gm=db.games.find(x=>x.id===p.gid)||{};let u=null;
   if(cur==="USD"){u=usr();usdOk(u)}
   const price=cur==="USD"?p.pu:p.p;if(!(price>0))E("Produk ini belum punya harga "+cur);
   const tx={id:tid(),type:"order",u:s&&s.u||"tamu",gid,game:gm.name||"",n:p.n,price,code:0,total:price,cur,method:"",mname:"",st:"pending",t:Date.now()};
   if(b.method==="bal"){u=u||usr();const lim=+(cur==="USD"?db.cfg.negu:db.cfg.neg)||0,nb=r2((u[K]||0)-price);
    if(lim>0&&nb<-lim)E("Melebihi batas saldo minus");u[K]=nb;tx.method="bal";tx.mname="Saldo";tx.st="proses"}
   else{const m=meth();tx.method=m.id;tx.mname=m.name;if(m.kind==="usdt")Object.assign(tx,await usdtInfo(m,price));else if(m.uniq&&cur==="IDR"){tx.code=code(db,price);tx.total=price+tx.code}}
   db.tx.push(tx);await save();
   await sendWA(db,"\u{1F6D2} PESANAN BARU\nProduk: "+tx.n+(tx.game?" ("+tx.game+")":"")+"\nID/Username: "+tx.gid+"\nTotal: "+fm(tx.total,tx.cur)+"\nMetode: "+tx.mname+(tx.usdt?" ("+tx.usdt.toFixed(4)+" USDT)":"")+"\nStatus: "+(tx.st==="proses"?"Dibayar pakai saldo, perlu diproses":"Menunggu pembayaran")+"\nPembeli: "+tx.u+"\nInvoice: "+tx.id+"\nAdmin: "+origin+"/admin.html");
   return J({tx});}
  case "dep":{
   const u=usr();usdOk(u);const a=cur==="USD"?r2(+b.amt):Math.floor(+b.amt);
   if(cur==="IDR"?!(a>=10000&&a<=5e6):!(a>=1&&a<=10000))E(cur==="IDR"?"Deposit minimal Rp. 10.000, maksimal Rp. 5.000.000":"Deposit USD minimal $1, maksimal $10.000");
   const m=meth();const c=m.uniq&&cur==="IDR"&&m.kind!=="usdt"?code(db,a):0;
   const tx={id:tid(),type:"dep",u:s.u,n:"Deposit",price:a,code:c,total:a+c,cur,method:m.id,mname:m.name,st:"pending",t:Date.now()};
   if(m.kind==="usdt")Object.assign(tx,await usdtInfo(m,a));
   db.tx.push(tx);await save();
   await sendWA(db,"\u{1F4B0} DEPOSIT BARU\nNominal: "+fm(tx.price,tx.cur)+"\nTotal bayar: "+fm(tx.total,tx.cur)+"\nMetode: "+tx.mname+"\nMember: "+tx.u+"\nInvoice: "+tx.id+"\nAdmin: "+origin+"/admin.html");
   return J({tx});}
  case "txhash":{const t=db.tx.find(x=>x.id===String(b.id||"").trim())||E("Transaksi tidak ditemukan");
   if(!t.usdt)E("Transaksi ini bukan pembayaran USDT");
   if(t.st!=="pending")E("Transaksi sudah diproses");
   if(t.hash)E("TX Hash sudah dikirim, menunggu verifikasi admin");
   if(t.exp&&Date.now()>t.exp+18e5)E("Waktu pembayaran sudah habis, hubungi admin");
   const h=String(b.hash||"").trim();
   if(!/^(0x)?[0-9a-fA-F]{64}$/.test(h)&&!/^[A-Za-z0-9]{40,100}$/.test(h))E("Format TX Hash tidak valid");
   if(db.tx.some(x=>x.hash&&x.hash.toLowerCase()===h.toLowerCase()))E("TX Hash ini sudah pernah dipakai");
   t.hash=h;t.hashAt=Date.now();await save();
   const mm=db.methods.find(x=>x.id===t.method)||{};
   await sendWA(db,"\u{1F514} TX HASH DITERIMA\nInvoice: "+t.id+"\nProduk: "+t.n+(t.game?" ("+t.game+")":"")+"\nID: "+(t.gid||"-")+"\nJumlah: "+t.usdt.toFixed(4)+" USDT\nHash: "+h+(mm.ex?"\nCek: "+mm.ex+h:"")+"\nAdmin: "+origin+"/admin.html");
   return J({ok:1});}
  case "adm_data":adm();return J({cfg:db.cfg,games:db.games,products:db.products,methods:db.methods,notif:{on:!!(db.notif&&db.notif.on),target:(db.notif&&db.notif.target)||"",tokenSet:!!(db.notif&&db.notif.token)},users:Object.entries(db.users).map(([u,x])=>({u,bal:x.bal||0,balu:x.balu||0,usd:!!x.usd})),tx:db.tx.slice(-400).reverse()});
  case "adm_cfg":{adm();for(const k of["brand","banner","sub","wa","notice"])if(k in b)db.cfg[k]=String(b[k]).slice(0,120);
   for(const k of["neg","negu"])if(k in b)db.cfg[k]=Math.max(0,+b[k]||0);
   if("footer" in b)db.cfg.footer=String(b.footer).slice(0,160);if("footon" in b)db.cfg.footon=!!b.footon;if("toast" in b)db.cfg.toast=!!b.toast;if("brandon" in b)db.cfg.brandon=!!b.brandon;
   if("logo" in b)db.cfg.logo=im(b.logo,235000);
   if(b.theme&&typeof b.theme==="object"){const hx6=/^#[0-9a-f]{6}$/i,t={};for(const k of["p","p2","bg","tx"])if(hx6.test(String(b.theme[k]||"")))t[k]=String(b.theme[k]).toLowerCase();db.cfg.theme=t}await save();return J({ok:1});}
  case "adm_games":{adm();db.games=(b.list||[]).slice(0,40).map(x=>({id:String(x.id).slice(0,20),name:String(x.name||"").slice(0,40),icon:String(x.icon||"\u{1F3AE}").slice(0,8),img:im(x.img,70000),slug:String(x.slug||"").slice(0,40),cat:String(x.cat||"Games").slice(0,20),d:String(x.d||"").slice(0,80)})).filter(x=>x.name);
   fixSlugs(db.games);db.products=db.products.filter(p=>db.games.some(g=>g.id===p.gid));await save();return J({ok:1});}
  case "adm_prod":{adm();db.products=(b.list||[]).slice(0,100).map(x=>({id:String(x.id).slice(0,20),gid:String(x.gid||"").slice(0,20),n:String(x.n||"").slice(0,60),d:String(x.d||"").slice(0,80),p:Math.max(0,Math.floor(+x.p||0)),pu:r2(Math.max(0,+x.pu||0)),img:im(x.img,30000),pop:!!x.pop})).filter(x=>x.n&&db.games.some(g=>g.id===x.gid));await save();return J({ok:1});}
  case "adm_methods":{adm();db.methods=(b.list||[]).slice(0,30).map(x=>({id:String(x.id).slice(0,20),name:String(x.name||"").slice(0,40),kind:x.kind==="usdt"?"usdt":"",cur:x.kind==="usdt"?"IDR":(x.cur==="USD"?"USD":"IDR"),uniq:!!x.uniq&&x.cur!=="USD"&&x.kind!=="usdt",net:String(x.net||"").slice(0,60),addr:String(x.addr||"").trim().slice(0,120),warn:String(x.warn||"").slice(0,300),expm:Math.min(120,Math.max(3,Math.floor(+x.expm||15))),mark:Math.min(20,Math.max(0,+x.mark||0)),src:x.src==="binance"?"binance":"coingecko",fb:Math.max(0,+x.fb||0),ex:String(x.ex||"").slice(0,120),img:im(x.img,170000),note:String(x.note||"").slice(0,200),fields:(x.fields||[]).slice(0,10).map(f=>({k:String(f.k||"").slice(0,40),v:String(f.v||"").slice(0,200)})).filter(f=>f.k||f.v),on:!!x.on})).filter(x=>x.name);await save();return J({ok:1});}
  case "adm_tx":{adm();
   const t=db.tx.find(x=>x.id===b.id)||E("Transaksi tidak ada");
   if(!["pending","proses"].includes(t.st))E("Transaksi sudah final");
   const ok=b.st==="sukses",u=db.users[t.u],k=(t.cur||"IDR")==="USD"?"balu":"bal";
   if(t.type==="dep"&&ok&&u)u[k]=r2((u[k]||0)+t.price);
   if(t.type==="order"&&!ok&&t.method==="bal"&&u)u[k]=r2((u[k]||0)+t.total);
   if("note" in b)t.note=String(b.note).slice(0,200);t.st=ok?"sukses":"ditolak";await save();return J({ok:1});}
  case "adm_note":{adm();const t=db.tx.find(x=>x.id===b.id)||E("Transaksi tidak ada");t.note=String(b.note||"").slice(0,200);await save();return J({ok:1});}
  case "adm_notif":{adm();const o=db.notif||{};let t=String(b.target||"").replace(/\D/g,"");if(t.startsWith("0"))t="62"+t.slice(1);
   db.notif={on:!!b.on,target:t.slice(0,20),token:String(b.token||"").trim().slice(0,200)||o.token||""};await save();return J({ok:1});}
  case "adm_notif_test":{adm();return J(await sendWA(db,"\u2705 Tes notifikasi dari "+db.cfg.brand+". Kalau pesan ini masuk, notifikasi pesanan sudah aktif.",true));}
  case "adm_user":{adm();const u=db.users[nm]||E("Member tidak ada");u.usd=!!b.usd;await save();return J({ok:1});}
  case "adm_bal":{adm();const u=db.users[nm]||E("Member tidak ada");const d=r2(+b.delta);if(!d)E("Nominal tidak valid");
   u[K]=r2((u[K]||0)+d);db.tx.push({id:tid(),type:"adj",u:nm,n:"Penyesuaian admin",price:d,code:0,total:d,cur,method:"adm",mname:"Admin",st:"sukses",t:Date.now()});await save();return J({ok:1});}
  }
  return J({err:"Aksi tidak dikenal"},400);
 }catch(e){return J({err:e.message},400)}
};
export const POST=handle;
export const GET=handle;

