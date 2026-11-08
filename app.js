'use strict';
/* Tracker – Stimmung, Schlaf, Kaffee, Sport, Gewohnheiten. Daten nur lokal (localStorage). */
const VERSION = '1.7';
const KEY = 'tracker-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ds = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
const todayStr = () => ds(new Date());
const nowT = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const uid = () => Math.random().toString(36).slice(2, 9);
const tmin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fmtDur = m => m == null ? '–' : Math.floor(m / 60) + ':' + pad(Math.round(m % 60)) + ' h';
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const f1 = x => x == null ? '–' : (Math.round(x * 10) / 10).toString().replace('.', ',');
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const MOOD_E = ['😞', '🙁', '😐', '🙂', '😄'];
const MOOD_N = ['sehr schlecht', 'schlecht', 'okay', 'gut', 'sehr gut'];
const REST_E = ['😫', '😕', '😐', '🙂', '🤩'];
const TAGS = ['ruhig', 'froh', 'energiegeladen', 'dankbar', 'müde', 'gestresst', 'ängstlich', 'traurig', 'gereizt', 'einsam'];
const QS = ['Was hat dir heute gutgetan?', 'Was hat dich heute belastet?', 'Wofür bist du heute dankbar?', 'Was hat dich heute überrascht?', 'Was war der beste Moment des Tages?', 'Was würdest du morgen gern anders machen?', 'Wie viel Energie hattest du, und woran lag es?', 'Mit wem hast du heute gesprochen, und wie war es?', 'Was beschäftigt dich gerade am meisten?', 'Worauf freust du dich?'];
const MCOL = i => `var(--m${i})`;

const DEF_CFG = {
  theme: 'light', limit: 400, halfLife: 5, v: 3,
  coffee: [
    { id: 'cb_espresso', name: 'CoffeeB Espresso', mg: 65, e: '☕', est: true },
    { id: 'cb_lungo', name: 'CoffeeB Lungo', mg: 65, e: '☕', est: true },
    { id: 'cb_forte', name: 'CoffeeB Lungo Forte', mg: 70, e: '☕', est: true },
    { id: 'cb_decaf', name: 'CoffeeB Decaffeinato', mg: 3, e: '🫘', est: true },
    { id: 'espresso', name: 'Espresso', mg: 63, e: '☕' },
    { id: 'doppio', name: 'Doppelter Espresso', mg: 126, e: '☕' },
    { id: 'filter', name: 'Filterkaffee (Tasse)', mg: 95, e: '🫖' },
    { id: 'cappu', name: 'Cappuccino / Latte (1 Shot)', mg: 63, e: '🥛' },
    { id: 'americano', name: 'Americano', mg: 126, e: '☕' },
    { id: 'schwarztee', name: 'Schwarzer Tee', mg: 45, e: '🍵' },
    { id: 'gruentee', name: 'Grüner Tee', mg: 30, e: '🍃' },
    { id: 'matcha', name: 'Matcha', mg: 70, e: '🍵' },
    { id: 'cola', name: 'Cola (0,33 l)', mg: 33, e: '🥤' },
    { id: 'energy', name: 'Energydrink (250 ml)', mg: 80, e: '⚡' }
  ],
  sports: [
    { id: 'laufen', name: 'Laufen', e: '🏃' }, { id: 'rad', name: 'Radfahren', e: '🚴' },
    { id: 'kraft', name: 'Krafttraining', e: '🏋️' }, { id: 'schwimmen', name: 'Schwimmen', e: '🏊' },
    { id: 'yoga', name: 'Yoga / Dehnen', e: '🧘' }, { id: 'wandern', name: 'Wandern', e: '🥾' },
    { id: 'spazieren', name: 'Spazieren', e: '🚶' }, { id: 'ball', name: 'Ballsport', e: '⚽' },
    { id: 'klettern', name: 'Klettern', e: '🧗' }
  ],
  habits: [
    { id: 'h1', name: 'Draußen an der Luft', type: 'pos', e: '🌳' },
    { id: 'h2', name: 'Genug getrunken', type: 'pos', e: '💧' },
    { id: 'h3', name: 'Gelernt / produktiv', type: 'pos', e: '📚' },
    { id: 'h4', name: 'Zeit mit Menschen', type: 'pos', e: '🫶' },
    { id: 'h5', name: 'Zu viel Handy', type: 'neg', e: '📱' },
    { id: 'h6', name: 'Alkohol', type: 'neg', e: '🍺' },
    { id: 'h7', name: 'Süßes / Junkfood', type: 'neg', e: '🍫' },
    { id: 'h8', name: 'Grübeln / Stress', type: 'neg', e: '🌀' }
  ]
};

/* ---------- Speicher ---------- */
let DB = load();
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.v === 1) return norm(r); } catch (e) { }
  return norm({ v: 1 });
}
function norm(r) {
  r.v = 1; r.days = r.days || {};
  const c = JSON.parse(JSON.stringify(DEF_CFG)), sv = (r.cfg && r.cfg.v) || 1;
  r.cfg = Object.assign(c, r.cfg || {});
  if (sv < 2) DEF_CFG.coffee.forEach(d => { if (!r.cfg.coffee.some(x => x.id === d.id)) r.cfg.coffee.push(JSON.parse(JSON.stringify(d))); });
  if (sv < 3 && r.cfg.theme === 'dark') r.cfg.theme = 'light';   // Version 1.5: helleres Design als neuer Standard
  r.cfg.v = 3;
  return r;
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('Speichern nicht möglich (Speicher voll?)'); }
  }, 150);
}
window.addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } });
const day = (d, create) => DB.days[d] || (create ? (DB.days[d] = {}) : {});
function sec(d, k) { const x = day(d, true); return x[k] || (x[k] = k === 'coffee' || k === 'sport' ? [] : {}); }

/* ---------- Zustand ---------- */
const S = { tab: 'heute', date: todayStr(), week: weekStart(todayStr()), open: {}, vtab: 'ueb', range: 30, year: new Date().getFullYear(), sp: null, qi: {}, impMsg: '' };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600);
}
function applyTheme() {
  const t = DB.cfg.theme;
  const th = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = th;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'light' ? '#fcefdb' : '#1d1c1b';
}

/* ---------- Auswertungs-Helfer ---------- */
const sleepDur = s => {
  if (!s) return null;
  if (s.bed && s.wake) { let d = tmin(s.wake) - tmin(s.bed); if (d <= 0) d += 1440; return d; }
  return s.dur ?? null;
};
const coffeeMg = d => (day(d).coffee || []).reduce((a, c) => a + (c.mg || 0), 0);
const sportMin = d => (day(d).sport || []).reduce((a, s) => a + (s.min || 0), 0);
const allDates = () => Object.keys(DB.days).filter(d => Object.keys(DB.days[d]).length).sort();
function firstTracked() { const a = allDates(); return a[0] || todayStr(); }
function streak(h, d) {
  const done = x => !!(day(x).habits || {})[h.id];
  if (h.type === 'pos') { let n = 0, x = d; while (done(x)) { n++; x = addDays(x, -1); } return n; }
  if (!allDates().length) return 0;
  const first = firstTracked(); let n = 0, x = d;
  while (x >= first && !done(x)) { n++; x = addDays(x, -1); }
  return n;
}

/* ---------- Koffein-Modell, Ranking, Schlaf-Rhythmus ---------- */
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const dn = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const clockM = m => { m = Math.round(((m % 1440) + 1440) % 1440); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const bedU = m => (m - 1080 + 1440) % 1440;                 // Minuten nach 18:00
const clockFromU = u => clockM(u + 1080);
const sdev = a => { if (a.length < 2) return null; const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) ** 2))); };
function weekStart(d) { return addDays(d, -((parse(d).getDay() + 6) % 7)); }
function isoWeek(s) { const d = parse(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); }

