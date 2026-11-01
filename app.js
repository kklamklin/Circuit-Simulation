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

// moving dots along a wire or part; Px/Py turn grid coordinates into pixels, uu is one grid cell
function flowDots(x, el, color, Px, Py, uu){
  if (Math.abs(el.i)<1e-6) return;
  const ax=Px(el.ax), ay=Py(el.ay), bx=Px(el.bx), by=Py(el.by), len=Math.hypot(bx-ax,by-ay); if (!len) return;
  const sp=0.5*uu, ph=(elMode?-el.phase:el.phase)*uu, off=((ph%sp)+sp)%sp;
  x.save(); x.globalCompositeOperation='lighter'; x.fillStyle=color;
  const r=Math.max(2,uu*0.09), dx=(bx-ax)/len, dy=(by-ay)/len, dir=Math.sign(elMode?-el.i:el.i);
  for (let d=off; d<len; d+=sp){ const q=d/len, px=ax+(bx-ax)*q, py=ay+(by-ay)*q;
    x.globalAlpha=0.18; x.beginPath(); x.arc(px,py,r*2.6,0,7); x.fill();
    x.globalAlpha=0.35; x.beginPath(); x.arc(px-dx*dir*r*1.6,py-dy*dir*r*1.6,r*0.8,0,7); x.fill();
    x.globalAlpha=1; x.beginPath(); x.arc(px,py,r,0,7); x.fill(); }
  x.restore();
}
function dots(el, color){ flowDots(ctx, el, color, P, P, u); }

