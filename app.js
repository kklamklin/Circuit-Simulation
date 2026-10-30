(() => {
const N = 20, DT = 5e-4, GMIN = 1e-9, RINT = 0.01, RAM = 1e-3, RVM = 1e7, RF = 0.05, RWH = 1e-3;
const TA = 25, TSAFE = 100, TFAIL = 200, RAM_REAL = 0.1, RVM_REAL = 1e6;
const DP = { diode:{Is:1e-14,nvt:0.02585}, led:{Is:1e-18,nvt:0.0517}, idiode:{Is:1e-6,nvt:0.002} };
for (const k in DP){ const P=DP[k]; P.vcrit = P.nvt*Math.log(P.nvt/(Math.SQRT2*P.Is)); }

const T = {
  dc:{name:'แหล่งจ่าย DC',def:{E:9,r:0.5,Pmax:20},desc:'ถ่านหรือแบตเตอรี่ ดันประจุให้ไหลไปทางเดียว ขั้วบวกคือฝั่งแผ่นยาวที่มีเครื่องหมาย + ข้างในมีความต้านทานเล็กน้อย ถ้าลัดวงจรจะร้อนจัดจนระเบิด',fields:[['E','แรงเคลื่อนไฟฟ้า','V',0,1000],['r','ความต้านทานภายใน','Ω',0.001,1e4],['Pmax','พิกัดความร้อนภายใน','W',0.1,1e5]]},
  ac:{name:'แหล่งจ่าย AC',def:{E:10,f:1,r:0.5,Pmax:20},desc:'แรงดันสลับขั้วไปมาตามเวลาเป็นคลื่นไซน์ กระแสจึงไหลกลับไปกลับมา ลองเลือกแล้วดูออสซิลโลสโคป',fields:[['E','แรงดันสูงสุด','V',0,1000],['f','ความถี่','Hz',0.05,100],['r','ความต้านทานภายใน','Ω',0.001,1e4],['Pmax','พิกัดความร้อนภายใน','W',0.1,1e5]]},
  res:{name:'ตัวต้านทาน',def:{R:100,Pmax:2},desc:'ขวางการไหลของประจุ ยิ่ง R มาก กระแสยิ่งน้อย ตามกฎของโอห์ม V = IR ถ้ากำลัง P = VI เกินพิกัด จะร้อนจนไหม้',fields:[['R','ความต้านทาน','Ω',0.01,1e7],['Pmax','พิกัดกำลัง','W',0.01,1e5]]},
  bulb:{name:'หลอดไฟ',def:{R:20,Pmax:10},desc:'ตัวต้านทานที่เปลี่ยนพลังงานไฟฟ้าเป็นแสงและความร้อน ยิ่งกำลัง P = I²R มาก ยิ่งสว่าง แต่ถ้าเกินพิกัด ไส้หลอดจะขาด',fields:[['R','ความต้านทาน','Ω',0.1,1e5],['Pmax','พิกัดกำลัง','W',0.01,1e5]]},
  sw:{name:'สวิตช์',def:{on:true,Pmax:10},desc:'แตะที่สวิตช์บนแผงเพื่อเปิดหรือปิด เมื่อวงจรขาด กระแสหยุดไหลทั้งเส้นทางทันที',fields:[['Pmax','พิกัดความร้อนหน้าสัมผัส','W',0.01,1e5]]},
  cap:{name:'ตัวเก็บประจุ',def:{C:4700,Vmax:25},desc:'เก็บประจุไว้บนแผ่นโลหะสองแผ่น เหมือนถังพักน้ำ ชาร์จเต็มแล้วกระแส DC จะหยุดไหล ค่าคงที่เวลา τ = RC ถ้าแรงดันเกินพิกัด ฉนวนข้างในจะพังและระเบิด',fields:[['C','ความจุ','µF',0.001,1e6],['Vmax','พิกัดแรงดัน','V',0.1,1e5]]},
  ind:{name:'ตัวเหนี่ยวนำ',def:{L:2,Imax:2},desc:'ขดลวดที่ต้านการเปลี่ยนแปลงของกระแส กระแสจึงค่อยๆ เพิ่ม ไม่กระโดดทันที ค่าคงที่เวลา τ = L/R ถ้ากระแสเกินพิกัด ขดลวดจะร้อนจนไหม้',fields:[['L','ความเหนี่ยวนำ','H',0.001,1000],['Imax','พิกัดกระแส','A',0.001,1e4]]},
  diode:{name:'ไดโอด',def:{Pmax:1},desc:'ยอมให้กระแสไหลทางเดียว จากฝั่งสามเหลี่ยม (แอโนด) ไปฝั่งขีด (แคโทด) ต้องมีแรงดันราว 0.7 V ก่อนจึงเริ่มนำไฟ',fields:[['Pmax','พิกัดกำลัง','W',0.01,1e5]]},
  led:{name:'LED',def:{Pmax:0.1},desc:'ไดโอดที่เปล่งแสง นำไฟทางเดียว ต้องการแรงดันราว 2 V และควรมีตัวต้านทานอนุกรมเพื่อจำกัดกระแส ไม่อย่างนั้นจะไหม้ทันที',fields:[['Pmax','พิกัดกำลัง','W',0.001,1e5]]},
  vm:{name:'โวลต์มิเตอร์',def:{},desc:'วัดความต่างศักย์ ต้องต่อขนาน (คร่อม) กับอุปกรณ์ ความต้านทานภายในสูงมาก จึงแทบไม่ดึงกระแส ขั้ว + คือฝั่งที่มีเครื่องหมาย',fields:[]},
  am:{name:'แอมมิเตอร์',def:{Pmax:2},desc:'วัดกระแส ต้องต่ออนุกรมในเส้นทางที่กระแสไหลผ่าน ความต้านทานภายในต่ำมาก ห้ามต่อคร่อมแหล่งจ่ายเด็ดขาด',fields:[['Pmax','พิกัดความร้อน','W',0.01,1e5]]},
  fuse:{name:'ฟิวส์',def:{Imax:2},desc:'ลวดเส้นเล็กที่จงใจให้หลอมก่อน เมื่อกระแสเกินพิกัดราว 1.5 เท่า ฟิวส์จะขาดเพื่อตัดวงจร ป้องกันอุปกรณ์อื่นและสายไฟไม่ให้ไหม้',fields:[['Imax','พิกัดกระแส','A',0.001,1e4]]},
};
const ORDER = ['dc','ac','res','bulb','sw','fuse','cap','ind','diode','led','vm','am'];
const BOOM = { dc:'big', ac:'big', cap:'big', res:'big', bulb:'pop', led:'pop', diode:'pop', am:'pop', sw:'pop', ind:'pop', fuse:'melt' };

let comps = [], wires = [], uid = 1, sel = null, t = 0, running = true, elMode = false, speed = 1;
let dirty = true, topo = null, pendingPlace = null, placing = null, drag = null, hover = null;
let hist = { v:[], i:[] };
let ideal = true, circuitName = 'วงจรของฉัน', toastTimer = null;
function setCircuit(name, announce){
  circuitName = (name || 'วงจรของฉัน').trim().slice(0,60) || 'วงจรของฉัน';
  const el=document.getElementById('cTitle'); if (el && document.activeElement!==el) el.value=circuitName;
  if (announce) showToast('เปิดวงจร', circuitName);
}
function showToast(kick, text){
  const el=document.getElementById('toastf'); if (!el) return;
  document.getElementById('tKick').textContent=kick; document.getElementById('tText').textContent=text;
  clearTimeout(toastTimer); el.classList.remove('out'); el.hidden=false;
  el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  toastTimer=setTimeout(()=>{ el.classList.add('out'); toastTimer=setTimeout(()=>{ el.hidden=true; el.classList.remove('out'); }, 320); }, 2600);
}
const presetTitle = k => { const o=document.querySelector(`#preset option[value="${k}"]`); return o ? o.textContent : k; };
const srcR = c => ideal ? RINT : c.r;
const amR = () => ideal ? RAM : RAM_REAL;
const vmR = () => ideal ? RVM : RVM_REAL;
const dkey = c => (ideal && c.type==='diode') ? 'idiode' : c.type;
const realOnly = k => k==='r' || /max$/.test(k);
const shownFields = type => T[type].fields.filter(f => !(ideal && realOnly(f[0])));
const REAL_PRESETS = new Set(['boom','fuse','short']);
let showLabels = true, showHeat = true, depth = false, parts = [], flashes = [], shake = 0, energy = { sup:0, heat:0 }, events = [];

const $ = s => document.querySelector(s);
const cv = $('#board'), ctx = cv.getContext('2d');
const sc = $('#scope'), sctx = sc.getContext('2d');
let u = 30, side = 600, dpr = 1;
// phones get a lighter render: no canvas glow, pixel ratio capped at 2, fewer particles, gentler shake, at most ~60 fps
const lite = (() => { try {
  const small = Math.min(screen.width, screen.height) < 600;   // phones; tablets and desktop screens are wider
  const touch = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|iPhone|iPod|Android/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
  return small && touch;
} catch(e){ return false; } })();
document.documentElement.classList.toggle('lite', lite);
const glow = v => lite ? 0 : v;

function col(){ const s = getComputedStyle(document.documentElement); const g = n => s.getPropertyValue(n).trim();
  return { bg:g('--board'), ink:g('--ink'), muted:g('--muted'), node:g('--node'), wire:g('--wire'), copper:g('--copper'),
    accent:g('--accent'), el:g('--electron'), glow:g('--glow'), led:g('--led'), panel:g('--panel'), line:g('--line'), heat:g('--heat'), smoke:g('--smoke'), silk:g('--silk'), hole:g('--hole') }; }
let C = col();
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { C = col(); layers=null; drawIcons(); }); } catch(e){}
new MutationObserver(() => { C = col(); layers=null; drawIcons(); }).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

/* ---------- model ---------- */
function mk(type, ax, ay, bx, by, props){
  return Object.assign({ id:uid++, type, ax, ay, bx, by, vp:0, ip:0, vd:0, i:0, v:0, phase:0, glow:0, temp:TA, en:0, broken:false, smokeT:0 }, structuredClone(T[type].def), props||{});
}
function mkw(ax, ay, bx, by){ return { id:uid++, w:true, ax, ay, bx, by, i:0, phase:0, temp:TA, broken:false }; }
function clampC(c){
  const mnx=Math.min(c.ax,c.bx), mxx=Math.max(c.ax,c.bx), mny=Math.min(c.ay,c.by), mxy=Math.max(c.ay,c.by);
  const dx = mnx<0 ? -mnx : mxx>N-1 ? N-1-mxx : 0, dy = mny<0 ? -mny : mxy>N-1 ? N-1-mxy : 0;
  c.ax+=dx; c.bx+=dx; c.ay+=dy; c.by+=dy;
}
const K = (x,y) => y*N + x;
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while (b){ [a,b]=[b,a%b]; } return a; }
function hasWire(a,b,c,d){ return wires.some(w=>(w.ax===a&&w.ay===b&&w.bx===c&&w.by===d)||(w.ax===c&&w.ay===d&&w.bx===a&&w.by===b)); }
// a wire that passes over grid points is split there, so every point it crosses becomes a real connection
function addWire(ax,ay,bx,by,off){
  const g=gcd(bx-ax,by-ay); if (!g) return 0; const sx=(bx-ax)/g, sy=(by-ay)/g; let n=0;
  for (let k=0;k<g;k++){ const s=[ax+sx*k,ay+sy*k,ax+sx*(k+1),ay+sy*(k+1)]; if (!hasWire(...s)){ const w=mkw(...s); if (off) w.off=true; wires.push(w); n++; } }
  return n;
}

const PREFIX = { dc:'DC', ac:'AC', res:'R', bulb:'B', sw:'S', fuse:'F', cap:'C', ind:'L', diode:'D', led:'LED', vm:'VM', am:'AM' };
const TAGC = { dc:'--copper', ac:'--copper', res:'--ink', bulb:'--ink', cap:'--ink', ind:'--ink', sw:'--muted', fuse:'--muted', diode:'--led', led:'--led', vm:'--accent', am:'--accent' };
const lab = c => c.name || (PREFIX[c.type] + (c.num||''));
function assignNum(c){ if (c.num) return; const used=new Set(comps.filter(x=>x!==c && x.type===c.type && x.num).map(x=>x.num)); let n=1; while (used.has(n)) n++; c.num=n; }
function numberAll(){ for (const c of comps) assignNum(c); }
function serialize(){
  return { comps: comps.map(c => { const o={type:c.type,ax:c.ax,ay:c.ay,bx:c.bx,by:c.by,num:c.num,name:c.name}; for (const k in T[c.type].def) o[k]=c[k]; if (c.off) o.off=1; return o; }),
    wires: wires.map(w => w.off ? [w.ax,w.ay,w.bx,w.by,1] : [w.ax,w.ay,w.bx,w.by]), ideal, title: circuitName };
}
function validData(d){ return d && Array.isArray(d.comps) && Array.isArray(d.wires); }
function applyData(d){
  if (typeof d.title==='string' && d.title.trim()) setCircuit(d.title);
  setIdeal(d.ideal!==false, true);
  comps = d.comps.filter(o => T[o.type]).map(o => { const p={}; for (const k in T[o.type].def) if (typeof o[k]===typeof T[o.type].def[k]) p[k]=o[k];
    const c=mk(o.type,o.ax|0,o.ay|0,o.bx|0,o.by|0,p); if (o.num) c.num=o.num|0; if (typeof o.name==='string') c.name=o.name.slice(0,12); if (o.off) c.off=true; clampC(c); return c; });
  wires = []; for (const a of d.wires.filter(a => Array.isArray(a) && a.length>=4)) addWire(...a.slice(0,4).map(v => Math.max(0,Math.min(N-1,v|0))), !!a[4]);
  numberAll(); resetSim(); dirty=true; select(null); save();
}
function resetSim(){ t=0; hist={v:[],i:[]}; energy={sup:0,heat:0}; parts=[]; flashes=[]; marks=[]; const lg=document.getElementById('log'); if (lg) lg.innerHTML=''; }
function save(){ try { localStorage.setItem('circuit-lab-v1', JSON.stringify(serialize())); } catch(e){} }
function load(){
  try { const d = JSON.parse(localStorage.getItem('circuit-lab-v1')||'null');
    if (!validData(d) || !d.comps.length) return false; applyData(d); return true; } catch(e){ return false; }
}

