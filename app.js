(() => {
// RINT: internal resistance of an ideal source, only enough to keep a shorted source finite. RSW: contact resistance of a real switch.
// GOPEN (a 1 TΩ leak across each coil) and RTS (1 nΩ in the secondary) only keep an ideal transformer solvable when both coils are open
// or two transformers share coils; everything else that is open is left out of the equations (see build)
const N = 20, DT = 5e-4, RINT = 1e-4, RSW = 1e-3, RF = 0.05, RWH = 1e-3, GOPEN = 1e-12, RTS = 1e-9;
const TA = 25, TSAFE = 100, TFAIL = 200, RAM_REAL = 0.1, RVM_REAL = 1e6;
const DP = { diode:{Is:1e-14,nvt:0.02585}, led:{Is:1e-18,nvt:0.0517} };
// LED colours: index 0 is red (the original LED, unchanged). The forward voltage at 20 mA sets the saturation current: Is = 0.02·exp(−Vf/nvt)
const LEDC = [ {key:'red',name:'แดง',en:'Red',col:'#FF4D6D'}, {key:'orange',name:'ส้ม',en:'Orange',col:'#FF8A3D',vf:2.0}, {key:'yellow',name:'เหลือง',en:'Yellow',col:'#FFD23F',vf:2.1},
  {key:'green',name:'เขียว',en:'Green',col:'#3DFF8A',vf:2.2}, {key:'blue',name:'ฟ้า',en:'Blue',col:'#4DA3FF',vf:3.0}, {key:'white',name:'ขาว',en:'White',col:'#F2F6FF',vf:3.1} ];
// page language: Thai (default) or English for every text on the page, remembered in circuit-lab-ui as lang. Every string shown goes through L(th, en)
let lang = (() => { try { return (JSON.parse(localStorage.getItem('circuit-lab-ui')||'{}')||{}).lang==='en' ? 'en' : 'th'; } catch(e){ return 'th'; } })();
const L = (th, en) => lang==='en' ? en : th;
LEDC.forEach((o,i)=>{ DP['led'+i] = i ? {Is:0.02*Math.exp(-o.vf/DP.led.nvt), nvt:DP.led.nvt} : DP.led; });
const ledCol = (c, fallback) => c.color ? LEDC[c.color].col : fallback;
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
  led:{name:'LED',def:{Pmax:0.1,color:0},desc:'ไดโอดที่เปล่งแสง นำไฟทางเดียว ต้องการแรงดันราว 2 V (แดง ส้ม เหลือง เขียว) หรือราว 3 V (ฟ้า ขาว) เลือกสีได้ และควรมีตัวต้านทานอนุกรมเพื่อจำกัดกระแส ไม่อย่างนั้นจะไหม้ทันที',fields:[['Pmax','พิกัดกำลัง','W',0.001,1e5],['color','สี','',0,5,['แดง', 'ส้ม', 'เหลือง', 'เขียว', 'ฟ้า', 'ขาว']]]},
  vm:{name:'โวลต์มิเตอร์',def:{},desc:'วัดความต่างศักย์ ต้องต่อขนาน (คร่อม) กับอุปกรณ์ ความต้านทานภายในสูงมาก จึงแทบไม่ดึงกระแส ขั้ว + คือฝั่งที่มีเครื่องหมาย',fields:[]},
  am:{name:'แอมมิเตอร์',def:{Pmax:2},desc:'วัดกระแส ต้องต่ออนุกรมในเส้นทางที่กระแสไหลผ่าน ความต้านทานภายในต่ำมาก ห้ามต่อคร่อมแหล่งจ่ายเด็ดขาด',fields:[['Pmax','พิกัดความร้อน','W',0.01,1e5]]},
  fuse:{name:'ฟิวส์',def:{Imax:2},desc:'ลวดเส้นเล็กที่จงใจให้หลอมก่อน เมื่อกระแสเกินพิกัดราว 1.5 เท่า ฟิวส์จะขาดเพื่อตัดวงจร ป้องกันอุปกรณ์อื่นและสายไฟไม่ให้ไหม้',fields:[['Imax','พิกัดกระแส','A',0.001,1e4]]},
};
T.gnd = {name:'จุดกราว',def:{},desc:'จุดอ้างอิงศักย์ 0 โวลต์ ต่อขา a เข้ากับจุดที่ต้องการให้เป็น 0 V แล้วศักย์ φ ของจุดอื่นบนแผงจะวัดเทียบกับจุดนี้ ขา b เป็นแค่ส่วนของสัญลักษณ์ ไม่ต้องต่ออะไร ถ้าไม่วางกราว แผงจะเลือกจุดอ้างอิงให้เอง วางหลายจุดได้ ทุกจุดจะเป็น 0 V',fields:[]};
T.tp = {name:'ขดปฐมภูมิ',def:{grp:1,L:100,n:2,k:0.99,Imax:2},desc:'ขดลวดด้านรับไฟของหม้อแปลง จับคู่กับขดทุติยภูมิที่มีเลขคู่เดียวกัน จุดที่ขา a กับขา a ของขดทุติยภูมิมีเฟสตรงกัน หม้อแปลงทำงานกับไฟสลับ ในโหมดอุดมคติ V₂ = n·V₁ และ I₁ = −n·I₂ ส่วนโหมดจริงเป็นขดลวดคู่บนแกนเหล็ก ถ้าต่อกับไฟตรงกระแสจะไต่ขึ้นเรื่อยๆ เพราะแบบจำลองไม่มีความต้านทานขดลวด',
  fields:[['grp','เลขคู่ (ขดทุติยภูมิใช้เลขเดียวกัน)','',1,99],['L','ความเหนี่ยวนำขดปฐมภูมิ','H',0.001,1e4],['n','อัตราส่วนรอบ N₂/N₁','',0.01,100],['k','ค่าคัปปลิง','',0.5,0.9999],['Imax','พิกัดกระแส','A',0.001,1e4]]};
T.ts = {name:'ขดทุติยภูมิ',def:{grp:1,Imax:2},desc:'ขดลวดด้านจ่ายไฟของหม้อแปลง จับคู่กับขดปฐมภูมิที่มีเลขคู่เดียวกัน อัตราส่วนรอบและความเหนี่ยวนำตั้งที่ขดปฐมภูมิ กระแสของขดนี้นับจากขา a ไปขา b ตอนจ่ายไฟให้โหลดจึงเป็นค่าลบ ใช้แอมมิเตอร์อนุกรมกับโหลดถ้าอยากอ่านกระแสโหลด',
  fields:[['grp','เลขคู่ (ขดปฐมภูมิใช้เลขเดียวกัน)','',1,99],['Imax','พิกัดกระแส','A',0.001,1e4]]};
const ORDER = ['dc','ac','res','bulb','sw','fuse','cap','ind','tp','ts','diode','led','vm','am','gnd'];
const PALX = { tr:{name:'หม้อแปลง'} };   // palette-only entry: places a primary and a secondary coil together
// English names, descriptions and field labels of the parts (the Thai ones are in T)
const TEN = {
  dc:{name:'DC source', desc:'A cell or battery that pushes charge one way. The positive terminal is the long plate with the + mark. It has a little internal resistance; shorted, it gets very hot and explodes.', f:{E:'EMF', r:'Internal resistance', Pmax:'Internal heat rating'}},
  ac:{name:'AC source', desc:'A voltage that swings back and forth as a sine wave, so the current flows one way and then the other. Select it and watch the oscilloscope.', f:{E:'Peak voltage', f:'Frequency', r:'Internal resistance', Pmax:'Internal heat rating'}},
  res:{name:'Resistor', desc:"Resists the flow of charge: the larger R, the smaller the current, by Ohm's law V = IR. If the power P = VI goes over its rating, it overheats and burns.", f:{R:'Resistance', Pmax:'Power rating'}},
  bulb:{name:'Bulb', desc:'A resistor that turns electrical energy into light and heat. The larger the power P = I²R, the brighter it glows; over its rating the filament breaks.', f:{R:'Resistance', Pmax:'Power rating'}},
  sw:{name:'Switch', desc:'Tap the switch on the board to open or close it. When the circuit is broken, the current stops along the whole path at once.', f:{Pmax:'Contact heat rating'}},
  cap:{name:'Capacitor', desc:'Stores charge on two metal plates, like a water tank. Once it is full, DC current stops. Time constant τ = RC. Over its voltage rating the insulation fails and it explodes.', f:{C:'Capacitance', Vmax:'Voltage rating'}},
  ind:{name:'Inductor', desc:'A coil that resists changes in current, so the current rises gradually instead of jumping. Time constant τ = L/R. Over its current rating the coil overheats and burns.', f:{L:'Inductance', Imax:'Current rating'}},
  diode:{name:'Diode', desc:'Lets current flow one way only, from the triangle (anode) to the bar (cathode). It needs about 0.7 V before it starts to conduct.', f:{Pmax:'Power rating'}},
  led:{name:'LED', desc:'A diode that gives off light. It conducts one way and needs about 2 V (red, orange, yellow, green) or about 3 V (blue, white). Pick a colour, and put a resistor in series to limit the current, or it burns out at once.', f:{Pmax:'Power rating', color:'Colour'}},
  vm:{name:'Voltmeter', desc:'Measures potential difference. Connect it in parallel, across the part. Its internal resistance is very high, so it draws almost no current. The + terminal is the marked side.', f:{}},
  am:{name:'Ammeter', desc:'Measures current. Connect it in series in the path the current flows through. Its internal resistance is very low: never connect it across a source.', f:{Pmax:'Heat rating'}},
  fuse:{name:'Fuse', desc:'A thin wire made to melt first. When the current goes about 1.5 times over its rating, the fuse blows and breaks the circuit, protecting the other parts and the wires.', f:{Imax:'Current rating'}},
  gnd:{name:'Ground', desc:'The 0 V reference point. Connect leg a to the point you want at 0 V; the potential φ of every other point on the board is then measured from it. Leg b is only part of the symbol, connect nothing to it. Without a ground the board picks a reference itself. You can place several; all of them are at 0 V.', f:{}},
  tp:{name:'Primary coil', desc:'The input coil of a transformer. It pairs with the secondary coil that has the same pair number, and leg a of both coils is in phase (the dot). A transformer works with AC. In ideal mode V₂ = n·V₁ and I₁ = −n·I₂; in real mode it is two coupled coils on an iron core. On DC the current keeps rising, because the model has no coil resistance.', f:{grp:'Pair number (the secondary uses the same)', L:'Primary inductance', n:'Turns ratio N₂/N₁', k:'Coupling', Imax:'Current rating'}},
  ts:{name:'Secondary coil', desc:'The output coil of a transformer. It pairs with the primary coil that has the same pair number; the turns ratio and inductance are set on the primary. Its current counts from leg a to leg b, so it is negative while it feeds a load. Put an ammeter in series with the load to read the load current.', f:{grp:'Pair number (the primary uses the same)', Imax:'Current rating'}},
  tr:{name:'Transformer'},
};
const tName = t => lang==='en' ? TEN[t].name : (T[t]||PALX[t]).name;
const tDesc = t => lang==='en' ? TEN[t].desc : T[t].desc;
const fName = (t, f) => lang==='en' ? (TEN[t].f[f[0]]||f[1]) : f[1];
const fOpts = f => f[5] && (lang==='en' ? LEDC.map(o=>o.en) : f[5]);
const palName = tName;
const BOOM = { dc:'big', ac:'big', cap:'big', res:'big', bulb:'pop', led:'pop', diode:'pop', am:'pop', sw:'pop', ind:'pop', tp:'pop', ts:'pop', fuse:'melt' };

let comps = [], wires = [], uid = 1, sel = null, t = 0, running = true, elMode = false, speed = 1;
let multi = new Set();   // several parts and wires selected together (box select, Ctrl+A, paste); sel is then null
let dirty = true, topo = null, pendingPlace = null, placing = null, drag = null, hover = null;
let hist = { v:[], i:[] };
let ideal = true, circuitName = L('วงจรของฉัน','My circuit'), toastTimer = null;
function setCircuit(name, announce){
  circuitName = (name || L('วงจรของฉัน','My circuit')).trim().slice(0,60) || L('วงจรของฉัน','My circuit');
  const el=document.getElementById('cTitle'); if (el && document.activeElement!==el) el.value=circuitName;
  if (announce) showToast(L('เปิดวงจร','Circuit opened'), circuitName);
}
function showToast(kick, text){
  const el=document.getElementById('toastf'); if (!el) return;
  document.getElementById('tKick').textContent=kick; document.getElementById('tText').textContent=text;
  clearTimeout(toastTimer); el.classList.remove('out'); el.hidden=false;
  el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  toastTimer=setTimeout(()=>{ el.classList.add('out'); toastTimer=setTimeout(()=>{ el.hidden=true; el.classList.remove('out'); }, 320); }, 2600);
}
const presetTitle = k => { const o=document.querySelector(`#preset option[value="${k}"]`); return !o ? k : lang==='en' && o.dataset.en ? o.dataset.en : (o.dataset.th ?? o.textContent); };
const srcR = c => ideal ? RINT : c.r;
const dkey = c => c.type==='led' ? 'led'+(c.color|0) : c.type;
// ideal mode: a closed switch, an ammeter, a fuse and a conducting diode have no resistance at all, so they are joined like a wire
const isShort = c => ideal && !c.off && !c.broken && (c.type==='am' || c.type==='fuse' || (c.type==='sw' && c.on) || (c.type==='diode' && !!c.don));
const realOnly = k => k==='r' || k==='k' || /max$/.test(k);
const shownFields = type => T[type].fields.filter(f => !(ideal && (realOnly(f[0]) || (type==='tp' && f[0]==='L'))));
const REAL_PRESETS = new Set(['boom','fuse','short']);
let showLabels = true, showHeat = true, parts = [], flashes = [], shake = 0, energy = { sup:0, heat:0 }, events = [];

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

const PREFIX = { dc:'DC', ac:'AC', res:'R', bulb:'B', sw:'S', fuse:'F', cap:'C', ind:'L', tp:'TP', ts:'TS', gnd:'GND', diode:'D', led:'LED', vm:'VM', am:'AM' };
const TAGC = { dc:'--copper', ac:'--copper', res:'--ink', bulb:'--ink', cap:'--ink', ind:'--ink', tp:'--ink', ts:'--ink', gnd:'--muted', sw:'--muted', fuse:'--muted', diode:'--led', led:'--led', vm:'--accent', am:'--accent' };
// one control per field: a number box, or a drop-down when the field has an option list (6th item), e.g. the LED colour
const fieldCtl = (c, f, extra) => { const [k,,,mn,mx]=f, opts=fOpts(f);
  return opts ? `<select data-cid="${c.id}" data-k="${k}" ${extra}>${opts.map((o,i)=>`<option value="${i}"${(c[k]|0)===i?' selected':''}>${o}</option>`).join('')}</select>`
              : `<input type="number" inputmode="decimal" step="any" min="${mn}" max="${mx}" value="${c[k]}" data-cid="${c.id}" data-k="${k}" ${extra}>`; };
const tagCol = c => ledCol(c, null) || `var(${TAGC[c.type]})`;
const lab = c => c.name || (PREFIX[c.type] + (c.type==='tp'||c.type==='ts' ? c.grp : (c.num||'')));
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
  trans(){ comps=[ mk('ac',3,5,3,3,{E:10,f:1}), mk('am',4,2,6,2,{name:'I_P'}), mk('tp',7,5,9,5,{grp:1,n:2,name:'T1'}), mk('ts',7,6,9,6,{grp:1}),
      mk('am',14,8,14,10,{name:'I_L'}), mk('res',14,12,14,14,{R:50,Pmax:100,name:'R'}), mk('vm',18,12,18,14,{name:'V_2'}), mk('gnd',1,5,1,7) ];
    path([[3,3],[3,2],[4,2]]); path([[6,2],[7,2],[7,5]]); path([[3,5],[1,5],[1,1],[11,1],[11,5],[9,5]]);
    path([[9,6],[9,8],[14,8]]); path([[14,10],[14,12]]); path([[14,14],[14,16],[7,16],[7,6]]); path([[14,12],[18,12]]); path([[14,14],[18,14]]); return 2; },
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
  const join = (p,q) => { p=f(p); q=f(q); if (p!==q) uf[p]=q; };
  for (const w of wires) if (!w.broken && !w.off) join(K(w.ax,w.ay), K(w.bx,w.by));
  const net = new Int32Array(N*N); for (let k=0;k<N*N;k++) net[k]=f(k);   // wire nets: points joined by wires alone
  // ideal shorts join their two legs like a wire; their current is worked out afterwards from the currents around them (shortCurrents)
  for (const c of comps){ c.short=isShort(c); if (c.short) join(K(c.ax,c.ay), K(c.bx,c.by)); }
  for (const c of comps){ c.ra=f(K(c.ax,c.ay)); c.rb=c.type==='gnd' ? c.ra : f(K(c.bx,c.by)); }   // a ground symbol only uses leg a
  // transformer coils pair up by grp; a live pair is stamped together in solveNodes()
  const frees = comps.filter(c => c.type==='ts'), pairs = [];
  for (const c of comps){ c.pt=null; c.live=false; c.ju=-1; }
  for (const p of comps) if (p.type==='tp'){ const i=frees.findIndex(q => q.grp===p.grp); if (i>=0){ const q=frees.splice(i,1)[0]; p.pt=q; q.pt=p;
    if (!p.off && !p.broken && !q.off && !q.broken){ p.live=q.live=true; pairs.push(p); } } }
  // parts that pass current tie their nodes into an island with its own 0 V reference. Open parts (open switch, ideal voltmeter, ideal diode
  // that is off, parked or burnt part, coil without a partner) are left out of the equations, so they carry exactly no current
  for (const c of comps) c.cond = !c.short && !c.off && !c.broken && c.type!=='gnd' && !(c.type==='sw' && !c.on) && !(c.type==='ts' && !c.live) && !(ideal && (c.type==='vm' || c.type==='diode'));
  const u2 = new Int32Array(N*N); for (let k=0;k<N*N;k++) u2[k]=k;
  const f2 = k => { while (u2[k]!==k){ u2[k]=u2[u2[k]]; k=u2[k]; } return k; };
  for (const c of comps) if (c.cond){ const a=f2(c.ra), b=f2(c.rb); if (a!==b) u2[a]=b; }
  const gnd = new Map(), extraG = new Set();
  // explicit ground symbols decide the 0 V node of their circuit; more than one in the same circuit are all held at 0 V
  for (const c of comps) if (c.type==='gnd' && !c.off && !c.broken){ const is=f2(c.ra); if (!gnd.has(is)) gnd.set(is,c.ra); else if (gnd.get(is)!==c.ra) extraG.add(c.ra); }
  const grounded = new Set(gnd.keys());
  for (const c of comps) if (c.type==='dc'||c.type==='ac'){ const is=f2(c.ra); if (!gnd.has(is)) gnd.set(is,c.ra); }
  for (const c of comps) for (const r of [c.ra,c.rb]){ const is=f2(r); if (!gnd.has(is)) gnd.set(is,r); }
  const gset = new Set([...gnd.values(), ...extraG]), idx = new Map(); let n=0;
  for (const c of comps) for (const r of [c.ra,c.rb]) if (!idx.has(r)) idx.set(r, gset.has(r) ? -1 : n++);
  const nn=n; if (ideal) pairs.forEach((p,k)=>{ p.ju=nn+k; }); const nt = nn + (ideal ? pairs.length : 0);
  // an island that only open parts touch would float: it takes the level that leaves its open links balanced, as if each were a huge resistance,
  // an ideal voltmeter far less huge than an open switch or a diode that is off (a voltmeter with one lead in the air, or in series with an
  // open switch, reads 0 like a real one). An island with a ground symbol, else one with a source, stays where it is
  const isl = new Map(), nodeIsl = new Map(); let ni=0;
  for (const r of idx.keys()){ const is=f2(r); if (!isl.has(is)) isl.set(is, ni++); nodeIsl.set(r, isl.get(is)); }
  const links = comps.filter(c => !c.cond && !c.short && c.type!=='gnd' && f2(c.ra)!==f2(c.rb))
    .map(c => [c.ra, c.rb, nodeIsl.get(c.ra), nodeIsl.get(c.rb), c.type==='vm' && !c.off && !c.broken ? 1 : 1e-12]);
  let lev = null;
  if (links.length){
    const uc = Array.from({length:ni}, (_,k)=>k), fc = k => { while (uc[k]!==k){ uc[k]=uc[uc[k]]; k=uc[k]; } return k; };
    for (const [,,I,J] of links){ const a=fc(I), b=fc(J); if (a!==b) uc[a]=b; }
    const fixed = new Array(ni).fill(false), hasFix = new Set();
    for (const is of grounded){ const I=isl.get(is); if (I!==undefined){ fixed[I]=true; hasFix.add(fc(I)); } }
    const lead = c => { const I=nodeIsl.get(c.ra); if (I!==undefined && !hasFix.has(fc(I))){ fixed[I]=true; hasFix.add(fc(I)); } };
    for (const c of comps) if (c.type==='dc'||c.type==='ac') lead(c);
    for (const c of comps) lead(c);
    const un = new Array(ni).fill(-1); let m=0;   // unknown level index of each floating island
    for (const [,,I,J] of links) for (const K2 of [I,J]) if (!fixed[K2] && un[K2]<0) un[K2]=m++;
    if (m){ const A=new Float64Array(m*m);
      for (const [,,I,J,w] of links){ const p=un[I], q=un[J]; if (I===J) continue; if (p>=0) A[p*m+p]+=w; if (q>=0) A[q*m+q]+=w; if (p>=0&&q>=0){ A[p*m+q]-=w; A[q*m+p]-=w; } }
      lev = { m, A, un, links, off:new Float64Array(ni) }; }
  }
  // wire groups for per-segment current, one per wire net
  const groups = new Map();
  for (const w of wires){ if (w.broken||w.off){ w.i=0; continue; } const r=net[K(w.ax,w.ay)]; if (!groups.has(r)) groups.set(r,{nodes:new Map(),ws:[]});
    const g=groups.get(r); g.ws.push(w); for (const k of [K(w.ax,w.ay),K(w.bx,w.by)]) if (!g.nodes.has(k)) g.nodes.set(k,g.nodes.size); }
  // short groups: per node, the wire nets its shorts join and which nets each short connects
  const sg = new Map();
  for (const c of comps) if (c.short){ let g=sg.get(c.ra); if (!g) sg.set(c.ra, g={nets:new Map(), cs:[]});
    const ix = k => { const p=net[k]; if (!g.nets.has(p)) g.nets.set(p,g.nets.size); return g.nets.get(p); };
    g.cs.push([c, ix(K(c.ax,c.ay)), ix(K(c.bx,c.by))]); }
  const nl = comps.filter(c => c.type==='led' || (c.type==='diode' && !ideal));   // exponential junctions, solved by Newton-Raphson
  topo = { n:nt, nn, pairs, hasG:comps.some(c => c.type==='gnd'), idx, A:new Float64Array(nt*nt), b:new Float64Array(nt), x:new Float64Array(nt), groups, gset, find:f,
    net, sg, nl, nodeIsl, lev, ids: ideal ? comps.filter(c => c.type==='diode' && !c.off && !c.broken) : [] };
  dirty = false;
}
// level of each floating island (see build): Kirchhoff's law over its open links, each link a conductance of weight w
function levels(){
  const L=topo.lev; if (!L) return;
  const b=new Float64Array(L.m), x=new Float64Array(L.m);
  for (const [ra,rb,I,J,w] of L.links){ if (I===J) continue; const d=XV(rb)-XV(ra), p=L.un[I], q=L.un[J];
    if (p>=0){ b[p]+=w*d; if (q<0) b[p]+=w*L.off[J]; } if (q>=0){ b[q]-=w*d; if (p<0) b[q]+=w*L.off[I]; } }
  solve(L.A.slice(), b, L.m, x);
  L.un.forEach((k,I) => { if (k>=0) L.off[I]=x[k]; });
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

// Norton model of a part that passes current: current from a to b is i = g·v + j, v = V(a) − V(b).
// Open parts and ideal shorts never get here (see build): an open part carries no current, a short's current comes from shortCurrents
function gj(c){
  switch (c.type){
    case 'fuse': return [1/RF, 0];
    case 'res': case 'bulb': return [1/c.R, 0];
    case 'dc': { const Rs=srcR(c); return [1/Rs, c.E/Rs]; }
    case 'ac': { const Rs=srcR(c); return [1/Rs, c.E*Math.sin(2*Math.PI*c.f*t)/Rs]; }
    case 'am': return [1/RAM_REAL, 0];
    case 'vm': return [1/RVM_REAL, 0];
    case 'sw': return [1/RSW, 0];
    case 'cap': { const G=c.C*1e-6/DT; return [G, -G*c.vp]; }
    case 'ind': case 'tp': { const G=DT/c.L; return [G, c.ip]; }   // a transformer coil without a partner is just an inductor
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
const XV = r => { const k=topo.idx.get(r); return k===undefined||k<0 ? 0 : topo.x[k]; };   // potential within its island
const NV = r => { const L=topo.lev, I=topo.nodeIsl.get(r); return XV(r) + (L && I!==undefined ? L.off[I] : 0); };   // potential on the board

const kc = p => Math.min(0.9999, Math.max(0.5, p.k));
// coupled coils: i1 = ip1 + DT(Γ11 v1 + Γ12 v2), i2 = ip2 + DT(Γ12 v1 + Γ22 v2), Γ = inverse inductance matrix, L2 = n²·L1, M = k·n·L1
const gam = p => { const q=1-kc(p)**2, L1=p.L, nr=p.n; return [DT/(L1*q), -DT*kc(p)/(nr*L1*q), DT/(nr*nr*L1*q)]; };
// node potentials for the present topology (Newton-Raphson when LEDs or real diodes are on the board)
function solveNodes(){
  const {n, idx, A, b, x, pairs} = topo;
  if (!n) return;
  const add = (i,j,g) => { if (i>=0 && j>=0) A[i*n+j]+=g; };
  const stampG = (ia,ib,g) => { add(ia,ia,g); add(ib,ib,g); add(ia,ib,-g); add(ib,ia,-g); };
  function stampPair(p){
    const q=p.pt, ia=idx.get(p.ra), ib=idx.get(p.rb), ic=idx.get(q.ra), id=idx.get(q.rb);
    if (ideal){   // ideal transformer: V(c)-V(d) = n(V(a)-V(b)), I1 = -n·I2, one extra unknown I2 at row ju
      const J=p.ju, nr=p.n;
      add(ia,J,-nr); add(ib,J,nr); add(ic,J,1); add(id,J,-1);
      add(J,ic,1); add(J,id,-1); add(J,ia,-nr); add(J,ib,nr);
      add(J,J,-RTS); if (p.ra!==p.rb) stampG(ia,ib,GOPEN); if (q.ra!==q.rb) stampG(ic,id,GOPEN);
      return;
    }
    const [g11,g12,g22]=gam(p), pt=[[ia,ib],[ic,id]], G=[[g11,g12],[g12,g22]], ip=[p.ip,q.ip];
    for (let u=0;u<2;u++){
      const [pu,mu]=pt[u]; if (pu>=0) b[pu]-=ip[u]; if (mu>=0) b[mu]+=ip[u];
      for (let w=0;w<2;w++){ const g=G[u][w], [pw,mw]=pt[w]; add(pu,pw,g); add(pu,mw,-g); add(mu,pw,-g); add(mu,mw,g); }
    }
  }
  for (let it=0; it<60; it++){
    A.fill(0); b.fill(0);
    for (const c of comps){
      if (!c.cond || c.live || c.ra===c.rb) continue;   // a part with both legs on one node adds nothing, and stamping it would only cost precision
      const [g,j]=gj(c), ia=idx.get(c.ra), ib=idx.get(c.rb);
      stampG(ia,ib,g); if (ia>=0) b[ia]-=j; if (ib>=0) b[ib]+=j;
    }
    for (const p of pairs) stampPair(p);
    solve(A,b,n,x);
    if (!topo.nl.length) break;
    let conv=true;
    for (const c of topo.nl){
      const v=XV(c.ra)-XV(c.rb), vn=pnj(v,c.vd,DP[dkey(c)]);
      if (Math.abs(vn-c.vd)>1e-6) conv=false; c.vd=vn;
    }
    if (conv) break;
  }
}
// voltage and current of every part from the node potentials
function currents(){
  const {x, pairs} = topo;
  for (const p of pairs){
    const q=p.pt, v1=XV(p.ra)-XV(p.rb), v2=XV(q.ra)-XV(q.rb);
    if (ideal){ const J=x[p.ju]; p.i=-p.n*J; q.i=J; }
    else { const [g11,g12,g22]=gam(p); p.i=p.ip+g11*v1+g12*v2; q.i=q.ip+g12*v1+g22*v2; }
  }
  levels();
  for (const c of comps){
    c.v = c.cond ? XV(c.ra)-XV(c.rb) : NV(c.ra)-NV(c.rb);
    if (!c.live && !c.short) c.i=0;
    if (c.cond && !c.live){ const [g,j]=gj(c); c.i=g*c.v+j; }
  }
  if (topo.hasG){   // current that flows from each grounded net into earth, so wire currents stay balanced
    const out=new Map(), cnt=new Map();
    for (const c of comps) if (c.type!=='gnd'){ out.set(c.ra,(out.get(c.ra)||0)+c.i); out.set(c.rb,(out.get(c.rb)||0)-c.i); } else cnt.set(c.ra,(cnt.get(c.ra)||0)+1);
    for (const c of comps) if (c.type==='gnd'){ const i=-(out.get(c.ra)||0)/cnt.get(c.ra); c.i = c.off||c.broken||Math.abs(i)<1e-9 ? 0 : i; }   // below 1 nA is only rounding
  }
  if (topo.ids.length) shortCurrents();   // an ideal diode needs its current every step to know when to switch off
}
// ideal diode: conducts (a short) while its current flows from a to b, off (open) while V(a) < V(b). Returns true if any diode switched
function flipDiodes(){
  let flip=false;
  for (const c of topo.ids){ const on = c.don ? c.i > -1e-9 : c.v > 1e-9; if (on!==!!c.don){ c.don=on; flip=true; } }
  if (flip) dirty=true;
  return flip;
}
function step(){
  // ideal diodes change the topology, so solve again until every diode agrees with its own current and voltage
  for (let pass=0; ; pass++){
    if (dirty) build();
    solveNodes(); currents();
    if (!topo.ids.length || pass>=8 || !flipDiodes()) break;
  }
  for (const c of comps){
    const v = c.v;
    if (c.type==='cap') c.vp=v;
    if (c.type==='ind' || c.type==='tp' || c.type==='ts') c.ip=c.i;
    // energy bookkeeping
    if (c.type==='dc'||c.type==='ac'){
      const emf = c.broken ? 0 : (c.type==='dc' ? c.E : c.E*Math.sin(2*Math.PI*c.f*t));
      c.pNow = emf*c.i; energy.sup += emf*c.i*DT; energy.heat += (emf*c.i + v*c.i)*DT; c.en += emf*c.i*DT;
    } else if (c.type==='cap'||c.type==='ind'||c.type==='tp'||c.type==='ts'){ c.en += v*c.i*DT; }
    else { energy.heat += v*c.i*DT; c.en += Math.abs(v*c.i)*DT; }
    // heating
    if (ideal){ c.temp=TA; c.pHeat=0; c.pMax=1e9; continue; }
    const [ph, pmax, tau] = thermal(c), Rth=(TSAFE-TA)/pmax, Cth=tau/Rth;
    c.pHeat = ph; c.pMax = pmax;
    c.temp = Math.min(3000, c.temp + (ph - (c.temp-TA)/Rth)/Cth*DT);
    if (!c.broken && c.temp>=TFAIL && pmax<1e8){ c.broken=true; c.vd=0; c.failMsg=failText(c,ph,pmax); events.push(c); dirty=true; }   // a burnt transformer coil must unpair
  }
  t += DT;
}
function thermal(c){
  switch (c.type){
    case 'dc': case 'ac': return [c.i*c.i*srcR(c), c.Pmax, 1];
    case 'res': case 'bulb': return [Math.abs(c.v*c.i), c.Pmax, 1.5];
    case 'sw': return [c.i*c.i*RSW, c.Pmax, 1];
    case 'am': return [c.i*c.i*RAM_REAL, c.Pmax, 0.5];
    case 'diode': case 'led': return [Math.abs(c.v*c.i), c.Pmax, 0.8];
    case 'cap': return [Math.max(0,Math.abs(c.v)-c.Vmax)*2, 1, 0.5];
    case 'ind': case 'tp': case 'ts': return [c.i*c.i, c.Imax*c.Imax, 2];
    case 'fuse': return [c.i*c.i*RF, c.Imax*c.Imax*RF, 0.25];
  }
  return [0, 1e9, 1];
}
function failText(c, ph, pmax){
  const nm=tName(c.type), at=` (t = ${t.toFixed(2)} s)`, I=fmt(Math.abs(c.i),'A');
  if (c.type==='fuse') return L(`ฟิวส์ขาด กระแส ${I} เกินพิกัด ${fmt(c.Imax,'A')} ช่วยตัดวงจรไว้ทัน`, `Fuse blew: ${I} is over its ${fmt(c.Imax,'A')} rating, it cut the circuit in time`)+at;
  if (c.type==='cap') return L(`${nm}ระเบิด แรงดัน ${fmt(Math.abs(c.v),'V')} เกินพิกัด ${fmt(c.Vmax,'V')}`, `${nm} exploded: ${fmt(Math.abs(c.v),'V')} is over its ${fmt(c.Vmax,'V')} rating`)+at;
  if (c.type==='ind'||c.type==='tp'||c.type==='ts') return L(`${nm}ไหม้ กระแส ${I} เกินพิกัด ${fmt(c.Imax,'A')}`, `${nm} burnt out: ${I} is over its ${fmt(c.Imax,'A')} rating`)+at;
  if (c.type==='dc'||c.type==='ac') return L(`${nm}ระเบิด ความร้อนภายใน ${fmt(ph,'W')} จากกระแส ${I} (ลัดวงจร)`, `${nm} exploded: ${fmt(ph,'W')} of internal heat from ${I} (short circuit)`)+at;
  if (c.type==='bulb') return L(`ไส้หลอดขาด กำลัง ${fmt(ph,'W')} เกินพิกัด ${fmt(pmax,'W')}`, `Filament broke: ${fmt(ph,'W')} is over its ${fmt(pmax,'W')} rating`)+at;
  return L(`${nm}ไหม้ กำลัง ${fmt(ph,'W')} เกินพิกัด ${fmt(pmax,'W')}`, `${nm} burnt out: ${fmt(ph,'W')} is over its ${fmt(pmax,'W')} rating`)+at;
}

// current that must leave each point (keyed by keyOf) through wires or shorts: what the other parts push in
function injections(keyOf, skipShorts){
  const s = new Map();
  for (const c of comps){ if (skipShorts && c.short) continue;
    const ka=keyOf(K(c.ax,c.ay)); s.set(ka,(s.get(ka)||0)-c.i);
    if (c.type!=='gnd'){ const kb=keyOf(K(c.bx,c.by)); s.set(kb,(s.get(kb)||0)+c.i); } }
  return s;
}
// split the injections of one connected network over its unit-conductance edges [p, q]: returns the current along each edge from p to q
function spread(m, edges, inj){
  const n=m-1; if (n<1) return edges.map(()=>0);
  const A=new Float64Array(n*n), b=new Float64Array(n), x=new Float64Array(n);
  for (const [p,q] of edges){ if (p===q) continue; if (p<n) A[p*n+p]+=1; if (q<n) A[q*n+q]+=1; if (p<n&&q<n){ A[p*n+q]-=1; A[q*n+p]-=1; } }
  for (let k=0;k<n;k++) b[k]=inj(k);
  solve(A,b,n,x);
  const phi = k => k<n ? x[k] : 0;
  return edges.map(([p,q]) => phi(p)-phi(q));
}
// current of each ideal short from Kirchhoff's current law over the wire nets it joins. Shorts in parallel share it as if each were the same
// tiny resistance; a short that a wire bypasses gets nothing, and nothing leaks into a branch that a short bypasses
function shortCurrents(){
  if (!topo.sg.size) return;
  const net=topo.net, s=injections(k => net[k], true);
  for (const g of topo.sg.values()){
    const keys=[...g.nets.keys()], cur=spread(g.nets.size, g.cs.map(e => [e[1], e[2]]), k => s.get(keys[k])||0);
    g.cs.forEach((e,k) => { e[0].i=cur[k]; });
  }
}
function wireCurrents(){
  shortCurrents();
  const s = injections(k => k, false);
  for (const g of topo.groups.values()){
    const keys=[...g.nodes.keys()], cur=spread(g.nodes.size, g.ws.map(w => [g.nodes.get(K(w.ax,w.ay)), g.nodes.get(K(w.bx,w.by))]), k => s.get(keys[k])||0);
    g.ws.forEach((w,k) => { w.i=cur[k]; });
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
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(1,c.glow)*0.4; x.fillStyle=ledCol(c,Cc.led); x.beginPath(); x.arc(m,0,r*(1.2+1.0*Math.min(1,c.glow)),0,7); x.fill(); x.restore(); }
      ring(r,Cc.bg);
      if (c.glow>0.02){ x.save(); x.globalAlpha=Math.min(.9,0.2+c.glow); x.fillStyle=ledCol(c,Cc.led); x.beginPath(); x.arc(m,0,r-lw/2,0,7); x.fill(); x.restore(); }
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
    case 'gnd': ln(0,0,.9*uu,0); ln(.9*uu,-.5*uu,.9*uu,.5*uu); ln(1.2*uu,-.32*uu,1.2*uu,.32*uu); ln(1.5*uu,-.14*uu,1.5*uu,.14*uu); break;
    case 'tp': case 'ts': { const dn=c.type==='ts';   // coil bumps away from its partner, iron-core lines on the side facing it, dot on leg a
      ln(0,0,.5*uu,0); ln(1.5*uu,0,L,0); x.beginPath(); x.moveTo(.5*uu,0);
      for (let k=0;k<4;k++) x.arc(.5*uu+(k+.5)*.25*uu,0,.125*uu,Math.PI,0,dn);
      x.stroke(); const cy=(dn?-1:1)*.44*uu; ln(.42*uu,cy,1.58*uu,cy);
      x.beginPath(); x.arc(.22*uu,(dn?.22:-.22)*uu,.07*uu,0,7); x.fill(); break; }
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

// moving dots along a wire or part; Px/Py turn grid coordinates into pixels, uu is one grid cell, k scales the dots
function flowDots(x, el, color, Px, Py, uu, k=1){
  if (Math.abs(el.i)<1e-6) return;
  const ax=Px(el.ax), ay=Py(el.ay), bx=Px(el.bx), by=Py(el.by), len=Math.hypot(bx-ax,by-ay); if (!len) return;
  const sp=0.5*uu, ph=(elMode?-el.phase:el.phase)*uu, off=((ph%sp)+sp)%sp;
  x.save(); x.globalCompositeOperation='lighter'; x.fillStyle=color;
  const r=Math.max(2,uu*0.09)*k, dx=(bx-ax)/len, dy=(by-ay)/len, dir=Math.sign(elMode?-el.i:el.i);
  for (let d=off; d<len; d+=sp){ const q=d/len, px=ax+(bx-ax)*q, py=ay+(by-ay)*q;
    x.globalAlpha=0.18; x.beginPath(); x.arc(px,py,r*2.6,0,7); x.fill();
    x.globalAlpha=0.35; x.beginPath(); x.arc(px-dx*dir*r*1.6,py-dy*dir*r*1.6,r*0.8,0,7); x.fill();
    x.globalAlpha=1; x.beginPath(); x.arc(px,py,r,0,7); x.fill(); }
  x.restore();
}
function dots(el, color){ flowDots(ctx, el, color, P, P, u); }

// subscripts: a single letter, "_", then letters or digits (V_R1, I_total, V_ขั้ว) is written V with R1 small and lowered.
// Part names, formulas and meter names in the explanation pages all use this, so nothing shows a raw underscore
const SUBRE = /(^|[^A-Za-z\u0E00-\u0E7F])([A-Za-z])_([A-Za-z0-9\u0E00-\u0E7F]+(?:_[A-Za-z0-9]+)*)/g;
function richSegs(text){
  const out=[]; let last=0; SUBRE.lastIndex=0; let m;
  while ((m=SUBRE.exec(text))){ out.push({t:text.slice(last, m.index)+m[1]+m[2]}); out.push({t:m[3].replace(/_/g,','), sub:true}); last=m.index+m[0].length; }
  out.push({t:text.slice(last)}); return out.filter(g=>g.t);
}
const MONO='"IBM Plex Mono","IBM Plex Sans Thai", monospace';
const richFont = (g, px) => `500 ${g.sub ? Math.round(px*0.74) : px}px ${MONO}`;
function richWidth(x, segs, px){ let w=0; for (const g of segs){ x.font=richFont(g,px); w+=x.measureText(g.t).width; } return w; }
function richText(x, segs, x0, y, px){ let cx=x0; for (const g of segs){ x.font=richFont(g,px); x.fillText(g.t, cx, y+(g.sub?px*0.26:0)); cx+=x.measureText(g.t).width; } }
// a label box with the text inside, on any canvas of width W and height H
function labelBox(x, text, ax, ay, al, px, W, H){
  const segs=richSegs(text), w=richWidth(x,segs,px)+10, h=Math.max(16,px*1.45);
  const x0 = al==='l' ? ax : al==='r' ? ax-w : ax-w/2;
  const bx=Math.min(Math.max(x0,2),W-w-2), by=Math.min(Math.max(ay-h/2,2),H-h-2);
  x.fillStyle=C.panel; x.strokeStyle=C.line; x.lineWidth=1;
  x.beginPath(); x.roundRect ? x.roundRect(bx,by,w,h,5) : x.rect(bx,by,w,h); x.fill(); x.stroke();
  x.fillStyle=C.ink; x.textAlign='left'; x.textBaseline='middle'; richText(x, segs, bx+5, by+h/2+0.5, px);
}
function pill(text, x, y, al='c'){ labelBox(ctx, text, x, y, al, Math.max(11,Math.round(u*0.4)), side, side); }
// the same for HTML: text must already be escaped
const subHTML = h => h.replace(SUBRE, (m,pre,b,sub) => `${pre}${b}<sub>${sub.replace(/_/g,',')}</sub>`);
const escH = v => String(v).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const labH = c => subHTML(escH(lab(c)));

function labelText(c){
  let v='';
  switch (c.type){
    case 'dc': v=fmt(c.E,'V'); break; case 'ac': v=fmt(c.E,'V')+' '+fmt(c.f,'Hz'); break;
    case 'res': case 'bulb': v=fmt(c.R,'Ω'); break; case 'cap': v=fmt(c.C*1e-6,'F'); break; case 'ind': v=fmt(c.L,'H'); break; case 'tp': v='1:'+(+c.n.toPrecision(3)); break;
    case 'fuse': v=fmt(c.Imax,'A'); break; case 'sw': v=c.on?L('ต่อ','on'):L('ตัด','off'); break;
    case 'vm': v=fmt(c.v,'V'); break; case 'am': v=fmt(c.i,'A'); break;
  }
  return lab(c) + (v?' '+v:'') + (c.broken?L(' ไหม้',' burnt'):'') + (c.off?L(' (พัก)',' (off)'):'') + ((c.type==='tp'||c.type==='ts') && !c.pt ? L(' (ไม่มีคู่)',' (no pair)') : '');
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
  for (const c of comps){ bump(K(c.ax,c.ay)); if (c.type!=='gnd') bump(K(c.bx,c.by)); }

  if (multi.size){ ctx.save(); ctx.strokeStyle=C.accent; ctx.lineCap='round';
    for (const x of multi){ ctx.globalAlpha=x.w?0.3:0.2; ctx.lineWidth=x.w?u*0.42:u*1.0; ctx.beginPath(); ctx.moveTo(P(x.ax),P(x.ay)); ctx.lineTo(P(x.bx),P(x.by)); ctx.stroke(); }
    ctx.restore(); }
  if (drag && drag.mode==='box' && drag.moved){ const x1=P(Math.min(drag.a.x,drag.b.x)), y1=P(Math.min(drag.a.y,drag.b.y)), x2=P(Math.max(drag.a.x,drag.b.x)), y2=P(Math.max(drag.a.y,drag.b.y));
    ctx.save(); ctx.fillStyle='rgba(62,230,192,.08)'; ctx.strokeStyle=C.accent; ctx.lineWidth=1.5; ctx.setLineDash([6,4]); ctx.fillRect(x1,y1,x2-x1,y2-y1); ctx.strokeRect(x1,y1,x2-x1,y2-y1); ctx.restore(); }
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
    ctx.save(); ctx.translate(P(c.ax),P(c.ay)); ctx.rotate(ang);
    ctx.fillStyle=C.bg; ctx.fillRect(u*0.3,-u*0.5,u*1.4,u);
    if (c.off){ ctx.globalAlpha=0.35; } else { ctx.shadowColor='rgba(216,232,225,.45)'; ctx.shadowBlur=glow(u*0.25); }
    drawSymbol(ctx,c,u,Object.assign({},C,{ink:C.silk}),ang); ctx.restore();
  }

  for (const [k,d] of deg){ const x=k%N, y=(k-x)/N; ctx.fillStyle=C.wire; ctx.beginPath(); ctx.arc(P(x),P(y), d>=3?u*0.17:u*0.12, 0, 7); ctx.fill(); ctx.fillStyle=C.hole; ctx.beginPath(); ctx.arc(P(x),P(y), u*0.05, 0, 7); ctx.fill(); }

  const dc = elMode ? C.el : C.copper;
  for (const w of wires) dots(w, dc);
  for (const c of comps) if (c.type!=='vm' && c.type!=='gnd') dots(c, dc);

  for (const c of comps){
    const mx=(P(c.ax)+P(c.bx))/2, my=(P(c.ay)+P(c.by))/2, hz=c.ay===c.by;
    let txt=null;
    if (c.type==='gnd') txt=null;
    else if (showLabels) txt=labelText(c);
    else if (c.type==='vm') txt=fmt(c.v,'V'); else if (c.type==='am') txt=fmt(c.i,'A');
    // labels sit on the default side (above / right) unless a transformer partner is there; then they go to the far side
    let sg=1; if (c.pt){ const dm = hz ? (c.pt.ay+c.pt.by-c.ay-c.by)/2 : (c.pt.ax+c.pt.bx-c.ax-c.bx)/2; if (dm) sg = (hz ? dm>0 : dm<0) ? 1 : -1; }
    if (txt){ if (hz) pill(txt, mx, my-sg*u*0.95); else pill(txt, mx+sg*u*0.62, my, sg>0?'l':'r'); }
    if (showHeat && c.temp>60 && !c.broken){ const tt=Math.round(c.temp)+' °C'; if (hz) pill(tt, mx, my+sg*u*0.95); else pill(tt, mx-sg*u*0.62, my, sg>0?'r':'l'); }
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
    const g=placing.g, kinds=placing.type==='tr' ? ['tp','ts'] : [placing.type], gy=placing.type==='tr' ? Math.min(g.y,N-2) : g.y;
    kinds.forEach((ty,k) => { const gc={type:ty,glow:0,on:true,ax:g.x-1,ay:gy+k,bx:g.x+1,by:gy+k}; clampC(gc);
      ctx.save(); ctx.globalAlpha=0.55; ctx.translate(P(gc.ax),P(gc.ay)); drawSymbol(ctx,gc,u,C,0); ctx.restore(); });
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
SHARDS.tp = SHARDS.ts = SHARDS.ind;
const ARCY = new Set(['dc','ac','cap','ind','sw']);   // parts that throw electric arcs
const FLASHC = { led:'led', bulb:'glow', fuse:'copper', wire:'copper' };
const matCol = (m, R, src) => m==='band' ? BANDS[Math.floor(R()*BANDS.length)] : m==='led' && src ? ledCol(src, C.led) : C[m] || MAT[m];
let marks = [], boardFlash = 0;

function spawn(x, y, kind, src){
  const k = reduce ? 0.35 : lite ? 0.5 : 1, R = Math.random, n = v => Math.max(1, Math.round(v*k));
  const type = src && !src.w ? src.type : 'wire', big = kind==='big', pop = kind==='pop';
  const fc = (type==='led' && src && ledCol(src,null)) || C[FLASHC[type]] || C.glow, p0 = parts.length, f0 = flashes.length;
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
      parts.push({t:'deb',shape,col:matCol(m,R,src),x:x+(R()-.5)*.4,y:y+(R()-.5)*.4,z:.1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
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
for (const type of ORDER.filter(t => t!=='ts').map(t => t==='tp' ? 'tr' : t)){
  const b=document.createElement('button'); b.className='pal'; b.dataset.type=type; b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',palName(type));
  b.innerHTML=`<canvas width="96" height="52"></canvas><span>${palName(type)}</span>`; pal.appendChild(b);
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
    x.setTransform(2,0,0,2,0,0); x.clearRect(0,0,48,26);
    const cc=Object.assign({},C,{bg:C.panel});
    if (b.dataset.type==='tr'){ x.translate(10,6); drawSymbol(x,{type:'tp',glow:0,on:true},14,cc,0); x.translate(0,13); drawSymbol(x,{type:'ts',glow:0,on:true},14,cc,0); return; }
    x.translate(3,13); drawSymbol(x,{type:b.dataset.type,glow:0,on:true},21,cc,0); });
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
  pushUndo();
  if (type==='tr'){   // a transformer is a primary and a secondary coil one row apart, paired by grp
    const y=Math.min(g.y,N-2), used=new Set(comps.filter(c=>c.type==='tp'||c.type==='ts').map(c=>c.grp)); let grp=1; while (used.has(grp)) grp++;
    const p=mk('tp',g.x-1,y,g.x+1,y,{grp}), q=mk('ts',g.x-1,y+1,g.x+1,y+1,{grp}); clampC(p); q.ax=p.ax; q.bx=p.bx;
    comps.push(p,q); dirty=true; select(p); save(); return;
  }
  const c=mk(type,g.x-1,g.y,g.x+1,g.y); clampC(c); comps.push(c); assignNum(c); dirty=true; select(c); save();
}
cv.addEventListener('pointerdown', e => {
  const g=toGrid(e); cv.setPointerCapture(e.pointerId);
  if (pendingPlace){ place(pendingPlace, snap(g)); pendingPlace=null; markPal(); return; }
  if (tool==='idle') return;
  // the select tool (or Shift with the smart tool): a tap opens the popup / adds to the group, a drag draws a box around several things
  if (tool==='select' || (tool==='smart' && e.shiftKey)){ closePop(); drag={mode:'box', a:g, b:g, moved:false, x:e.clientX, y:e.clientY, sel:tool==='select', shift:e.shiftKey}; return; }
  if (tool==='delete'){ deleteAt(g); return; }
  if (tool==='rotate'){ rotateAt(g); return; }
  closePop();
  const c=hitComp(g);
  if (c && multi.has(c)){ drag={mode:'group', c, start:g, o:[...multi].map(x=>[x,x.ax,x.ay,x.bx,x.by]), dx:0, dy:0, moved:false}; return; }
  if (c){ drag={mode:'move',c,start:g,o:[c.ax,c.ay,c.bx,c.by],moved:false}; select(c); return; }
  const nd=nearNode(g);
  if (nd){ drag={mode:'wire',from:nd,to:nd}; return; }
  const w=hitWire(g); select(w||null);
});
cv.addEventListener('pointermove', e => {
  const g=toGrid(e); hover=nearNode(g); lastG=g; updateStatusHint();
  if (!drag) return;
  if (drag.mode==='box'){ drag.b=g; if (Math.hypot(e.clientX-drag.x, e.clientY-drag.y)>8) drag.moved=true; return; }
  if (drag.mode==='group'){ moveGroup(drag, Math.round(g.x-drag.start.x), Math.round(g.y-drag.start.y)); return; }
  if (drag.mode==='move'){
    const dx=Math.round(g.x-drag.start.x), dy=Math.round(g.y-drag.start.y), c=drag.c;
    const [ax,ay,bx,by]=drag.o, n={ax:ax+dx, ay:ay+dy, bx:bx+dx, by:by+dy}; clampC(n);
    if (n.ax!==c.ax||n.ay!==c.ay){ if (!drag.moved){ pushUndo(); drag.moved=true; } Object.assign(c,n); dirty=true; }
  } else if (drag.mode==='wire') drag.to=snap(g);
});
cv.addEventListener('pointerup', () => {
  if (!drag) return; const d=drag; drag=null;
  if (d.mode==='box'){
    if (d.moved){ boxSelect(d.a, d.b); return; }
    if (d.sel && !d.shift){ openSelect(d.a, {clientX:d.x, clientY:d.y}); return; }
    const x=hitComp(d.a) || hitWire(d.a); if (!x) return;   // Shift+click: add to or remove from the group
    const items=new Set(multi.size ? multi : sel ? [sel] : []); items.has(x) ? items.delete(x) : items.add(x); setMulti([...items]); return;
  }
  if (d.mode==='group'){
    if (d.moved){ dedupeWires(); save(); return; }
    if (d.c.type==='sw'){ pushUndo(); d.c.on=!d.c.on; dirty=true; save(); }
    select(d.c); return;
  }
  if (d.mode==='move'){
    if (!d.moved && d.c.type==='sw'){ pushUndo(); d.c.on=!d.c.on; dirty=true; renderInsp(); }
    if (d.moved || d.c.type==='sw') save();
  } else if (d.mode==='wire'){
    const a=d.from, b=d.to;
    if (a.x!==b.x||a.y!==b.y){
      const before=snapState();
      if (addWire(a.x,a.y,b.x,b.y)){ commitUndo(before); dirty=true; save(); }
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
  say(L(`หมุน ${lab(c)} ตามเข็มนาฬิกา 90° แล้ว · Ctrl+Z ย้อนกลับ`, `Rotated ${lab(c)} 90° clockwise · Ctrl+Z to undo`));
}
function deleteSel(){
  if (!sel) return; pushUndo(); if (sel.w) wires=wires.filter(w=>w!==sel); else comps=comps.filter(c=>c!==sel);
  dirty=true; select(null); save();
}
document.addEventListener('keydown', e => {
  if (!$('#confirm').hidden && e.key!=='Escape') return;
  if ($('#confirm').hidden){
    if (!gamePage.hidden){ gameKey(e); return; }
    if (!docPage.hidden){ if (e.key==='Escape') docBack();
      else if (les && (e.key==='ArrowRight'||e.key==='ArrowLeft') && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && !e.altKey){ e.preventDefault(); lessonGo(les.at+(e.key==='ArrowRight'?1:-1), true); }
      return; }
    if (!menuPanel.hidden){ if (e.key==='Escape') closeMenu(); return; }
    if (!$('#codePanel').hidden){ if (e.key==='Escape') closeCode(); return; }
  }
  if (!keysPanel.hidden){ if (e.key==='Escape'||e.key==='?') closeKeys(); return; }
  if (e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  const mod=e.ctrlKey||e.metaKey, k=e.key.length===1 ? e.key.toLowerCase() : e.key;
  if (mod && k==='z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k==='y'){ e.preventDefault(); redo(); return; }
  if (mod && k==='c'){ const cl=clipOf(selItems()); if (cl){ e.preventDefault(); clip=cl; say(L(`คัดลอก ${cl.comps.length+cl.wires.length} รายการแล้ว · Ctrl+V เพื่อวาง`,`Copied ${cl.comps.length+cl.wires.length} item(s) · Ctrl+V to paste`)); } return; }
  if (mod && k==='v'){ e.preventDefault(); if (clip) pasteData(clip, hover); else say(L('ยังไม่ได้คัดลอกอะไร เลือกอุปกรณ์แล้วกด Ctrl+C ก่อน','Nothing copied yet: select something and press Ctrl+C first')); return; }
  if (mod && k==='d'){ e.preventDefault(); duplicateSel(); return; }
  if (mod && k==='a'){ e.preventDefault(); setMulti([...comps, ...wires]); return; }
  if (mod || e.altKey) return;
  if (e.key==='?'){ e.preventDefault(); openKeys(); return; }
  if (['1','2','3','4','5'].includes(e.key)){ setTool(['smart','select','rotate','delete','idle'][+e.key-1]); return; }
  if (e.key===' ' && (e.target===document.body || e.target===cv)){ e.preventDefault(); $('#play').click(); return; }
  if (e.key.startsWith('Arrow')){
    const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0, dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
    if (e.shiftKey){ if (selItems().length){ e.preventDefault(); moveSelBy(dx, dy); } return; }
    if (dy && sel && !sel.w){ e.preventDefault(); nudgeValue(sel, -dy); }
    return;
  }
  if (k==='r'){ multi.size ? rotateGroup() : rotateSel(); }
  else if (e.key==='Delete'||e.key==='Backspace'){ if (multi.size){ e.preventDefault(); deleteGroup(); } else if (sel){ e.preventDefault(); deleteSel(); } }
  else if (e.key==='Escape'){ if (!$('#confirm').hidden){ closeConfirm(); return; } if (popAnchor){ closePop(); return; } pendingPlace=null; markPal(); select(null); }
});

/* ---------- tools ---------- */
let tool='smart', lastG=null, toast=null, popAnchor=null;
const popEdit=new Set(), undoStack=[], redoStack=[];
const TOOL_HINT = {
  idle:'โหมดว่าง: คลิกบนแผงแล้วจะไม่มีอะไรเปลี่ยน ชี้ที่จุดเพื่อดูศักย์ได้',
  smart:'อัจฉริยะ: ลากจากจุดถึงจุดเพื่อต่อสาย · ลากอุปกรณ์เพื่อย้าย · แตะอุปกรณ์เพื่อเลือก · แตะสวิตช์เพื่อเปิดปิด · Shift+ลากเลือกหลายชิ้น · ? คีย์ลัด',
  rotate:'หมุน: คลิกอุปกรณ์เพื่อหมุนตามเข็มนาฬิกา 90° · คลิกซ้ำเพื่อหมุนต่อ · Ctrl+Z ย้อนกลับ',
  select:'เลือก: คลิกที่จุดหรืออุปกรณ์ แล้วเลือกว่าจะปรับค่า พักการทำงาน หรือลบ · ลากเป็นกรอบเพื่อเลือกหลายชิ้น',
  delete:'ลบ: คลิกที่จุดเพื่อลบทุกอย่างที่ต่ออยู่ตรงนั้น · คลิกตัวอุปกรณ์หรือสายเพื่อลบชิ้นเดียว · Ctrl+Z ย้อนกลับ'
};
const TOOL_HINT_EN = {
  idle:'Idle: clicking the board changes nothing. Point at a node to see its potential',
  smart:'Smart: drag from node to node to add a wire · drag a part to move it · tap a part to select it · tap a switch to flip it · Shift+drag selects several · ? shortcuts',
  rotate:'Rotate: click a part to turn it 90° clockwise · click again to keep turning · Ctrl+Z to undo',
  select:'Select: click a node or a part, then choose to edit, disable or delete · drag a box to select several',
  delete:'Delete: click a node to delete everything connected there · click a part or a wire to delete only that · Ctrl+Z to undo'
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
// undo / redo: every change takes a snapshot first (a new change clears the redo list)
const snapState = () => JSON.stringify(serialize());
function commitUndo(s){ if (undoStack[undoStack.length-1]!==s) undoStack.push(s); if (undoStack.length>60) undoStack.shift(); redoStack.length=0; }
function pushUndo(){ commitUndo(snapState()); }
function undo(){
  const st=undoStack.pop(); if (!st){ say(L('ไม่มีอะไรให้ย้อนกลับแล้ว','Nothing left to undo')); return; }
  redoStack.push(snapState()); applyData(JSON.parse(st)); closePop(); say(L('ย้อนกลับแล้ว · Ctrl+Y ทำซ้ำ','Undone · Ctrl+Y to redo'));
}
function redo(){
  const st=redoStack.pop(); if (!st){ say(L('ไม่มีอะไรให้ทำซ้ำ','Nothing to redo')); return; }
  undoStack.push(snapState()); applyData(JSON.parse(st)); closePop(); say(L('ทำซ้ำแล้ว','Redone'));
}
$('#undo').onclick=undo; $('#redo').onclick=redo;

/* several things at once: box select, group move / rotate / delete, copy, paste, duplicate, quick value changes */
const selItems = () => multi.size ? [...multi] : sel ? [sel] : [];
function setMulti(items){
  items=items.filter(Boolean); multi.clear();
  if (items.length===1){ select(items[0]); return; }
  for (const x of items) multi.add(x);
  if (sel!==null){ sel=null; hist={v:[],i:[]}; }
  closePop(); renderInsp(); updateList();
  if (items.length) say(L(`เลือก ${items.length} รายการ · ลากเพื่อย้าย R หมุน Delete ลบ Ctrl+D ทำสำเนา`,`${items.length} items selected · drag to move, R rotates, Delete removes, Ctrl+D duplicates`));
}
function boxSelect(a, b){
  const x0=Math.min(a.x,b.x)-0.3, x1=Math.max(a.x,b.x)+0.3, y0=Math.min(a.y,b.y)-0.3, y1=Math.max(a.y,b.y)+0.3;
  const inside = el => [[el.ax,el.ay],[el.bx,el.by]].every(([x,y])=>x>=x0&&x<=x1&&y>=y0&&y<=y1);
  const items=[...comps.filter(inside), ...wires.filter(inside)];
  if (!items.length){ select(null); return; }
  setMulti(items);
}
const wkey = w => w.ax<w.bx||(w.ax===w.bx&&w.ay<=w.by) ? `${w.ax},${w.ay},${w.bx},${w.by}` : `${w.bx},${w.by},${w.ax},${w.ay}`;
function dedupeWires(){ const seen=new Set(); wires=wires.filter(w=>{ const k=wkey(w); if (seen.has(k)) return false; seen.add(k); return true; }); for (const x of [...multi]) if (x.w && !wires.includes(x)) multi.delete(x); dirty=true; }
// bounds of a list of [item, ax, ay, bx, by] and the allowed shift that keeps it on the board
function groupShift(o, dx, dy){
  let x0=N, y0=N, x1=-1, y1=-1; for (const [,ax,ay,bx,by] of o){ x0=Math.min(x0,ax,bx); x1=Math.max(x1,ax,bx); y0=Math.min(y0,ay,by); y1=Math.max(y1,ay,by); }
  return [Math.max(-x0, Math.min(N-1-x1, dx)), Math.max(-y0, Math.min(N-1-y1, dy))];
}
function moveGroup(d, dx, dy){
  [dx, dy]=groupShift(d.o, dx, dy); if (dx===d.dx && dy===d.dy) return;
  if (!d.moved){ pushUndo(); d.moved=true; }
  d.dx=dx; d.dy=dy; for (const [x,ax,ay,bx,by] of d.o){ x.ax=ax+dx; x.ay=ay+dy; x.bx=bx+dx; x.by=by+dy; }
  dirty=true;
}
let moveAt=0, nudgeAt=0, nudgeC=null;
function moveSelBy(dx, dy){
  const items=selItems(), o=items.map(x=>[x,x.ax,x.ay,x.bx,x.by]); [dx, dy]=groupShift(o, dx, dy); if (!dx && !dy) return;
  const now=performance.now(); if (now-moveAt>1200) pushUndo(); moveAt=now;
  for (const x of items){ x.ax+=dx; x.ay+=dy; x.bx+=dx; x.by+=dy; }
  if (items.some(x=>x.w)) dedupeWires(); dirty=true; save();
}
function rotateGroup(){
  const items=selItems(); if (!items.length) return; if (items.length===1 && !items[0].w){ rotateSel(); return; }
  pushUndo();
  let x0=N, y0=N, x1=-1, y1=-1; for (const x of items){ x0=Math.min(x0,x.ax,x.bx); x1=Math.max(x1,x.ax,x.bx); y0=Math.min(y0,x.ay,x.by); y1=Math.max(y1,x.ay,x.by); }
  const cx=Math.round((x0+x1)/2), cy=Math.round((y0+y1)/2), rot=(x,y)=>[cx-(y-cy), cy+(x-cx)];   // 90° clockwise on screen (y points down)
  for (const x of items){ [x.ax,x.ay]=rot(x.ax,x.ay); [x.bx,x.by]=rot(x.bx,x.by); }
  const [dx,dy]=groupShift(items.map(x=>[x,x.ax,x.ay,x.bx,x.by]), 0, 0);
  for (const x of items){ x.ax+=dx; x.ay+=dy; x.bx+=dx; x.by+=dy; }
  dedupeWires(); dirty=true; save(); renderInsp();
  say(L(`หมุน ${items.length} รายการตามเข็มนาฬิกา 90° แล้ว · Ctrl+Z ย้อนกลับ`,`Rotated ${items.length} items 90° clockwise · Ctrl+Z to undo`));
}
function deleteGroup(){
  const items=new Set(selItems()); if (!items.size) return; pushUndo();
  comps=comps.filter(c=>!items.has(c)); wires=wires.filter(w=>!items.has(w)); multi.clear(); dirty=true; select(null); save();
  say(L(`ลบ ${items.size} รายการแล้ว · Ctrl+Z ย้อนกลับ`,`Deleted ${items.size} items · Ctrl+Z to undo`));
}
function offGroup(){
  const cs=selItems().filter(x=>!x.w); if (!cs.length) return; pushUndo();
  const to=!cs.every(c=>c.off); for (const c of cs) c.off=to; dirty=true; save(); renderInsp();
}
// copy: parts (with their values) and wires, as plain data. Paste: new numbers, no copied names, transformer coils get a free pair number
let clip=null;
function clipOf(items){
  const cs=items.filter(x=>x && !x.w), ws=items.filter(x=>x && x.w); if (!cs.length && !ws.length) return null;
  return { comps: cs.map(c=>{ const o={type:c.type,ax:c.ax,ay:c.ay,bx:c.bx,by:c.by}; for (const k in T[c.type].def) o[k]=c[k]; if (c.off) o.off=1; return o; }),
    wires: ws.map(w=>[w.ax,w.ay,w.bx,w.by,w.off?1:0]) };
}
function pasteData(cl, at){
  const pts=[...cl.comps.flatMap(o=>[[o.ax,o.ay],[o.bx,o.by]]), ...cl.wires.flatMap(a=>[[a[0],a[1]],[a[2],a[3]]])];
  const x0=Math.min(...pts.map(p=>p[0])), x1=Math.max(...pts.map(p=>p[0])), y0=Math.min(...pts.map(p=>p[1])), y1=Math.max(...pts.map(p=>p[1]));
  const mids=new Set(comps.map(c=>K((c.ax+c.bx)/2,(c.ay+c.by)/2)));
  const free=(dx,dy)=> x0+dx>=0 && x1+dx<=N-1 && y0+dy>=0 && y1+dy<=N-1 && cl.comps.every(o=>!mids.has(K((o.ax+o.bx)/2+dx,(o.ay+o.by)/2+dy)));
  let d=null;
  if (at && free(at.x-x0, at.y-y0)) d=[at.x-x0, at.y-y0];
  for (let k=1; !d && k<N; k++) for (const [dx,dy] of [[k,k],[k,0],[0,k],[-k,k],[k,-k],[-k,0],[0,-k],[-k,-k]]) if (free(dx,dy)){ d=[dx,dy]; break; }
  if (!d){ say(L('ไม่มีที่ว่างพอจะวาง ลองย้ายหรือลบบางอย่างก่อน','No free room to paste: move or delete something first')); return null; }
  pushUndo();
  const used=new Set(comps.filter(c=>c.type==='tp'||c.type==='ts').map(c=>c.grp)), grpMap=new Map();
  const newGrp=g=>{ if (!grpMap.has(g)){ let n=1; while (used.has(n)) n++; used.add(n); grpMap.set(g,n); } return grpMap.get(g); };
  const made=[];
  for (const o of cl.comps){ const p={}; for (const k in T[o.type].def) p[k]=o[k]; if (o.type==='tp'||o.type==='ts') p.grp=newGrp(o.grp);
    const c=mk(o.type, o.ax+d[0], o.ay+d[1], o.bx+d[0], o.by+d[1], p); if (o.off) c.off=true; comps.push(c); assignNum(c); made.push(c); }
  const before=new Set(wires); for (const a of cl.wires) addWire(a[0]+d[0], a[1]+d[1], a[2]+d[0], a[3]+d[1], !!a[4]);
  made.push(...wires.filter(w=>!before.has(w)));
  dirty=true; save(); setMulti(made);
  say(L(`วาง ${made.length} รายการแล้ว · Ctrl+Z ย้อนกลับ`,`Pasted ${made.length} item(s) · Ctrl+Z to undo`));
  return made;
}
function duplicateSel(){ const cl=clipOf(selItems()); if (!cl){ say(L('เลือกอุปกรณ์ก่อน แล้วกด Ctrl+D เพื่อทำสำเนา','Select something first, then Ctrl+D duplicates it')); return; } pasteData(cl, null); }
// quick value change: ↑/↓ or the mouse wheel on the selected part steps its main value (1-2-5 steps; ±1 V for a source; the LED colour cycles)
const MAINF = { dc:'E', ac:'E', res:'R', bulb:'R', cap:'C', ind:'L', tp:'n', fuse:'Imax', led:'color' };
function step125(v, dir){
  const list=[]; const e=Math.floor(Math.log10(Math.max(v,1e-12)));
  for (let k=e-2;k<=e+2;k++) for (const m of [1,2,5]) list.push(+(m*Math.pow(10,k)).toPrecision(6));
  return dir>0 ? list.find(x=>x>v*(1+1e-9)) : [...list].reverse().find(x=>x<v*(1-1e-9));
}
function nudgeValue(c, dir){
  const k=MAINF[c.type], f=k && shownFields(c.type).find(x=>x[0]===k);
  if (!f){ say(L(`${lab(c)} ไม่มีค่าให้ปรับในโหมดนี้`,`${lab(c)} has no value to change in this mode`)); return; }
  let v;
  if (k==='color') v=((c.color|0)+dir+6)%6;
  else if (k==='E') v=Math.round((c.E+dir)*10)/10;
  else v=step125(c[k], dir);
  if (v===undefined) return; v=Math.max(f[3], Math.min(f[4], v)); if (v===c[k]) return;
  const now=performance.now(); if (c!==nudgeC || now-nudgeAt>1500) pushUndo(); nudgeC=c; nudgeAt=now;
  c[k]=v; if (k==='color') c.vd=0; save();
  document.querySelectorAll(`[data-cid="${c.id}"][data-k="${k}"]`).forEach(o=>{ o.value=v; o.removeAttribute('aria-invalid'); });
  say(`${lab(c)} · ${fName(c.type,f)} = ${k==='color' ? fOpts(f)[v] : fmt(v, f[2])}`);
}
cv.addEventListener('wheel', e=>{
  if (!sel || sel.w || hitComp(toGrid(e))!==sel) return;
  e.preventDefault(); const now=performance.now(); if (now-(cv._wheelAt||0)<90) return; cv._wheelAt=now;
  nudgeValue(sel, e.deltaY<0 ? 1 : -1);
}, {passive:false});
// the list of shortcuts (?)
const keysPanel=$('#keysPanel');
function keysHTML(){
  const rows=[
    ['1 – 5', L('เลือกเครื่องมือ อัจฉริยะ เลือก หมุน ลบ ว่าง','Pick a tool: smart, select, rotate, delete, idle')],
    [L('ลากบนแผง (เครื่องมือเลือก) / Shift+ลาก','Drag on the board (select tool) / Shift+drag'), L('ตีกรอบเลือกหลายชิ้น','Box-select several things')],
    ['Shift+'+L('คลิก','click'), L('เพิ่มหรือเอาออกจากกลุ่มที่เลือก','Add to or remove from the selection')],
    ['Ctrl+A', L('เลือกทั้งหมด','Select everything')],
    ['Ctrl+C / Ctrl+V', L('คัดลอก / วาง (วางตรงจุดที่ชี้ ถ้าว่าง)','Copy / paste (at the node you point at, if free)')],
    ['Ctrl+D', L('ทำสำเนาสิ่งที่เลือก','Duplicate the selection')],
    ['Ctrl+Z / Ctrl+Y', L('ย้อนกลับ / ทำซ้ำ (Ctrl+Shift+Z ก็ได้)','Undo / redo (Ctrl+Shift+Z works too)')],
    ['R', L('หมุนสิ่งที่เลือก 90° ตามเข็มนาฬิกา','Rotate the selection 90° clockwise')],
    ['Delete', L('ลบสิ่งที่เลือก','Delete the selection')],
    ['↑ / ↓ · '+L('ล้อเมาส์','mouse wheel'), L('ปรับค่าหลักของอุปกรณ์ที่เลือก (R, C, L ทีละขั้น 1-2-5 · แรงเคลื่อนทีละ 1 V · สี LED)','Step the main value of the selected part (R, C, L in 1-2-5 steps · EMF by 1 V · LED colour)')],
    ['Shift+'+L('ลูกศร','arrows'), L('ย้ายสิ่งที่เลือกทีละช่อง','Move the selection one cell')],
    [L('เว้นวรรค','Space'), L('หยุดชั่วคราว / เล่นต่อ','Pause / resume')],
    ['Esc', L('ยกเลิกการเลือก ปิดหน้าต่าง','Clear the selection, close a window')],
    ['?', L('เปิดหน้านี้','Open this list')],
  ];
  return `<div class="krows">${rows.map(([k,d])=>`<div class="krow"><kbd>${esc(k)}</kbd><span>${esc(d)}</span></div>`).join('')}</div>`;
}
function openKeys(){ $('#kBody').innerHTML=keysHTML(); keysPanel.hidden=false; $('#kClose').focus(); }
function closeKeys(){ keysPanel.hidden=true; }
$('#keysBtn').onclick=openKeys; $('#kClose').onclick=closeKeys;
keysPanel.addEventListener('click', e=>{ if (e.target===keysPanel) closeKeys(); });
function deleteAt(g){
  const tg=targetsAt(g); if (!tg.items.length) return;
  pushUndo();
  const cs=new Set(tg.items.filter(i=>i.c).map(i=>i.c)), ws=new Set(tg.items.filter(i=>i.w).map(i=>i.w));
  comps=comps.filter(c=>!cs.has(c)); wires=wires.filter(w=>!ws.has(w));
  if (sel && (cs.has(sel)||ws.has(sel))) select(null);
  dirty=true; save();
  const parts=[]; if (cs.size) parts.push(L(`อุปกรณ์ ${cs.size} ชิ้น`, `${cs.size} part${cs.size>1?'s':''}`)); if (ws.size) parts.push(L(`สายไฟ ${ws.size} ช่วง`, `${ws.size} wire segment${ws.size>1?'s':''}`));
  say(L(`ลบ${parts.join(' และ ')}${tg.node?` ที่จุด (${tg.node.x}, ${tg.node.y})`:''} แล้ว · Ctrl+Z ย้อนกลับ`, `Deleted ${parts.join(' and ')}${tg.node?` at (${tg.node.x}, ${tg.node.y})`:''} · Ctrl+Z to undo`));
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
  let h=`<div class="poph"><b>${nd?L(`จุด (${nd.x}, ${nd.y})`,`Node (${nd.x}, ${nd.y})`):L('สิ่งที่เลือก','Selection')}</b><span>${L(`${items.length} รายการ`,`${items.length} item${items.length>1?'s':''}`)}</span><button data-a="close">${L('ปิด','Close')}</button></div>`;
  for (const it of items){
    if (it.c){ const c=it.c, fs=shownFields(c.type), fn=f=>fName(c.type,f);
      h+=`<div class="pi${c.off?' off':''}" data-id="c${c.id}"><div class="pih"><span class="tag" style="--c:${tagCol(c)}">${labH(c)}</span><span class="cname">${tName(c.type)}${c.off?L(' · พักอยู่',' · disabled'):''}${c.broken?L(' · ไหม้',' · burnt'):''}</span></div>
        <div class="pia">${fs.length?`<button data-a="edit" aria-expanded="${popEdit.has(c.id)}">${L('ปรับค่า','Edit')}</button>`:''}${c.type==='sw'?`<button data-a="sw">${c.on?L('ตัดสวิตช์','Open switch'):L('ต่อสวิตช์','Close switch')}</button>`:''}<button data-a="off">${c.off?L('เปิดใช้งาน','Enable'):L('พักการทำงาน','Disable')}</button><button data-a="dup">${L('ทำสำเนา','Duplicate')}</button><button data-a="del" class="danger">${L('ลบ','Delete')}</button></div>
        ${fs.length && popEdit.has(c.id) ? `<div class="cparams">${fs.map(f=>`<label class="pf" title="${fn(f)}"><span>${f[5]?fn(f):f[0]}</span>${fieldCtl(c,f,`aria-label="${lab(c)} ${fn(f)}"`)}<span>${f[2]}</span></label>`).join('')}</div>` : ''}</div>`;
    } else { const w=it.w;
      h+=`<div class="pi${w.off?' off':''}" data-id="w${w.id}"><div class="pih"><span class="tag" style="--c:var(--wire)">${L('สาย','Wire')}</span><span class="cname">(${w.ax}, ${w.ay}) → (${w.bx}, ${w.by})${w.off?L(' · พักอยู่',' · disabled'):''}${w.broken?L(' · ขาด',' · melted'):''}</span></div>
        <div class="pia"><button data-a="off">${w.off?L('เปิดใช้งาน','Enable'):L('พักการทำงาน','Disable')}</button><button data-a="del" class="danger">${L('ลบ','Delete')}</button></div></div>`;
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
  if (a==='dup'){ closePop(); pasteData(clipOf([el]), null); return; }
  if (a==='sw'){ pushUndo(); el.on=!el.on; dirty=true; save(); }
  else if (a==='off'){ pushUndo(); el.off=!el.off; dirty=true; save(); say(L(`${isC?lab(el):'สายไฟ'} ${el.off?'พักการทำงานแล้ว ยังอยู่บนแผงแต่ไม่ได้ต่อในวงจร':'กลับมาทำงานแล้ว'}`, `${isC?lab(el):'Wire'} ${el.off?'disabled: still on the board but not part of the circuit':'works again'}`)); }
  else if (a==='del'){ pushUndo(); if (isC) comps=comps.filter(x=>x!==el); else wires=wires.filter(x=>x!==el); if (sel===el) select(null); dirty=true; save(); say(L(`ลบ${isC?lab(el):'สายไฟ'}แล้ว · Ctrl+Z ย้อนกลับ`, `Deleted ${isC?lab(el):'the wire'} · Ctrl+Z to undo`)); }
  renderPop(); renderInsp();
});
document.addEventListener('pointerdown', e=>{ if (popAnchor && !e.target.closest('#pop') && e.target!==cv) closePop(); });

/* ---------- inspector ---------- */
const insp=$('#insp');
function select(x){ multi.clear(); if (sel!==x){ sel=x; hist={v:[],i:[]}; } renderInsp(); if (document.getElementById('clist')) updateList(); }
let shownBroken=null;
const stateTag = el => el.broken ? `<span class="state st-dead" id="rSt">${L('ไหม้แล้ว','Burnt')}</span>` : `<span class="state st-ok" id="rSt">${L('ปกติ','OK')}</span>`;
function repair(el){ el.broken=false; el.temp=TA; el.smokeT=0; if (!el.w){ el.vd=0; el.vp=0; el.ip=0; } dirty=true; }
function renderInsp(){
  if (!sel && multi.size){
    const cs=[...multi].filter(x=>!x.w).length, ws=multi.size-cs;
    insp.innerHTML=`<h3>${L(`เลือก ${multi.size} รายการ`,`${multi.size} items selected`)}</h3><p class="desc">${L(`อุปกรณ์ ${cs} ชิ้น · สายไฟ ${ws} ช่วง · ลากชิ้นใดก็ได้ในกลุ่มเพื่อย้ายทั้งกลุ่ม Shift+ลูกศรเลื่อนทีละช่อง`,`${cs} parts · ${ws} wire segments · drag any part of the group to move it all, Shift+arrows move it one cell`)}</p>
      <div class="acts"><button id="gRot">${L('หมุน 90°','Rotate 90°')}</button><button id="gDup">${L('ทำสำเนา','Duplicate')}</button>${cs?`<button id="gOff">${L('พัก / เปิดใช้งาน','Disable / enable')}</button>`:''}<button id="gDel" class="danger">${L('ลบทั้งหมด','Delete all')}</button><button id="gNone">${L('ยกเลิกการเลือก','Clear selection')}</button></div>`;
    $('#gRot').onclick=rotateGroup; $('#gDup').onclick=duplicateSel; $('#gDel').onclick=deleteGroup; $('#gNone').onclick=()=>select(null); if (cs) $('#gOff').onclick=offGroup;
    return;
  }
  if (!sel){
    insp.innerHTML=L(`<h3>วิธีใช้แผง</h3><ol class="howto">
      <li><b>วางอุปกรณ์</b> ลากจากแถบอุปกรณ์มาปล่อยบนแผง หรือแตะอุปกรณ์แล้วแตะจุดบนแผง</li>
      <li><b>ต่อสายไฟ</b> กดที่จุดใดก็ได้ แล้วลากไปปล่อยที่อีกจุด</li>
      <li><b>ย้าย</b> กดค้างที่ตัวอุปกรณ์แล้วลาก</li>
      <li><b>หมุน / ลบ</b> เลือกอุปกรณ์ แล้วกดปุ่มด้านล่าง หรือกด R / Delete</li>
      <li><b>สวิตช์</b> แตะเพื่อเปิดหรือปิด</li>
      <li><b>วัดแรงดันที่จุด</b> ชี้ที่จุดบนแผง ดูค่าใต้แผง (เทียบกับขั้วลบของแหล่งจ่าย)</li>
      <li><b>หลายชิ้น</b> เครื่องมือเลือกแล้วลากเป็นกรอบ หรือ Shift+ลาก จากนั้นย้าย หมุน คัดลอก หรือลบพร้อมกัน</li>
      <li><b>คีย์ลัด</b> กด ? เพื่อดูทั้งหมด เช่น Ctrl+Y ทำซ้ำ, Ctrl+D ทำสำเนา, ↑ ↓ ปรับค่า</li></ol>`, `<h3>How to use the board</h3><ol class="howto">
      <li><b>Place a part</b> drag it from the parts bar onto the board, or tap the part and then tap a node</li>
      <li><b>Add a wire</b> press any node and drag to another node</li>
      <li><b>Move</b> press and hold a part, then drag it</li>
      <li><b>Rotate / delete</b> select a part and use the buttons below, or press R / Delete</li>
      <li><b>Switch</b> tap it to open or close it</li>
      <li><b>Voltage at a node</b> point at a node and read the value under the board (measured from the source's negative terminal)</li>
      <li><b>Several things</b> with the select tool drag a box, or Shift+drag, then move, rotate, copy or delete them together</li>
      <li><b>Shortcuts</b> press ? to see them all, e.g. Ctrl+Y redo, Ctrl+D duplicate, ↑ ↓ change a value</li></ol>`);
    return;
  }
  if (sel.w){
    shownBroken=sel.broken;
    insp.innerHTML=`<h3>${L('สายไฟ','Wire')}${stateTag(sel)}</h3><p class="desc">${L('ในการคำนวณถือว่าไม่มีความต้านทาน ทุกจุดบนสายเดียวกันจึงมีศักย์เท่ากัน แต่ถ้ากระแสสูงมากราวสองร้อยแอมแปร์ สายจะร้อนจนหลอมขาด','In the calculation a wire has no resistance, so every point on one wire is at the same potential. At a very large current, around two hundred amperes, it heats up and melts.')}</p>
      <div class="therm"><span id="rTh" style="width:0"></span></div>
      <div class="reads"><div class="read"><small>${L('กระแสในสาย','Current')}</small><b id="rI">–</b></div><div class="read"><small>${L('อุณหภูมิ','Temperature')}</small><b id="rT">–</b></div></div>
      <div class="acts">${sel.broken?`<button id="bFix" class="danger">${L('ซ่อมสายไฟ','Repair wire')}</button>`:''}<button id="bDel">${L('ลบสายไฟ','Delete wire')}</button></div>`;
    $('#bDel').onclick=deleteSel; if (sel.broken) $('#bFix').onclick=()=>{ repair(sel); renderInsp(); }; return;
  }
  shownBroken=sel.broken;
  let h=`<h3>${labH(sel)} · ${tName(sel.type)}${stateTag(sel)}</h3><p class="desc">${tDesc(sel.type)}</p>`;
  if (sel.type!=='vm') h+=`<div class="therm" title="${L('อุณหภูมิเทียบกับจุดไหม้','Temperature against the burn point')} ${TFAIL} °C"><span id="rTh" style="width:0"></span></div>`;
  for (const f of shownFields(sel.type))
    h+=`<label class="field"><span>${fName(sel.type,f)}</span>${fieldCtl(sel,f,`id="f_${f[0]}"`)}<span class="unit">${f[2]}</span></label>`;
  if (sel.type==='sw') h+=`<div class="acts" style="margin-bottom:8px"><button id="bSw">${sel.on?L('เปิดวงจร (ตัดไฟ)','Open (cut the current)'):L('ปิดวงจร (ต่อไฟ)','Close (let current flow)')}</button></div>`;
  h+=`<div class="reads"><div class="read"><small>${L('แรงดันคร่อม','Voltage')}</small><b id="rV">–</b></div><div class="read"><small>${L('กระแส','Current')}</small><b id="rI">–</b></div><div class="read"><small>${L('กำลัง','Power')}</small><b id="rP">–</b></div>
      <div class="read"><small>${L('อุณหภูมิ','Temperature')}</small><b id="rT">–</b></div><div class="read"><small>${L('ใช้พิกัดไป','Rating used')}</small><b id="rU">–</b></div><div class="read"><small>${sel.type==='dc'||sel.type==='ac'?L('พลังงานที่จ่าย','Energy supplied'):sel.type==='cap'||sel.type==='ind'?L('พลังงานสะสม','Energy stored'):L('พลังงานที่ใช้','Energy used')}</small><b id="rE">–</b></div></div>
      <div class="acts">${sel.broken?`<button id="bFix" class="danger">${L('ซ่อมอุปกรณ์','Repair')}</button>`:''}<button id="bOff">${sel.off?L('เปิดใช้งาน','Enable'):L('พักการทำงาน','Disable')}</button><button id="bRot">${L('หมุน 90°','Rotate 90°')}</button><button id="bDup">${L('ทำสำเนา','Duplicate')}</button><button id="bDel">${L('ลบอุปกรณ์','Delete')}</button></div>`;
  insp.innerHTML=h;
  if (sel.type==='sw') $('#bSw').onclick=()=>{ pushUndo(); sel.on=!sel.on; dirty=true; save(); renderInsp(); };
  $('#bRot').onclick=rotateSel; $('#bDel').onclick=deleteSel; $('#bDup').onclick=duplicateSel;
  $('#bOff').onclick=()=>{ pushUndo(); sel.off=!sel.off; dirty=true; save(); renderInsp(); renderPop(); };
  if (sel.broken) $('#bFix').onclick=()=>{ repair(sel); renderInsp(); };
}
function updateReads(){
  if (!sel) return;
  if (sel.broken!==shownBroken){ renderInsp(); return; }
  const rT=$('#rT'); if (rT) rT.textContent=Math.round(sel.temp)+' °C';
  const rTh=$('#rTh'); if (rTh) rTh.style.width=(heatF(sel.temp)*100).toFixed(1)+'%';
  const st=$('#rSt'); if (st && !sel.broken){ const hot=sel.temp>TSAFE; st.className='state '+(hot?'st-hot':'st-ok'); st.textContent=hot?L('ร้อนเกินปกติ','Too hot'):L('ปกติ','OK'); }
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
  if (hover && topo){ const r=topo.find(K(hover.x,hover.y)), k=topo.idx.get(r); s2+=L(` · φ ที่จุด (${hover.x}, ${hover.y}) = `,` · φ at (${hover.x}, ${hover.y}) = `)+(k===undefined?L('ยังไม่ได้ต่อ','not connected'):fmt(NV(r),'V')); }
  else s2+=L(' · ชี้จุดบนแผงเพื่อดูศักย์ φ',' · point at a node to see its potential φ');
  $('#vSub').textContent=s2;
}
let listSig='';
const listSignature = () => lang + (ideal?'I':'R') + comps.map(c=>`${c.id}.${c.num}.${c.broken?1:0}.${c.off?1:0}.${c.type==='sw'?(c.on?1:0):''}${c.type==='led'?'.'+(c.color|0):''}`).join('|');
function renderList(){
  listSig=listSignature();
  const box=$('#clist'); $('#vTitle').textContent=L(`อุปกรณ์บนแผง · ${comps.length} ชิ้น`,`Parts on the board · ${comps.length}`);
  if (!comps.length){ box.innerHTML=`<div class="empty">${L('ยังไม่มีอุปกรณ์บนแผง ลากจากแถบอุปกรณ์มาวาง แล้วค่าของแต่ละตัวจะขึ้นที่นี่','No parts on the board yet. Drag one from the parts bar and its readings show up here.')}</div>`; return; }
  const sorted=[...comps].sort((a,b)=>ORDER.indexOf(a.type)-ORDER.indexOf(b.type) || a.num-b.num);
  box.innerHTML=sorted.map(c=>{ const fn=f=>fName(c.type,f);
    const ps=shownFields(c.type).map(f=>`<label class="pf" title="${fn(f)}"><span>${f[5]?fn(f):f[0]}</span>${fieldCtl(c,f,`aria-label="${lab(c)} ${fn(f)}"`)}<span>${f[2]}</span></label>`).join('');
    const sw=c.type==='sw'?`<button data-act="sw">${c.on?L('ต่ออยู่ · กดเพื่อตัด','Closed · tap to open'):L('ตัดอยู่ · กดเพื่อต่อ','Open · tap to close')}</button>`:'';
    const offb=c.off?`<span class="state st-hot">${L('พักอยู่','Disabled')}</span><button data-act="off">${L('เปิดใช้งาน','Enable')}</button>`:'';
    const fix=c.broken?`<span class="state st-dead">${L('ไหม้แล้ว','Burnt')}</span><button data-act="fix" class="danger">${L('ซ่อม','Repair')}</button>`:'';
    const lv=[['V','v'],['I','i'],['P','p'],['T','t']].map(([sy,k])=>`<span class="lv">${sy}<b data-l="${k}">–</b></span>`).join('');
    return `<div class="crow${c===sel?' on':''}${c.off?' off':''}" data-cid="${c.id}"><div class="chead"><span class="tag" style="--c:${tagCol(c)}">${labH(c)}</span><span class="cname">${tName(c.type)}</span>${sw}${offb}${fix}</div>${ps?`<div class="cparams">${ps}</div>`:''}<div class="clive">${lv}</div></div>`; }).join('');
  updateList();
}
function updateList(){
  if (listSignature()!==listSig){ renderList(); return; }
  for (const row of $('#clist').querySelectorAll('.crow')){
    const c=comps.find(x=>x.id==row.dataset.cid); if (!c) continue;
    row.classList.toggle('on', c===sel || multi.has(c));
    const set=(k,v)=>{ const b=row.querySelector(`[data-l="${k}"]`); if (b && b.textContent!==v) b.textContent=v; };
    set('v', c.type==='am'?'–':fmt(c.v,'V')); set('i', c.type==='vm'?'–':fmt(c.i,'A'));
    set('p', c.type==='vm'||c.type==='am'?'–':fmt(Math.abs(c.v*c.i),'W')); set('t', c.type==='vm'?'–':Math.round(c.temp)+' °C');
  }
}
function updateStatusHint(){
  status.textContent = pendingPlace ? L(`แตะจุดบนแผงเพื่อวาง${palName(pendingPlace)} · แตะ${palName(pendingPlace)}อีกครั้งหรือกด Esc เพื่อยกเลิก`, `Tap a node to place the ${palName(pendingPlace).toLowerCase()} · tap it again or press Esc to cancel`) : (toast && performance.now()<toast.until ? toast.text : L(TOOL_HINT[tool], TOOL_HINT_EN[tool]));
  updateVars();
}
function updateEnergy(){
  let sto=0, pn=0;
  for (const c of comps){ if (c.type==='cap') sto+=0.5*c.C*1e-6*c.v*c.v; if (c.type==='ind') sto+=0.5*c.L*c.i*c.i;
    if (c.type==='tp'){ if (c.live && !ideal){ const q=c.pt, kk=Math.min(0.9999,Math.max(0.5,c.k)); sto+=0.5*c.L*(c.i*c.i + 2*kk*c.n*c.i*q.i + c.n*c.n*q.i*q.i); } else if (!c.live) sto+=0.5*c.L*c.i*c.i; }
    if (c.pNow && (c.type==='dc'||c.type==='ac')) pn+=c.pNow; }
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
  $('#sV').textContent = sel && !sel.w ? L('สูงสุด ±','max ±')+fmt(mv,'V') : '–';
  $('#sI').textContent = sel ? L('สูงสุด ±','max ±')+fmt(mi,'A') : '–';
}

/* ---------- controls ---------- */
$('#preset').onchange=e=>{ const v=e.target.value; e.target.value=''; if (!v) return;
  const name=e.target.querySelector(`option[value="${v}"]`).textContent;
  if (comps.length||wires.length) askConfirm(L(`เปิดวงจรตัวอย่าง "${name}" แทนวงจรที่อยู่บนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`, `Open the example "${name}" in place of the circuit on the board? The current circuit is lost unless you saved it.`), L('เปิดตัวอย่าง','Open example'), ()=>{ pushUndo(); loadPreset(v,true); });
  else loadPreset(v,true); };
// texts of the toggle buttons in the control bar, in the page language
function refreshButtons(){
  $('#play').textContent=running?L('หยุดชั่วคราว','Pause'):L('เล่นต่อ','Resume');
  $('#heat').textContent=L('ความร้อน: ','Heat: ')+(showHeat?L('แสดง','shown'):L('ซ่อน','hidden'));
  $('#lbl').textContent=L('ป้ายบนวงจร: ','Labels: ')+(showLabels?L('แสดง','shown'):L('ซ่อน','hidden'));
  $('#ideal').textContent=L('วงจรอุดมคติ: ','Ideal circuit: ')+(ideal?L('เปิด','on'):L('ปิด','off'));
}
$('#play').onclick=()=>{ running=!running; refreshButtons(); };
$('#reset').onclick=()=>{ t=0; for (const c of comps){ c.vp=0; c.ip=0; c.vd=0; c.en=0; if (!c.broken) c.temp=TA; } for (const w of wires) if (!w.broken) w.temp=TA; hist={v:[],i:[]}; energy={sup:0,heat:0}; };
$('#clear').onclick=()=>{ if (!comps.length && !wires.length) return;
  askConfirm(L(`ล้างแผงทั้งหมดใช่ไหม อุปกรณ์ ${comps.length} ชิ้นและสายไฟ ${wires.length} เส้นจะหายไป`, `Clear the whole board? ${comps.length} parts and ${wires.length} wire segments will be removed.`), L('ล้างแผง','Clear board'), ()=>{ pushUndo(); comps=[]; wires=[]; resetSim(); dirty=true; select(null); setCircuit(L('วงจรใหม่','New circuit'), true); save(); }); };
$('#clearW').onclick=()=>{ if (!wires.length) return;
  askConfirm(L(`ล้างสายไฟทั้งหมด ${wires.length} เส้นใช่ไหม อุปกรณ์จะยังอยู่ที่เดิม`, `Remove all ${wires.length} wire segments? The parts stay where they are.`), L('ล้างสายไฟ','Clear wires'), ()=>{ pushUndo(); wires=[]; dirty=true; if (sel && sel.w) select(null); save(); }); };
$('#lbl').onclick=e=>{ showLabels=!showLabels; e.target.setAttribute('aria-pressed',String(showLabels)); refreshButtons(); };

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
  if (act){ const a=act.dataset.act; if (a==='sw'){ pushUndo(); c.on=!c.on; dirty=true; save(); } else if (a==='off'){ pushUndo(); c.off=!c.off; dirty=true; save(); renderPop(); } else repair(c); select(c); updateList(); return; }
  if (sel!==c) select(c);
});
let editSnap=null;
document.addEventListener('focusin', e=>{ if (e.target.dataset && e.target.dataset.cid) editSnap=snapState(); });
document.addEventListener('input', e=>{
  const el=e.target; if (!el.dataset || !el.dataset.cid) return;
  if (editSnap){ commitUndo(editSnap); editSnap=null; }
  const c=comps.find(x=>x.id==el.dataset.cid); if (!c) return;
  const f=T[c.type].fields.find(x=>x[0]===el.dataset.k); if (!f) return;
  const v=parseFloat(el.value);
  if (isFinite(v) && v>=f[3] && v<=f[4]){ c[f[0]]= f[0]==='grp' ? Math.round(v) : v; if (f[0]==='grp') dirty=true; el.removeAttribute('aria-invalid'); save();
    if (f[0]==='color'){ c.vd=0; }
    document.querySelectorAll(`[data-cid="${c.id}"][data-k="${f[0]}"]`).forEach(o=>{ if (o!==el) o.value=el.value; }); }
  else el.setAttribute('aria-invalid','true');
});

/* save panel */
const SKEY='circuit-lab-saves';
function getSaves(){ try { const a=JSON.parse(localStorage.getItem(SKEY)||'[]'); return Array.isArray(a)?a:[]; } catch(e){ return []; } }
function putSaves(a){ try { localStorage.setItem(SKEY, JSON.stringify(a)); return true; } catch(e){ return false; } }
const sMsg=t2=>{ $('#sMsg').textContent=t2; };
function renderSaves(){
  const a=getSaves(), ul=$('#sList');
  ul.innerHTML = a.length ? '' : `<li><span><small>${L('ยังไม่มีวงจรที่บันทึกไว้','No saved circuits yet')}</small></span></li>`;
  a.forEach((it,ix)=>{ const li=document.createElement('li');
    const sp=document.createElement('span'); sp.textContent=it.name;
    const sm=document.createElement('small'); sm.textContent=L(`อุปกรณ์ ${it.data.comps.length} ชิ้น · สายไฟ ${it.data.wires.length} เส้น · `,`${it.data.comps.length} parts · ${it.data.wires.length} wire segments · `)+new Date(it.time).toLocaleString(L('th-TH','en-GB'),{dateStyle:'medium',timeStyle:'short'}); sp.appendChild(sm);
    const bo=document.createElement('button'); bo.textContent=L('เปิด','Open');
    bo.onclick=()=>{ const go=()=>{ pushUndo(); applyData(it.data); setCircuit(it.name,true); save(); sMsg(L(`เปิด "${it.name}" แล้ว`,`Opened "${it.name}"`)); };
      if (comps.length||wires.length) askConfirm(L(`เปิด "${it.name}" แทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`,`Open "${it.name}" in place of the circuit on the board? The current circuit is lost unless you saved it.`), L('เปิดวงจร','Open circuit'), go); else go(); };
    const bd=document.createElement('button'); bd.textContent=L('ลบ','Delete');
    bd.onclick=()=>askConfirm(L(`ลบวงจรที่บันทึกชื่อ "${it.name}" ใช่ไหม`,`Delete the saved circuit "${it.name}"?`), L('ลบ','Delete'), ()=>{ const b=getSaves(); b.splice(ix,1); putSaves(b); renderSaves(); sMsg(L('ลบแล้ว','Deleted')); });
    li.append(sp,bo,bd); ul.appendChild(li); });
}
$('#saveBtn').onclick=e=>{ const p=$('#savePanel'); p.hidden=!p.hidden; e.target.setAttribute('aria-expanded',String(!p.hidden)); if (!p.hidden){ renderSaves(); sMsg(''); $('#sName').value=circuitName; $('#sName').focus(); } };
$('#sClose').onclick=()=>{ $('#savePanel').hidden=true; $('#saveBtn').setAttribute('aria-expanded','false'); };
// save the circuit on the board under a name (asks before overwriting one with the same name); say() shows the result, done() runs after saving
function saveAs(raw, say, done){
  const name=String(raw||'').trim();
  if (!name){ say(L('ใส่ชื่อวงจรก่อนบันทึก','Type a name before saving')); return false; }
  if (!comps.length && !wires.length){ say(L('แผงยังว่างอยู่ ยังไม่มีอะไรให้บันทึก','The board is empty, there is nothing to save')); return false; }
  const doSave=()=>{ setCircuit(name); save(); const a=getSaves().filter(x=>x.name!==name); a.unshift({name,time:Date.now(),data:serialize()});
    const ok=putSaves(a); if (!$('#savePanel').hidden) renderSaves(); if (done) done();
    say(ok ? L(`บันทึก "${name}" แล้ว`,`Saved "${name}"`) : L('บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล ลองใช้โค้ดวงจรแทน','Could not save: this browser does not allow storage. Use the circuit code instead')); };
  if (getSaves().some(x=>x.name===name)) askConfirm(L(`มีวงจรชื่อ "${name}" อยู่แล้ว บันทึกทับใช่ไหม`,`A circuit named "${name}" already exists. Overwrite it?`), L('บันทึกทับ','Overwrite'), doSave); else doSave();
  return true;
}
$('#sSave').onclick=()=>{ if (!saveAs($('#sName').value, sMsg) && !$('#sName').value.trim()) $('#sName').focus(); };
/* ---------- circuit code (text netlist) ---------- */
const CODE_T = { DC:'dc', AC:'ac', R:'res', B:'bulb', S:'sw', F:'fuse', C:'cap', L:'ind', TP:'tp', TS:'ts', GND:'gnd', D:'diode', LED:'led', VM:'vm', AM:'am' };
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
      errs.push(L(`บรรทัด ${n}: อ่าน "${t2}" ไม่ออก จุดต้องเขียนแบบ x,y และค่าต้องเขียนแบบ ชื่อ=ตัวเลข`, `Line ${n}: cannot read "${t2}". Write points as x,y and values as name=number`));
    }
    const out=pts.find(([x,y])=>x<0||x>=N||y<0||y>=N);
    if (out){ errs.push(L(`บรรทัด ${n}: จุด (${out[0]},${out[1]}) อยู่นอกแผง ใช้ได้แค่ 0–19`, `Line ${n}: point (${out[0]},${out[1]}) is off the board, use 0–19 only`)); return; }
    if (head==='W'){
      if (pts.length<2){ errs.push(L(`บรรทัด ${n}: สายไฟต้องมีอย่างน้อย 2 จุด`, `Line ${n}: a wire needs at least 2 points`)); return; }
      for (let k=0;k<pts.length-1;k++){ if (pts[k][0]===pts[k+1][0] && pts[k][1]===pts[k+1][1]) continue; ws.push([...pts[k],...pts[k+1], ...(/^(1|true|on|yes)$/i.test(kv.off||'')?[1]:[])]); }
      return;
    }
    const type=CODE_T[head];
    if (!type){ errs.push(L(`บรรทัด ${n}: ไม่รู้จักอุปกรณ์ "${tk[0]}" ใช้ได้: `, `Line ${n}: unknown part "${tk[0]}". Use: `)+`${Object.keys(CODE_T).join(', ')}, W`); return; }
    if (pts.length!==2){ errs.push(L(`บรรทัด ${n}: ${head} ต้องมี 2 จุดพอดี (ขา a และขา b)`, `Line ${n}: ${head} needs exactly 2 points (leg a and leg b)`)); return; }
    const [[ax,ay],[bx,by]]=pts;
    if (!((ax===bx && Math.abs(ay-by)===2) || (ay===by && Math.abs(ax-bx)===2))){ errs.push(L(`บรรทัด ${n}: ขา a และ b ของ ${head} ต้องห่างกัน 2 ช่องพอดี ในแนวนอนหรือแนวตั้ง`, `Line ${n}: legs a and b of ${head} must be exactly 2 cells apart, horizontally or vertically`)); return; }
    const o={type,ax,ay,bx,by};
    for (const k in kv){
      if (k==='name'){ o.name=kv[k].slice(0,12); continue; }
      if (k==='off'){ o.off=/^(1|true|on|yes)$/i.test(kv[k]); continue; }
      if (k==='on' && type==='sw'){ o.on=/^(1|on|true)$/i.test(kv[k]); continue; }
      const f=T[type].fields.find(x=>x[0]===k);
      if (!f){ errs.push(L(`บรรทัด ${n}: ${head} ไม่มีค่า "${k}" ใช้ได้: `, `Line ${n}: ${head} has no value "${k}". Use: `)+T[type].fields.map(x=>x[0]).concat(type==='sw'?['on']:[], ['name','off']).join(', ')); continue; }
      const ci = f[5] ? LEDC.findIndex(o=>o.key===kv[k].toLowerCase()) : -1;
      const v = ci>=0 ? ci : Number(kv[k]);
      if (f[5] && (!isFinite(v) || v<f[3] || v>f[4])){ errs.push(L(`บรรทัด ${n}: ${k}=${kv[k]} ใช้ได้: `, `Line ${n}: ${k}=${kv[k]}, use one of: `)+LEDC.map(o=>o.key).join(', ')); continue; }
      if (!isFinite(v) || v<f[3] || v>f[4]){ errs.push(L(`บรรทัด ${n}: ${k}=${kv[k]} ต้องเป็นตัวเลขระหว่าง ${f[3]} ถึง ${f[4]} (${f[2]})`, `Line ${n}: ${k}=${kv[k]} must be a number from ${f[3]} to ${f[4]} (${f[2]})`)); continue; }
      o[k]= k==='grp' ? Math.round(v) : v;
    }
    cs.push(o);
  });
  if (!errs.length && !cs.length && !ws.length) errs.push(L('ยังไม่มีอุปกรณ์หรือสายไฟในโค้ด','The code has no parts or wires yet'));
  return { errs, data:{ comps:cs, wires:ws, ideal:idealOpt, title } };
}
const num6 = v => String(+Number(v).toPrecision(6));
function toCode(){
  const out=[`CIRCUIT v1 ideal=${ideal?1:0}`, `TITLE ${circuitName}`, L('# แผงต่อวงจรไฟฟ้า · พิกัด 0–19 · x ไปขวา y ลงล่าง · ideal=1 คือวงจรอุดมคติ', '# Circuit Simulation · points 0–19 · x to the right, y downward · ideal=1 is an ideal circuit')];
  const sorted=[...comps].sort((a,b)=>ORDER.indexOf(a.type)-ORDER.indexOf(b.type) || (a.num||0)-(b.num||0));
  for (const c of sorted){
    const f=T[c.type].fields, d=T[c.type].def, parts=[TYPE_CODE[c.type].padEnd(3), `${c.ax},${c.ay}`, `${c.bx},${c.by}`];
    f.forEach(([k,,,,,opts],ix)=>{ const rating=/max$/.test(k); if ((ix===0 && !rating) || c[k]!==d[k]) parts.push(`${k}=${opts ? LEDC[c[k]|0].key : num6(c[k])}`); });
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
const SAMPLE_CODE = `CIRCUIT v1 ideal=1
TITLE หลอดไฟสองดวงต่อขนาน
# ถ่าน 12 V กับหลอด 24 Ω สองดวงต่อขนาน: หลอดละ 0.5 A, แอมมิเตอร์ I อ่าน 1 A, โวลต์มิเตอร์ V_B อ่าน 12 V
DC  2,10 2,8   E=12
AM  4,3 6,3    name=I
B   9,8 9,10   R=24 name=B1
B   13,8 13,10 R=24 name=B2
VM  17,8 17,10 name=V_B
W   2,8 2,3 4,3            # ขั้วบวกไปแอมมิเตอร์
W   6,3 17,3 17,8          # รางบน
W   9,3 9,8
W   13,3 13,8
W   2,10 2,15 17,15 17,10  # รางล่าง
W   9,10 9,15
W   13,10 13,15`;
const SAMPLE_CODE_EN = `CIRCUIT v1 ideal=1
TITLE Two bulbs in parallel
# A 12 V battery with two 24 Ω bulbs in parallel: 0.5 A each, ammeter I reads 1 A, voltmeter V_B reads 12 V
DC  2,10 2,8   E=12
AM  4,3 6,3    name=I
B   9,8 9,10   R=24 name=B1
B   13,8 13,10 R=24 name=B2
VM  17,8 17,10 name=V_B
W   2,8 2,3 4,3            # positive terminal to the ammeter
W   6,3 17,3 17,8          # top rail
W   9,3 9,8
W   13,3 13,8
W   2,10 2,15 17,15 17,10  # bottom rail
W   9,10 9,15
W   13,10 13,15`;
const cMsg=t2=>{ $('#cMsg').textContent=t2; };
function showErrs(list){ const ul=$('#cErr'); ul.innerHTML=''; for (const e of list.slice(0,12)){ const li=document.createElement('li'); li.textContent=e; ul.appendChild(li); }
  if (list.length>12){ const li=document.createElement('li'); li.textContent=L(`และอีก ${list.length-12} รายการ`,`and ${list.length-12} more`); ul.appendChild(li); } }
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
TP  transformer primary coil: grp pair number [1], L primary henry [100], n turns ratio N2/N1 [2], k coupling [0.99], Imax A [2]
TS  transformer secondary coil: grp [1], Imax A [2]. A TP and a TS with the same grp form one transformer; n, L, k are set on the TP only.
    Dots are at leg a of both coils: V(c)-V(d) follows n*(V(a)-V(b)) in phase. Works with AC only (a DC source makes the current ramp up).
    With ideal=1 it is an ideal transformer (V2 = n*V1, I1 = -n*I2, L and k ignored); with ideal=0 it is two coupled coils.
GND ground symbol: leg a connects to the net that must be 0 V, leg b is only part of the drawing and must stay unconnected. Optional; without it the board picks a reference itself.
D   diode: conducts from a (anode) to b (cathode), Pmax [1]
LED conducts from a to b, Pmax [0.1], color=red|orange|yellow|green|blue|white [red]. The colour sets the drop: red/orange about 2 V, yellow 2.1 V, green 2.2 V, blue 3 V, white 3.1 V
VM  voltmeter, reads V(a)-V(b), connect in PARALLEL
AM  ammeter, reads current from a to b, connect in SERIES, Pmax [2]
r, k, Pmax, Imax and Vmax only matter with ideal=0; set them well above the expected values unless the problem wants a part to fail.

WIRE RULES (most important)
1. A wire connects to EVERY grid point it passes through, not only its ends.
2. Wires that cross or overlap on a grid point are always connected. Route around if they must not connect.
3. A wire passing a component leg connects to that leg.
4. Never run a wire through a component's middle point, and never wire a component's a leg straight to its b leg (that shorts it).
5. Use only horizontal and vertical wire segments. Parts must not overlap.
6. Transformer: put TP and TS in parallel rows, TP above (e.g. TP 7,5 9,5 and TS 7,6 9,6; adjacent rows draw the standard symbol). Their legs are neighbours, so never run a wire through both leg a points (7,5 and 7,6) or both leg b points: send the primary wires up and the secondary wires down.

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
If the problem needs something the board lacks (transistor, op-amp, current source, variable resistor), say so and use the closest substitute.`;
$('#cPrompt').value=AI_PROMPT;
const codePanel=$('#codePanel');
function openCode(){ codePanel.hidden=false; $('#codeBtn').setAttribute('aria-expanded','true'); cMsg(''); showErrs([]); if (!matchMedia('(pointer: coarse)').matches) $('#cCode').focus(); }
function closeCode(){ codePanel.hidden=true; $('#codeBtn').setAttribute('aria-expanded','false'); }
$('#codeBtn').onclick=()=>{ codePanel.hidden ? openCode() : closeCode(); };
$('#cClose').onclick=closeCode;
codePanel.addEventListener('click', e=>{ if (e.target===codePanel) closeCode(); });
$('#cPromptCopy').onclick=()=>{ const b=$('#cPromptCopy'), ta=$('#cPrompt');
  const done=()=>{ b.classList.add('done'); b.querySelector('span').textContent=L('คัดลอกแล้ว','Copied'); setTimeout(()=>{ b.classList.remove('done'); b.querySelector('span').textContent=L('คัดลอก','Copy'); },1800); };
  const fallback=()=>{ ta.focus(); ta.select(); cMsg(L('เลือกพร็อมต์ไว้ให้แล้ว กดคัดลอกได้เลย','The prompt is selected, copy it now')); };
  try { navigator.clipboard.writeText(AI_PROMPT).then(done, fallback); } catch(e){ fallback(); } };
$('#cExport').onclick=()=>{ $('#cCode').value=toCode(); showErrs([]); cMsg(L(`ดึงโค้ดแล้ว อุปกรณ์ ${comps.length} ชิ้น`,`Code taken from the board: ${comps.length} parts`)); };
$('#cSample').onclick=()=>{ $('#cCode').value=L(SAMPLE_CODE,SAMPLE_CODE_EN); showErrs([]); cMsg(L('ใส่โค้ดตัวอย่างแล้ว กด "นำเข้าวงจร" เพื่อสร้าง','Example code added. Press "Import circuit" to build it')); };
$('#cCopy').onclick=()=>{ const ta=$('#cCode'); if (!ta.value.trim()) ta.value=toCode();
  const fallback=()=>{ ta.focus(); ta.select(); cMsg(L('เลือกโค้ดไว้ให้แล้ว กดคัดลอกได้เลย','The code is selected, copy it now')); };
  try { navigator.clipboard.writeText(ta.value).then(()=>cMsg(L('คัดลอกโค้ดแล้ว','Code copied')), fallback); } catch(e){ fallback(); } };
$('#cCode').addEventListener('input', ()=>{ showErrs([]); cMsg(''); });
$('#cImport').onclick=()=>{
  const txt=$('#cCode').value.trim(); if (!txt){ cMsg(L('วางโค้ดวงจรก่อน แล้วค่อยกดนำเข้า','Paste circuit code first, then import')); return; }
  let res;
  if (txt[0]==='{'){ try { const d=JSON.parse(txt); res = validData(d) ? {errs:[],data:d} : {errs:[L('โค้ด JSON นี้ไม่ใช่วงจรจากแผงนี้','This JSON is not a circuit from this board')]}; } catch(e){ res={errs:[L('โค้ด JSON ไม่ถูกต้อง','The JSON is not valid')]}; } }
  else res=parseCode(txt);
  if (res.errs.length){ showErrs(res.errs); cMsg(L(`พบปัญหา ${res.errs.length} จุด แก้แล้วกดนำเข้าอีกครั้ง`,`Found ${res.errs.length} problem${res.errs.length>1?'s':''}. Fix them and import again`)); return; }
  const go=()=>{ pushUndo(); applyData(res.data); setCircuit(res.data.title||L('วงจรจากโค้ด','Circuit from code'), true); save(); showErrs([]); closeCode(); cMsg(L(`สร้างวงจรแล้ว อุปกรณ์ ${comps.length} ชิ้น สายไฟ ${res.data.wires.length} เส้น`,`Circuit built: ${comps.length} parts, ${res.data.wires.length} wires`)); };
  if (comps.length||wires.length) askConfirm(L('นำเข้าวงจรจากโค้ดแทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก','Import the circuit from the code in place of the one on the board? The current circuit is lost unless you saved it.'), L('นำเข้า','Import'), go); else go();
};
$('#fixall').onclick=()=>{ for (const c of comps) repair(c); for (const w of wires) repair(w); renderInsp(); };
function setIdeal(v, quiet){
  ideal=!!v;
  const b=document.getElementById('ideal'); if (b){ b.setAttribute('aria-pressed',String(ideal)); b.textContent=L('วงจรอุดมคติ: ','Ideal circuit: ')+(ideal?L('เปิด','on'):L('ปิด','off')); }
  for (const c of comps){ c.vd=0; if (ideal){ c.broken=false; c.smokeT=0; } c.temp=TA; }
  for (const w of wires){ if (ideal && w.broken){ w.broken=false; dirty=true; } w.temp=TA; }
  dirty=true;
  if (!quiet){ renderInsp(); renderList(); save(); }
}
$('#ideal').onclick=()=>setIdeal(!ideal);
$('#heat').onclick=e=>{ showHeat=!showHeat; e.target.setAttribute('aria-pressed',String(showHeat)); refreshButtons(); };
$('#speed').onchange=e=>{ speed=parseFloat(e.target.value); };
const setMode=m=>{ elMode=m; $('#mCur').setAttribute('aria-pressed',String(!m)); $('#mEl').setAttribute('aria-pressed',String(m)); };
$('#mCur').onclick=()=>setMode(false); $('#mEl').onclick=()=>setMode(true);

// the version (with an optional tag, e.g. '1.0.3.0 alpha') is written here and in the name of the version file ("version 2.1.0.0 alpha.txt"); change both together
const VERSION = '2.1.0.0 alpha';
const verLabel = () => { const a=$('#ver'); a.textContent=L('เวอร์ชัน ','Version ')+VERSION; a.href=encodeURI('version '+VERSION+'.txt'); a.parentElement.hidden=false; };
verLabel();

/* ---------- menu (hamburger, top left) and explanation pages ---------- */
// Pages "อุปกรณ์" (components) and "วงจร" (circuits) read their text from KNOWLEDGE in knowledge.js. Each detail page runs its example
// circuit live on a small board of its own: swapIn() lends the solver's globals to that example for a moment, so the main board is untouched.
const menuPanel=$('#menuPanel'), menuBtn=$('#menuBtn'), docPage=$('#docPage'), docBody=$('#docBody');
const KN = (typeof KNOWLEDGE==='object' && KNOWLEDGE) ? KNOWLEDGE : {devices:[], concepts:[], circuits:[]};
const tx = o => o && typeof o==='object' ? (o[lang] ?? o.th ?? '') : (o ?? '');   // a {th, en} field in the page language
const esc = v => String(v).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
// basic circuit shown at the bottom of each component page: one of the circuits in KNOWLEDGE (ref), or a small one written here
const DEV_EX = {
  dc:{title:{th:'ถ่านกับหลอดไฟ',en:'A battery and a bulb'}, cap:{th:'ถ่าน 9 V ต่อหลอดไฟ 18 Ω: แอมมิเตอร์ I อ่าน 0.5 A และโวลต์มิเตอร์ V อ่าน 9 V เท่าแรงเคลื่อนของถ่าน',en:'A 9 V battery with an 18 Ω bulb: ammeter I reads 0.5 A and voltmeter V reads 9 V, the EMF of the battery'},
    code:`CIRCUIT v1 ideal=1
DC  2,7 2,5   E=9 name=E
AM  4,2 6,2   name=I
B   9,5 9,7   R=18 name=B1
VM  12,5 12,7 name=V
W   2,5 2,2 4,2
W   6,2 9,2 9,5
W   9,5 12,5
W   9,7 12,7
W   9,7 9,9 2,9 2,7`},
  ac:{title:{th:'ไฟสลับกับตัวต้านทาน',en:'AC through a resistor'}, cap:{th:'ไฟสลับ 10 V (ค่าสูงสุด) 1 Hz ต่อตัวต้านทาน 50 Ω กระแสไหลกลับไปกลับมา สูงสุด 0.2 A ดูจุดกระแสที่วิ่งสลับทิศ',en:'A 10 V peak, 1 Hz AC source with a 50 Ω resistor: the current flows back and forth, 0.2 A at most. Watch the dots change direction'},
    code:`CIRCUIT v1 ideal=1
AC  2,7 2,5   E=10 f=1 name=E
AM  4,2 6,2   name=I
R   9,5 9,7   R=50 name=R
VM  12,5 12,7 name=V
W   2,5 2,2 4,2
W   6,2 9,2 9,5
W   9,5 12,5
W   9,7 12,7
W   9,7 9,9 2,9 2,7`},
  res:{title:{th:'กฎของโอห์ม',en:"Ohm's law"}, cap:{th:'ถ่าน 6 V ต่อตัวต้านทาน 200 Ω: I = V/R = 6/200 = 30 mA',en:'A 6 V battery with a 200 Ω resistor: I = V/R = 6/200 = 30 mA'},
    code:`CIRCUIT v1 ideal=1
DC  2,7 2,5   E=6 name=E
AM  4,2 6,2   name=I
R   9,5 9,7   R=200 name=R
VM  12,5 12,7 name=V
W   2,5 2,2 4,2
W   6,2 9,2 9,5
W   9,5 12,5
W   9,7 12,7
W   9,7 9,9 2,9 2,7`},
  bulb:{title:{th:'หลอดไฟหนึ่งดวง',en:'One bulb'}, cap:{th:'หลอด 20 Ω ที่ 9 V: I = 0.45 A กำลัง P = VI ≈ 4 W ยิ่งกำลังมาก หลอดยิ่งสว่าง',en:'A 20 Ω bulb at 9 V: I = 0.45 A and P = VI ≈ 4 W. The more power, the brighter it glows'},
    code:`CIRCUIT v1 ideal=1
DC  2,7 2,5   E=9 name=E
AM  4,2 6,2   name=I
B   9,5 9,7   R=20 name=B1
VM  12,5 12,7 name=V
W   2,5 2,2 4,2
W   6,2 9,2 9,5
W   9,5 12,5
W   9,7 12,7
W   9,7 9,9 2,9 2,7`},
  sw:{title:{th:'สวิตช์กับหลอดไฟ',en:'A switch and a bulb'}, cap:{th:'สวิตช์ต่ออยู่ หลอดได้ 0.45 A กด "ลองบนแผง" แล้วแตะสวิตช์เพื่อตัดวงจร กระแสจะหยุดทั้งเส้นทางทันที',en:'The switch is closed and the bulb gets 0.45 A. Press "Try it on the board" and tap the switch to open it: the current stops along the whole path at once'},
    code:`CIRCUIT v1 ideal=1
DC  2,7 2,5   E=9 name=E
S   4,2 6,2   name=S1
B   9,5 9,7   R=20 name=B1
VM  12,5 12,7 name=V
W   2,5 2,2 4,2
W   6,2 9,2 9,5
W   9,5 12,5
W   9,7 12,7
W   9,7 9,9 2,9 2,7`},
  gnd:{title:{th:'จุดกราวกับตัวแบ่งแรงดัน',en:'Ground and a voltage divider'}, cap:{th:'กราวที่ขั้วลบทำให้จุดนั้นเป็น 0 V โวลต์มิเตอร์ V_mid อ่านศักย์ของจุดกลางเทียบกับกราวได้ 6 V (9 × 200/300)',en:'The ground at the negative terminal makes that point 0 V. Voltmeter V_mid reads the potential of the middle point against ground: 6 V (9 × 200/300)'},
    code:`CIRCUIT v1 ideal=1
DC  2,7 2,5   E=9 name=E
R   9,3 9,5   R=100 name=R1
R   9,6 9,8   R=200 name=R2
VM  12,6 12,8 name=V_mid
GND 4,9 4,11
W   2,5 2,2 9,2 9,3
W   9,5 9,6
W   9,6 12,6
W   9,8 12,8
W   9,8 9,9 2,9 2,7`},
  cap:{ref:'rc'}, ind:{ref:'rl'}, tp:{ref:'transformer'}, ts:{ref:'transformer'}, diode:{ref:'halfwave'}, led:{ref:'led'}, fuse:{ref:'fuse_blow'}, vm:{ref:'divider'}, am:{ref:'parallel'},
};
// circuit drawn above each idea on the circuits page
const CON_FIG = { node:'circ:mixed', ground:'dev:gnd', kcl:'circ:parallel', kvl:'circ:series', open:'circ:open_switch', short:'circ:short_resistor', series_parallel:'circ:mixed', ideal_real:'circ:short_source' };
// circuit plans (menu "แปลนวงจร"): ready-made circuits grouped by topic. A plan is either one of PRESETS or a CIRCUIT v1 code,
// with its lesson texts: desc, idea (why it works), try (a change to predict) and a quiz whose first option is the right one (shown shuffled)
const PLAN_CAT = [{"id": "dc", "title": {"th": "ไฟตรงพื้นฐาน", "en": "DC basics"}}, {"id": "net", "title": {"th": "อนุกรมและขนาน", "en": "Series and parallel"}}, {"id": "meter", "title": {"th": "มิเตอร์", "en": "Meters"}}, {"id": "switch", "title": {"th": "สวิตช์", "en": "Switches"}}, {"id": "store", "title": {"th": "ตัวเก็บประจุและตัวเหนี่ยวนำ", "en": "Capacitors and inductors"}}, {"id": "ac", "title": {"th": "ไฟสลับ", "en": "AC"}}, {"id": "semi", "title": {"th": "ไดโอดและ LED", "en": "Diodes and LEDs"}}, {"id": "tr", "title": {"th": "หม้อแปลง", "en": "Transformers"}}, {"id": "real", "title": {"th": "โหมดจริง: ร้อน ไหม้ ระเบิด", "en": "Real mode: heat, burn, explode"}}];
const PLANS = [
{"id": "flash", "cat": "dc", "preset": "flash", "desc": {"th": "ถ่าน 9 V สวิตช์ และหลอดไฟ 20 Ω พร้อมแอมมิเตอร์และโวลต์มิเตอร์ วงจรแรกที่ควรรู้จัก", "en": "A 9 V battery, a switch and a 20 Ω bulb, with an ammeter and a voltmeter. The first circuit to know."}, "idea": {"th": "กระแสออกจากขั้วบวก ผ่านสวิตช์ แอมมิเตอร์ และหลอดไฟ แล้วกลับเข้าขั้วลบ มีทางเดียว กระแสจึงเท่ากันทุกจุด I = V/R = 9/20 = 0.45 A", "en": "Current leaves the + terminal, passes the switch, the ammeter and the bulb, and returns to −. There is one path, so the current is the same everywhere: I = V/R = 9/20 = 0.45 A."}, "try": {"th": "แตะสวิตช์บนแผงเล็กให้ตัด ทายก่อนว่าแอมมิเตอร์และโวลต์มิเตอร์จะอ่านเท่าไร (0 A และ 0 V เพราะหลอดไม่มีกระแส)", "en": "Tap the switch on the small board to open it. Guess both meters first (0 A and 0 V, since the bulb has no current)."}, "quiz": {"q": {"th": "แอมมิเตอร์ควรอ่านได้เท่าไร", "en": "What should the ammeter read?"}, "opts": [{"th": "0.45 A", "en": "0.45 A"}, {"th": "9 A", "en": "9 A"}, {"th": "0.2 A", "en": "0.2 A"}, {"th": "180 A", "en": "180 A"}], "hint": {"th": "กระแส = แรงดัน ÷ ความต้านทาน ถ้าได้ 180 A แปลว่าเอา 9 คูณ 20 ลองหารแทน", "en": "Current = voltage ÷ resistance. 180 A would mean 9 times 20: try dividing instead."}, "why": {"th": "I = V/R = 9/20 = 0.45 A", "en": "I = V/R = 9/20 = 0.45 A"}}},
{"id": "series3", "cat": "dc", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nB   9,4 9,6    R=8 name=B1\nB   9,8 9,10   R=8 name=B2\nB   9,12 9,14  R=8 name=B3\nVM  12,4 12,6  name=V1\nVM  12,8 12,10 name=V2\nVM  12,12 12,14 name=V3\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "title": {"th": "หลอดไฟสามดวงต่ออนุกรม", "en": "Three bulbs in series"}, "desc": {"th": "หลอด 8 Ω สามดวงเรียงอยู่ในทางเดียวกันกับถ่าน 12 V", "en": "Three 8 Ω bulbs in one path with a 12 V battery."}, "idea": {"th": "มีทางเดินทางเดียว กระแสจึงเท่ากันทุกดวง R รวม = 8 + 8 + 8 = 24 Ω ได้ I = 12/24 = 0.5 A แต่ละดวงได้แรงดัน 4 V รวมกันเท่ากับ 12 V ของถ่านพอดี", "en": "There is one path, so every bulb carries the same current. Total R = 8 + 8 + 8 = 24 Ω and I = 12/24 = 0.5 A. Each bulb gets 4 V, and the three add up to the battery's 12 V."}, "try": {"th": "เปลี่ยน B3 เป็น 16 Ω ทายก่อนว่าแรงดันของแต่ละดวงเป็นเท่าไร (3 V, 3 V และ 6 V)", "en": "Change B3 to 16 Ω. Predict each bulb's voltage first (3 V, 3 V and 6 V)."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V2 อ่านได้เท่าไร", "en": "What does voltmeter V2 read?"}, "opts": [{"th": "4 V", "en": "4 V"}, {"th": "12 V", "en": "12 V"}, {"th": "8 V", "en": "8 V"}, {"th": "0 V", "en": "0 V"}], "hint": {"th": "ถ้าทุกดวงได้ 12 V เต็ม รวมสามดวงจะเป็น 36 V ซึ่งมากกว่าถ่านที่มีแค่ 12 V เป็นไปได้ไหม", "en": "If every bulb got the full 12 V, the three would add up to 36 V, more than the 12 V battery has. Can that be?"}, "why": {"th": "หลอดเหมือนกันสามดวง แรงดัน 12 V แบ่งเท่ากัน ดวงละ 4 V", "en": "Three identical bulbs share the 12 V equally: 4 V each."}}},
{"id": "divider3", "cat": "dc", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nR   9,4 9,6    R=100 name=R1\nR   9,8 9,10   R=200 name=R2\nR   9,12 9,14  R=300 name=R3\nVM  12,4 12,6  name=V_R1\nVM  12,8 12,10 name=V_R2\nVM  12,12 12,14 name=V_R3\nGND 4,15 4,17\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "title": {"th": "ตัวแบ่งแรงดันสามตัว", "en": "Three-resistor divider"}, "desc": {"th": "ตัวต้านทาน 100, 200 และ 300 Ω ต่ออนุกรมกับถ่าน 12 V มีจุดกราวที่ขั้วลบ", "en": "100, 200 and 300 Ω in series with a 12 V battery, grounded at the − terminal."}, "idea": {"th": "กระแสเท่ากันทุกตัว I = 12/600 = 20 mA แรงดันแบ่งตามสัดส่วนความต้านทาน ตัวที่ R มากได้แรงดันมาก 2 V, 4 V และ 6 V", "en": "The same current flows through all three, I = 12/600 = 20 mA. The voltage is shared in proportion to R, so the larger R gets more: 2 V, 4 V and 6 V."}, "try": {"th": "เปลี่ยน R3 เป็น 900 Ω ทายก่อนว่ามิเตอร์ทั้งสามอ่านเท่าไร (1 V, 2 V และ 9 V)", "en": "Change R3 to 900 Ω. Predict the three meters first (1 V, 2 V and 9 V)."}, "quiz": {"q": {"th": "ตัวต้านทานตัวไหนได้แรงดันมากที่สุด", "en": "Which resistor gets the most voltage?"}, "opts": [{"th": "R3 (300 Ω)", "en": "R3 (300 Ω)"}, {"th": "R1 (100 Ω)", "en": "R1 (100 Ω)"}, {"th": "R2 (200 Ω)", "en": "R2 (200 Ω)"}, {"th": "เท่ากันทุกตัว", "en": "All the same"}], "hint": {"th": "กระแสเท่ากันทุกตัว และ V = IR ถ้า I เท่ากัน ตัวที่ได้แรงดันมากสุดต้องเป็นตัวที่ R เท่าไร", "en": "The current is the same in all three, and V = IR. With the same I, which R gives the largest V?"}, "why": {"th": "V = IR = 0.02 × 300 = 6 V มากที่สุด", "en": "V = IR = 0.02 × 300 = 6 V, the largest."}}},
{"id": "cells_series", "cat": "dc", "code": "CIRCUIT v1 ideal=1\nDC  2,12 2,10  E=1.5 name=E1\nDC  2,8 2,6    E=1.5 name=E2\nAM  5,3 7,3    name=I\nB   10,8 10,10 R=6 name=B1\nVM  13,8 13,10 name=V\nW   2,10 2,8\nW   2,6 2,3 5,3\nW   7,3 10,3 10,8\nW   10,10 10,15 2,15 2,12\nW   10,8 13,8\nW   10,10 13,10", "title": {"th": "ถ่านสองก้อนต่ออนุกรม", "en": "Two cells in series"}, "desc": {"th": "ถ่าน 1.5 V สองก้อน ขั้วบวกของก้อนล่างต่อกับขั้วลบของก้อนบน จ่ายไฟให้หลอด 6 Ω", "en": "Two 1.5 V cells, the + of the lower one joined to the − of the upper one, feeding a 6 Ω bulb."}, "idea": {"th": "ถ่านที่ต่ออนุกรมหันไปทางเดียวกัน แรงดันบวกกัน 1.5 + 1.5 = 3 V จึงได้กระแส 3/6 = 0.5 A เหมือนถ่านในไฟฉายที่เรียงต่อกัน", "en": "Cells in series facing the same way add up: 1.5 + 1.5 = 3 V, so the current is 3/6 = 0.5 A. That is how cells sit in a flashlight."}, "try": {"th": "กลับหัวถ่าน E2 (หมุนสองครั้ง) ทายก่อนว่าหลอดจะเป็นอย่างไร (ดับ แรงดันหักล้างกันเหลือ 0 V)", "en": "Turn cell E2 around (rotate it twice). Predict the bulb first (it goes out: the voltages cancel to 0 V)."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V คร่อมหลอดอ่านได้เท่าไร", "en": "What does voltmeter V across the bulb read?"}, "opts": [{"th": "3 V", "en": "3 V"}, {"th": "1.5 V", "en": "1.5 V"}, {"th": "0.75 V", "en": "0.75 V"}, {"th": "6 V", "en": "6 V"}], "hint": {"th": "ถ้าหลอดได้แค่ 1.5 V ถ่านก้อนที่สองที่อยู่ในทางเดียวกันกำลังทำอะไรอยู่", "en": "If the bulb got only 1.5 V, what would the second cell in the same path be doing?"}, "why": {"th": "อนุกรมหันทางเดียวกัน แรงดันบวกกัน 1.5 + 1.5 = 3 V", "en": "In series and facing the same way, the voltages add: 1.5 + 1.5 = 3 V."}}},
{"id": "cells_parallel", "cat": "dc", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=6 name=E1\nDC  6,10 6,8   E=6 name=E2\nAM  2,6 2,4    name=I_1\nAM  6,6 6,4    name=I_2\nB   12,8 12,10 R=12 name=B1\nVM  15,8 15,10 name=V\nW   2,8 2,6\nW   6,8 6,6\nW   2,4 2,3 12,3 12,8\nW   6,4 6,3\nW   12,10 12,15 2,15 2,10\nW   6,10 6,15\nW   12,8 15,8\nW   12,10 15,10", "title": {"th": "ถ่านสองก้อนต่อขนาน", "en": "Two cells in parallel"}, "desc": {"th": "ถ่าน 6 V สองก้อนต่อขนานกัน ช่วยกันจ่ายไฟให้หลอด 12 Ω มีแอมมิเตอร์ที่ถ่านแต่ละก้อน", "en": "Two 6 V cells side by side share the job of feeding a 12 Ω bulb, with an ammeter on each cell."}, "idea": {"th": "ต่อขนานแล้วแรงดันยังเป็น 6 V เท่าเดิม หลอดได้ 6/12 = 0.5 A แต่ถ่านแต่ละก้อนจ่ายแค่ครึ่งเดียว 0.25 A จึงใช้ได้นานขึ้น", "en": "In parallel the voltage stays 6 V and the bulb gets 6/12 = 0.5 A, but each cell supplies only half, 0.25 A, so they last longer."}, "try": {"th": "พักการทำงานถ่าน E2 ทายก่อนว่าหลอดสว่างเท่าเดิมไหม และ I_1 อ่านเท่าไร (เท่าเดิม I_1 = 0.5 A)", "en": "Disable cell E2. Is the bulb as bright as before, and what does I_1 read? (Same brightness, I_1 = 0.5 A.)"}, "quiz": {"q": {"th": "แอมมิเตอร์ I_1 อ่านได้เท่าไร", "en": "What does ammeter I_1 read?"}, "opts": [{"th": "0.25 A", "en": "0.25 A"}, {"th": "0.5 A", "en": "0.5 A"}, {"th": "1 A", "en": "1 A"}, {"th": "0 A", "en": "0 A"}], "hint": {"th": "หลอดใช้ 0.5 A ถ้าถ่านแต่ละก้อนจ่าย 0.5 A รวมกันที่หลอดจะเป็นเท่าไร เกินที่หลอดใช้ไหม", "en": "The bulb takes 0.5 A. If each cell gave 0.5 A, how much would arrive at the bulb? More than it takes?"}, "why": {"th": "ถ่านเหมือนกันสองก้อนแบ่งกันจ่ายคนละครึ่ง 0.5/2 = 0.25 A", "en": "Two identical cells share the load: 0.5/2 = 0.25 A each."}}},
{"id": "opposing", "cat": "dc", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E1\nDC  8,3 6,3    E=3 name=E2\nAM  12,4 12,6  name=I\nR   12,8 12,10 R=6 name=R\nVM  15,8 15,10 name=V\nW   2,8 2,3 6,3\nW   8,3 12,3 12,4\nW   12,6 12,8\nW   12,10 12,15 2,15 2,10\nW   12,8 15,8\nW   12,10 15,10", "title": {"th": "ถ่านต่อสวนทางกัน", "en": "Batteries facing each other"}, "desc": {"th": "ถ่าน 9 V กับ 3 V อยู่ในลูปเดียวกันแต่หันขั้วสวนกัน ต่อกับตัวต้านทาน 6 Ω", "en": "A 9 V and a 3 V battery in one loop, facing opposite ways, with a 6 Ω resistor."}, "idea": {"th": "แรงดันที่หันสวนกันหักล้างกัน เหลือ 9 − 3 = 6 V กระแสจึงเป็น 6/6 = 1 A และไหลตามทิศที่ถ่านก้อนที่แรงกว่าดัน", "en": "Opposing voltages subtract: 9 − 3 = 6 V, so the current is 6/6 = 1 A, in the direction the stronger battery pushes."}, "try": {"th": "เปลี่ยน E2 เป็น 9 V ทายก่อนว่ากระแสเป็นเท่าไร (0 A)", "en": "Set E2 to 9 V. Predict the current first (0 A)."}, "quiz": {"q": {"th": "แอมมิเตอร์ I อ่านได้เท่าไร", "en": "What does ammeter I read?"}, "opts": [{"th": "1 A", "en": "1 A"}, {"th": "2 A", "en": "2 A"}, {"th": "1.5 A", "en": "1.5 A"}, {"th": "0 A", "en": "0 A"}], "hint": {"th": "ถ้าแรงดันบวกกันได้ 12 V กระแสจะเป็น 2 A แต่ถ่าน E2 หันขั้วไปทางไหน มันช่วยดันหรือดันสวน", "en": "Adding them gives 12 V and 2 A. But which way does E2 face: does it help or push back?"}, "why": {"th": "(9 − 3)/6 = 1 A", "en": "(9 − 3)/6 = 1 A"}}},
{"id": "par", "cat": "net", "preset": "par", "desc": {"th": "หลอด 24 Ω สามดวงต่อขนานกับถ่าน 12 V ดวงที่สามมีสวิตช์ของตัวเอง", "en": "Three 24 Ω bulbs in parallel on a 12 V battery; the third has its own switch."}, "idea": {"th": "ทุกสาขาได้แรงดัน 12 V เต็ม แต่ละดวงใช้ 12/24 = 0.5 A กระแสรวมที่ออกจากถ่านคือผลบวก 1.5 A", "en": "Every branch gets the full 12 V. Each bulb takes 12/24 = 0.5 A, and the battery supplies the sum, 1.5 A."}, "try": {"th": "แตะสวิตช์ของดวงที่สามบนแผงเล็ก ทายก่อนว่าแอมมิเตอร์อ่านเท่าไร และอีกสองดวงหรี่ลงไหม (1 A และไม่หรี่)", "en": "Tap the third bulb's switch on the small board. Predict the ammeter (1 A) and whether the other two dim (they do not)."}, "quiz": {"q": {"th": "แอมมิเตอร์อ่านกระแสรวมได้เท่าไร", "en": "What total current does the ammeter read?"}, "opts": [{"th": "1.5 A", "en": "1.5 A"}, {"th": "0.5 A", "en": "0.5 A"}, {"th": "0.17 A", "en": "0.17 A"}, {"th": "4.5 A", "en": "4.5 A"}], "hint": {"th": "ถ้าสามดวงต่ออนุกรมจะได้ 72 Ω และ 0.17 A แต่ที่นี่แต่ละดวงต่อตรงกับถ่าน แต่ละดวงได้กี่แอมป์", "en": "In series the three would make 72 Ω and 0.17 A. Here each bulb sits straight across the battery: how much does each take?"}, "why": {"th": "แต่ละดวง 12/24 = 0.5 A สามดวงรวม 1.5 A", "en": "Each bulb 12/24 = 0.5 A, three of them 1.5 A."}}},
{"id": "parallel3", "cat": "net", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I_total\nAM  9,5 9,7    name=I_1\nAM  12,5 12,7  name=I_2\nAM  15,5 15,7  name=I_3\nR   9,9 9,11   R=12 name=R1\nR   12,9 12,11 R=24 name=R2\nR   15,9 15,11 R=6 name=R3\nW   2,8 2,3 4,3\nW   6,3 15,3\nW   9,3 9,5\nW   12,3 12,5\nW   15,3 15,5\nW   9,7 9,9\nW   12,7 12,9\nW   15,7 15,9\nW   9,11 9,14\nW   12,11 12,14\nW   15,11 15,14 2,14 2,10", "title": {"th": "ตัวต้านทานสามตัวต่อขนาน", "en": "Three resistors in parallel"}, "desc": {"th": "R 12, 24 และ 6 Ω ต่อขนานกับถ่าน 12 V มีแอมมิเตอร์ทุกสาขาและที่ทางรวม", "en": "12, 24 and 6 Ω in parallel on 12 V, with an ammeter in every branch and on the main line."}, "idea": {"th": "แรงดันเท่ากันทุกสาขา กระแสแบ่งตามความต้านทาน R น้อยได้กระแสมาก 1 A, 0.5 A และ 2 A รวมกันได้ 3.5 A ตามกฎกระแสของเคอร์ชอฟฟ์", "en": "Same voltage in every branch; the current splits by resistance, the smaller R taking more: 1 A, 0.5 A and 2 A, adding up to 3.5 A (Kirchhoff's current law)."}, "try": {"th": "เพิ่มตัวต้านทาน 12 Ω อีกหนึ่งสาขา ทายก่อนว่า I_total เป็นเท่าไร (4.5 A)", "en": "Add one more 12 Ω branch. Predict I_total first (4.5 A)."}, "quiz": {"q": {"th": "สาขาไหนมีกระแสมากที่สุด", "en": "Which branch carries the most current?"}, "opts": [{"th": "I_3 (6 Ω)", "en": "I_3 (6 Ω)"}, {"th": "I_2 (24 Ω)", "en": "I_2 (24 Ω)"}, {"th": "I_1 (12 Ω)", "en": "I_1 (12 Ω)"}, {"th": "เท่ากันทุกสาขา", "en": "All the same"}], "hint": {"th": "ทุกสาขาได้ 12 V เท่ากัน และ I = V/R ถ้า V เท่ากัน หารด้วย R ตัวไหนแล้วได้ผลมากที่สุด", "en": "Every branch has the same 12 V, and I = V/R. With the same V, which R gives the biggest result?"}, "why": {"th": "12/6 = 2 A มากที่สุด", "en": "12/6 = 2 A, the largest."}}},
{"id": "bulbs_abc", "cat": "net", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nB   5,3 7,3    R=6 name=A\nB   10,7 10,9  R=6 name=B\nB   14,7 14,9  R=6 name=C\nW   2,8 2,3 5,3\nW   7,3 14,3 14,7\nW   10,3 10,7\nW   10,9 10,13\nW   14,9 14,13 2,13 2,10", "title": {"th": "หลอด A อนุกรมกับ B ขนาน C", "en": "Bulb A in series with B ∥ C"}, "desc": {"th": "หลอดเหมือนกันสามดวง ดวงละ 6 Ω หลอด A อยู่ทางหลัก ส่วน B กับ C แยกเป็นสองสาขา", "en": "Three identical 6 Ω bulbs: A on the main line, B and C on two branches."}, "idea": {"th": "กระแสทั้งหมดผ่าน A ก่อน แล้วแบ่งครึ่งให้ B กับ C ความต้านทานรวม 6 + 3 = 9 Ω ได้ I_A = 12/9 ≈ 1.33 A ส่วน B และ C ได้คนละ 0.67 A A จึงสว่างที่สุด", "en": "All the current goes through A first, then splits in half for B and C. Total R = 6 + 3 = 9 Ω, so I_A = 12/9 ≈ 1.33 A and B and C get 0.67 A each. A is the brightest."}, "try": {"th": "พักการทำงานหลอด C ทายก่อนว่า A หรี่ลงหรือสว่างขึ้น และ B เป็นอย่างไร (A หรี่ลง B สว่างขึ้น ทั้งคู่ได้ 1 A)", "en": "Disable bulb C. Does A dim or brighten, and what does B do? (A dims, B brightens: both carry 1 A.)"}, "quiz": {"q": {"th": "หลอดไหนสว่างที่สุด", "en": "Which bulb is the brightest?"}, "opts": [{"th": "A", "en": "A"}, {"th": "B", "en": "B"}, {"th": "C", "en": "C"}, {"th": "เท่ากันทั้งสามดวง", "en": "All three the same"}], "hint": {"th": "กระแสที่ไหลใน B กับ C มาจากไหน ก่อนจะแยกสาขา มันผ่านหลอดไหนมาแล้ว", "en": "Where does the current in B and C come from? Before it splits, which bulb has it already passed?"}, "why": {"th": "A ได้กระแสทั้งหมด 1.33 A ส่วน B กับ C แบ่งกันคนละครึ่ง กำลัง P = I²R ของ A จึงมากที่สุด", "en": "A carries the whole 1.33 A while B and C share it, so A has the largest power P = I²R."}}},
{"id": "wheatstone", "cat": "net", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nR   6,5 6,7    R=100 name=R1\nR   6,9 6,11   R=200 name=R2\nR   13,5 13,7  R=150 name=R3\nR   13,9 13,11 R=300 name=R4\nAM  9,8 11,8   name=I_G\nW   2,8 2,3 13,3 13,5\nW   6,3 6,5\nW   6,7 6,9\nW   13,7 13,9\nW   6,8 9,8\nW   11,8 13,8\nW   6,11 6,13\nW   13,11 13,13 2,13 2,10", "title": {"th": "สะพานวีตสโตน", "en": "Wheatstone bridge"}, "desc": {"th": "ตัวต้านทานสองคู่ 100/200 Ω และ 150/300 Ω มีแอมมิเตอร์ I_G เชื่อมจุดกลางของสองฝั่ง", "en": "Two resistor pairs, 100/200 Ω and 150/300 Ω, with ammeter I_G joining their middle points."}, "idea": {"th": "ฝั่งซ้ายแบ่ง 9 V ในสัดส่วน 1 : 2 ฝั่งขวาก็ 1 : 2 จุดกลางทั้งสองจึงมีศักย์ 6 V เท่ากัน ไม่มีแรงดันดันกระแสผ่าน I_G สะพานจึงสมดุล (R1/R2 = R3/R4)", "en": "Each side splits the 9 V in the same 1 : 2 ratio, so both middle points sit at 6 V. Nothing pushes current through I_G: the bridge is balanced (R1/R2 = R3/R4)."}, "try": {"th": "เปลี่ยน R4 เป็น 600 Ω ทายก่อนว่า I_G เป็นบวกหรือลบ (ลบ กระแสไหลจากขวาไปซ้าย)", "en": "Change R4 to 600 Ω. Will I_G read positive or negative? (Negative: the current flows right to left.)"}, "quiz": {"q": {"th": "แอมมิเตอร์ I_G อ่านได้เท่าไร", "en": "What does ammeter I_G read?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "30 mA", "en": "30 mA"}, {"th": "20 mA", "en": "20 mA"}, {"th": "50 mA", "en": "50 mA"}], "hint": {"th": "ลองหาศักย์ของจุดกลางทั้งสองฝั่ง ถ้าเท่ากัน อะไรจะดันกระแสให้ไหลข้ามจากฝั่งหนึ่งไปอีกฝั่ง", "en": "Work out the potential of both middle points. If they are equal, what would push current across?"}, "why": {"th": "จุดกลางทั้งสองมีศักย์ 6 V เท่ากัน สะพานสมดุล I_G = 0", "en": "Both middle points are at 6 V, the bridge is balanced and I_G = 0."}}},
{"id": "two_source", "cat": "net", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E1\nR   3,3 5,3    R=4 name=R1\nAM  5,3 7,3    name=I_1\nAM  13,3 11,3  name=I_2\nR   13,3 15,3  R=2 name=R2\nDC  16,10 16,8 E=9 name=E2\nAM  9,5 9,7    name=I_3\nR   9,9 9,11   R=4 name=R3\nW   2,8 2,3 3,3\nW   7,3 11,3\nW   9,3 9,5\nW   9,7 9,9\nW   15,3 16,3 16,8\nW   9,11 9,13\nW   2,10 2,13 16,13 16,10", "title": {"th": "แหล่งจ่ายสองตัว (กฎของเคอร์ชอฟฟ์)", "en": "Two sources (Kirchhoff)"}, "desc": {"th": "ถ่าน 12 V และ 9 V จ่ายไฟเข้าตัวต้านทาน R3 ร่วมกัน ผ่าน R1 และ R2", "en": "A 12 V and a 9 V battery both feed R3, through R1 and R2."}, "idea": {"th": "ใช้กฎของเคอร์ชอฟฟ์ ให้จุดบนของ R3 มีศักย์ V จะได้ (12 − V)/4 + (9 − V)/2 = V/4 แก้ได้ V = 7.5 V ดังนั้น I_1 = 1.125 A, I_2 = 0.75 A และ I_3 = 1.875 A = I_1 + I_2", "en": "Use Kirchhoff's laws. Call the potential at the top of R3 V. Then (12 − V)/4 + (9 − V)/2 = V/4, so V = 7.5 V, I_1 = 1.125 A, I_2 = 0.75 A and I_3 = 1.875 A = I_1 + I_2."}, "try": {"th": "เปลี่ยน E2 เป็น 6 V ทายก่อนว่า I_2 อ่านเท่าไร (0 A พอดี เพราะจุดบนของ R3 มีศักย์ 6 V เท่ากับ E2)", "en": "Set E2 to 6 V. Predict I_2 first (exactly 0 A: the top of R3 sits at 6 V, the same as E2)."}, "quiz": {"q": {"th": "แอมมิเตอร์ I_3 อ่านได้เท่าไร", "en": "What does ammeter I_3 read?"}, "opts": [{"th": "1.875 A", "en": "1.875 A"}, {"th": "0.375 A", "en": "0.375 A"}, {"th": "3 A", "en": "3 A"}, {"th": "1.125 A", "en": "1.125 A"}], "hint": {"th": "กระแส I_1 และ I_2 ไหลมารวมกันที่จุดเดียวก่อนลง R3 ที่จุดรวมนั้น กระแสเข้าต้องเท่ากับกระแสออก", "en": "I_1 and I_2 meet at one point before R3. At that point, the current in must equal the current out."}, "why": {"th": "I_3 = I_1 + I_2 = 1.125 + 0.75 = 1.875 A", "en": "I_3 = I_1 + I_2 = 1.125 + 0.75 = 1.875 A"}}},
{"id": "vm_series", "cat": "meter", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nVM  6,3 8,3    name=V\nB   12,8 12,10 R=20 name=B1\nAM  12,11 12,13 name=I\nW   2,8 2,3 6,3\nW   8,3 12,3 12,8\nW   12,10 12,11\nW   12,13 12,15 2,15 2,10", "title": {"th": "ต่อโวลต์มิเตอร์อนุกรม (ต่อผิด)", "en": "Voltmeter in series (wrong)"}, "desc": {"th": "โวลต์มิเตอร์ถูกวางไว้ในทางเดินของกระแส แทนที่จะต่อคร่อมอุปกรณ์", "en": "A voltmeter placed in the current's path instead of across a part."}, "idea": {"th": "โวลต์มิเตอร์มีความต้านทานสูงมาก (ในอุดมคติไม่ให้กระแสผ่านเลย) วงจรจึงเหมือนขาด หลอดดับ I = 0 และโวลต์มิเตอร์อ่าน 9 V เต็ม เพราะคร่อมช่องที่ขาดอยู่", "en": "A voltmeter has a huge resistance (ideally no current passes at all), so the circuit acts as if broken: the bulb is off, I = 0, and the voltmeter reads the full 9 V across the gap."}, "try": {"th": "ย้ายโวลต์มิเตอร์ไปคร่อมหลอด แล้วต่อสายตรงที่เดิม ทายก่อนว่าอ่านเท่าไร (9 V และหลอดติด)", "en": "Move the voltmeter across the bulb and put a wire where it was. Predict its reading (9 V, and the bulb lights)."}, "quiz": {"q": {"th": "หลอดไฟจะเป็นอย่างไร", "en": "What does the bulb do?"}, "opts": [{"th": "ดับ", "en": "Stays off"}, {"th": "สว่างปกติ", "en": "Lights normally"}, {"th": "สว่างครึ่งเดียว", "en": "Half bright"}, {"th": "ระเบิด", "en": "Explodes"}], "hint": {"th": "โวลต์มิเตอร์ในอุดมคติไม่ยอมให้กระแสผ่าน ถ้ามันขวางทางเดียวของกระแส กระแสจะไปทางไหนได้", "en": "An ideal voltmeter lets no current through. If it blocks the only path, where can the current go?"}, "why": {"th": "ไม่มีกระแส หลอดจึงดับ และแรงดันทั้งหมดไปอยู่คร่อมโวลต์มิเตอร์", "en": "No current flows, so the bulb is off and the whole voltage sits across the voltmeter."}}},
{"id": "am_parallel", "cat": "meter", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nR   5,3 7,3    R=30 name=R\nB   11,8 11,10 R=20 name=B1\nAM  15,8 15,10 name=I\nW   2,8 2,3 5,3\nW   7,3 11,3 11,8\nW   11,8 15,8\nW   11,10 15,10\nW   11,10 11,14 2,14 2,10", "title": {"th": "ต่อแอมมิเตอร์คร่อมหลอด (ต่อผิด)", "en": "Ammeter across a bulb (wrong)"}, "desc": {"th": "แอมมิเตอร์ถูกต่อคร่อมหลอดไฟ แทนที่จะต่ออนุกรม", "en": "An ammeter connected across the bulb instead of in series."}, "idea": {"th": "แอมมิเตอร์แทบไม่มีความต้านทาน จึงกลายเป็นทางลัดให้กระแสทั้งหมดอ้อมหลอด หลอดดับ และแอมมิเตอร์อ่าน 9/30 = 0.3 A ถ้าไม่มี R 30 Ω คั่นไว้ จะเท่ากับลัดวงจรถ่าน", "en": "An ammeter has almost no resistance, so it becomes a shortcut: all the current bypasses the bulb, the bulb is off, and the ammeter reads 9/30 = 0.3 A. Without the 30 Ω resistor this would short the battery."}, "try": {"th": "ย้ายแอมมิเตอร์ไปต่ออนุกรมกับหลอด ทายก่อนว่าอ่านได้เท่าไร (9/50 = 0.18 A)", "en": "Move the ammeter into series with the bulb. Predict its reading first (9/50 = 0.18 A)."}, "quiz": {"q": {"th": "หลอดไฟได้กระแสเท่าไร", "en": "How much current goes through the bulb?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "0.18 A", "en": "0.18 A"}, {"th": "0.3 A", "en": "0.3 A"}, {"th": "0.45 A", "en": "0.45 A"}], "hint": {"th": "กระแสชอบทางที่ต้านน้อย ระหว่างหลอด 20 Ω กับแอมมิเตอร์ที่แทบเป็นสายไฟ มันจะเลือกทางไหน", "en": "Current prefers the easy path. Between a 20 Ω bulb and an ammeter that is almost a wire, which one wins?"}, "why": {"th": "แอมมิเตอร์ลัดหลอดไว้ กระแสทั้ง 0.3 A อ้อมไปทางแอมมิเตอร์ หลอดได้ 0 A", "en": "The ammeter shorts the bulb: all 0.3 A goes around through it, and the bulb gets 0 A."}}},
{"id": "switch_and", "cat": "switch", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nS   4,3 6,3    name=S1\nS   8,3 10,3   on=0 name=S2\nB   13,8 13,10 R=20 name=B1\nAM  13,11 13,13 name=I\nW   2,8 2,3 4,3\nW   6,3 8,3\nW   10,3 13,3 13,8\nW   13,10 13,11\nW   13,13 13,15 2,15 2,10", "title": {"th": "สวิตช์สองตัวต่ออนุกรม (และ)", "en": "Two switches in series (AND)"}, "desc": {"th": "สวิตช์ S1 กับ S2 อยู่ในทางเดียวกัน ตอนนี้ S2 ตัดอยู่", "en": "S1 and S2 sit on the same path; S2 is open."}, "idea": {"th": "หลอดติดเมื่อ S1 และ S2 ต่อทั้งคู่ ตัวใดตัวหนึ่งตัด ทางเดินเดียวของกระแสก็ขาด เหมือนประตูสองบานที่ต้องเปิดทั้งสองบานจึงเดินผ่านได้", "en": "The bulb lights only when S1 and S2 are both closed. Either one open breaks the only path, like two doors that both have to be open to walk through."}, "try": {"th": "แตะ S2 บนแผงเล็ก ทายก่อนว่าแอมมิเตอร์จะอ่านเท่าไร (0.45 A)", "en": "Tap S2 on the small board. Predict the ammeter first (0.45 A)."}, "quiz": {"q": {"th": "ตอนนี้ (S1 ต่อ S2 ตัด) หลอดติดไหม", "en": "Right now (S1 closed, S2 open), is the bulb on?"}, "opts": [{"th": "ดับ", "en": "Off"}, {"th": "ติด", "en": "On"}, {"th": "ติดครึ่งเดียว", "en": "Half bright"}, {"th": "กะพริบ", "en": "Blinking"}], "hint": {"th": "ลองไล่ทางเดินจากขั้วบวก ผ่าน S1 แล้วไปถึง S2 กระแสข้าม S2 ที่ตัดอยู่ได้ไหม มีทางอ้อมไหม", "en": "Trace from + through S1 to S2. Can the current cross an open S2? Is there a way around it?"}, "why": {"th": "อนุกรม: ตัดตัวเดียวก็ขาดทั้งวง กระแส 0 A", "en": "In series, one open switch breaks the whole loop: 0 A."}}},
{"id": "switch_or", "cat": "switch", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nS   6,3 8,3    on=0 name=S1\nS   6,5 8,5    name=S2\nB   13,8 13,10 R=20 name=B1\nAM  13,11 13,13 name=I\nW   2,8 2,3 6,3\nW   4,3 4,5 6,5\nW   8,3 13,3 13,8\nW   8,5 10,5 10,3\nW   13,10 13,11\nW   13,13 13,15 2,15 2,10", "title": {"th": "สวิตช์สองตัวต่อขนาน (หรือ)", "en": "Two switches in parallel (OR)"}, "desc": {"th": "สวิตช์ S1 กับ S2 วางคู่กันเป็นสองทาง ตอนนี้ S1 ตัด S2 ต่อ", "en": "S1 and S2 side by side as two routes; S1 is open, S2 is closed."}, "idea": {"th": "หลอดติดเมื่อ S1 หรือ S2 ต่ออย่างน้อยหนึ่งตัว เพราะกระแสอ้อมไปทางที่ต่ออยู่ได้ เหมือนถนนสองเส้นที่ไปที่เดียวกัน ปิดเส้นหนึ่งรถก็ยังไปอีกเส้นได้", "en": "The bulb lights when S1 or S2 (or both) is closed, because the current can go around through whichever is closed, like two roads to the same place: close one and the traffic takes the other."}, "try": {"th": "แตะ S2 ให้ตัด ทายก่อนว่าหลอดเป็นอย่างไร แล้วแตะ S1 ให้ต่อ (ดับ แล้วติดอีกครั้ง)", "en": "Tap S2 open and predict the bulb, then tap S1 closed (off, then on again)."}, "quiz": {"q": {"th": "แอมมิเตอร์ I อ่านได้เท่าไร", "en": "What does ammeter I read?"}, "opts": [{"th": "0.45 A", "en": "0.45 A"}, {"th": "0 A", "en": "0 A"}, {"th": "0.225 A", "en": "0.225 A"}, {"th": "0.9 A", "en": "0.9 A"}], "hint": {"th": "S1 ตัดอยู่ก็จริง แต่ยังมีอีกทางผ่าน S2 ไหม ถ้ามี หลอดได้แรงดันเท่าไร", "en": "S1 is open, but is there still a route through S2? If so, what voltage does the bulb get?"}, "why": {"th": "กระแสไหลผ่าน S2 หลอดได้ 9 V เต็ม I = 9/20 = 0.45 A", "en": "The current goes through S2, the bulb gets the full 9 V: I = 9/20 = 0.45 A."}}},
{"id": "rc", "cat": "store", "preset": "rc", "desc": {"th": "ถ่าน 9 V ชาร์จตัวเก็บประจุ 4,700 µF ผ่านตัวต้านทาน 220 Ω สวิตช์เริ่มต้นที่ตัด", "en": "A 9 V battery charges a 4,700 µF capacitor through 220 Ω. The switch starts open."}, "idea": {"th": "แตะสวิตช์ให้ต่อ กระแสเริ่มต้นมาก (9/220 ≈ 41 mA) แล้วลดลงเรื่อยๆ เพราะประจุที่สะสมดันกลับ แรงดันของตัวเก็บประจุไต่ขึ้นหา 9 V ค่าคงที่เวลา τ = RC ≈ 1 s", "en": "Tap the switch closed. The current starts large (9/220 ≈ 41 mA) and keeps falling as the stored charge pushes back, while the capacitor voltage climbs toward 9 V. Time constant τ = RC ≈ 1 s."}, "try": {"th": "เปลี่ยน R เป็น 440 Ω ทายก่อนว่าต้องใช้เวลานานขึ้นกี่เท่าจึงชาร์จได้ 63% (2 เท่า)", "en": "Change R to 440 Ω. How many times longer does it take to reach 63%? (Twice as long.)"}, "quiz": {"q": {"th": "ถ้าต่อสวิตช์ทิ้งไว้นานๆ โวลต์มิเตอร์จะอ่านได้ประมาณเท่าไร", "en": "Leave the switch closed for a long time. About what does the voltmeter end up reading?"}, "opts": [{"th": "9 V", "en": "9 V"}, {"th": "0 V", "en": "0 V"}, {"th": "4.5 V", "en": "4.5 V"}, {"th": "18 V", "en": "18 V"}], "hint": {"th": "เมื่อกระแสหยุดไหล ตัวต้านทานไม่มีแรงดันคร่อม (V = IR = 0) แรงดัน 9 V ของถ่านจะไปอยู่ที่ไหน", "en": "Once the current stops, the resistor has no voltage across it (V = IR = 0). Where does the battery's 9 V go?"}, "why": {"th": "ชาร์จเต็มแล้วกระแสหยุด แรงดันของตัวเก็บประจุเท่ากับถ่าน 9 V", "en": "Fully charged, the current stops and the capacitor sits at the battery's 9 V."}}},
{"id": "cap_hold", "cat": "store", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nS   4,3 6,3    name=S1\nB   10,8 10,10 R=20 name=B1\nC   14,8 14,10 C=20000 name=C1\nVM  17,8 17,10 name=V_C\nW   2,8 2,3 4,3\nW   6,3 14,3 14,8\nW   10,3 10,8\nW   14,8 17,8\nW   10,10 10,14\nW   14,10 14,14\nW   17,10 17,14 2,14 2,10", "title": {"th": "ตัวเก็บประจุเลี้ยงหลอดหลังตัดไฟ", "en": "A capacitor keeps the bulb lit"}, "desc": {"th": "ตัวเก็บประจุ 20,000 µF ต่อคร่อมหลอด 20 Ω มีสวิตช์ตัดไฟจากถ่าน", "en": "A 20,000 µF capacitor across a 20 Ω bulb, with a switch to cut off the battery."}, "idea": {"th": "ตอนสวิตช์ต่อ ตัวเก็บประจุชาร์จเต็ม 9 V พอแตะสวิตช์ให้ตัด ประจุที่เก็บไว้ไหลออกผ่านหลอด หลอดจึงค่อยๆ หรี่ลง ไม่ดับทันที τ = RC = 20 × 0.02 = 0.4 s", "en": "With the switch closed the capacitor charges to 9 V. Tap the switch open: the stored charge flows out through the bulb, which fades instead of going dark at once. τ = RC = 20 × 0.02 = 0.4 s."}, "try": {"th": "แตะ S1 บนแผงเล็กแล้วดูหลอด ทายก่อนว่ากระแสในหลอดกลับทิศไหม (ไม่กลับ ไหลทางเดิม)", "en": "Tap S1 on the small board and watch the bulb. Does its current reverse? (No, it keeps the same direction.)"}, "quiz": {"q": {"th": "ทันทีหลังตัดสวิตช์ โวลต์มิเตอร์ V_C อ่านได้ประมาณเท่าไร", "en": "Right after the switch opens, about what does V_C read?"}, "opts": [{"th": "9 V", "en": "9 V"}, {"th": "0 V", "en": "0 V"}, {"th": "4.5 V", "en": "4.5 V"}, {"th": "18 V", "en": "18 V"}], "hint": {"th": "แรงดันของตัวเก็บประจุกระโดดทันทีไม่ได้ ต้องมีประจุไหลออกก่อน ก่อนตัดสวิตช์มันมีแรงดันเท่าไร", "en": "A capacitor's voltage cannot jump: charge has to flow out first. What was it just before the switch opened?"}, "why": {"th": "เริ่มที่ 9 V แล้วค่อยๆ ลดลงตาม τ = 0.4 s", "en": "It starts at 9 V and falls with τ = 0.4 s."}}},
{"id": "caps_series", "cat": "store", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nR   4,3 6,3    R=100 name=R\nC   9,5 9,7    C=100 name=C1\nC   9,10 9,12  C=300 name=C2\nVM  12,5 12,7  name=V_C1\nVM  12,10 12,12 name=V_C2\nW   2,8 2,3 4,3\nW   6,3 9,3 9,5\nW   9,7 9,10\nW   9,12 9,14 2,14 2,10\nW   9,5 12,5\nW   9,7 12,7\nW   9,10 12,10\nW   9,12 12,12", "title": {"th": "ตัวเก็บประจุต่ออนุกรม", "en": "Capacitors in series"}, "desc": {"th": "ตัวเก็บประจุ 100 µF และ 300 µF ต่ออนุกรม ชาร์จจากถ่าน 12 V ผ่าน R 100 Ω", "en": "100 µF and 300 µF in series, charged from 12 V through 100 Ω."}, "idea": {"th": "ตัวเก็บประจุอนุกรมได้ประจุ Q เท่ากัน และ V = Q/C จึงแบ่งแรงดันกลับกับค่าความจุ ตัวที่ C น้อยได้แรงดันมาก V_C1 = 9 V, V_C2 = 3 V", "en": "Capacitors in series take the same charge Q, and V = Q/C, so they share the voltage inversely to C: the smaller one gets more, V_C1 = 9 V and V_C2 = 3 V."}, "try": {"th": "เปลี่ยน C2 เป็น 100 µF ทายก่อนว่าแต่ละตัวได้แรงดันเท่าไร (6 V เท่ากัน)", "en": "Set C2 to 100 µF. Predict both voltages first (6 V each)."}, "quiz": {"q": {"th": "ตัวไหนได้แรงดันมากกว่า", "en": "Which capacitor ends up with more voltage?"}, "opts": [{"th": "C1 (100 µF)", "en": "C1 (100 µF)"}, {"th": "C2 (300 µF)", "en": "C2 (300 µF)"}, {"th": "เท่ากัน", "en": "Equal"}, {"th": "ไม่มีตัวไหนได้เลย", "en": "Neither gets any"}], "hint": {"th": "ประจุ Q ที่ไหลเข้า C1 ต้องเท่ากับที่ไหลเข้า C2 เพราะอยู่ทางเดียวกัน ถ้า Q เท่ากัน V = Q/C ตัวที่ C เล็กได้ V มากหรือน้อย", "en": "The same charge Q flows into both, since they share one path. With equal Q and V = Q/C, does the smaller C get more or less?"}, "why": {"th": "C1 เล็กกว่า 3 เท่า จึงได้แรงดันมากกว่า 3 เท่า 9 V กับ 3 V", "en": "C1 is three times smaller, so it gets three times the voltage: 9 V and 3 V."}}},
{"id": "rl_bulb", "cat": "store", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nL   5,3 7,3    L=2 name=L\nAM  10,5 10,7  name=I\nB   10,9 10,11 R=10 name=B1\nW   2,8 2,3 5,3\nW   7,3 10,3 10,5\nW   10,7 10,9\nW   10,11 10,14 2,14 2,10", "title": {"th": "หลอดไฟค่อยๆ สว่าง (RL)", "en": "A bulb that brightens slowly (RL)"}, "desc": {"th": "ตัวเหนี่ยวนำ 2 H อนุกรมกับหลอด 10 Ω ต่อกับถ่าน 9 V", "en": "A 2 H inductor in series with a 10 Ω bulb on 9 V."}, "idea": {"th": "ตัวเหนี่ยวนำต้านการเปลี่ยนแปลงของกระแส กระแสจึงไต่ขึ้นช้าๆ จาก 0 ไปหา 9/10 = 0.9 A หลอดค่อยๆ สว่างขึ้น τ = L/R = 0.2 s", "en": "The inductor resists changes in current, so the current climbs slowly from 0 toward 9/10 = 0.9 A and the bulb brightens gradually. τ = L/R = 0.2 s."}, "try": {"th": "กด ↻ เริ่มใหม่ พร้อมเปิดภาพช้า แล้วดูแอมมิเตอร์ ทายก่อนว่าตอน t = 0.2 s อ่านได้ประมาณเท่าไร (0.57 A คือ 63% ของ 0.9 A)", "en": "Press ↻ Restart with slow motion on and watch the ammeter. Guess its reading at t = 0.2 s (0.57 A, 63% of 0.9 A)."}, "quiz": {"q": {"th": "นานพอแล้ว แอมมิเตอร์ I อ่านได้เท่าไร", "en": "After a long time, what does ammeter I read?"}, "opts": [{"th": "0.9 A", "en": "0.9 A"}, {"th": "0 A", "en": "0 A"}, {"th": "4.5 A", "en": "4.5 A"}, {"th": "0.45 A", "en": "0.45 A"}], "hint": {"th": "เมื่อกระแสคงที่แล้ว ไม่มีการเปลี่ยนแปลงให้ตัวเหนี่ยวนำต้าน มันจึงเหมือนสายไฟ เหลือแค่หลอด 10 Ω", "en": "Once the current is steady there is no change left to resist, so the inductor acts like a wire and only the 10 Ω bulb remains."}, "why": {"th": "I = 9/10 = 0.9 A", "en": "I = 9/10 = 0.9 A"}}},
{"id": "ac_rc", "cat": "ac", "code": "CIRCUIT v1 ideal=1\nAC  2,10 2,8   E=10 f=5 name=E\nR   5,3 7,3    R=30 name=R\nAM  10,4 10,6  name=I\nC   10,8 10,10 C=1000 name=C1\nVM  13,8 13,10 name=V_C\nW   2,8 2,3 5,3\nW   7,3 10,3 10,4\nW   10,6 10,8\nW   10,8 13,8\nW   10,10 13,10\nW   10,10 10,13 2,13 2,10", "title": {"th": "ตัวเก็บประจุกับไฟสลับ", "en": "A capacitor with AC"}, "desc": {"th": "ไฟสลับ 10 V 5 Hz ผ่านตัวต้านทาน 30 Ω ไปยังตัวเก็บประจุ 1,000 µF", "en": "10 V peak, 5 Hz AC through 30 Ω into a 1,000 µF capacitor."}, "idea": {"th": "ไฟสลับทำให้ตัวเก็บประจุชาร์จและคายประจุสลับไปมา กระแสจึงไหลได้ตลอด ตัวเก็บประจุต้านด้วยรีแอกแตนซ์ X_C = 1/(2πfC) ≈ 32 Ω ยิ่งความถี่สูง ยิ่งต้านน้อย", "en": "AC charges and discharges the capacitor back and forth, so current keeps flowing. The capacitor resists with its reactance X_C = 1/(2πfC) ≈ 32 Ω; the higher the frequency, the less it resists."}, "try": {"th": "เปลี่ยน f ของแหล่งจ่ายเป็น 50 Hz ทายก่อนว่าค่าสูงสุดของ V_C เพิ่มขึ้นหรือลดลง (ลดลง เหลือราว 1 V)", "en": "Set the source to 50 Hz. Does the peak of V_C rise or fall? (It falls, to about 1 V.)"}, "quiz": {"q": {"th": "ถ้าเพิ่มความถี่ แรงดันคร่อมตัวเก็บประจุจะเป็นอย่างไร", "en": "If the frequency goes up, what happens to the voltage across the capacitor?"}, "opts": [{"th": "ลดลง", "en": "It falls"}, {"th": "เพิ่มขึ้น", "en": "It rises"}, {"th": "เท่าเดิม", "en": "No change"}, {"th": "เป็นศูนย์ทันที", "en": "It drops to zero at once"}], "hint": {"th": "ความถี่สูงแปลว่ากระแสต้องกลับทิศเร็วขึ้น ประจุมีเวลาสะสมบนแผ่นมากขึ้นหรือน้อยลง", "en": "A higher frequency means the current reverses sooner. Does charge get more or less time to pile up on the plates?"}, "why": {"th": "X_C = 1/(2πfC) ลดลงเมื่อ f เพิ่ม ตัวเก็บประจุจึงได้แรงดันน้อยลง", "en": "X_C = 1/(2πfC) falls as f rises, so the capacitor gets less of the voltage."}}},
{"id": "rlc", "cat": "ac", "code": "CIRCUIT v1 ideal=1\nAC  2,10 2,8   E=10 f=5 name=E\nR   4,3 6,3    R=10 name=R\nVM  4,5 6,5    name=V_R\nL   8,3 10,3   L=1 name=L\nC   13,6 13,8  C=1000 name=C1\nAM  13,10 13,12 name=I\nW   2,8 2,3 4,3\nW   4,3 4,5\nW   6,3 6,5\nW   6,3 8,3\nW   10,3 13,3 13,6\nW   13,8 13,10\nW   13,12 13,14 2,14 2,10", "title": {"th": "วงจร RLC เรโซแนนซ์", "en": "RLC resonance"}, "desc": {"th": "R 10 Ω, L 1 H และ C 1,000 µF ต่ออนุกรมกับไฟสลับ 10 V 5 Hz", "en": "R 10 Ω, L 1 H and C 1,000 µF in series with 10 V peak, 5 Hz AC."}, "idea": {"th": "ที่ 5 Hz ค่า X_L = 2πfL ≈ 31.4 Ω เกือบเท่ากับ X_C = 1/(2πfC) ≈ 31.8 Ω ผลของ L กับ C หักล้างกัน เหลือแค่ R กระแสจึงสูงสุดราว 10/10 = 1 A เรียกว่าเรโซแนนซ์ ที่ f₀ = 1/(2π√(LC)) ≈ 5 Hz", "en": "At 5 Hz, X_L = 2πfL ≈ 31.4 Ω almost equals X_C = 1/(2πfC) ≈ 31.8 Ω. L and C cancel, only R is left, and the current peaks near 10/10 = 1 A. This is resonance, at f₀ = 1/(2π√(LC)) ≈ 5 Hz."}, "try": {"th": "เปลี่ยน f เป็น 2 Hz ทายก่อนว่ากระแสสูงสุดมากขึ้นหรือน้อยลง (น้อยลง เหลือราว 0.15 A)", "en": "Set f to 2 Hz. Does the current peak go up or down? (Down, to about 0.15 A.)"}, "quiz": {"q": {"th": "ค่าสูงสุดของกระแส I ประมาณเท่าไร", "en": "About how high does the current I peak?"}, "opts": [{"th": "1 A", "en": "1 A"}, {"th": "0.14 A", "en": "0.14 A"}, {"th": "0.31 A", "en": "0.31 A"}, {"th": "0 A", "en": "0 A"}], "hint": {"th": "ถ้า X_L กับ X_C เท่ากันและหักล้างกันพอดี ความต้านรวมของวงจรเหลือเท่าไร", "en": "If X_L and X_C are equal and cancel out, what is left of the circuit's total opposition?"}, "why": {"th": "เรโซแนนซ์: ความต้านรวมเหลือแค่ R = 10 Ω กระแสสูงสุด ≈ 10/10 = 1 A", "en": "Resonance: only R = 10 Ω is left, so the current peaks at about 10/10 = 1 A."}}},
{"id": "ac_cap", "cat": "ac", "code": "CIRCUIT v1 ideal=1\nAC  2,10 2,8   E=10 f=5 name=E\nC   5,3 7,3    C=2000 name=C1\nB   11,8 11,10 R=10 name=B1\nAM  11,11 11,13 name=I\nW   2,8 2,3 5,3\nW   7,3 11,3 11,8\nW   11,10 11,11\nW   11,13 11,15 2,15 2,10", "title": {"th": "ไฟสลับผ่านตัวเก็บประจุ", "en": "AC passes a capacitor"}, "desc": {"th": "ตัวเก็บประจุ 2,000 µF อนุกรมกับหลอด 10 Ω ต่อกับไฟสลับ 10 V 5 Hz", "en": "A 2,000 µF capacitor in series with a 10 Ω bulb on 10 V peak, 5 Hz AC."}, "idea": {"th": "ไฟตรงผ่านตัวเก็บประจุไม่ได้ (ชาร์จเต็มแล้วกระแสหยุด) แต่ไฟสลับทำให้มันชาร์จกลับไปกลับมา กระแสจึงไหลผ่านหลอดได้ตลอด แม้ไม่มีประจุข้ามฉนวนเลย", "en": "DC cannot pass a capacitor (it fills up and the current stops), but AC keeps charging it one way and then the other, so current flows through the bulb all the time, although no charge ever crosses the insulator."}, "try": {"th": "เปลี่ยนแหล่งจ่ายเป็นถ่าน DC 10 V ทายก่อนว่าหลอดเป็นอย่างไร (สว่างแวบเดียวแล้วดับ)", "en": "Swap the source for a 10 V DC battery. Predict the bulb first (one quick flash, then dark)."}, "quiz": {"q": {"th": "หลอดไฟในวงจรนี้เป็นอย่างไร", "en": "What does the bulb do here?"}, "opts": [{"th": "ติด และกะพริบตามไฟสลับ", "en": "It lights, pulsing with the AC"}, {"th": "ดับตลอด เพราะตัวเก็บประจุกั้นไว้", "en": "It stays dark: the capacitor blocks it"}, {"th": "สว่างแวบเดียวแล้วดับ", "en": "One flash, then dark"}, {"th": "ระเบิด", "en": "It explodes"}], "hint": {"th": "ตัวเก็บประจุกั้นกระแสเมื่อมันชาร์จเต็ม แต่ไฟสลับกลับทิศทุกครึ่งคาบ มันมีโอกาสเต็มค้างอยู่ไหม", "en": "A capacitor blocks current once it is full. But AC reverses every half cycle: does it ever stay full?"}, "why": {"th": "ไฟสลับชาร์จกลับไปกลับมาตลอด กระแสจึงไหลผ่านหลอดได้", "en": "AC keeps charging it back and forth, so current keeps flowing through the bulb."}}},
{"id": "rect", "cat": "semi", "preset": "rect", "desc": {"th": "ไฟสลับ 10 V ผ่านไดโอดไปยังหลอด 50 Ω", "en": "10 V AC through a diode into a 50 Ω bulb."}, "idea": {"th": "ไดโอดเป็นประตูทางเดียว ครึ่งคาบที่แรงดันดันไปตามลูกศร กระแสไหล ครึ่งคาบที่สวนทาง ไดโอดปิด หลอดจึงติดครึ่งเวลา และกระแสไหลทางเดียวเสมอ", "en": "The diode is a one-way gate. In the half cycle that pushes along its arrow, current flows; in the other half it shuts. The bulb is lit half the time, and the current only ever goes one way."}, "try": {"th": "หมุนไดโอดให้กลับด้าน ทายก่อนว่าหลอดยังติดไหม และติดช่วงไหน (ยังติด แต่ไปติดอีกครึ่งคาบ)", "en": "Turn the diode around. Does the bulb still light, and when? (Yes, in the other half cycle.)"}, "quiz": {"q": {"th": "ครึ่งคาบที่ไดโอดปิด โวลต์มิเตอร์คร่อมหลอดอ่านได้เท่าไร", "en": "During the half cycle when the diode is off, what does the voltmeter across the bulb read?"}, "opts": [{"th": "0 V", "en": "0 V"}, {"th": "−10 V", "en": "−10 V"}, {"th": "10 V", "en": "10 V"}, {"th": "5 V", "en": "5 V"}], "hint": {"th": "ถ้าไม่มีกระแสผ่านหลอด V = IR ของหลอดจะเป็นเท่าไร", "en": "With no current through the bulb, what is the bulb's V = IR?"}, "why": {"th": "ไม่มีกระแส หลอดจึงไม่มีแรงดันคร่อม 0 V แรงดันทั้งหมดไปตกที่ไดโอดแทน", "en": "No current, so no voltage across the bulb: 0 V. The whole voltage sits across the diode instead."}}},
{"id": "led", "cat": "semi", "preset": "led", "desc": {"th": "LED สีแดงต่ออนุกรมกับตัวต้านทาน 150 Ω และถ่าน 5 V", "en": "A red LED in series with 150 Ω on 5 V."}, "idea": {"th": "LED ต้องการแรงดันราว 2 V จึงเริ่มนำไฟ ส่วนที่เหลือราว 3 V ตกคร่อมตัวต้านทาน กระแสจึงเป็น (5 − 2)/150 ≈ 20 mA ตัวต้านทานคือตัวจำกัดกระแสไม่ให้ LED ไหม้", "en": "The LED needs about 2 V before it conducts; the other 3 V or so falls across the resistor, so the current is (5 − 2)/150 ≈ 20 mA. The resistor limits the current so the LED does not burn."}, "try": {"th": "เปลี่ยนสี LED เป็นสีฟ้า ทายก่อนว่ากระแสมากขึ้นหรือน้อยลง (น้อยลง เพราะสีฟ้าต้องการราว 3 V)", "en": "Make the LED blue. More or less current? (Less: blue needs about 3 V.)"}, "quiz": {"q": {"th": "แอมมิเตอร์อ่านได้ประมาณเท่าไร", "en": "About what does the ammeter read?"}, "opts": [{"th": "20 mA", "en": "20 mA"}, {"th": "33 mA", "en": "33 mA"}, {"th": "0 A", "en": "0 A"}, {"th": "2 A", "en": "2 A"}], "hint": {"th": "ถ้าตัวต้านทานได้แรงดันเต็ม 5 V จะได้ 33 mA แต่ LED ก็ใช้แรงดันไปส่วนหนึ่งด้วย เหลือให้ตัวต้านทานเท่าไร", "en": "If the resistor got the full 5 V it would be 33 mA, but the LED takes part of the voltage too. How much is left for the resistor?"}, "why": {"th": "(5 − 2)/150 ≈ 20 mA", "en": "(5 − 2)/150 ≈ 20 mA"}}},
{"id": "bridge_smooth", "cat": "semi", "code": "CIRCUIT v1 ideal=1\nAC  2,10 2,8   E=10 f=5 name=E\nD   6,6 8,6    name=D1\nD   6,4 6,6    name=D3\nD   6,12 8,12  name=D2\nD   6,14 6,12  name=D4\nVM  10,7 12,7  name=V_out\nR   10,9 12,9  R=100 name=R_L\nC   10,11 12,11 C=10000 name=C1\nW   2,8 2,6 6,6\nW   2,10 2,12 6,12\nW   8,6 8,12\nW   6,4 6,2 12,2 12,16 6,16 6,14\nW   8,7 10,7\nW   8,9 10,9\nW   8,11 10,11", "title": {"th": "เรียงกระแสเต็มคลื่นแบบบริดจ์", "en": "Bridge rectifier with smoothing"}, "desc": {"th": "ไดโอดสี่ตัวต่อเป็นบริดจ์ เปลี่ยนไฟสลับ 10 V 5 Hz เป็นไฟตรง มีตัวเก็บประจุ 10,000 µF ช่วยให้เรียบ", "en": "Four diodes in a bridge turn 10 V, 5 Hz AC into DC, smoothed by a 10,000 µF capacitor."}, "idea": {"th": "ไม่ว่าแหล่งจ่ายจะหันขั้วไหน ไดโอดสองตัวจะนำไฟพาให้กระแสผ่านโหลดไปทางเดียวเสมอ ได้ไฟตรงทั้งสองครึ่งคาบ ตัวเก็บประจุเก็บประจุไว้ตอนยอดคลื่นแล้วจ่ายต่อตอนแรงดันตก V_out จึงเกือบนิ่งใกล้ 10 V", "en": "Whichever way the source points, two of the diodes conduct and steer the current through the load the same way, so both half cycles give DC. The capacitor stores charge at each peak and gives it back in between, so V_out stays near 10 V."}, "try": {"th": "พักการทำงานตัวเก็บประจุ C1 ทายก่อนว่า V_out จะเป็นอย่างไร (กระเพื่อมขึ้นลงระหว่าง 0 ถึง 10 V)", "en": "Disable C1. Predict V_out first (it bumps between 0 and 10 V)."}, "quiz": {"q": {"th": "ตอนที่แหล่งจ่ายกำลังจ่ายกระแส มีไดโอดนำไฟพร้อมกันกี่ตัว", "en": "While the source is supplying current, how many diodes conduct at once?"}, "opts": [{"th": "2 ตัว", "en": "2"}, {"th": "1 ตัว", "en": "1"}, {"th": "4 ตัว", "en": "4"}, {"th": "3 ตัว", "en": "3"}], "hint": {"th": "กระแสต้องออกจากแหล่งจ่าย ผ่านโหลด แล้วกลับเข้าแหล่งจ่าย ขาไปผ่านไดโอดหนึ่งตัว แล้วขากลับล่ะ", "en": "The current has to leave the source, cross the load and come back. One diode on the way out, and on the way back?"}, "why": {"th": "ขาไปหนึ่งตัว ขากลับอีกหนึ่งตัว รวมสองตัว อีกสองตัวถูกไบแอสกลับ", "en": "One diode on the way out and one on the way back: two. The other two are reverse-biased."}}},
{"id": "led_colors", "cat": "semi", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=5 name=E\nR   7,4 7,6    R=150\nR   11,4 11,6  R=150\nR   15,4 15,6  R=150\nLED 7,9 7,11   color=red\nLED 11,9 11,11 color=green\nLED 15,9 15,11 color=blue\nW   2,8 2,3 15,3 15,4\nW   7,3 7,4\nW   11,3 11,4\nW   7,6 7,9\nW   11,6 11,9\nW   15,6 15,9\nW   7,11 7,14\nW   11,11 11,14\nW   15,11 15,14 2,14 2,10", "title": {"th": "LED สามสี", "en": "Three LED colours"}, "desc": {"th": "LED สีแดง เขียว และฟ้า แต่ละดวงมีตัวต้านทาน 150 Ω ของตัวเอง ต่อขนานกับถ่าน 5 V", "en": "Red, green and blue LEDs, each with its own 150 Ω resistor, in parallel on 5 V."}, "idea": {"th": "LED แต่ละสีต้องการแรงดันไม่เท่ากัน แดงราว 1.9 V เขียวราว 2.2 V ฟ้าราว 3 V ตัวต้านทานได้แรงดันส่วนที่เหลือไม่เท่ากัน LED สีฟ้าจึงได้กระแสน้อยที่สุด (5 − 3)/150 ≈ 13 mA", "en": "Each colour needs a different voltage: red about 1.9 V, green about 2.2 V, blue about 3 V. Each resistor gets what is left, so the blue LED carries the least current: (5 − 3)/150 ≈ 13 mA."}, "try": {"th": "เปลี่ยนถ่านเป็น 3 V ทายก่อนว่า LED สีไหนแทบดับ (สีฟ้า)", "en": "Lower the battery to 3 V. Which LED almost goes out? (The blue one.)"}, "quiz": {"q": {"th": "LED สีไหนได้กระแสน้อยที่สุด", "en": "Which LED carries the least current?"}, "opts": [{"th": "ฟ้า", "en": "Blue"}, {"th": "แดง", "en": "Red"}, {"th": "เขียว", "en": "Green"}, {"th": "เท่ากันหมด", "en": "All the same"}], "hint": {"th": "แรงดัน 5 V แบ่งระหว่าง LED กับตัวต้านทานของมัน ถ้า LED ใช้แรงดันไปมาก ตัวต้านทานจะเหลือแรงดันเท่าไร", "en": "The 5 V is split between each LED and its resistor. If the LED takes a lot, how much is left for the resistor?"}, "why": {"th": "สีฟ้าใช้แรงดันมากที่สุด ตัวต้านทานของมันเหลือแค่ราว 2 V กระแส ≈ 13 mA น้อยที่สุด", "en": "Blue takes the most voltage, leaving only about 2 V for its resistor: ≈ 13 mA, the least."}}},
{"id": "led_blink", "cat": "semi", "code": "CIRCUIT v1 ideal=1\nAC  2,10 2,8   E=6 f=1 name=E\nR   5,3 7,3    R=100 name=R\nLED 10,8 10,10 color=red\nLED 14,10 14,8 color=green\nW   2,8 2,3 5,3\nW   7,3 14,3 14,8\nW   10,3 10,8\nW   10,10 10,13\nW   14,10 14,13 2,13 2,10", "title": {"th": "LED สองดวงกับไฟสลับ", "en": "Two LEDs on AC"}, "desc": {"th": "LED สีแดงกับสีเขียวต่อขนานกันแบบหันสวนกัน ป้อนไฟสลับ 6 V 1 Hz ผ่าน R 100 Ω", "en": "A red and a green LED side by side, facing opposite ways, on 6 V peak, 1 Hz AC through 100 Ω."}, "idea": {"th": "ครึ่งคาบแรกแรงดันดันไปตามลูกศรของ LED สีแดง ครึ่งคาบหลังกลับทิศ ไปตามลูกศรของสีเขียว LED จึงติดสลับกันทีละดวง ทำให้เห็นทิศของกระแสด้วยตา", "en": "In one half cycle the voltage pushes along the red LED's arrow; in the next it reverses and pushes along the green one's. They take turns, so you can see which way the current flows."}, "try": {"th": "เปลี่ยน f เป็น 20 Hz ทายก่อนว่าจะเห็นอะไร (กะพริบเร็วจนดูเหมือนติดทั้งคู่)", "en": "Set f to 20 Hz. What will you see? (They flicker so fast that both look lit.)"}, "quiz": {"q": {"th": "LED สองดวงติดพร้อมกันได้ไหม", "en": "Can both LEDs be lit at the same moment?"}, "opts": [{"th": "ไม่ได้ ติดทีละดวง", "en": "No, one at a time"}, {"th": "ได้ ติดพร้อมกันตลอด", "en": "Yes, always together"}, {"th": "ดับทั้งคู่ตลอด", "en": "Both stay off"}, {"th": "ติดแค่สีแดง", "en": "Only the red one lights"}], "hint": {"th": "LED แต่ละดวงยอมให้กระแสไหลทางเดียว และสองดวงนี้หันสวนกัน ในขณะหนึ่งกระแสไหลได้กี่ทิศ", "en": "Each LED passes current one way only, and these two face opposite ways. At any moment, how many directions can the current have?"}, "why": {"th": "ขณะหนึ่งกระแสมีทิศเดียว จึงผ่านได้แค่ LED ที่หันตามทิศนั้น", "en": "At any moment the current has one direction, so only the LED facing that way conducts."}}},
{"id": "diode_reverse", "cat": "semi", "code": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=9 name=E\nD   8,3 6,3    name=D1\nVM  8,5 6,5    name=V_D\nB   12,8 12,10 R=20 name=B1\nAM  12,11 12,13 name=I\nW   2,8 2,3 6,3\nW   6,3 6,5\nW   8,3 8,5\nW   8,3 12,3 12,8\nW   12,10 12,11\nW   12,13 12,15 2,15 2,10", "title": {"th": "ไดโอดกลับขั้ว", "en": "A reversed diode"}, "desc": {"th": "ไดโอดหันลูกศรสวนทางกระแสจากถ่าน 9 V มีโวลต์มิเตอร์ V_D คร่อมไดโอด", "en": "A diode pointing against the 9 V battery, with voltmeter V_D across it."}, "idea": {"th": "ไดโอดที่กลับขั้ว (ไบแอสกลับ) ไม่นำไฟ จึงเหมือนสวิตช์ที่ตัด กระแสเป็น 0 แรงดันทั้ง 9 V ของถ่านไปตกคร่อมไดโอด V_D อ่าน −9 V เพราะขั้ว + ของมิเตอร์อยู่ฝั่งศักย์ต่ำ", "en": "A reverse-biased diode does not conduct, so it acts like an open switch: no current, and the battery's whole 9 V appears across it. V_D reads −9 V because the meter's + side is on the low side."}, "try": {"th": "หมุนไดโอดให้กลับด้าน ทายก่อนว่า V_D และ I อ่านเท่าไร (0 V และ 0.45 A ในโหมดอุดมคติ)", "en": "Turn the diode around. Predict V_D and I (0 V and 0.45 A in ideal mode)."}, "quiz": {"q": {"th": "แอมมิเตอร์ I อ่านได้เท่าไร", "en": "What does ammeter I read?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "0.45 A", "en": "0.45 A"}, {"th": "0.42 A", "en": "0.42 A"}, {"th": "−0.45 A", "en": "−0.45 A"}], "hint": {"th": "ลูกศรของไดโอดชี้ทางเดียวที่กระแสไหลได้ กระแสจากขั้วบวกต้องวิ่งตามลูกศรหรือสวนลูกศร", "en": "The diode's arrow shows the only way current may go. Does the current from + have to run with the arrow or against it?"}, "why": {"th": "กระแสต้องวิ่งสวนลูกศร ไดโอดจึงปิด I = 0", "en": "The current would have to run against the arrow, so the diode stays shut: I = 0."}}},
{"id": "trans", "cat": "tr", "preset": "trans", "desc": {"th": "หม้อแปลงอัตราส่วน 1:2 รับไฟสลับ 10 V แล้วจ่ายให้ตัวต้านทาน 50 Ω", "en": "A 1:2 transformer takes 10 V AC and feeds a 50 Ω resistor."}, "idea": {"th": "ขดทุติยภูมิมีจำนวนรอบเป็น 2 เท่า แรงดันจึงเป็น 2 เท่า V_2 = 20 V (ค่าสูงสุด) โหลดได้ I_L = 20/50 = 0.4 A กำลังเข้าต้องเท่ากับกำลังออก ขดปฐมภูมิจึงดึง I_P = 0.8 A", "en": "The secondary has twice the turns, so twice the voltage: V_2 = 20 V peak. The load takes I_L = 20/50 = 0.4 A. Power in equals power out, so the primary draws I_P = 0.8 A."}, "try": {"th": "เปลี่ยน n เป็น 0.5 ทายก่อนว่า V_2 และ I_P เป็นเท่าไร (5 V และ 0.05 A)", "en": "Set n to 0.5. Predict V_2 and I_P first (5 V and 0.05 A)."}, "quiz": {"q": {"th": "ค่าสูงสุดของ I_P ประมาณเท่าไร", "en": "About how high does I_P peak?"}, "opts": [{"th": "0.8 A", "en": "0.8 A"}, {"th": "0.4 A", "en": "0.4 A"}, {"th": "0.2 A", "en": "0.2 A"}, {"th": "0 A", "en": "0 A"}], "hint": {"th": "หม้อแปลงอุดมคติไม่เสียพลังงาน V_P × I_P ต้องเท่ากับ V_2 × I_L ฝั่งเข้ามีแรงดันครึ่งเดียว กระแสฝั่งเข้าต้องเป็นเท่าไร", "en": "An ideal transformer loses nothing: V_P × I_P = V_2 × I_L. The input has half the voltage, so what must its current be?"}, "why": {"th": "10 × I_P = 20 × 0.4 ได้ I_P = 0.8 A", "en": "10 × I_P = 20 × 0.4, so I_P = 0.8 A."}}},
{"id": "step_down", "cat": "tr", "code": "CIRCUIT v1 ideal=1\nAC  3,5 3,3    E=20 f=2 name=E\nAM  4,2 6,2    name=I_P\nTP  7,5 9,5    grp=1 n=0.5 name=T1\nTS  7,6 9,6    grp=1\nAM  14,8 14,10 name=I_L\nR   14,12 14,14 R=10 name=R\nVM  18,12 18,14 name=V_2\nGND 1,5 1,7\nW   3,3 3,2 4,2\nW   6,2 7,2 7,5\nW   3,5 1,5 1,1 11,1 11,5 9,5\nW   9,6 9,8 14,8\nW   14,10 14,12\nW   14,14 14,16 7,16 7,6\nW   14,12 18,12\nW   14,14 18,14", "title": {"th": "หม้อแปลงลดแรงดัน", "en": "Step-down transformer"}, "desc": {"th": "หม้อแปลงอัตราส่วน 2:1 (n = 0.5) ลดไฟสลับ 20 V เหลือ 10 V ให้ตัวต้านทาน 10 Ω", "en": "A 2:1 transformer (n = 0.5) steps 20 V AC down to 10 V for a 10 Ω resistor."}, "idea": {"th": "แรงดันลดลงตามจำนวนรอบ V_2 = 0.5 × 20 = 10 V แต่กระแสกลับกัน ฝั่งโหลดได้ I_L = 1 A ส่วนฝั่งเข้าดึงแค่ I_P = 0.5 A เหมือนเฟืองทดที่แลกแรงกับความเร็ว", "en": "The voltage drops with the turns, V_2 = 0.5 × 20 = 10 V, but the current goes the other way: the load gets I_L = 1 A while the input draws only I_P = 0.5 A, like gears trading speed for force."}, "try": {"th": "ลด R เป็น 5 Ω ทายก่อนว่า I_P สูงสุดเป็นเท่าไร (1 A)", "en": "Lower R to 5 Ω. Predict the peak of I_P first (1 A)."}, "quiz": {"q": {"th": "ค่าสูงสุดของ V_2 เท่าไร", "en": "What is the peak of V_2?"}, "opts": [{"th": "10 V", "en": "10 V"}, {"th": "20 V", "en": "20 V"}, {"th": "40 V", "en": "40 V"}, {"th": "5 V", "en": "5 V"}], "hint": {"th": "n = N₂/N₁ = 0.5 แปลว่าขดออกมีรอบเป็นครึ่งหนึ่งของขดเข้า และแรงดันต่อรอบเท่ากันทั้งสองขด", "en": "n = N₂/N₁ = 0.5 means the output coil has half the turns, and both coils have the same voltage per turn."}, "why": {"th": "V_2 = n × V_1 = 0.5 × 20 = 10 V", "en": "V_2 = n × V_1 = 0.5 × 20 = 10 V"}}},
{"id": "boom", "cat": "real", "preset": "boom", "desc": {"th": "ตัวต้านทาน 10 Ω พิกัด 2 W ต่อกับถ่าน 9 V ผ่านสวิตช์ที่ตัดอยู่ (โหมดจริง)", "en": "A 10 Ω, 2 W resistor on a 9 V battery through an open switch (real mode)."}, "idea": {"th": "เมื่อแตะสวิตช์ กระแสราว 9/10.6 ≈ 0.85 A ทำให้ P = I²R ≈ 7 W เกินพิกัด 2 W ไปมาก ตัวต้านทานร้อนขึ้นเรื่อยๆ จนถึง 200 °C แล้วไหม้และระเบิด", "en": "Tap the switch: about 9/10.6 ≈ 0.85 A flows and P = I²R ≈ 7 W, far over the 2 W rating. The resistor heats up until it reaches 200 °C, then burns out and explodes."}, "try": {"th": "เปลี่ยน R เป็น 47 Ω แล้วแตะสวิตช์ ทายก่อนว่ายังระเบิดไหม (ไม่ระเบิด P ≈ 1.7 W)", "en": "Set R to 47 Ω and close the switch. Does it still explode? (No: P ≈ 1.7 W.)"}, "quiz": {"q": {"th": "ทำไมตัวต้านทานจึงระเบิด", "en": "Why does the resistor explode?"}, "opts": [{"th": "กำลัง I²R เกินพิกัด 2 W", "en": "The power I²R goes over its 2 W rating"}, {"th": "แรงดันเกิน 9 V", "en": "The voltage goes over 9 V"}, {"th": "กระแสไหลกลับทิศ", "en": "The current reverses"}, {"th": "สวิตช์ลัดวงจร", "en": "The switch shorts it"}], "hint": {"th": "พิกัดของตัวต้านทานบอกเป็นวัตต์ ลองคำนวณ P = I²R ด้วยกระแสราว 0.85 A แล้วเทียบกับ 2 W", "en": "A resistor's rating is in watts. Work out P = I²R with about 0.85 A and compare it with 2 W."}, "why": {"th": "P = 0.85² × 10 ≈ 7 W เกิน 2 W ราว 3.5 เท่า", "en": "P = 0.85² × 10 ≈ 7 W, about 3.5 times the 2 W rating."}}},
{"id": "fuse", "cat": "real", "preset": "fuse", "desc": {"th": "หลอด 24 Ω ต่อกับถ่าน 12 V ผ่านฟิวส์ 2 A มีสวิตช์คร่อมหลอดไว้สำหรับทำให้ลัดวงจร (โหมดจริง)", "en": "A 24 Ω bulb on 12 V through a 2 A fuse, with a switch across the bulb to cause a short (real mode)."}, "idea": {"th": "ปกติหลอดใช้ 0.5 A ฟิวส์อยู่สบาย พอแตะสวิตช์ กระแสลัดผ่านสวิตช์ได้หลายสิบแอมป์ เพราะเหลือแค่ความต้านทานภายในถ่าน ฟิวส์ร้อนจนขาดในเสี้ยววินาที ตัดวงจรก่อนถ่านหรือสายไฟจะเสียหาย", "en": "Normally the bulb takes 0.5 A and the fuse is fine. Tap the switch: tens of amps rush through it, since only the battery's internal resistance is left, and the fuse melts within a fraction of a second, cutting the circuit before the battery or the wires are damaged."}, "try": {"th": "เปลี่ยนพิกัดฟิวส์เป็น 30 A แล้วแตะสวิตช์ ทายก่อนว่าอะไรเสียหายแทน (ถ่านร้อนจนระเบิด)", "en": "Raise the fuse to 30 A and close the switch. What gets damaged instead? (The battery overheats and explodes.)"}, "quiz": {"q": {"th": "ตอนลัดวงจร ทำไมฟิวส์ขาดก่อนอย่างอื่น", "en": "During the short, why does the fuse blow first?"}, "opts": [{"th": "มันถูกทำให้ทนกระแสได้น้อยที่สุดในวงจร", "en": "It is made to take the least current in the circuit"}, {"th": "มันมีความต้านทานสูงที่สุด", "en": "It has the highest resistance"}, {"th": "มันอยู่ใกล้ถ่านที่สุด", "en": "It is closest to the battery"}, {"th": "กระแสในฟิวส์มากกว่าที่อื่น", "en": "More current flows in it than elsewhere"}], "hint": {"th": "ในทางเดินเดียวกัน กระแสเท่ากันทุกจุด ถ้ากระแสเท่ากัน อะไรทำให้ชิ้นหนึ่งพังก่อนชิ้นอื่น", "en": "Along one path the current is the same everywhere. With the same current, what makes one part fail before the others?"}, "why": {"th": "ฟิวส์มีพิกัดต่ำที่สุดโดยตั้งใจ จึงขาดก่อนเสมอ", "en": "The fuse has the lowest rating on purpose, so it always goes first."}}},
{"id": "short", "cat": "real", "preset": "short", "desc": {"th": "เหมือนวงจรฟิวส์แต่ไม่มีฟิวส์ มีสวิตช์คร่อมหลอดไว้ (โหมดจริง)", "en": "Like the fuse circuit but with no fuse; a switch sits across the bulb (real mode)."}, "idea": {"th": "แตะสวิตช์ กระแสวิ่งผ่านสวิตช์แทนหลอด เหลือแค่ความต้านทานภายในถ่าน 0.5 Ω กระแสพุ่งถึงราว 18 A ความร้อนในถ่าน P = I²r ≈ 160 W เกินพิกัดมาก ถ่านร้อนจัดจนระเบิด", "en": "Tap the switch: the current takes the switch instead of the bulb, and only the battery's 0.5 Ω is left. About 18 A flows, heating the battery with P = I²r ≈ 160 W, far over its rating, until it explodes."}, "try": {"th": "เพิ่มฟิวส์ 2 A อนุกรมกับถ่านแล้วลองใหม่ ทายก่อนว่าถ่านรอดไหม (รอด ฟิวส์ขาดก่อน)", "en": "Add a 2 A fuse in series with the battery and try again. Does the battery survive? (Yes, the fuse blows first.)"}, "quiz": {"q": {"th": "ตอนสวิตช์ต่อ หลอดไฟเป็นอย่างไร", "en": "With the switch closed, what does the bulb do?"}, "opts": [{"th": "ดับ เพราะกระแสอ้อมผ่านสวิตช์", "en": "It goes dark: the current bypasses it through the switch"}, {"th": "สว่างขึ้นมาก", "en": "It gets much brighter"}, {"th": "สว่างเท่าเดิม", "en": "It stays the same"}, {"th": "ระเบิด", "en": "It explodes"}], "hint": {"th": "สวิตช์ที่ต่อแทบไม่มีความต้านทาน และมันคร่อมหลอดอยู่พอดี แรงดันคร่อมหลอดจึงเหลือเท่าไร", "en": "A closed switch has almost no resistance and sits right across the bulb. So what voltage is left across the bulb?"}, "why": {"th": "สวิตช์ลัดหลอดไว้ หลอดได้แรงดันเกือบ 0 จึงดับ ส่วนถ่านรับกระแสมหาศาลแทน", "en": "The switch shorts the bulb, which gets almost no voltage and goes dark, while the battery takes a huge current."}}},
{"id": "led_burn", "cat": "real", "code": "CIRCUIT v1 ideal=0\nDC  2,10 2,8   E=9 r=0.5 name=E\nAM  6,3 8,3    name=I\nLED 10,8 10,10\nW   2,8 2,3 6,3\nW   8,3 10,3 10,8\nW   10,10 10,13 2,13 2,10", "title": {"th": "LED ไม่มีตัวต้านทาน", "en": "An LED with no resistor"}, "desc": {"th": "LED ต่อตรงกับถ่าน 9 V ไม่มีตัวต้านทานจำกัดกระแส (โหมดจริง)", "en": "An LED straight across a 9 V battery, with no resistor to limit the current (real mode)."}, "idea": {"th": "LED ต้องการแค่ราว 2 V ส่วนที่เหลือไม่มีอะไรรับไว้ กระแสจึงพุ่งหลายแอมป์ ทั้งที่ LED ทนได้ราว 20 mA มันจึงไหม้ทันทีที่เริ่มจำลอง", "en": "An LED only needs about 2 V and nothing takes up the rest, so several amps rush through a part made for about 20 mA. It burns out the moment the simulation starts."}, "try": {"th": "เพิ่มตัวต้านทาน 330 Ω อนุกรม แล้วซ่อม LED ทายก่อนว่ากระแสเป็นเท่าไร (ราว 21 mA)", "en": "Add a 330 Ω resistor in series and repair the LED. Predict the current first (about 21 mA)."}, "quiz": {"q": {"th": "ทำไม LED จึงไหม้", "en": "Why does the LED burn out?"}, "opts": [{"th": "ไม่มีอะไรจำกัดกระแส", "en": "Nothing limits the current"}, {"th": "แรงดันกลับขั้ว", "en": "The voltage is reversed"}, {"th": "LED ใช้กับไฟตรงไม่ได้", "en": "LEDs cannot run on DC"}, {"th": "ถ่านหมด", "en": "The battery is flat"}], "hint": {"th": "ถ้า LED ใช้แรงดันแค่ราว 2 V อีก 7 V ไปตกคร่อมอะไร เมื่อไม่มีตัวต้านทาน", "en": "If the LED takes only about 2 V, what takes the other 7 V when there is no resistor?"}, "why": {"th": "ไม่มีตัวต้านทาน 7 V ที่เหลือดันกระแสหลายแอมป์ผ่าน LED", "en": "With no resistor, the leftover 7 V drives several amps through the LED."}}},
{"id": "cap_burst", "cat": "real", "code": "CIRCUIT v1 ideal=0\nDC  2,10 2,8   E=12 name=E\nR   5,3 7,3    R=100 Pmax=10 name=R\nC   11,8 11,10 C=1000 Vmax=6 name=C1\nVM  14,8 14,10 name=V_C\nW   2,8 2,3 5,3\nW   7,3 11,3 11,8\nW   11,8 14,8\nW   11,10 14,10\nW   11,10 11,13 2,13 2,10", "title": {"th": "ตัวเก็บประจุเกินพิกัดแรงดัน", "en": "A capacitor over its voltage rating"}, "desc": {"th": "ตัวเก็บประจุพิกัด 6 V ถูกชาร์จด้วยถ่าน 12 V ผ่าน R 100 Ω (โหมดจริง)", "en": "A 6 V-rated capacitor charged from 12 V through 100 Ω (real mode)."}, "idea": {"th": "แรงดันของตัวเก็บประจุไต่ขึ้นหา 12 V แต่ฉนวนข้างในทนได้แค่ 6 V พอเกินพิกัด ฉนวนเริ่มพัง ร้อนขึ้น แล้วตัวเก็บประจุระเบิด", "en": "The capacitor voltage climbs toward 12 V, but its insulation only takes 6 V. Once over the rating the insulation starts to fail, heats up, and the capacitor bursts."}, "try": {"th": "เปลี่ยน Vmax เป็น 16 V แล้วซ่อม ทายก่อนว่าแรงดันสุดท้ายเป็นเท่าไร (12 V และไม่ระเบิด)", "en": "Set Vmax to 16 V and repair it. Predict the final voltage first (12 V, no burst)."}, "quiz": {"q": {"th": "ควรเลือกตัวเก็บประจุพิกัดแรงดันเท่าไร สำหรับถ่าน 12 V", "en": "What voltage rating should a capacitor on a 12 V battery have?"}, "opts": [{"th": "มากกว่า 12 V เช่น 16 V", "en": "More than 12 V, e.g. 16 V"}, {"th": "6 V ก็พอ", "en": "6 V is enough"}, {"th": "น้อยกว่า 12 V", "en": "Less than 12 V"}, {"th": "ไม่สำคัญ", "en": "It does not matter"}], "hint": {"th": "เมื่อชาร์จเต็ม แรงดันของตัวเก็บประจุเท่ากับแรงดันของถ่าน พิกัดต้องสูงกว่าหรือต่ำกว่าค่านั้น", "en": "Fully charged, the capacitor sits at the battery voltage. Must its rating be above or below that?"}, "why": {"th": "ชาร์จเต็มได้ 12 V พิกัดต้องสูงกว่า 12 V และเผื่อไว้ด้วย", "en": "Fully charged it reaches 12 V, so the rating must be above 12 V, with some margin."}}}
];
// lesson extras for the circuits and ideas of knowledge.js: an everyday comparison (ana) and a quiz (first option right)
const LESSON = {
  "circ": {
    "series": {"ana": {"th": "เหมือนท่อน้ำเส้นเดียวที่มีก๊อกสองตัวต่อกัน น้ำต้องผ่านทั้งสองตัว และไหลเท่ากันตลอดเส้น", "en": "Like one water pipe with two taps in a row: the water must pass both, and the flow is the same all along."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V_R2 อ่านได้เท่าไร", "en": "What does voltmeter V_R2 read?"}, "opts": [{"th": "6 V", "en": "6 V"}, {"th": "3 V", "en": "3 V"}, {"th": "9 V", "en": "9 V"}, {"th": "4.5 V", "en": "4.5 V"}], "hint": {"th": "กระแสเท่ากันในตัวต้านทานทั้งสอง และ R2 ใหญ่กว่า R1 สองเท่า แรงดันของมันควรเท่ากับของ R1 ไหม", "en": "The same current flows in both resistors, and R2 is twice R1. Should its voltage equal R1's?"}, "why": {"th": "V = IR = 0.03 × 200 = 6 V", "en": "V = IR = 0.03 × 200 = 6 V"}}},
    "parallel": {"ana": {"th": "เหมือนถนนที่แยกเป็นหลายเลนแล้วมาบรรจบกัน รถในทุกเลนรวมกันเท่ากับรถบนถนนหลัก", "en": "Like a road that splits into lanes and joins again: the cars in all the lanes add up to the cars on the main road."}, "quiz": {"q": {"th": "แอมมิเตอร์ I_total อ่านได้เท่าไร", "en": "What does ammeter I_total read?"}, "opts": [{"th": "0.5 A", "en": "0.5 A"}, {"th": "0.3 A", "en": "0.3 A"}, {"th": "0.1 A", "en": "0.1 A"}, {"th": "0.25 A", "en": "0.25 A"}], "hint": {"th": "กระแส I_1 กับ I_2 มาจากไหน ทั้งคู่ต้องผ่าน I_total ก่อนจะแยกสาขาไหม", "en": "Where do I_1 and I_2 come from? Don't both pass I_total before they split?"}, "why": {"th": "I_total = I_1 + I_2 = 0.3 + 0.2 = 0.5 A", "en": "I_total = I_1 + I_2 = 0.3 + 0.2 = 0.5 A"}}},
    "mixed": {"ana": {"th": "เหมือนถนนเส้นเดียว (R1) ที่ไปแยกเป็นสองซอย (R2 และ R3) รถทุกคันต้องผ่าน R1 ก่อน แล้วแบ่งกันเข้าซอย", "en": "Like one road (R1) that splits into two lanes (R2 and R3): every car passes R1 first, then they share the lanes."}, "quiz": {"q": {"th": "แอมมิเตอร์ I_2 อ่านได้เท่าไร", "en": "What does ammeter I_2 read?"}, "opts": [{"th": "0.4 A", "en": "0.4 A"}, {"th": "0.6 A", "en": "0.6 A"}, {"th": "0.2 A", "en": "0.2 A"}, {"th": "0.3 A", "en": "0.3 A"}], "hint": {"th": "กระแส 0.6 A แยกเป็นสองสาขา R2 = 30 Ω ต้านน้อยกว่า R3 = 60 Ω สาขาของ R2 ควรได้มากกว่าหรือน้อยกว่าครึ่ง", "en": "The 0.6 A splits into two branches. R2 = 30 Ω resists less than R3 = 60 Ω: should R2's branch get more or less than half?"}, "why": {"th": "V_A = 12 V จึงได้ I_2 = 12/30 = 0.4 A (เป็นสองเท่าของ I_3)", "en": "V_A = 12 V, so I_2 = 12/30 = 0.4 A (twice I_3)."}}},
    "divider": {"ana": {"th": "เหมือนบันไดสองขั้นที่สูงไม่เท่ากัน ความสูงรวมเท่ากับแรงดันของถ่าน ตัวต้านทานที่มากกว่าคือขั้นที่สูงกว่า", "en": "Like two steps of different heights: together they make the battery's voltage, and the bigger resistor is the taller step."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V_out อ่านได้เท่าไร", "en": "What does voltmeter V_out read?"}, "opts": [{"th": "4 V", "en": "4 V"}, {"th": "6 V", "en": "6 V"}, {"th": "10 V", "en": "10 V"}, {"th": "5 V", "en": "5 V"}], "hint": {"th": "V_R1 กับ V_out รวมกันต้องเท่ากับ 10 V ของถ่าน ถ้า V_R1 = 6 V จะเหลือให้ V_out เท่าไร", "en": "V_R1 and V_out must add up to the battery's 10 V. If V_R1 = 6 V, what is left for V_out?"}, "why": {"th": "V_out = 10 × 200/500 = 4 V", "en": "V_out = 10 × 200/500 = 4 V"}}},
    "short_resistor": {"ana": {"th": "เหมือนมีทางเลี่ยงฟรีข้างด่านเก็บเงิน รถทุกคันเลือกทางเลี่ยง ด่านจึงว่างเปล่า", "en": "Like a free bypass next to a toll gate: every car takes the bypass, so the gate sees no one."}, "quiz": {"q": {"th": "แอมมิเตอร์ I_R2 อ่านได้เท่าไร", "en": "What does ammeter I_R2 read?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "0.09 A", "en": "0.09 A"}, {"th": "0.045 A", "en": "0.045 A"}, {"th": "0.03 A", "en": "0.03 A"}], "hint": {"th": "สายที่ลัดคร่อม R2 ไม่มีความต้านทาน แรงดันคร่อม R2 จึงเป็น 0 ถ้า V = 0 แล้ว I = V/R เป็นเท่าไร", "en": "The wire across R2 has no resistance, so the voltage across R2 is 0. With V = 0, what is I = V/R?"}, "why": {"th": "กระแสทั้งหมดไปทางสาย R2 ได้ 0 A", "en": "All the current takes the wire, R2 gets 0 A."}}},
    "short_source": {"ana": {"th": "เหมือนเปิดก๊อกน้ำที่ไม่มีสายยางต่อเลย น้ำพุ่งออกเต็มแรง ไม่มีอะไรมาชะลอ", "en": "Like opening a tap with no hose: the water gushes out with nothing to slow it."}, "quiz": {"q": {"th": "กระแสลัดวงจรประมาณเท่าไร", "en": "About how large is the short-circuit current?"}, "opts": [{"th": "18 A", "en": "18 A"}, {"th": "9 A", "en": "9 A"}, {"th": "0 A", "en": "0 A"}, {"th": "4.5 A", "en": "4.5 A"}], "hint": {"th": "วงจรเหลือแค่ความต้านทานภายในของถ่าน 0.5 Ω ลองใช้ I = E/r", "en": "Only the battery's internal 0.5 Ω is left in the loop. Try I = E/r."}, "why": {"th": "I = 9/0.5 = 18 A", "en": "I = 9/0.5 = 18 A"}}},
    "open_switch": {"ana": {"th": "เหมือนสะพานที่ถูกยกขึ้น รถข้ามไม่ได้ ทุกคันต้องจอดนิ่งทั้งเส้นทาง", "en": "Like a raised drawbridge: no car can cross, so traffic stops along the whole road."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V_S ที่คร่อมสวิตช์ซึ่งตัดอยู่ อ่านได้เท่าไร", "en": "What does voltmeter V_S across the open switch read?"}, "opts": [{"th": "9 V", "en": "9 V"}, {"th": "0 V", "en": "0 V"}, {"th": "4.5 V", "en": "4.5 V"}, {"th": "−9 V", "en": "−9 V"}], "hint": {"th": "ไม่มีกระแส ตัวต้านทานจึงไม่มีแรงดันคร่อม (V = IR = 0) แล้วแรงดัน 9 V ของถ่านไปอยู่ตรงไหน", "en": "With no current, the resistor has no voltage across it (V = IR = 0). So where is the battery's 9 V?"}, "why": {"th": "แรงดันทั้งหมดไปตกคร่อมช่องที่ขาด V_S = 9 V", "en": "The whole voltage sits across the gap: V_S = 9 V."}}},
    "rc": {"ana": {"th": "เหมือนเติมน้ำใส่ถังผ่านสายยางเล็ก ตอนแรกไหลแรง พอน้ำในถังสูงขึ้นก็ดันสวนกลับ น้ำจึงไหลช้าลงเรื่อยๆ", "en": "Like filling a tank through a thin hose: fast at first, then slower and slower as the water in the tank pushes back."}, "quiz": {"q": {"th": "นานพอแล้ว แอมมิเตอร์ I อ่านได้เท่าไร", "en": "After a long time, what does ammeter I read?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "9 mA", "en": "9 mA"}, {"th": "4.5 mA", "en": "4.5 mA"}, {"th": "1 mA", "en": "1 mA"}], "hint": {"th": "เมื่อ V_C ขึ้นไปเท่ากับแรงดันของถ่าน ความต่างศักย์คร่อมตัวต้านทานเหลือเท่าไร", "en": "When V_C has risen to the battery voltage, what voltage is left across the resistor?"}, "why": {"th": "ชาร์จเต็มแล้ว ไม่มีแรงดันเหลือดันกระแส I = 0", "en": "Fully charged, nothing is left to push current: I = 0."}}},
    "rl": {"ana": {"th": "เหมือนเข็นล้อหนัก ตอนแรกหมุนยาก ค่อยๆ เร็วขึ้น และพอหมุนแล้วก็หยุดทันทีไม่ได้", "en": "Like pushing a heavy flywheel: hard to start, it speeds up slowly, and once spinning it cannot stop at once."}, "quiz": {"q": {"th": "นานพอแล้ว โวลต์มิเตอร์ V_L อ่านได้เท่าไร", "en": "After a long time, what does voltmeter V_L read?"}, "opts": [{"th": "0 V", "en": "0 V"}, {"th": "9 V", "en": "9 V"}, {"th": "4.5 V", "en": "4.5 V"}, {"th": "0.9 V", "en": "0.9 V"}], "hint": {"th": "ตัวเหนี่ยวนำสร้างแรงดันเมื่อกระแสเปลี่ยน (V_L = L·ΔI/Δt) ถ้ากระแสคงที่แล้ว ΔI = 0 แรงดันจะเป็นเท่าไร", "en": "An inductor makes a voltage only while the current changes (V_L = L·ΔI/Δt). Once the current is steady, ΔI = 0: what is the voltage?"}, "why": {"th": "กระแสคงที่ ตัวเหนี่ยวนำเหมือนสายไฟ V_L = 0", "en": "With a steady current the inductor acts like a wire: V_L = 0."}}},
    "halfwave": {"ana": {"th": "เหมือนประตูหมุนทางเดียวที่สถานีรถไฟ คนเดินผ่านได้ทางเดียว อีกทางล็อกไว้", "en": "Like a one-way turnstile at a station: people pass one way, the other way is locked."}, "quiz": {"q": {"th": "ครึ่งคาบที่ไดโอดไม่นำไฟ V_R อ่านได้เท่าไร", "en": "In the half cycle when the diode is off, what does V_R read?"}, "opts": [{"th": "0 V", "en": "0 V"}, {"th": "−10 V", "en": "−10 V"}, {"th": "10 V", "en": "10 V"}, {"th": "5 V", "en": "5 V"}], "hint": {"th": "ถ้าไม่มีกระแสผ่านตัวต้านทาน V = IR ของมันจะเป็นเท่าไร", "en": "With no current through the resistor, what is its V = IR?"}, "why": {"th": "ไม่มีกระแส V_R = 0 แรงดันลบทั้งหมดไปอยู่ที่ไดโอด", "en": "No current, so V_R = 0: the negative half sits across the diode."}}},
    "transformer": {"ana": {"th": "เหมือนเฟืองสองตัวที่ขนาดไม่เท่ากัน ฝั่งหนึ่งได้แรงมาก อีกฝั่งได้ความเร็วมาก แต่งานที่ส่งผ่านเท่ากัน", "en": "Like two gears of different sizes: one side gets more force, the other more speed, but the work passed on is the same."}, "quiz": {"q": {"th": "ค่าสูงสุดของ V_S (ด้านทุติยภูมิ) เท่าไร", "en": "What is the peak of V_S (the secondary)?"}, "opts": [{"th": "20 V", "en": "20 V"}, {"th": "10 V", "en": "10 V"}, {"th": "5 V", "en": "5 V"}, {"th": "40 V", "en": "40 V"}], "hint": {"th": "อัตราส่วน 1:2 แปลว่าขดออกมีรอบเป็นสองเท่า และแรงดันต่อรอบเท่ากันทั้งสองขด", "en": "A 1:2 ratio means the output coil has twice the turns, and both coils have the same voltage per turn."}, "why": {"th": "V_S = 2 × 10 = 20 V", "en": "V_S = 2 × 10 = 20 V"}}},
    "led": {"ana": {"th": "เหมือนประตูที่ต้องดันแรงพอจึงจะเปิด (ราว 2 V) ตัวต้านทานคือคนคุมทางเข้าที่ปล่อยคนเข้าทีละน้อย ไม่ให้เบียดจนประตูพัง", "en": "Like a door that only opens with a firm push (about 2 V); the resistor is the usher who lets people in a few at a time so the door does not break."}, "quiz": {"q": {"th": "โวลต์มิเตอร์ V_LED อ่านได้ประมาณเท่าไร", "en": "About what does voltmeter V_LED read?"}, "opts": [{"th": "2.2 V", "en": "2.2 V"}, {"th": "9 V", "en": "9 V"}, {"th": "0 V", "en": "0 V"}, {"th": "6.8 V", "en": "6.8 V"}], "hint": {"th": "LED ที่นำไฟมีแรงดันตกคร่อมเกือบคงที่ตามสีของมัน ส่วนที่เหลือไปอยู่ที่ตัวต้านทาน ถ้า LED ได้ 9 V ตัวต้านทานจะเหลือเท่าไร", "en": "A conducting LED has an almost fixed drop that depends on its colour; the rest goes to the resistor. If the LED had 9 V, what would be left for the resistor?"}, "why": {"th": "LED สีเขียวตกราว 2.2 V ตัวต้านทานได้ 6.8 V", "en": "The green LED drops about 2.2 V and the resistor gets 6.8 V."}}},
    "fuse_blow": {"ana": {"th": "เหมือนจุดอ่อนที่ออกแบบไว้ให้ขาดก่อน แบบเชือกนิรภัยที่ขาดก่อนเครื่องจักรจะพัง", "en": "Like a weak link made to snap first, the way a safety cord breaks before the machine does."}, "quiz": {"q": {"th": "เมื่อฟิวส์ขาดแล้ว การ์ดของ E1 แสดงกระแสเท่าไร", "en": "Once the fuse has blown, what current does E1's card show?"}, "opts": [{"th": "0 A", "en": "0 A"}, {"th": "0.85 A", "en": "0.85 A"}, {"th": "0.5 A", "en": "0.5 A"}, {"th": "18 A", "en": "18 A"}], "hint": {"th": "ฟิวส์ขาดคือวงจรขาดตรงนั้น วงจรนี้มีทางอื่นให้กระแสไหลไหม", "en": "A blown fuse is a break in the circuit. Is there any other path for the current here?"}, "why": {"th": "วงจรมีทางเดียว ฟิวส์ขาดแล้วกระแสเป็น 0 A", "en": "There is only one path, so once the fuse blows the current is 0 A."}}}
  },
  "con": {
    "node": {"ana": {"th": "เหมือนห้องโถงเดียวที่มีหลายประตู ทุกมุมของห้องอยู่ชั้นเดียวกัน ระดับเดียวกัน", "en": "Like one hall with many doors: every corner of the hall is on the same floor, at the same level."}, "quiz": {"q": {"th": "จุดสองจุดที่ต่อกันด้วยสายไฟเปล่าๆ (ไม่มีอุปกรณ์คั่น) มีความต่างศักย์เท่าไร", "en": "Two points joined by a bare wire (no part between them): what is the potential difference?"}, "opts": [{"th": "0 V", "en": "0 V"}, {"th": "เท่ากับแรงดันของถ่าน", "en": "The battery voltage"}, {"th": "ขึ้นกับความยาวสาย", "en": "It depends on the wire length"}, {"th": "ขึ้นกับกระแส", "en": "It depends on the current"}], "hint": {"th": "สายไฟในแผงนี้ไม่มีความต้านทาน V = IR ของสายจึงเป็นเท่าไร ไม่ว่ากระแสจะมากแค่ไหน", "en": "Wires on this board have no resistance. So what is V = IR for a wire, however large the current?"}, "why": {"th": "จุดที่ต่อด้วยสายอยู่ในโหนดเดียวกัน ศักย์เท่ากัน ความต่างศักย์ 0 V", "en": "Points joined by a wire are one node with one potential: 0 V apart."}}},
    "ground": {"ana": {"th": "เหมือนระดับน้ำทะเลที่ใช้วัดความสูงของภูเขา เลือกจุดศูนย์ไว้หนึ่งจุด แล้ววัดทุกที่เทียบกับมัน", "en": "Like sea level for measuring mountains: pick one zero, then measure everything from it."}, "quiz": {"q": {"th": "ย้ายจุดกราวไปที่อื่นในวงจร อะไรเปลี่ยนไป", "en": "Move the ground somewhere else in the circuit. What changes?"}, "opts": [{"th": "ศักย์ของแต่ละจุด แต่ความต่างศักย์และกระแสเท่าเดิม", "en": "The potential of each point, but not the differences or the currents"}, {"th": "กระแสทุกเส้นเปลี่ยน", "en": "Every current changes"}, {"th": "หลอดไฟสว่างขึ้น", "en": "The bulbs get brighter"}, {"th": "ไม่มีอะไรเปลี่ยนเลย แม้แต่ศักย์", "en": "Nothing at all, not even the potentials"}], "hint": {"th": "กราวคือการเลือกว่าจุดศูนย์ของไม้บรรทัดอยู่ตรงไหน เลื่อนจุดศูนย์แล้วโต๊ะยาวขึ้นไหม", "en": "Ground picks where the ruler's zero is. Move the zero: does the table get longer?"}, "why": {"th": "ศักย์ทุกจุดเลื่อนไปเท่ากัน ความต่างศักย์และกระแสจึงไม่เปลี่ยน", "en": "Every potential shifts by the same amount, so the differences and the currents stay the same."}}},
    "kcl": {"ana": {"th": "น้ำที่ไหลเข้าทางแยกต้องเท่ากับน้ำที่ไหลออก ไม่มีน้ำหายไปหรือเกิดขึ้นที่ทางแยก", "en": "The water flowing into a junction equals the water flowing out: none appears or vanishes there."}, "quiz": {"q": {"th": "ที่จุดแยก มีกระแสเข้า 0.6 A ออกไปทางหนึ่ง 0.4 A อีกทางออกเท่าไร", "en": "At a junction 0.6 A flows in and 0.4 A leaves one way. How much leaves the other way?"}, "opts": [{"th": "0.2 A", "en": "0.2 A"}, {"th": "0.6 A", "en": "0.6 A"}, {"th": "1 A", "en": "1 A"}, {"th": "0.4 A", "en": "0.4 A"}], "hint": {"th": "ประจุไม่สะสมที่จุดแยก ที่ไหลเข้ามาต้องไหลออกไปให้หมด ถ้าออกอีกทาง 0.6 A รวมจะออกเท่าไร", "en": "Charge does not pile up at a junction: all that comes in must go out. If 0.6 A left the other way, how much would leave in total?"}, "why": {"th": "0.6 = 0.4 + 0.2 A", "en": "0.6 = 0.4 + 0.2 A"}}},
    "kvl": {"ana": {"th": "เหมือนเดินขึ้นลงเขาเป็นวงแล้วกลับมาที่เดิม ความสูงที่ขึ้นรวมกันเท่ากับที่ลงพอดี", "en": "Like a round hike: you end where you started, so all the climbing equals all the descending."}, "quiz": {"q": {"th": "วงจรอนุกรมมีถ่าน 9 V และตัวต้านทานสองตัว ตัวแรกได้ 3 V ตัวที่สองได้เท่าไร", "en": "A series loop has a 9 V battery and two resistors. The first gets 3 V; what does the second get?"}, "opts": [{"th": "6 V", "en": "6 V"}, {"th": "9 V", "en": "9 V"}, {"th": "3 V", "en": "3 V"}, {"th": "12 V", "en": "12 V"}], "hint": {"th": "เดินรอบลูปแล้วกลับมาที่จุดเดิม แรงดันที่ถ่านยกขึ้นต้องเท่ากับที่ตัวต้านทานลดลงรวมกัน", "en": "Walk around the loop back to the start: what the battery lifts must equal what the resistors drop together."}, "why": {"th": "9 = 3 + 6 V", "en": "9 = 3 + 6 V"}}},
    "open": {"ana": {"th": "เหมือนสะพานขาด รถข้ามไม่ได้ ไม่ว่าจะดันแรงแค่ไหน", "en": "Like a broken bridge: no car gets across, however hard it pushes."}, "quiz": {"q": {"th": "วงจรอนุกรมขาดที่จุดหนึ่ง กระแสในวงจรนั้นเป็นเท่าไร", "en": "A series circuit is broken at one point. What is the current in it?"}, "opts": [{"th": "0 A ทุกจุด", "en": "0 A everywhere"}, {"th": "0 A เฉพาะหลังจุดที่ขาด", "en": "0 A only after the break"}, {"th": "ลดลงครึ่งหนึ่ง", "en": "Half of before"}, {"th": "เท่าเดิม", "en": "Unchanged"}], "hint": {"th": "ถ้ากระแสยังไหลอยู่ก่อนถึงจุดที่ขาด ประจุจะไปกองอยู่ที่ไหน", "en": "If current still flowed up to the break, where would the charge pile up?"}, "why": {"th": "ประจุสะสมที่จุดขาดไม่ได้ กระแสจึงหยุดทั้งวง", "en": "Charge cannot pile up at the gap, so the current stops all around the loop."}}},
    "short": {"ana": {"th": "เหมือนมีทางลัดที่ไม่มีด่าน รถทั้งหมดเลือกทางลัด ทางหลักจึงว่างเปล่า", "en": "Like a shortcut with no toll: all the traffic takes it and the main road empties."}, "quiz": {"q": {"th": "ในวงจรหลอดสองดวงต่ออนุกรม ต่อสายไฟคร่อมหลอดดวงหนึ่ง ดวงนั้นเป็นอย่างไร", "en": "In a two-bulb series circuit you put a wire across one bulb. What does that bulb do?"}, "opts": [{"th": "ดับ", "en": "It goes out"}, {"th": "สว่างขึ้น", "en": "It gets brighter"}, {"th": "เท่าเดิม", "en": "No change"}, {"th": "ระเบิด", "en": "It explodes"}], "hint": {"th": "สายไฟไม่มีความต้านทาน แรงดันคร่อมสายจึงเป็น 0 หลอดที่อยู่คร่อมสายเส้นนั้นได้แรงดันเท่าไร", "en": "A wire has no resistance, so the voltage across it is 0. What voltage does the bulb across that wire get?"}, "why": {"th": "หลอดถูกลัด ได้แรงดัน 0 V จึงดับ ส่วนอีกดวงสว่างขึ้น", "en": "The bulb is shorted, gets 0 V and goes out, while the other bulb gets brighter."}}},
    "series_parallel": {"ana": {"th": "อนุกรมเหมือนตู้รถไฟที่ต่อกันเป็นขบวนเดียว ขนานเหมือนหลายเลนบนถนน", "en": "Series is like train cars in one line; parallel is like lanes on a road."}, "quiz": {"q": {"th": "หลอดเหมือนกันสองดวงกับถ่านก้อนเดียวกัน ต่อแบบไหนสว่างกว่า", "en": "Two identical bulbs on the same battery: which way are they brighter?"}, "opts": [{"th": "ขนาน", "en": "Parallel"}, {"th": "อนุกรม", "en": "Series"}, {"th": "เท่ากัน", "en": "The same"}, {"th": "ขึ้นกับสายไฟ", "en": "It depends on the wires"}], "hint": {"th": "แบบอนุกรมแต่ละดวงได้แรงดันครึ่งเดียว แบบขนานแต่ละดวงได้แรงดันเต็ม และ P = V²/R", "en": "In series each bulb gets half the voltage; in parallel each gets the full voltage. And P = V²/R."}, "why": {"th": "ขนานได้แรงดันเต็ม กำลังมากกว่าแบบอนุกรม 4 เท่า", "en": "In parallel each gets the full voltage: four times the power of series."}}},
    "ideal_real": {"ana": {"th": "โหมดอุดมคติเหมือนโจทย์ในหนังสือที่ไม่มีแรงเสียดทาน โหมดจริงคือโลกจริงที่มีความร้อนและความต้านทานแฝง", "en": "Ideal mode is the textbook problem with no friction; real mode is the real world, with heat and hidden resistance."}, "quiz": {"q": {"th": "ลัดวงจรถ่านในโหมดอุดมคติ จะเกิดอะไรขึ้น", "en": "Short a battery in ideal mode. What happens?"}, "opts": [{"th": "กระแสมหาศาล แต่ไม่มีอะไรไหม้", "en": "A huge current, but nothing burns"}, {"th": "ถ่านระเบิด", "en": "The battery explodes"}, {"th": "ไม่มีกระแส", "en": "No current"}, {"th": "ฟิวส์ขาด", "en": "The fuse blows"}], "hint": {"th": "โหมดอุดมคติไม่มีความร้อน ถ้าไม่มีความร้อน อะไรจะทำให้ชิ้นส่วนพัง", "en": "Ideal mode has no heat. Without heat, what could make a part fail?"}, "why": {"th": "โหมดอุดมคติไม่คิดความร้อน จึงไม่มีอะไรไหม้ ต้องเปิดโหมดจริงจึงจะเห็นถ่านระเบิด", "en": "Ideal mode ignores heat, so nothing burns; switch to real mode to see the battery explode."}}}
  }
};
const planTitle = p => p.preset ? presetTitle(p.preset) : tx(p.title);
const planIdeal = p => p.preset ? !REAL_PRESETS.has(p.preset) : !/ideal=0/.test(p.code);
// 'circ:id', 'dev:id', 'plan:id' or 'mine:name' -> {code | preset | data, title, cap, ref, key}
function figure(key){
  const i=key.indexOf(':'), k=key.slice(0,i), id=key.slice(i+1);
  if (k==='circ'){ const c=KN.circuits.find(x=>x.id===id); return c ? {code:c.code, title:tx(c.title), ref:id, key} : null; }
  if (k==='plan'){ const p=PLANS.find(x=>x.id===id); return p ? {code:p.code, preset:p.preset, title:planTitle(p), key, plan:p} : null; }
  if (k==='mine'){ const s=getSaves().find(x=>x.name===id); return s && validData(s.data) ? {data:s.data, title:s.name, key, save:s} : null; }
  const e=DEV_EX[id]; if (!e) return null;
  if (e.ref) return figure('circ:'+e.ref);
  return {code:e.code, title:tx(e.title), cap:tx(e.cap), key};
}

// lend the solver globals to an example circuit while fn runs, then put the main board back
function swapIn(st, fn){
  const keep={comps, wires, topo, t, ideal, energy, events, dirty};
  ({comps, wires, topo, t, ideal, energy, events, dirty} = st);
  try { fn(); } finally {
    Object.assign(st, {comps, wires, topo, t, ideal, energy, events, dirty});
    ({comps, wires, topo, t, ideal, energy, events, dirty} = keep);
  }
}
const blankState = ideal0 => ({comps:[], wires:[], topo:null, t:0, ideal:ideal0, energy:{sup:0,heat:0}, events:[], dirty:true});
// a small simulation of its own, from saved data ({comps, wires, ideal}), a CIRCUIT v1 code or a preset
function dataState(d){
  const st=blankState(d.ideal!==false);
  swapIn(st, () => {
    comps = d.comps.filter(o=>T[o.type]).map(o => { const p={}; for (const k in T[o.type].def) if (typeof o[k]===typeof T[o.type].def[k]) p[k]=o[k];
      const c=mk(o.type,o.ax|0,o.ay|0,o.bx|0,o.by|0,p); if (o.num) c.num=o.num|0; if (typeof o.name==='string' && o.name) c.name=o.name.slice(0,12); if (o.off) c.off=true; return c; });
    for (const a of d.wires.filter(a=>Array.isArray(a) && a.length>=4)) addWire(...a.slice(0,4).map(v=>v|0), !!a[4]);
    numberAll();
  });
  return st;
}
function miniState(code){ const r=parseCode(code); return r.errs.length ? null : dataState(r.data); }
function presetState(name){ const st=blankState(!REAL_PRESETS.has(name)); swapIn(st, () => { comps=[]; wires=[]; PRESETS[name](); numberAll(); }); return st; }
const stateFrom = f => !f ? null : f.preset ? presetState(f.preset) : f.data ? dataState(f.data) : miniState(f.code);

const partBox = (c, Px, Py, uu, pad) => { const x1=Math.min(Px(c.ax),Px(c.bx))-uu*pad, y1=Math.min(Py(c.ay),Py(c.by))-uu*pad;
  return [x1, y1, Math.abs(Px(c.bx)-Px(c.ax))+2*uu*pad, Math.abs(Py(c.by)-Py(c.ay))+2*uu*pad]; };
const rrect = (x, b, r) => { x.beginPath(); x.roundRect ? x.roundRect(b[0],b[1],b[2],b[3],r) : x.rect(b[0],b[1],b[2],b[3]); };
// draw a circuit on a small board that fits the canvas. o: {fixH: keep the canvas height, flow, labels, time, maxH,
// mode: 'flow' (paths with current glow, the rest dims) or 'meters' (rings on the meters), spot: a part to light up, still: paused with meters hidden, fx: bursts,
// box: fixed area [x0, y0, x1, y1] instead of fitting the circuit (game boards), after(x, Px, Py, uu, W, H): extra drawing on top.
// A hidden fault of a game (off + ghost) is drawn like a working part or wire; c.hide shows "?" instead of the value
function drawMini(cv, st, o={}){
  const cs=st.comps, ws=st.wires;
  let x0=N, y0=N, x1=-1, y1=-1; const ext=(gx,gy)=>{ x0=Math.min(x0,gx); y0=Math.min(y0,gy); x1=Math.max(x1,gx); y1=Math.max(y1,gy); };
  if (o.box) [x0,y0,x1,y1]=o.box;
  else { for (const c of cs){ ext(c.ax,c.ay); ext(c.bx,c.by); } for (const w of ws){ ext(w.ax,w.ay); ext(w.bx,w.by); }
    if (x1<0){ x0=y0=0; x1=y1=4; }
    x0--; y0--; x1++; y1++; }
  const pad=o.box?0.7:0, cw=x1-x0+1, ch=y1-y0+1, gw=cw+pad, gh=ch+pad, W=cv.clientWidth||120;
  const H = o.fixH ? (cv.clientHeight||80) : Math.round(Math.min(W*gh/gw, o.maxH||1e9));
  if (!o.fixH) cv.style.height=H+'px';
  const d=Math.min(window.devicePixelRatio||1, 2), uu=Math.min(W/gw, H/gh), ox=(W-uu*cw)/2, oy=(H-uu*ch)/2;
  if (cv.width!==Math.round(W*d) || cv.height!==Math.round(H*d)){ cv.width=Math.round(W*d); cv.height=Math.round(H*d); }
  st.view={x0, y0, uu, ox, oy};
  const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0);
  x.fillStyle=C.bg; x.fillRect(0,0,W,H);
  const Px=g=>ox+(g-x0+0.5)*uu, Py=g=>oy+(g-y0+0.5)*uu, now=performance.now();
  const fl = o.mode==='flow' && !o.still, live = el => Math.abs(el.i)>1e-6, dotC = elMode?C.el:C.copper;
  if (uu>=6){ x.fillStyle=C.node; x.globalAlpha=0.45; const pr=Math.max(1,uu*0.07);
    for (let gy=y0; gy<=y1; gy++) for (let gx=x0; gx<=x1; gx++){ x.beginPath(); x.arc(Px(gx),Py(gy),pr,0,7); x.fill(); }
    x.globalAlpha=1; }
  x.lineCap='round';
  for (const w of ws){ if (w.off && !w.ghost) continue; const ax=Px(w.ax), ay=Py(w.ay), bx=Px(w.bx), by=Py(w.by), dim=fl && !live(w);
    const seg=()=>{ x.beginPath(); x.moveTo(ax,ay); x.lineTo(bx,by); x.stroke(); };
    x.globalAlpha=dim?0.3:1;
    x.strokeStyle='rgba(0,0,0,.55)'; x.lineWidth=Math.max(2,uu*0.2); seg();
    x.strokeStyle=C.wire; x.lineWidth=Math.max(1.2,uu*0.12); seg();
    x.globalAlpha=1;
    if (fl && !dim){ x.save(); x.globalCompositeOperation='lighter'; x.strokeStyle=dotC; x.globalAlpha=0.17; x.lineWidth=Math.max(3,uu*0.34); x.shadowColor=dotC; x.shadowBlur=glow(uu*0.6); seg(); x.restore(); } }
  for (const c of cs){ const ang=Math.atan2(c.by-c.ay, c.bx-c.ax);
    x.save(); x.translate(Px(c.ax),Py(c.ay)); x.rotate(ang); x.fillStyle=C.bg; x.fillRect(uu*0.3,-uu*0.5,uu*1.4,uu);
    drawSymbol(x,c,uu,Object.assign({},C,{ink:C.silk}),ang);
    if (fl && c.type!=='gnd' && !live(c)){ x.fillStyle='rgba(4,12,9,.62)'; x.fillRect(-uu*0.1,-uu*0.62,uu*2.2,uu*1.24); }
    x.restore(); }
  const deg=new Map(), bump=k=>deg.set(k,(deg.get(k)||0)+1);
  for (const w of ws){ bump(K(w.ax,w.ay)); bump(K(w.bx,w.by)); }
  for (const c of cs){ bump(K(c.ax,c.ay)); if (c.type!=='gnd') bump(K(c.bx,c.by)); }
  for (const [k,n] of deg){ const gx=k%N, gy=(k-gx)/N; x.fillStyle=C.wire; x.beginPath(); x.arc(Px(gx),Py(gy), (n>=3?0.17:0.12)*uu, 0, 7); x.fill(); }
  if (o.flow && !o.still){ const k=(fl?1.3:1)*(o.dotK||1); for (const w of ws) flowDots(x, w, dotC, Px, Py, uu, k); for (const c of cs) if (c.type!=='vm' && c.type!=='gnd') flowDots(x, c, dotC, Px, Py, uu, k); }
  if (o.mode==='meters'){ const a=0.55+0.45*Math.sin(now/240);
    for (const c of cs) if (c.type==='vm' || c.type==='am'){ x.save(); x.strokeStyle=C.accent; x.globalAlpha=a; x.lineWidth=2; x.shadowColor=C.accent; x.shadowBlur=glow(10); rrect(x, partBox(c,Px,Py,uu,0.62), uu*0.3); x.stroke(); x.restore(); } }
  for (const f of o.fx||[]){ const k=(now-f.t)/700; if (k<0 || k>1) continue; const c=f.c, mx=(Px(c.ax)+Px(c.bx))/2, my=(Py(c.ay)+Py(c.by))/2;
    x.save(); x.globalCompositeOperation='lighter'; x.globalAlpha=1-k; x.fillStyle=C.glow; x.beginPath(); x.arc(mx,my,uu*(0.4+1.2*k),0,7); x.fill();
    x.strokeStyle=C.heat; x.lineWidth=3; x.beginPath(); x.arc(mx,my,uu*(0.6+2.4*k),0,7); x.stroke(); x.restore(); }
  const fs=Math.min(16, Math.max(10,Math.round(uu*0.36)));
  const label = c => { if (c.type==='gnd') return; const mx=(Px(c.ax)+Px(c.bx))/2, my=(Py(c.ay)+Py(c.by))/2,
    txt = c.hide || (o.still && (c.type==='vm'||c.type==='am')) ? lab(c)+' ?' : labelText(c.ghost ? Object.assign({}, c, {off:false}) : c);
    if (c.ay===c.by) labelBox(x, txt, mx, my-uu*0.9, 'c', fs, W, H); else labelBox(x, txt, mx+uu*0.6, my, 'l', fs, W, H); };
  if (o.labels) for (const c of cs) label(c);
  if (o.time){ x.font=`500 ${Math.max(10,Math.round(uu*0.34))}px "IBM Plex Mono",monospace`; x.textAlign='left'; x.textBaseline='top'; x.fillStyle=C.muted;
    x.fillText(`t = ${st.t.toFixed(2)} s${st.ideal?'':' · REAL'}`, 24, 12); }
  if (o.spot && cs.includes(o.spot)){ const b=partBox(o.spot,Px,Py,uu,0.72);
    x.save(); x.fillStyle='rgba(2,8,6,.6)'; x.beginPath(); x.rect(0,0,W,H); x.roundRect ? x.roundRect(b[0],b[1],b[2],b[3],uu*0.35) : x.rect(b[0],b[1],b[2],b[3]); x.fill('evenodd');
    x.strokeStyle=C.accent; x.lineWidth=2; x.setLineDash([6,4]); x.lineDashOffset=-now*0.03; x.shadowColor=C.accent; x.shadowBlur=glow(12); rrect(x, b, uu*0.35); x.stroke(); x.restore();
    if (o.labels) label(o.spot); }
  if (o.after) o.after(x, Px, Py, uu, W, H);
}

// the live example board on a page: tap a part to light it up (a switch also flips), slow motion, and the lesson modes
let mini=null;
function miniStart(f, cv, opt){
  miniStop(); const st=stateFrom(f); if (!st || !cv) return;
  mini=Object.assign({st, cv, f, last:performance.now(), raf:0, mode:'', slow:false, still:false, pick:null, spotIx:-1, spotAt:0, capFor:undefined, onTick:null, tk:0, pk:null, fx:[]}, opt||{});
  miniDraw(miniSpot(performance.now()));
  mini.raf=requestAnimationFrame(miniTick);
}
function miniStop(){ if (mini){ cancelAnimationFrame(mini.raf); mini=null; } }
// on a narrow screen the board stays under ~40% of the screen height, so the step text below it is on the first screen too
const narrow = matchMedia('(max-width:760px)');
function miniDraw(spot){ const m=mini; drawMini(m.cv, m.st, {flow:true, labels:true, time:true, maxH:narrow.matches ? Math.max(200, Math.round(innerHeight*0.4)) : 440, mode:m.mode, spot, still:m.still, fx:m.fx}); }
// the part in the spotlight: one the reader picked, or in the "meet" step each part in turn
function miniSpot(now){
  const m=mini, cs=m.st.comps;
  if (m.pick && now<m.pick.until && cs.includes(m.pick.c)) return m.pick.c;
  if (m.mode!=='meet' || !cs.length) return null;
  if (m.spotIx<0 || now-m.spotAt>2600){ m.spotIx=(m.spotIx+1)%cs.length; m.spotAt=now; }
  return cs[m.spotIx%cs.length];
}
// peaks of every reading over the last full period of the slowest AC source (shown for AC circuits)
function newPeaks(st){ const fs=st.comps.filter(c=>c.type==='ac' && !c.off).map(c=>c.f); return fs.length ? {W:1/Math.min(...fs), t0:st.t, cur:new Map(), prev:new Map()} : null; }
const reading = c => c.type==='vm' ? c.v : c.i;
const peakOf = (pk, c) => Math.max(pk.prev.get(c)||0, pk.cur.get(c)||0);
function miniTick(now){
  const m=mini; if (!m) return;
  if (!m.cv.isConnected){ miniStop(); return; }
  const rdt=Math.min(0.05,(now-m.last)/1000); m.last=now;
  if (!m.still){
    const n=Math.min(80, Math.max(1, Math.round(rdt*(m.slow?0.2:1)/DT)));
    swapIn(m.st, () => {
      for (let k=0;k<n;k++){ step();
        if (m.pk){ wireCurrents(); const pk=m.pk; for (const c of comps) pk.cur.set(c, Math.max(pk.cur.get(c)||0, Math.abs(reading(c)))); if (t-pk.t0>=pk.W){ pk.prev=pk.cur; pk.cur=new Map(); pk.t0=t; } } }
      if (!m.pk) wireCurrents();
      for (const e of events) if (!e.w) m.fx.push({c:e, t:now});
      events.length=0;
    });
    const ph=(reduce?0.35:1)*(m.slow?0.3:1);
    for (const el of m.st.comps){ el.phase+=flowSpeed(el.i)*rdt*ph; if (el.type==='bulb') el.glow=Math.abs(el.v*el.i)/4; if (el.type==='led') el.glow=Math.abs(el.i)/0.02; }
    for (const el of m.st.wires) el.phase+=flowSpeed(el.i)*rdt*ph;
  } else for (const el of m.st.comps) el.glow=0;
  if (m.fx.length && now-m.fx[0].t>800) m.fx=m.fx.filter(f=>now-f.t<=800);
  const sp=miniSpot(now);
  if (sp!==m.capFor){ m.capFor=sp; const el=document.getElementById('lspot');
    if (el){ el.innerHTML = sp ? `<b>${labH(sp)}</b><span>${esc(tName(sp.type))}</span><small>${esc(role(sp.type))}</small>` : spotHint(); el.classList.toggle('on', !!sp); }
    docBody.querySelectorAll('.lchip').forEach(b=>b.classList.toggle('on', m.st.comps[+b.dataset.spot]===sp)); }
  miniDraw(sp);
  if (m.onTick && (m.tk+=rdt)>=0.15){ m.tk=0; m.onTick(m.st); }
  m.raf=requestAnimationFrame(miniTick);
}
// a tap on the small board: the nearest part goes in the spotlight for a few seconds, and a switch flips
function miniTap(e){
  const m=mini, v=m && m.st.view; if (!v) return;
  const r=m.cv.getBoundingClientRect(), gx=(e.clientX-r.left-v.ox)/v.uu-0.5+v.x0, gy=(e.clientY-r.top-v.oy)/v.uu-0.5+v.y0;
  let best=null, bd=1;
  for (const c of m.st.comps){ const dd=Math.hypot((c.ax+c.bx)/2-gx, (c.ay+c.by)/2-gy); if (dd<bd){ bd=dd; best=c; } }
  if (!best) return;
  if (best.type==='sw' && !m.still){ best.on=!best.on; m.st.dirty=true; }
  m.pick={c:best, until:performance.now()+4500};
}
function drawSym(cv, type){
  const w=cv.clientWidth||64, h=cv.clientHeight||34, d=Math.min(window.devicePixelRatio||1, 2);
  cv.width=Math.round(w*d); cv.height=Math.round(h*d);
  const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0); x.clearRect(0,0,w,h);
  const uu=Math.min(w/2.3, h/1.5); x.translate((w-2*uu)/2, h/2);
  x.shadowColor='rgba(216,232,225,.5)'; x.shadowBlur=glow(Math.max(3,uu*0.18));   // symbols sit on a small board tile, drawn like the parts on the board
  drawSymbol(x,{type,glow:0,on:true,color:0},uu,Object.assign({},C,{ink:C.silk}),0);
}
const MENU_ICON = `DC 0,2 0,0 E=9\nB 4,0 4,2 R=20\nW 0,0 4,0\nW 0,2 4,2`;
const MENU_ICON3 = `DC 0,2 0,0 E=9\nR 3,0 3,2\nR 5,0 5,2\nW 0,0 5,0\nW 0,2 5,2`;
function drawMenuIcons(){
  const cv=menuPanel.querySelectorAll('.mitem canvas');
  if (cv[0]) drawSym(cv[0], 'res');
  [[cv[1],MENU_ICON],[cv[2],MENU_ICON3]].forEach(([c,code])=>{ const st=c && miniState(code); if (st) drawMini(c, st, {fixH:true}); });
  if (cv[3]) drawSym(cv[3], 'led');
}

// navigation: a stack of views {v:'devs'|'dev'|'circs'|'circ'|'con'|'plans'|'plan'|'mine', id, at: lesson step, tab}
let docStack=[];
function openMenu(){ menuPanel.hidden=false; menuBtn.setAttribute('aria-expanded','true'); drawMenuIcons(); }
function closeMenu(){ menuPanel.hidden=true; menuBtn.setAttribute('aria-expanded','false'); }
function openDoc(view){ docStack=[view]; docPage.hidden=false; document.body.classList.add('noscroll'); renderDoc(); }
function docGo(view){ docStack.push(view); renderDoc(); }
function docBack(){ if (docStack.length>1){ docStack.pop(); renderDoc(); } else { closeDoc(); openMenu(); } }
function closeDoc(){ miniStop(); les=null; docPage.hidden=true; docStack=[]; docBody.innerHTML=''; document.body.classList.remove('noscroll'); }
menuBtn.onclick=()=>{ menuPanel.hidden ? openMenu() : closeMenu(); };
$('#menuClose').onclick=closeMenu;
menuPanel.addEventListener('click', e=>{
  if (e.target===menuPanel){ closeMenu(); return; }
  const go=e.target.closest('[data-go]'); if (go){ closeMenu(); if (go.dataset.go==='game') gameOpen(); else openDoc({v:go.dataset.go}); return; }
  const lb=e.target.closest('[data-lang]'); if (lb) setLang(lb.dataset.lang);
});
$('#docBack').onclick=docBack; $('#docClose').onclick=closeDoc;
docPage.addEventListener('click', e=>{ if (e.target===docPage) closeDoc(); });
docBody.addEventListener('click', e=>{
  const t0=e.target, at=s=>t0.closest(s), cur=docStack[docStack.length-1];
  if (t0.id==='miniCv'){ miniTap(e); return; }
  let b;
  if ((b=at('[data-opt]'))){ quizPick(+b.dataset.opt); return; }
  if ((b=at('[data-lgo]'))){ lessonGo(+b.dataset.lgo, true); return; }
  if ((b=at('[data-step]'))){ lessonGo(+b.dataset.step, true); return; }
  if ((b=at('[data-spot]'))){ if (mini){ mini.pick={c:mini.st.comps[+b.dataset.spot], until:performance.now()+5000}; } return; }
  if ((b=at('[data-open]'))){ const s=b.dataset.open, i=s.indexOf(':'); docGo({v:s.slice(0,i), id:s.slice(i+1)}); return; }
  if ((b=at('[data-try]'))){ tryOnBoard(b.dataset.try); return; }
  if ((b=at('[data-tab]'))){ if (cur){ cur.tab=b.dataset.tab; renderDoc(); } return; }
  if (at('[data-psave]')){ planSave(); return; }
  if ((b=at('[data-del]'))){ deleteSaved(b.dataset.del); return; }
  if ((b=at('[data-slow]'))){ if (mini){ mini.slow=!mini.slow; b.setAttribute('aria-pressed',String(mini.slow)); } return; }
  if (at('[data-restart]') && mini){ mini.st=stateFrom(mini.f); mini.pk=mini.pk && newPeaks(mini.st); mini.fx=[]; mini.capFor=undefined; mini.last=performance.now(); }
});
docBody.addEventListener('keydown', e=>{ if (e.key==='Enter' && e.target.id==='pName'){ e.preventDefault(); planSave(); } });
// put an example on the main board (same confirmation as opening any other circuit over the current one)
function tryOnBoard(key){
  const f=figure(key); if (!f) return;
  let go;
  if (f.preset) go=()=>{ pushUndo(); loadPreset(f.preset, true); closeDoc(); };
  else { const d = f.data || (()=>{ const r=parseCode(f.code); return r.errs.length ? null : r.data; })(); if (!d) return;
    go=()=>{ pushUndo(); applyData(d); setCircuit(f.title, true); save(); closeDoc(); }; }
  if (comps.length||wires.length) askConfirm(L(`เปิด "${f.title}" แทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`,`Open "${f.title}" in place of the circuit on the board? The current circuit is lost unless you saved it.`), L('เปิดวงจร','Open circuit'), go);
  else go();
}
// "ของฉัน" tab: save the circuit on the main board, delete a saved one
function planSave(){
  const v=docStack[docStack.length-1], inp=$('#pName'); if (!v || !inp) return;
  saveAs(inp.value, t2=>{ v.msg=t2; const el=$('#pMsg'); if (el) el.textContent=t2; }, ()=>{ v.name=''; renderDoc(); });
}
function deleteSaved(name){
  askConfirm(L(`ลบวงจรที่บันทึกชื่อ "${name}" ใช่ไหม`,`Delete the saved circuit "${name}"?`), L('ลบ','Delete'), ()=>{
    putSaves(getSaves().filter(x=>x.name!==name)); if (!$('#savePanel').hidden) renderSaves();
    while (docStack.length>1 && docStack[docStack.length-1].v==='mine') docStack.pop();
    const v=docStack[docStack.length-1]; if (v) v.msg=L(`ลบ "${name}" แล้ว`,`Deleted "${name}"`); renderDoc(); });
}
// text from knowledge.js shown as HTML: escaped, x^(…) and x^−1 as superscripts, V_R1 as subscripts,
// and a circuit id written in the text (short_resistor) becomes a link to that circuit, showing its title.
// In English only ids with "_" link: plain words such as "series" or "parallel" stay words
function rich(v){
  let h=esc(tx(v));
  const ids=KN.circuits.map(c=>c.id).filter(id=>lang==='th' || id.includes('_')).sort((a,b)=>b.length-a.length);
  if (ids.length) h=h.replace(new RegExp(`(?<![\\w])(${ids.join('|')})(?![\\w])`,'g'), id=>`\u0001${id}\u0002`);
  h=h.replace(/\^\(([^)]*)\)/g,'<sup>$1</sup>').replace(/\^([−\-+]?[0-9.]+|[A-Za-z]+)/g,'<sup>$1</sup>');
  h=subHTML(h);
  return h.replace(/\u0001([\w]+)\u0002/g, (m,id)=>{ const c=KN.circuits.find(x=>x.id===id); return `<button class="clink" data-open="circ:${id}">${esc(tx(c.title))}</button>`; });
}
const fx = v => subHTML(esc(tx(v)));   // the lesson texts written in app.js: escaped, with subscripts
const ulist = a => `<ul class="pads">${(a||[]).map(v=>`<li>${rich(v)}</li>`).join('')}</ul>`;
// the live board: canvas, a "paused" badge for guesses, and a bar under it with the caption of the part in the spotlight and the controls
const spotHint = () => `<small class="hint">${L('แตะอุปกรณ์บนแผงเพื่อดูชื่อและหน้าที่ แตะสวิตช์เพื่อเปิดหรือปิด','Tap a part on the board to see what it does; tap a switch to flip it')}</small>`;
const miniBox = () => `<div class="mini"><canvas id="miniCv"></canvas><span class="mfz">${L('หยุดไว้ ทายก่อนดูผล','Paused: guess first')}</span>
  <div class="mbar"><span class="mlive">${L('จำลองสด','LIVE')}</span><p id="lspot" class="lspot" aria-live="polite">${spotHint()}</p><span class="mctl"><button class="mslow" data-slow aria-pressed="false">${L('ภาพช้า','Slow motion')}</button><button class="mre" data-restart>${L('↻ เริ่มใหม่','↻ Restart')}</button></span></div></div>`;
const tryBtn = key => `<button class="primary" data-try="${esc(key)}">${L('ลองบนแผง','Try it on the board')}</button>`;
const sec = (title, body, cls='') => `<section class="dsec ${cls}"><h4><i class="pad" aria-hidden="true"></i>${title}</h4>${body}</section>`;
const two = n => String(n).padStart(2,'0');

/* lesson player: a circuit explained one idea at a time, next to its live board.
   Steps: meet the parts (spotlight) → watch the current (paths with current glow) → why → read the meters → guess (board paused) → try it */
let les=null;   // {steps, at}
const ROLE = {
  dc:['ปั๊มประจุ ดันกระแสออกจากขั้วบวก','A charge pump: pushes current out of its + side'],
  ac:['ปั๊มที่สลับทิศไปมา กระแสจึงไหลกลับไปกลับมา','A pump that keeps reversing, so the current flows back and forth'],
  res:['ทางแคบ ขวางกระแส ยิ่ง R มาก กระแสยิ่งน้อย','A narrow path that holds the current back: more R, less current'],
  bulb:['เปลี่ยนพลังงานไฟฟ้าเป็นแสง ยิ่งกำลังมากยิ่งสว่าง','Turns electrical energy into light: more power, more light'],
  sw:['ประตู เปิดหรือปิดทางเดินของกระแส แตะบนแผงเพื่อสลับ','A gate that opens or closes the path. Tap it on the board'],
  fuse:['ด่านกันภัย ขาดเองเมื่อกระแสเกินพิกัด','A guard that melts when the current is too high'],
  cap:['ถังเก็บประจุ เติมจนเต็มแล้วกระแสไฟตรงหยุด','A tank of charge: once full, DC current stops'],
  ind:['ล้อหนัก ต้านการเปลี่ยนแปลงของกระแส','A heavy flywheel that resists changes in current'],
  tp:['ขดรับไฟของหม้อแปลง','The input coil of the transformer'],
  ts:['ขดจ่ายไฟของหม้อแปลง แรงดันเป็น n เท่าของขดรับ','The output coil: n times the input voltage'],
  diode:['ประตูทางเดียว ให้กระแสไหลตามลูกศรเท่านั้น','A one-way gate: current only goes along the arrow'],
  led:['ประตูทางเดียวที่เปล่งแสงเมื่อมีกระแส','A one-way gate that lights up when current passes'],
  vm:['วัดแรงดัน ต่อคร่อม แทบไม่ดึงกระแส','Reads voltage. Connected across, it takes no current'],
  am:['วัดกระแส ต่ออนุกรม แทบไม่ขวางกระแส','Reads current. Connected in series, it does not block it'],
  gnd:['จุดอ้างอิง 0 V ของวงจร','The 0 V reference of the circuit'],
};
const role = t => ROLE[t] ? L(...ROLE[t]) : '';
const STEP = { meet:['รู้จักวงจร','Meet the circuit'], flow:['ดูกระแสไหล','Watch the current'], why:['ทำไมเป็นแบบนี้','Why it works'], meters:['อ่านมิเตอร์','Read the meters'],
  quiz:['ทายก่อน','Guess first'], try:['ลองเอง','Your turn'], ana:['นึกภาพตาม','Picture it'], point:['ประเด็นที่ ','Point '], open:['เปิดใช้','Use it'] };
const stepTitle = (k, n) => L(STEP[k][0], STEP[k][1]) + (n ? n : '');
const anaBox = (text, cls='') => `<div class="lana ${cls}"><p class="ltag">${cls==='try'?L('ลองเอง','Your turn'):L('เปรียบเทียบ','Picture it')}</p><p>${text}</p></div>`;
const flowNote = () => elMode ? L('เส้นที่สว่างคือทางที่มีกระแส จุดที่วิ่งคืออิเล็กตรอน ซึ่งวิ่งสวนทิศกระแส (จากขั้วลบไปขั้วบวก) ส่วนที่มืดไม่มีกระแสเลย','Bright paths carry current. The moving dots are electrons, which run against the current (from − to +). Dark parts carry no current at all.')
  : L('เส้นที่สว่างคือทางที่มีกระแส จุดวิ่งตามทิศของกระแส จากขั้วบวกผ่านวงจรกลับเข้าขั้วลบ ส่วนที่มืดไม่มีกระแสเลย กด "ภาพช้า" เพื่อดูชัดขึ้น','Bright paths carry current and the dots move with it, from + around the circuit back to −. Dark parts carry no current at all. Press "Slow motion" for a closer look.');
// live text inside the step card, refreshed a few times a second from the small board
function liveSources(st){ const el=docBody.querySelector('[data-src]'); if (!el) return;
  const ss=st.comps.filter(c=>c.type==='dc'||c.type==='ac');
  el.innerHTML = ss.length ? `${L('กระแสจากแหล่งจ่ายตอนนี้','Current from the source now')}: ${ss.map(c=>`<b>${labH(c)}</b> ${esc(fmt(Math.abs(c.i),'A'))}`).join(' · ')}` : ''; }
function liveReads(st){
  docBody.querySelectorAll('[data-mi]').forEach(el=>{ const c=st.comps[+el.dataset.mi]; if (!c) return;
    el.textContent = c.broken ? L('ไหม้','burnt') : fmt(reading(c), c.type==='vm'?'V':'A'); });
  docBody.querySelectorAll('[data-pk]').forEach(el=>{ const c=st.comps[+el.dataset.pk]; if (c && mini && mini.pk) el.textContent=L('สูงสุด ','peak ')+fmt(peakOf(mini.pk,c), c.type==='vm'?'V':'A'); });
  docBody.querySelectorAll('[data-meter]').forEach(el=>{ const c=st.comps.find(x=>x.name===el.dataset.meter); if (!c){ el.hidden=true; return; }
    el.textContent = L('ตอนนี้ ','now ')+fmt(reading(c), c.type==='vm'?'V':'A')+(mini && mini.pk ? L(' · สูงสุด ',' · peak ')+fmt(peakOf(mini.pk,c), c.type==='vm'?'V':'A') : ''); });
}
const chips = st => `<div class="lchips">${st.comps.map((c,i)=>`<button class="lchip" data-spot="${i}" style="--c:${tagCol(c)}"><i aria-hidden="true"></i><b>${labH(c)}</b><span>${esc(tName(c.type))}</span></button>`).join('')}</div>`;
const meetNote = st => L(`วงจรนี้มีอุปกรณ์ ${st.comps.length} ชิ้น แผงด้านบนส่องไฟทีละชิ้น แตะชื่อหรือแตะบนแผงเพื่อดูว่าอยู่ตรงไหนและทำหน้าที่อะไร`,
  `This circuit has ${st.comps.length} parts. The board lights them up one by one; tap a name, or a part on the board, to see where it is and what it does.`);
const stepMeet = intro => ({k:'meet', mode:'meet', body:st=>`${intro?`<p class="lp big">${intro}</p>`:''}<p class="lp dim">${meetNote(st)}</p>${chips(st)}`});
const stepFlow = top => ({k:'flow', mode:'flow', body:()=>`${top}<p class="lp dim">${flowNote()}</p><p class="llive" data-src></p>`, tick:liveSources});
// readings of the meters on the board (or of every part when there are none), live, with the peak for AC circuits
function stepMeters(){
  return {k:'meters', mode:'meters', peaks:true, tick:liveReads, body:st=>{
    const ms=st.comps.filter(c=>c.type==='vm'||c.type==='am'), list=ms.length ? ms : st.comps.filter(c=>c.type!=='gnd' && c.type!=='vm'), ac=st.comps.some(c=>c.type==='ac');
    return `<p class="lp dim">${ms.length ? L('ตัวเลขด้านล่างอ่านสดจากมิเตอร์บนแผงเล็ก ลองคำนวณเองก่อน แล้วค่อยเทียบ','The numbers below are read live from the meters on the small board. Work them out yourself first, then compare.')
      : L('วงจรนี้ไม่มีมิเตอร์ ตัวเลขด้านล่างคือกระแสในอุปกรณ์แต่ละชิ้น เหมือนการ์ดใต้แผงหลัก','This circuit has no meters. Below is the current in each part, as on the cards under the main board.')}</p>
      ${ac?`<p class="lp dim">${L('ไฟสลับเปลี่ยนค่าตลอดเวลา จึงแสดงค่าสูงสุดในหนึ่งคาบไว้ด้วย','AC keeps changing, so the peak over one cycle is shown too.')}</p>`:''}
      <div class="lread">${list.map(c=>{ const i=st.comps.indexOf(c); return `<div class="lrow"><code>${labH(c)}</code><span>${esc(tName(c.type))}</span><b data-mi="${i}">–</b>${ac?`<em data-pk="${i}"></em>`:''}</div>`; }).join('')}</div>`; }};
}
// a guess: the board pauses with its meters hidden until it is answered. Options are shuffled the same way every time
function shuffled(n, seed){ let h=7; for (const ch of seed) h=(h*31+ch.charCodeAt(0))|0; const a=[...Array(n).keys()];
  for (let i=n-1;i>0;i--){ h=(Math.imul(h,1103515245)+12345)|0; const j=((h>>>8)%(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const stepQuiz = (q, seed) => q ? {k:'quiz', mode:'', quiz:q, ord:shuffled(q.opts.length, seed), qs:{tries:[], done:false, ok:false}, body:()=>''} : null;
function quizBody(s){
  const q=s.quiz, z=s.qs, n=z.tries.length;
  const opts=s.ord.map((i,k)=>{ const cls = z.tries.includes(i) ? (i===0?'yes':'no') : (z.done && i===0 ? 'yes reveal' : '');
    return `<button class="lopt ${cls}" data-opt="${i}"${z.done||z.tries.includes(i)?' disabled':''}><i aria-hidden="true">${'ABCD'[k]}</i><span>${fx(q.opts[i])}</span>${cls==='yes'?`<span class="burst" aria-hidden="true">${Array.from({length:12},(_,j)=>`<i style="--a:${j*30}deg"></i>`).join('')}</span>`:''}</button>`; }).join('');
  let fb='';
  if (z.done && z.ok) fb=`<div class="lfb ok"><b>${n===1?L('ถูกตั้งแต่ครั้งแรก','Right first time'):L('ถูกแล้ว','Right')}</b> ${n===1?L('คิดจากหลักได้ตรงจุด','You reasoned straight from the rule.'):L('ใช้คำใบ้ไล่เหตุผลจนเจอคำตอบ','You followed the hint through to the answer.')} ${fx(q.why)}</div>`;
  else if (z.done) fb=`<div class="lfb show"><b>${L('เฉลย','The answer')}</b> ${fx(q.why)} ${L('ไม่เป็นไร ลองดูค่าบนแผงประกอบกับเหตุผลนี้','That is fine: check the board against this reason.')}</div>`;
  else if (n) fb=`<div class="lfb hint"><b>${L('ยังไม่ใช่ ลองคิดแบบนี้','Not yet. Think about this')}</b> ${fx(q.hint)}</div>`;
  return `<p class="lp dim">${z.done ? L('แผงด้านบนเล่นต่อแล้ว ดูค่าจริงจากมิเตอร์ได้เลย','The board above is running again: check the real values.') : L('ทายก่อนดูผล แผงด้านบนหยุดไว้และซ่อนค่ามิเตอร์ ตอบแล้วจะเล่นต่อให้ดูว่าจริงไหม','Guess before you look: the board above is paused with its meters hidden. Answer and it plays on so you can check.')}</p>
    <p class="lqq">${fx(q.q)}</p><div class="lqo">${opts}</div>${fb}`;
}
function quizPick(i){
  const s=les && les.steps[les.at]; if (!s || !s.quiz || s.qs.done || s.qs.tries.includes(i)) return;
  s.qs.tries.push(i);
  if (i===0 || s.qs.tries.length>=2){ s.qs.done=true; s.qs.ok=i===0; }
  const box=$('#lbody'); if (box) box.innerHTML=quizBody(s);
  if (s.qs.done) stillBoard(false);
}
function stillBoard(on){ if (!mini) return; mini.still=on; const box=mini.cv.parentElement; if (box) box.classList.toggle('still', on); }
const stepTry = (text, acts) => ({k:'try', mode:'', body:()=>`${anaBox(text,'try')}<p class="lp dim">${L('กด "ลองบนแผง" เพื่อเปิดวงจรนี้บนแผงหลัก แล้วปรับค่า สลับสวิตช์ หรือต่อเพิ่มได้เต็มที่','Press "Try it on the board" to open this circuit on the main board, where you can change values, flip switches and add parts.')}</p><div class="dacts">${acts}</div>`});
function lessonHTML(steps, all, foot){
  return `<div class="lesson"><ol class="lsteps">${steps.map((s,i)=>`<li><button data-step="${i}" title="${esc(s.title)}"><i>${two(i+1)}</i><span>${esc(s.title)}</span></button></li>`).join('')}</ol>
    <div class="lprog" aria-hidden="true"><i></i></div>
    <div class="lgrid"><div class="lboard">${miniBox()}</div><div id="lcard" class="lcard"></div></div>
    ${foot?`<div class="dacts lfoot">${foot}</div>`:''}
    ${all?`<details class="lall"><summary>${L('สรุปทั้งหมดในหน้าเดียว','Everything on one page')}</summary>${all}</details>`:''}</div>`;
}
// start a lesson: the board, then the step the view was on
function lessonStart(f, steps, at){
  les={steps:steps.filter(Boolean), at:0};
  miniStart(f, $('#miniCv'));
  lessonGo(at||0);
}
function lessonGo(i, user){
  if (!les) return; const n=les.steps.length; i=Math.max(0, Math.min(n-1, i|0)); les.at=i;
  const v=docStack[docStack.length-1]; if (v) v.at=i;
  const s=les.steps[i];
  docBody.querySelectorAll('.lsteps button').forEach((b,k)=>{ b.classList.toggle('on',k===i); b.classList.toggle('done',k<i); if (k===i) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
  const pr=docBody.querySelector('.lprog i'); if (pr) pr.style.width=((i+1)/n*100)+'%';
  const card=$('#lcard'); if (!card) return;
  const st=mini ? mini.st : blankState(true);
  card.innerHTML=`<div class="lin"><p class="lnum">${L(`ขั้นที่ ${i+1} จาก ${n}`,`Step ${i+1} of ${n}`)}</p><h3>${esc(s.title)}</h3><div id="lbody">${s.quiz?quizBody(s):s.body(st)}</div></div>
    <div class="lnav"><button data-lgo="${i-1}"${i?'':' disabled'}>${L('← ก่อนหน้า','← Back')}</button>${i<n-1?`<button class="primary" data-lgo="${i+1}">${L('ถัดไป','Next')} · ${esc(les.steps[i+1].title)} →</button>`:`<button data-lgo="0">${L('↺ เริ่มบทเรียนใหม่','↺ Start over')}</button>`}</div>`;
  if (mini){ mini.mode=s.mode||''; mini.pick=null; mini.spotIx=-1; mini.capFor=undefined; mini.onTick=s.tick||null; mini.tk=1; mini.pk=s.peaks ? newPeaks(mini.st) : null; stillBoard(!!(s.quiz && !s.qs.done)); }
  if (user){ const box=docPage.querySelector('.docbox'), top=docBody.querySelector('.lesson'); if (box && top && top.getBoundingClientRect().top<0) box.scrollTo({top:top.offsetTop-70, behavior:reduce?'auto':'smooth'}); }
}
// lessons for a circuit of knowledge.js, an idea, a plan and a saved circuit
function circLesson(c){
  const X=LESSON.circ[c.id]||{}, key='circ:'+c.id;
  const src={meter:L('มิเตอร์','meter'), card:L('การ์ดอุปกรณ์','device card'), calculated:L('คำนวณเอง','work it out')};
  const when=r=>Array.isArray(r.t_s) ? `t = ${r.t_s[0]}–${r.t_s[1]} s` : (typeof r.t_s==='number' ? `t = ${r.t_s} s` : '');
  const reads=`<div class="rlist">${(c.readings||[]).map(r=>`<div class="rrow"><code>${subHTML(esc(r.meter))}</code><b>${esc(typeof r.value==='number' ? fmt(r.value, r.unit||'') : r.value)}</b>${when(r)?`<em>${when(r)}</em>`:''}<em>${src[r.source]||esc(r.source||'')}</em><span class="lnow" data-meter="${esc(r.meter)}"></span>${r.note?`<small>${rich(r.note)}</small>`:''}</div>`).join('')}</div>`;
  const steps=[
    Object.assign(stepMeet(`${esc(tx(c.topic))} · ${/ideal=0/.test(c.code)?L('โหมดจริง','real mode'):L('โหมดอุดมคติ','ideal mode')}`), {title:stepTitle('meet')}),
    X.ana ? Object.assign(stepFlow(anaBox(fx(X.ana))), {title:stepTitle('flow')}) : Object.assign(stepFlow(''), {title:stepTitle('flow')}),
    {k:'why', title:stepTitle('why'), mode:'flow', body:()=>`<p class="lp big">${rich(c.why)}</p>`},
    {k:'meters', title:stepTitle('meters'), mode:'meters', peaks:true, tick:liveReads, body:()=>`<p class="lp dim">${L('ค่าที่ควรอ่านได้ เทียบกับค่าที่แผงด้านบนอ่านได้ตอนนี้','What you should read, next to what the board above reads right now.')}</p>${reads}`},
    X.quiz && Object.assign(stepQuiz(X.quiz, key), {title:stepTitle('quiz')}),
    Object.assign(stepTry(rich(c.try_it), tryBtn(key)), {title:stepTitle('try')}),
  ];
  const all=`${sec(L('ทำไมจึงเป็นแบบนี้','Why it works this way'), `<p>${rich(c.why)}</p>`)}${sec(L('ค่าที่ควรอ่านได้','What you should read'), reads.replace(/<span class="lnow"[^>]*><\/span>/g,''))}<section class="dsec guess"><p class="gtag">${L('ลองทายก่อน','Guess first')}</p><p>${rich(c.try_it)}</p></section>`;
  return {steps, all};
}
function conLesson(c, f){
  const X=LESSON.con[c.id]||{}, pts=c.points||[];
  const steps=[
    Object.assign(stepFlow(`${X.ana?anaBox(fx(X.ana)):''}<p class="lp big">${rich(c.text)}</p>`), {k:'ana', title:stepTitle('ana')}),
    ...pts.map((p,i)=>({k:'point', title:stepTitle('point', i+1), mode:'flow', body:()=>`<p class="lp big">${rich(p)}</p>`})),
    X.quiz && Object.assign(stepQuiz(X.quiz, 'con:'+c.id), {title:stepTitle('quiz')}),
    f && Object.assign(stepTry(L(`วงจรด้านบนคือ "${esc(f.title)}" เปิดบนแผงหลักแล้วลองเปลี่ยนค่าดูว่าแนวคิดนี้ยังจริงไหม`,`The circuit above is "${esc(f.title)}". Open it on the main board and change things to see whether the idea still holds.`),
      tryBtn(f.key)+(f.ref?`<button data-open="circ:${f.ref}">${L('บทเรียนของวงจรนี้','Lesson for this circuit')}</button>`:'')), {title:stepTitle('try')}),
  ];
  return {steps, all:`<section class="dsec lead"><p>${rich(c.text)}</p>${ulist(pts)}</section>`};
}
function planLesson(p){
  const key='plan:'+p.id;
  const steps=[
    Object.assign(stepMeet(fx(p.desc)), {title:stepTitle('meet')}),
    Object.assign(stepFlow(`<p class="lp big">${fx(p.idea)}</p>`), {title:stepTitle('flow')}),
    Object.assign(stepMeters(), {title:stepTitle('meters')}),
    p.quiz && Object.assign(stepQuiz(p.quiz, key), {title:stepTitle('quiz')}),
    Object.assign(stepTry(fx(p.try), tryBtn(key)), {title:stepTitle('try')}),
  ];
  return {steps, all:`<section class="dsec lead"><p>${fx(p.desc)}</p><p>${fx(p.idea)}</p></section><section class="dsec guess"><p class="gtag">${L('ลองทายก่อน','Guess first')}</p><p>${fx(p.try)}</p></section>`};
}
function mineLesson(f){
  const s=f.save, key=f.key, when=new Date(s.time).toLocaleString(L('th-TH','en-GB'),{dateStyle:'medium',timeStyle:'short'});
  const steps=[
    Object.assign(stepMeet(L(`บันทึกไว้เมื่อ ${esc(when)} · สายไฟ ${s.data.wires.length} เส้น · ${s.data.ideal===false?'โหมดจริง':'โหมดอุดมคติ'}`,`Saved ${esc(when)} · ${s.data.wires.length} wire segments · ${s.data.ideal===false?'real mode':'ideal mode'}`)), {title:stepTitle('meet')}),
    Object.assign(stepFlow(''), {title:stepTitle('flow')}),
    Object.assign(stepMeters(), {title:stepTitle('meters')}),
    {k:'open', title:stepTitle('open'), mode:'', body:()=>`<p class="lp">${L('เปิดวงจรนี้บนแผงหลักเพื่อแก้ต่อ หรือลบออกจากรายการ','Open this circuit on the main board to keep working on it, or delete it from the list.')}</p><div class="dacts"><button class="primary" data-try="${esc(key)}">${L('เปิดบนแผง','Open on the board')}</button><button class="danger" data-del="${esc(s.name)}">${L('ลบวงจรนี้','Delete this circuit')}</button></div>`},
  ];
  return {steps};
}

function renderDoc(){
  miniStop(); les=null;
  const v=docStack[docStack.length-1]; if (!v){ closeDoc(); return; }
  const title=$('#docTitle'), kick=$('#docKick');
  let lesson=null, f=null;
  if (v.v==='devs'){
    kick.textContent=L(`อุปกรณ์ · ${KN.devices.length} ชิ้น`,`Components · ${KN.devices.length}`);
    title.textContent=L('อุปกรณ์วงจร','Circuit components');
    const groups=[]; for (const d of KN.devices){ const g=tx(d.group); let G=groups.find(x=>x.g===g); if (!G) groups.push(G={g, items:[]}); G.items.push(d); }
    let n=0;
    docBody.innerHTML=`<p class="dlead">${L('เลือกอุปกรณ์เพื่อดูว่าทำอะไร ทำงานอย่างไร และวงจรพื้นฐานของมัน','Pick a part to see what it does, how it behaves, and a basic circuit with it')}</p>`
      + groups.map(G=>`<h3 class="dgrp"><span>${esc(G.g)}</span></h3><div class="dlist">${G.items.map(d=>`<button class="ditem" data-open="dev:${d.id}" style="--k:${n++}"><span class="dtile"><canvas data-sym="${d.id}" aria-hidden="true"></canvas></span><span class="dtx"><b>${esc(tx(d.name))}</b><small>${rich(d.what)}</small></span><i class="code">${esc(d.code)}</i></button>`).join('')}</div>`).join('');
  } else if (v.v==='dev'){
    const k=KN.devices.findIndex(x=>x.id===v.id), d=KN.devices[k]; if (!d){ docBack(); return; }
    f=figure('dev:'+d.id);
    kick.textContent=L(`อุปกรณ์ ${two(k+1)} / ${KN.devices.length}`,`Component ${two(k+1)} / ${KN.devices.length}`);
    title.textContent=tx(d.name);
    docBody.innerHTML=`<div class="dhero"><span class="dtile big"><canvas class="dbig" data-sym="${d.id}" aria-hidden="true"></canvas></span><div><p class="dkick">${esc(tx(d.group))} <span class="code">${esc(d.code)}</span></p><h3 class="dname">${esc(tx(d.name))}</h3><p class="dwhat">${rich(d.what)}</p></div></div>
      ${sec(L('พฤติกรรม','How it behaves'), ulist(d.behavior))}
      ${d.formulas && d.formulas.length ? sec(L('สูตร','Formulas'), `<div class="fchips">${d.formulas.map(x=>`<span>${rich(x)}</span>`).join('')}</div>`) : ''}
      ${d.params && d.params.length ? sec(L('ค่าที่ตั้งได้','Settings'), `<div class="ptab">${d.params.map(p=>`<div class="prow"><code>${subHTML(esc(p.key))}</code><b>${esc(p.default)}${p.unit?' '+esc(p.unit):''}</b><span>${rich(p.meaning)}</span></div>`).join('')}</div>`) : ''}
      <div class="dmodes"><div class="mode ideal"><p class="mtag">${L('โหมดอุดมคติ','Ideal mode')}</p><p>${rich(d.ideal_mode)}</p></div><div class="mode real"><p class="mtag">${L('โหมดจริง','Real mode')}</p><p>${rich(d.real_mode)}</p></div></div>
      ${sec(L('ข้อควรระวัง','Watch out'), ulist(d.watch_out), 'warn')}
      <section class="dsec guess"><p class="gtag">${L('ลองทายก่อน','Guess first')}</p><p>${rich(d.try_it)}</p></section>
      ${f ? sec(`${L('วงจรพื้นฐาน','Basic circuit')} · ${esc(f.title)}`, `${f.cap?`<p class="dcap">${subHTML(esc(f.cap))}</p>`:''}${miniBox()}<div class="dacts">${tryBtn(f.key)}${f.ref?`<button data-open="circ:${f.ref}">${L('บทเรียนของวงจรนี้','Lesson for this circuit')}</button>`:''}</div>`, 'board') : ''}`;
    if (f) miniStart(f, $('#miniCv'));
  } else if (v.v==='circs'){
    kick.textContent=L(`แนวคิด ${KN.concepts.length} · วงจร ${KN.circuits.length}`,`${KN.concepts.length} ideas · ${KN.circuits.length} circuits`);
    title.textContent=L('อธิบายวงจร','Circuit explanations');
    let n=0;
    const card=(open, fig, name, sub, text)=>`<button class="citem" data-open="${open}" style="--k:${n++}"><span class="ctile"><canvas data-fig="${fig}" aria-hidden="true"></canvas></span><span class="dtx"><b>${esc(name)}</b>${sub?`<i>${esc(sub)}</i>`:''}<small>${rich(text)}</small></span></button>`;
    docBody.innerHTML=`<p class="dlead">${L('ทุกหัวข้อเป็นบทเรียนทีละขั้น มีวงจรจำลองสด ดูกระแสไหล อ่านมิเตอร์ และทายก่อนดูผล','Every topic is a step-by-step lesson with a live circuit: watch the current, read the meters, and guess before you look.')}</p>
      <h3 class="dgrp"><span>${L('แนวคิดพื้นฐาน','Basic ideas')}</span></h3><div class="clist2">${KN.concepts.map(c=>card('con:'+c.id, CON_FIG[c.id]||'', tx(c.title), '', c.text)).join('')}</div>
      <h3 class="dgrp"><span>${L('วงจรตัวอย่าง','Example circuits')}</span></h3><div class="clist2">${KN.circuits.map(c=>card('circ:'+c.id, 'circ:'+c.id, tx(c.title), tx(c.topic), c.why)).join('')}</div>
      <div class="dacts"><button data-open="plans:">${L(`ดูแปลนวงจรเพิ่มอีก ${PLANS.length} แบบ →`,`See ${PLANS.length} more circuit plans →`)}</button></div>`;
  } else if (v.v==='circ'){
    const k=KN.circuits.findIndex(x=>x.id===v.id), c=KN.circuits[k]; if (!c){ docBack(); return; }
    kick.textContent=L(`บทเรียนวงจร ${two(k+1)} / ${KN.circuits.length}`,`Circuit lesson ${two(k+1)} / ${KN.circuits.length}`);
    title.textContent=tx(c.title);
    f=figure('circ:'+c.id); lesson=circLesson(c);
  } else if (v.v==='con'){
    const k=KN.concepts.findIndex(x=>x.id===v.id), c=KN.concepts[k]; if (!c){ docBack(); return; }
    f=CON_FIG[c.id] && figure(CON_FIG[c.id]);
    kick.textContent=L(`บทเรียนแนวคิด ${two(k+1)} / ${KN.concepts.length}`,`Idea lesson ${two(k+1)} / ${KN.concepts.length}`);
    title.textContent=tx(c.title);
    if (f) lesson=conLesson(c, f);
    else docBody.innerHTML=`<section class="dsec lead"><p>${rich(c.text)}</p>${ulist(c.points)}</section>`;
  } else if (v.v==='plans'){
    const tab=v.tab==='mine'?'mine':'sys', saves=getSaves();
    kick.textContent=L(`ของระบบ ${PLANS.length} · ของฉัน ${saves.length}`,`${PLANS.length} ready-made · ${saves.length} saved`);
    title.textContent=L('แปลนวงจร','Circuit plans');
    let n=0;
    const tabs=`<div class="ptabs" role="tablist" aria-label="${L('แปลนวงจร','Circuit plans')}"><button role="tab" data-tab="sys" aria-selected="${tab==='sys'}">${L('ของระบบ','Ready-made')} <b>${PLANS.length}</b></button><button role="tab" data-tab="mine" aria-selected="${tab==='mine'}">${L('ของฉัน','Mine')} <b>${saves.length}</b></button></div>`;
    if (tab==='sys'){
      docBody.innerHTML=`${tabs}<p class="dlead">${L('วงจรสำเร็จรูปที่ระบบเตรียมไว้ แตะเพื่อเรียนทีละขั้น: ดูกระแสไหล อ่านมิเตอร์ ทายก่อนดูผล แล้วเปิดบนแผงหลัก','Ready-made circuits. Tap one for a step-by-step lesson: watch the current, read the meters, guess first, then open it on the main board.')}</p>`
        + PLAN_CAT.map(G=>{ const ps=PLANS.filter(p=>p.cat===G.id); return ps.length ? `<h3 class="dgrp"><span>${esc(tx(G.title))}</span><em>${ps.length}</em></h3><div class="clist2">${ps.map(p=>`<button class="citem" data-open="plan:${p.id}" style="--k:${n++}"><span class="ctile"><canvas data-fig="plan:${p.id}" aria-hidden="true"></canvas></span><span class="dtx"><b>${esc(planTitle(p))}</b><i class="${planIdeal(p)?'':'real'}">${planIdeal(p)?L('โหมดอุดมคติ','ideal mode'):L('โหมดจริง','real mode')}${p.quiz?L(' · มีคำถามให้ทาย',' · with a quiz'):''}</i><small>${fx(p.desc)}</small></span></button>`).join('')}</div>` : ''; }).join('');
    } else {
      docBody.innerHTML=`${tabs}<p class="dlead">${L('วงจรที่คุณบันทึกไว้ในเบราว์เซอร์นี้ (ที่เดียวกับปุ่ม "บันทึก / เปิดวงจร") แตะเพื่อดูกระแสไหลและค่ามิเตอร์','Circuits you saved in this browser (the same list as the "Save / open" button). Tap one to watch its current and meters.')}</p>
        <div class="psave"><input id="pName" maxlength="40" value="${esc(v.name ?? circuitName)}" aria-label="${L('ชื่อวงจร','Circuit name')}" placeholder="${L('ชื่อวงจร','Circuit name')}"><button class="primary" data-psave>${L('บันทึกวงจรบนแผงตอนนี้','Save the circuit on the board')}</button></div>
        <p id="pMsg" class="pmsg" role="status">${esc(v.msg||'')}</p>
        ${saves.length ? `<div class="clist2">${saves.map(s=>`<button class="citem" data-open="mine:${esc(s.name)}" style="--k:${n++}"><span class="ctile"><canvas data-fig="mine:${esc(s.name)}" aria-hidden="true"></canvas></span><span class="dtx"><b>${esc(s.name)}</b><i class="${s.data.ideal===false?'real':''}">${s.data.ideal===false?L('โหมดจริง','real mode'):L('โหมดอุดมคติ','ideal mode')}</i><small>${esc(L(`อุปกรณ์ ${s.data.comps.length} ชิ้น · สายไฟ ${s.data.wires.length} เส้น · `,`${s.data.comps.length} parts · ${s.data.wires.length} wire segments · `)+new Date(s.time).toLocaleString(L('th-TH','en-GB'),{dateStyle:'medium',timeStyle:'short'}))}</small></span></button>`).join('')}</div>`
          : `<div class="pempty"><p>${L('ยังไม่มีวงจรที่บันทึกไว้ ตั้งชื่อแล้วกดบันทึกด้านบน วงจรบนแผงหลักตอนนี้จะมาอยู่ที่นี่','No saved circuits yet. Give the circuit on the main board a name and save it above; it will appear here.')}</p></div>`}`;
    }
    v.msg='';
  } else if (v.v==='plan'){
    const k=PLANS.findIndex(x=>x.id===v.id), p=PLANS[k]; if (!p){ docBack(); return; }
    const G=PLAN_CAT.find(x=>x.id===p.cat);
    kick.textContent=`${G?tx(G.title)+' · ':''}${L('แปลน','Plan')} ${two(k+1)} / ${PLANS.length}`;
    title.textContent=planTitle(p);
    f=figure('plan:'+p.id); lesson=planLesson(p);
  } else if (v.v==='mine'){
    f=figure('mine:'+v.id); if (!f){ docBack(); return; }
    kick.textContent=L('แปลนของฉัน','My plan');
    title.textContent=f.title;
    lesson=mineLesson(f);
  }
  if (lesson){ docBody.innerHTML=lessonHTML(lesson.steps.filter(Boolean), lesson.all, f.save ? '' : tryBtn(f.key)); lessonStart(f, lesson.steps, v.at); }
  docPage.querySelector('.docbox').scrollTop=0;
  docBody.querySelectorAll('canvas[data-sym]').forEach(cv=>drawSym(cv, cv.dataset.sym));
  docBody.querySelectorAll('canvas[data-fig]').forEach(cv=>{ const f2=cv.dataset.fig && figure(cv.dataset.fig), st=stateFrom(f2); if (st) drawMini(cv, st, {fixH:true}); });
}

/* ---------- game modes (menu 04): levels played on a board of their own ---------- */
// Six modes in three pairs; the second mode of a pair opens once every level of the first is passed (progress in circuit-lab-game).
// A level runs on its own small state with the same solver (swapIn + step), is drawn by drawMini(), and gameEval() checks its goals
// on separate copies of the circuit (every switch case, AC peaks over a full cycle). Nothing here touches the main board.
const gamePage=$('#gamePage'), gameBody=$('#gameBody');
const GAME_MODES = [{"id": "solve", "tier": 1, "title": "Solve it!", "sub": {"th": "จำกัดอุปกรณ์ ต่อให้สำเร็จ", "en": "Limited parts: make it work"}, "how": {"th": "ใช้อุปกรณ์และสายไฟเท่าที่มีในคลัง ต่อให้ครบทุกเป้าหมาย ชิ้นที่วางมาให้ล็อกไว้ ย้ายหรือลบไม่ได้ ใช้สายน้อยได้ดาวเพิ่ม", "en": "Use only what is in the stock to meet every goal. The parts already on the board are locked. Fewer wires earn more stars."}}, {"id": "king", "tier": 1, "title": "King of hill", "sub": {"th": "ทำแปลนเดิมให้ใช้สายและอุปกรณ์น้อยลง", "en": "The same plan with fewer wires and parts"}, "how": {"th": "เริ่มจากแปลนในเมนูแปลนวงจร ย้าย หมุน และลบสายหรืออุปกรณ์ที่ไม่จำเป็น โดยมิเตอร์ทุกตัวต้องอ่านเท่าเดิม และหลอดทุกดวงสว่างเท่าเดิม คะแนน = จำนวนช่วงสาย + จำนวนอุปกรณ์ ยิ่งน้อยยิ่งดี พอใจแล้วกด \"ส่งแปลน\"", "en": "Start from a plan of the Circuit plans menu. Move, rotate and remove what is not needed while every meter reads the same and every bulb stays as bright. Score = wire segments + parts: lower is better. Press \"Submit plan\" when you are happy."}}, {"id": "rush", "tier": 1, "title": "Rush", "sub": {"th": "หลอดติดเมื่อได้กระแสพอดี", "en": "Bulbs that light only at the right current"}, "how": {"th": "หลอดในโหมดนี้ติดเฉพาะเมื่อกระแสเข้าตามที่กำหนด (±5%) วงแหวนรอบหลอดบอกว่ากระแสน้อยไป (ส้ม) มากไป (แดง) หรือพอดี (เขียว) ใช้ตัวต้านทาน ถ่าน หรือหม้อแปลงในคลังปรับให้พอดี ไม่จับเวลา", "en": "Here a bulb lights only at its set current (±5%). The ring around it shows too little (orange), too much (red) or just right (green). Use the resistors, cells or transformer in stock to get it right. No clock."}}, {"id": "solveplus", "tier": 2, "from": "solve", "title": "Solve it +", "sub": {"th": "ยากขึ้น และมีเวลาจำกัด", "en": "Harder, and against the clock"}, "how": {"th": "เหมือน Solve it! แต่โจทย์ซับซ้อนกว่า และต้องเสร็จก่อนหมดเวลา เหลือเวลามากได้ดาวมาก", "en": "Like Solve it!, with harder puzzles that must be finished before time runs out. The more time left, the more stars."}}, {"id": "zero", "tier": 2, "from": "king", "title": "Zero day", "sub": {"th": "แปลนที่ดีที่สุด พร้อมเงื่อนไขเพิ่ม", "en": "The best plan, with extra conditions"}, "how": {"th": "เหมือน King of hill แต่จะผ่านได้ต้องได้คะแนนเท่ากับแปลนที่ดีที่สุด และทำตามเงื่อนไขเพิ่มของแต่ละด่าน เช่น ชิ้นที่ตรึงไว้กับที่ หรือจุดกราวที่ต้องอยู่ตรงขั้วลบ", "en": "Like King of hill, but you only pass by matching the best plan's score and meeting each level's extra conditions, such as pinned parts or a ground that must sit on the negative terminal."}}, {"id": "chase", "tier": 2, "from": "rush", "title": "Chase!", "sub": {"th": "ตามหาจุดที่หายไปหรือพัง", "en": "Find what is missing or broken"}, "how": {"th": "วงจรดูเหมือนต่อครบแต่ไม่ทำงาน ใช้เครื่องมือวัดแรงดัน (แตะสองจุด) และวัดกระแส (แตะสายหรืออุปกรณ์) หาจุดที่พัง แล้วใช้เครื่องมือซ่อม ซ่อมผิดได้จำกัด ช่วงที่ขาดจะมีแรงดันคร่อมแต่ไม่มีกระแส", "en": "The circuit looks complete but does not work. Use the voltage probe (tap two nodes) and the current probe (tap a wire or part) to find the fault, then use Fix. Wrong fixes are limited. A break has voltage across it but no current."}}];
const LEVELS = [
{"id": "s1", "mode": "solve", "title": {"th": "ต่อหลอดให้ติด", "en": "Light it up"}, "brief": {"th": "ถ่านกับหลอดวางไว้ให้แล้ว ต่อสายไฟให้หลอด B1 ติด", "en": "The battery and the bulb are in place. Wire them so bulb B1 lights."}, "hint": {"th": "กระแสต้องออกจากขั้วหนึ่งของถ่าน ผ่านหลอด แล้วกลับเข้าอีกขั้ว ถ้าต่อแค่ด้านเดียว กระแสจะกลับไปที่ถ่านทางไหน", "en": "Current must leave one terminal, pass the bulb and come back to the other. If you wire only one side, how does it get back?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1\nW   2,4 6,4\nW   2,6 6,6", "box": [1, 2, 8, 7], "inv": [["wire", 12]], "goals": [{"k": "lit", "p": "B1"}], "par": 8},
{"id": "s2", "mode": "solve", "title": {"th": "สองดวงสว่างเต็มที่", "en": "Both at full brightness"}, "brief": {"th": "ให้หลอด B1 และ B2 ได้แรงดัน 9 V เต็มทั้งสองดวง", "en": "Give bulbs B1 and B2 the full 9 V each."}, "hint": {"th": "ถ้าต่อเรียงกัน แรงดัน 9 V ต้องแบ่งให้สองดวง แต่ละดวงได้เท่าไร แล้วถ้าแต่ละดวงต่อตรงกับถ่านล่ะ", "en": "In a row the 9 V is shared by two bulbs: how much does each get? And if each one sits straight across the battery?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1\nB   9,4 9,6   R=20 name=B2", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1\nB   9,4 9,6   R=20 name=B2\n\nW   2,4 9,4\nW   2,6 9,6", "box": [1, 2, 10, 7], "inv": [["wire", 18]], "goals": [{"k": "range", "p": "B1", "q": "v", "lo": 8.9, "hi": 9.1, "abs": true}, {"k": "range", "p": "B2", "q": "v", "lo": 8.9, "hi": 9.1, "abs": true}], "par": 14},
{"id": "s3", "mode": "solve", "title": {"th": "สวิตช์คุมดวงเดียว", "en": "One switch, one bulb"}, "brief": {"th": "วางสวิตช์ S1 ให้ B1 ติดตลอด แต่ B2 ติดเฉพาะตอน S1 ต่อ", "en": "Place switch S1 so that B1 is always lit, but B2 lights only while S1 is closed."}, "hint": {"th": "ถ้าสวิตช์อยู่ตรงที่กระแสของทั้งสองดวงต้องผ่าน ตัดแล้วจะดับกี่ดวง ลองหาทางที่เป็นของ B2 ดวงเดียว", "en": "If the switch sits where both bulbs' current must pass, how many go dark when it opens? Look for a path that belongs to B2 alone."}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1\nB   9,4 9,6   R=20 name=B2", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   6,4 6,6   R=20 name=B1\nB   9,4 9,6   R=20 name=B2\n\nS   6,4 8,4   name=S1\nW   2,4 6,4\nW   8,4 9,4\nW   2,6 9,6", "box": [1, 2, 10, 7], "inv": [["sw", 1], ["wire", 16]], "cases": [{"S1": 1}, {"S1": 0}], "goals": [{"k": "lit", "p": "B1"}, {"k": "lit", "p": "B2", "c": 0}, {"k": "dark", "p": "B2", "c": 1}], "par": 12},
{"id": "s4", "mode": "solve", "title": {"th": "ตัวไหนก็ได้", "en": "Either switch"}, "brief": {"th": "วางสวิตช์ S1 และ S2 ให้ B1 ติดเมื่อสวิตช์ตัวใดตัวหนึ่งต่อ และดับเมื่อตัดทั้งคู่", "en": "Place switches S1 and S2 so that B1 lights when either one is closed and goes dark only when both are open."}, "hint": {"th": "ถ้าสองสวิตช์เรียงกัน ตัดตัวเดียวก็ขาดทั้งทาง แต่ถ้าแต่ละตัวเป็นทางของตัวเองไปที่เดียวกันล่ะ", "en": "Two switches in a row: open one and the only path breaks. What if each one is its own route to the same place?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=9 name=E\nB   9,5 9,7   R=20 name=B1", "sol": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=9 name=E\nB   9,5 9,7   R=20 name=B1\nS   2,5 4,5   name=S1\nS   2,5 2,3   name=S2\nW   2,3 4,3 4,5\nW   4,5 9,5\nW   2,7 9,7", "box": [1, 1, 10, 8], "inv": [["sw", 2], ["wire", 20]], "cases": [{"S1": 0, "S2": 0}, {"S1": 1, "S2": 0}, {"S1": 0, "S2": 1}, {"S1": 1, "S2": 1}], "goals": [{"k": "dark", "p": "B1", "c": 0}, {"k": "lit", "p": "B1", "c": 1}, {"k": "lit", "p": "B1", "c": 2}, {"k": "lit", "p": "B1", "c": 3}], "par": 16},
{"id": "s5", "mode": "solve", "title": {"th": "ติดมิเตอร์ให้ถูก", "en": "Meters in the right place"}, "brief": {"th": "ต่อถ่านเข้ากับหลอดสองดวงที่ขนานกันอยู่ ให้แอมมิเตอร์วัดกระแสรวม (1 A) และโวลต์มิเตอร์วัดแรงดันคร่อมหลอด (12 V)", "en": "Connect the battery to the two parallel bulbs, with an ammeter reading the total current (1 A) and a voltmeter reading the voltage across a bulb (12 V)."}, "hint": {"th": "กระแสทั้งหมดต้องไหลผ่านแอมมิเตอร์ ส่วนโวลต์มิเตอร์ต้องแตะสองข้างของหลอด ถ้าโวลต์มิเตอร์อ่านติดลบ ลองหมุนกลับด้าน", "en": "All of the current must flow through the ammeter, while the voltmeter touches both ends of a bulb. If the voltmeter reads negative, turn it around."}, "start": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nB   7,5 7,7   R=24 name=B1\nB   11,5 11,7 R=24 name=B2\nW   7,5 11,5\nW   7,7 11,7", "sol": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nB   7,5 7,7   R=24 name=B1\nB   11,5 11,7 R=24 name=B2\nW   7,5 11,5\nW   7,7 11,7\n\nAM  2,3 4,3\nVM  13,5 13,7\nW   2,5 2,3\nW   4,3 7,3 7,5\nW   2,7 7,7\nW   11,5 13,5\nW   11,7 13,7", "box": [1, 1, 14, 9], "inv": [["am", 1], ["vm", 1], ["wire", 20]], "goals": [{"k": "lit", "p": "B1"}, {"k": "lit", "p": "B2"}, {"k": "meter", "t": "am", "lo": 0.99, "hi": 1.01}, {"k": "meter", "t": "vm", "lo": 11.9, "hi": 12.1}], "par": 16},
{"id": "p1", "mode": "solveplus", "title": {"th": "สวิตช์หลักกับสวิตช์รอง", "en": "Main switch, sub switch"}, "brief": {"th": "S1 เป็นสวิตช์หลัก ตัดแล้วดับหมด ส่วน S2 คุม B2 ดวงเดียว: B1 ติดเมื่อ S1 ต่อ และ B2 ติดเมื่อ S1 กับ S2 ต่อทั้งคู่", "en": "S1 is the main switch: open it and everything goes dark. S2 only controls B2: B1 lights when S1 is closed, and B2 when S1 and S2 are both closed."}, "hint": {"th": "กระแสของ B2 ต้องผ่านสวิตช์กี่ตัว และกระแสของ B1 ต้องผ่านตัวไหนบ้าง ลองวาง S2 ไว้หลัง S1", "en": "How many switches must B2's current pass, and which ones does B1's? Try putting S2 after S1."}, "start": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=9 name=E\nB   7,6 7,8   R=20 name=B1\nB   11,6 11,8 R=20 name=B2", "sol": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=9 name=E\nB   7,6 7,8   R=20 name=B1\nB   11,6 11,8 R=20 name=B2\n\nS   2,6 2,4   name=S1\nS   7,4 9,4   name=S2\nW   2,4 7,4 7,6\nW   9,4 11,4 11,6\nW   2,8 11,8", "box": [1, 2, 12, 9], "inv": [["sw", 2], ["wire", 24]], "time": 90, "cases": [{"S1": 0, "S2": 0}, {"S1": 1, "S2": 0}, {"S1": 0, "S2": 1}, {"S1": 1, "S2": 1}], "goals": [{"k": "dark", "p": "B1", "c": 0}, {"k": "dark", "p": "B2", "c": 0}, {"k": "lit", "p": "B1", "c": 1}, {"k": "dark", "p": "B2", "c": 1}, {"k": "dark", "p": "B1", "c": 2}, {"k": "dark", "p": "B2", "c": 2}, {"k": "lit", "p": "B1", "c": 3}, {"k": "lit", "p": "B2", "c": 3}]},
{"id": "p2", "mode": "solveplus", "title": {"th": "ทำให้ได้ 6 V", "en": "Make 6 V"}, "brief": {"th": "ใช้ตัวต้านทานในคลัง ทำให้โวลต์มิเตอร์ V อ่าน 6 V จากถ่าน 9 V", "en": "Use the resistors in stock to make voltmeter V read 6 V from the 9 V battery."}, "hint": {"th": "ตัวต้านทานอนุกรมแบ่งแรงดันตามสัดส่วนความต้านทาน 6 V คือสองในสามของ 9 V ส่วนที่โวลต์มิเตอร์คร่อมต้องมีความต้านทานเป็นกี่เท่าของส่วนที่เหลือ", "en": "Series resistors share the voltage in proportion. 6 V is two thirds of 9 V: how many times the rest must the part across the voltmeter be?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=9 name=E\nVM  11,5 11,7 name=V", "sol": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=9 name=E\nVM  11,5 11,7 name=V\n\nR   5,3 7,3   R=100\nR   9,5 9,7   R=200\nW   2,5 2,3 5,3\nW   7,3 9,3 9,5\nW   9,5 11,5\nW   9,7 11,7\nW   2,7 9,7", "box": [1, 2, 12, 8], "inv": [["res", 2, {"R": 100}], ["res", 1, {"R": 200}], ["res", 1, {"R": 300}], ["wire", 24]], "time": 90, "goals": [{"k": "range", "p": "V", "q": "v", "lo": 5.94, "hi": 6.06}]},
{"id": "p3", "mode": "solveplus", "title": {"th": "กระแส 0.3 A พอดี", "en": "Exactly 0.3 A"}, "brief": {"th": "ทำให้แอมมิเตอร์ I อ่าน 0.3 A จากถ่าน 12 V", "en": "Make ammeter I read 0.3 A from the 12 V battery."}, "hint": {"th": "I = V/R ถ้าต้องการ 0.3 A จาก 12 V ความต้านทานรวมต้องเป็นเท่าไร แล้วตัวต้านทานในคลังรวมกันแบบไหนได้ค่านั้น", "en": "I = V/R. For 0.3 A from 12 V, what total resistance do you need, and which stock resistors add up to it?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nAM  6,3 8,3   name=I", "sol": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nAM  6,3 8,3   name=I\n\nR   8,3 10,3  R=20\nR   10,3 12,3 R=20\nW   2,5 2,3 6,3\nW   12,3 12,7 2,7", "box": [1, 2, 13, 8], "inv": [["res", 2, {"R": 20}], ["res", 1, {"R": 30}], ["res", 1, {"R": 60}], ["wire", 24]], "time": 75, "goals": [{"k": "range", "p": "I", "q": "i", "lo": 0.297, "hi": 0.303}]},
{"id": "p4", "mode": "solveplus", "title": {"th": "LED สามสี", "en": "Three LEDs"}, "brief": {"th": "ให้ LED แดง เขียว และฟ้า ได้กระแส 15–25 mA ทุกดวงจากถ่าน 5 V", "en": "Give the red, green and blue LEDs 15–25 mA each from the 5 V battery."}, "hint": {"th": "สีฟ้าต้องการแรงดันมากที่สุด (ราว 3 V) จึงเหลือแรงดันให้ตัวต้านทานน้อยที่สุด ตัวต้านทานของมันควรใหญ่หรือเล็กกว่าของดวงอื่น", "en": "Blue needs the most voltage (about 3 V), leaving the least for its resistor. Should its resistor be bigger or smaller than the others'?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=5 name=E\nLED 6,6 6,8   color=red name=RED\nLED 9,6 9,8   color=green name=GREEN\nLED 12,6 12,8 color=blue name=BLUE", "sol": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=5 name=E\nLED 6,6 6,8   color=red name=RED\nLED 9,6 9,8   color=green name=GREEN\nLED 12,6 12,8 color=blue name=BLUE\n\nR   6,4 6,6   R=150\nR   9,4 9,6   R=150\nR   12,4 12,6 R=100\nW   2,6 2,4 12,4\nW   2,8 12,8", "box": [1, 2, 13, 9], "inv": [["res", 2, {"R": 150}], ["res", 1, {"R": 100}], ["res", 1, {"R": 47}], ["wire", 30]], "time": 150, "goals": [{"k": "range", "p": "RED", "q": "i", "lo": 0.015, "hi": 0.025}, {"k": "range", "p": "GREEN", "q": "i", "lo": 0.015, "hi": 0.025}, {"k": "range", "p": "BLUE", "q": "i", "lo": 0.015, "hi": 0.025}]},
{"id": "k1", "mode": "king", "title": {"th": "ไฟฉายกะทัดรัด", "en": "A compact flashlight"}, "brief": {"th": "แปลน \"ไฟฉาย + มิเตอร์\" ใช้สายยาวมาก ทำคะแนนให้ต่ำลง โดยมิเตอร์ยังอ่าน 0.45 A กับ 9 V", "en": "The flashlight plan uses long wires. Bring its score down while the meters still read 0.45 A and 9 V."}, "hint": {"th": "ขาของอุปกรณ์สองชิ้นแตะจุดเดียวกันได้โดยไม่ต้องมีสาย ถ้าอุปกรณ์สี่ชิ้นที่ต่ออนุกรมกันเป็นสี่ด้านของสี่เหลี่ยม จะเหลือสายกี่ช่วง", "en": "Two parts can share a node with no wire. If four parts in series form the four sides of a square, how many wire segments are left?"}, "start": "CIRCUIT v1 ideal=1\nDC  3,9 3,7    E=9\nS   7,3 9,3\nAM  11,3 13,3\nB   16,7 16,9  R=20\nVM  18,7 18,9\nW   3,7 3,3 7,3\nW   9,3 11,3\nW   13,3 16,3 16,7\nW   16,9 16,14 3,14 3,9\nW   16,7 18,7\nW   16,9 18,9", "sol": "CIRCUIT v1 ideal=1\nDC  4,6 4,4   E=9\nS   4,4 6,4\nAM  6,4 6,6\nB   6,6 4,6   R=20\nVM  6,7 4,7\nW   6,6 6,7\nW   4,6 4,7", "box": [2, 2, 19, 15], "par": 12, "best": 7},
{"id": "k2", "mode": "king", "title": {"th": "อนุกรมสามดวง", "en": "Three in series"}, "brief": {"th": "ทำแปลนหลอดสามดวงอนุกรมให้เล็กลง มิเตอร์ทุกตัวต้องอ่านเท่าเดิม", "en": "Shrink the three-bulbs-in-series plan. Every meter must read the same."}, "hint": {"th": "เรียงหลอดต่อกันเป็นแนวเดียว แล้ววางโวลต์มิเตอร์เป็นแนวคู่ขนานข้างๆ ขั้วของโวลต์มิเตอร์สองตัวที่อยู่ติดกันใช้จุดเดียวกันได้", "en": "Stack the bulbs in one line and the voltmeters in a line beside them: two neighbouring voltmeters can share a node."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nB   9,4 9,6    R=8 name=B1\nB   9,8 9,10   R=8 name=B2\nB   9,12 9,14  R=8 name=B3\nVM  12,4 12,6  name=V1\nVM  12,8 12,10 name=V2\nVM  12,12 12,14 name=V3\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "sol": "CIRCUIT v1 ideal=1\nB   4,4 4,6   R=8 name=B1\nB   4,6 4,8   R=8 name=B2\nB   4,8 4,10  R=8 name=B3\nVM  5,4 5,6   name=V1\nVM  5,6 5,8   name=V2\nVM  5,8 5,10  name=V3\nDC  6,10 6,8  E=12 name=E\nAM  6,8 6,6   name=I\nW   4,4 5,4\nW   4,6 5,6\nW   4,8 5,8\nW   4,10 5,10 6,10\nW   6,6 6,4 5,4", "box": [1, 2, 13, 16], "par": 20, "best": 16},
{"id": "k3", "mode": "king", "title": {"th": "ขนานสามสาขา", "en": "Three branches"}, "brief": {"th": "ทำแปลนตัวต้านทานสามตัวขนานให้เล็กลง แอมมิเตอร์ทุกตัวต้องอ่านเท่าเดิม", "en": "Shrink the three-resistors-in-parallel plan. Every ammeter must read the same."}, "hint": {"th": "แต่ละสาขาคือแอมมิเตอร์ต่อกับตัวต้านทาน วางเรียงเป็นแนวตั้งชิดกัน แล้วใช้สายสั้นๆ เชื่อมหัวกับท้ายของทุกสาขา", "en": "Each branch is an ammeter on a resistor. Stand them side by side and join all their tops and all their bottoms with short wires."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I_total\nAM  9,5 9,7    name=I_1\nAM  12,5 12,7  name=I_2\nAM  15,5 15,7  name=I_3\nR   9,9 9,11   R=12 name=R1\nR   12,9 12,11 R=24 name=R2\nR   15,9 15,11 R=6 name=R3\nW   2,8 2,3 4,3\nW   6,3 15,3\nW   9,3 9,5\nW   12,3 12,5\nW   15,3 15,5\nW   9,7 9,9\nW   12,7 12,9\nW   15,7 15,9\nW   9,11 9,14\nW   12,11 12,14\nW   15,11 15,14 2,14 2,10", "sol": "CIRCUIT v1 ideal=1\nDC  3,8 3,6   E=12 name=E\nAM  3,6 3,4   name=I_total\nAM  4,4 4,6   name=I_1\nR   4,6 4,8   R=12 name=R1\nAM  5,4 5,6   name=I_2\nR   5,6 5,8   R=24 name=R2\nAM  6,4 6,6   name=I_3\nR   6,6 6,8   R=6 name=R3\nW   3,4 6,4\nW   3,8 6,8", "box": [1, 2, 16, 15], "par": 18, "best": 14},
{"id": "k4", "mode": "king", "title": {"th": "หลอด A B C", "en": "Bulbs A, B, C"}, "brief": {"th": "ทำแปลนหลอด A อนุกรมกับ B ขนาน C ให้เล็กลง ทุกดวงต้องสว่างเท่าเดิม", "en": "Shrink the A-in-series-with-B-parallel-C plan. Every bulb must stay as bright."}, "hint": {"th": "B กับ C ขนานกัน จึงวางคู่กันโดยมีสายสั้นเชื่อมหัวและท้าย ส่วน A กับถ่านต่อเข้ามุมได้เลยโดยไม่ต้องมีสาย", "en": "B and C are in parallel: put them side by side with short wires at both ends. A and the battery can meet at the corners with no wire."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nB   5,3 7,3    R=6 name=A\nB   10,7 10,9  R=6 name=B\nB   14,7 14,9  R=6 name=C\nW   2,8 2,3 5,3\nW   7,3 14,3 14,7\nW   10,3 10,7\nW   10,9 10,13\nW   14,9 14,13 2,13 2,10", "sol": "CIRCUIT v1 ideal=1\nDC  4,6 4,4   E=12 name=E\nB   4,4 6,4   R=6 name=A\nB   6,4 6,6   R=6 name=B\nB   7,4 7,6   R=6 name=C\nW   6,6 4,6\nW   6,4 7,4\nW   6,6 7,6", "box": [1, 2, 15, 14], "par": 12, "best": 8},
{"id": "k5", "mode": "king", "title": {"th": "สองแหล่งจ่าย", "en": "Two sources"}, "brief": {"th": "ทำแปลนแหล่งจ่ายสองตัวให้เล็กลง I_1, I_2 และ I_3 ต้องอ่านเท่าเดิม", "en": "Shrink the two-sources plan. I_1, I_2 and I_3 must read the same."}, "hint": {"th": "ทั้งสามสาขาเริ่มที่จุดเดียวกัน (ขั้วลบ) และจบที่จุดเดียวกัน ลองให้สาขากลางตรงขึ้นไป แล้วอีกสองสาขาอ้อมทางซ้ายกับทางขวา", "en": "All three branches start at one node (the negative side) and end at another. Run the middle branch straight up and the other two around the left and the right."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E1\nR   3,3 5,3    R=4 name=R1\nAM  5,3 7,3    name=I_1\nAM  13,3 11,3  name=I_2\nR   13,3 15,3  R=2 name=R2\nDC  16,10 16,8 E=9 name=E2\nAM  9,5 9,7    name=I_3\nR   9,9 9,11   R=4 name=R3\nW   2,8 2,3 3,3\nW   7,3 11,3\nW   9,3 9,5\nW   9,7 9,9\nW   15,3 16,3 16,8\nW   9,11 9,13\nW   2,10 2,13 16,13 16,10", "sol": "CIRCUIT v1 ideal=1\nDC  8,8 6,8   E=12 name=E1\nR   6,8 6,6   R=4 name=R1\nAM  6,4 8,4   name=I_1\nAM  8,4 8,6   name=I_3\nR   8,6 8,8   R=4 name=R3\nDC  8,8 10,8  E=9 name=E2\nR   10,8 10,6 R=2 name=R2\nAM  10,4 8,4  name=I_2\nW   6,6 6,4\nW   10,6 10,4", "box": [1, 2, 17, 14], "par": 16, "best": 12},
{"id": "z1", "mode": "zero", "title": {"th": "ถ่านตรึง", "en": "Pinned cells"}, "brief": {"th": "ถ่านสองก้อนต่อขนาน E1 กับ E2 ตรึงอยู่กับที่ ย้ายไม่ได้ ต้องได้คะแนนไม่เกิน 17", "en": "Two cells in parallel with E1 and E2 pinned in place. Reach a score of 17 or less."}, "hint": {"th": "แอมมิเตอร์ของถ่านแต่ละก้อนชี้ขึ้นได้ ทำให้หัวทั้งสองอยู่แถวเดียวกัน แล้วหลอดกับโวลต์มิเตอร์ยืนอยู่ระหว่างแถวบนกับแถวล่าง", "en": "Each cell's ammeter can point up so both tops are on one row; the bulb and the voltmeter then stand between the top row and the bottom row."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=6 name=E1\nDC  6,10 6,8   E=6 name=E2\nAM  2,6 2,4    name=I_1\nAM  6,6 6,4    name=I_2\nB   12,8 12,10 R=12 name=B1\nVM  15,8 15,10 name=V\nW   2,8 2,6\nW   6,8 6,6\nW   2,4 2,3 12,3 12,8\nW   6,4 6,3\nW   12,10 12,15 2,15 2,10\nW   6,10 6,15\nW   12,8 15,8\nW   12,10 15,10", "sol": "CIRCUIT v1 ideal=1\nDC  2,10 2,8  E=6 name=E1\nDC  6,10 6,8  E=6 name=E2\nAM  2,8 2,6   name=I_1\nAM  6,8 6,6   name=I_2\nB   4,10 4,8  R=12 name=B1\nVM  3,8 3,10  name=V\nW   2,6 6,6\nW   2,10 6,10\nW   4,8 4,6\nW   3,8 4,8", "box": [1, 2, 16, 16], "lock": ["E1", "E2"], "best": 17},
{"id": "z2", "mode": "zero", "title": {"th": "กราวต้องอยู่ที่เดิม", "en": "Ground where it belongs"}, "brief": {"th": "ตัวแบ่งแรงดันสามตัว คะแนนต้องไม่เกิน 17 และจุดกราวต้องต่ออยู่ที่ขั้วลบของถ่าน E", "en": "The three-resistor divider. Score 17 or less, with the ground on the negative terminal of E."}, "hint": {"th": "เรียงตัวต้านทานเป็นแนวเดียว วางโวลต์มิเตอร์เป็นแนวคู่ขนาน แล้วให้ขา a ของกราวแตะจุดเดียวกับขั้วลบของถ่าน", "en": "Stack the resistors in a line with the voltmeters alongside, then let the ground's leg a touch the battery's negative terminal."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nR   9,4 9,6    R=100 name=R1\nR   9,8 9,10   R=200 name=R2\nR   9,12 9,14  R=300 name=R3\nVM  12,4 12,6  name=V_R1\nVM  12,8 12,10 name=V_R2\nVM  12,12 12,14 name=V_R3\nGND 4,15 4,17\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "sol": "CIRCUIT v1 ideal=1\nR   4,4 4,6   R=100 name=R1\nR   4,6 4,8   R=200 name=R2\nR   4,8 4,10  R=300 name=R3\nVM  5,4 5,6   name=V_R1\nVM  5,6 5,8   name=V_R2\nVM  5,8 5,10  name=V_R3\nDC  6,10 6,8  E=12 name=E\nAM  6,8 6,6   name=I\nGND 6,10 6,12\nW   4,4 5,4\nW   4,6 5,6\nW   4,8 5,8\nW   4,10 5,10 6,10\nW   6,6 6,4 5,4", "box": [1, 2, 13, 18], "best": 17, "goals": [{"k": "node", "a": "GND1", "al": "a", "b": "E", "bl": "a", "txt": {"th": "จุดกราวต่อที่ขั้วลบของถ่าน E", "en": "The ground is on the negative terminal of E"}}]},
{"id": "z3", "mode": "zero", "title": {"th": "เพิ่มแอมมิเตอร์", "en": "Add an ammeter"}, "brief": {"th": "หลอด A B C ต้องสว่างเท่าเดิม และต้องเพิ่มแอมมิเตอร์หนึ่งตัววัดกระแสรวม 1.33 A คะแนนไม่เกิน 7", "en": "Bulbs A, B and C stay as bright, and one added ammeter must read the total current, 1.33 A. Score 7 or less."}, "hint": {"th": "ถ้าอุปกรณ์อนุกรมสี่ชิ้นเป็นสี่ด้านของสี่เหลี่ยม ไม่ต้องใช้สายเลย แอมมิเตอร์ที่เพิ่มเข้าไปคือชิ้นที่สี่", "en": "Four series parts as the four sides of a square need no wire at all, and the ammeter you add is the fourth."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nB   5,3 7,3    R=6 name=A\nB   10,7 10,9  R=6 name=B\nB   14,7 14,9  R=6 name=C\nW   2,8 2,3 5,3\nW   7,3 14,3 14,7\nW   10,3 10,7\nW   10,9 10,13\nW   14,9 14,13 2,13 2,10", "sol": "CIRCUIT v1 ideal=1\nDC  4,6 4,4   E=12 name=E\nAM  4,4 6,4\nB   6,4 6,6   R=6 name=A\nB   6,6 4,6   R=6 name=B\nB   6,7 4,7   R=6 name=C\nW   6,6 6,7\nW   4,6 4,7", "box": [1, 2, 15, 14], "inv": [["am", 1]], "best": 7, "goals": [{"k": "meter", "t": "am", "lo": 1.32, "hi": 1.347}]},
{"id": "z4", "mode": "zero", "title": {"th": "สาขากลางตรึง", "en": "Pinned middle branch"}, "brief": {"th": "แหล่งจ่ายสองตัว ที่ I_3 กับ R3 ตรึงอยู่กับที่ ต้องได้คะแนนไม่เกิน 14", "en": "Two sources with I_3 and R3 pinned in place. Reach a score of 14 or less."}, "hint": {"th": "สาขาซ้ายและขวาวิ่งขนานไปกับสาขากลางได้ โดยห่างจากมันหนึ่งช่อง", "en": "The left and right branches can run alongside the middle one, one cell away."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E1\nR   3,3 5,3    R=4 name=R1\nAM  5,3 7,3    name=I_1\nAM  13,3 11,3  name=I_2\nR   13,3 15,3  R=2 name=R2\nDC  16,10 16,8 E=9 name=E2\nAM  9,5 9,7    name=I_3\nR   9,9 9,11   R=4 name=R3\nW   2,8 2,3 3,3\nW   7,3 11,3\nW   9,3 9,5\nW   9,7 9,9\nW   15,3 16,3 16,8\nW   9,11 9,13\nW   2,10 2,13 16,13 16,10", "sol": "CIRCUIT v1 ideal=1\nAM  9,5 9,7   name=I_3\nR   9,9 9,11  R=4 name=R3\nW   9,7 9,9\nDC  8,11 8,9  E=12 name=E1\nR   8,9 8,7   R=4 name=R1\nAM  8,7 8,5   name=I_1\nDC  10,11 10,9 E=9 name=E2\nR   10,9 10,7 R=2 name=R2\nAM  10,7 10,5 name=I_2\nW   9,11 8,11\nW   9,11 10,11\nW   8,5 9,5\nW   10,5 9,5", "box": [1, 2, 17, 14], "lock": ["I_3", "R3"], "best": 14},
{"id": "r1", "mode": "rush", "title": {"th": "ครึ่งแอมป์", "en": "Half an amp"}, "brief": {"th": "หลอด B1 (12 Ω) ติดเฉพาะเมื่อได้ 0.5 A พอดี จากถ่าน 12 V", "en": "Bulb B1 (12 Ω) lights only at exactly 0.5 A, from a 12 V battery."}, "hint": {"th": "ถ้าต่อหลอดตรงกับถ่าน กระแสเป็น 12/12 = 1 A มากไปสองเท่า ความต้านทานรวมต้องเป็นเท่าไร", "en": "Straight across the battery the bulb gets 12/12 = 1 A, twice too much. What total resistance do you need?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=12 name=E\nB   9,4 9,6   R=12 name=B1", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=12 name=E\nB   9,4 9,6   R=12 name=B1\n\nR   4,4 6,4   R=12\nW   2,4 4,4\nW   6,4 9,4\nW   2,6 9,6", "box": [1, 2, 10, 7], "inv": [["res", 1, {"R": 6}], ["res", 1, {"R": 12}], ["res", 1, {"R": 24}], ["wire", 16]], "goals": [{"k": "need", "p": "B1", "x": 0.5}], "par": 1},
{"id": "r2", "mode": "rush", "title": {"th": "สามในสี่แอมป์", "en": "Three quarters"}, "brief": {"th": "หลอด B1 (6 Ω) ต้องได้ 0.75 A พอดี จากถ่าน 9 V", "en": "Bulb B1 (6 Ω) needs exactly 0.75 A from a 9 V battery."}, "hint": {"th": "ต้องการความต้านทานรวม 12 Ω ตัวต้านทานในคลังรวมกันแบบไหนจึงเพิ่มได้อีก 6 Ω", "en": "You need 12 Ω in total: how can the stock resistors add the missing 6 Ω?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   9,4 9,6   R=6 name=B1", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nB   9,4 9,6   R=6 name=B1\n\nR   4,4 6,4   R=3\nR   6,4 8,4   R=3\nW   2,4 4,4\nW   8,4 9,4\nW   2,6 9,6", "box": [1, 2, 10, 7], "inv": [["res", 2, {"R": 3}], ["res", 1, {"R": 12}], ["wire", 16]], "goals": [{"k": "need", "p": "B1", "x": 0.75}], "par": 2},
{"id": "r3", "mode": "rush", "title": {"th": "สองดวงสองค่า", "en": "Two bulbs, two currents"}, "brief": {"th": "B1 ต้องได้ 1 A และ B2 ต้องได้ 0.5 A จากถ่าน 12 V หลอดดวงละ 6 Ω", "en": "B1 needs 1 A and B2 needs 0.5 A from a 12 V battery. Each bulb is 6 Ω."}, "hint": {"th": "ถ้าแต่ละดวงอยู่สาขาของตัวเอง ทั้งสองได้ 12 V เท่ากัน แต่ละสาขาต้องมีความต้านทานรวมเท่าไร", "en": "On branches of their own both get 12 V. What total resistance must each branch have?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nB   8,5 8,7   R=6 name=B1\nB   12,5 12,7 R=6 name=B2", "sol": "CIRCUIT v1 ideal=1\nDC  2,7 2,5   E=12 name=E\nB   8,5 8,7   R=6 name=B1\nB   12,5 12,7 R=6 name=B2\n\nR   8,3 8,5   R=6\nR   12,3 12,5 R=18\nW   2,5 2,3 12,3\nW   2,7 12,7", "box": [1, 1, 13, 9], "inv": [["res", 1, {"R": 6}], ["res", 1, {"R": 18}], ["res", 1, {"R": 12}], ["res", 1, {"R": 24}], ["wire", 26]], "goals": [{"k": "need", "p": "B1", "x": 1}, {"k": "need", "p": "B2", "x": 0.5}], "par": 2},
{"id": "r4", "mode": "rush", "title": {"th": "แรงดันไม่พอ", "en": "Not enough voltage"}, "brief": {"th": "B1 (12 Ω) ต้องได้ 1 A แต่ถ่าน E1 มีแค่ 4 V ใช้ถ่านในคลังเพิ่มแรงดัน", "en": "B1 (12 Ω) needs 1 A, but cell E1 only gives 4 V. Use the cells in stock to raise the voltage."}, "hint": {"th": "ถ่านที่ต่ออนุกรมโดยหันทางเดียวกัน แรงดันบวกกัน ต้องได้ 12 V ต้องใช้กี่ก้อน และขั้ว + อยู่ฝั่งไหน", "en": "Cells in series facing the same way add up. For 12 V, how many do you need, and which side is +?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=4 name=E1\nB   9,4 9,6   R=12 name=B1", "sol": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=4 name=E1\nB   9,4 9,6   R=12 name=B1\n\nDC  2,6 2,4   E=4\nDC  2,4 2,2   E=4\nW   2,2 9,2 9,4\nW   2,8 9,8 9,6", "box": [1, 1, 11, 9], "inv": [["dc", 3, {"E": 4}], ["res", 1, {"R": 12}], ["wire", 24]], "goals": [{"k": "need", "p": "B1", "x": 1}], "par": 2},
{"id": "r5", "mode": "rush", "title": {"th": "ขยายด้วยหม้อแปลง", "en": "Step it up"}, "brief": {"th": "ไฟสลับ 10 V (ค่าสูงสุด) ต้องทำให้ B1 (10 Ω) ได้ 2 A (ค่าสูงสุด)", "en": "A 10 V peak AC source must give B1 (10 Ω) 2 A peak."}, "hint": {"th": "ต้องการ 20 V คร่อมหลอด เป็นสองเท่าของแหล่งจ่าย หม้อแปลง 1:2 เปลี่ยนแรงดันได้กี่เท่า และขดไหนต่อกับแหล่งจ่าย", "en": "You need 20 V across the bulb, twice the source. What does a 1:2 transformer do to the voltage, and which coil goes to the source?"}, "start": "CIRCUIT v1 ideal=1\nAC  1,6 1,4   E=10 f=2 name=E\nB   6,4 6,6   R=10 name=B1", "sol": "CIRCUIT v1 ideal=1\nAC  1,6 1,4   E=10 f=2 name=E\nB   6,4 6,6   R=10 name=B1\n\nTP  3,4 3,6   grp=1 n=2\nTS  4,4 4,6   grp=1\nW   1,4 3,4\nW   1,6 3,6\nW   4,4 6,4\nW   4,6 6,6", "box": [0, 2, 8, 8], "ac": true, "inv": [["tr", 1, {"n": 2}], ["res", 1, {"R": 10}], ["wire", 16]], "goals": [{"k": "need", "p": "B1", "x": 2}], "par": 2},
{"id": "c1", "mode": "chase", "title": {"th": "สายที่หายไป", "en": "The missing wire"}, "brief": {"th": "ไฟฉายไม่ติด มีสายหายไปหนึ่งช่วง หาให้เจอแล้วต่อให้ครบ", "en": "The flashlight is dark: one wire segment is missing. Find it and wire it back."}, "hint": {"th": "ไล่ทางเดินกระแสจากขั้วบวกทีละช่วง ทางขาดที่จุดไหน", "en": "Follow the path from + one stretch at a time. Where does it stop?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nAM  4,2 6,2   name=I\nB   9,4 9,6   R=20 name=B1\nW   2,4 2,2 4,2\nW   6,2 9,2 9,4\nW   9,6 9,8 6,8\nW   5,8 2,8 2,6", "sol": "CIRCUIT v1 ideal=1\nDC  2,6 2,4   E=9 name=E\nAM  4,2 6,2   name=I\nB   9,4 9,6   R=20 name=B1\nW   2,4 2,2 4,2\nW   6,2 9,2 9,4\nW   9,6 9,8 6,8\nW   5,8 2,8 2,6\n\nW   5,8 6,8", "box": [1, 1, 10, 9], "inv": [["wire", 2]], "faults": [{"gap": true}], "goals": [{"k": "lit", "p": "B1"}, {"k": "range", "p": "I", "q": "i", "lo": 0.445, "hi": 0.455}], "par": 0, "tries": 3},
{"id": "c2", "mode": "chase", "title": {"th": "สายขาดในวงอนุกรม", "en": "A break in the loop"}, "brief": {"th": "หลอดสามดวงดับหมด มีสายช่วงหนึ่งขาดแต่มองไม่เห็น วัดหาแล้วซ่อมให้ถูกจุด ซ่อมผิดได้ 3 ครั้ง", "en": "All three bulbs are dark: one wire segment is broken, but you cannot see which. Measure, then fix the right one. 3 wrong fixes allowed."}, "hint": {"th": "ในวงที่ขาดไม่มีกระแส สายดีๆ จึงมีแรงดันคร่อม 0 V แต่ช่วงที่ขาดจะมีแรงดันของถ่านทั้งหมดคร่อมอยู่", "en": "With the loop broken there is no current, so a good wire has 0 V across it. The broken stretch has the whole battery voltage across it."}, "start": "CIRCUIT v1 ideal=1\nDC  2,9 2,7   E=12 name=E\nB   4,3 6,3   R=8 name=B1\nB   8,3 10,3  R=8 name=B2\nB   12,5 12,7 R=8 name=B3\nW   2,7 2,3 4,3\nW   6,3 8,3\nW   10,3 12,3 12,5\nW   12,7 12,9 2,9", "sol": "CIRCUIT v1 ideal=1\nDC  2,9 2,7   E=12 name=E\nB   4,3 6,3   R=8 name=B1\nB   8,3 10,3  R=8 name=B2\nB   12,5 12,7 R=8 name=B3\nW   2,7 2,3 4,3\nW   6,3 8,3\nW   10,3 12,3 12,5\nW   12,7 12,9 2,9", "box": [1, 2, 13, 10], "faults": [{"w": [7, 9, 8, 9]}], "goals": [{"k": "lit", "p": "B1"}, {"k": "lit", "p": "B2"}, {"k": "lit", "p": "B3"}], "par": 4, "tries": 3},
{"id": "c3", "mode": "chase", "title": {"th": "ดวงกลางดับ", "en": "The middle bulb is dark"}, "brief": {"th": "หลอดสามดวงขนานกัน ดวงกลางไม่ติด หาว่าพังที่หลอดหรือที่สาย ซ่อมผิดได้ 2 ครั้ง", "en": "Three bulbs in parallel and the middle one is dark. Is it the bulb or a wire? 2 wrong fixes allowed."}, "hint": {"th": "ถ้าหลอดดีแต่สายของมันขาด แรงดันคร่อมหลอดจะเป็นเท่าไร แล้วถ้าไส้หลอดขาดแต่สายดีล่ะ", "en": "If the bulb were fine but a wire of its branch broken, what voltage would it have across it? And if its filament were broken but the wires fine?"}, "start": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=12 name=E\nB   6,5 6,7   R=24 name=B1\nB   9,5 9,7   R=24 name=B2\nB   12,5 12,7 R=24 name=B3\nW   2,6 2,3 12,3 12,5\nW   6,3 6,5\nW   9,3 9,5\nW   12,7 12,9 2,9 2,8\nW   6,7 6,9\nW   9,7 9,9", "sol": "CIRCUIT v1 ideal=1\nDC  2,8 2,6   E=12 name=E\nB   6,5 6,7   R=24 name=B1\nB   9,5 9,7   R=24 name=B2\nB   12,5 12,7 R=24 name=B3\nW   2,6 2,3 12,3 12,5\nW   6,3 6,5\nW   9,3 9,5\nW   12,7 12,9 2,9 2,8\nW   6,7 6,9\nW   9,7 9,9", "box": [1, 2, 13, 10], "faults": [{"c": "B2", "kind": "open"}], "goals": [{"k": "lit", "p": "B1"}, {"k": "lit", "p": "B2"}, {"k": "lit", "p": "B3"}], "par": 2, "tries": 2},
{"id": "c4", "mode": "chase", "title": {"th": "ค่าผิดหนึ่งตัว", "en": "One wrong value"}, "brief": {"th": "ตัวต้านทานควรเป็น 100, 200 และ 300 Ω ให้มิเตอร์อ่าน 2, 4 และ 6 V แต่มีตัวหนึ่งค่าผิด (ค่าซ่อนไว้) ซ่อมผิดได้ 2 ครั้ง", "en": "The resistors should be 100, 200 and 300 Ω so the meters read 2, 4 and 6 V, but one has the wrong value (values are hidden). 2 wrong fixes allowed."}, "hint": {"th": "เทียบอัตราส่วนของแรงดันที่อ่านได้ ตัวต้านทานสองตัวที่อัตราส่วนยังถูกต้องน่าจะปกติดี", "en": "Compare the ratios of the readings: two resistors whose ratio is still right are probably fine."}, "start": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nR   9,4 9,6    R=100 name=R1\nR   9,8 9,10   R=200 name=R2\nR   9,12 9,14  R=300 name=R3\nVM  12,4 12,6  name=V_R1\nVM  12,8 12,10 name=V_R2\nVM  12,12 12,14 name=V_R3\nGND 4,15 4,17\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "sol": "CIRCUIT v1 ideal=1\nDC  2,10 2,8   E=12 name=E\nAM  4,3 6,3    name=I\nR   9,4 9,6    R=100 name=R1\nR   9,8 9,10   R=200 name=R2\nR   9,12 9,14  R=300 name=R3\nVM  12,4 12,6  name=V_R1\nVM  12,8 12,10 name=V_R2\nVM  12,12 12,14 name=V_R3\nGND 4,15 4,17\nW   2,8 2,3 4,3\nW   6,3 9,3 9,4\nW   9,6 9,8\nW   9,10 9,12\nW   9,14 9,15\nW   2,10 2,15 9,15\nW   9,4 12,4\nW   9,6 12,6\nW   9,8 12,8\nW   9,10 12,10\nW   9,12 12,12\nW   9,14 12,14", "box": [1, 2, 13, 18], "faults": [{"c": "R2", "kind": "value", "R": 2000}], "hide": ["R1", "R2", "R3"], "goals": [{"k": "range", "p": "V_R1", "q": "v", "lo": 1.98, "hi": 2.02}, {"k": "range", "p": "V_R2", "q": "v", "lo": 3.96, "hi": 4.04}, {"k": "range", "p": "V_R3", "q": "v", "lo": 5.94, "hi": 6.06}], "par": 0, "tries": 2}
];
let G=null, gView={v:'hub'}, gRaf=0;
const GKEY='circuit-lab-game';
const gProg = () => { try { const o=JSON.parse(localStorage.getItem(GKEY)||'{}'); return o && typeof o==='object' ? o : {}; } catch(e){ return {}; } };
const gPut = (id, stars) => { try { const o=gProg(); if (!(o[id]>=stars)) o[id]=stars; localStorage.setItem(GKEY, JSON.stringify(o)); } catch(e){} };
const gMode = id => GAME_MODES.find(m=>m.id===id);
const modeLevels = m => LEVELS.filter(l=>l.mode===m);
const modeDone = m => { const p=gProg(); return modeLevels(m).every(l=>p[l.id]>0); };
const modeOpen = M => M.tier===1 || modeDone(M.from);
const levelOpen = l => { const ls=modeLevels(l.mode), i=ls.indexOf(l), p=gProg(); return modeOpen(gMode(l.mode)) && (i===0 || p[ls[i-1].id]>0); };
const starsHTML = n => `<span class="gst" aria-label="${L(`${n} ดาว`,`${n} stars`)}">${[1,2,3].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`;
const GFLAGS = ['lock','keep','ghost','hide','inv','trueR'];

// the level circuit as plain data (with the game flags) and back
function gData(st){
  return { ideal:st.ideal, comps: st.comps.map(c=>{ const o={type:c.type,ax:c.ax,ay:c.ay,bx:c.bx,by:c.by,num:c.num,name:c.name}; for (const k in T[c.type].def) o[k]=c[k];
      if (c.off) o.off=1; for (const k of GFLAGS) if (c[k]!==undefined && c[k]!==false) o[k]=c[k]; return o; }),
    wires: st.wires.map(w=>[w.ax,w.ay,w.bx,w.by,w.off?1:0,w.ghost?1:0,w.lock?1:0]) };
}
function gState(d){
  const st=blankState(d.ideal!==false);
  swapIn(st, () => {
    comps=d.comps.filter(o=>T[o.type]).map(o=>{ const p={}; for (const k in T[o.type].def) if (typeof o[k]===typeof T[o.type].def[k]) p[k]=o[k];
      const c=mk(o.type,o.ax,o.ay,o.bx,o.by,p); if (o.num) c.num=o.num; if (o.name) c.name=o.name; if (o.off) c.off=true; for (const k of GFLAGS) if (o[k]!==undefined) c[k]=o[k]; return c; });
    for (const a of d.wires){ if (addWire(a[0],a[1],a[2],a[3],!!a[4])===1){ const w=wires[wires.length-1]; if (a[5]) w.ghost=true; if (a[6]) w.lock=true; } }
    numberAll();
  });
  return st;
}
const gCodeData = code => { const r=parseCode(code); return r.errs.length ? null : r.data; };

// goals: lit / dark (bulb ≥ 50 mA, LED ≥ 2 mA), range (i or v of a named part), need (Rush: current within ±5%), same (King: a reading kept),
// meter (any meter of a type reads in a range), eq (two currents equal), max (wires / parts / score at most n). c = only in switch case c
const LIT = c => c.type==='led' ? 2e-3 : 0.05;
function gameEval(d, lv, goals){
  const ac=d.comps.some(o=>o.type==='ac' && !o.off), cases=lv.cases||[null];
  const counts={wires:d.wires.length, parts:d.comps.length}; counts.score=counts.wires+counts.parts;
  const out=goals.map(g=>({g, ok:true, val:null, st:''}));
  cases.forEach((cs, ci) => {
    const st=gState(d);
    if (cs) for (const c of st.comps) if (c.type==='sw' && cs[lab(c)]!==undefined) c.on=!!cs[lab(c)];
    const n=ac?4000:700, from=ac?2000:n, pk=new Map();
    swapIn(st, () => { for (let k=0;k<n;k++){ step(); if (k>=from && k%2===0){ wireCurrents(); for (const c of comps){ const v=Math.abs(reading(c)); if (!(pk.get(c)>=v)) pk.set(c,v); } } }
      wireCurrents(); events.length=0; });
    const P2 = name => st.comps.find(c=>lab(c)===name);
    const rd = c => !c ? 0 : ac ? (pk.get(c)||0) : reading(c);
    goals.forEach((g, gi) => {
      if (g.c!==undefined && g.c!==ci) return;
      const o=out[gi], c=g.p && P2(g.p); let ok=false, v=null;
      switch (g.k){
        case 'lit': v=c ? (ac ? rd(c) : (c.type==='led' ? c.i : Math.abs(c.i))) : 0; ok=!!c && v>=LIT(c); break;
        case 'dark': v=c ? Math.abs(ac?rd(c):c.i) : 0; ok=v<1e-3; break;
        case 'range': v=c ? (ac ? rd(c) : (g.q==='v'?c.v:c.i)) : NaN; if (g.abs) v=Math.abs(v); ok=v>=g.lo && v<=g.hi; break;
        case 'need': v=c ? (ac ? rd(c) : Math.abs(c.i)) : 0; ok=Math.abs(v-g.x)<=g.x*0.05; o.st = ok ? 'ok' : v<g.x ? 'low' : 'high'; break;
        case 'same': v=rd(c); if (g.abs) v=Math.abs(v); ok=!!c && Math.abs(v-g.val)<=Math.max(1e-6, Math.abs(g.val)*0.01); break;
        case 'node': { const a=P2(g.a), b=P2(g.b); ok=!!a && !!b && a[g.al==='b'?'rb':'ra']===b[g.bl==='b'?'rb':'ra']; break; }
        case 'meter': { let best=null; for (const m of st.comps) if (m.type===g.t){ const x=Math.abs(rd(m)); if (best===null || Math.abs(x-(g.lo+g.hi)/2)<Math.abs(best-(g.lo+g.hi)/2)) best=x; } v=best; ok=best!==null && best>=g.lo && best<=g.hi; break; }
        case 'eq': { const a=P2(g.a), b=P2(g.b), x=rd(a), y=rd(b); v=[x,y]; ok=!!a && !!b && Math.abs(x-y)<=Math.max(1e-6, 0.01*Math.max(Math.abs(x),Math.abs(y))); break; }
        case 'max': v=counts[g.what]; ok=v<=g.n; break;
      }
      o.ok = o.ok && ok; if (v!==null) o.val=v;
    });
  });
  return {ok: out.every(o=>o.ok), goals: out, counts};
}
// readings of the start circuit, used to make the King of hill / Zero day goals (keep every meter reading, keep the bulbs lit)
function gKeepGoals(d, lv){
  const ac=d.comps.some(o=>o.type==='ac'), st=gState(d), pk=new Map(), n=ac?4000:700;
  swapIn(st, () => { for (let k=0;k<n;k++){ step(); if (ac && k>=2000 && k%2===0){ wireCurrents(); for (const c of comps){ const v=Math.abs(reading(c)); if (!(pk.get(c)>=v)) pk.set(c,v); } } } wireCurrents(); events.length=0; });
  const goals=[];
  for (const c of st.comps){
    if (c.type==='vm' || c.type==='am') goals.push({k:'same', p:lab(c), val: ac ? (pk.get(c)||0) : reading(c), q:c.type==='vm'?'v':'i'});
    else if ((c.type==='bulb' || c.type==='led') && Math.abs(ac?(pk.get(c)||0):c.i)>=LIT(c)) goals.push({k:'same', p:lab(c), val:Math.abs(ac?(pk.get(c)||0):c.i), abs:true, q:'i'});   // same brightness
  }
  return goals.concat(lv.goals||[]);
}
function goalText(g, lv){
  const cs = g.c!==undefined && lv.cases ? lv.cases[g.c] : null;
  const pre = cs ? Object.entries(cs).map(([k,v])=>`${k} ${v?L('ต่อ','closed'):L('ตัด','open')}`).join(', ')+' → ' : '';
  const u = g.q==='v' ? 'V' : 'A', ac = !!lv.ac;
  if (g.txt) return pre+tx(g.txt);
  switch (g.k){
    case 'lit': return pre+L(`${g.p} ติด`,`${g.p} lights`);
    case 'dark': return pre+L(`${g.p} ดับ`,`${g.p} stays dark`);
    case 'range': return pre+L(`${g.p} อ่านได้ ${fmt(g.lo,u)} ถึง ${fmt(g.hi,u)}`,`${g.p} reads ${fmt(g.lo,u)} to ${fmt(g.hi,u)}`);
    case 'need': return L(`${g.p} ติดเมื่อได้ ${fmt(g.x,'A')} (±5%)${ac?' ค่าสูงสุด':''}`,`${g.p} lights only at ${fmt(g.x,'A')} (±5%)${ac?' peak':''}`);
    case 'same': return g.abs ? L(`${g.p} สว่างเท่าเดิม (${fmt(g.val,'A')})`,`${g.p} as bright as before (${fmt(g.val,'A')})`) : L(`${g.p} ยังอ่านได้ ${fmt(g.val,u)}${ac?' (ค่าสูงสุด)':''}`,`${g.p} still reads ${fmt(g.val,u)}${ac?' (peak)':''}`);
    case 'meter': return g.t==='am' ? L(`มีแอมมิเตอร์อ่านได้ ${fmt(g.lo,'A')} ถึง ${fmt(g.hi,'A')}`,`An ammeter reads ${fmt(g.lo,'A')} to ${fmt(g.hi,'A')}`) : L(`มีโวลต์มิเตอร์อ่านได้ ${fmt(g.lo,'V')} ถึง ${fmt(g.hi,'V')}`,`A voltmeter reads ${fmt(g.lo,'V')} to ${fmt(g.hi,'V')}`);
    case 'eq': return L(`${g.a} กับ ${g.b} จ่ายกระแสเท่ากัน`,`${g.a} and ${g.b} carry equal currents`);
    case 'max': return g.what==='wires' ? L(`สายไฟไม่เกิน ${g.n} ช่วง`,`At most ${g.n} wire segments`) : g.what==='parts' ? L(`อุปกรณ์ไม่เกิน ${g.n} ชิ้น`,`At most ${g.n} parts`) : L(`สาย + อุปกรณ์ไม่เกิน ${g.n}`,`Wires + parts at most ${g.n}`);
  }
  return '';
}
function goalVal(o, lv){
  const g=o.g, v=o.val; if (v===null || v===undefined || (typeof v==='number' && !isFinite(v))) return '–';
  if (g.k==='eq') return v.map(x=>fmt(x,'A')).join(' · ');
  if (g.k==='max') return String(v);
  if (g.k==='node') return o.ok ? '✓' : '✗';
  return fmt(v, g.k==='lit'||g.k==='dark'||g.k==='need'||(g.q!=='v' && g.k!=='meter') ? 'A' : (g.k==='meter' ? (g.t==='am'?'A':'V') : 'V'));
}

// level start: flags by mode. Solve / Rush: what is placed is locked. King / Zero day: nothing to add, the parts the goals read are kept
// (they can move, not be deleted). Chase: everything locked, faults hidden (ghost wire or part, wrong value shown as "?")
function gStart(lv){
  gStop();
  const d=gCodeData(lv.start); if (!d) return;
  const st=gState(d), kh=lv.mode==='king'||lv.mode==='zero';
  const goals = kh ? gKeepGoals(d, lv) : (lv.goals||[]), must=new Set([...goals.map(g=>g.p), ...goals.map(g=>g.a), ...goals.map(g=>g.b)].filter(Boolean));
  for (const c of st.comps){ if (kh) c.keep = must.has(lab(c)) || ['dc','ac','tp','ts','gnd'].includes(c.type); else c.lock=true; if ((lv.lock||[]).includes(lab(c))){ c.lock=true; c.keep=false; } }
  for (const w of st.wires) if (!kh) w.lock=true;
  for (const f of lv.faults||[]){
    if (f.w){ const k=wkey({ax:f.w[0],ay:f.w[1],bx:f.w[2],by:f.w[3]}), w=st.wires.find(x=>wkey(x)===k); if (w){ w.off=true; w.ghost=true; } }
    else { const c=st.comps.find(x=>lab(x)===f.c); if (!c) continue; if (f.kind==='open'){ c.off=true; c.ghost=true; } else if (f.kind==='value'){ c.trueR=c.R; c.R=f.R; } }
  }
  for (const n of lv.hide||[]){ const c=st.comps.find(x=>lab(x)===n); if (c) c.hide=true; }
  G={lv, st, goals, sel:null, armed:null, tool:'build', undo:[], redo:[], t0:performance.now(), hinted:false, sol:false, done:false, fail:false,
    probes:0, wrong:0, marks:[], probeA:null, res:null, evalSig:'', evalAt:0, last:performance.now(), hover:null, drag:null,
    inv:(lv.inv||[]).filter(x=>x[0]!=='wire').map(x=>({type:x[0], n:x[1], p:x[2]||{}})), wireMax:((lv.inv||[]).find(x=>x[0]==='wire')||[])[1] ?? (kh?Infinity:0),
    start:{wires:st.wires.length, parts:st.comps.length}, faults:(lv.faults||[]).filter(f=>!f.gap).length};
  G.start.score=G.start.wires+G.start.parts;
}
function gStop(){ cancelAnimationFrame(gRaf); gRaf=0; }
const gPlayerWires = () => G.st.wires.filter(w=>!w.lock).length;
const gInvLeft = it => it.n - G.st.comps.filter(c=>c.inv && (it.type==='tr' ? c.type==='tp' : c.type===it.type) && Object.keys(it.p).every(k=>c[k]===it.p[k])).length;
function gPush(){ G.undo.push(JSON.stringify(gData(G.st))); if (G.undo.length>60) G.undo.shift(); G.redo.length=0; }
// swap the level state (undo, redo, a refused wire, the answer) but keep the board geometry of the last frame
function gSetState(st){ const v=G.st && G.st.view; G.st=st; if (v) st.view=v; G.sel=null; G.evalSig=''; }
function gRestore(s){ gSetState(gState(JSON.parse(s))); renderInv(); renderActs(); renderHud(); }
function gUndo(){ if (G.done || !G.undo.length) return; G.redo.push(JSON.stringify(gData(G.st))); gRestore(G.undo.pop()); }
function gRedo(){ if (G.done || !G.redo.length) return; G.undo.push(JSON.stringify(gData(G.st))); gRestore(G.redo.pop()); }
function gSay(t){ const el=$('#gMsg'); if (el){ el.textContent=t; el.classList.remove('gpop'); void el.offsetWidth; el.classList.add('gpop'); } }

// board geometry: lv.box = [x0, y0, x1, y1] is the playable area (grid points)
function gGrid(e){ const v=G.st.view, r=G.cv.getBoundingClientRect(); return { x:(e.clientX-r.left-v.ox)/v.uu-0.5+v.x0, y:(e.clientY-r.top-v.oy)/v.uu-0.5+v.y0 }; }
const gIn = (x,y) => { const b=G.lv.box; return x>=b[0] && x<=b[2] && y>=b[1] && y<=b[3]; };
const gSnap = g => { const b=G.lv.box; return { x:Math.max(b[0],Math.min(b[2],Math.round(g.x))), y:Math.max(b[1],Math.min(b[3],Math.round(g.y))) }; };
function gClamp(c){ const b=G.lv.box, x0=Math.min(c.ax,c.bx), x1=Math.max(c.ax,c.bx), y0=Math.min(c.ay,c.by), y1=Math.max(c.ay,c.by);
  const dx = x0<b[0] ? b[0]-x0 : x1>b[2] ? b[2]-x1 : 0, dy = y0<b[1] ? b[1]-y0 : y1>b[3] ? b[3]-y1 : 0; c.ax+=dx; c.bx+=dx; c.ay+=dy; c.by+=dy; }
const gHitComp = g => { const cs=G.st.comps; for (let k=cs.length-1;k>=0;k--) if (segHit(cs[k],g,0.2,0.8,0.5)) return cs[k]; return null; };
const gHitWire = g => { const ws=G.st.wires; for (let k=ws.length-1;k>=0;k--) if (segHit(ws[k],g,0,1,0.28)) return ws[k]; return null; };
const gNode = (g, r=0.4) => { const s={x:Math.round(g.x), y:Math.round(g.y)}; return gIn(s.x,s.y) && Math.hypot(g.x-s.x,g.y-s.y)<r ? s : null; };

function gPlace(it, g){
  if (G.done) return;
  if (gInvLeft(it)<=0){ gSay(L('ชิ้นนี้หมดแล้ว','None of these left')); return; }
  const s=gSnap(g); gPush(); let made=null;
  swapIn(G.st, () => {
    if (it.type==='tr'){ const used=new Set(comps.filter(c=>c.type==='tp'||c.type==='ts').map(c=>c.grp)); let grp=1; while (used.has(grp)) grp++;
      const p=mk('tp',s.x-1,s.y,s.x+1,s.y,Object.assign({grp},it.p)), q=mk('ts',s.x-1,s.y+1,s.x+1,s.y+1,{grp}); gClamp(p); if (p.ay+1>G.lv.box[3]){ p.ay--; p.by--; }
      q.ax=p.ax; q.bx=p.bx; q.ay=q.by=p.ay+1; p.inv=q.inv=true; q.invPair=true; comps.push(p,q); made=p; }
    else { const c=mk(it.type,s.x-1,s.y,s.x+1,s.y,structuredClone(it.p)); gClamp(c); c.inv=true; comps.push(c); assignNum(c); made=c; }
    dirty=true;
  });
  G.sel=made; G.armed=null; renderInv(); renderActs();
  gSay(L('วางแล้ว ลากเพื่อย้าย หรือใช้ปุ่มหมุนกับลบด้านล่าง','Placed: drag it to move, or use Rotate and Delete below'));
}
function gAddWire(a, b){
  const pts = a.x!==b.x && a.y!==b.y ? [a, {x:b.x, y:a.y}, b] : [a, b];   // a slanted drag becomes an L: across, then down
  const before=JSON.stringify(gData(G.st)); let added=0;
  swapIn(G.st, () => { for (let k=0;k<pts.length-1;k++) added+=addWire(pts[k].x,pts[k].y,pts[k+1].x,pts[k+1].y); if (added) dirty=true; });
  if (!added) return;
  if (gPlayerWires()>G.wireMax){ gSetState(gState(JSON.parse(before))); gSay(L(`สายไฟไม่พอ ใช้ได้ ${G.wireMax} ช่วง`,`Not enough wire: ${G.wireMax} segments allowed`)); return; }
  G.undo.push(before); if (G.undo.length>60) G.undo.shift(); G.redo.length=0; renderHud();
}
function gDelete(x){
  if (!x || G.done) return;
  if (x.lock){ gSay(L('ชิ้นนี้ล็อกไว้ ลบไม่ได้','This one is locked and cannot be deleted')); return; }
  if (x.keep){ gSay(L('ชิ้นนี้ต้องอยู่ในวงจร ย้ายได้แต่ลบไม่ได้','This part must stay: it can move but not be deleted')); return; }
  gPush();
  swapIn(G.st, () => { if (x.w) wires=wires.filter(w=>w!==x); else { const pair=(x.type==='tp'||x.type==='ts') && x.inv ? comps.find(c=>c!==x && c.grp===x.grp && (c.type==='tp'||c.type==='ts') && c.inv) : null; comps=comps.filter(c=>c!==x && c!==pair); } dirty=true; });
  G.sel=null; renderInv(); renderActs(); renderHud();
}
function gRotate(c){
  if (!c || c.w || G.done) return;
  if (c.lock){ gSay(L('ชิ้นนี้ล็อกไว้ หมุนไม่ได้','This one is locked and cannot turn')); return; }
  gPush(); const mx=(c.ax+c.bx)/2, my=(c.ay+c.by)/2, dx=c.bx-c.ax, dy=c.by-c.ay;
  c.ax=mx+dy/2; c.ay=my-dx/2; c.bx=mx-dy/2; c.by=my+dx/2; gClamp(c); G.st.dirty=true;
}
// Chase: fix a wire or part. A hidden fault is repaired; a good one costs one of the tries
function gFix(x){
  if (!x || G.done) return;
  if (x.ghost || (x.trueR!==undefined && x.R!==x.trueR)){
    if (x.ghost){ x.off=false; x.ghost=false; } if (x.trueR!==undefined){ x.R=x.trueR; x.hide=false; }
    G.st.dirty=true; G.marks.push({fix:x}); gSay(L('เจอแล้ว ตรงนี้พังจริง ซ่อมเรียบร้อย','Found it: this one was faulty, now fixed'));
  } else {
    G.wrong++; const left=(G.lv.tries||3)-G.wrong;
    gSay(left>0 ? L(`ตรงนี้ปกติดี เหลือซ่อมได้อีก ${left} ครั้ง ลองวัดเพิ่มก่อน`,`This one is fine. ${left} tries left: measure some more first`) : L('ซ่อมผิดครบแล้ว','Out of tries'));
    if (left<=0) gFail('tries');
  }
  renderHud();
}
// Chase probes: voltage between two nodes (from the solved potentials) and the current in a wire or part
function gNV(p){ let r=null; swapIn(G.st, () => { if (!topo) return; const k=topo.find(K(p.x,p.y)); if (topo.idx.get(k)!==undefined) r=NV(k); }); return r; }
function gProbe(g){
  if (G.tool==='volt'){
    const nd=gNode(g, 0.45); if (!nd) return;
    if (!G.probeA){ G.probeA=nd; gSay(L('แตะจุดที่สองเพื่ออ่านแรงดันระหว่างสองจุด','Tap a second node to read the voltage between them')); return; }
    const a=G.probeA, va=gNV(a), vb=gNV(nd); G.probeA=null; if (a.x===nd.x && a.y===nd.y) return;
    G.probes++; const txt = va===null||vb===null ? L('ไม่ได้ต่อ','not connected') : fmt(va-vb,'V');
    G.marks=G.marks.filter(m=>!m.v).slice(-2).concat([{v:true, a, b:nd, txt}]);
    gSay(L(`แรงดันระหว่าง (${a.x},${a.y}) กับ (${nd.x},${nd.y}) = ${txt}`,`Voltage between (${a.x},${a.y}) and (${nd.x},${nd.y}) = ${txt}`));
  } else if (G.tool==='amp'){
    const x=gHitComp(g) || gHitWire(g); if (!x) return; G.probes++;
    const txt=fmt(Math.abs(x.i),'A'); G.marks=G.marks.filter(m=>!m.i).slice(-2).concat([{i:true, x, txt}]);
    gSay(L(`กระแสใน${x.w?'สายช่วงนี้':' '+lab(x)} = ${txt}`,`Current in ${x.w?'this wire':lab(x)} = ${txt}`));
  }
  renderHud();
}

// win / lose. Stars: Solve wires ≤ par (★★★) or par+4 (★★); Solve+ time left ≥ 1/2 or 1/3; King score ≤ best or par;
// Zero day only passes at its best; Rush +1 no hint, +1 parts ≤ par; Chase +1 probes ≤ par, +1 no wrong fix
function gStars(){
  const lv=G.lv, c=G.res ? G.res.counts : {wires:0,parts:0,score:0};
  switch (lv.mode){
    case 'solve': { const w=gPlayerWires(); return w<=lv.par ? 3 : w<=lv.par+4 ? 2 : 1; }
    case 'solveplus': { const f=gTimeLeft()/lv.time; return f>=0.5 ? 3 : f>=1/3 ? 2 : 1; }
    case 'king': return c.score<=lv.best ? 3 : c.score<=lv.par ? 2 : 1;
    case 'zero': return 3;
    case 'rush': return 1 + (G.hinted?0:1) + (G.st.comps.filter(x=>x.inv).length<=lv.par ? 1 : 0);
    case 'chase': return 1 + (G.probes<=lv.par ? 1 : 0) + (G.wrong===0 ? 1 : 0);
  }
  return 1;
}
const gFaultsLeft = () => G.st.comps.some(c=>c.ghost || (c.trueR!==undefined && c.R!==c.trueR)) || G.st.wires.some(w=>w.ghost);
const gTimeLeft = () => Math.max(0, G.lv.time - (performance.now()-G.t0)/1000);
function gCanSubmit(){
  if (!G.res || !G.res.ok) return false;
  if (G.lv.mode==='king') return G.res.counts.score<G.start.score;
  if (G.lv.mode==='zero') return G.res.counts.score<=G.lv.best;
  return true;
}
function gWin(){
  if (G.done) return; G.done=true;
  const lv=G.lv, n=gStars(), had=modeDone(lv.mode), prev=gProg()[lv.id]||0; gPut(lv.id, n);
  const M=gMode(lv.mode), pair=GAME_MODES.find(m=>m.from===lv.mode), unlocked = pair && !had && modeDone(lv.mode);
  const ls=modeLevels(lv.mode), next=ls[ls.indexOf(lv)+1];
  const c=G.res.counts, stats=[];
  if (lv.mode==='solve' || lv.mode==='rush') stats.push(L(`ใช้สาย ${gPlayerWires()} ช่วง · วางอุปกรณ์ ${G.st.comps.filter(x=>x.inv).length} ชิ้น`,`${gPlayerWires()} wire segments · ${G.st.comps.filter(x=>x.inv).length} parts placed`));
  if (lv.mode==='solveplus') stats.push(L(`เหลือเวลา ${Math.ceil(gTimeLeft())} วินาที`,`${Math.ceil(gTimeLeft())} s left`));
  if (lv.mode==='king' || lv.mode==='zero') stats.push(L(`คะแนน ${c.score} (สาย ${c.wires} + อุปกรณ์ ${c.parts}) · เริ่มที่ ${G.start.score} · ดีที่สุดของเฉลย ${lv.best}`,`Score ${c.score} (${c.wires} wires + ${c.parts} parts) · started at ${G.start.score} · answer's best ${lv.best}`));
  if ((lv.mode==='king' || lv.mode==='zero') && c.score<lv.best) stats.push(L('ดีกว่าเฉลยอีก ยอดเยี่ยม','Better than the answer. Brilliant'));
  if (lv.mode==='chase') stats.push(L(`วัด ${G.probes} ครั้ง · ซ่อมผิด ${G.wrong} ครั้ง`,`${G.probes} measurements · ${G.wrong} wrong fixes`));
  const why=[];
  if (n<3) why.push(lv.mode==='solve' ? L(`ได้ 3 ดาวเมื่อใช้สายไม่เกิน ${lv.par} ช่วง`,`3 stars with at most ${lv.par} wire segments`)
    : lv.mode==='solveplus' ? L('ได้ 3 ดาวเมื่อเหลือเวลาอย่างน้อยครึ่งหนึ่ง','3 stars with at least half the time left')
    : lv.mode==='king' ? L(`ได้ 3 ดาวเมื่อคะแนนไม่เกิน ${lv.best} (2 ดาวที่ ${lv.par})`,`3 stars at a score of ${lv.best} or less (2 stars at ${lv.par})`)
    : lv.mode==='rush' ? L(`ได้ 3 ดาวเมื่อไม่ใช้คำใบ้ และวางอุปกรณ์ไม่เกิน ${lv.par} ชิ้น`,`3 stars without the hint and with at most ${lv.par} parts`)
    : L(`ได้ 3 ดาวเมื่อวัดไม่เกิน ${lv.par} ครั้ง และไม่ซ่อมผิด`,`3 stars with at most ${lv.par} measurements and no wrong fix`));
  gOver(`<p class="gok">${L('ผ่านด่าน','Level passed')}</p>${starsHTML(n)}<h3>${esc(tx(lv.title))}</h3>${stats.map(s=>`<p>${esc(s)}</p>`).join('')}${why.length?`<p class="dim">${esc(why[0])}</p>`:''}
    ${n>prev && prev ? `<p class="gnew">${L('ทำลายสถิติเดิมของคุณ','A new personal best')}</p>`:''}
    ${unlocked?`<p class="gunlock">${L(`ปลดล็อก ${pair.title} แล้ว`,`${pair.title} unlocked`)}</p>`:''}
    <div class="gobtns">${next?`<button class="primary" data-gnext="${next.id}">${L('ด่านถัดไป','Next level')} →</button>`:`<button class="primary" data-gback>${L(`จบ ${M.title} แล้ว เลือกโหมด`,`${M.title} complete: pick a mode`)}</button>`}<button data-gretry>${L('เล่นอีกครั้ง','Play again')}</button><button data-glist>${L('เลือกด่าน','Levels')}</button></div>`, true);
}
function gFail(why){
  if (G.done) return; G.done=true; G.fail=true;
  gOver(`<p class="gbad">${why==='time'?L('หมดเวลา','Time is up'):L('ซ่อมผิดครบแล้ว','Out of tries')}</p><h3>${esc(tx(G.lv.title))}</h3><p>${why==='time'?L('ลองวางแผนก่อนลงมือ แล้วเล่นใหม่อีกครั้ง','Plan before you build, then try again'):L('ลองวัดแรงดันคร่อมแต่ละช่วงให้มากขึ้นก่อนซ่อม จุดที่ขาดจะมีแรงดันคร่อมอยู่','Measure across more stretches before fixing: a break has voltage across it')}</p>
    <div class="gobtns"><button class="primary" data-gretry>${L('ลองใหม่','Try again')}</button><button data-gsol>${L('ดูเฉลย','Show the answer')}</button><button data-glist>${L('เลือกด่าน','Levels')}</button></div>`, false);
}
function gOver(html, win){ const o=$('#gOver'); if (!o) return; o.innerHTML=`<div class="gobox ${win?'win':'lose'}">${html}</div>`; o.hidden=false; renderHud(); renderActs(); }
function gShowSol(){
  const d=gCodeData(G.lv.sol); if (!d) return;
  gSetState(gState(d)); G.done=true; G.sol=true; G.marks=[]; const o=$('#gOver'); if (o) o.hidden=true;
  renderPlay(); gSay(L('นี่คือเฉลย ด่านนี้ยังไม่นับว่าผ่าน กด "เริ่มด่านใหม่" เพื่อลองเอง','This is the answer. The level does not count as passed: press "Restart level" to try it yourself'));
}

// live board: the level runs like the small boards of the lessons, then the overlays of the game are drawn on top
function gTick(now){
  if (!G || !G.cv || !G.cv.isConnected){ gRaf=0; return; }
  const rdt=Math.min(0.05,(now-G.last)/1000); G.last=now;
  const n=Math.min(80, Math.max(1, Math.round(rdt/DT)));
  swapIn(G.st, () => { for (let k=0;k<n;k++) step(); wireCurrents(); events.length=0; });
  const ph=reduce?0.35:1;
  const need=new Map(); if (G.res) for (const o of G.res.goals) if (o.g.k==='need') need.set(o.g.p, o.st);
  for (const el of G.st.comps){ el.phase+=flowSpeed(el.i)*rdt*ph; if (el.type==='bulb') el.glow = need.has(lab(el)) && need.get(lab(el))!=='ok' ? 0 : Math.abs(el.v*el.i)/4; if (el.type==='led') el.glow=Math.abs(el.i)/0.02; }
  for (const el of G.st.wires) el.phase+=flowSpeed(el.i)*rdt*ph;
  if (G.lv.time && !G.done){ const left=gTimeLeft(), el=$('#gTime'); if (el){ el.textContent=`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`; el.classList.toggle('low', left<15); } if (left<=0) gFail('time'); }
  if (!G.done && now-G.evalAt>250){ G.evalAt=now; const d=gData(G.st), sig=JSON.stringify(d);
    if (sig!==G.evalSig){ G.evalSig=sig; G.res=gameEval(d, G.lv, G.goals); renderGoals(); renderHud();
      if (G.res.ok && !['king','zero'].includes(G.lv.mode) && !gFaultsLeft()) gWin(); } }
  drawMini(G.cv, G.st, {box:G.lv.box, flow:true, labels:true, dotK:Math.min(1, 34/G.st.view?.uu || 1), maxH: narrow.matches ? Math.max(240, Math.round(innerHeight*0.5)) : 600, after:gOverlay});
  gRaf=requestAnimationFrame(gTick);
}
function gOverlay(x, Px, Py, uu, W, H){
  const now=performance.now(), fs=Math.max(10,Math.round(uu*0.34));
  const box=(c,pad)=>partBox(c,Px,Py,uu,pad);
  if (G.res) for (const o of G.res.goals) if (o.g.k==='need'){ const c=G.st.comps.find(q=>lab(q)===o.g.p); if (!c) continue;
    const col = o.st==='ok' ? C.accent : o.st==='low' ? C.copper : C.heat, mx=(Px(c.ax)+Px(c.bx))/2, my=(Py(c.ay)+Py(c.by))/2;
    x.save(); x.strokeStyle=col; x.lineWidth=2.5; x.shadowColor=col; x.shadowBlur=glow(10); x.globalAlpha=0.75+0.25*Math.sin(now/300); x.beginPath(); x.arc(mx,my,uu*0.85,0,7); x.stroke(); x.restore();
    labelBox(x, `${o.st==='ok'?'✓':o.st==='low'?'↑':'↓'} ${fmt(o.val||0,'A')} / ${fmt(o.g.x,'A')}`, mx, my+uu*1.25, 'c', fs, W, H); }
  for (const c of G.st.comps) if (c.lock || c.keep){ const b=box(c,0.6); x.save(); x.globalAlpha=0.7; x.fillStyle=c.lock?C.muted:C.copper; const lx=b[0]+b[2]-uu*0.12, ly=b[1]+uu*0.12, s=Math.max(4,uu*0.16);
    x.fillRect(lx-s, ly, s*2, s*1.4); x.strokeStyle=x.fillStyle; x.lineWidth=Math.max(1.2,uu*0.05); x.beginPath(); x.arc(lx, ly, s*0.75, Math.PI, 0); x.stroke(); x.restore(); }
  if (G.sel && (G.sel.w ? G.st.wires.includes(G.sel) : G.st.comps.includes(G.sel))){ x.save(); x.strokeStyle=C.accent; x.lineWidth=2; x.setLineDash([6,4]); x.lineDashOffset=-now*0.03; x.shadowColor=C.accent; x.shadowBlur=glow(10);
    if (G.sel.w){ x.lineWidth=uu*0.3; x.globalAlpha=0.35; x.setLineDash([]); x.beginPath(); x.moveTo(Px(G.sel.ax),Py(G.sel.ay)); x.lineTo(Px(G.sel.bx),Py(G.sel.by)); x.stroke(); } else { rrect(x, box(G.sel,0.7), uu*0.3); x.stroke(); } x.restore(); }
  const d=G.drag;
  if (d && d.mode==='wire' && d.to && (d.to.x!==d.from.x || d.to.y!==d.from.y)){ const pts = d.from.x!==d.to.x && d.from.y!==d.to.y ? [d.from,{x:d.to.x,y:d.from.y},d.to] : [d.from,d.to];
    x.save(); x.strokeStyle=C.accent; x.globalAlpha=0.8; x.lineWidth=Math.max(2,uu*0.14); x.setLineDash([uu*0.2,uu*0.15]); x.beginPath(); pts.forEach((p,k)=>k?x.lineTo(Px(p.x),Py(p.y)):x.moveTo(Px(p.x),Py(p.y))); x.stroke(); x.restore(); }
  const hv=G.hover; if (hv && !G.done){ x.save(); x.strokeStyle=C.accent; x.lineWidth=2; x.globalAlpha=0.8; x.beginPath(); x.arc(Px(hv.x),Py(hv.y),uu*0.26,0,7); x.stroke(); x.restore(); }
  if (G.probeA){ x.save(); x.fillStyle=C.copper; x.globalAlpha=0.6+0.4*Math.sin(now/200); x.beginPath(); x.arc(Px(G.probeA.x),Py(G.probeA.y),uu*0.24,0,7); x.fill(); x.restore(); }
  for (const m of G.marks){
    if (m.v){ x.save(); x.strokeStyle=C.copper; x.fillStyle=C.copper; x.lineWidth=1.5; x.setLineDash([4,4]); x.beginPath(); x.moveTo(Px(m.a.x),Py(m.a.y)); x.lineTo(Px(m.b.x),Py(m.b.y)); x.stroke();
      for (const p of [m.a,m.b]){ x.beginPath(); x.arc(Px(p.x),Py(p.y),uu*0.16,0,7); x.fill(); } x.restore();
      labelBox(x, 'ΔV '+m.txt, (Px(m.a.x)+Px(m.b.x))/2, (Py(m.a.y)+Py(m.b.y))/2-uu*0.5, 'c', fs, W, H); }
    else if (m.i && (m.x.w ? G.st.wires.includes(m.x) : G.st.comps.includes(m.x))){ labelBox(x, 'I '+m.txt, (Px(m.x.ax)+Px(m.x.bx))/2, (Py(m.x.ay)+Py(m.x.by))/2+uu*0.55, 'c', fs, W, H); }
    else if (m.fix && (m.fix.w ? G.st.wires.includes(m.fix) : G.st.comps.includes(m.fix))){ const p=m.fix; x.save(); x.strokeStyle=C.accent; x.lineWidth=3; x.shadowColor=C.accent; x.shadowBlur=glow(12);
      x.beginPath(); x.arc((Px(p.ax)+Px(p.bx))/2,(Py(p.ay)+Py(p.by))/2,uu*0.7,0,7); x.stroke(); x.restore(); }
  }
}

// pointer input on the game board (tap a stock item then a node, or drag it in; drag node to node for a wire; drag a part to move it)
function gBind(cv){
  cv.addEventListener('pointerdown', e => {
    if (!G || G.done) return; const g=gGrid(e); cv.setPointerCapture(e.pointerId);
    if (G.tool==='volt' || G.tool==='amp'){ gProbe(g); return; }
    if (G.tool==='fix'){ gFix(gHitComp(g) || gHitWire(g)); return; }
    if (G.armed){ gPlace(G.armed, g); return; }
    const c=gHitComp(g);
    if (c){ const q=(c.type==='tp'||c.type==='ts') && c.inv ? G.st.comps.find(k=>k!==c && k.inv && k.grp===c.grp && (k.type==='tp'||k.type==='ts')) : null;   // a placed transformer moves as a pair
      G.sel=c; G.drag={mode:'move', c, q, start:g, o:[c.ax,c.ay,c.bx,c.by], qo:q&&[q.ax,q.ay,q.bx,q.by], moved:false}; renderActs(); return; }
    const nd=gNode(g);
    if (nd && (G.wireMax>0)){ G.drag={mode:'wire', from:nd, to:nd}; return; }
    G.sel=gHitWire(g); renderActs();
  });
  cv.addEventListener('pointermove', e => {
    if (!G) return; const g=gGrid(e); G.hover = G.tool==='amp'||G.tool==='fix' ? null : gNode(g);
    const d=G.drag; if (!d) return;
    if (d.mode==='wire'){ d.to=gSnap(g); return; }
    const c=d.c; if (c.lock) return;
    let dx=Math.round(g.x-d.start.x), dy=Math.round(g.y-d.start.y); const [ax,ay,bx,by]=d.o, n={ax:ax+dx, ay:ay+dy, bx:bx+dx, by:by+dy}; gClamp(n);
    dx=n.ax-ax; dy=n.ay-ay;
    if (d.q){ const [qa,qb,qc,qd]=d.qo, m={ax:qa+dx, ay:qb+dy, bx:qc+dx, by:qd+dy}; gClamp(m); if (m.ax!==qa+dx || m.ay!==qb+dy) return; }
    if (n.ax!==c.ax || n.ay!==c.ay){ if (!d.moved){ gPush(); d.moved=true; } Object.assign(c,n); G.st.dirty=true;
      if (d.q){ const [qa,qb,qc,qd]=d.qo; Object.assign(d.q, {ax:qa+dx, ay:qb+dy, bx:qc+dx, by:qd+dy}); } }
  });
  cv.addEventListener('pointerup', () => {
    if (!G) return; const d=G.drag; G.drag=null; if (!d) return;
    if (d.mode==='wire'){ if (d.to.x!==d.from.x || d.to.y!==d.from.y) gAddWire(d.from, d.to); return; }
    if (!d.moved && d.c.type==='sw'){ d.c.on=!d.c.on; G.st.dirty=true; }
    renderActs();
  });
  cv.addEventListener('pointerleave', () => { if (G) G.hover=null; });
  cv.addEventListener('pointercancel', () => { if (G) G.drag=null; });
}

// ----- pages: hub, levels of a mode, play
function gameOpen(){ closeMenu(); gView={v:'hub'}; gamePage.hidden=false; document.body.classList.add('noscroll'); renderGame(); }
function gameClose(){ gStop(); G=null; gamePage.hidden=true; gameBody.innerHTML=''; document.body.classList.remove('noscroll'); }
function gameBack(){
  if (gView.v==='play'){ gStop(); G=null; gView={v:'levels', m:gView.m}; renderGame(); }
  else if (gView.v==='levels'){ gView={v:'hub'}; renderGame(); }
  else { gameClose(); openMenu(); }
}
function gameGo(lv){ gView={v:'play', m:lv.mode, id:lv.id}; gStart(lv); renderGame(); }
function renderGame(){
  const kick=$('#gKick'), title=$('#gTitle');
  if (gView.v==='hub'){
    gStop();
    kick.textContent=L('โหมดเกม','Game modes'); title.textContent=L('เลือกโหมด','Pick a mode');
    const p=gProg(), card=id=>{ const M=gMode(id), open=modeOpen(M), ls=modeLevels(id), done=ls.filter(l=>p[l.id]>0).length, st=ls.reduce((s,l)=>s+(p[l.id]||0),0), F=M.from&&gMode(M.from);
      return `<button class="gmode t${M.tier}${open?'':' locked'}" data-gmode="${id}"${open?'':' aria-disabled="true"'}><span class="gmtier">${M.tier===1?L('ขั้นแรก','Tier 1'):L('ขั้นสอง','Tier 2')}</span><b>${esc(M.title)}</b><small>${esc(tx(M.sub))}</small>
        <span class="gmprog">${open ? `${L(`ผ่าน ${done}/${ls.length} ด่าน`,`${done}/${ls.length} levels`)} · ★ ${st}/${ls.length*3}` : `<i class="glock" aria-hidden="true"></i>${esc(L(`ผ่าน ${F.title} ครบ ${modeLevels(F.id).length} ด่านเพื่อปลดล็อก`,`Pass all ${modeLevels(F.id).length} levels of ${F.title} to unlock`))}`}</span>
        <span class="gmbar" aria-hidden="true"><i style="width:${ls.length?done/ls.length*100:0}%"></i></span></button>`; };
    gameBody.innerHTML=`<p class="dlead">${L('สามโหมดแรกเล่นได้เลย โหมดขั้นสองที่ยากกว่าเปิดเมื่อผ่านโหมดคู่ของมันครบทุกด่าน ทุกด่านเล่นบนแผงของเกมเอง วงจรบนแผงหลักไม่เปลี่ยน','The first three modes are open. Each harder tier-two mode opens once you pass every level of its partner. Levels run on a board of their own; the circuit on the main board is not touched.')}</p>
      <div class="ghub">${[['solve','solveplus'],['king','zero'],['rush','chase']].map(([a,b])=>`<div class="gpair">${card(a)}<span class="garrow" aria-hidden="true"></span>${card(b)}</div>`).join('')}</div>`;
  } else if (gView.v==='levels'){
    gStop();
    const M=gMode(gView.m), ls=modeLevels(M.id), p=gProg();
    kick.textContent=`${M.tier===1?L('ขั้นแรก','Tier 1'):L('ขั้นสอง','Tier 2')} · ${ls.length} ${L('ด่าน','levels')}`; title.textContent=M.title;
    gameBody.innerHTML=`<p class="dlead">${fx(M.how)}</p><div class="clist2">${ls.map((l,i)=>{ const open=levelOpen(l);
      return `<button class="citem glevel${open?'':' locked'}" data-glevel="${l.id}" style="--k:${i}"${open?'':' aria-disabled="true"'}><span class="ctile"><canvas data-gfig="${l.id}" aria-hidden="true"></canvas></span><span class="dtx"><i>${L('ด่าน','Level')} ${i+1}${l.time?` · ${l.time} s`:''}</i><b>${esc(tx(l.title))}</b><small>${open?fx(l.brief):esc(L('ผ่านด่านก่อนหน้าเพื่อเปิด','Pass the level before to open it'))}</small></span>${starsHTML(p[l.id]||0)}</button>`; }).join('')}</div>`;
    gameBody.querySelectorAll('canvas[data-gfig]').forEach(cv=>{ const l=LEVELS.find(x=>x.id===cv.dataset.gfig), d=l && gCodeData(l.start); if (d) drawMini(cv, gState(d), {fixH:true}); });
  } else renderPlay();
  gamePage.querySelector('.gamebox').scrollTop=0;
}
function renderPlay(){
  if (!G) return; const lv=G.lv, M=gMode(lv.mode), ls=modeLevels(lv.mode), i=ls.indexOf(lv), chase=lv.mode==='chase', kh=lv.mode==='king'||lv.mode==='zero';
  $('#gKick').textContent=`${M.title} · ${L('ด่าน','Level')} ${i+1} / ${ls.length}`; $('#gTitle').textContent=tx(lv.title);
  gameBody.innerHTML=`<div class="gplay">
    <div class="gleft"><div class="gboard"><canvas id="gCv" aria-label="${L('แผงของเกม','Game board')}"></canvas><div id="gOver" class="gover" hidden></div></div>
      ${chase?`<div class="seg gtools" role="group" aria-label="${L('เครื่องมือ','Tools')}">${[['build',L('เลือก / ต่อสาย','Select / wire')],['volt',L('วัดแรงดัน','Voltage')],['amp',L('วัดกระแส','Current')],['fix',L('ซ่อม','Fix')]].map(([k,t])=>`<button data-gtool="${k}" aria-pressed="${G.tool===k}">${t}</button>`).join('')}</div>`:''}
      <div id="gInv" class="ginv"></div><div id="gActs" class="gacts"></div><p id="gMsg" class="gmsg" role="status"></p></div>
    <div class="gright"><section class="gcard"><p class="gchip">${esc(M.title)}${lv.time?` · ${L('จำกัดเวลา','timed')}`:''}${lv.ac?` · AC`:''}</p><p class="gbrief">${fx(lv.brief)}</p>
        <div class="ghint"${G.hinted?'':' hidden'}><b>${L('คำใบ้','Hint')}</b> ${fx(lv.hint)}</div>
        <div class="dacts"><button data-ghint${G.hinted?' hidden':''}>${L('ขอคำใบ้','Get a hint')}</button>${G.hinted||G.fail?`<button data-gsol>${L('ดูเฉลย','Show the answer')}</button>`:''}</div></section>
      <section class="ghud" id="gHud"></section>
      <section class="ggoals"><h4>${L('เป้าหมาย','Goals')}</h4><ul id="gGoals"></ul></section>
      <div class="gbtns"><button data-gundo title="Ctrl+Z">${L('ย้อนกลับ','Undo')}</button><button data-gredo title="Ctrl+Y">${L('ทำซ้ำ','Redo')}</button><button data-gretry>${L('เริ่มด่านใหม่','Restart level')}</button>${kh?`<button class="primary" data-gsubmit disabled>${L('ส่งแปลน','Submit plan')}</button>`:''}</div></div></div>`;
  G.cv=$('#gCv'); gBind(G.cv); renderInv(); renderActs(); renderGoals(); renderHud();
  if (!gRaf){ G.last=performance.now(); gRaf=requestAnimationFrame(gTick); }
}
function renderInv(){
  const el=$('#gInv'); if (!el || !G) return;
  const items=G.inv.map((it,k)=>{ const left=gInvLeft(it), name=it.type==='tr'?tName('tr'):tName(it.type), val=it.p.R!==undefined?fmt(it.p.R,'Ω'):it.p.E!==undefined?fmt(it.p.E,'V'):it.p.n!==undefined?'1:'+it.p.n:it.p.color!==undefined?LEDC[it.p.color][lang==='en'?'en':'name']:'';
    return `<button class="gitem${G.armed===it?' on':''}" data-ginv="${k}"${left<=0?' disabled':''} aria-label="${esc(name+' '+val)}"><canvas data-gsym="${it.type}" aria-hidden="true"></canvas><span>${esc(name)}${val?`<em>${esc(val)}</em>`:''}</span><b>×${left}</b></button>`; });
  const wl = G.wireMax===Infinity ? L('สายไม่จำกัด','unlimited wire') : G.wireMax>0 ? L(`สายเหลือ ${G.wireMax-gPlayerWires()} ช่วง`,`${G.wireMax-gPlayerWires()} wire segments left`) : '';
  const html = (items.length || wl) ? `<p class="ginvh">${L('คลังอุปกรณ์','Stock')}${wl?` · <span>${wl}</span>`:''}</p><div class="ginvl">${items.join('')}</div>${items.length?`<p class="ginvt">${L('แตะชิ้นแล้วแตะจุดบนแผง หรือลากไปวาง','Tap an item then a node, or drag it onto the board')}</p>`:''}` : '';
  // the same level and language: only update counts in place, so a drag that has started from a button is never cut off
  const key=G.lv.id+lang+G.inv.length+!!wl;
  if (el._key===key){ el.querySelectorAll('[data-ginv]').forEach(b=>{ const it=G.inv[+b.dataset.ginv], left=gInvLeft(it); b.querySelector('b').textContent='×'+left; b.disabled=left<=0; b.classList.toggle('on', G.armed===it); });
    const w=el.querySelector('.ginvh span'); if (w) w.textContent=wl; return; }
  el._key=key; el.innerHTML=html;
  el.querySelectorAll('canvas[data-gsym]').forEach(cv=>{ const t2=cv.dataset.gsym; if (t2==='tr'){ drawSym(cv,'tp'); } else drawSym(cv, t2); });
  el.querySelectorAll('[data-ginv]').forEach(b=>{ const it=G.inv[+b.dataset.ginv]; let p=null;
    b.addEventListener('pointerdown', e=>{ if (G.done) return; e.preventDefault(); b.setPointerCapture(e.pointerId); p={sx:e.clientX, sy:e.clientY, moved:false}; });
    b.addEventListener('pointermove', e=>{ if (p && Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>8) p.moved=true; });
    b.addEventListener('pointerup', e=>{ if (!p) return; const q=p; p=null; const r=G.cv.getBoundingClientRect();
      if (q.moved && e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom) gPlace(it, gGrid(e));
      else if (!q.moved){ G.armed = G.armed===it ? null : it; renderInv(); if (G.armed) gSay(L('แตะจุดบนแผงเพื่อวาง','Tap a node on the board to place it')); } });
    b.addEventListener('pointercancel', ()=>{ p=null; }); });
}
function renderActs(){
  const el=$('#gActs'); if (!el || !G) return; const x=G.sel;
  if (!x || G.done || !(x.w ? G.st.wires.includes(x) : G.st.comps.includes(x))){ el.innerHTML=''; return; }
  const name = x.w ? L('สายไฟ','Wire') : `${lab(x)} · ${tName(x.type)}`, state = x.lock ? L('ล็อกไว้','locked') : x.keep ? L('ต้องอยู่ในวงจร','must stay') : '';
  el.innerHTML=`<span class="gsel"><b>${subHTML(esc(name))}</b>${state?`<em>${state}</em>`:''}</span>${!x.w && !x.lock?`<button data-grot>${L('หมุน','Rotate')}</button>`:''}${!x.lock && !x.keep?`<button class="danger" data-gdel>${L('ลบ','Delete')}</button>`:''}${!x.w && x.type==='sw'?`<button data-gsw>${x.on?L('ตัดสวิตช์','Open it'):L('ต่อสวิตช์','Close it')}</button>`:''}`;
}
function renderGoals(){
  const el=$('#gGoals'); if (!el || !G) return; const res=G.res;
  el.innerHTML=G.goals.map((g,k)=>{ const o=res && res.goals[k], ok=o && o.ok;
    return `<li class="${ok?'ok':''}"><i aria-hidden="true">${ok?'✓':'·'}</i><span>${subHTML(esc(goalText(g, G.lv)))}</span>${o && !['lit','dark','max'].includes(g.k)?`<b>${esc(goalVal(o, G.lv))}</b>`:''}</li>`; }).join('');
}
function renderHud(){
  const el=$('#gHud'); if (!el || !G) return; const lv=G.lv, c=G.res ? G.res.counts : {wires:G.st.wires.length, parts:G.st.comps.length, score:G.st.wires.length+G.st.comps.length}, rows=[];
  if (lv.time) rows.push([L('เวลา','Time'), `<b id="gTime">${Math.floor(lv.time/60)}:${String(lv.time%60).padStart(2,'0')}</b>`]);
  if (lv.mode==='solve'||lv.mode==='solveplus'||lv.mode==='rush') rows.push([L('สายที่ใช้','Wire used'), `<b>${gPlayerWires()}</b>${G.wireMax!==Infinity?` / ${G.wireMax}`:''}`]);
  if (lv.mode==='king'||lv.mode==='zero') rows.push([L('คะแนน (สาย + อุปกรณ์)','Score (wires + parts)'), `<b>${c.score}</b> = ${c.wires} + ${c.parts}`], [L('เริ่มที่ / เป้า','Start / target'), `${G.start.score} / ${lv.mode==='zero'?lv.best:`★★ ${lv.par} · ★★★ ${lv.best}`}`]);
  if (lv.mode==='chase') rows.push([L('วัดไปแล้ว','Measured'), `<b>${G.probes}</b> ${L('ครั้ง','times')}`], [L('ซ่อมผิดได้อีก','Tries left'), `<b>${(lv.tries||3)-G.wrong}</b>`]);
  el.innerHTML=rows.map(([k,v])=>`<div class="ghrow"><span>${k}</span><span>${v}</span></div>`).join('') + (G.sol?`<p class="gsoln">${L('กำลังดูเฉลย','Showing the answer')}</p>`:'');
  const sb=gameBody.querySelector('[data-gsubmit]'); if (sb){ const can=!G.done && gCanSubmit(); sb.disabled=!can;
    sb.title = can ? '' : lv.mode==='zero' ? L(`ต้องครบทุกเป้าหมาย และคะแนนไม่เกิน ${lv.best}`,`Every goal, and a score of ${lv.best} or less`) : L('ต้องครบทุกเป้าหมาย และคะแนนน้อยกว่าตอนเริ่ม','Every goal, and a lower score than at the start'); }
  if (G.lv.time && G.done){ const t2=$('#gTime'); if (t2) t2.textContent=`${Math.floor(gTimeLeft()/60)}:${String(Math.floor(gTimeLeft()%60)).padStart(2,'0')}`; }
  renderInv();
}
gameBody.addEventListener('click', e=>{
  const at=s=>e.target.closest(s); let b;
  if ((b=at('[data-gmode]'))){ const M=gMode(b.dataset.gmode); if (!modeOpen(M)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } gView={v:'levels', m:M.id}; renderGame(); return; }
  if ((b=at('[data-glevel]'))){ const l=LEVELS.find(x=>x.id===b.dataset.glevel); if (l && levelOpen(l)) gameGo(l); else if (b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } return; }
  if (!G) return;
  if ((b=at('[data-gtool]'))){ G.tool=b.dataset.gtool; G.probeA=null; G.armed=null; gameBody.querySelectorAll('[data-gtool]').forEach(x=>x.setAttribute('aria-pressed', String(x===b)));
    gSay(G.tool==='volt'?L('แตะจุดสองจุด เพื่ออ่านแรงดันระหว่างกัน','Tap two nodes to read the voltage between them'):G.tool==='amp'?L('แตะสายหรืออุปกรณ์ เพื่ออ่านกระแสที่ไหลผ่าน','Tap a wire or a part to read its current'):G.tool==='fix'?L(`แตะจุดที่คิดว่าพังเพื่อซ่อม ซ่อมผิดได้ ${(G.lv.tries||3)-G.wrong} ครั้ง`,`Tap what you think is broken to fix it. ${(G.lv.tries||3)-G.wrong} wrong tries left`):''); return; }
  if (at('[data-ghint]')){ G.hinted=true; renderPlay(); return; }
  if (at('[data-gsol]')){ gShowSol(); return; }
  if (at('[data-gundo]')){ gUndo(); return; }
  if (at('[data-gredo]')){ gRedo(); return; }
  if (at('[data-gretry]')){ gStart(G.lv); renderPlay(); return; }
  if (at('[data-glist]')){ gStop(); G=null; gView={v:'levels', m:gView.m}; renderGame(); return; }
  if (at('[data-gback]')){ gStop(); G=null; gView={v:'hub'}; renderGame(); return; }
  if ((b=at('[data-gnext]'))){ const l=LEVELS.find(x=>x.id===b.dataset.gnext); if (l) gameGo(l); return; }
  if (at('[data-gsubmit]')){ if (gCanSubmit()) gWin(); return; }
  if (at('[data-grot]')){ gRotate(G.sel); return; }
  if (at('[data-gdel]')){ gDelete(G.sel); return; }
  if (at('[data-gsw]')){ if (G.sel && G.sel.type==='sw'){ G.sel.on=!G.sel.on; G.st.dirty=true; renderActs(); } return; }
});
$('#gBack').onclick=gameBack; $('#gClose').onclick=gameClose;
gamePage.addEventListener('click', e=>{ if (e.target===gamePage) gameClose(); });
function gameKey(e){
  if (e.key==='Escape'){ if (G && (G.armed || G.probeA)){ G.armed=null; G.probeA=null; renderInv(); return; } gameBack(); return; }
  if (!G || gView.v!=='play' || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  const mod=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
  if (mod && k==='z'){ e.preventDefault(); e.shiftKey ? gRedo() : gUndo(); }
  else if (mod && k==='y'){ e.preventDefault(); gRedo(); }
  else if (!mod && k==='r'){ gRotate(G.sel); }
  else if (!mod && (e.key==='Delete' || e.key==='Backspace')){ e.preventDefault(); gDelete(G.sel); }
}

// language: switch every text on the page. Static texts carry their English in data-en (inner HTML) and data-en-title / -aria-label /
// -placeholder; everything written by the script goes through L(). A circuit title that is one of ours (default name, example) is switched too
function namePairs(){
  const p=[['วงจรของฉัน','My circuit'],['วงจรใหม่','New circuit'],['วงจรจากโค้ด','Circuit from code'],['หลอดไฟสองดวงต่อขนาน','Two bulbs in parallel']];
  document.querySelectorAll('#preset option[data-en]').forEach(o=>{ if (o.value) p.push([o.dataset.th ?? o.textContent, o.dataset.en]); });
  for (const c of KN.circuits) if (c.title) p.push([c.title.th, c.title.en]);
  for (const k in DEV_EX) if (DEV_EX[k].title) p.push([DEV_EX[k].title.th, DEV_EX[k].title.en]);
  for (const q of PLANS) if (q.title) p.push([q.title.th, q.title.en]);
  return p;
}
function setLang(v){
  if (v!=='th' && v!=='en') return;
  lang=v; putPrefs({lang}); applyLang();
}
function applyLang(){
  document.documentElement.lang=lang;
  document.title=L('แผงต่อวงจรไฟฟ้า','Circuit Simulation');
  const md=document.querySelector('meta[name="description"]');
  if (md){ if (md.dataset.th===undefined) md.dataset.th=md.content; md.content=L(md.dataset.th, 'An interactive electric circuit simulator on a 20×20 node board: place parts, wire them up, and watch current, voltage, heat and energy in real time'); }
  document.querySelectorAll('[data-en]').forEach(el=>{ if (el.dataset.th===undefined) el.dataset.th=el.innerHTML; el.innerHTML = lang==='en' ? el.dataset.en : el.dataset.th; });
  for (const a of ['title','aria-label','placeholder']) document.querySelectorAll(`[data-en-${a}]`).forEach(el=>{
    if (!el.hasAttribute('data-th-'+a)) el.setAttribute('data-th-'+a, el.getAttribute(a)||'');
    el.setAttribute(a, el.getAttribute((lang==='en'?'data-en-':'data-th-')+a)); });
  pal.querySelectorAll('.pal').forEach(b=>{ const n=palName(b.dataset.type); b.setAttribute('aria-label',n); b.querySelector('span').textContent=n; });
  menuPanel.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.lang===lang)));
  refreshButtons(); setSound(soundOn); verLabel();
  const pair=namePairs().find(p=>p.includes(circuitName)), want=pair && pair[lang==='en'?1:0];
  if (want && want!==circuitName){ setCircuit(want); save(); }
  const ct=$('#cTitle'); if (document.activeElement!==ct) ct.value=circuitName;
  renderInsp(); renderList(); if (popAnchor) renderPop(); updateStatusHint(); drawScope();
  if (!$('#savePanel').hidden) renderSaves();
  if (!docPage.hidden) renderDoc();
  if (!gamePage.hidden) renderGame();
  if (!menuPanel.hidden) drawMenuIcons();
}

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
// small per-browser preferences (palette folded, sound on/off) share one key and are merged on every write
const uiPrefs=()=>{ try { return JSON.parse(localStorage.getItem('circuit-lab-ui')||'{}')||{}; } catch(e){ return {}; } };
const putPrefs=p=>{ try { localStorage.setItem('circuit-lab-ui', JSON.stringify(Object.assign(uiPrefs(),p))); } catch(e){} };
setPal(uiPrefs().pal!==false);
palBtn.onclick=()=>{ const open=app.classList.contains('palhide'); setPal(open); putPrefs({pal:open}); };

/* ---------- sound ---------- */
// assets/click.mp3 on every click; assets/success-notification.mp3 each time current starts to flow in the circuit
// (again after it has gone quiet). Browsers refuse sound before the first tap or click: play() failures are ignored on purpose.
let soundOn = uiPrefs().snd!==false;
const mkSnd = (src, vol, n) => { const a=Array.from({length:n},()=>{ const e=new Audio(src); e.preload='auto'; e.volume=vol; return e; }); let k=0;
  return () => { if (!soundOn) return; try { const e=a[k++%n]; e.currentTime=0; const p=e.play(); if (p && p.catch) p.catch(()=>{}); } catch(err){} }; };
const playClick = mkSnd('assets/click.mp3', 0.5, 4), playOk = mkSnd('assets/success-notification.mp3', 0.7, 1);
function setSound(on){ soundOn=on; const b=$('#snd'); b.setAttribute('aria-checked',String(on)); b.querySelector('.tl').textContent=on?L('เปิด','On'):L('ปิด','Off'); }
setSound(soundOn);
$('#snd').addEventListener('click', () => { setSound(!soundOn); putPrefs({snd:soundOn}); if (soundOn) playClick(); });
document.addEventListener('click', e => { if (e.target.closest && !e.target.closest('#snd')) playClick(); }, true);
// "current is flowing" = some part other than a meter or ground carries more than 1 µA. It must stay quiet for 0.6 s before it counts as gone,
// so an AC wave passing through zero does not re-trigger the sound.
let flowOn=false, flowSeen=0;
function trackFlow(now){
  let m=0; for (const c of comps) if (c.type!=='vm' && c.type!=='gnd') m=Math.max(m,Math.abs(c.i));
  if (m>1e-6){ flowSeen=now; if (!flowOn){ flowOn=true; playOk(); } }
  else if (flowOn && now-flowSeen>600) flowOn=false;
}

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
      if (w.temp>=TFAIL){ w.broken=true; dirty=true; w.failMsg=L(`สายไฟหลอมขาด กระแส ${fmt(Math.abs(w.i),'A')}`,`Wire melted: ${fmt(Math.abs(w.i),'A')}`)+` (t = ${t.toFixed(2)} s)`; events.push(w); } }
    handleEvents();
    let big=false;
    for (const c of comps){
      if (Math.abs(c.i)>20 && c.type!=='vm') big=true;
      if (c.type==='bulb') c.glow=Math.abs(c.v*c.i)/4;
      if (c.type==='led') c.glow=Math.abs(c.i)/0.02;
    }
    $('#warn').hidden=!big;
    trackFlow(now);
    const ph = reduce ? 0.35 : 1;
    for (const el of comps) el.phase+=flowSpeed(el.i)*rdt*Math.sqrt(speed)*ph;
    for (const el of wires) el.phase+=flowSpeed(el.i)*rdt*Math.sqrt(speed)*ph;
    if (sel){ hist.v.push(sel.v||0); hist.i.push(sel.i||0); if (hist.v.length>360){ hist.v.shift(); hist.i.shift(); } }
  }
  updateFx(rdt);
  if (docPage.hidden && gamePage.hidden) draw();
  if (++fr%6===0){ updateReads(); updateStatusHint(); drawScope(); updateEnergy(); updateList(); }
  requestAnimationFrame(loop);
}

// a link with #name opens an example (index.html#trans) or a circuit plan (index.html#bridge_smooth)
function openHash(h, announce){
  if (PRESETS[h]){ loadPreset(h, announce); return true; }
  const p=PLANS.find(x=>x.id===h && x.code), r=p && parseCode(p.code); if (!r || r.errs.length) return false;
  applyData(r.data); setCircuit(tx(p.title), announce); save(); return true;
}
const hp=(typeof location!=='undefined' && location.hash || '').slice(1);
if (!openHash(hp) && !load()) loadPreset('flash');
renderList();
try { addEventListener('hashchange', () => openHash(location.hash.slice(1), true)); } catch(e){}
resize(); renderInsp(); markPal(); applyLang();
requestAnimationFrame(loop);
})();