function pill(text, x, y, al='c', strong=false){
  ctx.font=`500 ${Math.max(11,Math.round(u*0.4))}px "IBM Plex Mono","IBM Plex Sans Thai", monospace`;
  const w=ctx.measureText(text).width+10, h=Math.max(16,u*0.58);
  const x0 = al==='l' ? x : al==='r' ? x-w : x-w/2;
  let px=Math.min(Math.max(x0,2),side-w-2), py=Math.min(Math.max(y-h/2,2),side-h-2);
  ctx.fillStyle=C.panel; ctx.strokeStyle=C.line; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px,py,w,h,5) : ctx.rect(px,py,w,h); ctx.fill(); ctx.stroke();
  ctx.fillStyle=C.ink; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(text,px+5,py+h/2+0.5);
}

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
    if (!d.moved && d.c.type==='sw'){ d.c.on=!d.c.on; dirty=true; renderInsp(); }
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
  say(L(`หมุน ${lab(c)} ตามเข็มนาฬิกา 90° แล้ว · Ctrl+Z ย้อนกลับ`, `Rotated ${lab(c)} 90° clockwise · Ctrl+Z to undo`));
}
function deleteSel(){
  if (!sel) return; pushUndo(); if (sel.w) wires=wires.filter(w=>w!==sel); else comps=comps.filter(c=>c!==sel);
  dirty=true; select(null); save();
}
document.addEventListener('keydown', e => {
  if (!$('#confirm').hidden && e.key!=='Escape') return;
  if ($('#confirm').hidden){
    if (!docPage.hidden){ if (e.key==='Escape') docBack(); return; }
    if (!menuPanel.hidden){ if (e.key==='Escape') closeMenu(); return; }
    if (!$('#codePanel').hidden){ if (e.key==='Escape') closeCode(); return; }
  }
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
const TOOL_HINT_EN = {
  idle:'Idle: clicking the board changes nothing. Point at a node to see its potential',
  smart:'Smart: drag from node to node to add a wire · drag a part to move it · tap a part to select it · tap a switch to flip it',
  rotate:'Rotate: click a part to turn it 90° clockwise · click again to keep turning · Ctrl+Z to undo',
  select:'Select: click a node or a part, then choose to edit, disable or delete',
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
function pushUndo(){ if (!comps.length && !wires.length) return; undoStack.push(JSON.stringify(serialize())); if (undoStack.length>60) undoStack.shift(); }
function undo(){
  const st=undoStack.pop(); if (!st){ say(L('ไม่มีอะไรให้ย้อนกลับแล้ว','Nothing left to undo')); return; }
  applyData(JSON.parse(st)); closePop(); say(L('ย้อนกลับแล้ว','Undone'));
}
$('#undo').onclick=undo;
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
      h+=`<div class="pi${c.off?' off':''}" data-id="c${c.id}"><div class="pih"><span class="tag" style="--c:${tagCol(c)}">${lab(c)}</span><span class="cname">${tName(c.type)}${c.off?L(' · พักอยู่',' · disabled'):''}${c.broken?L(' · ไหม้',' · burnt'):''}</span></div>
        <div class="pia">${fs.length?`<button data-a="edit" aria-expanded="${popEdit.has(c.id)}">${L('ปรับค่า','Edit')}</button>`:''}${c.type==='sw'?`<button data-a="sw">${c.on?L('ตัดสวิตช์','Open switch'):L('ต่อสวิตช์','Close switch')}</button>`:''}<button data-a="off">${c.off?L('เปิดใช้งาน','Enable'):L('พักการทำงาน','Disable')}</button><button data-a="del" class="danger">${L('ลบ','Delete')}</button></div>
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
  if (a==='sw'){ el.on=!el.on; dirty=true; save(); }
  else if (a==='off'){ pushUndo(); el.off=!el.off; dirty=true; save(); say(L(`${isC?lab(el):'สายไฟ'} ${el.off?'พักการทำงานแล้ว ยังอยู่บนแผงแต่ไม่ได้ต่อในวงจร':'กลับมาทำงานแล้ว'}`, `${isC?lab(el):'Wire'} ${el.off?'disabled: still on the board but not part of the circuit':'works again'}`)); }
  else if (a==='del'){ pushUndo(); if (isC) comps=comps.filter(x=>x!==el); else wires=wires.filter(x=>x!==el); if (sel===el) select(null); dirty=true; save(); say(L(`ลบ${isC?lab(el):'สายไฟ'}แล้ว · Ctrl+Z ย้อนกลับ`, `Deleted ${isC?lab(el):'the wire'} · Ctrl+Z to undo`)); }
  renderPop(); renderInsp();
});
document.addEventListener('pointerdown', e=>{ if (popAnchor && !e.target.closest('#pop') && e.target!==cv) closePop(); });

/* ---------- inspector ---------- */
const insp=$('#insp');
function select(x){ if (sel!==x){ sel=x; hist={v:[],i:[]}; } renderInsp(); if (document.getElementById('clist')) updateList(); }
let shownBroken=null;
const stateTag = el => el.broken ? `<span class="state st-dead" id="rSt">${L('ไหม้แล้ว','Burnt')}</span>` : `<span class="state st-ok" id="rSt">${L('ปกติ','OK')}</span>`;
function repair(el){ el.broken=false; el.temp=TA; el.smokeT=0; if (!el.w){ el.vd=0; el.vp=0; el.ip=0; } dirty=true; }
function renderInsp(){
  if (!sel){
    insp.innerHTML=L(`<h3>วิธีใช้แผง</h3><ol class="howto">
      <li><b>วางอุปกรณ์</b> ลากจากแถบอุปกรณ์มาปล่อยบนแผง หรือแตะอุปกรณ์แล้วแตะจุดบนแผง</li>
      <li><b>ต่อสายไฟ</b> กดที่จุดใดก็ได้ แล้วลากไปปล่อยที่อีกจุด</li>
      <li><b>ย้าย</b> กดค้างที่ตัวอุปกรณ์แล้วลาก</li>
      <li><b>หมุน / ลบ</b> เลือกอุปกรณ์ แล้วกดปุ่มด้านล่าง หรือกด R / Delete</li>
      <li><b>สวิตช์</b> แตะเพื่อเปิดหรือปิด</li>
      <li><b>วัดแรงดันที่จุด</b> ชี้ที่จุดบนแผง ดูค่าใต้แผง (เทียบกับขั้วลบของแหล่งจ่าย)</li></ol>`, `<h3>How to use the board</h3><ol class="howto">
      <li><b>Place a part</b> drag it from the parts bar onto the board, or tap the part and then tap a node</li>
      <li><b>Add a wire</b> press any node and drag to another node</li>
      <li><b>Move</b> press and hold a part, then drag it</li>
      <li><b>Rotate / delete</b> select a part and use the buttons below, or press R / Delete</li>
      <li><b>Switch</b> tap it to open or close it</li>
      <li><b>Voltage at a node</b> point at a node and read the value under the board (measured from the source's negative terminal)</li></ol>`);
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
  let h=`<h3>${lab(sel)} · ${tName(sel.type)}${stateTag(sel)}</h3><p class="desc">${tDesc(sel.type)}</p>`;
  if (sel.type!=='vm') h+=`<div class="therm" title="${L('อุณหภูมิเทียบกับจุดไหม้','Temperature against the burn point')} ${TFAIL} °C"><span id="rTh" style="width:0"></span></div>`;
  for (const f of shownFields(sel.type))
    h+=`<label class="field"><span>${fName(sel.type,f)}</span>${fieldCtl(sel,f,`id="f_${f[0]}"`)}<span class="unit">${f[2]}</span></label>`;
  if (sel.type==='sw') h+=`<div class="acts" style="margin-bottom:8px"><button id="bSw">${sel.on?L('เปิดวงจร (ตัดไฟ)','Open (cut the current)'):L('ปิดวงจร (ต่อไฟ)','Close (let current flow)')}</button></div>`;
  h+=`<div class="reads"><div class="read"><small>${L('แรงดันคร่อม','Voltage')}</small><b id="rV">–</b></div><div class="read"><small>${L('กระแส','Current')}</small><b id="rI">–</b></div><div class="read"><small>${L('กำลัง','Power')}</small><b id="rP">–</b></div>
      <div class="read"><small>${L('อุณหภูมิ','Temperature')}</small><b id="rT">–</b></div><div class="read"><small>${L('ใช้พิกัดไป','Rating used')}</small><b id="rU">–</b></div><div class="read"><small>${sel.type==='dc'||sel.type==='ac'?L('พลังงานที่จ่าย','Energy supplied'):sel.type==='cap'||sel.type==='ind'?L('พลังงานสะสม','Energy stored'):L('พลังงานที่ใช้','Energy used')}</small><b id="rE">–</b></div></div>
      <div class="acts">${sel.broken?`<button id="bFix" class="danger">${L('ซ่อมอุปกรณ์','Repair')}</button>`:''}<button id="bOff">${sel.off?L('เปิดใช้งาน','Enable'):L('พักการทำงาน','Disable')}</button><button id="bRot">${L('หมุน 90°','Rotate 90°')}</button><button id="bDel">${L('ลบอุปกรณ์','Delete')}</button></div>`;
  insp.innerHTML=h;
  if (sel.type==='sw') $('#bSw').onclick=()=>{ sel.on=!sel.on; dirty=true; save(); renderInsp(); };
  $('#bRot').onclick=rotateSel; $('#bDel').onclick=deleteSel;
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
    return `<div class="crow${c===sel?' on':''}${c.off?' off':''}" data-cid="${c.id}"><div class="chead"><span class="tag" style="--c:${tagCol(c)}">${lab(c)}</span><span class="cname">${tName(c.type)}</span>${sw}${offb}${fix}</div>${ps?`<div class="cparams">${ps}</div>`:''}<div class="clive">${lv}</div></div>`; }).join('');
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
  if (act){ const a=act.dataset.act; if (a==='sw'){ c.on=!c.on; dirty=true; save(); } else if (a==='off'){ pushUndo(); c.off=!c.off; dirty=true; save(); renderPop(); } else repair(c); select(c); updateList(); return; }
  if (sel!==c) select(c);
});
document.addEventListener('input', e=>{
  const el=e.target; if (!el.dataset || !el.dataset.cid) return;
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
$('#sSave').onclick=()=>{
  const name=$('#sName').value.trim();
  if (!name){ sMsg(L('ใส่ชื่อวงจรก่อนบันทึก','Type a name before saving')); $('#sName').focus(); return; }
  if (!comps.length && !wires.length){ sMsg(L('แผงยังว่างอยู่ ยังไม่มีอะไรให้บันทึก','The board is empty, there is nothing to save')); return; }
  const doSave=()=>{ setCircuit(name); save(); const a=getSaves().filter(x=>x.name!==name); a.unshift({name,time:Date.now(),data:serialize()});
    sMsg(putSaves(a) ? L(`บันทึก "${name}" แล้ว`,`Saved "${name}"`) : L('บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล ลองใช้โค้ดวงจรแทน','Could not save: this browser does not allow storage. Use the circuit code instead')); renderSaves(); };
  if (getSaves().some(x=>x.name===name)) askConfirm(L(`มีวงจรชื่อ "${name}" อยู่แล้ว บันทึกทับใช่ไหม`,`A circuit named "${name}" already exists. Overwrite it?`), L('บันทึกทับ','Overwrite'), doSave); else doSave();
};
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

// the version (with an optional tag, e.g. '1.0.3.0 alpha') is written here and in the name of the version file ("version 1.1.0.0 alpha.txt"); change both together
const VERSION = '1.1.0.0 alpha';
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
// 'circ:id' or 'dev:id' -> {code, title, cap, ref, key}
function figure(key){
  const [k,id]=key.split(':');
  if (k==='circ'){ const c=KN.circuits.find(x=>x.id===id); return c ? {code:c.code, title:tx(c.title), ref:id, key} : null; }
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
function miniState(code){
  const r=parseCode(code); if (r.errs.length) return null;
  const st={comps:[], wires:[], topo:null, t:0, ideal:r.data.ideal!==false, energy:{sup:0,heat:0}, events:[], dirty:true};
  swapIn(st, () => {
    comps = r.data.comps.filter(o=>T[o.type]).map(o => { const p={}; for (const k in T[o.type].def) if (typeof o[k]===typeof T[o.type].def[k]) p[k]=o[k];
      const c=mk(o.type,o.ax,o.ay,o.bx,o.by,p); if (o.name) c.name=o.name; if (o.off) c.off=true; return c; });
    for (const a of r.data.wires) addWire(...a.slice(0,4), !!a[4]);
    numberAll();
  });
  return st;
}
// draw a circuit on a small board that fits the canvas. o: {fixH: keep the canvas height, flow, labels, time, maxH}
function drawMini(cv, st, o={}){
  const cs=st.comps, ws=st.wires;
  let x0=N, y0=N, x1=-1, y1=-1; const ext=(gx,gy)=>{ x0=Math.min(x0,gx); y0=Math.min(y0,gy); x1=Math.max(x1,gx); y1=Math.max(y1,gy); };
  for (const c of cs){ ext(c.ax,c.ay); ext(c.bx,c.by); } for (const w of ws){ ext(w.ax,w.ay); ext(w.bx,w.by); }
  if (x1<0){ x0=y0=0; x1=y1=4; }
  x0--; y0--; x1++; y1++;
  const gw=x1-x0+1, gh=y1-y0+1, W=cv.clientWidth||120;
  const H = o.fixH ? (cv.clientHeight||80) : Math.round(Math.min(W*gh/gw, o.maxH||1e9));
  if (!o.fixH) cv.style.height=H+'px';
  const d=Math.min(window.devicePixelRatio||1, 2), uu=Math.min(W/gw, H/gh), ox=(W-uu*gw)/2, oy=(H-uu*gh)/2;
  if (cv.width!==Math.round(W*d) || cv.height!==Math.round(H*d)){ cv.width=Math.round(W*d); cv.height=Math.round(H*d); }
  const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0);
  x.fillStyle=C.bg; x.fillRect(0,0,W,H);
  const Px=g=>ox+(g-x0+0.5)*uu, Py=g=>oy+(g-y0+0.5)*uu;
  if (uu>=6){ x.fillStyle=C.node; x.globalAlpha=0.45; const pr=Math.max(1,uu*0.07);
    for (let gy=y0; gy<=y1; gy++) for (let gx=x0; gx<=x1; gx++){ x.beginPath(); x.arc(Px(gx),Py(gy),pr,0,7); x.fill(); }
    x.globalAlpha=1; }
  x.lineCap='round';
  for (const w of ws){ if (w.off) continue; const ax=Px(w.ax), ay=Py(w.ay), bx=Px(w.bx), by=Py(w.by);
    x.strokeStyle='rgba(0,0,0,.55)'; x.lineWidth=Math.max(2,uu*0.2); x.beginPath(); x.moveTo(ax,ay); x.lineTo(bx,by); x.stroke();
    x.strokeStyle=C.wire; x.lineWidth=Math.max(1.2,uu*0.12); x.beginPath(); x.moveTo(ax,ay); x.lineTo(bx,by); x.stroke(); }
  for (const c of cs){ const ang=Math.atan2(c.by-c.ay, c.bx-c.ax);
    x.save(); x.translate(Px(c.ax),Py(c.ay)); x.rotate(ang); x.fillStyle=C.bg; x.fillRect(uu*0.3,-uu*0.5,uu*1.4,uu);
    drawSymbol(x,c,uu,Object.assign({},C,{ink:C.silk}),ang); x.restore(); }
  const deg=new Map(), bump=k=>deg.set(k,(deg.get(k)||0)+1);
  for (const w of ws){ bump(K(w.ax,w.ay)); bump(K(w.bx,w.by)); }
  for (const c of cs){ bump(K(c.ax,c.ay)); if (c.type!=='gnd') bump(K(c.bx,c.by)); }
  for (const [k,n] of deg){ const gx=k%N, gy=(k-gx)/N; x.fillStyle=C.wire; x.beginPath(); x.arc(Px(gx),Py(gy), (n>=3?0.17:0.12)*uu, 0, 7); x.fill(); }
  if (o.flow){ for (const w of ws) flowDots(x, w, elMode?C.el:C.copper, Px, Py, uu); for (const c of cs) if (c.type!=='vm' && c.type!=='gnd') flowDots(x, c, elMode?C.el:C.copper, Px, Py, uu); }
  if (o.labels){ x.font=`500 ${Math.max(10,Math.round(uu*0.36))}px "IBM Plex Mono","IBM Plex Sans Thai",monospace`; x.textBaseline='middle';
    const pill=(text, px, py, al) => { const w=x.measureText(text).width+8, h=Math.max(14,uu*0.5);
      let lx = al==='l' ? px : px-w/2; lx=Math.min(Math.max(lx,2),W-w-2); const ly=Math.min(Math.max(py-h/2,2),H-h-2);
      x.fillStyle=C.panel; x.strokeStyle=C.line; x.lineWidth=1; x.beginPath(); x.roundRect ? x.roundRect(lx,ly,w,h,4) : x.rect(lx,ly,w,h); x.fill(); x.stroke();
      x.fillStyle=C.ink; x.textAlign='left'; x.fillText(text, lx+4, ly+h/2+0.5); };
    for (const c of cs){ if (c.type==='gnd') continue; const mx=(Px(c.ax)+Px(c.bx))/2, my=(Py(c.ay)+Py(c.by))/2, txt=labelText(c);
      if (c.ay===c.by) pill(txt, mx, my-uu*0.9, 'c'); else pill(txt, mx+uu*0.6, my, 'l'); } }
  if (o.time){ x.font=`500 ${Math.max(10,Math.round(uu*0.34))}px "IBM Plex Mono",monospace`; x.textAlign='left'; x.textBaseline='top'; x.fillStyle=C.muted;
    x.fillText(`t = ${st.t.toFixed(2)} s${st.ideal?'':' · REAL'}`, 8, 8); }
}
// the live example board on a detail page
let mini=null;
function miniStart(code, cv){
  miniStop(); const st=miniState(code); if (!st || !cv) return;
  mini={st, cv, code, last:performance.now(), raf:0};
  drawMini(cv, st, {flow:true, labels:true, time:true, maxH:440});
  mini.raf=requestAnimationFrame(miniTick);
}
function miniStop(){ if (mini){ cancelAnimationFrame(mini.raf); mini=null; } }
function miniTick(now){
  if (!mini) return;
  if (!mini.cv.isConnected){ miniStop(); return; }
  const rdt=Math.min(0.05,(now-mini.last)/1000); mini.last=now;
  const n=Math.min(80, Math.max(1, Math.round(rdt/DT)));
  swapIn(mini.st, () => { for (let k=0;k<n;k++) step(); wireCurrents(); });
  const ph = reduce ? 0.35 : 1;
  for (const el of mini.st.comps){ el.phase+=flowSpeed(el.i)*rdt*ph; if (el.type==='bulb') el.glow=Math.abs(el.v*el.i)/4; if (el.type==='led') el.glow=Math.abs(el.i)/0.02; }
  for (const el of mini.st.wires) el.phase+=flowSpeed(el.i)*rdt*ph;
  drawMini(mini.cv, mini.st, {flow:true, labels:true, time:true, maxH:440});
  mini.raf=requestAnimationFrame(miniTick);
}
function drawSym(cv, type){
  const w=cv.clientWidth||64, h=cv.clientHeight||34, d=Math.min(window.devicePixelRatio||1, 2);
  cv.width=Math.round(w*d); cv.height=Math.round(h*d);
  const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0); x.clearRect(0,0,w,h);
  const uu=Math.min(w/2.3, h/1.5); x.translate((w-2*uu)/2, h/2);
  drawSymbol(x,{type,glow:0,on:true,color:0},uu,Object.assign({},C,{bg:C.panel}),0);
}
const MENU_ICON = `DC 0,2 0,0 E=9\nB 4,0 4,2 R=20\nW 0,0 4,0\nW 0,2 4,2`;
function drawMenuIcons(){
  const cv=menuPanel.querySelectorAll('.mitem canvas');
  if (cv[0]) drawSym(cv[0], 'res');
  const st=cv[1] && miniState(MENU_ICON); if (st) drawMini(cv[1], st, {fixH:true});
}

// navigation: a stack of views {v:'devs'|'dev'|'circs'|'circ'|'con', id}
let docStack=[];
function openMenu(){ menuPanel.hidden=false; menuBtn.setAttribute('aria-expanded','true'); drawMenuIcons(); }
function closeMenu(){ menuPanel.hidden=true; menuBtn.setAttribute('aria-expanded','false'); }
function openDoc(view){ docStack=[view]; docPage.hidden=false; document.body.classList.add('noscroll'); renderDoc(); }
function docGo(view){ docStack.push(view); renderDoc(); }
function docBack(){ if (docStack.length>1){ docStack.pop(); renderDoc(); } else { closeDoc(); openMenu(); } }
function closeDoc(){ miniStop(); docPage.hidden=true; docStack=[]; docBody.innerHTML=''; document.body.classList.remove('noscroll'); }
menuBtn.onclick=()=>{ menuPanel.hidden ? openMenu() : closeMenu(); };
$('#menuClose').onclick=closeMenu;
menuPanel.addEventListener('click', e=>{
  if (e.target===menuPanel){ closeMenu(); return; }
  const go=e.target.closest('[data-go]'); if (go){ closeMenu(); openDoc({v:go.dataset.go}); return; }
  const lb=e.target.closest('[data-lang]'); if (lb) setLang(lb.dataset.lang);
});
$('#docBack').onclick=docBack; $('#docClose').onclick=closeDoc;
docPage.addEventListener('click', e=>{ if (e.target===docPage) closeDoc(); });
docBody.addEventListener('click', e=>{
  const o=e.target.closest('[data-open]'); if (o){ const [v,id]=o.dataset.open.split(':'); docGo({v,id}); return; }
  const tr=e.target.closest('[data-try]'); if (tr){ tryOnBoard(tr.dataset.try); return; }
  if (e.target.closest('[data-restart]') && mini) miniStart(mini.code, mini.cv);
});
// put an example on the main board (same confirmation as opening any other circuit over the current one)
function tryOnBoard(key){
  const f=figure(key); if (!f) return; const r=parseCode(f.code); if (r.errs.length) return;
  const go=()=>{ pushUndo(); applyData(r.data); setCircuit(f.title, true); save(); closeDoc(); };
  if (comps.length||wires.length) askConfirm(L(`เปิด "${f.title}" แทนวงจรบนแผงตอนนี้ใช่ไหม วงจรเดิมจะหายถ้ายังไม่ได้บันทึก`,`Open "${f.title}" in place of the circuit on the board? The current circuit is lost unless you saved it.`), L('เปิดวงจร','Open circuit'), go);
  else go();
}
const ulist = a => `<ul>${(a||[]).map(v=>`<li>${esc(tx(v))}</li>`).join('')}</ul>`;
const miniBox = () => `<div class="mini"><canvas id="miniCv"></canvas><button class="mre" data-restart>${L('↻ เริ่มใหม่','↻ Restart')}</button></div>`;
const tryBtn = key => `<button class="primary" data-try="${key}">${L('ลองบนแผง','Try it on the board')}</button>`;
function renderDoc(){
  miniStop();
  const v=docStack[docStack.length-1]; if (!v){ closeDoc(); return; }
  const title=$('#docTitle');
  if (v.v==='devs'){
    title.textContent=L('อุปกรณ์วงจร','Circuit components');
    const groups=[]; for (const d of KN.devices){ const g=tx(d.group); let G=groups.find(x=>x.g===g); if (!G) groups.push(G={g, items:[]}); G.items.push(d); }
    docBody.innerHTML=`<p class="dlead">${L('เลือกอุปกรณ์เพื่อดูว่าทำอะไร ทำงานอย่างไร และวงจรพื้นฐานของมัน','Pick a part to see what it does, how it behaves, and a basic circuit with it')}</p>`
      + groups.map(G=>`<h3 class="dgrp">${esc(G.g)}</h3><div class="dlist">${G.items.map(d=>`<button class="ditem" data-open="dev:${d.id}"><canvas data-sym="${d.id}" aria-hidden="true"></canvas><span><b>${esc(tx(d.name))}</b><small>${esc(tx(d.what))}</small></span><i class="code">${esc(d.code)}</i></button>`).join('')}</div>`).join('');
  } else if (v.v==='dev'){
    const d=KN.devices.find(x=>x.id===v.id); if (!d){ docBack(); return; }
    const f=figure('dev:'+d.id);
    title.textContent=tx(d.name);
    docBody.innerHTML=`<div class="dhead"><canvas class="dbig" data-sym="${d.id}" aria-hidden="true"></canvas><div><p class="dkick">${esc(tx(d.group))} · ${esc(d.code)}</p><h3 class="dname">${esc(tx(d.name))}</h3><p>${esc(tx(d.what))}</p></div></div>
      <section><h4>${L('พฤติกรรม','How it behaves')}</h4>${ulist(d.behavior)}</section>
      ${d.formulas && d.formulas.length ? `<section><h4>${L('สูตร','Formulas')}</h4><div class="fchips">${d.formulas.map(x=>`<span>${esc(tx(x))}</span>`).join('')}</div></section>` : ''}
      ${d.params && d.params.length ? `<section><h4>${L('ค่าที่ตั้งได้','Settings')}</h4><table class="dtab"><tr><th>${L('ค่า','Value')}</th><th>${L('เริ่มต้น','Default')}</th><th>${L('ความหมาย','Meaning')}</th></tr>${d.params.map(p=>`<tr><td>${esc(p.key)}</td><td class="num">${esc(p.default)}${p.unit?' '+esc(p.unit):''}</td><td>${esc(tx(p.meaning))}</td></tr>`).join('')}</table></section>` : ''}
      <section class="dmodes"><div><h4>${L('โหมดอุดมคติ','Ideal mode')}</h4><p>${esc(tx(d.ideal_mode))}</p></div><div><h4>${L('โหมดจริง','Real mode')}</h4><p>${esc(tx(d.real_mode))}</p></div></section>
      <section><h4>${L('ข้อควรระวัง','Watch out')}</h4>${ulist(d.watch_out)}</section>
      <section class="dtry"><h4>${L('ลองทายก่อน','Guess first')}</h4><p>${esc(tx(d.try_it))}</p></section>
      ${f ? `<section><h4>${L('วงจรพื้นฐาน','Basic circuit')}: ${esc(f.title)}</h4>${f.cap?`<p class="dcap">${esc(f.cap)}</p>`:''}${miniBox()}<div class="dacts">${tryBtn(f.key)}${f.ref?`<button data-open="circ:${f.ref}">${L('อ่านคำอธิบายวงจรนี้','Read about this circuit')}</button>`:''}</div></section>` : ''}`;
    if (f) miniStart(f.code, $('#miniCv'));
  } else if (v.v==='circs'){
    title.textContent=L('อธิบายวงจร','Circuit explanations');
    const card=(open, fig, name, sub, text)=>`<button class="citem" data-open="${open}"><canvas data-fig="${fig}" aria-hidden="true"></canvas><span><b>${esc(name)}</b>${sub?`<i>${esc(sub)}</i>`:''}<small>${esc(text)}</small></span></button>`;
    docBody.innerHTML=`<h3 class="dgrp">${L('แนวคิดพื้นฐาน','Basic ideas')}</h3><div class="clist2">${KN.concepts.map(c=>card('con:'+c.id, CON_FIG[c.id]||'', tx(c.title), '', tx(c.text))).join('')}</div>
      <h3 class="dgrp">${L('วงจรตัวอย่าง','Example circuits')}</h3><div class="clist2">${KN.circuits.map(c=>card('circ:'+c.id, 'circ:'+c.id, tx(c.title), tx(c.topic), tx(c.why))).join('')}</div>`;
  } else if (v.v==='circ'){
    const c=KN.circuits.find(x=>x.id===v.id); if (!c){ docBack(); return; }
    title.textContent=tx(c.title);
    const src={meter:L('มิเตอร์','meter'), card:L('การ์ดอุปกรณ์','device card'), calculated:L('คำนวณเอง','work it out')};
    const when=r=>Array.isArray(r.t_s) ? `t = ${r.t_s[0]}–${r.t_s[1]} s` : (typeof r.t_s==='number' ? `t = ${r.t_s} s` : '');
    docBody.innerHTML=`${miniBox()}<p class="dkick" style="margin-top:10px!important">${esc(tx(c.topic))} · ${/ideal=0/.test(c.code)?L('โหมดจริง','real mode'):L('โหมดอุดมคติ','ideal mode')}</p>
      <div class="dacts">${tryBtn('circ:'+c.id)}</div>
      <section><h4>${L('ทำไมจึงเป็นแบบนี้','Why it works this way')}</h4><p>${esc(tx(c.why))}</p></section>
      <section><h4>${L('ค่าที่ควรอ่านได้','What you should read')}</h4><div class="rlist">${(c.readings||[]).map(r=>`<div class="rrow"><code>${esc(r.meter)}</code><b>${esc(typeof r.value==='number' ? fmt(r.value, r.unit||'') : r.value)}</b>${when(r)?`<em>${when(r)}</em>`:''}<em>${src[r.source]||esc(r.source||'')}</em>${r.note?`<small>${esc(tx(r.note))}</small>`:''}</div>`).join('')}</div></section>
      <section class="dtry"><h4>${L('ลองทายก่อน','Guess first')}</h4><p>${esc(tx(c.try_it))}</p></section>`;
    miniStart(c.code, $('#miniCv'));
  } else if (v.v==='con'){
    const c=KN.concepts.find(x=>x.id===v.id); if (!c){ docBack(); return; }
    const f=CON_FIG[c.id] && figure(CON_FIG[c.id]);
    title.textContent=tx(c.title);
    docBody.innerHTML=`${f?`${miniBox()}<p class="dcap" style="margin-top:6px">${L('วงจรประกอบ','Circuit shown')}: ${esc(f.title)}</p>`:''}
      <section><p>${esc(tx(c.text))}</p>${ulist(c.points)}</section>
      ${f?`<div class="dacts">${tryBtn(f.key)}${f.ref?`<button data-open="circ:${f.ref}">${L('อ่านคำอธิบายวงจรนี้','Read about this circuit')}</button>`:''}</div>`:''}`;
    if (f) miniStart(f.code, $('#miniCv'));
  }
  docPage.querySelector('.docbox').scrollTop=0;
  docBody.querySelectorAll('canvas[data-sym]').forEach(cv=>drawSym(cv, cv.dataset.sym));
  docBody.querySelectorAll('canvas[data-fig]').forEach(cv=>{ const f=cv.dataset.fig && figure(cv.dataset.fig), st=f && miniState(f.code); if (st) drawMini(cv, st, {fixH:true}); });
}

// language: switch every text on the page. Static texts carry their English in data-en (inner HTML) and data-en-title / -aria-label /
// -placeholder; everything written by the script goes through L(). A circuit title that is one of ours (default name, example) is switched too
function namePairs(){
  const p=[['วงจรของฉัน','My circuit'],['วงจรใหม่','New circuit'],['วงจรจากโค้ด','Circuit from code'],['หลอดไฟสองดวงต่อขนาน','Two bulbs in parallel']];
  document.querySelectorAll('#preset option[data-en]').forEach(o=>{ if (o.value) p.push([o.dataset.th ?? o.textContent, o.dataset.en]); });
  for (const c of KN.circuits) if (c.title) p.push([c.title.th, c.title.en]);
  for (const k in DEV_EX) if (DEV_EX[k].title) p.push([DEV_EX[k].title.th, DEV_EX[k].title.en]);
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
function setSound(on){ soundOn=on; const b=$('#snd'); b.setAttribute('aria-pressed',String(on)); b.textContent=L('เสียง: ','Sound: ')+(on?L('เปิด','on'):L('ปิด','off')); }
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
  if (docPage.hidden) draw();
  if (++fr%6===0){ updateReads(); updateStatusHint(); drawScope(); updateEnergy(); updateList(); }
  requestAnimationFrame(loop);
}

const hp=(typeof location!=='undefined' && location.hash || '').slice(1);
if (PRESETS[hp]) loadPreset(hp); else if (!load()) loadPreset('flash');
renderList();
try { addEventListener('hashchange', () => { const h2=location.hash.slice(1); if (PRESETS[h2]) loadPreset(h2,true); }); } catch(e){}
resize(); renderInsp(); markPal(); applyLang();
requestAnimationFrame(loop);
})();