/* ---------- presets ---------- */
function path(pts){ for (let k=0;k<pts.length-1;k++) addWire(pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1]); }
const PRESETS = {
  flash(){ comps=[ mk('dc',3,9,3,7,{E:9}), mk('sw',7,3,9,3), mk('am',11,3,13,3), mk('bulb',16,7,16,9,{R:20}), mk('vm',18,7,18,9) ];
    path([[3,7],[3,3],[7,3]]); path([[9,3],[11,3]]); path([[13,3],[16,3],[16,7]]); path([[16,9],[16,14],[3,14],[3,9]]);
    path([[16,7],[18,7]]); path([[16,9],[18,9]]); return 3; },
  rc(){ comps=[ mk('dc',3,9,3,7,{E:9}), mk('sw',6,3,8,3,{on:false}), mk('res',10,3,12,3,{R:220}), mk('cap',15,7,15,9,{C:4700}), mk('vm',18,7,18,9) ];
    path([[3,7],[3,3],[6,3]]); path([[8,3],[10,3]]); path([[12,3],[15,3],[15,7]]); path([[15,9],[15,14],[3,14],[3,9]]);
    path([[15,7],[18,7]]); path([[15,9],[18,9]]); return 3; },
  rect(){ comps=[ mk('ac',3,9,3,7,{E:10,f:1}), mk('diode',7,3,9,3), mk('bulb',14,7,14,9,{R:50}), mk('vm',17,7,17,9) ];
    path([[3,7],[3,3],[7,3]]); path([[9,3],[14,3],[14,7]]); path([[14,9],[14,14],[3,14],[3,9]]);
    path([[14,7],[17,7]]); path([[14,9],[17,9]]); return 3; },
  par(){ comps=[ mk('dc',3,10,3,8,{E:12}), mk('am',6,3,8,3), mk('bulb',10,8,10,10,{R:24}), mk('bulb',14,8,14,10,{R:24}), mk('sw',16,3,18,3), mk('bulb',18,8,18,10,{R:24}) ];
    path([[3,8],[3,3],[6,3]]); path([[8,3],[16,3]]); path([[10,3],[10,8]]); path([[14,3],[14,8]]); path([[18,3],[18,8]]);
    path([[18,10],[18,15],[3,15],[3,10]]); path([[10,10],[10,15]]); path([[14,10],[14,15]]); return 1; },
  boom(){ comps=[ mk('dc',3,9,3,7,{E:9}), mk('sw',6,3,8,3,{on:false}), mk('res',11,3,13,3,{R:10,Pmax:2}), mk('am',15,7,15,9) ];
    path([[3,7],[3,3],[6,3]]); path([[8,3],[11,3]]); path([[13,3],[15,3],[15,7]]); path([[15,9],[15,14],[3,14],[3,9]]); return 2; },
  fuse(){ comps=[ mk('dc',3,9,3,7,{E:12}), mk('fuse',6,3,8,3,{Imax:2}), mk('bulb',13,7,13,9,{R:24}), mk('sw',16,7,16,9,{on:false}) ];
    path([[3,7],[3,3],[6,3]]); path([[8,3],[13,3],[13,7]]); path([[13,9],[13,14],[3,14],[3,9]]); path([[13,7],[16,7]]); path([[13,9],[16,9]]); return 3; },
  short(){ comps=[ mk('dc',3,9,3,7,{E:9}), mk('bulb',10,7,10,9,{R:20}), mk('sw',14,7,14,9,{on:false}) ];
    path([[3,7],[3,3],[10,3],[10,7]]); path([[10,9],[10,14],[3,14],[3,9]]); path([[10,7],[14,7]]); path([[10,9],[14,9]]); return 2; },
  pat3(){ comps=[ mk('ac',2,11,2,9,{E:10,f:1}), mk('am',7,5,7,7,{name:'I_R'}), mk('res',7,9,7,11,{R:10,Pmax:50}), mk('am',11,5,11,7,{name:'I_L'}), mk('ind',11,9,11,11,{L:2}), mk('am',15,5,15,7,{name:'I_C'}), mk('cap',15,9,15,11,{C:50000,Vmax:25}) ];
    path([[2,3],[15,3]]); path([[2,3],[2,9]]); path([[2,11],[2,15],[15,15]]);
    for (const x of [7,11,15]){ path([[x,3],[x,5]]); path([[x,7],[x,9]]); path([[x,11],[x,15]]); } return 0; },
  led(){ comps=[ mk('dc',3,9,3,7,{E:5}), mk('res',8,3,10,3,{R:150}), mk('led',14,7,14,9), mk('am',8,14,6,14) ];
    path([[3,7],[3,3],[8,3]]); path([[10,3],[14,3],[14,7]]); path([[14,9],[14,14],[8,14]]); path([[6,14],[3,14],[3,9]]); return 2; },
};
function loadPreset(name, announce){
  setIdeal(!REAL_PRESETS.has(name), true);
  comps=[]; wires=[]; const si = PRESETS[name](); numberAll(); resetSim(); dirty=true;
  setCircuit(presetTitle(name), announce);
  select(comps[si]||null); save();
}

/* ---------- topology + solver ---------- */
function build(){
  const uf = new Int32Array(N*N); for (let k=0;k<N*N;k++) uf[k]=k;
  const f = k => { while (uf[k]!==k){ uf[k]=uf[uf[k]]; k=uf[k]; } return k; };
  for (const w of wires){ if (w.broken||w.off) continue; const a=f(K(w.ax,w.ay)), b=f(K(w.bx,w.by)); if (a!==b) uf[a]=b; }
  for (const c of comps){ c.ra=f(K(c.ax,c.ay)); c.rb=f(K(c.bx,c.by)); }
  const u2 = new Int32Array(N*N); for (let k=0;k<N*N;k++) u2[k]=k;
  const f2 = k => { while (u2[k]!==k){ u2[k]=u2[u2[k]]; k=u2[k]; } return k; };
  for (const c of comps){ const a=f2(c.ra), b=f2(c.rb); if (a!==b) u2[a]=b; }
  const gnd = new Map();
  for (const c of comps) if (c.type==='dc'||c.type==='ac'){ const is=f2(c.ra); if (!gnd.has(is)) gnd.set(is,c.ra); }
  for (const c of comps){ const is=f2(c.ra); if (!gnd.has(is)) gnd.set(is,c.ra); }
  const gset = new Set(gnd.values()), idx = new Map(); let n=0;
  for (const c of comps) for (const r of [c.ra,c.rb]) if (!idx.has(r)) idx.set(r, gset.has(r) ? -1 : n++);
  // wire groups for per-segment current
  const groups = new Map();
  for (const w of wires){ if (w.broken||w.off){ w.i=0; continue; } const r=f(K(w.ax,w.ay)); if (!groups.has(r)) groups.set(r,{nodes:new Map(),ws:[]});
    const g=groups.get(r); g.ws.push(w); for (const k of [K(w.ax,w.ay),K(w.bx,w.by)]) if (!g.nodes.has(k)) g.nodes.set(k,g.nodes.size); }
  topo = { n, idx, A:new Float64Array(n*n), b:new Float64Array(n), x:new Float64Array(n), groups, gset, find:f,
    nonlin: comps.some(c => c.type==='diode'||c.type==='led') };
  dirty = false;
}

function solve(A, b, n, x){
  for (let c=0;c<n;c++){
    let p=c, m=Math.abs(A[c*n+c]);
    for (let r=c+1;r<n;r++){ const v=Math.abs(A[r*n+c]); if (v>m){ m=v; p=r; } }
    if (p!==c){ for (let k=c;k<n;k++){ const tmp=A[c*n+k]; A[c*n+k]=A[p*n+k]; A[p*n+k]=tmp; } const tb=b[c]; b[c]=b[p]; b[p]=tb; }
    let piv=A[c*n+c]; if (Math.abs(piv)<1e-300) piv=A[c*n+c]=1e-300;
    for (let r=c+1;r<n;r++){ const fct=A[r*n+c]/piv; if (!fct) continue; for (let k=c;k<n;k++) A[r*n+k]-=fct*A[c*n+k]; b[r]-=fct*b[c]; }
  }
  for (let r=n-1;r>=0;r--){ let s=b[r]; for (let k=r+1;k<n;k++) s-=A[r*n+k]*x[k]; x[r]=s/A[r*n+r]; }
}

function gj(c){
  if (c.broken || c.off) return [1e-10, 0];
  switch (c.type){
    case 'fuse': return [1/RF, 0];
    case 'res': case 'bulb': return [1/c.R, 0];
    case 'dc': { const Rs=srcR(c); return [1/Rs, c.E/Rs]; }
    case 'ac': { const Rs=srcR(c); return [1/Rs, c.E*Math.sin(2*Math.PI*c.f*t)/Rs]; }
    case 'am': return [1/amR(), 0];
    case 'vm': return [1/vmR(), 0];
    case 'sw': return [c.on ? 1/RAM : 1e-10, 0];
    case 'cap': { const G=c.C*1e-6/DT; return [G, -G*c.vp]; }
    case 'ind': { const G=DT/c.L; return [G, c.ip]; }
    case 'diode': case 'led': { const P=DP[dkey(c)], e=Math.exp(Math.min(c.vd/P.nvt, 80)), Id=P.Is*(e-1), Gd=P.Is/P.nvt*e+1e-12; return [Gd, Id-Gd*c.vd]; }
  }
  return [0,0];
}
function pnj(vn, vo, P){
  if (vn>P.vcrit && Math.abs(vn-vo)>2*P.nvt){
    if (vo>0){ const a=1+(vn-vo)/P.nvt; vn = a>0 ? vo+P.nvt*Math.log(a) : P.vcrit; } else vn = P.nvt*Math.log(vn/P.nvt);
  }
  return Math.max(vn, -200);
}
const NV = r => { const k=topo.idx.get(r); return k===undefined||k<0 ? 0 : topo.x[k]; };

function step(){
  const {n, idx, A, b, x} = topo;
  if (n>0){
    for (let it=0; it<60; it++){
      A.fill(0); b.fill(0); for (let k=0;k<n;k++) A[k*n+k]=GMIN;
      for (const c of comps){
        const [g,j]=gj(c), ia=idx.get(c.ra), ib=idx.get(c.rb);
        if (ia>=0){ A[ia*n+ia]+=g; b[ia]-=j; }
        if (ib>=0){ A[ib*n+ib]+=g; b[ib]+=j; }
        if (ia>=0 && ib>=0){ A[ia*n+ib]-=g; A[ib*n+ia]-=g; }
      }
      solve(A,b,n,x);
      if (!topo.nonlin) break;
      let conv=true;
      for (const c of comps) if (c.type==='diode'||c.type==='led'){
        const v=NV(c.ra)-NV(c.rb), vn=pnj(v,c.vd,DP[dkey(c)]);
        if (Math.abs(vn-c.vd)>1e-6) conv=false; c.vd=vn;
      }
      if (conv) break;
    }
  }
  for (const c of comps){
    const v = n>0 ? NV(c.ra)-NV(c.rb) : 0, [g,j] = gj(c);
    c.v=v; c.i = n>0 ? g*v+j : 0;
    if (c.type==='cap') c.vp=v;
    if (c.type==='ind') c.ip=c.i;
    // energy bookkeeping
    if (c.type==='dc'||c.type==='ac'){
      const emf = c.broken ? 0 : (c.type==='dc' ? c.E : c.E*Math.sin(2*Math.PI*c.f*t));
      c.pNow = emf*c.i; energy.sup += emf*c.i*DT; energy.heat += (emf*c.i + v*c.i)*DT; c.en += emf*c.i*DT;
    } else if (c.type==='cap'||c.type==='ind'){ c.en += v*c.i*DT; }
    else { energy.heat += v*c.i*DT; c.en += Math.abs(v*c.i)*DT; }
    // heating
    if (ideal){ c.temp=TA; c.pHeat=0; c.pMax=1e9; continue; }
    const [ph, pmax, tau] = thermal(c), Rth=(TSAFE-TA)/pmax, Cth=tau/Rth;
    c.pHeat = ph; c.pMax = pmax;
    c.temp = Math.min(3000, c.temp + (ph - (c.temp-TA)/Rth)/Cth*DT);
    if (!c.broken && c.temp>=TFAIL && pmax<1e8){ c.broken=true; c.vd=0; c.failMsg=failText(c,ph,pmax); events.push(c); }
  }
  t += DT;
}
function thermal(c){
  switch (c.type){
    case 'dc': case 'ac': return [c.i*c.i*srcR(c), c.Pmax, 1];
    case 'res': case 'bulb': return [Math.abs(c.v*c.i), c.Pmax, 1.5];
    case 'sw': return [c.i*c.i*RAM, c.Pmax, 1];
    case 'am': return [c.i*c.i*amR(), c.Pmax, 0.5];
    case 'diode': case 'led': return [Math.abs(c.v*c.i), c.Pmax, 0.8];
    case 'cap': return [Math.max(0,Math.abs(c.v)-c.Vmax)*2, 1, 0.5];
    case 'ind': return [c.i*c.i, c.Imax*c.Imax, 2];
    case 'fuse': return [c.i*c.i*RF, c.Imax*c.Imax*RF, 0.25];
  }
  return [0, 1e9, 1];
}
function failText(c, ph, pmax){
  const nm=T[c.type].name, at=` (t = ${t.toFixed(2)} s)`;
  if (c.type==='fuse') return `ฟิวส์ขาด กระแส ${fmt(Math.abs(c.i),'A')} เกินพิกัด ${fmt(c.Imax,'A')} ช่วยตัดวงจรไว้ทัน`+at;
  if (c.type==='cap') return `${nm}ระเบิด แรงดัน ${fmt(Math.abs(c.v),'V')} เกินพิกัด ${fmt(c.Vmax,'V')}`+at;
  if (c.type==='ind') return `${nm}ไหม้ กระแส ${fmt(Math.abs(c.i),'A')} เกินพิกัด ${fmt(c.Imax,'A')}`+at;
  if (c.type==='dc'||c.type==='ac') return `${nm}ระเบิด ความร้อนภายใน ${fmt(ph,'W')} จากกระแส ${fmt(Math.abs(c.i),'A')} (ลัดวงจร)`+at;
  if (c.type==='bulb') return `ไส้หลอดขาด กำลัง ${fmt(ph,'W')} เกินพิกัด ${fmt(pmax,'W')}`+at;
  return `${nm}ไหม้ กำลัง ${fmt(ph,'W')} เกินพิกัด ${fmt(pmax,'W')}`+at;
}

function wireCurrents(){
  const s = new Map();
  for (const c of comps){ const ka=K(c.ax,c.ay), kb=K(c.bx,c.by); s.set(ka,(s.get(ka)||0)-c.i); s.set(kb,(s.get(kb)||0)+c.i); }
  for (const g of topo.groups.values()){
    const m=g.nodes.size; if (m<2){ g.ws.forEach(w=>w.i=0); continue; }
    const n=m-1, A=new Float64Array(n*n), b=new Float64Array(n), x=new Float64Array(n);
    for (const w of g.ws){ const p=g.nodes.get(K(w.ax,w.ay)), q=g.nodes.get(K(w.bx,w.by)); if (p===q) continue;
      if (p<n) A[p*n+p]+=1; if (q<n) A[q*n+q]+=1; if (p<n&&q<n){ A[p*n+q]-=1; A[q*n+p]-=1; } }
    for (const [k,ix] of g.nodes) if (ix<n) b[ix]=s.get(k)||0;
    solve(A,b,n,x);
    const phi = ix => ix<n ? x[ix] : 0;
    for (const w of g.ws) w.i = phi(g.nodes.get(K(w.ax,w.ay))) - phi(g.nodes.get(K(w.bx,w.by)));
  }
}

/* ---------- drawing ---------- */
function drawSymbol(x, c, uu, Cc, ang){
  const lw=Math.max(1.4,uu*0.085); x.lineWidth=lw; x.strokeStyle=Cc.ink; x.fillStyle=Cc.ink; x.lineCap='round'; x.lineJoin='round';
  const L=2*uu, m=uu;
  const ln=(a,b2,c2,d)=>{ x.beginPath(); x.moveTo(a,b2); x.lineTo(c2,d); x.stroke(); };
  const ring=(r,fill)=>{ x.beginPath(); x.arc(m,0,r,0,Math.PI*2); x.fillStyle=fill; x.fill(); x.stroke(); x.fillStyle=Cc.ink; };
  const plus=(px,py,r)=>{ ln(px-r,py,px+r,py); ln(px,py-r,px,py+r); };
  const letter=(ch)=>{ x.save(); x.translate(m,0); x.rotate(-ang); x.font=`600 ${Math.round(uu*0.5)}px "Chakra Petch", sans-serif`; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle=Cc.ink; x.fillText(ch,0,uu*0.03); x.restore(); };
  switch (c.type){
    case 'res': ln(0,0,.5*uu,0); ln(1.5*uu,0,L,0); x.beginPath(); x.moveTo(.5*uu,0);
      for (let k=0;k<6;k++) x.lineTo(.5*uu+(k+.5)*uu/6,(k%2?1:-1)*.24*uu); x.lineTo(1.5*uu,0); x.stroke(); break;
    case 'bulb': { const r=.4*uu; ln(0,0,m-r,0); ln(m+r,0,L,0);
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(1,c.glow)*0.35; x.fillStyle=Cc.glow; x.beginPath(); x.arc(m,0,r*(1.25+1.1*Math.min(1,c.glow)),0,7); x.fill(); x.restore(); }
      ring(r,Cc.bg);
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(1,0.25+c.glow); x.fillStyle=Cc.glow; x.beginPath(); x.arc(m,0,r-lw/2,0,7); x.fill(); x.restore(); }
      const q=r*.68; ln(m-q,-q,m+q,q); ln(m-q,q,m+q,-q); break; }
    case 'cap': ln(0,0,.86*uu,0); ln(1.14*uu,0,L,0); x.lineWidth=lw*1.6; ln(.86*uu,-.4*uu,.86*uu,.4*uu); ln(1.14*uu,-.4*uu,1.14*uu,.4*uu); break;
    case 'ind': ln(0,0,.5*uu,0); ln(1.5*uu,0,L,0); x.beginPath(); x.moveTo(.5*uu,0);
      for (let k=0;k<4;k++) x.arc(.5*uu+(k+.5)*.25*uu,0,.125*uu,Math.PI,0,false); x.stroke(); break;
    case 'diode': ln(0,0,.68*uu,0); ln(1.32*uu,0,L,0); x.beginPath(); x.moveTo(.68*uu,-.32*uu); x.lineTo(.68*uu,.32*uu); x.lineTo(1.32*uu,0); x.closePath(); x.fill();
      ln(1.32*uu,-.34*uu,1.32*uu,.34*uu); break;
    case 'led': { const r=.46*uu; ln(0,0,m-r,0); ln(m+r,0,L,0);
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(1,c.glow)*0.4; x.fillStyle=Cc.led; x.beginPath(); x.arc(m,0,r*(1.2+1.0*Math.min(1,c.glow)),0,7); x.fill(); x.restore(); }
      ring(r,Cc.bg);
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(.9,0.2+c.glow); x.fillStyle=Cc.led; x.beginPath(); x.arc(m,0,r-lw/2,0,7); x.fill(); x.restore(); }
      x.fillStyle=Cc.ink; x.beginPath(); x.moveTo(m-.22*uu,-.22*uu); x.lineTo(m-.22*uu,.22*uu); x.lineTo(m+.2*uu,0); x.closePath(); x.fill();
      ln(m-r,0,m-.22*uu,0); ln(m+.2*uu,0,m+r,0); ln(m+.2*uu,-.24*uu,m+.2*uu,.24*uu);
      ln(m+.05*uu,-.52*uu,m+.3*uu,-.8*uu); ln(m+.28*uu,-.44*uu,m+.53*uu,-.72*uu); break; }
    case 'dc': ln(0,0,.88*uu,0); ln(1.12*uu,0,L,0); x.lineWidth=lw*2.4; ln(.88*uu,-.2*uu,.88*uu,.2*uu); x.lineWidth=lw; ln(1.12*uu,-.44*uu,1.12*uu,.44*uu);
      plus(1.5*uu,-.42*uu,.12*uu); break;
    case 'ac': { const r=.42*uu; ln(0,0,m-r,0); ln(m+r,0,L,0); ring(r,Cc.bg); x.beginPath();
      for (let k=0;k<=24;k++){ const px=m-r*.62+k*(r*1.24/24), py=-Math.sin(k/24*Math.PI*2)*r*.4; k?x.lineTo(px,py):x.moveTo(px,py); } x.stroke(); break; }
    case 'vm': case 'am': { const r=.44*uu; ln(0,0,m-r,0); ln(m+r,0,L,0); ring(r,Cc.bg); letter(c.type==='vm'?'V':'A'); plus(.32*uu,-.36*uu,.11*uu); break; }
    case 'sw': ln(0,0,.6*uu,0); ln(1.4*uu,0,L,0);
      x.beginPath(); x.arc(.6*uu,0,.08*uu,0,7); x.fill(); x.beginPath(); x.arc(1.4*uu,0,.08*uu,0,7); x.fill();
      if (c.on) ln(.6*uu,0,1.4*uu,-.06*uu); else ln(.6*uu,0,1.3*uu,-.5*uu); break;
    case 'fuse': ln(0,0,.55*uu,0); ln(1.45*uu,0,L,0); x.strokeRect(.55*uu,-.2*uu,.9*uu,.4*uu);
      if (c.broken){ ln(.55*uu,0,.82*uu,0); ln(1.18*uu,0,1.45*uu,0); x.beginPath(); x.arc(.84*uu,0,.06*uu,0,7); x.arc(1.16*uu,0,.06*uu,0,7); x.fill(); }
      else ln(.55*uu,0,1.45*uu,0); break;
  }
  if (c.broken && c.type!=='fuse'){
    x.save(); x.globalAlpha=0.7; x.fillStyle=Cc.smoke; x.beginPath(); x.ellipse(m,0,.62*uu,.42*uu,0,0,7); x.fill(); x.restore();
    x.strokeStyle=Cc.heat; x.lineWidth=lw;
    x.beginPath(); x.moveTo(m-.35*uu,-.28*uu); x.lineTo(m-.08*uu,-.02*uu); x.lineTo(m-.2*uu,.08*uu); x.lineTo(m+.1*uu,.3*uu); x.stroke();
    x.beginPath(); x.moveTo(m+.32*uu,-.3*uu); x.lineTo(m+.05*uu,-.05*uu); x.stroke();
  }
}