function caffeineAt(d, minute) {
  const hl = (DB.cfg.halfLife || 5) * 60, at = dn(d) * 1440 + minute; let sum = 0;
  for (let k = -2; k <= 1; k++) {
    const x = addDays(d, k);
    (day(x).coffee || []).forEach(c => { const t0 = dn(x) * 1440 + tmin(c.t); if (at >= t0) sum += (c.mg || 0) * Math.pow(.5, (at - t0) / hl); });
  }
  return sum;
}
function avgBedClock() {
  const us = []; Object.keys(DB.days).sort().slice(-14).forEach(k => { const s = DB.days[k].sleep; if (s && s.bed) us.push(bedU(tmin(s.bed))); });
  return us.length ? (avg(us) + 1080) % 1440 : 1380;
}
function plannedBed(d) {
  const s = day(addDays(d, 1)).sleep;
  if (s && s.bed) { const m = tmin(s.bed); return { m: m >= 900 ? m : m + 1440, planned: false }; }
  const pm = avgBedClock(); return { m: pm < 720 ? pm + 1440 : pm, planned: true };
}
function caffeineBlock(d) {
  let peak = 0; for (let t = 360; t <= 1800; t += 30) peak = Math.max(peak, caffeineAt(d, t));
  if (peak < 1) return '';
  const isT = d === todayStr(), nowM = tmin(nowT()), bd = plannedBed(d), atBed = caffeineAt(d, bd.m);
  const W = 340, H = 92, pl = 26, pr = 4, pt = 6, pbm = 14, mx = Math.max(60, peak * 1.15), x0 = 360, x1 = 1800;
  const X = t => pl + (t - x0) / (x1 - x0) * (W - pl - pr), Y = v => pt + (H - pt - pbm) * (1 - v / mx);
  let path = `M${X(x0)} ${Y(0)}`; for (let t = x0; t <= x1; t += 15) path += `L${X(t)} ${Y(caffeineAt(d, t))}`; path += `L${X(x1)} ${Y(0)}Z`;
  let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="margin-top:8px">`;
  [0, mx / 2].forEach(v => g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl - 3}" y="${Y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`);
  g += `<path d="${path}" fill="var(--acc)" fill-opacity=".3" stroke="var(--acc)" stroke-width="1.4"/>`;
  [[360, '6'], [720, '12'], [1080, '18'], [1440, '0'], [1800, '6']].forEach(([t, l]) => g += `<text x="${X(t)}" y="${H - 2}" text-anchor="middle">${l}</text>`);
  if (isT && nowM >= x0) g += `<line x1="${X(nowM)}" x2="${X(nowM)}" y1="${pt}" y2="${Y(0)}" stroke="var(--ink)" stroke-dasharray="3 3"/>`;
  if (bd.m <= x1) g += `<line x1="${X(bd.m)}" x2="${X(bd.m)}" y1="${pt}" y2="${Y(0)}" stroke="var(--neg)" stroke-width="1.5"/><text x="${X(bd.m)}" y="${pt + 8}" text-anchor="middle" style="font-size:10px">🌙</text>`;
  g += '</svg>';
  return `<div class="sub"><div class="kv"><span>${isT ? 'Jetzt noch im Körper' : 'Höchststand am Tag'}</span><b>≈ ${Math.round(isT ? caffeineAt(d, nowM) : peak)} mg</b></div>
    <div class="kv"><span>Beim Zubettgehen (${clockM(bd.m)}${bd.planned ? ', geschätzt' : ''})</span><b>≈ ${Math.round(atBed)} mg</b></div>${g}
    <small>Vereinfachtes Modell mit ${DB.cfg.halfLife || 5} h Halbwertszeit (einstellbar). Gilt im Schnitt, bei dir kann es abweichen.</small></div>`;
}
function rankItems(items, kind, d) {
  const today = todayStr(), wd = parse(d).getDay(), bucket = t => { const h = tmin(t) / 60; return h < 11 ? 0 : h < 15 ? 1 : h < 19 ? 2 : 3; };
  const nowB = d === today ? bucket(nowT()) : null, sc = {};
  Object.keys(DB.days).forEach(k => {
    if (k === d) return;
    const age = dn(today) - dn(k); if (age > 120 || age < 0) return;
    const rec = .5 + .5 * Math.max(0, 1 - age / 120), swd = parse(k).getDay() === wd ? 2.5 : 1;
    (DB.days[k][kind] || []).forEach(e => {
      const key = kind === 'coffee' ? e.k : e.name; if (!key) return;
      const tb = nowB != null && e.t ? (bucket(e.t) === nowB ? 2 : 1) : 1;
      sc[key] = (sc[key] || 0) + rec * swd * tb;
    });
  });
  const id = it => kind === 'coffee' ? it.id : it.name;
  const sorted = items.map((it, i) => ({ it, s: sc[id(it)] || 0, i })).sort((a, b) => b.s - a.s || a.i - b.i);
  const top = sorted.filter(x => x.s > 0).slice(0, 4).map(x => x.it), ids = new Set(top.map(id));
  return { top, rest: items.filter(it => !ids.has(id(it))) };
}
function sleepStats(dates) {
  const rows = dates.map(d => ({ d, s: day(d).sleep })).filter(x => x.s && x.s.bed && x.s.wake);
  if (rows.length < 3) return null;
  const bu = rows.map(r => bedU(tmin(r.s.bed))), wk = rows.map(r => tmin(r.s.wake)), du = rows.map(r => sleepDur(r.s));
  const mid = r => bedU(tmin(r.s.bed)) + sleepDur(r.s) / 2, free = x => [0, 6].includes(parse(x.d).getDay());
  const fr = rows.filter(free).map(mid), wo = rows.filter(r => !free(r)).map(mid);
  return { n: rows.length, bedAvg: avg(bu), bedSD: sdev(bu), wakeAvg: avg(wk), wakeSD: sdev(wk), durAvg: avg(du), durSD: sdev(du), jet: fr.length >= 2 && wo.length >= 2 ? avg(fr) - avg(wo) : null, rows };
}
const regLabel = v => v < 30 ? 'sehr regelmäßig' : v < 45 ? 'ziemlich regelmäßig' : v < 75 ? 'schwankend' : 'unregelmäßig';
function bandChart(rows, dates) {
  const W = 340, H = 150, pl = 30, pr = 4, pt = 6, pbm = 14, n = dates.length;
  const by = r => { const m = tmin(r.s.bed); return m >= 720 ? m : m + 1440; }, wy = r => 1440 + tmin(r.s.wake);
  const lo = Math.floor((Math.min(...rows.map(by)) - 30) / 60) * 60, hi = Math.ceil((Math.max(...rows.map(wy)) + 30) / 60) * 60;
  const y = v => pt + (v - lo) / (hi - lo) * (H - pt - pbm), bw = (W - pl - pr) / n;
  let g = `<svg viewBox="0 0 ${W} ${H}" width="100%">`;
  for (let v = Math.ceil(lo / 120) * 120; v <= hi; v += 120) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 3}" y="${y(v) + 3}" text-anchor="end">${clockM(v)}</text>`;
  rows.forEach(r => { const i = dates.indexOf(r.d); g += `<rect x="${pl + i * bw + Math.min(1.5, bw * .1)}" width="${Math.max(1.5, bw - Math.min(3, bw * .2))}" y="${y(by(r))}" height="${Math.max(1, y(wy(r)) - y(by(r)))}" rx="2" fill="var(--acc)" opacity=".85"/>`; });
  return g + xLabels(dates, W, pl, pr, H) + '</svg>';
}
function rhythmBody(ss, dates) {
  const lab = regLabel(Math.max(ss.bedSD ?? 0, ss.wakeSD ?? 0)), pm = x => x == null ? '' : ` <small>± ${Math.round(x)} min</small>`;
  return bandChart(ss.rows, dates) + `
    <div class="kv"><span>Ins Bett</span><span>Ø ${clockFromU(ss.bedAvg)}${pm(ss.bedSD)}</span></div>
    <div class="kv"><span>Aufgewacht</span><span>Ø ${clockM(ss.wakeAvg)}${pm(ss.wakeSD)}</span></div>
    <div class="kv"><span>Schlafdauer</span><span>Ø ${fmtDur(ss.durAvg)}${pm(ss.durSD)}</span></div>
    <div class="kv"><span>Rhythmus</span><b>${lab}</b></div>
    ${ss.jet != null ? `<div class="kv"><span>Schlafmitte am Wochenende</span><span>${Math.abs(ss.jet) < 5 ? 'gleich' : Math.round(Math.abs(ss.jet)) + ' min ' + (ss.jet > 0 ? 'später' : 'früher')}</span></div>` : ''}
    <small>Balken: von Einschlafen bis Aufwachen. ± ist die typische Abweichung, je kleiner desto regelmäßiger.</small>`;
}

