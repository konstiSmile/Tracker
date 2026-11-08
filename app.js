'use strict';
/* Tracker – Stimmung, Schlaf, Kaffee, Sport, Gewohnheiten. Daten nur lokal (localStorage). */
const VERSION = '1.0';
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
  theme: 'dark', limit: 400,
  coffee: [
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
  const c = JSON.parse(JSON.stringify(DEF_CFG));
  r.cfg = Object.assign(c, r.cfg || {});
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
const S = { tab: 'heute', date: todayStr(), open: {}, vtab: 'ueb', range: 30, year: new Date().getFullYear(), sp: null, qi: {}, impMsg: '' };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600);
}
function applyTheme() {
  const t = DB.cfg.theme;
  const th = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = th;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'light' ? '#f6f4ef' : '#121417';
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
  return `
  <div class="dhead"><button data-act="dprev">‹</button><div><b>${esc(label)}</b><small>${isToday ? 'Heute' : `<a href="#" data-act="dtoday" style="color:var(--acc)">Zu heute</a>`}</small></div><button data-act="dnext" ${isToday ? 'disabled' : ''}>›</button></div>

  <section class="card"><h3>Stimmung</h3>
    <div class="smileys">${MOOD_E.map((e, i) => `<button class="sm ${m.v === i + 1 ? 'on' : ''}" style="--c:${MCOL(i + 1)}" data-act="mood" data-v="${i + 1}" aria-label="${MOOD_N[i]}">${e}</button>`).join('')}</div>
    <button class="more" data-act="tog" data-k="mood">${moodOpen ? 'Weniger' : 'Mehr dazu: Gefühle, Frage, Notiz'}${!moodOpen && (m.tags?.length || qa.a || m.note) ? ' ●' : ''}</button>
    ${moodOpen ? `
      <div class="lbl">Gefühle</div>
      <div class="chips">${TAGS.map(t => `<button class="chip ${(m.tags || []).includes(t) ? 'on' : ''}" data-act="tag" data-v="${t}">${t}</button>`).join('')}</div>
      <div class="lbl row sb"><span>${esc(q)}</span><button data-act="qnext" style="color:var(--acc)">andere ↻</button></div>
      <textarea data-f="mood.qa" data-q="${esc(q)}" placeholder="Kurz antworten …">${esc(qa.a || '')}</textarea>
      <div class="lbl">Freie Notiz</div>
      <textarea data-f="mood.note" placeholder="Was dir sonst noch durch den Kopf geht …">${esc(m.note || '')}</textarea>` : ''}
  </section>

  <section class="card"><h3>Schlaf <small style="text-transform:none;letter-spacing:0">Nacht auf ${isToday ? 'heute' : 'diesen Tag'}</small></h3>
    <div class="row"><label class="mut">Ins Bett<br><input type="time" data-f="sleep.bed" value="${sl.bed || ''}"></label>
    <label class="mut">Aufgewacht<br><input type="time" data-f="sleep.wake" value="${sl.wake || ''}"></label>
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
    <div class="chips sub">${DB.cfg.coffee.map(c => `<button class="chip" data-act="cadd" data-id="${c.id}">${c.e || '☕'} ${esc(c.name)}<small>${c.mg}</small></button>`).join('')}</div>
    ${cof.map(c => `<div class="ent"><input class="t" type="time" data-f="coffeet" data-id="${c.id}" value="${c.t}"><span class="grow">${esc(c.name)} <small>${c.mg} mg</small></span><button class="x" data-act="cdel" data-id="${c.id}">✕</button></div>`).join('')}
  </section>

  <section class="card"><h3>Sport <span style="text-transform:none;letter-spacing:0">${sportMin(d) ? sportMin(d) + ' min' : ''}</span></h3>
    <div class="chips">${DB.cfg.sports.map(s => `<button class="chip" data-act="sportopen" data-id="${s.id}">${s.e || '🏅'} ${esc(s.name)}</button>`).join('')}<button class="chip" data-act="sportopen" data-id="_new">＋ Neu</button></div>
    ${sp.map(s => `<div class="ent"><span class="t">${s.t || ''}</span><span class="grow">${s.e || ''} ${esc(s.name)} <small>${s.min} min${s.int ? ' · ' + ['leicht', 'mittel', 'hart'][s.int - 1] : ''}</small></span><button class="x" data-act="sdel" data-id="${s.id}">✕</button></div>`).join('')}
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
  const seg = `<div class="seg">${[['ueb', 'Übersicht'], ['sport', 'Sport'], ['muster', 'Muster']].map(([k, l]) => `<button class="${S.vtab === k ? 'on' : ''}" data-act="vtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  return `<h2>Verlauf</h2>${seg}${S.vtab === 'ueb' ? vUeb() : S.vtab === 'sport' ? vSport() : vMuster()}`;
}
function vUeb() {
  const n = S.range, end = todayStr(), dates = []; for (let i = n - 1; i >= 0; i--) dates.push(addDays(end, -i));
  const mood = dates.map(d => day(d).mood?.v ?? null), sl = dates.map(d => { const x = sleepDur(day(d).sleep); return x == null ? null : x / 60; });
  const cof = dates.map(d => coffeeMg(d) || null), spt = dates.map(d => sportMin(d) || null);
  const nz = a => a.filter(v => v != null);
  const rng = `<div class="seg">${[7, 30, 90].map(r => `<button class="${S.range === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} Tage</button>`).join('')}</div>`;
  const hab = DB.cfg.habits.map(h => {
    const tracked = dates.filter(d => Object.keys(day(d)).length); const c = tracked.filter(d => (day(d).habits || {})[h.id]).length;
    const pct = tracked.length ? c / tracked.length : 0;
    return `<div class="kv"><span>${h.e || ''} ${esc(h.name)}</span><span>${c} / ${tracked.length} Tage</span></div><div class="bar" style="margin:2px 0 8px"><i style="width:${pct * 100}%;background:${h.type === 'pos' ? 'var(--pos)' : 'var(--neg)'}"></i></div>`;
  }).join('');
  return rng + `
  <section class="card"><h3>Stimmung <span style="text-transform:none">Ø ${f1(avg(nz(mood)))}</span></h3>${lineChart(dates, mood)}</section>
  <section class="card"><h3>Schlaf (Stunden) <span style="text-transform:none">Ø ${f1(avg(nz(sl)))} h</span></h3>${barChart(dates, sl, { max: 10, band: [7, 9], fmt: v => Math.round(v) })}<small>Grüner Bereich: 7–9 h</small></section>
  <section class="card"><h3>Koffein (mg) <span style="text-transform:none">Ø ${Math.round(avg(nz(cof)) || 0)} mg</span></h3>${barChart(dates, cof, { limit: DB.cfg.limit, colorFn: v => v > DB.cfg.limit ? 'var(--bad)' : 'var(--acc)' })}</section>
  <section class="card"><h3>Sport (Minuten) <span style="text-transform:none">${nz(spt).length} Tage · ${nz(spt).reduce((a, b) => a + b, 0)} min</span></h3>${barChart(dates, spt, { colorFn: () => 'var(--pos)' })}</section>
  <section class="card"><h3>Gewohnheiten</h3>${hab || '<small>Noch keine angelegt.</small>'}</section>`;
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
  // 3) Spätes Koffein und Schlaf
  const late = [], early = [];
  ds_.forEach(d => { const s = day(d).sleep, p = day(addDays(d, -1)).coffee; if (!s || !p || !p.length || !(sleepDur(s) != null || s.q)) return; const l = p.map(c => tmin(c.t)).sort((x, y) => y - x)[0]; (l >= 900 ? late : early).push(s); });
  if (late.length >= 3 && early.length >= 3) {
    const row = (l, arr) => `<div class="kv"><span>${l}</span><span>${f1(avg(arr.map(s => s.q).filter(Boolean)))} erholt · ${fmtDur(avg(arr.map(sleepDur).filter(x => x != null)))} <small>(${arr.length})</small></span></div>`;
    out.push(ins('Letzter Kaffee am Vortag und Schlaf', row('Nach 15 Uhr', late) + row('Vor 15 Uhr', early)));
  }
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
  <details class="card"><summary>Darstellung</summary>${chips([['dark', 'Dunkel'], ['light', 'Hell'], ['system', 'System']], c.theme, 'theme')}</details>
  <details class="card"><summary>Koffein</summary>
    <label class="mut">Tageslimit (mg)<br><input type="number" inputmode="numeric" data-cfgv="limit" value="${c.limit}"></label>
    <small class="mut">Als Orientierung gelten für gesunde Erwachsene etwa 400 mg pro Tag. Die Werte unten sind grobe Richtwerte und du kannst sie ändern.</small>
    ${list('coffee', c.coffee, it => inp('coffee', it, 'e', 'em') + inp('coffee', it, 'name') + inp('coffee', it, 'mg', '', 'number'))}
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
  sclose() { closeSheet(); return 'noRender'; },
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
  update() {
    if (!('serviceWorker' in navigator)) { toast('Nicht unterstützt'); return 'noRender'; }
    navigator.serviceWorker.getRegistration().then(r => r ? r.update().then(() => toast('Du hast die aktuelle Version bzw. sie wird beim nächsten Start geladen')) : toast('Kein Service Worker aktiv'));
    return 'noRender';
  }
};
let keepOpen = null;
function chipSet(s, k, el) { const o = sec(S.date, s), v = el.dataset.v; if (o[k] === v) delete o[k]; else o[k] = v; cleanDay(S.date); save(); }
function copy(txt, msg) {
  const fb = () => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Kopieren nicht möglich'); } t.remove(); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast(msg), fb); else fb();
}
function openSheet(html) { $('#sbody').innerHTML = html; $('#sheet').hidden = false; }
function closeSheet() { $('#sheet').hidden = true; S.sp = null; }
function sportSheet() {
  const s = S.sp;
  return `<h3>${s.id === '_new' ? 'Neue Sportart' : esc(s.e + ' ' + s.name)}</h3>
  ${s.id === '_new' ? `<div class="setrow"><input class="em" type="text" value="${esc(s.e)}" data-sp="e"><input type="text" placeholder="Name der Sportart" value="${esc(s.name)}" data-sp="name"></div>` : ''}
  <div class="lbl">Dauer (Minuten)</div>
  ${chips([15, 20, 30, 45, 60, 90, 120].map(v => [v, v]), s.min, 'spmin')}
  <div class="row sub"><input type="number" inputmode="numeric" value="${s.min}" data-sp="min" style="width:100px"><span class="mut">oder eigene Zahl</span></div>
  <div class="lbl">Intensität</div>${chips([[1, 'leicht'], [2, 'mittel'], [3, 'hart']], s.int, 'spint')}
  <div class="lbl">Uhrzeit (optional)</div><input type="time" value="${s.t || ''}" data-sp="t">
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
    it[t.dataset.p] = t.type === 'number' ? (Number(t.value) || 0) : t.value; save();
    if (t.dataset.p === 'type') toast('Gespeichert');
    return;
  }
  if (t.dataset.cfgv) { DB.cfg[t.dataset.cfgv] = Number(t.value) || 400; save(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f && t.tagName === 'TEXTAREA') setField(t.dataset.f, t.value.trim() ? t.value : '', t);
  if (t.dataset.sp && S.sp) { S.sp[t.dataset.sp] = t.type === 'number' ? Number(t.value) : t.value; }
});
render();