function fmt(v, unit){
  const a=Math.abs(v); if (!isFinite(v)) return '– '+unit; if (a<1e-9) return '0 '+unit;
  for (const [m,p] of [[1e6,'M'],[1e3,'k'],[1,''],[1e-3,'m'],[1e-6,'µ'],[1e-9,'n']]){
    if (a>=m*0.9995 || m===1e-9){ const q=v/m, aq=Math.abs(q); return (aq>=100?q.toFixed(0):aq>=10?q.toFixed(1):q.toFixed(2))+' '+p+unit; }
  }
}
const flowSpeed = i => { const a=Math.abs(i); if (a<1e-6) return 0; return Math.sign(i)*1.6*Math.min(5, Math.cbrt(a/0.01)); };
const P = g => (g+0.5)*u;

function dots(el, color){
  if (Math.abs(el.i)<1e-6) return;
  const ax=P(el.ax), ay=P(el.ay), bx=P(el.bx), by=P(el.by), len=Math.hypot(bx-ax,by-ay); if (!len) return;
  const sp=0.5*u, ph=(elMode?-el.phase:el.phase)*u, off=((ph%sp)+sp)%sp;
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=color;
  const r=Math.max(2,u*0.09), dx=(bx-ax)/len, dy=(by-ay)/len, dir=Math.sign(elMode?-el.i:el.i);
  for (let d=off; d<len; d+=sp){ const q=d/len, x=ax+(bx-ax)*q, y=ay+(by-ay)*q;
    ctx.globalAlpha=0.18; ctx.beginPath(); ctx.arc(x,y,r*2.6,0,7); ctx.fill();
    ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(x-dx*dir*r*1.6,y-dy*dir*r*1.6,r*0.8,0,7); ctx.fill();
    ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  ctx.restore();
}

function pill(text, x, y, al='c', strong=false){
  ctx.font=`500 ${Math.max(11,Math.round(u*0.4))}px "IBM Plex Mono","IBM Plex Sans Thai", monospace`;
  const w=ctx.measureText(text).width+10, h=Math.max(16,u*0.58);
  const x0 = al==='l' ? x : al==='r' ? x-w : x-w/2;
  let px=Math.min(Math.max(x0,2),side-w-2), py=Math.min(Math.max(y-h/2,2),side-h-2);
  if (depth){ ctx.save(); ctx.globalAlpha=0.4; ctx.fillStyle='#000'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px+2,py+3,w,h,5) : ctx.rect(px+2,py+3,w,h); ctx.fill(); ctx.restore(); }
  ctx.fillStyle=C.panel; ctx.strokeStyle=C.line; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px,py,w,h,5) : ctx.rect(px,py,w,h); ctx.fill(); ctx.stroke();
  ctx.fillStyle=C.ink; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(text,px+5,py+h/2+0.5);
}

function labelText(c){
  let v='';
  switch (c.type){
    case 'dc': v=fmt(c.E,'V'); break; case 'ac': v=fmt(c.E,'V')+' '+fmt(c.f,'Hz'); break;
    case 'res': case 'bulb': v=fmt(c.R,'Ω'); break; case 'cap': v=fmt(c.C*1e-6,'F'); break; case 'ind': v=fmt(c.L,'H'); break;
    case 'fuse': v=fmt(c.Imax,'A'); break; case 'sw': v=c.on?'ต่อ':'ตัด'; break;
    case 'vm': v=fmt(c.v,'V'); break; case 'am': v=fmt(c.i,'A'); break;
  }
  return lab(c) + (v?' '+v:'') + (c.broken?' ไหม้':'') + (c.off?' (พัก)':'');
}
// 2.5D view: each part is a small raised block with its symbol on top, lit from the top left, casting a shadow down-right.
// It only changes how parts are painted; positions and hit-testing stay on the flat grid.
const RAISE = { top:'#12291F', side:'#081A13', ink:'#73857D' };
function drawRaised(c, ang){
  const lifted = drag && drag.mode==='move' && drag.c===c, h=u*(lifted?0.42:0.22), steps=lite?2:5;
  const at=(dx,dy,fn)=>{ ctx.save(); ctx.translate(P(c.ax)+dx,P(c.ay)+dy); ctx.rotate(ang); if (c.off) ctx.globalAlpha*=0.35; fn(); ctx.restore(); };
  const plate=(x,fill)=>{ x.fillStyle=fill; x.beginPath(); x.roundRect ? x.roundRect(u*0.32,-u*0.46,u*1.36,u*0.92,u*0.14) : x.rect(u*0.32,-u*0.46,u*1.36,u*0.92); x.fill(); };
  const dark=Object.assign({},C,{ink:RAISE.ink,bg:RAISE.side,glow:RAISE.side,led:RAISE.side}), dc={...c,glow:0};
  // shadow on the board: a soft wide pass and a sharper one
  at(h*1.2,h*1.5,()=>{ ctx.globalAlpha*=0.22; plate(ctx,'#000'); });
  at(h*0.7,h*0.9,()=>{ ctx.globalAlpha*=0.5; plate(ctx,'#000'); });
  // side walls: the block and its legs stacked from board level up to the top face
  for (let k=0;k<steps;k++){ const f=k/steps;
    at(-h*0.35*f,-h*f,()=>{ plate(ctx,RAISE.side); drawSymbol(ctx,dc,u,dark,ang); }); }
  // top face
  at(-h*0.35,-h,()=>{
    plate(ctx,RAISE.top);
    ctx.save(); ctx.globalAlpha*=0.22; ctx.strokeStyle=C.silk; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(u*0.32,-u*0.46,u*1.36,u*0.92,u*0.14) : ctx.rect(u*0.32,-u*0.46,u*1.36,u*0.92); ctx.stroke(); ctx.restore();
    if (!c.off){ ctx.shadowColor='rgba(216,232,225,.45)'; ctx.shadowBlur=glow(u*0.25); }
    drawSymbol(ctx,c,u,Object.assign({},C,{ink:C.silk}),ang); });
}
const heatF = T0 => Math.max(0, Math.min(1, (T0-TA)/(TFAIL-TA)));
function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,side,side);
  if (shake>0){ const a=shake*u*0.5; ctx.translate((Math.random()-.5)*a,(Math.random()-.5)*a); }
  const now=performance.now();
  if (!layers || layers.side!==side || layers.dpr!==dpr) buildLayers();
  ctx.drawImage(layers.grid,0,0,side,side);

  const deg = new Map(); const bump=k=>deg.set(k,(deg.get(k)||0)+1);
  for (const w of wires){ bump(K(w.ax,w.ay)); bump(K(w.bx,w.by)); }
  for (const c of comps){ bump(K(c.ax,c.ay)); bump(K(c.bx,c.by)); }

  if (sel){ ctx.save(); ctx.strokeStyle=C.accent; ctx.globalAlpha=0.16; ctx.lineCap='round'; ctx.lineWidth=sel.w?u*0.42:u*1.0;
    ctx.beginPath(); ctx.moveTo(P(sel.ax),P(sel.ay)); ctx.lineTo(P(sel.bx),P(sel.by)); ctx.stroke();
    if (!sel.w){ const x1=Math.min(P(sel.ax),P(sel.bx))-u*0.55, y1=Math.min(P(sel.ay),P(sel.by))-u*0.55, x2=Math.max(P(sel.ax),P(sel.bx))+u*0.55, y2=Math.max(P(sel.ay),P(sel.by))+u*0.55;
      ctx.globalAlpha=0.9; ctx.lineWidth=1.5; ctx.setLineDash([5,4]); ctx.lineDashOffset=-now*0.02; ctx.shadowColor=C.accent; ctx.shadowBlur=glow(8);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x1,y1,x2-x1,y2-y1,6) : ctx.rect(x1,y1,x2-x1,y2-y1); ctx.stroke(); }
    ctx.restore(); }

  drawMarks();
  if (showHeat){
    ctx.save(); ctx.fillStyle=C.heat; ctx.strokeStyle=C.heat; ctx.lineCap='round';
    for (const c of comps){ const f=heatF(c.temp); if (f<0.04) continue;
      ctx.globalAlpha=0.15+f*0.45; ctx.beginPath(); ctx.arc((P(c.ax)+P(c.bx))/2,(P(c.ay)+P(c.by))/2,u*(0.55+0.55*f),0,7); ctx.fill(); }
    for (const w of wires){ const f=heatF(w.temp); if (f<0.04||w.broken) continue;
      ctx.globalAlpha=0.2+f*0.5; ctx.lineWidth=u*(0.18+0.3*f); ctx.beginPath(); ctx.moveTo(P(w.ax),P(w.ay)); ctx.lineTo(P(w.bx),P(w.by)); ctx.stroke(); }
    ctx.restore();
  }

  ctx.lineCap='round';
  const trace=(ax,ay,bx,by)=>{
    ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=Math.max(3,u*0.2); ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    ctx.strokeStyle=C.wire; ctx.lineWidth=Math.max(2,u*0.12); ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    ctx.save(); ctx.strokeStyle=C.glow; ctx.globalAlpha=0.35; ctx.lineWidth=Math.max(0.8,u*0.03); ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke(); ctx.restore(); };
  for (const w of wires){ if (!w.broken && !w.off) trace(P(w.ax),P(w.ay),P(w.bx),P(w.by)); }
  ctx.save(); ctx.strokeStyle=C.wire; ctx.globalAlpha=0.45; ctx.lineWidth=Math.max(1.5,u*0.08); ctx.setLineDash([u*0.14,u*0.12]);
  for (const w of wires){ if (w.off && !w.broken){ ctx.beginPath(); ctx.moveTo(P(w.ax),P(w.ay)); ctx.lineTo(P(w.bx),P(w.by)); ctx.stroke(); } }
  ctx.restore();
  ctx.strokeStyle=C.wire; ctx.lineWidth=Math.max(2,u*0.12);
  for (const w of wires){
    if (!w.broken) continue;
    const ax=P(w.ax), ay=P(w.ay), bx=P(w.bx), by=P(w.by), q1=.42, q2=.58;
    ctx.strokeStyle=C.wire; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+(bx-ax)*q1, ay+(by-ay)*q1); ctx.moveTo(ax+(bx-ax)*q2, ay+(by-ay)*q2); ctx.lineTo(bx,by); ctx.stroke();
    ctx.fillStyle=C.heat; for (const q of [q1,q2]){ ctx.beginPath(); ctx.arc(ax+(bx-ax)*q, ay+(by-ay)*q, u*0.11, 0, 7); ctx.fill(); }
  }

  for (const c of comps){
    const ang=Math.atan2(c.by-c.ay, c.bx-c.ax);
    if (depth){ drawRaised(c, ang); continue; }
    ctx.save(); ctx.translate(P(c.ax),P(c.ay)); ctx.rotate(ang);
    ctx.fillStyle=C.bg; ctx.fillRect(u*0.3,-u*0.5,u*1.4,u);
    if (c.off){ ctx.globalAlpha=0.35; } else { ctx.shadowColor='rgba(216,232,225,.45)'; ctx.shadowBlur=glow(u*0.25); }
    drawSymbol(ctx,c,u,Object.assign({},C,{ink:C.silk}),ang); ctx.restore();
  }

  for (const [k,d] of deg){ const x=k%N, y=(k-x)/N; ctx.fillStyle=C.wire; ctx.beginPath(); ctx.arc(P(x),P(y), d>=3?u*0.17:u*0.12, 0, 7); ctx.fill(); ctx.fillStyle=C.hole; ctx.beginPath(); ctx.arc(P(x),P(y), u*0.05, 0, 7); ctx.fill(); }

  const dc = elMode ? C.el : C.copper;
  for (const w of wires) dots(w, dc);
  for (const c of comps) if (c.type!=='vm') dots(c, dc);

  for (const c of comps){
    const mx=(P(c.ax)+P(c.bx))/2, my=(P(c.ay)+P(c.by))/2, hz=c.ay===c.by;
    let txt=null;
    if (showLabels) txt=labelText(c);
    else if (c.type==='vm') txt=fmt(c.v,'V'); else if (c.type==='am') txt=fmt(c.i,'A');
    if (txt){ if (hz) pill(txt, mx, my-u*0.95); else pill(txt, mx+u*0.62, my, 'l'); }
    if (showHeat && c.temp>60 && !c.broken){ const tt=Math.round(c.temp)+' °C'; if (hz) pill(tt, mx, my+u*0.95); else pill(tt, mx-u*0.62, my, 'r'); }
  }

  if (tool==='rotate' && lastG && !drag){
    const c=rotTarget(lastG);
    if (c){ const mx=(P(c.ax)+P(c.bx))/2, my=(P(c.ay)+P(c.by))/2, R=u*1.25;
      ctx.save(); ctx.strokeStyle=C.accent; ctx.fillStyle=C.accent; ctx.shadowColor=C.accent; ctx.shadowBlur=glow(12); ctx.lineCap='round';
      ctx.globalAlpha=0.4; ctx.lineWidth=u*0.85; ctx.beginPath(); ctx.moveTo(P(c.ax),P(c.ay)); ctx.lineTo(P(c.bx),P(c.by)); ctx.stroke();
      ctx.globalAlpha=0.95; ctx.lineWidth=2; const a0=-Math.PI*0.85, a1=-Math.PI*0.15;
      ctx.beginPath(); ctx.arc(mx,my,R,a0,a1); ctx.stroke();
      const ex=mx+R*Math.cos(a1), ey=my+R*Math.sin(a1), tx=-Math.sin(a1), ty=Math.cos(a1), s2=u*0.22;
      ctx.beginPath(); ctx.moveTo(ex+tx*s2, ey+ty*s2); ctx.lineTo(ex-ty*s2*0.8-tx*s2*0.2, ey+tx*s2*0.8-ty*s2*0.2); ctx.lineTo(ex+ty*s2*0.8-tx*s2*0.2, ey-tx*s2*0.8-ty*s2*0.2); ctx.closePath(); ctx.fill();
      ctx.restore(); }
  }
  if ((tool==='delete'||tool==='select') && lastG && !drag){
    const tg=targetsAt(lastG), hc=tool==='delete'?C.heat:C.accent;
    ctx.save(); ctx.strokeStyle=hc; ctx.lineCap='round'; ctx.shadowColor=hc; ctx.shadowBlur=glow(12);
    for (const it of tg.items){ const el=it.c||it.w; ctx.globalAlpha=0.45; ctx.lineWidth=it.c?u*0.85:u*0.34;
      ctx.beginPath(); ctx.moveTo(P(el.ax),P(el.ay)); ctx.lineTo(P(el.bx),P(el.by)); ctx.stroke(); }
    if (tg.node){ ctx.globalAlpha=1; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(P(tg.node.x),P(tg.node.y),u*0.3,0,7); ctx.stroke(); }
    ctx.restore();
  }
  drawFx();

  if (drag && drag.mode==='wire'){
    ctx.save(); ctx.strokeStyle=C.accent; ctx.lineWidth=Math.max(1.6,u*0.09); ctx.setLineDash([u*0.2,u*0.15]); ctx.lineDashOffset=-now*0.03; ctx.shadowColor=C.accent; ctx.shadowBlur=glow(10);
    ctx.beginPath(); ctx.moveTo(P(drag.from.x),P(drag.from.y)); ctx.lineTo(P(drag.to.x),P(drag.to.y)); ctx.stroke(); ctx.restore();
    ctx.fillStyle=C.accent; ctx.beginPath(); ctx.arc(P(drag.to.x),P(drag.to.y),u*0.17,0,7); ctx.fill();
  }
  if (placing && placing.g){
    const g=placing.g, gc={type:placing.type,glow:0,on:true,ax:g.x-1,ay:g.y,bx:g.x+1,by:g.y}; clampC(gc);
    ctx.save(); ctx.globalAlpha=0.55; ctx.translate(P(gc.ax),P(gc.ay)); drawSymbol(ctx,gc,u,C,0); ctx.restore();
  }
  if (hover && !drag){ const pz=reduce?0:Math.sin(now/220)*0.05; ctx.save(); ctx.strokeStyle=C.accent; ctx.shadowColor=C.accent; ctx.shadowBlur=glow(10); ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.arc(P(hover.x),P(hover.y),u*(0.24+pz),0,7); ctx.stroke(); ctx.restore(); }
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.drawImage(layers.vign,0,0,side,side);
  const bt=(now-bootAt)/900;
  if (bt<1 && !reduce){ const x=bt*side*1.1;
    ctx.save(); ctx.fillStyle=C.bg; ctx.globalAlpha=0.85; ctx.fillRect(x,0,side-x+20,side);
    ctx.globalAlpha=1; ctx.fillStyle=C.accent; ctx.shadowColor=C.accent; ctx.shadowBlur=glow(24); ctx.fillRect(x-2,0,3,side); ctx.restore(); }
}
// the grid, pads and silkscreen never change between frames, and a full-board gradient is costly to fill every frame (mostly on phones),
// so both are drawn once per size into offscreen canvases
let layers=null; const bootAt=performance.now();
function buildLayers(){
  const mkL=()=>{ const c=document.createElement('canvas'); c.width=cv.width; c.height=cv.height; const x=c.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); return [c,x]; };
  const [grid,x]=mkL(), Pl=g=>(g+0.5)*u;
  x.save(); x.strokeStyle=C.silk; x.globalAlpha=0.045; x.lineWidth=1;
  x.beginPath(); for (let k=0;k<N;k++){ x.moveTo(Pl(k),Pl(0)); x.lineTo(Pl(k),Pl(N-1)); x.moveTo(Pl(0),Pl(k)); x.lineTo(Pl(N-1),Pl(k)); } x.stroke();
  x.globalAlpha=0.35; const m0=u*0.16, L0=u*0.7;
  x.beginPath();
  for (const [cx,cy,sx,sy] of [[m0,m0,1,1],[side-m0,m0,-1,1],[m0,side-m0,1,-1],[side-m0,side-m0,-1,-1]]){ x.moveTo(cx+sx*L0,cy); x.lineTo(cx,cy); x.lineTo(cx,cy+sy*L0); }
  x.stroke();
  x.globalAlpha=0.28; x.fillStyle=C.silk; x.font=`500 ${Math.max(9,Math.round(u*0.3))}px "IBM Plex Mono", monospace`;
  x.textAlign='right'; x.textBaseline='bottom'; x.fillText('CIRCUIT LAB  REV 6  ·  20×20', side-u*0.95, side-u*0.05);
  x.restore();
  const pr=Math.max(1.6,u*0.075);
  for (let y=0;y<N;y++) for (let k=0;k<N;k++){
    x.fillStyle=C.node; x.globalAlpha=0.55; x.beginPath(); x.arc(Pl(k),Pl(y),pr,0,7); x.fill();
    x.fillStyle=C.hole; x.globalAlpha=1; x.beginPath(); x.arc(Pl(k),Pl(y),pr*0.45,0,7); x.fill(); }
  const [vign,v]=mkL(), g=v.createRadialGradient(side/2,side/2,side*0.3,side/2,side/2,side*0.75);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.38)'); v.fillStyle=g; v.fillRect(0,0,side,side);
  layers={grid, vign, side, dpr};
}
try { document.fonts.ready.then(() => { layers=null; }); } catch(e){}