/* ---------- Rendering ---------- */
function render() {
  applyTheme();
  const v = S.tab === 'heute' ? viewHeute() : S.tab === 'verlauf' ? viewVerlauf() : viewSettings();
  $('#app').innerHTML = v;
  $('#tabs').innerHTML = [['heute', '☀️', 'Heute'], ['verlauf', '📈', 'Verlauf'], ['set', '⚙️', 'Einstellungen']]
    .map(([k, i, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}"><b>${i}</b>${l}</button>`).join('');
  if (S.tab === 'verlauf' && S.vtab === 'sport') { const h = $('.hscroll'); if (h && S.year === new Date().getFullYear()) h.scrollLeft = h.scrollWidth * (new Date().getMonth() / 12) - 80; }
}

function chips(items, cur, act, extra = '') {
  return `<div class="chips">${items.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" ${extra}>${l}</button>`).join('')}</div>`;
}

function viewHeute() {
  const d = S.date, D = day(d), isToday = d === todayStr();
  const label = parse(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const m = D.mood || {}, sl = D.sleep || {};
  const q = QS[(S.qi[d] ?? (parse(d).getTime() / 864e5 | 0)) % QS.length];
  const qa = (m.qa && m.qa[0]) || {};
  const moodOpen = S.open.mood, sleepOpen = S.open.sleep;
  const dur = sleepDur(sl);
  const mg = coffeeMg(d), lim = DB.cfg.limit, cof = D.coffee || [];
  const lastC = cof.length ? cof.map(c => c.t).sort().pop() : null;
  const sp = D.sport || [];
  const habs = h => `<button class="hab ${h.type} ${(D.habits || {})[h.id] ? 'on' : ''}" data-act="hab" data-id="${h.id}"><span class="e">${h.e || '•'}</span><span>${esc(h.name)}<small>${streakTxt(h, d)}</small></span></button>`;
  const pos = DB.cfg.habits.filter(h => h.type === 'pos'), neg = DB.cfg.habits.filter(h => h.type === 'neg');
  const cr = rankItems(DB.cfg.coffee, 'coffee', d), sr = rankItems(DB.cfg.sports, 'sport', d);
  const when = isToday ? 'Oft um diese Zeit' : 'Oft an diesem Wochentag';
  const cChip = (c, fav) => `<button class="chip ${fav ? 'fav' : ''}" data-act="cadd" data-id="${c.id}">${c.e || '☕'} ${esc(c.name)}<small>${c.est ? '≈' : ''}${c.mg}</small></button>`;
  const sChip = (x, fav) => `<button class="chip ${fav ? 'fav' : ''}" data-act="sportopen" data-id="${x.id}">${x.e || '🏅'} ${esc(x.name)}</button>`;
  const newChip = `<button class="chip" data-act="sportopen" data-id="_new">＋ Neu</button>`;
  const srcs = [[addDays(d, -1), isToday ? 'Wie gestern' : 'Wie am Vortag'], [addDays(d, -7), 'Wie letzten ' + parse(d).toLocaleDateString('de-DE', { weekday: 'short' })]];
  const copyBtns = kind => { if ((D[kind] || []).length) return ''; const b = srcs.filter(([x]) => (day(x)[kind] || []).length).map(([x, l]) => `<button class="chip" data-act="copyday" data-kind="${kind}" data-src="${x}">↺ ${l}<small>${day(x)[kind].length}</small></button>`).join(''); return b ? `<div class="chips sub">${b}</div>` : ''; };
  return `
  <div class="dhead"><button data-act="dprev">‹</button><div><b>${esc(label)}</b><small>${isToday ? 'Heute' : `<a href="#" data-act="dtoday" style="color:var(--acc-t)">Zu heute</a>`}</small></div><button data-act="dnext" ${isToday ? 'disabled' : ''}>›</button></div>

  <section class="card"><h3>Stimmung</h3>
    <div class="smileys">${MOOD_E.map((e, i) => `<button class="sm ${m.v === i + 1 ? 'on' : ''}" style="--c:${MCOL(i + 1)}" data-act="mood" data-v="${i + 1}" aria-label="${MOOD_N[i]}">${e}</button>`).join('')}</div>
    <button class="more" data-act="tog" data-k="mood">${moodOpen ? 'Weniger' : 'Mehr dazu: Gefühle, Frage, Notiz'}${!moodOpen && (m.tags?.length || qa.a || m.note) ? ' ●' : ''}</button>
    ${moodOpen ? `
      <div class="lbl">Gefühle</div>
      <div class="chips">${TAGS.map(t => `<button class="chip ${(m.tags || []).includes(t) ? 'on' : ''}" data-act="tag" data-v="${t}">${t}</button>`).join('')}</div>
      <div class="lbl row sb"><span>${esc(q)}</span><button data-act="qnext" style="color:var(--acc-t)">andere ↻</button></div>
      <textarea data-f="mood.qa" data-q="${esc(q)}" placeholder="Kurz antworten …">${esc(qa.a || '')}</textarea>
      <div class="lbl">Freie Notiz</div>
      <textarea data-f="mood.note" placeholder="Was dir sonst noch durch den Kopf geht …">${esc(m.note || '')}</textarea>` : ''}
  </section>

  <section class="card"><h3>Schlaf <small style="text-transform:none;letter-spacing:0">Nacht auf ${isToday ? 'heute' : 'diesen Tag'}</small></h3>
    <div class="row"><div class="tfield mut">Ins Bett<button class="timebtn" data-act="tpick" data-t="sleep.bed">${sl.bed || '–:–'}</button></div>
    <div class="tfield mut">Aufgewacht<button class="timebtn" data-act="tpick" data-t="sleep.wake">${sl.wake || '–:–'}</button></div>
    <div class="grow" style="text-align:right"><div class="big">${fmtDur(dur)}</div><small>${sl.score ? 'Uhr-Score ' + sl.score : sl.src === 'uhr' ? 'von der Uhr' : ''}</small></div></div>
    <div class="lbl">Wie erholt fühlst du dich?</div>
    <div class="smileys">${REST_E.map((e, i) => `<button class="sm ${sl.q === i + 1 ? 'on' : ''}" style="--c:${MCOL(i + 1)}" data-act="srate" data-v="${i + 1}">${e}</button>`).join('')}</div>
    <button class="more" data-act="tog" data-k="sleep">${sleepOpen ? 'Weniger' : 'Mehr dazu: Fragen, Uhr-Daten'}${!sleepOpen && (sl.fall || sl.wakes || sl.morning || sl.deep || sl.note) ? ' ●' : ''}</button>
    ${sleepOpen ? `
      <div class="lbl">Wie schnell eingeschlafen?</div>${chips([['schnell', 'schnell'], ['normal', 'normal'], ['lange', 'lange gebraucht']], sl.fall, 'sfall')}
      <div class="lbl">Nachts wach geworden?</div>${chips([['nie', 'nie'], ['1x', 'einmal'], ['mehrfach', 'mehrfach']], sl.wakes, 'swakes')}
      <div class="lbl">Aufwachen</div>${chips([['frisch', 'frisch'], ['ok', 'okay'], ['zerschlagen', 'zerschlagen']], sl.morning, 'smorning')}
      <div class="lbl">Uhr-Daten (optional, in Minuten bzw. Schläge/min)</div>
      <div class="row">${[['score', 'Score'], ['deep', 'Tief'], ['rem', 'REM'], ['light', 'Leicht'], ['awake', 'Wach'], ['rhr', 'Ruhepuls']].map(([k, l]) => `<label class="mut" style="font-size:.78rem">${l}<br><input type="number" inputmode="numeric" data-f="sleep.${k}" value="${sl[k] ?? ''}" style="width:78px"></label>`).join('')}</div>
      <div class="lbl">Notiz zum Schlaf</div><textarea data-f="sleep.note" placeholder="Träume, Störungen …">${esc(sl.note || '')}</textarea>
      <small class="mut">Tipp: Uhr-Screenshot im Claude-Chat auswerten lassen und das Ergebnis unter Einstellungen → Import einfügen.</small>` : ''}
  </section>

  <section class="card"><h3>Koffein <span style="text-transform:none;letter-spacing:0">${mg} / ${lim} mg</span></h3>
    <div class="bar ${mg > lim ? 'warn' : ''}"><i style="width:${Math.min(100, mg / lim * 100)}%"></i></div>
    <small>${lastC ? 'Letzter Eintrag ' + lastC + ' Uhr' : 'Noch nichts eingetragen'}${mg > lim ? ' · über deinem Limit' : ''}</small>
    ${cr.top.length ? `<div class="lbl">${when}</div><div class="chips">${cr.top.map(c => cChip(c, 1)).join('')}</div>` : ''}
    ${copyBtns('coffee')}
    ${cr.top.length && cr.rest.length ? `<button class="more" data-act="tog" data-k="cmore">${S.open.cmore ? 'Weniger Getränke' : `Weitere Getränke (${cr.rest.length})`}</button>` : ''}
    ${(!cr.top.length || S.open.cmore) ? `<div class="chips sub">${cr.rest.map(c => cChip(c)).join('')}</div>` : ''}
    ${cof.map(c => `<div class="ent"><button class="timebtn t" data-act="tpick" data-t="coffee" data-id="${c.id}">${c.t}</button><span class="grow">${esc(c.name)} <small>${c.est ? '≈' : ''}${c.mg} mg</small></span><button class="x" data-act="cdel" data-id="${c.id}">✕</button></div>`).join('')}
    ${caffeineBlock(d)}
  </section>

  <section class="card"><h3>Sport <span style="text-transform:none;letter-spacing:0">${sportMin(d) ? sportMin(d) + ' min' : ''}</span></h3>
    ${sr.top.length ? `<div class="lbl" style="margin-top:0">${when}</div><div class="chips">${sr.top.map(x => sChip(x, 1)).join('')}${newChip}</div>` : ''}
    ${copyBtns('sport')}
    ${sr.top.length && sr.rest.length ? `<button class="more" data-act="tog" data-k="smore">${S.open.smore ? 'Weniger Sportarten' : `Weitere Sportarten (${sr.rest.length})`}</button>` : ''}
    ${(!sr.top.length || S.open.smore) ? `<div class="chips sub">${sr.rest.map(x => sChip(x)).join('')}${sr.top.length ? '' : newChip}</div>` : ''}
    ${sp.map(x => `<div class="ent"><span class="t">${x.t || ''}</span><span class="grow">${x.e || ''} ${esc(x.name)} <small>${x.min} min${x.int ? ' · ' + ['leicht', 'mittel', 'hart'][x.int - 1] : ''}</small></span><button class="x" data-act="sdel" data-id="${x.id}">✕</button></div>`).join('')}
  </section>

  <section class="card"><h3>Gewohnheiten</h3>
    ${pos.length ? `<div class="lbl" style="margin-top:0">Positiv</div><div class="hgrid">${pos.map(habs).join('')}</div>` : ''}
    ${neg.length ? `<div class="lbl">Negativ (antippen, wenn es passiert ist)</div><div class="hgrid">${neg.map(habs).join('')}</div>` : ''}
  </section>

  <section class="card"><h3>Tagesnotiz</h3><textarea data-f="day.note" placeholder="Wie war der Tag insgesamt?">${esc(D.note || '')}</textarea></section>`;
}
function streakTxt(h, d) {
  const n = streak(h, d);
  if (h.type === 'pos') return n ? `${n} ${n === 1 ? 'Tag' : 'Tage'} in Folge` : '';
  return n ? `${n} ${n === 1 ? 'Tag' : 'Tage'} ohne` : '';
}

/* ---------- Diagramme (SVG) ---------- */
function xLabels(dates, W, pl, pr, H) {
  const n = dates.length, step = n > 60 ? 14 : n > 20 ? 7 : 1; let s = '';
  dates.forEach((d, i) => {
    if ((n - 1 - i) % step === 0) {
      const x = pl + (i + .5) * (W - pl - pr) / n; const dt = parse(d);
      s += `<text x="${x}" y="${H - 2}" text-anchor="middle">${dt.getDate()}.${dt.getMonth() + 1}.</text>`;
    }
  });
  return s;
}
function barChart(dates, vals, o = {}) {
  const W = 340, H = 120, pl = 22, pr = 4, pt = 8, pb = 14, n = vals.length;
  const mx = o.max || Math.max(1, ...vals.filter(v => v != null)) * 1.1;
  const y = v => pt + (H - pt - pb) * (1 - v / mx), bw = (W - pl - pr) / n;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%">`;
  [0, .5, 1].forEach(f => { const v = mx * f; s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 3}" y="${y(v) + 3}" text-anchor="end">${o.fmt ? o.fmt(v) : Math.round(v)}</text>`; });
  if (o.band) s += `<rect x="${pl}" width="${W - pl - pr}" y="${y(o.band[1])}" height="${y(o.band[0]) - y(o.band[1])}" fill="var(--pos)" opacity=".14"/>`;
  vals.forEach((v, i) => { if (v != null && v > 0) s += `<rect x="${pl + i * bw + Math.min(1.5, bw * .1)}" width="${Math.max(1, bw - Math.min(3, bw * .2))}" y="${y(v)}" height="${y(0) - y(v)}" rx="2" fill="${o.colorFn ? o.colorFn(v) : 'var(--acc)'}"/>`; });
  if (o.limit) s += `<line x1="${pl}" x2="${W - pr}" y1="${y(o.limit)}" y2="${y(o.limit)}" stroke="var(--bad)" stroke-dasharray="4 3"/>`;
  return s + xLabels(dates, W, pl, pr, H) + '</svg>';
}
function lineChart(dates, vals) {
  const W = 340, H = 120, pl = 22, pr = 4, pt = 8, pb = 14, n = vals.length;
  const y = v => pt + (H - pt - pb) * (1 - (v - 1) / 4), x = i => pl + (i + .5) * (W - pl - pr) / n;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%">`;
  [1, 3, 5].forEach(v => s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 3}" y="${y(v) + 3}" text-anchor="end">${MOOD_E[v - 1]}</text>`);
  let path = '', prev = false;
  vals.forEach((v, i) => { if (v == null) { prev = false; return; } path += (prev ? 'L' : 'M') + x(i) + ' ' + y(v); prev = true; });
  s += `<path d="${path}" fill="none" stroke="var(--acc)" stroke-width="1.6" opacity=".7"/>`;
  vals.forEach((v, i) => { if (v != null) s += `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 40 ? 2 : 3.2}" fill="${MCOL(Math.round(v))}"/>`; });
  return s + xLabels(dates, W, pl, pr, H) + '</svg>';
}

/* ---------- Verlauf ---------- */
function viewVerlauf() {
  const seg = `<div class="seg">${[['ueb', 'Übersicht'], ['woche', 'Woche'], ['sport', 'Sport'], ['muster', 'Muster']].map(([k, l]) => `<button class="${S.vtab === k ? 'on' : ''}" data-act="vtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  return `<h2>Verlauf</h2>${seg}${S.vtab === 'ueb' ? vUeb() : S.vtab === 'woche' ? vWoche() : S.vtab === 'sport' ? vSport() : vMuster()}`;
}
function vUeb() {
  const n = S.range, end = todayStr(), dates = []; for (let i = n - 1; i >= 0; i--) dates.push(addDays(end, -i));
  const mood = dates.map(d => day(d).mood?.v ?? null), sl = dates.map(d => { const x = sleepDur(day(d).sleep); return x == null ? null : x / 60; });
  const cof = dates.map(d => coffeeMg(d) || null), spt = dates.map(d => sportMin(d) || null);
  const nz = a => a.filter(v => v != null), ss = sleepStats(dates);
  const rng = `<div class="seg">${[7, 30, 90].map(r => `<button class="${S.range === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} Tage</button>`).join('')}</div>`;
  const hab = DB.cfg.habits.map(h => {
    const tracked = dates.filter(d => Object.keys(day(d)).length); const c = tracked.filter(d => (day(d).habits || {})[h.id]).length;
    const pct = tracked.length ? c / tracked.length : 0;
    return `<div class="kv"><span>${h.e || ''} ${esc(h.name)}</span><span>${c} / ${tracked.length} Tage</span></div><div class="bar" style="margin:2px 0 8px"><i style="width:${pct * 100}%;background:${h.type === 'pos' ? 'var(--pos)' : 'var(--neg)'}"></i></div>`;
  }).join('');
  return rng + `
  <section class="card"><h3>Stimmung <span style="text-transform:none">Ø ${f1(avg(nz(mood)))}</span></h3>${lineChart(dates, mood)}</section>
  <section class="card"><h3>Schlaf (Stunden) <span style="text-transform:none">Ø ${f1(avg(nz(sl)))} h</span></h3>${barChart(dates, sl, { max: 10, band: [7, 9], fmt: v => Math.round(v) })}<small>Grüner Bereich: 7–9 h</small></section>
  <section class="card"><h3>Schlaf-Rhythmus</h3>${ss ? rhythmBody(ss, dates) : '<small>Trag Bett- und Aufwachzeit ein (oder importiere Uhr-Daten). Ab 3 Nächten siehst du hier deinen Rhythmus.</small>'}</section>
  <section class="card"><h3>Koffein (mg) <span style="text-transform:none">Ø ${Math.round(avg(nz(cof)) || 0)} mg</span></h3>${barChart(dates, cof, { limit: DB.cfg.limit, colorFn: v => v > DB.cfg.limit ? 'var(--bad)' : 'var(--acc)' })}</section>
  <section class="card"><h3>Sport (Minuten) <span style="text-transform:none">${nz(spt).length} Tage · ${nz(spt).reduce((a, b) => a + b, 0)} min</span></h3>${barChart(dates, spt, { colorFn: () => 'var(--pos)' })}</section>
  <section class="card"><h3>Gewohnheiten</h3>${hab || '<small>Noch keine angelegt.</small>'}</section>`;
}
function wstats(dates) {
  const tr = dates.filter(d => Object.keys(day(d)).length), M = dates.map(d => day(d).mood?.v ?? null), moods = M.filter(Boolean);
  const dur = dates.map(d => sleepDur(day(d).sleep)).filter(x => x != null), cof = tr.map(coffeeMg), sp = dates.map(sportMin);
  const lasts = dates.map(d => (day(d).coffee || []).map(c => tmin(c.t)).sort((a, b) => b - a)[0]).filter(x => x != null);
  return { tr: tr.length, M, moodAvg: avg(moods), durAvg: avg(dur), cofAvg: cof.length ? avg(cof) : null, over: cof.filter(v => v > DB.cfg.limit).length, lastAvg: avg(lasts),
    sportN: dates.reduce((n, d) => n + (day(d).sport || []).length, 0), sportMin: sp.reduce((a, b) => a + b, 0), sportDays: sp.filter(x => x > 0).length, ss: sleepStats(dates) };
}
function vWoche() {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(S.week, i)), prevD = dates.map(d => addDays(d, -7)), today = todayStr();
  const a = wstats(dates), b = wstats(prevD), curW = weekStart(today), fmt = x => parse(x).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const dl = (x, y, unit = '', fx = f1) => x == null || y == null ? '' : ` <small>(${Math.abs(x - y) < .05 ? '±0' : (x > y ? '+' : '−') + fx(Math.abs(x - y))}${unit} zur Vorwoche)</small>`;
  const sleepH = d => { const x = sleepDur(day(d).sleep); return x == null ? '–' : f1(x / 60); };
  const mi = a.M.map((v, i) => v ? [v, i] : null).filter(Boolean), best = mi.length >= 3 ? mi.reduce((p, q) => q[0] > p[0] ? q : p) : null, worst = mi.length >= 3 ? mi.reduce((p, q) => q[0] < p[0] ? q : p) : null;
  const hab = DB.cfg.habits.map(h => { const c = dates.filter(d => (day(d).habits || {})[h.id]).length; return `<div class="kv"><span>${h.e || ''} ${esc(h.name)}</span><span>${c} / 7 Tage</span></div><div class="bar" style="margin:2px 0 8px"><i style="width:${c / 7 * 100}%;background:${h.type === 'pos' ? 'var(--pos)' : 'var(--neg)'}"></i></div>`; }).join('');
  const nxt = S.week >= curW;
  return `<div class="dhead"><button data-act="wprev">‹</button><div><b>KW ${isoWeek(S.week)}</b><small>${fmt(dates[0])} – ${fmt(dates[6])}${S.week === curW ? ' · diese Woche' : ''}</small></div><button data-act="wnext" ${nxt ? 'disabled' : ''}>›</button></div>
  <section class="card"><table class="wkt"><tr><th></th>${dates.map(d => `<th class="${d === today ? 'today' : ''}">${WD[parse(d).getDay()]}<br><small>${parse(d).getDate()}.</small></th>`).join('')}</tr>
    <tr><td>Stimmung</td>${dates.map(d => `<td>${day(d).mood?.v ? MOOD_E[day(d).mood.v - 1] : '·'}</td>`).join('')}</tr>
    <tr><td>Schlaf h</td>${dates.map(d => `<td>${sleepH(d)}</td>`).join('')}</tr>
    <tr><td>Koffein mg</td>${dates.map(d => `<td>${coffeeMg(d) || '–'}</td>`).join('')}</tr>
    <tr><td>Sport min</td>${dates.map(d => `<td>${sportMin(d) || '–'}</td>`).join('')}</tr></table>
    <small>${a.tr} von 7 Tagen mit Einträgen</small></section>
  <section class="card"><h3>Stimmung</h3>${a.moodAvg == null ? '<small>Keine Stimmung eingetragen.</small>' : `<div class="big">Ø ${f1(a.moodAvg)} ${MOOD_E[Math.round(a.moodAvg) - 1]}</div>${dl(a.moodAvg, b.moodAvg)}
    ${best ? `<div class="kv"><span>Bester Tag</span><span>${WD[parse(dates[best[1]]).getDay()]} ${MOOD_E[best[0] - 1]}</span></div><div class="kv"><span>Schwächster Tag</span><span>${WD[parse(dates[worst[1]]).getDay()]} ${MOOD_E[worst[0] - 1]}</span></div>` : ''}`}</section>
  <section class="card"><h3>Schlaf</h3>${a.durAvg == null ? '<small>Kein Schlaf eingetragen.</small>' : `<div class="big">Ø ${fmtDur(a.durAvg)}</div>${dl(a.durAvg, b.durAvg, ' min', v => Math.round(v))}`}
    ${a.ss ? `<div class="sub">${rhythmBody(a.ss, dates)}</div>` : '<small>Für den Rhythmus braucht es Bett- und Aufwachzeit an mindestens 3 Nächten.</small>'}</section>
  <section class="card"><h3>Koffein</h3>${a.cofAvg == null ? '<small>Nichts eingetragen.</small>' : `<div class="big">Ø ${Math.round(a.cofAvg)} mg / Tag</div>${dl(a.cofAvg, b.cofAvg, ' mg', v => Math.round(v))}
    <div class="kv"><span>Tage über dem Limit (${DB.cfg.limit} mg)</span><span>${a.over}</span></div>${a.lastAvg != null ? `<div class="kv"><span>Letzter Kaffee im Schnitt</span><span>${clockM(a.lastAvg)} Uhr</span></div>` : ''}`}</section>
  <section class="card"><h3>Sport</h3>${a.sportN ? `<div class="big">${a.sportN} ${a.sportN === 1 ? 'Einheit' : 'Einheiten'} · ${a.sportMin} min</div>${dl(a.sportMin, b.sportMin, ' min', v => Math.round(v))}<div class="kv"><span>Aktive Tage</span><span>${a.sportDays} / 7</span></div>` : '<small>Kein Sport in dieser Woche.</small>'}</section>
  <section class="card"><h3>Gewohnheiten</h3>${hab || '<small>Keine angelegt.</small>'}</section>
  <section class="card"><h3>Auswertung mit Claude</h3><button class="btn" data-act="copyweek">Woche für Claude kopieren</button><small class="mut" style="display:block;margin-top:6px">Kopiert deine Daten dieser und der Vorwoche samt Auftrag. Im Chat einfügen, dann bekommst du eine Auswertung.</small></section>`;
}
function vSport() {
  const Y = S.year, jan1 = new Date(Y, 0, 1), off = (jan1.getDay() + 6) % 7, nd = (new Date(Y, 11, 31) - jan1) / 864e5 + 1, weeks = Math.ceil((nd + off) / 7);
  const c = 11, g = 2, W = weeks * (c + g) + 24;
  let svg = `<svg width="${W}" height="${7 * (c + g) + 16}">`, lastM = -1;
  for (let i = 0; i < nd; i++) {
    const dt = new Date(Y, 0, 1 + i), w = Math.floor((i + off) / 7), r = (i + off) % 7, d = ds(dt), mn = sportMin(d);
    if (r === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); svg += `<text x="${w * (c + g)}" y="9">${MONTHS[lastM]}</text>`; }
    const a = mn === 0 ? 0 : mn < 30 ? .35 : mn < 60 ? .6 : mn < 90 ? .8 : 1;
    svg += `<rect x="${w * (c + g)}" y="${14 + r * (c + g)}" width="${c}" height="${c}" rx="2.5" fill="${a ? 'var(--pos)' : 'var(--card2)'}" opacity="${a || 1}"/>`;
  }
  svg += '</svg>';
  const per = {}; let sess = 0, mins = 0, act = new Set();
  Object.keys(DB.days).filter(d => d.startsWith(Y + '-')).forEach(d => (DB.days[d].sport || []).forEach(s => {
    const k = s.name; const o = per[k] || (per[k] = { e: s.e, n: 0, m: 0, mo: Array(12).fill(0) });
    o.n++; o.m += s.min || 0; o.mo[parse(d).getMonth()] += s.min || 0; sess++; mins += s.min || 0; act.add(d);
  }));
  const rows = Object.entries(per).sort((a, b) => b[1].m - a[1].m).map(([k, o]) => {
    const mx = Math.max(...o.mo, 1);
    const bars = o.mo.map((v, i) => `<rect x="${i * 9}" y="${22 - v / mx * 22}" width="7" height="${v / mx * 22}" rx="1.5" fill="var(--pos)"/>`).join('');
    return `<div class="ent"><span class="grow">${o.e || ''} ${esc(k)}<br><small>${o.n}× · ${Math.floor(o.m / 60)} h ${o.m % 60} min</small></span><svg width="107" height="24">${bars}</svg></div>`;
  }).join('');
  return `<div class="dhead"><button data-act="yprev">‹</button><div><b>${Y}</b></div><button data-act="ynext" ${Y >= new Date().getFullYear() ? 'disabled' : ''}>›</button></div>
  <section class="card"><div class="stat"><div><span class="big">${sess}</span><small>Einheiten</small></div><div><span class="big">${act.size}</span><small>aktive Tage</small></div><div><span class="big">${Math.round(mins / 60)}</span><small>Stunden</small></div></div>
  <div class="hscroll">${svg}</div><small>Dunkler = mehr Minuten an dem Tag</small></section>
  <section class="card"><h3>Nach Sportart (Balken: Minuten je Monat)</h3>${rows || '<small>Noch keine Einheiten in diesem Jahr.</small>'}</section>`;
}
function vMuster() {
  const ds_ = allDates(), out = [];
  const grp = (items, key) => { const g = {}; items.forEach(i => (g[key(i)] || (g[key(i)] = [])).push(i.v)); return g; };
  // 1) Stimmung nach Schlafdauer
  const a = ds_.map(d => ({ m: day(d).mood?.v, s: sleepDur(day(d).sleep) })).filter(x => x.m && x.s != null);
  if (a.length >= 5) {
    const b = x => x.s < 360 ? '1 unter 6 h' : x.s <= 450 ? '2 6 bis 7,5 h' : '3 über 7,5 h';
    const g = grp(a.map(x => ({ v: x.m, k: b(x) })), x => x.k);
    out.push(ins('Stimmung nach Schlafdauer', Object.keys(g).sort().map(k => `<div class="kv"><span>${k.slice(2)}</span><span>Ø ${f1(avg(g[k]))} <small>(${g[k].length} Tage)</small></span></div>`).join('')));
  }
  // 2) Stimmung an Sporttagen
  const b2 = ds_.filter(d => day(d).mood?.v);
  const sp1 = b2.filter(d => sportMin(d) > 0).map(d => day(d).mood.v), sp0 = b2.filter(d => !sportMin(d)).map(d => day(d).mood.v);
  if (sp1.length >= 3 && sp0.length >= 3) out.push(ins('Stimmung und Sport', `<div class="kv"><span>Mit Sport</span><span>Ø ${f1(avg(sp1))} <small>(${sp1.length})</small></span></div><div class="kv"><span>Ohne Sport</span><span>Ø ${f1(avg(sp0))} <small>(${sp0.length})</small></span></div>`));
  // 3) Restkoffein beim Zubettgehen und Schlaf
  const rb = {};
  ds_.forEach(d => {
    const sl = day(d).sleep; if (!sl || !sl.bed || !(sleepDur(sl) != null || sl.q)) return;
    const m = tmin(sl.bed), bd = m >= 900 ? addDays(d, -1) : d; if (!Object.keys(day(bd)).length) return;
    const r = caffeineAt(bd, m), k = r < 25 ? '1 unter 25 mg' : r < 75 ? '2 25 bis 75 mg' : '3 über 75 mg';
    (rb[k] || (rb[k] = [])).push(sl);
  });
  const rk = Object.keys(rb).filter(k => rb[k].length >= 2).sort();
  if (rk.length >= 2) out.push(ins('Restkoffein beim Zubettgehen und Schlaf', rk.map(k => `<div class="kv"><span>${k.slice(2)}</span><span>${f1(avg(rb[k].map(x => x.q).filter(Boolean)))} erholt · ${fmtDur(avg(rb[k].map(sleepDur).filter(x => x != null)))} <small>(${rb[k].length})</small></span></div>`).join('') + '<small>Rest nach deinem Koffein-Modell (Halbwertszeit in den Einstellungen).</small>'));
  // 4) Schlaf nach Sporttag
  const sa = [], sb = [];
  ds_.forEach(d => { const s = day(d).sleep; if (!s || sleepDur(s) == null) return; (sportMin(addDays(d, -1)) > 0 ? sa : sb).push(sleepDur(s)); });
  if (sa.length >= 3 && sb.length >= 3) out.push(ins('Schlaf nach Sporttag', `<div class="kv"><span>Nach Sport</span><span>Ø ${fmtDur(avg(sa))} <small>(${sa.length})</small></span></div><div class="kv"><span>Nach Tag ohne Sport</span><span>Ø ${fmtDur(avg(sb))} <small>(${sb.length})</small></span></div>`));
  // 5) Gewohnheiten und Stimmung
  const hr = DB.cfg.habits.map(h => {
    const y = b2.filter(d => (day(d).habits || {})[h.id]).map(d => day(d).mood.v), n = b2.filter(d => !(day(d).habits || {})[h.id]).map(d => day(d).mood.v);
    return y.length >= 4 && n.length >= 4 ? { h, y, n, diff: avg(y) - avg(n) } : null;
  }).filter(Boolean).sort((p, q) => Math.abs(q.diff) - Math.abs(p.diff)).slice(0, 6);
  if (hr.length) out.push(ins('Gewohnheiten und Stimmung', hr.map(r => `<div class="kv"><span>${r.h.e || ''} ${esc(r.h.name)}</span><span>${Math.abs(r.diff) < .05 ? '±0' : (r.diff > 0 ? '+' : '−') + f1(Math.abs(r.diff))} <small>(${r.y.length} / ${r.n.length} Tage)</small></span></div>`).join('') + '<small>Stimmungs-Unterschied an Tagen mit vs. ohne Haken.</small>'));
  return `<section class="card"><h3>Muster in deinen Daten</h3>${out.join('') || '<small>Dafür braucht es noch etwas mehr Daten (ca. 1–2 Wochen mit Stimmung, Schlaf, Kaffee, Sport). Die Auswertung erscheint hier automatisch.</small>'}</section>
  <small class="mut">Das sind Zusammenhänge in deinen eigenen Daten, keine Ursachen. Bei wenigen Tagen sind sie zufällig schwankend.</small>`;
  function ins(t, body) { return `<div class="ins"><b>${t}</b>${body}</div>`; }
}