/* ---------- explosions, sparks, smoke ---------- */
// materials that fly out of each part when it fails: [shape, material, count]
const MAT = { glass:'#CFE9FF', ceramic:'#D8C39B', epoxy:'#20292A', alu:'#C3CDD1', plastic:'#33403E', paper:'#E6DABA', ferrite:'#474D4C', acid:'#B8F25C' };
const BANDS = ['#D0402F','#E8892B','#F2C94C','#8E5BD0','#3B8FE0','#6C4A2E'];
const SHARDS = {
  dc:   [['shell','copper',9],['lid','alu',1],['chunk','epoxy',6],['blob','acid',14]],
  ac:   [['plate','alu',8],['chunk','plastic',7],['coil','copper',3]],
  cap:  [['lid','alu',1],['strip','paper',9],['strip','alu',6],['blob','acid',8]],
  res:  [['chunk','ceramic',10],['band','band',6],['lead','alu',2]],
  bulb: [['shard','glass',18],['coil','glow',1],['lead','alu',2]],
  led:  [['shard','led',12],['chip','alu',2],['lead','alu',2]],
  diode:[['chunk','epoxy',9],['band','alu',2],['lead','alu',2]],
  ind:  [['coil','copper',7],['chunk','ferrite',6]],
  sw:   [['lever','plastic',1],['chunk','plastic',5],['plate','alu',3]],
  am:   [['shard','glass',9],['needle','heat',1],['chunk','plastic',6]],
  vm:   [['shard','glass',9],['needle','heat',1],['chunk','plastic',6]],
  fuse: [['shard','glass',8],['drop','copper',10]],
  wire: [['drop','copper',8]],
};
const ARCY = new Set(['dc','ac','cap','ind','sw']);   // parts that throw electric arcs
const FLASHC = { led:'led', bulb:'glow', fuse:'copper', wire:'copper' };
const matCol = (m, R) => m==='band' ? BANDS[Math.floor(R()*BANDS.length)] : C[m] || MAT[m];
let marks = [], boardFlash = 0;