/* ---------- Einstellungen ---------- */
const CLAUDE_PROMPT = `Werte meine(n) Screenshot(s) von der Uhr (Schlaf) aus und gib NUR ein JSON im Tracker-Format zurück, das ich in der Tracker-App unter Einstellungen → Import einfüge.
Format:
{"tracker":1,"days":{"JJJJ-MM-TT":{"sleep":{"bed":"HH:MM","wake":"HH:MM","score":0,"deep":0,"rem":0,"light":0,"awake":0,"rhr":0,"src":"uhr"}}}}
Regeln: Das Datum ist der Tag des Aufwachens. bed = Einschlafzeit, wake = Aufwachzeit (24 h). deep, rem, light, awake in Minuten, rhr = Ruhepuls, score = Schlaf-Score der Uhr. Nur Felder angeben, die im Screenshot stehen. Bei mehreren Nächten mehrere Datums-Einträge.`;

function viewSettings() {
  const c = DB.cfg;
  const list = (kind, items, f) => items.map(it => `<div class="setrow">${f(it)}<button class="x btn" data-act="cfgdel" data-kind="${kind}" data-id="${it.id}" style="padding:8px 12px">✕</button></div>`).join('');
  const inp = (kind, it, p, cls = '', type = 'text') => `<input class="${cls}" type="${type}" ${type === 'number' ? 'inputmode="numeric"' : ''} value="${esc(it[p] ?? '')}" data-cfg="${kind}" data-id="${it.id}" data-p="${p}">`;
  return `<h2>Einstellungen</h2>
  <details class="card"><summary>Darstellung</summary>${chips([['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']], c.theme, 'theme')}</details>
  <details class="card"><summary>Koffein</summary>
    <label class="mut">Tageslimit (mg)<br><input type="number" inputmode="numeric" data-cfgv="limit" value="${c.limit}"></label>
    <label class="mut">Halbwertszeit von Koffein (Stunden, meist 3 bis 7)<br><input type="number" inputmode="decimal" step="0.5" data-cfgv="halfLife" value="${c.halfLife || 5}"></label>
    <small class="mut">Als Orientierung gelten für gesunde Erwachsene etwa 400 mg pro Tag. Die Werte unten sind grobe Richtwerte und du kannst sie ändern.</small>
    ${list('coffee', c.coffee, it => inp('coffee', it, 'e', 'em') + inp('coffee', it, 'name') + inp('coffee', it, 'mg', '', 'number'))}
    <small class="mut">CoffeeB-Werte sind geschätzt (Hersteller nennt keinen Wert; ca. 6 g Arabica pro Ball). Wenn du den mg-Wert änderst, entfällt das „≈“.</small>
    <button class="btn" data-act="cfgadd" data-kind="coffee">＋ Getränk</button></details>
  <details class="card"><summary>Sportarten</summary>
    ${list('sports', c.sports, it => inp('sports', it, 'e', 'em') + inp('sports', it, 'name'))}
    <button class="btn" data-act="cfgadd" data-kind="sports">＋ Sportart</button></details>
  <details class="card"><summary>Gewohnheiten</summary>
    ${list('habits', c.habits, it => inp('habits', it, 'e', 'em') + inp('habits', it, 'name') + `<select data-cfg="habits" data-id="${it.id}" data-p="type" style="width:auto"><option value="pos" ${it.type === 'pos' ? 'selected' : ''}>＋</option><option value="neg" ${it.type === 'neg' ? 'selected' : ''}>−</option></select>`)}
    <div class="row"><button class="btn" data-act="cfgadd" data-kind="habits-pos">＋ Positive</button><button class="btn" data-act="cfgadd" data-kind="habits-neg">＋ Negative</button></div>
    <small class="mut">Alte Einträge bleiben erhalten, auch wenn du eine Gewohnheit löschst.</small></details>
  <details class="card" ${S.impMsg ? 'open' : ''}><summary>Daten, Backup und Import</summary>
    <div class="lbl" style="margin-top:0">Import (z. B. von Claude ausgewertete Uhr-Screenshots, oder ein Backup)</div>
    <textarea id="imp" placeholder='{"tracker":1,"days":{…}}'></textarea>
    <div class="row"><button class="btn pri" data-act="imp" data-m="merge">Zusammenführen</button><button class="btn danger" data-act="imp" data-m="replace">Alles ersetzen</button></div>
    ${S.impMsg ? `<small>${esc(S.impMsg)}</small>` : ''}
    <div class="lbl">Für Claude</div>
    <button class="btn" data-act="copyprompt">Auftrag für Claude kopieren</button>
    <small class="mut">Einfügen im Chat zusammen mit dem Screenshot. Claude antwortet mit dem JSON für den Import.</small>
    <div class="lbl">Export</div>
    <div class="row"><button class="btn" data-act="copyexp">Backup kopieren</button><button class="btn" data-act="dlexp">Als Datei</button></div>
    <div class="lbl">Gefahrenzone</div><button class="btn danger" data-act="wipe">Alle Daten löschen</button></details>
  <details class="card"><summary>App</summary><div class="kv"><span>Version</span><span>${VERSION}</span></div><div class="kv"><span>Einträge</span><span>${allDates().length} Tage</span></div>
    <button class="btn" data-act="update">Nach Update suchen</button>
    <small class="mut">Alle Daten liegen nur auf diesem Gerät. Mach ab und zu ein Backup.</small></details>`;
}

/* ---------- Aktionen ---------- */
function setField(path, val, el) {
  const [s, k] = path.split('.'), d = S.date;
  if (s === 'day') { const D = day(d, true); if (val) D.note = val; else delete D.note; save(); return; }
  if (s === 'mood' && k === 'qa') { const o = sec(d, 'mood'); if (val) o.qa = [{ q: el.dataset.q, a: val }]; else delete o.qa; save(); return; }
  const o = sec(d, s);
  if (val === '' || val == null) delete o[k]; else o[k] = (el && el.type === 'number') ? Number(val) : val;
  if (s === 'sleep' && (k === 'bed' || k === 'wake')) { const du = sleepDur(o); if (o.bed && o.wake) o.dur = du; else delete o.dur; }
  cleanDay(d); save();
  if (s === 'sleep' && (k === 'bed' || k === 'wake')) render();
}
function cleanDay(d) { const D = DB.days[d]; if (!D) return; ['mood', 'sleep'].forEach(k => { if (D[k] && !Object.keys(D[k]).length) delete D[k]; }); ['coffee', 'sport'].forEach(k => { if (D[k] && !D[k].length) delete D[k]; }); if (D.habits && !Object.keys(D.habits).length) delete D.habits; if (!Object.keys(D).length) delete DB.days[d]; }