function spawn(x, y, kind, src){
  const k = reduce ? 0.35 : lite ? 0.5 : 1, R = Math.random, n = v => Math.max(1, Math.round(v*k));
  const type = src && !src.w ? src.type : 'wire', big = kind==='big', pop = kind==='pop';
  const fc = C[FLASHC[type]] || C.glow, p0 = parts.length, f0 = flashes.length;
  // sparks: fast hot streaks
  for (let j=0;j<n(big?70:pop?28:14);j++){ const a=R()*Math.PI*2, v=(big?3:1.6)+R()*(big?9:4);
    parts.push({t:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(kind==='melt'?1:2),life:0,max:0.35+R()*0.7}); }
  // fireball: hot cores that bloom, rise and cool into smoke
  for (let j=0;j<n(big?16:pop?7:3);j++){ const a=R()*Math.PI*2, v=R()*(big?3.2:1.6);
    parts.push({t:'fire',x:x+(R()-.5)*.3,y:y+(R()-.5)*.3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:(big?.35:.22)+R()*.2,gr:(big?1.6:.9)*(0.6+R()*.6),life:0,max:(big?.7:.45)+R()*.35,col:fc}); }
  // debris: real pieces of this part, flung up and landing around it
  for (const [shape, m, cnt] of SHARDS[type] || SHARDS.res){
    for (let j=0;j<n(cnt*(big?1:pop?.75:.6));j++){ const a=R()*Math.PI*2, v=(0.8+R()*(big?6:3.5))*(shape==='lid'?0.6:1);
      const liquid = shape==='blob' || shape==='drop';
      parts.push({t:'deb',shape,col:matCol(m,R),x:x+(R()-.5)*.4,y:y+(R()-.5)*.4,z:.1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
        vz:(big?7:4.5)+R()*(big?9:5)+(shape==='lid'?6:0),rot:R()*6.3,vr:(R()-.5)*(shape==='lid'?30:22),life:0,max:9,
        sz:(liquid?.06:.1)+R()*.08,liquid,hot:shape==='drop'||(big&&R()<.4)?1:0,
        poly:Array.from({length:5},(_,q)=>[q/5*6.283+R()*.6, .55+R()*.45]) }); } }
  // electric arcs crawling out of sources, coils and switches
  if (ARCY.has(type) && kind!=='melt') for (let j=0;j<n(big?6:3);j++){ const a=R()*Math.PI*2, d=(big?1.2:.7)+R()*(big?1.6:.8);
    parts.push({t:'arc',x,y,tx:x+Math.cos(a)*d,ty:y+Math.sin(a)*d,life:0,max:.12+R()*.22,seed:R()}); }
  for (let j=0;j<n(big?14:pop?6:3);j++) parts.push({t:'smoke',x:x+(R()-.5)*.6,y:y+(R()-.5)*.4,vx:(R()-.5)*.8,vy:-.4-R()*.9,life:0,max:1.8+R()*2,r:.22+R()*.3,d:R()});
  for (let j=0;j<n(big?22:pop?10:5);j++) parts.push({t:'ember',x:x+(R()-.5)*.5,y,vx:(R()-.5)*1.2,vy:-.6-R()*1.6,life:0,max:1.2+R()*1.8,ph:R()*6.3});
  flashes.push({x,y,life:0,max:big?.75:.42,size:big?2.8:pop?1.5:.9,col:fc});
  if (big) flashes.push({x,y,life:-.08,max:.9,size:3.6,col:C.heat,ring:true});
  // every effect remembers its source so repairing, deleting or clearing that part wipes it
  for (let j=p0;j<parts.length;j++) parts[j].src=src;
  for (let j=f0;j<flashes.length;j++) flashes[j].src=src;
  if (src) marks.push({x,y,r:(big?1.5:pop?.95:.55),src,scorch:true,life:0,rays:Array.from({length:big?11:6},()=>[R()*6.283,.75+R()*.6])});
  if (!reduce){ shake=Math.max(shake, (big?.6:pop?.2:.06)*(lite?.5:1)); if (big) boardFlash=Math.max(boardFlash, lite?.2:.32); }
  const cap = lite ? 700 : 1600; if (parts.length>cap) parts.splice(0, parts.length-cap);
}
function updateFx(dt){
  const R = Math.random;
  for (const q of parts){ q.life+=dt;
    if (q.t==='deb'){
      if (q.hot) q.hot=Math.max(0, q.hot-dt*.45);
      if (q.rest) continue;
      q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; q.vz-=26*dt; q.rot+=q.vr*dt; q.vx*=.995; q.vy*=.995;
      if (q.z<=0){ q.z=0;
        if (q.liquid){ marks.push({x:q.x,y:q.y,src:q.src,r:q.sz*(1.3+R()*.8),col:q.col,hot:q.hot>0,life:0,max:q.hot?7:14,sat:Array.from({length:3},()=>[R()*6.283,1+R()*.8,.3+R()*.3])}); q.life=q.max; continue; }
        if (Math.abs(q.vz)<2.4){ q.rest=true; q.vz=0; q.life=0; q.max=6+R()*3; }
        else { q.vz=-q.vz*.36; q.vx*=.55; q.vy*=.55; q.vr*=.5;
          if (q.hot && !reduce) parts.push({t:'spark',x:q.x,y:q.y,vx:(R()-.5)*3,vy:-1-R()*2,life:0,max:.25,src:q.src}); } }
      continue; }
    q.x+=q.vx*dt; q.y+=q.vy*dt;
    if (q.t==='smoke'){ q.vx*=.98; q.vy*=.995; q.r+=dt*.4; }
    else if (q.t==='fire'){ q.vx*=.9; q.vy=q.vy*.9-1.2*dt; q.r+=q.gr*dt*(1-q.life/q.max);
      if (q.life+dt>=q.max) parts.push({t:'smoke',x:q.x,y:q.y,vx:q.vx*.3,vy:-.5,life:0,max:2+R()*1.5,r:q.r*.8,d:R(),src:q.src}); }
    else if (q.t==='ember'){ q.vx+=Math.sin(q.life*5+q.ph)*dt*1.5; q.vy*=.99; }
    else if (q.t==='spark'){ q.vy+=9*dt; q.vx*=.985; } }
  const live = new Set(); for (const el of comps) if (el.broken) live.add(el); for (const el of wires) if (el.broken) live.add(el);
  const keep = q => q.life<q.max && (!q.src || live.has(q.src));
  parts = parts.filter(keep);
  for (const f of flashes) f.life+=dt; flashes = flashes.filter(keep);
  for (const m of marks) m.life+=dt;
  marks = marks.filter(m => (!m.src || live.has(m.src)) && (m.scorch || m.life<m.max));
  shake = Math.max(0, shake-dt); boardFlash = Math.max(0, boardFlash-dt*1.6);
  for (const c of comps) if (c.broken && c.smokeT>0){ c.smokeT-=dt; const cx=(c.ax+c.bx)/2, cy=(c.ay+c.by)/2;
    if (R()<dt*(reduce?1.5:lite?2.5:4)) parts.push({t:'smoke',x:cx+(R()-.5)*.3,y:cy,vx:(R()-.5)*.3,vy:-.6-R()*.5,life:0,max:2,r:.18,d:R(),src:c});
    if (!reduce && c.smokeT>5 && R()<dt*3) parts.push({t:'ember',x:cx+(R()-.5)*.4,y:cy,vx:(R()-.5)*.6,vy:-.5-R(),life:0,max:1+R(),ph:R()*6.3,src:c}); }
}
// scorch under burnt parts, and splashes of acid or molten metal
function drawMarks(){
  if (!marks.length) return;
  ctx.save();
  for (const m of marks){ const X=P(m.x), Y=P(m.y), Rr=u*m.r;
    if (m.scorch){
      const g=ctx.createRadialGradient(X,Y,0,X,Y,Rr); g.addColorStop(0,'rgba(0,0,0,.78)'); g.addColorStop(.5,'rgba(24,12,4,.5)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalAlpha=Math.min(1,m.life*4); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,Rr,0,7); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=Math.max(1,u*.05); ctx.lineCap='round'; ctx.beginPath();
      for (const [a,l] of m.rays){ ctx.moveTo(X+Math.cos(a)*Rr*.3,Y+Math.sin(a)*Rr*.3); ctx.lineTo(X+Math.cos(a)*Rr*l,Y+Math.sin(a)*Rr*l); } ctx.stroke();
      if (m.life<5){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=(1-m.life/5)*.55;
        const h=ctx.createRadialGradient(X,Y,0,X,Y,Rr*.7); h.addColorStop(0,C.heat); h.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=h; ctx.beginPath(); ctx.arc(X,Y,Rr*.7,0,7); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
    } else { const k=m.life/m.max, blob=()=>{ ctx.beginPath(); ctx.arc(X,Y,Rr,0,7); for (const [a,d,s] of m.sat){ ctx.moveTo(X+Math.cos(a)*Rr*d+Rr*s,Y+Math.sin(a)*Rr*d); ctx.arc(X+Math.cos(a)*Rr*d,Y+Math.sin(a)*Rr*d,Rr*s,0,7); } ctx.fill(); };
      ctx.globalAlpha=(1-k)*(m.hot?.9:.5); ctx.fillStyle=m.hot?C.wire:m.col; blob();
      if (m.hot && m.life<2.5){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=1-m.life/2.5; ctx.fillStyle=C.glow; blob(); ctx.globalCompositeOperation='source-over'; } } }
  ctx.restore();
}
function drawDebris(q, X, Y, s){
  const c=q.col; ctx.fillStyle=c; ctx.strokeStyle=c; ctx.lineWidth=Math.max(1,s*.35); ctx.lineCap='round';
  switch (q.shape){
    case 'shard': ctx.globalAlpha*=.55+.45*Math.abs(Math.sin(q.rot*2)); ctx.beginPath(); ctx.moveTo(0,-s*1.4); ctx.lineTo(s*.9,s*.8); ctx.lineTo(-s*.5,s*.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1; ctx.stroke(); break;
    case 'shell': ctx.lineWidth=s*.7; ctx.beginPath(); ctx.arc(0,0,s*1.3,0,1.6); ctx.stroke(); break;
    case 'lid': { const sq=Math.abs(Math.cos(q.rot*.5))*.8+.2; ctx.scale(1,sq); ctx.beginPath(); ctx.arc(0,0,s*1.5,0,7); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(s,0); ctx.moveTo(0,-s); ctx.lineTo(0,s); ctx.stroke(); break; }
    case 'plate': ctx.fillRect(-s*1.5,-s*.3,s*3,s*.6); break;
    case 'strip': ctx.lineWidth=s*.45; ctx.beginPath(); ctx.moveTo(-s*1.6,0); ctx.quadraticCurveTo(-s*.5,-s*1.4,s*.4,0); ctx.quadraticCurveTo(s*1.2,s*1.2,s*1.8,-s*.2); ctx.stroke(); break;
    case 'coil': ctx.beginPath(); for (let a=0;a<14;a+=.4){ const r=s*(.3+a*.09); ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } ctx.stroke(); break;
    case 'band': ctx.fillRect(-s*.8,-s*.45,s*1.6,s*.9); break;
    case 'lead': ctx.lineWidth=Math.max(1,s*.22); ctx.beginPath(); ctx.moveTo(-s*1.8,0); ctx.lineTo(0,0); ctx.lineTo(s*.9,s*1.1); ctx.stroke(); break;
    case 'chip': ctx.fillRect(-s*.5,-s*.5,s,s); break;
    case 'lever': ctx.fillRect(-s*2,-s*.35,s*3.2,s*.7); ctx.beginPath(); ctx.arc(s*1.4,0,s*.6,0,7); ctx.fill(); break;
    case 'needle': ctx.lineWidth=Math.max(1,s*.25); ctx.beginPath(); ctx.moveTo(-s*2,0); ctx.lineTo(s*2,0); ctx.stroke(); break;
    case 'blob': case 'drop': ctx.beginPath(); ctx.arc(0,0,s*.8,0,7); ctx.fill(); break;
    default: ctx.beginPath(); q.poly.forEach(([a,r],j)=>{ const px=Math.cos(a)*s*r, py=Math.sin(a)*s*r; j?ctx.lineTo(px,py):ctx.moveTo(px,py); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=1; ctx.stroke();
  }
}
function drawFx(){
  ctx.save();
  // pass 1 (normal blend): smoke, debris shadows and debris
  for (const q of parts){ const k=q.life/q.max, X=P(q.x), Y=P(q.y);
    if (q.t==='smoke'){ const r=u*q.r, g=ctx.createRadialGradient(X,Y,0,X,Y,r); g.addColorStop(0,q.d<.5?C.smoke:'#2E3A37'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalAlpha=(1-k)*(k<.1?k*10:1)*.5; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,r,0,7); ctx.fill(); }
    else if (q.t==='deb'){ const fade=q.rest?Math.min(1,(q.max-q.life)/1.5):1, s=u*q.sz;
      ctx.globalAlpha=.4*fade*Math.max(0,1-q.z/3); ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(X,Y,s*1.2,s*.6,0,0,7); ctx.fill();
      ctx.save(); ctx.translate(X,Y-q.z*u*.55); ctx.rotate(q.rot); ctx.globalAlpha=fade; drawDebris(q,X,Y,s*(1+q.z*.08)); ctx.restore(); } }
  // pass 2 (additive): flashes, fire, hot debris glow, sparks, embers, arcs
  ctx.globalCompositeOperation='lighter';
  for (const f of flashes){ if (f.life<0) continue; const k=f.life/f.max, X=P(f.x), Y=P(f.y);
    if (f.ring){ ctx.globalAlpha=(1-k)*.7; ctx.strokeStyle=f.col; ctx.lineWidth=u*.25*(1-k)+1; ctx.beginPath(); ctx.arc(X,Y,u*f.size*k,0,7); ctx.stroke(); continue; }
    const Rl=u*f.size*2.2, g=ctx.createRadialGradient(X,Y,0,X,Y,Rl); g.addColorStop(0,f.col); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=(1-k)*(1-k)*.55; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,Rl,0,7); ctx.fill();
    ctx.globalAlpha=(1-k)*.9; ctx.fillStyle='#FFF6DA'; ctx.beginPath(); ctx.arc(X,Y,u*f.size*.35*(1-k*.6),0,7); ctx.fill();
    ctx.globalAlpha=(1-k); ctx.strokeStyle=C.heat; ctx.lineWidth=u*.12*(1-k)+1; ctx.beginPath(); ctx.arc(X,Y,u*f.size*(.6+k*1.6),0,7); ctx.stroke(); }
  for (const q of parts){ const k=q.life/q.max, X=P(q.x), Y=P(q.y);
    if (q.t==='fire'){ const r=u*q.r, g=ctx.createRadialGradient(X,Y,0,X,Y,r);
      g.addColorStop(0,k<.3?'#FFF6DA':C.glow); g.addColorStop(.45,k<.6?q.col:C.heat); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalAlpha=(1-k)*.85; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,r,0,7); ctx.fill(); }
    else if (q.t==='spark'){ ctx.globalAlpha=1-k; ctx.strokeStyle=k<.35?'#FFF6DA':k<.6?C.glow:C.heat; ctx.lineWidth=Math.max(1.5,u*.06);
      ctx.beginPath(); ctx.moveTo(X,Y); ctx.lineTo(X-q.vx*u*.035,Y-q.vy*u*.035); ctx.stroke(); }
    else if (q.t==='ember'){ ctx.globalAlpha=(1-k)*(.55+.45*Math.sin(q.life*18+q.ph)); ctx.fillStyle=k<.5?C.glow:C.heat; ctx.beginPath(); ctx.arc(X,Y,Math.max(1,u*.035),0,7); ctx.fill(); }
    else if (q.t==='deb' && q.hot>0){ const s=u*q.sz*1.8; ctx.globalAlpha=q.hot*.8; ctx.fillStyle=C.heat; ctx.beginPath(); ctx.arc(X,Y-q.z*u*.55,s,0,7); ctx.fill(); }
    else if (q.t==='arc'){ const tx=P(q.tx), ty=P(q.ty), R=reduce?(()=>{ let s=q.seed; return ()=>(s=(s*9301+49297)%233280/233280); })():Math.random;
      ctx.globalAlpha=1-k; ctx.strokeStyle=C.el; ctx.shadowColor=C.el; ctx.shadowBlur=glow(12); ctx.lineWidth=Math.max(1.2,u*.05); ctx.beginPath(); ctx.moveTo(X,Y);
      const L=Math.hypot(tx-X,ty-Y)||1, nx=(ty-Y)/L, ny=-(tx-X)/L;
      for (let j=1;j<=7;j++){ const f=j/7, jit=j<7?(R()-.5)*u*.5:0; ctx.lineTo(X+(tx-X)*f+nx*jit, Y+(ty-Y)*f+ny*jit); }
      ctx.stroke(); ctx.shadowBlur=0; } }
  if (boardFlash>0){ ctx.globalAlpha=boardFlash; ctx.fillStyle=C.glow; ctx.fillRect(-u,-u,side+2*u,side+2*u); }
  ctx.restore();
}
function handleEvents(){
  const log=$('#log');
  for (const e of events){
    const x=(e.ax+e.bx)/2, y=(e.ay+e.by)/2;
    spawn(x, y, e.w ? 'melt' : BOOM[e.type]||'pop', e);
    if (!e.w) e.smokeT = e.type==='fuse' ? 1.5 : 8;
    const li=document.createElement('li'); li.textContent=e.failMsg; log.prepend(li);
    while (log.children.length>8) log.lastChild.remove();
    if (e===sel) renderInsp();
  }
  events.length=0;
}

/* ---------- palette ---------- */
const pal = $('#palette');
for (const type of ORDER){
  const b=document.createElement('button'); b.className='pal'; b.dataset.type=type; b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',T[type].name);
  b.innerHTML=`<canvas width="96" height="52"></canvas><span>${T[type].name}</span>`; pal.appendChild(b);
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); placing={type,sx:e.clientX,sy:e.clientY,moved:false,g:null}; });
  b.addEventListener('pointermove', e => { if (!placing) return;
    if (Math.hypot(e.clientX-placing.sx,e.clientY-placing.sy)>6) placing.moved=true;
    placing.g = overBoard(e) ? snap(toGrid(e)) : null; });
  b.addEventListener('pointerup', e => { if (!placing) return; const p=placing; placing=null;
    if (overBoard(e) && p.moved){ place(p.type, snap(toGrid(e))); pendingPlace=null; }
    else if (!p.moved){ pendingPlace = pendingPlace===p.type ? null : p.type; }
    markPal(); });
  b.addEventListener('pointercancel', () => { placing=null; });
  b.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); place(type,{x:10,y:10}); } });
}
function drawIcons(){
  pal.querySelectorAll('.pal').forEach(b => { const c=b.querySelector('canvas'), x=c.getContext('2d');
    x.setTransform(2,0,0,2,0,0); x.clearRect(0,0,48,26); x.translate(3,13);
    drawSymbol(x,{type:b.dataset.type,glow:0,on:true},21,Object.assign({},C,{bg:C.panel}),0); });
}
function markPal(){ pal.querySelectorAll('.pal').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type===pendingPlace))); updateStatusHint(); }

/* ---------- board interaction ---------- */
function overBoard(e){ const r=cv.getBoundingClientRect(); return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom; }
function toGrid(e){ const r=cv.getBoundingClientRect(); return { x:(e.clientX-r.left)/u-0.5, y:(e.clientY-r.top)/u-0.5 }; }
const snap = g => ({ x:Math.max(0,Math.min(N-1,Math.round(g.x))), y:Math.max(0,Math.min(N-1,Math.round(g.y))) });
function nearNode(g, r=0.4){ const s=snap(g); return Math.hypot(g.x-s.x,g.y-s.y)<r ? s : null; }
function segHit(el, g, t0, t1, d){
  const dx=el.bx-el.ax, dy=el.by-el.ay, l2=dx*dx+dy*dy; if (!l2) return false;
  const q=((g.x-el.ax)*dx+(g.y-el.ay)*dy)/l2; if (q<t0||q>t1) return false;
  return Math.abs((g.x-el.ax)*dy-(g.y-el.ay)*dx)/Math.sqrt(l2) < d;
}
const hitComp = g => { for (let k=comps.length-1;k>=0;k--) if (segHit(comps[k],g,0.2,0.8,0.5)) return comps[k]; return null; };
const hitWire = g => { for (let k=wires.length-1;k>=0;k--) if (segHit(wires[k],g,0,1,0.28)) return wires[k]; return null; };

function place(type, g){
  const c=mk(type,g.x-1,g.y,g.x+1,g.y); clampC(c); comps.push(c); assignNum(c); dirty=true; select(c); save();
}
cv.addEventListener('pointerdown', e => {
  const g=toGrid(e); cv.setPointerCapture(e.pointerId);
  if (pendingPlace){ place(pendingPlace, snap(g)); pendingPlace=null; markPal(); return; }
  if (tool==='idle') return;
  if (tool==='select'){ openSelect(g, e); return; }
  if (tool==='delete'){ deleteAt(g); return; }
  if (tool==='rotate'){ rotateAt(g); return; }
  closePop();
  const c=hitComp(g);
  if (c){ drag={mode:'move',c,start:g,o:[c.ax,c.ay,c.bx,c.by],moved:false}; select(c); return; }
  const nd=nearNode(g);
  if (nd){ drag={mode:'wire',from:nd,to:nd}; return; }
  const w=hitWire(g); select(w||null);
});
cv.addEventListener('pointermove', e => {
  const g=toGrid(e); hover=nearNode(g); lastG=g; updateStatusHint();
  if (!drag) return;
  if (drag.mode==='move'){
    const dx=Math.round(g.x-drag.start.x), dy=Math.round(g.y-drag.start.y), c=drag.c;
    const [ax,ay,bx,by]=drag.o; const px=c.ax, py=c.ay;
    c.ax=ax+dx; c.ay=ay+dy; c.bx=bx+dx; c.by=by+dy; clampC(c);
    if (c.ax!==px||c.ay!==py){ drag.moved=true; dirty=true; }
  } else if (drag.mode==='wire') drag.to=snap(g);
});
cv.addEventListener('pointerup', () => {
  if (!drag) return; const d=drag; drag=null;
  if (d.mode==='move'){
    if (!d.moved && d.c.type==='sw'){ d.c.on=!d.c.on; renderInsp(); }
    if (d.moved || d.c.type==='sw') save();
  } else if (d.mode==='wire'){
    const a=d.from, b=d.to;
    if (a.x!==b.x||a.y!==b.y){
      if (addWire(a.x,a.y,b.x,b.y)){ dirty=true; save(); }
    }
  }
});
cv.addEventListener('pointerleave', () => { hover=null; lastG=null; updateStatusHint(); });
cv.addEventListener('pointercancel', () => { drag=null; });