const A = {
  tab(el) { S.tab = el.dataset.v; S.impMsg = ''; scrollTo(0, 0); },
  dprev() { S.date = addDays(S.date, -1); },
  dnext() { if (S.date < todayStr()) S.date = addDays(S.date, 1); },
  dtoday() { S.date = todayStr(); },
  tog(el) { S.open[el.dataset.k] = !S.open[el.dataset.k]; },
  mood(el) { const o = sec(S.date, 'mood'), v = +el.dataset.v; if (o.v === v) delete o.v; else o.v = v; cleanDay(S.date); save(); },
  srate(el) { const o = sec(S.date, 'sleep'), v = +el.dataset.v; if (o.q === v) delete o.q; else o.q = v; cleanDay(S.date); save(); },
  tag(el) { const o = sec(S.date, 'mood'), t = el.dataset.v, a = o.tags || (o.tags = []); const i = a.indexOf(t); if (i >= 0) a.splice(i, 1); else a.push(t); if (!a.length) delete o.tags; cleanDay(S.date); save(); },
  qnext() { const cur = S.qi[S.date] ?? (parse(S.date).getTime() / 864e5 | 0); S.qi[S.date] = (cur + 1) % QS.length; },
  sfall(el) { chipSet('sleep', 'fall', el); }, swakes(el) { chipSet('sleep', 'wakes', el); }, smorning(el) { chipSet('sleep', 'morning', el); },
  hab(el) { const D = day(S.date, true), h = D.habits || (D.habits = {}), id = el.dataset.id; if (h[id]) delete h[id]; else h[id] = 1; cleanDay(S.date); save(); },
  cadd(el) {
    const c = DB.cfg.coffee.find(x => x.id === el.dataset.id); if (!c) return;
    sec(S.date, 'coffee').push({ id: uid(), t: S.date === todayStr() ? nowT() : '09:00', k: c.id, name: c.name, mg: c.mg, e: c.e });
    save(); if (coffeeMg(S.date) > DB.cfg.limit) toast('Über deinem Koffein-Limit');
  },
  cdel(el) { const a = sec(S.date, 'coffee'); const i = a.findIndex(x => x.id === el.dataset.id); if (i >= 0) a.splice(i, 1); cleanDay(S.date); save(); },
  sdel(el) { const a = sec(S.date, 'sport'); const i = a.findIndex(x => x.id === el.dataset.id); if (i >= 0) a.splice(i, 1); cleanDay(S.date); save(); },
  sportopen(el) {
    const id = el.dataset.id, s = DB.cfg.sports.find(x => x.id === id);
    S.sp = { id, name: s ? s.name : '', e: s ? s.e : '🏅', min: 30, int: 2, t: S.date === todayStr() ? nowT() : '' };
    openSheet(sportSheet()); return 'noRender';
  },
  spmin(el) { S.sp.min = +el.dataset.v; $('#sbody').innerHTML = sportSheet(); return 'noRender'; },
  spint(el) { S.sp.int = +el.dataset.v; $('#sbody').innerHTML = sportSheet(); return 'noRender'; },
  spsave() {
    const s = S.sp; s.name = (s.name || '').trim(); if (!s.name) { toast('Name fehlt'); return 'noRender'; }
    if (!(s.min > 0)) { toast('Dauer fehlt'); return 'noRender'; }
    if (s.id === '_new' && !DB.cfg.sports.some(x => x.name === s.name)) DB.cfg.sports.push({ id: uid(), name: s.name, e: s.e || '🏅' });
    sec(S.date, 'sport').push({ id: uid(), t: s.t || '', name: s.name, e: s.e, min: s.min, int: s.int });
    save(); closeSheet();
  },
  sclose() { if (TP.on) tpFinish(tpValue()); else closeSheet(); return 'noRender'; },
  tpick(el) {
    const t = el.dataset.t;
    if (t === 'sleep.bed' || t === 'sleep.wake') {
      const k = t.split('.')[1];
      openTime({ title: k === 'bed' ? 'Ins Bett' : 'Aufgewacht', orig: (day(S.date).sleep || {})[k] || '', def: k === 'bed' ? '23:00' : '07:00', canClear: true, apply: v => setField(t, v) });
    } else if (t === 'coffee') {
      const c = sec(S.date, 'coffee').find(x => x.id === el.dataset.id); if (!c) return 'noRender';
      openTime({ title: 'Uhrzeit · ' + c.name, orig: c.t, def: nowT(), canClear: false, apply: v => { if (v) { c.t = v; save(); } } });
    } else if (t === 'sport' && S.sp) {
      openTime({ title: 'Uhrzeit · Sport', orig: S.sp.t || '', def: nowT(), canClear: true, back: true, apply: v => { S.sp.t = v; } });
    }
    return 'noRender';
  },
  tpdone() { tpFinish(tpValue()); return 'noRender'; },
  tpclear() { tpFinish(''); return 'noRender'; },
  tpnow() {
    const d = new Date(); let h = d.getHours(), m = Math.round(d.getMinutes() / 5); if (m === 12) { m = 0; h = Math.min(23, h + 1); }
    TP.touched = true; $('#tp-h').scrollTo({ top: h * TPI, behavior: 'smooth' }); $('#tp-m').scrollTo({ top: m * TPI, behavior: 'smooth' }); return 'noRender';
  },
  copyday(el) {
    const k = el.dataset.kind, src = day(el.dataset.src)[k] || [], isT = S.date === todayStr(), now = nowT(), dst = sec(S.date, k);
    src.forEach(e => { const c = Object.assign({}, e, { id: uid() }); if (isT && c.t && c.t > now) c.t = now; dst.push(c); });
    save(); toast(src.length + (src.length === 1 ? ' Eintrag übernommen' : ' Einträge übernommen'));
  },
  wprev() { S.week = addDays(S.week, -7); },
  wnext() { if (S.week < weekStart(todayStr())) S.week = addDays(S.week, 7); },
  copyweek() {
    const dates = Array.from({ length: 14 }, (_, i) => addDays(S.week, i - 7)), days = {};
    dates.forEach(d => { if (d < addDays(S.week, 7) && Object.keys(day(d)).length) days[d] = day(d); });
    const txt = `Hier sind meine Tracker-Daten für KW ${isoWeek(S.week)} (${S.week} bis ${addDays(S.week, 6)}) plus die Vorwoche zum Vergleich. Bitte werte aus: Muster zwischen Schlaf, Stimmung, Koffein (Koffein-Limit ${DB.cfg.limit} mg, Halbwertszeit ${DB.cfg.halfLife || 5} h), Sport und Gewohnheiten; was lief gut, was könnte ich ändern. Schlaf zählt zum Tag des Aufwachens. mood.v 1 bis 5 (5 am besten), sleep.q Erholung 1 bis 5. Bitte vorsichtig mit Schlüssen bei wenigen Tagen.\n\n` + JSON.stringify({ tracker: 1, days });
    copy(txt, 'Woche kopiert, jetzt im Chat einfügen'); return 'noRender';
  },
  vtab(el) { S.vtab = el.dataset.v; },
  range(el) { S.range = +el.dataset.v; },
  yprev() { S.year--; }, ynext() { if (S.year < new Date().getFullYear()) S.year++; },
  theme(el) { DB.cfg.theme = el.dataset.v; save(); },
  cfgadd(el) {
    const k = el.dataset.kind;
    if (k === 'coffee') DB.cfg.coffee.push({ id: uid(), name: 'Neues Getränk', mg: 50, e: '☕' });
    else if (k === 'sports') DB.cfg.sports.push({ id: uid(), name: 'Neue Sportart', e: '🏅' });
    else DB.cfg.habits.push({ id: uid(), name: 'Neue Gewohnheit', type: k === 'habits-neg' ? 'neg' : 'pos', e: k === 'habits-neg' ? '⚠️' : '✅' });
    save(); S.open.cfg = 1; keepOpen = k.split('-')[0];
  },
  cfgdel(el) { const k = el.dataset.kind; DB.cfg[k] = DB.cfg[k].filter(x => x.id !== el.dataset.id); save(); keepOpen = k; },
  imp(el) { doImport(el.dataset.m); },
  copyprompt() { copy(CLAUDE_PROMPT, 'Auftrag kopiert'); return 'noRender'; },
  copyexp() { copy(JSON.stringify(DB), 'Backup kopiert'); return 'noRender'; },
  dlexp() {
    try { const b = new Blob([JSON.stringify(DB)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'tracker-backup-' + todayStr() + '.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast('Download nicht möglich, nimm „Backup kopieren“'); }
    return 'noRender';
  },
  wipe(el) {
    if (el.dataset.sure) { DB = norm({ v: 1 }); save(); toast('Alle Daten gelöscht'); S.impMsg = ''; return; }
    el.dataset.sure = 1; el.textContent = 'Wirklich alles löschen? Nochmal tippen'; return 'noRender';
  },
  update() { checkUpdate(true); return 'noRender'; },
  async applyupd() {
    try { for (const k of await caches.keys()) await caches.delete(k); } catch (e) { }
    try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { }
    location.replace(location.pathname + '?u=' + Date.now());
    return 'noRender';
  }
};
/* Update-Prüfung: holt app.js ohne Zwischenspeicher und vergleicht die Version. Daten bleiben unberührt. */
async function checkUpdate(manual) {
  try {
    const r = await fetch('app.js?_=' + Date.now(), { cache: 'no-store' }), m = (await r.text()).match(/const VERSION = '([^']+)'/);
    if (!m) throw new Error('keine Version');
    if (m[1] !== VERSION) { const b = $('#upd'); b.innerHTML = `Update ${esc(m[1])} bereit <button data-act="applyupd">Neu laden</button>`; b.hidden = false; }
    else if (manual) toast('Du hast die neueste Version (' + VERSION + ')');
    try { localStorage.setItem('tracker-upd', String(Date.now())); } catch (e) { }
  } catch (e) { if (manual) toast('Keine Verbindung: Update-Prüfung nicht möglich'); }
}
function autoCheck() { let t = 0; try { t = Number(localStorage.getItem('tracker-upd')) || 0; } catch (e) { } if (Date.now() - t > 10 * 60 * 1000) checkUpdate(false); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoCheck(); });
setTimeout(autoCheck, 1500);
let keepOpen = null;
function chipSet(s, k, el) { const o = sec(S.date, s), v = el.dataset.v; if (o[k] === v) delete o[k]; else o[k] = v; cleanDay(S.date); save(); }
function copy(txt, msg) {
  const fb = () => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Kopieren nicht möglich'); } t.remove(); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast(msg), fb); else fb();
}
function openSheet(html) { $('#sbody').innerHTML = html; $('#sheet').hidden = false; document.body.classList.add('noscroll'); }
function closeSheet() { $('#sheet').hidden = true; S.sp = null; TP.on = false; document.body.classList.remove('noscroll'); }

/* ---------- Zeitrad (5-Minuten-Schritte) ---------- */
const TPI = 40, TP = { on: false };
function openTime(o) {
  Object.assign(TP, { on: true, touched: false, canClear: true, back: false }, o);
  let [h, m] = (o.orig || o.def || '07:00').split(':').map(Number), m5 = Math.round(m / 5);
  if (m5 === 12) { m5 = 0; h = Math.min(23, h + 1); }
  TP.h = h; TP.m5 = m5;
  openSheet(`<div class="tp-head"><b>${esc(o.title)}</b><button class="tp-ok" data-act="tpdone" aria-label="Übernehmen">✓</button></div>
    <div class="tp-wheel"><div class="tp-band"></div>
      <div class="tp-col" id="tp-h">${Array.from({ length: 24 }, (_, i) => `<div class="tp-i" data-i="${i}">${pad(i)}</div>`).join('')}</div>
      <div class="tp-sep">:</div>
      <div class="tp-col" id="tp-m">${Array.from({ length: 12 }, (_, i) => `<div class="tp-i" data-i="${i}">${pad(i * 5)}</div>`).join('')}</div></div>
    <div class="row" style="justify-content:center"><button class="btn" data-act="tpnow">Jetzt</button>${TP.canClear ? '<button class="btn" data-act="tpclear">Leeren</button>' : ''}</div>
    <div class="mut" style="text-align:center;font-size:.78rem;margin-top:10px">Mit ✓ oder Tippen neben das Fenster übernehmen</div>`);
  requestAnimationFrame(() => {
    const hc = $('#tp-h'), mc = $('#tp-m'); if (!hc || !mc) return;
    TP.ready = false; hc.scrollTop = TP.h * TPI; mc.scrollTop = TP.m5 * TPI; setTimeout(() => { TP.ready = true; }, 450);
    [hc, mc].forEach(col => {
      tpMark(col);
      col.addEventListener('scroll', () => { if (TP.ready) TP.touched = true; cancelAnimationFrame(col._r); col._r = requestAnimationFrame(() => tpMark(col)); }, { passive: true });
      ['pointerdown', 'wheel', 'touchstart'].forEach(ev => col.addEventListener(ev, () => { TP.touched = true; }, { passive: true }));
      col.addEventListener('click', e => { const it = e.target.closest('.tp-i'); if (it) { TP.touched = true; col.scrollTo({ top: +it.dataset.i * TPI, behavior: 'smooth' }); } });
    });
  });
}
function tpMark(col) {
  const n = col.children.length, i = Math.min(n - 1, Math.max(0, Math.round(col.scrollTop / TPI)));
  [...col.children].forEach((c, k) => c.classList.toggle('sel', k === i));
}
function tpRead() {
  const h = Math.min(23, Math.max(0, Math.round($('#tp-h').scrollTop / TPI))), m = Math.min(11, Math.max(0, Math.round($('#tp-m').scrollTop / TPI))) * 5;
  return pad(h) + ':' + pad(m);
}
function tpValue() { return (!TP.touched && TP.orig) ? TP.orig : tpRead(); }
function tpFinish(val) {
  const back = TP.back, apply = TP.apply; TP.on = false;
  if (back) { apply(val); $('#sbody').innerHTML = sportSheet(); return; }
  closeSheet(); apply(val); render();
}
function sportSheet() {
  const s = S.sp;
  return `<h3>${s.id === '_new' ? 'Neue Sportart' : esc(s.e + ' ' + s.name)}</h3>
  ${s.id === '_new' ? `<div class="setrow"><input class="em" type="text" value="${esc(s.e)}" data-sp="e"><input type="text" placeholder="Name der Sportart" value="${esc(s.name)}" data-sp="name"></div>` : ''}
  <div class="lbl">Dauer (Minuten)</div>
  ${chips([15, 20, 30, 45, 60, 90, 120].map(v => [v, v]), s.min, 'spmin')}
  <div class="row sub"><input type="number" inputmode="numeric" value="${s.min}" data-sp="min" style="width:100px"><span class="mut">oder eigene Zahl</span></div>
  <div class="lbl">Intensität</div>${chips([[1, 'leicht'], [2, 'mittel'], [3, 'hart']], s.int, 'spint')}
  <div class="lbl">Uhrzeit (optional)</div><button class="timebtn" data-act="tpick" data-t="sport">${s.t || '–:–'}</button>
  <div class="row sub"><button class="btn pri grow" data-act="spsave">Speichern</button><button class="btn" data-act="sclose">Abbrechen</button></div>`;
}
function doImport(mode) {
  const txt = $('#imp').value.trim();
  if (!txt) { S.impMsg = 'Nichts eingefügt.'; return; }
  let j; try { j = JSON.parse(txt.replace(/^```(?:json)?|```$/gm, '').trim()); } catch (e) { S.impMsg = 'Das ist kein gültiges JSON. Bitte genau so einfügen, wie Claude es ausgegeben hat.'; return; }
  if (!j || typeof j.days !== 'object') { S.impMsg = 'Kein Tracker-Format (es fehlt „days“).'; return; }
  const bad = Object.keys(j.days).filter(k => !/^\d{4}-\d{2}-\d{2}$/.test(k));
  if (bad.length) { S.impMsg = 'Ungültiges Datum: ' + bad[0]; return; }
  if (mode === 'replace') { DB = norm({ v: 1, days: j.days, cfg: j.cfg }); }
  else {
    let n = 0;
    for (const [d, X] of Object.entries(j.days)) {
      const T = day(d, true); n++;
      for (const [k, v] of Object.entries(X || {})) {
        if (k === 'sleep' || k === 'mood') T[k] = Object.assign(T[k] || {}, v);
        else if (k === 'habits') T.habits = Object.assign(T.habits || {}, v);
        else if (k === 'coffee' || k === 'sport') { T[k] = T[k] || []; (v || []).forEach(e => { e.id = e.id || uid(); if (!T[k].some(x => x.id === e.id)) T[k].push(e); }); }
        else if (k === 'note') T.note = v;
      }
      if (T.sleep && T.sleep.bed && T.sleep.wake) T.sleep.dur = sleepDur(T.sleep);
    }
    if (j.cfg && j.v === 1) { /* Einstellungen bei „Zusammenführen“ bewusst unverändert */ }
    S.impMsg = `${n} ${n === 1 ? 'Tag' : 'Tage'} übernommen.`;
  }
  if (mode === 'replace') S.impMsg = 'Alle Daten ersetzt.';
  save();
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  e.preventDefault();
  const fn = A[el.dataset.act]; if (!fn) return;
  const r = fn(el);
  if (r !== 'noRender') {
    const open = [...document.querySelectorAll('details[open] summary')].map(s => s.textContent.trim());
    render();
    document.querySelectorAll('details summary').forEach(s => { if (open.includes(s.textContent.trim()) || (keepOpen && s.textContent.trim().toLowerCase().startsWith({ coffee: 'koffein', sports: 'sportarten', habits: 'gewohnheiten' }[keepOpen] || '#'))) s.parentElement.open = true; });
    keepOpen = null;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.f === 'coffeet') { const c = sec(S.date, 'coffee').find(x => x.id === t.dataset.id); if (c) { c.t = t.value || c.t; save(); } return; }
  if (t.dataset.f && t.type !== 'textarea') { setField(t.dataset.f, t.value, t); return; }
  if (t.dataset.cfg) {
    const it = DB.cfg[t.dataset.cfg].find(x => x.id === t.dataset.id); if (!it) return;
    it[t.dataset.p] = t.type === 'number' ? (Number(t.value) || 0) : t.value; if (t.dataset.p === 'mg') delete it.est; save();
    if (t.dataset.p === 'type') toast('Gespeichert');
    return;
  }
  if (t.dataset.cfgv) { const k = t.dataset.cfgv, v = Number(t.value); DB.cfg[k] = k === 'halfLife' ? Math.min(12, Math.max(1, v || 5)) : (v || 400); save(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f && t.tagName === 'TEXTAREA') setField(t.dataset.f, t.value.trim() ? t.value : '', t);
  if (t.dataset.sp && S.sp) { S.sp[t.dataset.sp] = t.type === 'number' ? Number(t.value) : t.value; }
});
render();