// clockwise 90° on screen (y points down)
function rotateComp(c){
  const mx=(c.ax+c.bx)/2, my=(c.ay+c.by)/2, dx=c.bx-c.ax, dy=c.by-c.ay;
  c.ax=mx+dy/2; c.ay=my-dx/2; c.bx=mx-dy/2; c.by=my+dx/2; clampC(c); dirty=true;
}
function rotateSel(){ if (!sel||sel.w) return; pushUndo(); rotateComp(sel); save(); }
function rotTarget(g){
  const c=hitComp(g); if (c) return c;
  const nd=nearNode(g,0.32); if (!nd) return null;
  const at=comps.filter(x=>(x.ax===nd.x&&x.ay===nd.y)||(x.bx===nd.x&&x.by===nd.y));
  return at.length===1 ? at[0] : null;
}
function rotateAt(g){
  const c=rotTarget(g); if (!c) return;
  pushUndo(); rotateComp(c); select(c); save();
  say(`หมุน ${lab(c)} ตามเข็มนาฬิกา 90° แล้ว · Ctrl+Z ย้อนกลับ`);
}
function deleteSel(){
  if (!sel) return; pushUndo(); if (sel.w) wires=wires.filter(w=>w!==sel); else comps=comps.filter(c=>c!==sel);
  dirty=true; select(null); save();
}
document.addEventListener('keydown', e => {
  if (!$('#confirm').hidden && e.key!=='Escape') return;
  if (!$('#codePanel').hidden && $('#confirm').hidden){ if (e.key==='Escape') closeCode(); return; }
  if (e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  if ((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z')){ e.preventDefault(); undo(); return; }
  if (['1','2','3','4','5'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey){ setTool(['smart','select','rotate','delete','idle'][+e.key-1]); return; }
  if (e.key==='r'||e.key==='R'){ rotateSel(); }
  else if (e.key==='Delete'||e.key==='Backspace'){ if (sel){ e.preventDefault(); deleteSel(); } }
  else if (e.key==='Escape'){ if (!$('#confirm').hidden){ closeConfirm(); return; } if (popAnchor){ closePop(); return; } pendingPlace=null; markPal(); select(null); }
});

/* ---------- tools ---------- */
let tool='smart', lastG=null, toast=null, popAnchor=null;
const popEdit=new Set(), undoStack=[];
const TOOL_HINT = {
  idle:'โหมดว่าง: คลิกบนแผงแล้วจะไม่มีอะไรเปลี่ยน ชี้ที่จุดเพื่อดูศักย์ได้',
  smart:'อัจฉริยะ: ลากจากจุดถึงจุดเพื่อต่อสาย · ลากอุปกรณ์เพื่อย้าย · แตะอุปกรณ์เพื่อเลือก · แตะสวิตช์เพื่อเปิดปิด',
  rotate:'หมุน: คลิกอุปกรณ์เพื่อหมุนตามเข็มนาฬิกา 90° · คลิกซ้ำเพื่อหมุนต่อ · Ctrl+Z ย้อนกลับ',
  select:'เลือก: คลิกที่จุดหรืออุปกรณ์ แล้วเลือกว่าจะปรับค่า พักการทำงาน หรือลบ',
  delete:'ลบ: คลิกที่จุดเพื่อลบทุกอย่างที่ต่ออยู่ตรงนั้น · คลิกตัวอุปกรณ์หรือสายเพื่อลบชิ้นเดียว · Ctrl+Z ย้อนกลับ'
};
function say(text){ toast={text, until:performance.now()+2600}; updateStatusHint(); }
function setTool(t){
  tool=t; closePop(); drag=null;
  document.querySelectorAll('#toolSeg button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.tool===t)));
  cv.style.cursor = t==='idle' ? 'default' : t==='smart' ? 'crosshair' : 'pointer';
  toast=null; updateStatusHint();
}
document.querySelectorAll('#toolSeg button').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
const atNode=(el,x,y)=>(el.ax===x&&el.ay===y)||(el.bx===x&&el.by===y);
function targetsAt(g){
  const nd=nearNode(g,0.32);
  if (nd){ const items=[...comps.filter(c=>atNode(c,nd.x,nd.y)).map(c=>({c})), ...wires.filter(w=>atNode(w,nd.x,nd.y)).map(w=>({w}))];
    if (items.length) return {node:nd, items}; }
  const c=hitComp(g); if (c) return {items:[{c}]};
  const w=hitWire(g); if (w) return {items:[{w}]};
  return {items:[]};
}
function pushUndo(){ if (!comps.length && !wires.length) return; undoStack.push(JSON.stringify(serialize())); if (undoStack.length>60) undoStack.shift(); }
function undo(){
  const st=undoStack.pop(); if (!st){ say('ไม่มีอะไรให้ย้อนกลับแล้ว'); return; }
  applyData(JSON.parse(st)); closePop(); say('ย้อนกลับแล้ว');
}
$('#undo').onclick=undo;
function deleteAt(g){
  const tg=targetsAt(g); if (!tg.items.length) return;
  pushUndo();
  const cs=new Set(tg.items.filter(i=>i.c).map(i=>i.c)), ws=new Set(tg.items.filter(i=>i.w).map(i=>i.w));
  comps=comps.filter(c=>!cs.has(c)); wires=wires.filter(w=>!ws.has(w));
  if (sel && (cs.has(sel)||ws.has(sel))) select(null);
  dirty=true; save();
  const parts=[]; if (cs.size) parts.push(`อุปกรณ์ ${cs.size} ชิ้น`); if (ws.size) parts.push(`สายไฟ ${ws.size} ช่วง`);
  say(`ลบ${parts.join(' และ ')}${tg.node?` ที่จุด (${tg.node.x}, ${tg.node.y})`:''} แล้ว · Ctrl+Z ย้อนกลับ`);
}
function openSelect(g, e){
  const tg=targetsAt(g);
  if (!tg.items.length){ closePop(); select(null); return; }
  const r=stage.getBoundingClientRect();
  popAnchor={ node:tg.node, x:e.clientX-r.left, y:e.clientY-r.top, ids:tg.items.map(it=>it.c?'c'+it.c.id:'w'+it.w.id) };
  popEdit.clear();
  if (tg.items.length===1 && tg.items[0].c && shownFields(tg.items[0].c.type).length) popEdit.add(tg.items[0].c.id);
  const first=tg.items.find(it=>it.c); select(first?first.c:tg.items[0].w);
  renderPop();
}
function closePop(){ popAnchor=null; popEdit.clear(); const p=document.getElementById('pop'); if (p) p.hidden=true; }
function popItems(){ return popAnchor.ids.map(id=> id[0]==='c' ? {c:comps.find(x=>String(x.id)===id.slice(1))} : {w:wires.find(x=>String(x.id)===id.slice(1))}).filter(it=>it.c||it.w); }
function renderPop(){
  const pop=$('#pop'); if (!popAnchor){ pop.hidden=true; return; }
  const items=popItems(); if (!items.length){ closePop(); return; }
  const nd=popAnchor.node;
  let h=`<div class="poph"><b>${nd?`จุด (${nd.x}, ${nd.y})`:'สิ่งที่เลือก'}</b><span>${items.length} รายการ</span><button data-a="close">ปิด</button></div>`;
  for (const it of items){
    if (it.c){ const c=it.c, d=T[c.type], fs=shownFields(c.type);
      h+=`<div class="pi${c.off?' off':''}" data-id="c${c.id}"><div class="pih"><span class="tag" style="--c:var(${TAGC[c.type]})">${lab(c)}</span><span class="cname">${d.name}${c.off?' · พักอยู่':''}${c.broken?' · ไหม้':''}</span></div>
        <div class="pia">${fs.length?`<button data-a="edit" aria-expanded="${popEdit.has(c.id)}">ปรับค่า</button>`:''}${c.type==='sw'?`<button data-a="sw">${c.on?'ตัดสวิตช์':'ต่อสวิตช์'}</button>`:''}<button data-a="off">${c.off?'เปิดใช้งาน':'พักการทำงาน'}</button><button data-a="del" class="danger">ลบ</button></div>
        ${fs.length && popEdit.has(c.id) ? `<div class="cparams">${fs.map(([k,label,unit,mn,mx])=>`<label class="pf" title="${label}"><span>${k}</span><input type="number" inputmode="decimal" step="any" min="${mn}" max="${mx}" value="${c[k]}" data-cid="${c.id}" data-k="${k}" aria-label="${lab(c)} ${label}"><span>${unit}</span></label>`).join('')}</div>` : ''}</div>`;
    } else { const w=it.w;
      h+=`<div class="pi${w.off?' off':''}" data-id="w${w.id}"><div class="pih"><span class="tag" style="--c:var(--wire)">สาย</span><span class="cname">(${w.ax}, ${w.ay}) → (${w.bx}, ${w.by})${w.off?' · พักอยู่':''}${w.broken?' · ขาด':''}</span></div>
        <div class="pia"><button data-a="off">${w.off?'เปิดใช้งาน':'พักการทำงาน'}</button><button data-a="del" class="danger">ลบ</button></div></div>`;
    }
  }
  pop.innerHTML=h; pop.hidden=false;
  const W=stage.clientWidth, H=stage.clientHeight, pw=pop.offsetWidth, ph=pop.offsetHeight;
  pop.style.left=Math.max(4, Math.min(popAnchor.x+14, W-pw-4))+'px';
  // below the tap unless it does not fit and there is more room above; on a small board it may hang past the bottom edge rather than cover the tap
  let top=popAnchor.y+14; if (top+ph>H-4 && popAnchor.y>H-popAnchor.y) top=Math.max(4, popAnchor.y-ph-14);
  pop.style.top=top+'px';
}
$('#pop').addEventListener('click', e=>{
  const b=e.target.closest('button[data-a]'); if (!b) return; const a=b.dataset.a;
  if (a==='close'){ closePop(); return; }
  const id=b.closest('.pi').dataset.id, isC=id[0]==='c';
  const el=isC ? comps.find(x=>String(x.id)===id.slice(1)) : wires.find(x=>String(x.id)===id.slice(1)); if (!el) return;
  if (a==='edit'){ popEdit.has(el.id) ? popEdit.delete(el.id) : popEdit.add(el.id); renderPop(); return; }
  if (a==='sw'){ el.on=!el.on; save(); }
  else if (a==='off'){ pushUndo(); el.off=!el.off; dirty=true; save(); say(`${isC?lab(el):'สายไฟ'} ${el.off?'พักการทำงานแล้ว ยังอยู่บนแผงแต่ไม่ได้ต่อในวงจร':'กลับมาทำงานแล้ว'}`); }
  else if (a==='del'){ pushUndo(); if (isC) comps=comps.filter(x=>x!==el); else wires=wires.filter(x=>x!==el); if (sel===el) select(null); dirty=true; save(); say(`ลบ${isC?lab(el):'สายไฟ'}แล้ว · Ctrl+Z ย้อนกลับ`); }
  renderPop(); renderInsp();
});
document.addEventListener('pointerdown', e=>{ if (popAnchor && !e.target.closest('#pop') && e.target!==cv) closePop(); });

/* ---------- inspector ---------- */
const insp=$('#insp');
function select(x){ if (sel!==x){ sel=x; hist={v:[],i:[]}; } renderInsp(); if (document.getElementById('clist')) updateList(); }
let shownBroken=null;
const stateTag = el => el.broken ? '<span class="state st-dead" id="rSt">ไหม้แล้ว</span>' : '<span class="state st-ok" id="rSt">ปกติ</span>';
function repair(el){ el.broken=false; el.temp=TA; el.smokeT=0; if (!el.w){ el.vd=0; el.vp=0; el.ip=0; } dirty=true; }
function renderInsp(){
  if (!sel){
    insp.innerHTML=`<h3>วิธีใช้แผง</h3><ol class="howto">
      <li><b>วางอุปกรณ์</b> ลากจากแถบอุปกรณ์มาปล่อยบนแผง หรือแตะอุปกรณ์แล้วแตะจุดบนแผง</li>
      <li><b>ต่อสายไฟ</b> กดที่จุดใดก็ได้ แล้วลากไปปล่อยที่อีกจุด</li>
      <li><b>ย้าย</b> กดค้างที่ตัวอุปกรณ์แล้วลาก</li>
      <li><b>หมุน / ลบ</b> เลือกอุปกรณ์ แล้วกดปุ่มด้านล่าง หรือกด R / Delete</li>
      <li><b>สวิตช์</b> แตะเพื่อเปิดหรือปิด</li>
      <li><b>วัดแรงดันที่จุด</b> ชี้ที่จุดบนแผง ดูค่าใต้แผง (เทียบกับขั้วลบของแหล่งจ่าย)</li></ol>`;
    return;
  }
  if (sel.w){
    shownBroken=sel.broken;
    insp.innerHTML=`<h3>สายไฟ${stateTag(sel)}</h3><p class="desc">ในการคำนวณถือว่าไม่มีความต้านทาน ทุกจุดบนสายเดียวกันจึงมีศักย์เท่ากัน แต่ถ้ากระแสสูงมากราวสองร้อยแอมแปร์ สายจะร้อนจนหลอมขาด</p>
      <div class="therm"><span id="rTh" style="width:0"></span></div>
      <div class="reads"><div class="read"><small>กระแสในสาย</small><b id="rI">–</b></div><div class="read"><small>อุณหภูมิ</small><b id="rT">–</b></div></div>
      <div class="acts">${sel.broken?'<button id="bFix" class="danger">ซ่อมสายไฟ</button>':''}<button id="bDel">ลบสายไฟ</button></div>`;
    $('#bDel').onclick=deleteSel; if (sel.broken) $('#bFix').onclick=()=>{ repair(sel); renderInsp(); }; return;
  }
  const d=T[sel.type]; shownBroken=sel.broken;
  let h=`<h3>${lab(sel)} · ${d.name}${stateTag(sel)}</h3><p class="desc">${d.desc}</p>`;
  if (sel.type!=='vm') h+=`<div class="therm" title="อุณหภูมิเทียบกับจุดไหม้ ${TFAIL} °C"><span id="rTh" style="width:0"></span></div>`;
  for (const [k,label,unit,mn,mx] of shownFields(sel.type))
    h+=`<label class="field"><span>${label}</span><input id="f_${k}" data-cid="${sel.id}" data-k="${k}" type="number" inputmode="decimal" min="${mn}" max="${mx}" step="any" value="${sel[k]}"><span class="unit">${unit}</span></label>`;
  if (sel.type==='sw') h+=`<div class="acts" style="margin-bottom:8px"><button id="bSw">${sel.on?'เปิดวงจร (ตัดไฟ)':'ปิดวงจร (ต่อไฟ)'}</button></div>`;
  h+=`<div class="reads"><div class="read"><small>แรงดันคร่อม</small><b id="rV">–</b></div><div class="read"><small>กระแส</small><b id="rI">–</b></div><div class="read"><small>กำลัง</small><b id="rP">–</b></div>
      <div class="read"><small>อุณหภูมิ</small><b id="rT">–</b></div><div class="read"><small>ใช้พิกัดไป</small><b id="rU">–</b></div><div class="read"><small>${sel.type==='dc'||sel.type==='ac'?'พลังงานที่จ่าย':sel.type==='cap'||sel.type==='ind'?'พลังงานสะสม':'พลังงานที่ใช้'}</small><b id="rE">–</b></div></div>
      <div class="acts">${sel.broken?'<button id="bFix" class="danger">ซ่อมอุปกรณ์</button>':''}<button id="bOff">${sel.off?'เปิดใช้งาน':'พักการทำงาน'}</button><button id="bRot">หมุน 90°</button><button id="bDel">ลบอุปกรณ์</button></div>`;
  insp.innerHTML=h;
  for (const [k,,,mn,mx] of d.fields){
  }
  if (sel.type==='sw') $('#bSw').onclick=()=>{ sel.on=!sel.on; save(); renderInsp(); };
  $('#bRot').onclick=rotateSel; $('#bDel').onclick=deleteSel;
  $('#bOff').onclick=()=>{ pushUndo(); sel.off=!sel.off; dirty=true; save(); renderInsp(); renderPop(); };
  if (sel.broken) $('#bFix').onclick=()=>{ repair(sel); renderInsp(); };
}
function updateReads(){
  if (!sel) return;
  if (sel.broken!==shownBroken){ renderInsp(); return; }
  const rT=$('#rT'); if (rT) rT.textContent=Math.round(sel.temp)+' °C';
  const rTh=$('#rTh'); if (rTh) rTh.style.width=(heatF(sel.temp)*100).toFixed(1)+'%';
  const st=$('#rSt'); if (st && !sel.broken){ const hot=sel.temp>TSAFE; st.className='state '+(hot?'st-hot':'st-ok'); st.textContent=hot?'ร้อนเกินปกติ':'ปกติ'; }
  if (!sel.w){
    const rU=$('#rU'); if (rU) rU.textContent = sel.pMax>1e8 ? '–' : sel.type==='cap' ? Math.round(Math.abs(sel.v)/sel.Vmax*100)+'%' : Math.round((sel.pHeat||0)/sel.pMax*100)+'%';
    const rE=$('#rE'); if (rE) rE.textContent = sel.type==='cap' ? fmt(0.5*sel.C*1e-6*sel.v*sel.v,'J') : sel.type==='ind' ? fmt(0.5*sel.L*sel.i*sel.i,'J') : fmt(sel.en,'J');
  }
  const rI=$('#rI'); if (rI) rI.textContent=fmt(sel.i,'A');
  const rV=$('#rV'); if (rV) rV.textContent=fmt(sel.v,'V');
  const rP=$('#rP'); if (rP) rP.textContent=fmt(Math.abs(sel.v*sel.i),'W');
}

/* ---------- status + scope ---------- */
const status=$('#status');
function updateVars(){
  const lv=$('#live'); lv.textContent = `${running?'LIVE':'PAUSED'} · ${ideal?'IDEAL':'REAL'} · t ${t.toFixed(2)} s`; lv.classList.toggle('paused', !running);
  let s2=`t = ${t.toFixed(2)} s`;
  if (hover && topo){ const r=topo.find(K(hover.x,hover.y)), k=topo.idx.get(r); s2+=` · φ ที่จุด (${hover.x}, ${hover.y}) = `+(k===undefined?'ยังไม่ได้ต่อ':fmt(NV(r),'V')); }
  else s2+=' · ชี้จุดบนแผงเพื่อดูศักย์ φ';
  $('#vSub').textContent=s2;
}
let listSig='';
const listSignature = () => (ideal?'I':'R') + comps.map(c=>`${c.id}.${c.num}.${c.broken?1:0}.${c.off?1:0}.${c.type==='sw'?(c.on?1:0):''}`).join('|');
function renderList(){
  listSig=listSignature();
  const box=$('#clist'); $('#vTitle').textContent=`อุปกรณ์บนแผง · ${comps.length} ชิ้น`;
  if (!comps.length){ box.innerHTML='<div class="empty">ยังไม่มีอุปกรณ์บนแผง ลากจากแถบอุปกรณ์มาวาง แล้วค่าของแต่ละตัวจะขึ้นที่นี่</div>'; return; }
  const sorted=[...comps].sort((a,b)=>ORDER.indexOf(a.type)-ORDER.indexOf(b.type) || a.num-b.num);
  box.innerHTML=sorted.map(c=>{ const d=T[c.type];
    const ps=shownFields(c.type).map(([k,label,unit,mn,mx])=>`<label class="pf" title="${label}"><span>${k}</span><input type="number" inputmode="decimal" step="any" min="${mn}" max="${mx}" value="${c[k]}" data-cid="${c.id}" data-k="${k}" aria-label="${lab(c)} ${label}"><span>${unit}</span></label>`).join('');
    const sw=c.type==='sw'?`<button data-act="sw">${c.on?'ต่ออยู่ · กดเพื่อตัด':'ตัดอยู่ · กดเพื่อต่อ'}</button>`:'';
    const offb=c.off?`<span class="state st-hot">พักอยู่</span><button data-act="off">เปิดใช้งาน</button>`:'';
    const fix=c.broken?`<span class="state st-dead">ไหม้แล้ว</span><button data-act="fix" class="danger">ซ่อม</button>`:'';
    const lv=[['V','v'],['I','i'],['P','p'],['T','t']].map(([sy,k])=>`<span class="lv">${sy}<b data-l="${k}">–</b></span>`).join('');
    return `<div class="crow${c===sel?' on':''}${c.off?' off':''}" data-cid="${c.id}"><div class="chead"><span class="tag" style="--c:var(${TAGC[c.type]})">${lab(c)}</span><span class="cname">${d.name}</span>${sw}${offb}${fix}</div>${ps?`<div class="cparams">${ps}</div>`:''}<div class="clive">${lv}</div></div>`; }).join('');
  updateList();
}
function updateList(){
  if (listSignature()!==listSig){ renderList(); return; }
  for (const row of $('#clist').querySelectorAll('.crow')){
    const c=comps.find(x=>x.id==row.dataset.cid); if (!c) continue;
    row.classList.toggle('on', c===sel);
    const set=(k,v)=>{ const b=row.querySelector(`[data-l="${k}"]`); if (b && b.textContent!==v) b.textContent=v; };
    set('v', c.type==='am'?'–':fmt(c.v,'V')); set('i', c.type==='vm'?'–':fmt(c.i,'A'));
    set('p', c.type==='vm'||c.type==='am'?'–':fmt(Math.abs(c.v*c.i),'W')); set('t', c.type==='vm'?'–':Math.round(c.temp)+' °C');
  }
}
function updateStatusHint(){
  status.textContent = pendingPlace ? `แตะจุดบนแผงเพื่อวาง${T[pendingPlace].name} · แตะ${T[pendingPlace].name}อีกครั้งหรือกด Esc เพื่อยกเลิก` : (toast && performance.now()<toast.until ? toast.text : TOOL_HINT[tool]);
  updateVars();
}
function updateEnergy(){
  let sto=0, pn=0;
  for (const c of comps){ if (c.type==='cap') sto+=0.5*c.C*1e-6*c.v*c.v; if (c.type==='ind') sto+=0.5*c.L*c.i*c.i; if (c.pNow && (c.type==='dc'||c.type==='ac')) pn+=c.pNow; }
  $('#eSup').textContent=fmt(energy.sup,'J'); $('#eHeat').textContent=fmt(energy.heat,'J'); $('#eSto').textContent=fmt(sto,'J'); $('#pNow').textContent=fmt(pn,'W');
  const tot=Math.max(1e-12, energy.heat+sto);
  $('#bHeat').style.width=(Math.max(0,energy.heat)/tot*100).toFixed(1)+'%'; $('#bSto').style.width=(sto/tot*100).toFixed(1)+'%';
}
function drawScope(){
  const w=sc.clientWidth, h=sc.clientHeight; if (!w) return;
  if (sc.width!==Math.round(w*dpr)){ sc.width=Math.round(w*dpr); sc.height=Math.round(h*dpr); }
  sctx.setTransform(dpr,0,0,dpr,0,0); sctx.clearRect(0,0,w,h); sctx.shadowBlur=0;
  sctx.strokeStyle=C.line; sctx.lineWidth=1; sctx.beginPath(); sctx.moveTo(0,h/2); sctx.lineTo(w,h/2); sctx.stroke();
  for (let k=1;k<6;k++){ sctx.beginPath(); sctx.moveTo(w*k/6,0); sctx.lineTo(w*k/6,h); sctx.globalAlpha=.5; sctx.stroke(); sctx.globalAlpha=1; }
  const tr=(arr,color)=>{ if (arr.length<2) return 0; let m=0; for (const v of arr) m=Math.max(m,Math.abs(v)); const sc2=m>1e-12?(h/2-8)/m:0;
    sctx.strokeStyle=color; sctx.lineWidth=2; sctx.shadowColor=color; sctx.shadowBlur=glow(8); sctx.beginPath(); arr.forEach((v,k)=>{ const x=w-(arr.length-1-k)*(w/359), y=h/2-v*sc2; k?sctx.lineTo(x,y):sctx.moveTo(x,y); }); sctx.stroke(); return m; };
  const mv = sel && !sel.w ? tr(hist.v,C.copper) : 0, mi = sel ? tr(hist.i,C.el) : 0;
  $('#sV').textContent = sel && !sel.w ? 'สูงสุด ±'+fmt(mv,'V') : '–';
  $('#sI').textContent = sel ? 'สูงสุด ±'+fmt(mi,'A') : '–';
}

/* ---------- controls ---------- */
$('#preset').onchange=e=>{ const v=e.target.value; e.target.value=''; if (!v) return;
  const name=e.target.querySelector(`option[value="${v}"]`).textContent;
  if (comps.length||wires.length) askConfirm(`เปิดวงจรตัวอย่าง "${name}" แทนวงจรที่อยู่บนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`, 'เปิดตัวอย่าง', ()=>{ pushUndo(); loadPreset(v,true); });
  else loadPreset(v,true); };
$('#play').onclick=e=>{ running=!running; e.target.textContent=running?'หยุดชั่วคราว':'เล่นต่อ'; };
$('#reset').onclick=()=>{ t=0; for (const c of comps){ c.vp=0; c.ip=0; c.vd=0; c.en=0; if (!c.broken) c.temp=TA; } for (const w of wires) if (!w.broken) w.temp=TA; hist={v:[],i:[]}; energy={sup:0,heat:0}; };
$('#clear').onclick=()=>{ if (!comps.length && !wires.length) return;
  askConfirm(`ล้างแผงทั้งหมดใช่ไหม อุปกรณ์ ${comps.length} ชิ้นและสายไฟ ${wires.length} เส้นจะหายไป`, 'ล้างแผง', ()=>{ pushUndo(); comps=[]; wires=[]; resetSim(); dirty=true; select(null); setCircuit('วงจรใหม่', true); save(); }); };
$('#clearW').onclick=()=>{ if (!wires.length) return;
  askConfirm(`ล้างสายไฟทั้งหมด ${wires.length} เส้นใช่ไหม อุปกรณ์จะยังอยู่ที่เดิม`, 'ล้างสายไฟ', ()=>{ pushUndo(); wires=[]; dirty=true; if (sel && sel.w) select(null); save(); }); };
$('#lbl').onclick=e=>{ showLabels=!showLabels; e.target.setAttribute('aria-pressed',String(showLabels)); e.target.textContent='ป้ายบนวงจร: '+(showLabels?'แสดง':'ซ่อน'); };

/* confirm bar */
let confirmFn=null;
function askConfirm(msg, okLabel, fn){
  confirmFn=fn; $('#qTitle').textContent=okLabel+'?'; $('#qMsg').textContent=msg; $('#cOk').textContent=okLabel;
  $('#confirm').hidden=false; $('#cNo').focus();
}
$('#cTitle').addEventListener('change', e=>{ setCircuit(e.target.value); e.target.value=circuitName; save(); });
$('#cTitle').addEventListener('keydown', e=>{ if (e.key==='Enter') e.target.blur(); });
$('#confirm').addEventListener('click', e=>{ if (e.target.id==='confirm') closeConfirm(); });
function closeConfirm(){ $('#confirm').hidden=true; confirmFn=null; }
$('#cOk').onclick=()=>{ const f=confirmFn; closeConfirm(); if (f) f(); };
$('#cNo').onclick=closeConfirm;

/* component list interactions */
$('#clist').addEventListener('click', e=>{
  const row=e.target.closest('.crow'); if (!row) return; const c=comps.find(x=>x.id==row.dataset.cid); if (!c) return;
  const act=e.target.closest('[data-act]');
  if (act){ const a=act.dataset.act; if (a==='sw'){ c.on=!c.on; save(); } else if (a==='off'){ pushUndo(); c.off=!c.off; dirty=true; save(); renderPop(); } else repair(c); select(c); updateList(); return; }
  if (sel!==c) select(c);
});
document.addEventListener('input', e=>{
  const el=e.target; if (!el.dataset || !el.dataset.cid) return;
  const c=comps.find(x=>x.id==el.dataset.cid); if (!c) return;
  const f=T[c.type].fields.find(x=>x[0]===el.dataset.k); if (!f) return;
  const v=parseFloat(el.value);
  if (isFinite(v) && v>=f[3] && v<=f[4]){ c[f[0]]=v; el.removeAttribute('aria-invalid'); save();
    document.querySelectorAll(`input[data-cid="${c.id}"][data-k="${f[0]}"]`).forEach(o=>{ if (o!==el) o.value=el.value; }); }
  else el.setAttribute('aria-invalid','true');
});

/* save panel */
const SKEY='circuit-lab-saves';
function getSaves(){ try { const a=JSON.parse(localStorage.getItem(SKEY)||'[]'); return Array.isArray(a)?a:[]; } catch(e){ return []; } }
function putSaves(a){ try { localStorage.setItem(SKEY, JSON.stringify(a)); return true; } catch(e){ return false; } }
const sMsg=t2=>{ $('#sMsg').textContent=t2; };
function renderSaves(){
  const a=getSaves(), ul=$('#sList');
  ul.innerHTML = a.length ? '' : '<li><span><small>ยังไม่มีวงจรที่บันทึกไว้</small></span></li>';
  a.forEach((it,ix)=>{ const li=document.createElement('li');
    const sp=document.createElement('span'); sp.textContent=it.name;
    const sm=document.createElement('small'); sm.textContent=`อุปกรณ์ ${it.data.comps.length} ชิ้น · สายไฟ ${it.data.wires.length} เส้น · ${new Date(it.time).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}`; sp.appendChild(sm);
    const bo=document.createElement('button'); bo.textContent='เปิด';
    bo.onclick=()=>{ const go=()=>{ pushUndo(); applyData(it.data); setCircuit(it.name,true); save(); sMsg(`เปิด "${it.name}" แล้ว`); };
      if (comps.length||wires.length) askConfirm(`เปิด "${it.name}" แทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`, 'เปิดวงจร', go); else go(); };
    const bd=document.createElement('button'); bd.textContent='ลบ';
    bd.onclick=()=>askConfirm(`ลบวงจรที่บันทึกชื่อ "${it.name}" ใช่ไหม`, 'ลบ', ()=>{ const b=getSaves(); b.splice(ix,1); putSaves(b); renderSaves(); sMsg('ลบแล้ว'); });
    li.append(sp,bo,bd); ul.appendChild(li); });
}
$('#saveBtn').onclick=e=>{ const p=$('#savePanel'); p.hidden=!p.hidden; e.target.setAttribute('aria-expanded',String(!p.hidden)); if (!p.hidden){ renderSaves(); sMsg(''); $('#sName').value=circuitName; $('#sName').focus(); } };
$('#sClose').onclick=()=>{ $('#savePanel').hidden=true; $('#saveBtn').setAttribute('aria-expanded','false'); };
$('#sSave').onclick=()=>{
  const name=$('#sName').value.trim();
  if (!name){ sMsg('ใส่ชื่อวงจรก่อนบันทึก'); $('#sName').focus(); return; }
  if (!comps.length && !wires.length){ sMsg('แผงยังว่างอยู่ ยังไม่มีอะไรให้บันทึก'); return; }
  const doSave=()=>{ setCircuit(name); save(); const a=getSaves().filter(x=>x.name!==name); a.unshift({name,time:Date.now(),data:serialize()});
    sMsg(putSaves(a) ? `บันทึก "${name}" แล้ว` : 'บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล ลองใช้โค้ดวงจรแทน'); renderSaves(); };
  if (getSaves().some(x=>x.name===name)) askConfirm(`มีวงจรชื่อ "${name}" อยู่แล้ว บันทึกทับใช่ไหม`, 'บันทึกทับ', doSave); else doSave();
};
/* ---------- circuit code (text netlist) ---------- */
const CODE_T = { DC:'dc', AC:'ac', R:'res', B:'bulb', S:'sw', F:'fuse', C:'cap', L:'ind', D:'diode', LED:'led', VM:'vm', AM:'am' };
const TYPE_CODE = Object.fromEntries(Object.entries(CODE_T).map(([k,v])=>[v,k]));
function parseCode(txt){
  const errs=[], cs=[], ws=[]; let idealOpt=true, title='';
  txt.split(/\r?\n/).forEach((raw,ix)=>{
    const line=raw.replace(/#.*/,'').trim(); if (!line) return; const n=ix+1;
    const tk=line.split(/\s+/), head=tk[0].toUpperCase();
    if (head==='TITLE'){ title=line.slice(5).trim().slice(0,60); return; }
    if (head==='CIRCUIT'){ const m=line.match(/ideal=(\w+)/i); if (m) idealOpt=/^(1|true|on|yes)$/i.test(m[1]); return; }
    const pts=[], kv={};
    for (const t2 of tk.slice(1)){
      let m=t2.match(/^\(?(-?\d+),(-?\d+)\)?$/); if (m){ pts.push([+m[1],+m[2]]); continue; }
      m=t2.match(/^([A-Za-z_]+)=(.+)$/); if (m){ kv[m[1]]=m[2]; continue; }
      errs.push(`บรรทัด ${n}: อ่าน "${t2}" ไม่ออก จุดต้องเขียนแบบ x,y และค่าต้องเขียนแบบ ชื่อ=ตัวเลข`);
    }
    const out=pts.find(([x,y])=>x<0||x>=N||y<0||y>=N);
    if (out){ errs.push(`บรรทัด ${n}: จุด (${out[0]},${out[1]}) อยู่นอกแผง ใช้ได้แค่ 0–19`); return; }
    if (head==='W'){
      if (pts.length<2){ errs.push(`บรรทัด ${n}: สายไฟต้องมีอย่างน้อย 2 จุด`); return; }
      for (let k=0;k<pts.length-1;k++){ if (pts[k][0]===pts[k+1][0] && pts[k][1]===pts[k+1][1]) continue; ws.push([...pts[k],...pts[k+1], ...(/^(1|true|on|yes)$/i.test(kv.off||'')?[1]:[])]); }
      return;
    }
    const type=CODE_T[head];
    if (!type){ errs.push(`บรรทัด ${n}: ไม่รู้จักอุปกรณ์ "${tk[0]}" ใช้ได้: ${Object.keys(CODE_T).join(', ')}, W`); return; }
    if (pts.length!==2){ errs.push(`บรรทัด ${n}: ${head} ต้องมี 2 จุดพอดี (ขา a และขา b)`); return; }
    const [[ax,ay],[bx,by]]=pts;
    if (!((ax===bx && Math.abs(ay-by)===2) || (ay===by && Math.abs(ax-bx)===2))){ errs.push(`บรรทัด ${n}: ขา a และ b ของ ${head} ต้องห่างกัน 2 ช่องพอดี ในแนวนอนหรือแนวตั้ง`); return; }
    const o={type,ax,ay,bx,by};
    for (const k in kv){
      if (k==='name'){ o.name=kv[k].slice(0,12); continue; }
      if (k==='off'){ o.off=/^(1|true|on|yes)$/i.test(kv[k]); continue; }
      if (k==='on' && type==='sw'){ o.on=/^(1|on|true)$/i.test(kv[k]); continue; }
      const f=T[type].fields.find(x=>x[0]===k);
      if (!f){ errs.push(`บรรทัด ${n}: ${head} ไม่มีค่า "${k}" ใช้ได้: ${T[type].fields.map(x=>x[0]).concat(type==='sw'?['on']:[], ['name','off']).join(', ')}`); continue; }
      const v=Number(kv[k]);
      if (!isFinite(v) || v<f[3] || v>f[4]){ errs.push(`บรรทัด ${n}: ${k}=${kv[k]} ต้องเป็นตัวเลขระหว่าง ${f[3]} ถึง ${f[4]} (${f[2]})`); continue; }
      o[k]=v;
    }
    cs.push(o);
  });
  if (!errs.length && !cs.length && !ws.length) errs.push('ยังไม่มีอุปกรณ์หรือสายไฟในโค้ด');
  return { errs, data:{ comps:cs, wires:ws, ideal:idealOpt, title } };
}
const num6 = v => String(+Number(v).toPrecision(6));
function toCode(){
  const out=[`CIRCUIT v1 ideal=${ideal?1:0}`, `TITLE ${circuitName}`, '# แผงต่อวงจรไฟฟ้า · พิกัด 0–19 · x ไปขวา y ลงล่าง · ideal=1 คือวงจรอุดมคติ'];
  const sorted=[...comps].sort((a,b)=>ORDER.indexOf(a.type)-ORDER.indexOf(b.type) || (a.num||0)-(b.num||0));
  for (const c of sorted){
    const f=T[c.type].fields, d=T[c.type].def, parts=[TYPE_CODE[c.type].padEnd(3), `${c.ax},${c.ay}`, `${c.bx},${c.by}`];
    f.forEach(([k],ix)=>{ const rating=/max$/.test(k); if ((ix===0 && !rating) || c[k]!==d[k]) parts.push(`${k}=${num6(c[k])}`); });
    if (c.type==='sw') parts.push(`on=${c.on?1:0}`);
    if (c.name) parts.push(`name=${c.name.replace(/\s+/g,'_')}`);
    if (c.off) parts.push('off=1');
    out.push(parts.join(' '));
  }
  const H=new Map(), V=new Map(), other=[];
  for (const w of wires){
    if (w.off) other.push(`W   ${w.ax},${w.ay} ${w.bx},${w.by} off=1`);
    else if (w.ay===w.by && Math.abs(w.ax-w.bx)===1){ const k=w.ay; if (!H.has(k)) H.set(k,new Set()); H.get(k).add(Math.min(w.ax,w.bx)); }
    else if (w.ax===w.bx && Math.abs(w.ay-w.by)===1){ const k=w.ax; if (!V.has(k)) V.set(k,new Set()); V.get(k).add(Math.min(w.ay,w.by)); }
    else other.push(`W   ${w.ax},${w.ay} ${w.bx},${w.by}`);
  }
  const runs=(m,fmt)=>{ for (const [k,set] of [...m].sort((a,b)=>a[0]-b[0])){ const xs=[...set].sort((a,b)=>a-b); let st=xs[0], en=xs[0]+1;
    for (let j=1;j<=xs.length;j++){ if (j<xs.length && xs[j]===en){ en++; continue; } out.push(fmt(k,st,en)); if (j<xs.length){ st=xs[j]; en=xs[j]+1; } } } };
  runs(H,(y,a,b)=>`W   ${a},${y} ${b},${y}`); runs(V,(x,a,b)=>`W   ${x},${a} ${x},${b}`);
  return out.concat(other).join('\n');
}
const SAMPLE_CODE = `CIRCUIT v1
TITLE โจทย์ PAT3 ข้อ 14
# โจทย์ PAT3 ข้อ 14 : R, L, C ต่อขนานกับแหล่งจ่าย AC
AC  2,11 2,9  E=10 f=1
AM  7,5 7,7   name=I_R
R   7,9 7,11  R=10 Pmax=50
AM  11,5 11,7 name=I_L
L   11,9 11,11 L=2
AM  15,5 15,7 name=I_C
C   15,9 15,11 C=50000
W   2,9 2,3 15,3           # รางบน
W   2,11 2,15 15,15        # รางล่าง
W   7,3 7,5
W   7,7 7,9
W   7,11 7,15
W   11,3 11,5
W   11,7 11,9
W   11,11 11,15
W   15,3 15,5
W   15,7 15,9
W   15,11 15,15`;
const cMsg=t2=>{ $('#cMsg').textContent=t2; };
function showErrs(list){ const ul=$('#cErr'); ul.innerHTML=''; for (const e of list.slice(0,12)){ const li=document.createElement('li'); li.textContent=e; ul.appendChild(li); }
  if (list.length>12){ const li=document.createElement('li'); li.textContent=`และอีก ${list.length-12} รายการ`; ul.appendChild(li); } }
// English prompt the user pastes into an AI chat together with a picture of the problem; keep it in step with docs/circuit-code-spec.md
const AI_PROMPT = `You are converting an electric-circuit problem (from the attached image or text) into code for "Circuit Lab", a 20x20 node board simulator.
Reply with ONE code block that starts with "CIRCUIT v1", then a short explanation of each part and what every meter should read.

BOARD
- Grid of nodes, x and y are integers 0-19. x grows to the right, y grows downward (0,0 is top-left).
- Every component has 2 legs, a and b, exactly 2 cells apart, horizontal or vertical only.
  Good: "7,9 7,11" or "3,4 5,4". Bad: "7,9 7,10" (1 apart), "1,1 3,3" (diagonal).
- The middle point between a and b is the component body, NOT a connection point.

FORMAT (one item per line, "#" starts a comment)
CIRCUIT v1 ideal=1        (ideal=1: ideal sources/meters, nothing burns; ideal=0: internal resistance, heat and burnout)
TITLE <short name of the circuit>
<TYPE> <a> <b> [key=value ...] [name=Label]
W <point> <point> [<point> ...]   (wire through several points)
- Points are written x,y with no space after the comma. Values are plain numbers with no units or prefixes (R=4700, not 4.7k; 1e-3 is fine).
- name= has no spaces (use _), at most 12 characters, e.g. name=I_R. off=1 keeps a part on the board but disconnected.

TYPES (defaults in brackets)
DC  battery: E volts [9], r internal ohms [0.5], Pmax W [20]. Leg b is the POSITIVE terminal.
AC  source: E PEAK volts [10], f Hz [1], r [0.5], Pmax [20]. v(t)=E*sin(2*pi*f*t) at b relative to a. If given rms, multiply by 1.414.
R   resistor: R ohms [100], Pmax W [2]
B   bulb: R ohms [20], Pmax W [10]
S   switch: on=1 closed or on=0 open [1], Pmax [10]
F   fuse: Imax A [2]
C   capacitor: C in MICROFARADS [4700], Vmax V [25]   (0.05 F -> C=50000, 100 uF -> C=100)
L   inductor: L henry [2], Imax A [2]
D   diode: conducts from a (anode) to b (cathode), Pmax [1]
LED conducts from a to b, about 2 V drop, Pmax [0.1]
VM  voltmeter, reads V(a)-V(b), connect in PARALLEL
AM  ammeter, reads current from a to b, connect in SERIES, Pmax [2]
r, Pmax, Imax and Vmax only matter with ideal=0; set them well above the expected values unless the problem wants a part to fail.

WIRE RULES (most important)
1. A wire connects to EVERY grid point it passes through, not only its ends.
2. Wires that cross or overlap on a grid point are always connected. Route around if they must not connect.
3. A wire passing a component leg connects to that leg.
4. Never run a wire through a component's middle point, and never wire a component's a leg straight to its b leg (that shorts it).
5. Use only horizontal and vertical wire segments. Parts must not overlap.

LAYOUT TIPS
Put the source on the left, vertical (e.g. "DC 2,11 2,9" with + at the top), make a top rail (y=3) and a bottom rail (y=15),
put each branch vertically 3-4 columns apart (x = 7, 11, 15), insert ammeters in the branch, put voltmeters as their own parallel branch,
name parts to match the problem (name=R1, name=I_L, name=V_C) and keep everything within x 2-17, y 2-16.

EXAMPLE (12 V battery with two 24 ohm bulbs in parallel and a voltmeter)
CIRCUIT v1 ideal=1
TITLE Two bulbs in parallel
DC  2,10 2,8   E=12
B   8,8 8,10   R=24 name=B1
B   12,8 12,10 R=24 name=B2
VM  16,8 16,10 name=V_B
W   2,8 2,3 16,3 16,8
W   8,3 8,8
W   12,3 12,8
W   2,10 2,15 16,15 16,10
W   8,10 8,15
W   12,10 12,15
(each bulb 0.5 A, V_B reads 12 V)

CHECK BEFORE ANSWERING: TITLE present; every point 0-19; every part has legs exactly 2 apart; no wire through a part's middle;
crossings are meant to connect; DC polarity (b = +) and diode direction (a -> b) are right; every branch returns to the source;
C is in microfarads and AC E is peak; no units after numbers.
If the problem needs something the board lacks (transformer, transistor, op-amp, current source, variable resistor), say so and use the closest substitute.`;
$('#cPrompt').value=AI_PROMPT;
const codePanel=$('#codePanel');
function openCode(){ codePanel.hidden=false; $('#codeBtn').setAttribute('aria-expanded','true'); cMsg(''); showErrs([]); if (!matchMedia('(pointer: coarse)').matches) $('#cCode').focus(); }
function closeCode(){ codePanel.hidden=true; $('#codeBtn').setAttribute('aria-expanded','false'); }
$('#codeBtn').onclick=()=>{ codePanel.hidden ? openCode() : closeCode(); };
$('#cClose').onclick=closeCode;
codePanel.addEventListener('click', e=>{ if (e.target===codePanel) closeCode(); });
$('#cPromptCopy').onclick=()=>{ const b=$('#cPromptCopy'), ta=$('#cPrompt');
  const done=()=>{ b.classList.add('done'); b.querySelector('span').textContent='คัดลอกแล้ว'; setTimeout(()=>{ b.classList.remove('done'); b.querySelector('span').textContent='คัดลอก'; },1800); };
  const fallback=()=>{ ta.focus(); ta.select(); cMsg('เลือกพร็อมต์ไว้ให้แล้ว กดคัดลอกได้เลย'); };
  try { navigator.clipboard.writeText(AI_PROMPT).then(done, fallback); } catch(e){ fallback(); } };
$('#cExport').onclick=()=>{ $('#cCode').value=toCode(); showErrs([]); cMsg(`ดึงโค้ดแล้ว อุปกรณ์ ${comps.length} ชิ้น`); };
$('#cSample').onclick=()=>{ $('#cCode').value=SAMPLE_CODE; showErrs([]); cMsg('ใส่โค้ดตัวอย่างแล้ว กด "นำเข้าวงจร" เพื่อสร้าง'); };
$('#cCopy').onclick=()=>{ const ta=$('#cCode'); if (!ta.value.trim()) ta.value=toCode();
  const fallback=()=>{ ta.focus(); ta.select(); cMsg('เลือกโค้ดไว้ให้แล้ว กดคัดลอกได้เลย'); };
  try { navigator.clipboard.writeText(ta.value).then(()=>cMsg('คัดลอกโค้ดแล้ว'), fallback); } catch(e){ fallback(); } };
$('#cCode').addEventListener('input', ()=>{ showErrs([]); cMsg(''); });
$('#cImport').onclick=()=>{
  const txt=$('#cCode').value.trim(); if (!txt){ cMsg('วางโค้ดวงจรก่อน แล้วค่อยกดนำเข้า'); return; }
  let res;
  if (txt[0]==='{'){ try { const d=JSON.parse(txt); res = validData(d) ? {errs:[],data:d} : {errs:['โค้ด JSON นี้ไม่ใช่วงจรจากแผงนี้']}; } catch(e){ res={errs:['โค้ด JSON ไม่ถูกต้อง']}; } }
  else res=parseCode(txt);
  if (res.errs.length){ showErrs(res.errs); cMsg(`พบปัญหา ${res.errs.length} จุด แก้แล้วกดนำเข้าอีกครั้ง`); return; }
  const go=()=>{ pushUndo(); applyData(res.data); setCircuit(res.data.title||'วงจรจากโค้ด', true); save(); showErrs([]); closeCode(); cMsg(`สร้างวงจรแล้ว อุปกรณ์ ${comps.length} ชิ้น สายไฟ ${res.data.wires.length} เส้น`); };
  if (comps.length||wires.length) askConfirm('นำเข้าวงจรจากโค้ดแทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก', 'นำเข้า', go); else go();
};
$('#fixall').onclick=()=>{ for (const c of comps) repair(c); for (const w of wires) repair(w); renderInsp(); };
function setIdeal(v, quiet){
  ideal=!!v;
  const b=document.getElementById('ideal'); if (b){ b.setAttribute('aria-pressed',String(ideal)); b.textContent='วงจรอุดมคติ: '+(ideal?'เปิด':'ปิด'); }
  for (const c of comps){ c.vd=0; if (ideal){ c.broken=false; c.smokeT=0; } c.temp=TA; }
  for (const w of wires){ if (ideal && w.broken){ w.broken=false; dirty=true; } w.temp=TA; }
  dirty=true;
  if (!quiet){ renderInsp(); renderList(); save(); }
}
$('#ideal').onclick=()=>setIdeal(!ideal);
$('#heat').onclick=e=>{ showHeat=!showHeat; e.target.setAttribute('aria-pressed',String(showHeat)); e.target.textContent='ความร้อน: '+(showHeat?'แสดง':'ซ่อน'); };
$('#speed').onchange=e=>{ speed=parseFloat(e.target.value); };
const setMode=m=>{ elMode=m; $('#mCur').setAttribute('aria-pressed',String(!m)); $('#mEl').setAttribute('aria-pressed',String(m)); };
$('#mCur').onclick=()=>setMode(false); $('#mEl').onclick=()=>setMode(true);

/* ---------- sizing + loop ---------- */
const stage=$('#stage'), compact=matchMedia('(max-width:1060px)');
function resize(){
  const d=Math.min(window.devicePixelRatio||1, lite?2:Infinity);
  let avail=stage.clientWidth;
  // compact layout: the whole board has to fit under the toolbar on the first screen
  if (compact.matches) avail=Math.min(avail, innerHeight-(stage.getBoundingClientRect().top+scrollY)-12);
  const s=Math.max(200,Math.min(avail,680));
  if (s===side && d===dpr && cv.width===Math.round(s*d)) return;
  dpr=d; side=s; u=side/N;
  cv.style.width=side+'px'; cv.style.height=side+'px'; cv.width=Math.round(side*dpr); cv.height=Math.round(side*dpr);
  document.documentElement.style.setProperty('--side', side+'px');
  drawIcons();
}
// resizing inside the observer callback would change the stage it watches, so wait for the next frame
new ResizeObserver(() => requestAnimationFrame(resize)).observe(stage);
try { document.fonts.ready.then(resize); } catch(e){}

// palette beside the board can be folded away on small screens; the choice is remembered in this browser
const app=$('.app'), palBtn=$('#palBtn');
function setPal(open){ app.classList.toggle('palhide', !open); palBtn.setAttribute('aria-expanded', String(open)); }
const uiPrefs=()=>{ try { return JSON.parse(localStorage.getItem('circuit-lab-ui')||'{}')||{}; } catch(e){ return {}; } };
const putPrefs=p=>{ try { localStorage.setItem('circuit-lab-ui', JSON.stringify(Object.assign(uiPrefs(),p))); } catch(e){} };
setPal(uiPrefs().pal!==false);
function setDepth(on){ depth=on; const b=$('#depth'); b.setAttribute('aria-pressed',String(on)); b.textContent='มุมมอง 2.5D: '+(on?'เปิด':'ปิด'); }
setDepth(uiPrefs().depth===true);
$('#depth').onclick=()=>{ setDepth(!depth); putPrefs({depth}); };
palBtn.onclick=()=>{ const open=app.classList.contains('palhide'); setPal(open);
  putPrefs({pal:open}); };

let last=performance.now(), fr=0, reduce=false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
function loop(now){
  if (lite && now-last<10){ requestAnimationFrame(loop); return; }   // 120 Hz phones render every other frame
  const rdt=Math.min(0.05,(now-last)/1000); last=now;
  if (dirty) build();
  if (running){
    const steps=Math.min(80, Math.max(1, Math.round(rdt*speed/DT)));
    for (let k=0;k<steps;k++) step();
    wireCurrents();
    const sdt=steps*DT, Rw=(TSAFE-TA)/20, Cw=0.5/Rw;
    if (ideal) for (const w of wires) w.temp=TA;
    else for (const w of wires){ if (w.broken){ w.temp+= (-(w.temp-TA)/Rw)/Cw*sdt; continue; }
      const p=w.i*w.i*RWH; w.temp=Math.min(3000, w.temp+(p-(w.temp-TA)/Rw)/Cw*sdt);
      if (w.temp>=TFAIL){ w.broken=true; dirty=true; w.failMsg=`สายไฟหลอมขาด กระแส ${fmt(Math.abs(w.i),'A')} (t = ${t.toFixed(2)} s)`; events.push(w); } }
    handleEvents();
    let big=false;
    for (const c of comps){
      if (Math.abs(c.i)>20 && c.type!=='vm') big=true;
      if (c.type==='bulb') c.glow=Math.abs(c.v*c.i)/4;
      if (c.type==='led') c.glow=Math.abs(c.i)/0.02;
    }
    $('#warn').hidden=!big;
    const ph = reduce ? 0.35 : 1;
    for (const el of comps) el.phase+=flowSpeed(el.i)*rdt*Math.sqrt(speed)*ph;
    for (const el of wires) el.phase+=flowSpeed(el.i)*rdt*Math.sqrt(speed)*ph;
    if (sel){ hist.v.push(sel.v||0); hist.i.push(sel.i||0); if (hist.v.length>360){ hist.v.shift(); hist.i.shift(); } }
  }
  updateFx(rdt);
  draw();
  if (++fr%6===0){ updateReads(); updateStatusHint(); drawScope(); updateEnergy(); updateList(); }
  requestAnimationFrame(loop);
}

const hp=(typeof location!=='undefined' && location.hash || '').slice(1);
if (PRESETS[hp]) loadPreset(hp); else if (!load()) loadPreset('flash');
renderList();
try { addEventListener('hashchange', () => { const h2=location.hash.slice(1); if (PRESETS[h2]) loadPreset(h2,true); }); } catch(e){}
resize(); renderInsp(); markPal();
requestAnimationFrame(loop);
})();
