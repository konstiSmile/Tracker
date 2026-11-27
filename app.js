'use strict';
/* Tracker – Stimmung, Schlaf, Kaffee, Sport, Gewohnheiten. Daten nur lokal (localStorage). */
const VERSION = '4.7';
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
const TAG_G = [['Angenehm', ['froh', 'ruhig', 'motiviert', 'dankbar', 'verbunden', 'stolz', 'zuversichtlich']],
  ['Unangenehm', ['gestresst', 'überfordert', 'ängstlich', 'traurig', 'gereizt', 'einsam', 'gelangweilt', 'leer']],
  ['Körper', ['müde', 'Kopfschmerzen', 'verspannt', 'Bauchweh']]];
const TAGS = TAG_G.flatMap(g => g[1]);
const KOPF_N = ['ganz leicht', 'leicht', 'mittel', 'stark', 'sehr stark'];
const EN_N = ['erschöpft', 'müde', 'mittel', 'wach', 'voller Energie'];
const QS = ['Was hat dir heute gutgetan?', 'Was hat dich heute belastet?', 'Wofür bist du heute dankbar?', 'Was hat dich heute überrascht?', 'Was war der beste Moment des Tages?', 'Was würdest du morgen gern anders machen?', 'Wie viel Energie hattest du, und woran lag es?', 'Mit wem hast du heute gesprochen, und wie war es?', 'Was beschäftigt dich gerade am meisten?', 'Worauf freust du dich?'];
const MCOL = i => `var(--m${i})`;
const REST_N = ['gar nicht erholt', 'wenig erholt', 'mittel erholt', 'gut erholt', 'sehr gut erholt'];

const DEF_CFG = {
  theme: 'light', limit: 400, halfLife: 6, v: 9, seen: {}, fold: {}, wxLoc: 'gps',
  coffee: [
    { id: 'cb_espresso', name: 'CoffeeB Espresso', mg: 65, e: '☕', est: true },
    { id: 'cb_lungo', name: 'CoffeeB Lungo', mg: 65, e: '☕', est: true },
    { id: 'cb_forte', name: 'CoffeeB Lungo Forte', mg: 70, e: '☕', est: true },
    { id: 'cb_decaf', name: 'CoffeeB Decaffeinato', mg: 3, e: '🫘', est: true },
    { id: 'espresso', name: 'Espresso', mg: 63, e: '☕' },
    { id: 'doppio', name: 'Doppelter Espresso', mg: 126, e: '☕' },
    { id: 'filter', name: 'Filterkaffee', mg: 95, e: '🫖', sizes: [{ l: 'Tasse', mg: 95 }, { l: 'Becher 0,3 l', mg: 140 }] },
    { id: 'cappu', name: 'Cappuccino / Latte', mg: 63, e: '🥛', sizes: [{ l: '1 Shot', mg: 63 }, { l: '2 Shots', mg: 126 }] },
    { id: 'americano', name: 'Americano', mg: 126, e: '☕' },
    { id: 'schwarztee', name: 'Schwarzer Tee', mg: 45, e: '🍵', sizes: [{ l: 'Tasse', mg: 45 }, { l: 'Becher 0,3 l', mg: 70 }] },
    { id: 'gruentee', name: 'Grüner Tee', mg: 30, e: '🍃', sizes: [{ l: 'Tasse', mg: 30 }, { l: 'Becher 0,3 l', mg: 45 }] },
    { id: 'matcha', name: 'Matcha', mg: 70, e: '🍵' },
    { id: 'cola', name: 'Cola', mg: 33, e: '🥤', sizes: [{ l: '0,33 l', mg: 33 }, { l: '0,2 l', mg: 20 }, { l: '0,5 l', mg: 50 }, { l: '1 l', mg: 100 }] },
    { id: 'energy', name: 'Energydrink', mg: 80, e: '⚡', sizes: [{ l: '250 ml', mg: 80 }, { l: '355 ml', mg: 114 }, { l: '500 ml', mg: 160 }] },
    { id: 'mate', name: 'Mate (Flasche)', mg: 100, e: '🧉', est: true, hid: true, sizes: [{ l: '0,5 l', mg: 100 }, { l: '0,33 l', mg: 66 }] }
  ],
  sports: [
    { id: 'laufen', name: 'Laufen', e: '🏃' }, { id: 'klettern', name: 'Klettern', e: '🧗' },
    { id: 'wandern', name: 'Wandern', e: '🥾' }, { id: 'kraft', name: 'Krafttraining', e: '🏋️' },
    { id: 'schwimmen', name: 'Schwimmen', e: '🏊' }, { id: 'rad', name: 'Radfahren', e: '🚴' },
    { id: 'pendel', name: 'Pendelweg', e: '🚴', km: '3–4', commute: true },
    { id: 'yoga', name: 'Yoga / Dehnen', e: '🧘', hid: true }, { id: 'spazieren', name: 'Spazieren', e: '🚶', hid: true },
    { id: 'ball', name: 'Ballsport', e: '⚽', hid: true }, { id: 'bouldern', name: 'Bouldern', e: '🪨', hid: true },
    { id: 'fussball', name: 'Fußball', e: '⚽', hid: true }, { id: 'tennis', name: 'Tennis / Badminton', e: '🎾', hid: true },
    { id: 'ski', name: 'Ski / Snowboard', e: '⛷️', hid: true }, { id: 'tanzen', name: 'Tanzen', e: '💃', hid: true },
    { id: 'hiit', name: 'HIIT / Zirkel', e: '🔥', hid: true }
  ],
  acts: [
    { id: 'uni', name: 'Uni', i: 'heft' },
    { id: 'arbeit', name: 'Arbeit', i: 'koffer' },
    { id: 'erled', name: 'Erledigungen', i: 'haken' },
    { id: 'haushalt', name: 'Haushalt', i: 'besen' },
    { id: 'gelesen', name: 'Gelesen', i: 'lesen' },
    { id: 'erholung', name: 'Erholung', i: 'stuhl' },
    { id: 'prokr', name: 'Prokrastiniert', i: 'sanduhr' },
  ],
  habits: [
    { id: 'h1', name: 'Draußen an der Luft', type: 'pos', e: '🌳' },
    { id: 'h2', name: 'Genug getrunken', type: 'pos', e: '💧' },
    { id: 'h3', name: 'Gelernt / produktiv', type: 'pos', e: '📚' },
    { id: 'h4', name: 'Zeit mit Menschen', type: 'pos', e: '🫶' },
    { id: 'h5', name: 'Zu viel Handy', type: 'neg', e: '📱' },
    { id: 'h7', name: 'Süßes / Junkfood', type: 'neg', e: '🍫' },
    { id: 'h8', name: 'Grübeln / Stress', type: 'neg', e: '🌀' },
    { id: 'h9', name: 'Meditiert / Ruhepause', type: 'pos', e: '🧘', hid: true },
    { id: 'h10', name: 'Gesund gegessen', type: 'pos', e: '🥗', hid: true },
    { id: 'h11', name: 'Gelesen', type: 'pos', e: '📖', hid: true },
    { id: 'h12', name: 'Früh aufgestanden', type: 'pos', e: '🌅', hid: true },
    { id: 'h13', name: 'Aufgeräumt', type: 'pos', e: '🧹', hid: true },
    { id: 'h14', name: 'Kreativ gewesen', type: 'pos', e: '🎨', hid: true },
    { id: 'h15', name: 'Spät gegessen', type: 'neg', e: '🌙', hid: true },
    { id: 'h17', name: 'Aufgeschoben', type: 'neg', e: '⏳', hid: true },
    { id: 'h18', name: 'Zu lange gesessen', type: 'neg', e: '🪑', hid: true },
    { id: 'h19', name: 'Mahlzeit ausgelassen', type: 'neg', e: '🍽️', hid: true },
    { id: 'h20', name: 'Bildschirm im Bett', type: 'neg', e: '🛌', hid: true },
    { id: 'h21', name: 'Morgens Tageslicht', type: 'pos', e: '🌅', i: 'sonnenaufgang' },
    { id: 'h22', name: 'Pause ohne Handy', type: 'pos', e: '🧘', i: 'lotus' },
    { id: 'h23', name: 'Abends runtergefahren', type: 'pos', e: '🌙', i: 'spaet' }
  ]
};

/* Zeichnungen statt Emojis (ab 2.0): jedes Getränk, jede Sportart und Gewohnheit hat ein Feld i (Schlüssel aus icons.js). e bleibt für ältere Sicherungen erhalten. */
const DEF_I = {
  coffee: { cb_espresso: 'tasse', cb_lungo: 'becher', cb_forte: 'becher', cb_decaf: 'bohne', espresso: 'tasse', doppio: 'tasse', filter: 'kanne', cappu: 'latte', americano: 'becher', schwarztee: 'tee', gruentee: 'blatt', matcha: 'matcha', cola: 'cola', energy: 'dose', mate: 'flasche' },
  sports: { laufen: 'laufen', klettern: 'klettern', wandern: 'wandern', kraft: 'kraft', schwimmen: 'schwimmen', rad: 'rad', pendel: 'pendel', yoga: 'yoga', spazieren: 'spazieren', ball: 'ball', bouldern: 'bouldern', fussball: 'fussball', tennis: 'tennis', ski: 'ski', tanzen: 'tanzen', hiit: 'hiit' },
  habits: { h1: 'baum', h2: 'tropfen', h3: 'heft', h4: 'menschen', h5: 'handy', h6: 'glas', h7: 'suess', h8: 'spirale', h9: 'lotus', h10: 'apfel', h11: 'lesen', h12: 'sonnenaufgang', h13: 'besen', h14: 'palette', h15: 'spaet', h16: 'rauch', h17: 'sanduhr', h18: 'stuhl', h19: 'teller', h20: 'bett' }
};
const KINDS = ['coffee', 'sports', 'habits'];
KINDS.forEach(k => DEF_CFG[k].forEach(x => { x.i = DEF_I[k][x.id]; }));
const AREA = { coffee: 'a-coffee', sports: 'a-sport', habits: 'a-habit' };
const DEF_IC = { coffee: 'tasse', sports: 'medaille', habits: 'herz' };
const itIc = (kind, it) => (it && IC[it.i]) ? it.i : emoIc(it && it.e, DEF_IC[kind]);
const sportIc = x => { const c = DB.cfg.sports.find(y => y.name === x.name); return c ? itIc('sports', c) : IC[x.i] ? x.i : emoIc(x.e, 'medaille'); };
const chead = (area, title, right = '') => `<div class="chead"><div class="tile on-g">${tile(area)}</div><h3>${title}</h3>${right ? `<span class="mut">${right}</span>` : ''}</div>`;
function ensureIcons(cfg) {
  KINDS.forEach(k => (cfg[k] || []).forEach(it => {
    if (it.i && IC[it.i]) return;
    const df = DEF_CFG[k].find(x => x.id === it.id);
    if (df && (!it.e || it.e === df.e)) { it.i = df.i; return; }
    const pick = emoIc(it.e, null);
    it.i = pick && IC_SETS[k].includes(pick) ? pick : df ? df.i : (k === 'habits' && it.type === 'neg') ? 'punkt' : DEF_IC[k];
  }));
}

/* ---------- Speicher ---------- */
let DB = load();
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.v === 1) return norm(r); } catch (e) { }
  return norm({ v: 1 });
}
function norm(r) {
  r.v = 1; r.days = r.days || {}; r.weeks = r.weeks || {};
  const c = JSON.parse(JSON.stringify(DEF_CFG)), sv = (r.cfg && r.cfg.v) || 1;
  r.cfg = Object.assign(c, r.cfg || {});
  if (sv < 2) DEF_CFG.coffee.forEach(d => { if (!r.cfg.coffee.some(x => x.id === d.id)) r.cfg.coffee.push(JSON.parse(JSON.stringify(d))); });
  if (sv < 3 && r.cfg.theme === 'dark') r.cfg.theme = 'light';   // Version 1.5: helleres Design als neuer Standard
  if (sv < 4 && !r.cfg.sports.some(x => x.id === 'pendel')) r.cfg.sports.push(JSON.parse(JSON.stringify(DEF_CFG.sports.find(x => x.id === 'pendel'))));   // Version 1.12: Pendelweg
  if (sv < 5) {   // Version 1.13: Größen bei Getränken, mehr Sportarten und Gewohnheiten (neue sind versteckt)
    const oldN = { filter: 'Filterkaffee (Tasse)', cappu: 'Cappuccino / Latte (1 Shot)', cola: 'Cola (0,33 l)', energy: 'Energydrink (250 ml)' };
    DEF_CFG.coffee.forEach(d => {
      const it = r.cfg.coffee.find(x => x.id === d.id);
      if (!it) { if (d.id === 'mate') r.cfg.coffee.push(JSON.parse(JSON.stringify(d))); return; }
      if (d.sizes && !it.sizes && it.mg === d.mg) { it.sizes = JSON.parse(JSON.stringify(d.sizes)); if (it.name === oldN[d.id]) it.name = d.name; }
    });
    const neu = ['bouldern', 'fussball', 'tennis', 'ski', 'tanzen', 'hiit', 'h9', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16', 'h17', 'h18', 'h19', 'h20'];
    ['sports', 'habits'].forEach(k => DEF_CFG[k].forEach(d => { if (neu.includes(d.id) && !r.cfg[k].some(x => x.id === d.id)) r.cfg[k].push(JSON.parse(JSON.stringify(d))); }));
  }
  ensureIcons(r.cfg);   // Version 2.0: Zeichnungen statt Emojis
  if (sv < 7 && (r.cfg.halfLife || 5) === 5) r.cfg.halfLife = 6;   // Version 2.2: Standard-Halbwertszeit 6 h (eigene Werte bleiben)
  if (sv < 8) {   // Version 2.9: Alkohol und Rauchen auf Wunsch entfernt (auch aus den Tagen)
    const weg = ['h6', 'h16']; r.cfg.habits = r.cfg.habits.filter(h => !weg.includes(h.id));
    Object.keys(r.days).forEach(d => { const D = r.days[d]; if (D.habits) { weg.forEach(k => delete D.habits[k]); if (!Object.keys(D.habits).length) delete D.habits; if (!Object.keys(D).length) delete r.days[d]; } });
  }
  if (sv < 9) DEF_CFG.habits.filter(d => ['h21', 'h22', 'h23'].includes(d.id)).forEach(d => { if (!r.cfg.habits.some(x => x.id === d.id)) r.cfg.habits.push(JSON.parse(JSON.stringify(d))); });   // Version 4.6: drei neue positive Gewohnheiten
  r.cfg.v = 9;
  return r;
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('Speichern nicht möglich (Speicher voll?)'); }
    sbSoon();
  }, 150);
}
/* Tabellen-Backup (Google Apps Script). Adresse und Passwort liegen separat in localStorage, nicht in den Daten. */
const SYNC_KEY = 'tracker-sync';
const syncCfg = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } };
let syncTimer = null;
async function syncNow(manual) {
  const c = syncCfg(); if (!c.url || !c.key) { if (manual) toast('Erst Adresse und Passwort eintragen'); return; }
  if (!navigator.onLine) { c.pending = 1; localStorage.setItem(SYNC_KEY, JSON.stringify(c)); if (manual) toast('Offline: wird später gesichert'); return; }
  try {
    await fetch(c.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: c.key, db: DB, w: widgetHint() }) });
    c.last = Date.now(); c.pending = 0; localStorage.setItem(SYNC_KEY, JSON.stringify(c));
    if (manual) toast('An Tabelle gesendet');
  } catch (e) { c.pending = 1; localStorage.setItem(SYNC_KEY, JSON.stringify(c)); if (manual) toast('Senden fehlgeschlagen'); }
}
/* Für das Scriptable-Widget: heutige Erfolge und Erkenntnis, damit es nicht selbst rechnen muss. Liegt nicht in den Daten. */
function widgetHint() {
  const t = todayStr(); let fb = [], ins = null;
  try { fb = fbList(t).filter(m => !m.all || m.id === 'all5').slice(0, 3).map(m => m.t); } catch (e) { }
  try { ins = insightFor(t); } catch (e) { }
  return { d: t, at: Date.now(), fb, ins };
}
window.addEventListener('online', () => { if (syncCfg().pending) syncNow(false); sbSoon(500); });
window.addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } });
/* ---------- Sync zwischen Geräten (4.0): Supabase, Sync-Code ohne Konto, pro Tag gespeichert ----------
   tracker-sb (nur auf dem Gerät): code, since (Server-Stand des letzten Abrufs), u[d] (Server-Stand je Tag), h[d] (Prüfsumme der zuletzt abgeglichenen Fassung),
   mu/mh (dasselbe für cfg, weeks, hint), ask[d] (Widersprüche zum Nachfragen), delHold (Löschungen, die zurückgehalten werden). */
const SB_URL = 'https://qbdpzamygonpruaafcrt.supabase.co', SB_KEY = 'sb_publishable_A7zukzk82Suux8jteQvLGA_WmXnZb14', SB_LS = 'tracker-sb';
const SB_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', SB_DERIVED = ['mood.v', 'sleep.dur'];
const SB = { busy: false, again: false, timer: 0 };
const sbSt = () => { try { const o = JSON.parse(localStorage.getItem(SB_LS)); return o && typeof o.code === 'string' && o.code.length === 20 ? o : null; } catch (e) { return null; } };
const sbSave = o => { try { if (o) localStorage.setItem(SB_LS, JSON.stringify(o)); else localStorage.removeItem(SB_LS); } catch (e) { } };
const sbNewCode = () => { const b = new Uint8Array(20); crypto.getRandomValues(b); let c = ''; for (let i = 0; i < 20; i++) c += SB_ABC[b[i] % SB_ABC.length]; return c; };
const sbFmt = c => c.replace(/(.{4})(?=.)/g, '$1-');
const sbNorm = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const sbNz = D => D && Object.keys(D).length ? D : undefined;
const sbStab = o => o === undefined ? 'none' : JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((r, k2) => (r[k2] = v[k2], r), {}) : v);
const sbHash = o => { if (o === undefined) return 'none'; const s = sbStab(o); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + s.length.toString(36); };
function sbRpc(fn, body) {
  return fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.text().then(t => { let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { } if (!r.ok) throw new Error((j && j.message) || 'HTTP ' + r.status); return j; }));
}
/* Zusammenführen zweier Fassungen eines Tages: Listen mit id werden vereinigt, fehlende Felder ergänzt.
   Haben beide Geräte dasselbe Feld unterschiedlich gesetzt, ist das ein Widerspruch (asks) – vorläufig gilt dieses Gerät. */
function sbMerge(a, b, p, asks) {
  if (sbStab(a) === sbStab(b)) return a;
  if (a === undefined || a === null) return b;
  if (b === undefined || b === null) return a;
  if (Array.isArray(a) && Array.isArray(b)) {
    const all = a.concat(b);
    if (all.every(x => x && typeof x === 'object' && x.id)) { const r = a.slice(); b.forEach(x => { if (!r.some(y => y.id === x.id)) r.push(x); }); return r; }
    if (all.every(x => x === null || typeof x !== 'object')) return [...new Set(all)];
  } else if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const r = {}; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => { const v = sbMerge(a[k], b[k], p ? p + '.' + k : k, asks); if (v !== undefined) r[k] = v; }); return r;
  }
  if (!SB_DERIVED.includes(p)) asks.push({ p, a, b });
  return a;
}
function sbFix(D) { if (D.mood && D.mood.log) moodSync(D.mood); if (D.sleep && D.sleep.bed && D.sleep.wake) D.sleep.dur = sleepDur(D.sleep); return D; }
const sbMergeDay = (a, b, asks) => sbFix(sbMerge(JSON.parse(JSON.stringify(a)), b, '', asks));
function sbSetPath(o, p, v) { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach(k => { x = x[k] = x[k] || {}; }); x[ks[ks.length - 1]] = v; }
/* Abgerufene Tage übernehmen. Rückgabe: ob sich lokal etwas geändert hat. */
function sbApply(st, days, meta, full) {
  let ch = false; st.ask = st.ask || {};
  const put = (d, v) => { if (sbStab(sbNz(DB.days[d])) !== sbStab(v)) ch = true; if (v === undefined) delete DB.days[d]; else DB.days[d] = v; };
  days.forEach(x => {
    const d = x.d, loc = sbNz(DB.days[d]), rem = x.del ? undefined : sbNz(x.data), dirty = sbHash(loc) !== (st.h[d] || 'none');
    if (!full && x.u === st.u[d]) return;            // diese Fassung kennt das Gerät schon (Überlappung beim Abruf)
    if (!dirty || sbStab(loc) === sbStab(rem) || loc === undefined) {   // hier unverändert, gleich, oder hier gelöscht und dort geändert → Serverfassung
      put(d, rem); st.u[d] = x.u; st.h[d] = sbHash(rem); delete st.ask[d]; return;
    }
    st.u[d] = x.u;                                    // Stand merken, damit das Senden danach nicht als Konflikt gilt
    if (rem === undefined) return;                    // dort gelöscht, hier geändert → hier behalten
    const asks = [], m = sbMergeDay(loc, rem, asks);
    if (asks.length) { st.ask[d] = { u: x.u, rem }; return; }
    put(d, m);                                        // bleibt „geändert“ und wird zusammengeführt gesendet
  });
  ['cfg', 'weeks'].forEach(k => {
    const x = meta[k]; if (!x || !x.data) return;
    const dirty = sbHash(DB[k]) !== st.mh[k];
    if (!dirty || sbStab(DB[k]) === sbStab(x.data)) {
      const v = k === 'cfg' ? norm({ v: 1, days: {}, weeks: {}, cfg: x.data }).cfg : x.data;
      if (sbStab(DB[k]) !== sbStab(v)) ch = true;
      DB[k] = v; st.mh[k] = sbHash(x.data);
    } else if (k === 'weeks') { DB.weeks = Object.assign({}, x.data, DB.weeks); ch = true; }   // Wochen vereinigen, bei gleicher Woche gilt dieses Gerät
    st.mu[k] = x.u;                                   // Einstellungen: bei beidseitiger Änderung gilt dieses Gerät
  });
  return ch;
}
function sbCollect(st, force) {
  const days = [], hs = {}, dels = [], ask = st.ask || {};
  new Set([...Object.keys(DB.days), ...Object.keys(st.h)]).forEach(d => {
    if (ask[d]) return;
    const D = sbNz(DB.days[d]), h = sbHash(D);
    if (h === (st.h[d] || 'none')) return;
    if (D) days.push({ d, data: D, base: st.u[d] || null }); else { days.push({ d, del: true, base: st.u[d] || null }); dels.push(d); }
    hs[d] = h;
  });
  let send = days;
  if (dels.length > 3 && !force) { st.delHold = dels.sort(); send = days.filter(x => !x.del); } else delete st.delHold;
  send = send.slice(0, 200);
  const meta = {}, mhs = {};
  if (!st.delHold) ['cfg', 'weeks'].forEach(k => { const h = sbHash(DB[k]); if (h !== st.mh[k]) { meta[k] = { data: DB[k], base: st.mu[k] || null }; mhs[k] = h; } });
  let hint = null; try { hint = widgetHint(); } catch (e) { }
  if (hint) { const hh = sbHash(Object.assign({}, hint, { at: 0 })); if (hh !== st.mh.hint) { meta.hint = { data: hint }; mhs.hint = hh; } }
  if (!send.length && !Object.keys(meta).length) return null;
  return { days: send, meta, hs, mhs };
}
async function sbRun(opts = {}) {
  let st = sbSt(); if (!st || !navigator.onLine) return;
  if (SB.busy) { SB.again = true; return; }
  SB.busy = true; let changed = false;
  const held = (st.delHold || []).length;
  try {
    st.u = st.u || {}; st.h = st.h || {}; st.mu = st.mu || {}; st.mh = st.mh || {};
    const since = opts.full || !st.since ? null : new Date(new Date(st.since).getTime() - 60000).toISOString();
    const r = await sbRpc('tr_pull', { p_code: st.code, p_since: since });
    changed = sbApply(st, r.days || [], r.meta || {}, opts.full);
    await hlFetch(st, since);
    changed = hlFill() || changed;
    st.since = r.now;
    for (let i = 0; i < 10; i++) {
      const pay = sbCollect(st, opts.force); if (!pay) break;
      const res = await sbRpc('tr_push', { p_code: st.code, p_days: pay.days, p_meta: pay.meta, p_force: !!opts.force });
      (res.ok || []).forEach(o => { st.u[o.d] = o.u; st.h[o.d] = pay.hs[o.d]; });
      Object.entries(res.meta_ok || {}).forEach(([k, u]) => { st.mu[k] = u; st.mh[k] = pay.mhs[k]; });
      const conf = res.conflicts || [], mconf = res.meta_conflicts || {};
      if (conf.length || Object.keys(mconf).length) changed = sbApply(st, conf, mconf) || changed;
      else if (pay.days.length < 200) break;
    }
    st.last = Date.now(); delete st.err;
  } catch (e) { st.err = String(e.message || e); }
  finally {
    if (sbSt()) sbSave(st);   // nicht wieder anlegen, wenn in der Zwischenzeit getrennt wurde
    SB.busy = false;
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } }
    const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA)$/.test(a.tagName);
    if ((changed || opts.ui || (st.delHold || []).length !== held) && $('#sheet').hidden && !typing) render();
    if ((st.delHold || []).length && !held) toast('Gelöschte Tage wurden online noch nicht gelöscht, siehe Einstellungen');
    if (SB.again) { SB.again = false; sbSoon(800); }
    syncDaily();
  }
}
function sbSoon(ms = 3000) { if (!sbSt()) return; clearTimeout(SB.timer); SB.timer = setTimeout(() => sbRun(), ms); }
const sbAskDays = () => { const st = sbSt(); return st && st.ask ? Object.keys(st.ask).sort() : []; };
/* Widersprüche je Tag neu berechnen (der Tag kann sich hier inzwischen geändert haben) */
function sbAsks(d) { const st = sbSt(), x = st && st.ask && st.ask[d]; if (!x) return []; const asks = []; sbMergeDay(sbNz(DB.days[d]) || {}, x.rem, asks); return asks; }
function sbLabel(p) {
  const L = { 'sleep.bed': 'Ins Bett', 'sleep.wake': 'Aufgewacht', 'sleep.score': 'Schlafscore', 'sleep.rhr': 'Ruhepuls', 'sleep.q': 'Erholung', 'sleep.deep': 'Tiefschlaf (min)', 'sleep.rem': 'REM (min)', 'sleep.light': 'Leichtschlaf (min)', 'sleep.awake': 'Wach (min)', note: 'Tagesnotiz', ci: 'Check-in', 'mood.note': 'Notiz zur Stimmung', 'mood.kopf': 'Kopfschmerzen', 'mood.qa': 'Frage des Tages', 'did.note': 'Gemacht · Notiz', 'did.h.uni': 'Uni-Zeit', 'did.h.arbeit': 'Arbeitszeit', 'sup.kr': 'Kreatin (g)' };
  if (L[p]) return L[p];
  const [s, k] = p.split('.');
  if (s === 'habits') { const h = DB.cfg.habits.find(x => x.id === k); return h ? h.name : 'Gewohnheit'; }
  if (s === 'ev') { if (typeof EV !== 'undefined' && EV[k]) return EV[k][0]; const j = JA.find(x => x[0] === k); if (j) return j[1]; }
  if (s === 'sup') { const j = SUP.find(x => x[0] === k); if (j) return j[1]; }
  return ({ sleep: 'Schlaf', mood: 'Stimmung', did: 'Gemacht', ev: 'Tag', sup: 'Supplemente' }[s] || s) + (k ? ' · ' + k : '');
}
const sbVal = v => v === undefined || v === null || v === '' ? '–' : Array.isArray(v) ? v.map(sbVal).join(', ') : typeof v === 'object' ? (v.a || v.name || '…') : v === true ? 'ja' : String(v);
function sbAskSheet() {
  const ds = sbAskDays(); if (!ds.length) return '<h3>Alles abgeglichen</h3><div class="row ci-nav"><button class="btn pri grow" data-act="sclose">Schließen</button></div>';
  const P = S.sbPick = S.sbPick || {};
  return `<h3>Auf zwei Geräten verschieden eingetragen</h3><p class="mut">Tippe jeweils an, welcher Wert stimmt.</p>` + ds.map(d => {
    const lab = parse(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    return `<div class="lbl">${lab}</div>` + sbAsks(d).map(q => { const cur = (P[d] || {})[q.p];
      return `<div class="sbq"><div>${esc(sbLabel(q.p))}</div><div class="chips">${[['a', 'Dieses Gerät', q.a], ['b', 'Anderes Gerät', q.b]].map(([v, t, x]) => `<button class="chip ${cur === v ? 'on' : ''}" data-act="sbpick" data-d="${d}" data-p="${esc(q.p)}" data-v="${v}" aria-pressed="${cur === v}"><span>${t}: ${esc(sbVal(x))}</span>${cur === v ? gl('check', 'chk') : ''}</button>`).join('')}</div></div>`; }).join('');
  }).join('') + '<div class="row ci-nav"><button class="btn pri grow" data-act="sbresolve">Übernehmen</button><button class="btn" data-act="sclose">Später</button></div>';
}
function sbResolve() {
  const st = sbSt(); if (!st || !st.ask) return true;
  const P = S.sbPick || {}, ds = Object.keys(st.ask);
  if (ds.some(d => sbAsks(d).some(q => !(P[d] || {})[q.p]))) { toast('Bitte bei jedem Punkt einen Wert wählen'); return false; }
  ds.forEach(d => {
    const x = st.ask[d], asks = [], m = sbMergeDay(sbNz(DB.days[d]) || {}, x.rem, asks);
    asks.forEach(q => { if ((P[d] || {})[q.p] === 'b') sbSetPath(m, q.p, q.b); });
    DB.days[d] = sbFix(m); st.u[d] = x.u; delete st.ask[d];
  });
  sbSave(st); S.sbPick = {}; save(); return true;
}
/* ---------- Apple Health (4.1): Daten vom Kurzbefehl „Tracker Health“ über Supabase (tracker_health) ----------
   tracker-health (nur auf dem Gerät) = {d: data}. data: sleep als Zeilen „Wert;Start;Ende“, rhr, hrv, steps.
   Übernommen wird nur in leere Felder; was übernommen wurde, steht im Tag unter hlf (damit es nicht wiederkommt, wenn du es löschst). */
const HL_LS = 'tracker-health', HL_SC = 'Tracker Health';
const hlAll = () => { try { return JSON.parse(localStorage.getItem(HL_LS)) || {}; } catch (e) { return {}; } };
const hlStore = o => { try { localStorage.setItem(HL_LS, JSON.stringify(o)); } catch (e) { } };
function hlDate(s) {   // ISO 8601 oder deutsch „26.11.2026, 07:12“
  s = String(s || '').trim(); let t = Date.parse(s); if (!isNaN(t)) return new Date(t);
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})/.exec(s);
  return m ? new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), m[2] - 1, +m[1], +m[4], +m[5]) : null;
}
const hlLines = txt => String(txt || '').split(/\r?\n/).map(l => l.split(';')).filter(p => p.length >= 3).map(p => ({ v: p[0].trim(), s: hlDate(p[1]), e: hlDate(p[2]) })).filter(x => x.s && x.e && x.e > x.s);
const hlKind = v => { v = v.toLowerCase(); return /tief|deep/.test(v) ? 'deep' : /rem/.test(v) ? 'rem' : /wach|awake/.test(v) ? 'awake' : /kern|core|leicht|light/.test(v) ? 'light' : /bett|bed/.test(v) ? 'bed' : 'asleep'; };
const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
/* Schlaf der Nacht vor Tag d (Ende zwischen 18 Uhr am Vortag und 14 Uhr) */
function hlSleep(txt, d) {
  const lo = parse(addDays(d, -1)).getTime() + 18 * 3600000, hi = parse(d).getTime() + 14 * 3600000;
  let L = hlLines(txt).filter(x => x.e.getTime() > lo && x.e.getTime() <= hi).map(x => Object.assign(x, { k: hlKind(x.v) }));
  if (L.some(x => ['deep', 'rem', 'light'].includes(x.k))) L = L.filter(x => x.k !== 'asleep' && x.k !== 'bed');
  const sl = L.filter(x => x.k !== 'awake' && x.k !== 'bed'); if (!sl.length) return null;
  const b = new Date(Math.min(...sl.map(x => x.s))), w = new Date(Math.max(...sl.map(x => x.e)));
  const r = { bed: hm(b), wake: hm(w) }, sum = {};
  L.filter(x => x.s >= b && x.e <= w || x.k !== 'awake').forEach(x => { sum[x.k] = (sum[x.k] || 0) + (x.e - x.s) / 60000; });
  ['deep', 'rem', 'light', 'awake'].forEach(k => { if (sum[k]) r[k] = Math.round(sum[k]); });
  return r;
}
/* Leere Felder der letzten 14 Tage aus den Health-Daten füllen. Rückgabe: ob sich etwas geändert hat. */
function hlFill() {
  const A = hlAll(), from = addDays(todayStr(), -14); let ch = false;
  Object.keys(A).filter(d => d >= from && d <= todayStr()).forEach(d => {
    const x = A[d] || {}, D = DB.days[d] || {}, f = D.hlf || [], add = k => { const T = day(d, true); T.hlf = [...(T.hlf || []), k]; ch = true; return T; };
    if (x.sleep && !f.includes('s')) {
      const s = hlSleep(x.sleep, d), sl = D.sleep || {};
      if (s && !sl.bed && !sl.wake) { const T = add('s'); T.sleep = Object.assign(T.sleep || {}, s, { src: 'uhr' }); T.sleep.dur = sleepDur(T.sleep); }
    }
    const num = v => { const n = parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
    if (num(x.rhr) && !f.includes('r') && !(D.sleep || {}).rhr) { add('r'); sec(d, 'sleep').rhr = Math.round(num(x.rhr)); }
    if (num(x.hrv) && !f.includes('v') && !(D.sleep || {}).hrv) { add('v'); sec(d, 'sleep').hrv = Math.round(num(x.hrv)); }
    if (num(x.steps) && !f.includes('st') && !D.steps) { const T = add('st'); T.steps = Math.round(num(x.steps)); }
  });
  return ch;
}
async function hlFetch(st, since) {
  try {
    const r = await sbRpc('tr_health_get', { p_code: st.code, p_since: since });
    if (!Array.isArray(r) || !r.length) return false;
    const A = hlAll(); r.forEach(x => { A[x.d] = x.data; }); hlStore(A);
    return true;
  } catch (e) { return false; }   // SQL noch nicht ausgeführt o. Ä. – Sync läuft trotzdem
}
const hlToday = () => !!hlAll()[todayStr()];
function hlRun() { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(HL_SC); }

/* ---------- Mitteilungen (4.2): Web-Push über Supabase (Tabelle tracker_push, Edge Function tracker-push) ----------
   tracker-push (nur auf dem Gerät) = {on, ep}. Zeiten: 6:30 und 9:00, beide nur, solange heute keine Uhrdaten da sind (Server rechnet in Europe/Berlin). */
const PU_LS = 'tracker-push', PU_FN = SB_URL + '/functions/v1/tracker-push';
const puSt = () => { try { return JSON.parse(localStorage.getItem(PU_LS)) || {}; } catch (e) { return {}; } };
const puSave = o => { try { if (o) localStorage.setItem(PU_LS, JSON.stringify(o)); else localStorage.removeItem(PU_LS); } catch (e) { } };
const puOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const puHome = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function puFn(body) {
  return fetch(PU_FN, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.text().then(t => { let j = {}; try { j = JSON.parse(t); } catch (e) { } if (!r.ok || j.ok === false) throw new Error(j.error || j.message || 'HTTP ' + r.status); return j; }));
}
const b64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(r, c => c.charCodeAt(0)); };
async function puSub(st, key) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key || (await puFn({ mode: 'key' })).key) });
  await sbRpc('tr_push_sub', { p_code: st.code, p_sub: sub.toJSON() });
  puSave({ on: 1, ep: sub.endpoint });
}
async function puOn() {
  const st = sbSt(); if (!st) return;
  if (!puOk() || !puHome()) { S.puMsg = 'Mitteilungen gehen nur, wenn du den Tracker vom Home-Bildschirm öffnest.'; return; }
  const perm = await Notification.requestPermission();   // muss direkt im Tippen passieren (iOS)
  if (perm !== 'granted') { S.puMsg = 'Mitteilungen sind nicht erlaubt. Erlauben kannst du sie in den iPhone-Einstellungen → Mitteilungen → Tracker.'; return; }
  await puSub(st);
  S.puMsg = 'Eingeschaltet. Mit „Test senden“ kannst du es ausprobieren.';
}
async function puOff(quiet) {
  const st = sbSt(), ep = puSt().ep;
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { }
  if (st && ep) await sbRpc('tr_push_unsub', { p_code: st.code, p_endpoint: ep }).catch(() => { });
  puSave(null); if (!quiet) S.puMsg = 'Ausgeschaltet.';
}
/* Beim Start: Abo noch da? Hat sich die Adresse geändert, neu melden. */
async function puCheck() {
  const p = puSt(), st = sbSt(); if (!p.on || !st || !puOk()) return;
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (!sub && Notification.permission === 'granted') await puSub(st);
    else if (!sub) { puSave(null); render(); }
    else if (sub.endpoint !== p.ep) await puSub(st);
  } catch (e) { }
}
function puSection() {
  const on = puSt().on;
  return `<details class="sub" data-k="s-Mitteilungen" ${S.puOpen ? 'open' : ''}><summary>Mitteilungen</summary>
    <small class="mut">Um 6:30 Uhr und 9:00 Uhr, nur wenn Uhrdaten fehlen.</small>
    ${on ? `<div class="kv"><span>Status</span><span>Eingeschaltet</span></div>
      <div class="row"><button class="btn grow" data-act="putest">Test senden</button><button class="btn grow" data-act="puoff">Ausschalten</button></div>`
    : `<button class="btn pri" data-act="puon">Mitteilungen einschalten</button>`}
    ${S.puMsg ? `<small class="hint">${esc(S.puMsg)}</small>` : ''}</details>`;
}
/* Tabellen-Backup nur noch einmal am Tag: beim ersten Öffnen ab 4 Uhr (oder wenn noch etwas wartet). */
function syncDaily() {
  const c = syncCfg(); if (!c.url || !c.key) return;
  const now = new Date(); if (now.getHours() < 4) return;
  const b = new Date(now); b.setHours(4, 0, 0, 0);
  if ((c.last || 0) < b.getTime() || c.pending) syncNow(false);
}
/* Stimmung: mehrere Einträge pro Tag in mood.log [{id,t,v}]; mood.v ist der Tagesschnitt (für Verlauf und Muster). Ältere Tage haben nur mood.v. */
const moodLog = m => !m ? [] : m.log ? m.log : m.v ? [{ id: 'alt', t: '', v: m.v }] : [];
const moodSorted = m => moodLog(m).slice().sort((a, b) => (a.t || '').localeCompare(b.t || ''));
function moodSync(m) { const l = m.log || []; if (l.length) m.v = Math.round(avg(l.map(x => x.v)) * 10) / 10; else { delete m.v; delete m.log; } }
function moodAct(m) { const a = S.ma; if (!a || a.d !== S.date || Date.now() - a.at > 6e5) return null; return moodLog(m).find(x => x.id === a.id) || null; }
const day = (d, create) => DB.days[d] || (create ? (DB.days[d] = {}) : {});
const moodTxt = x => `${MOOD_N[Math.round(x.v) - 1]} · ${f1(x.v)}${x.e ? ' · ' + EN_N[Math.round(x.e) - 1] : ''}`;
function tagChips(m) {
  const tg = m.tags || [], chk = gl('check', 'chk'), extra = tg.filter(t => !TAGS.includes(t));
  const chip = t => { const on = tg.includes(t); return `<button class="chip ${on ? 'on' : ''}" data-act="tag" data-v="${esc(t)}" aria-pressed="${on}"><span>${esc(t)}</span>${on ? chk : ''}</button>`; };
  return TAG_G.map(([l, a], i) => `<div class="lbl">${l}</div><div class="chips">${(i ? a : a.concat(extra)).map(chip).join('')}</div>${i === 2 && tg.includes('Kopfschmerzen') ? `<div class="evbox"><div class="evtop"><b>Kopfschmerzen</b><span class="evlab">${KOPF_N[(m.kopf || 3) - 1]}</span></div><input type="range" class="mslider evs" min="1" max="5" step="1" value="${m.kopf || 3}" data-rng="mood.kopf" aria-label="Kopfschmerzen von ganz leicht bis sehr stark"></div>` : ''}`).join('');
}
function moodField(mlog, mact) {
  const pts = mlog.map(x => `<i class="mpt ${mact && mact.id === x.id ? 'act' : ''}" style="left:${(x.v - 1) / 4 * 100}%;top:${(5 - (x.e || 3)) / 4 * 100}%;--c:var(--f${Math.round(x.v)})"></i>`).join('');
  return `<div class="mfield" id="mfield" aria-label="Stimmung und Energie: Finger auflegen, bewegen, loslassen trägt ein"><span class="ax t">voller Energie</span><span class="ax b">erschöpft</span><span class="ax l">schlecht</span><span class="ax r">gut</span>${pts}<i class="mpt live" hidden></i></div>`;
}
function sec(d, k) { const x = day(d, true); return x[k] || (x[k] = k === 'coffee' || k === 'sport' ? [] : {}); }

/* ---------- Zustand ---------- */
const S = { dk: {}, fold: {}, slf: {}, tab: 'heute', date: todayStr(), week: weekStart(todayStr()), open: {}, vtab: 'ueb', range: 30, year: new Date().getFullYear(), sp: null, qi: {}, impMsg: '' };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600);
}
function applyTheme() {
  const t = DB.cfg.theme;
  const th = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = th;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'light' ? '#FBF5EC' : '#1E191B';
}

/* ---------- Auswertungs-Helfer ---------- */
const sleepDur = s => {
  if (!s) return null;
  if (s.bed && s.wake) { let d = tmin(s.wake) - tmin(s.bed); if (d <= 0) d += 1440; return d; }
  return s.dur ?? null;
};
const coffeeMg = d => (day(d).coffee || []).reduce((a, c) => a + (c.mg || 0), 0);
const isCommute = s => !!(s.c || s.name === 'Pendelweg');
const sportN = d => (day(d).sport || []).length;
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
  const hl = (DB.cfg.halfLife || 6) * 60, at = dn(d) * 1440 + minute; let sum = 0;
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
  const isT = d === todayStr(), nowM = tmin(nowT()), bd = { m: 1320 }, atBed = caffeineAt(d, bd.m);
  const W = 326, H = 168, pl = 36, pr = 8, pt = 28, pbm = 28, mx = Math.max(60, peak * 1.15), x0 = 360, x1 = 1800;
  const X = t => pl + (t - x0) / (x1 - x0) * (W - pl - pr), Y = v => pt + (H - pt - pbm) * (1 - v / mx);
  let line = ''; for (let t = x0; t <= x1; t += 15) line += `${t === x0 ? 'M' : 'L'}${X(t).toFixed(1)} ${Y(caffeineAt(d, t)).toFixed(1)}`;
  let g = `<svg class="cgraph" viewBox="0 0 ${W} ${H}" width="100%" data-d="${d}" data-w="${W}" data-pl="${pl}" data-pr="${pr}" data-pt="${pt}" data-ph="${H - pt - pbm}" data-mx="${mx}" data-bed="${Math.round(atBed)}" role="img" aria-label="Restkoffein im Tagesverlauf">
    <defs><linearGradient id="cgf" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#E9B869"/><stop offset="1" stop-color="#D98A5F"/></linearGradient><linearGradient id="cgm" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient><mask id="cgk"><rect width="${W}" height="${H}" fill="url(#cgm)"/></mask></defs>`;
  const y50 = Y(50), s50 = peak > 50;   // Linie nur, wenn die Kurve über 50 mg kommt. Orientierungslinie: unter etwa 50 mg ist Einschlafen für die meisten unkritisch
  [0, mx / 2].filter(v => !v || !s50 || Math.abs(Y(v) - y50) > 20).forEach(v => g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--inset-2)" stroke-width="1.5" ${v ? 'stroke-dasharray="2 5" stroke-linecap="round"' : ''}/><text x="${pl - 6}" y="${Y(v) + 5}" text-anchor="end">${Math.round(v)}</text>`);
  g += `<path d="${line}L${X(x1)} ${Y(0)}L${X(x0)} ${Y(0)}Z" fill="url(#cgf)" mask="url(#cgk)"/><path d="${line}" fill="none" stroke="url(#cgf)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (s50) g += `<line class="l50" x1="${pl}" x2="${W - pr}" y1="${y50}" y2="${y50}" stroke="var(--acc)" stroke-width="1" stroke-dasharray="5 4"/><text x="${pl - 6}" y="${y50 + 5}" text-anchor="end" style="fill:var(--acc);font-weight:700">50</text>`;
  [[360, '6'], [720, '12'], [1080, '18'], [1440, '0'], [1800, '6']].forEach(([t, l], i) => g += `<text x="${X(t)}" y="${H - 6}" text-anchor="${i === 4 ? 'end' : 'middle'}">${l}</text>`);
  if (isT && nowM >= x0) g += `<line x1="${X(nowM)}" x2="${X(nowM)}" y1="${pt}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round"/>`;
  if (bd.m <= x1) g += `<line x1="${X(bd.m)}" x2="${X(bd.m)}" y1="${pt}" y2="${Y(0)}" stroke="var(--t4)" stroke-width="2" stroke-linecap="round"/><text x="${X(bd.m)}" y="${pt - 8}" text-anchor="middle" style="fill:var(--acc);font-weight:700">22</text>`;
  g += `<g id="cg-g" display="none"><line id="cg-l" y1="${pt}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="1.5"/><circle id="cg-c" r="7" fill="var(--t3)" stroke="var(--card)" stroke-width="3"/></g></svg>`;
  return `<div class="sub"><div class="kv"><span>${isT ? 'Jetzt noch im Körper' : 'Höchststand am Tag'}</span><b>≈ ${Math.round(isT ? caffeineAt(d, nowM) : peak)} mg</b></div>
    <div class="kv"><span id="cg-lab">Um 22 Uhr noch im Körper</span><b id="cg-val">≈ ${Math.round(atBed)} mg</b></div>${g}
    ${DB.cfg.seen.cg ? '' : `<small class="hint">Kurve gedrückt halten und ziehen: Restkoffein zu jeder Uhrzeit. ${s50 ? 'Gestrichelte Linie: 50 mg, darunter stört es den Schlaf bei den meisten kaum. ' : ''}Vereinfachtes Modell mit ${DB.cfg.halfLife || 6} h Halbwertszeit (einstellbar). Gilt im Schnitt, bei dir kann es abweichen.</small>`}</div>`;
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
  document.querySelectorAll('#app details[data-k]').forEach(d => { if (S.dk[d.dataset.k]) d.open = true; });
  $('#tabs').innerHTML = [['heute', 'tab_heute', 'Heute'], ['verlauf', 'tab_verlauf', 'Verlauf'], ['set', 'tab_set', 'Einstellungen']]
    .map(([k, i, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('');
  if (S.tab === 'verlauf' && S.vtab === 'sport') { const h = $('.hscroll'); if (h && S.year === new Date().getFullYear()) h.scrollLeft = h.scrollWidth * (new Date().getMonth() / 12) - 80; }
}

function chips(items, cur, act, extra = '') {
  return `<div class="chips">${items.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${String(cur) === String(v)}" ${extra}><span>${l}</span>${String(cur) === String(v) ? gl('check', 'chk') : ''}</button>`).join('')}</div>`;
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
  const hOn = h => !!(D.habits || {})[h.id];
  const chk = gl('check', 'chk'), mark = n => n > 1 ? `<b class="cnt">${n}×</b>` : n ? chk : '';
  const arrow = open => gl(open ? 'up' : 'down');
  const habs = h => `<button class="hab ${h.type} ${hOn(h) ? 'on on-g' : ''}" data-act="hab" data-id="${h.id}" data-lp="habits|${h.id}" aria-pressed="${hOn(h)}">${ic(itIc('habits', h))}<span>${esc(h.name)}<small>${streakTxt(h, d)}</small></span>${hOn(h) ? chk : ''}</button>`;
  const hgrp = type => {
    const all = DB.cfg.habits.filter(h => h.type === type), vis = all.filter(h => !h.hid || hOn(h)), hid = all.filter(h => h.hid && !hOn(h)), k = 'hh' + type;
    return `${vis.length ? `<div class="hgrid">${vis.map(habs).join('')}</div>` : ''}<button class="morehid" data-act="tog" data-k="${k}">${S.open[k] ? 'weniger' : 'weitere' + (hid.length ? ' (' + hid.length + ')' : '')}${arrow(S.open[k])}</button>
      ${S.open[k] ? `<div class="hgrid">${hid.map(habs).join('')}<button class="hab newh" data-act="edit" data-kind="habits" data-id="_new" data-type="${type}">${gl('plus')}<span>Neu</span></button></div>` : ''}`;
  };
  const cVis = DB.cfg.coffee.filter(c => !c.hid), cHid = DB.cfg.coffee.filter(c => c.hid), sVis = DB.cfg.sports.filter(x => !x.hid), sHid = DB.cfg.sports.filter(x => x.hid);
  const cr = rankItems(cVis, 'coffee', d), sr = rankItems(sVis, 'sport', d);
  const when = isToday ? 'Oft um diese Zeit' : 'Oft an diesem Wochentag';
  const cN = c => cof.filter(e => e.k === c.id).length, sN = x => sp.filter(e => e.name === x.name).length;
  const cChip = c => { const n = cN(c); return `<button class="cti ${n ? 'on on-g' : ''} ${c.hid ? 'hidc' : ''}" data-act="cadd" data-id="${c.id}" data-lp="coffee|${c.id}">${ic(itIc('coffee', c))}<span>${esc(c.name)} <small>${c.est ? '≈' : ''}${c.mg}</small></span>${n ? mark(n) : ''}</button>`; };
  const sChip = x => { const n = sN(x); return `<button class="chip ${n ? 'on on-g' : ''} ${x.hid ? 'hidc' : ''}" data-act="sadd" data-id="${x.id}" data-lp="sports|${x.id}">${ic(itIc('sports', x))}<span>${esc(x.name)}</span>${x.km ? `<small>≈${esc(x.km)} km</small>` : ''}${mark(n)}</button>`; };
  const newChip = kind => `<button class="chip new" data-act="edit" data-kind="${kind}" data-id="_new">${gl('plus')}<span>Neu</span></button>`;
  const hidBlock = (k, items, chip, cls = 'chips') => items.length ? `<button class="morehid" data-act="tog" data-k="${k}">${S.open[k] ? 'weniger' : `weitere (${items.length})`}${arrow(S.open[k])}</button>${S.open[k] ? `<div class="${cls}">${items.map(x => chip(x)).join('')}</div>` : ''}` : '';
  const mlog = moodSorted(m), mact = moodAct(m), mv = mact ? mact.v : m.v, mi = mv ? Math.round(mv) : 0;
  const mlab = mact ? `${mact.t ? mact.t + ' Uhr · ' : ''}${moodTxt(mact)}` : mlog.length > 1 ? `Ø ${MOOD_N[mi - 1]} · ${f1(mv)}` : mlog.length ? moodTxt(mlog[0]) : 'Finger aufs Feld legen';
  const srcs = [[addDays(d, -1), isToday ? 'Wie gestern' : 'Wie am Vortag'], [addDays(d, -7), 'Wie letzten ' + parse(d).toLocaleDateString('de-DE', { weekday: 'short' })]];
  const copyBtns = kind => { if ((D[kind] || []).length) return ''; const b = srcs.filter(([x]) => (day(x)[kind] || []).length).map(([x, l]) => `<button class="chip" data-act="copyday" data-kind="${kind}" data-src="${x}">${gl('redo')}<span>${l}</span><small>${day(x)[kind].length}</small></button>`).join(''); return b ? `<div class="chips sub">${b}</div>` : ''; };
  const posVis = DB.cfg.habits.filter(h => h.type === 'pos' && !h.hid), posDone = posVis.filter(hOn).length;
  const dot = '<i class="dot"></i>', hintLP = t => DB.cfg.seen.lp ? '' : `<small class="hint">${t}</small>`;
  const head = `<header class="dhead day"><div class="row dnav">${isToday ? '<span>Heute</span>' : `<a href="#" data-act="dtoday">Zu heute</a>`}<button data-act="dprev" aria-label="Tag zurück">${gl('left')}</button><button data-act="dnext" aria-label="Tag vor" ${isToday ? 'disabled' : ''}>${gl('right')}</button><span class="grow"></span>${wxBtn(d)}</div><h1>${esc(label)}</h1></header>`, P = {};
  wxLoad();
  P.mood = `
    <div class="moodbox ${mv ? '' : 'unset'} ${mlog.length && !mact ? 'idle' : ''}"><div class="moodtop"><span class="moodemo" id="mood-e">${face(mv ? mi : 3)}</span><span class="grow mlab" id="mood-l">${mlab}</span></div>
      ${moodField(mlog, mact)}</div>
    ${mlog.length ? `<div class="mlog">${mlog.map(x => { const on = mact && mact.id === x.id, i = Math.round(x.v); return `<div class="ent ${on ? 'act' : ''}"><button class="timebtn t" data-act="tpick" data-t="mood" data-id="${x.id}">${x.t || '–:–'}</button><button class="grow msel" data-act="msel" data-id="${x.id}" aria-pressed="${!!on}">${face(i, 'sm')}<span>${moodTxt(x)}</span></button><button class="x" data-act="mdel" data-id="${x.id}" aria-label="Stimmung löschen">${gl('close')}</button></div>`; }).join('')}</div>
      ${mact ? `<div class="chips sub"><button class="chip new" data-act="mnew">${gl('plus')}<span>Weitere Stimmung</span></button></div>` : DB.cfg.seen.mood ? '' : `<small class="hint">Aufs Feld tippen: weitere Stimmung. Eintrag antippen: ändern.</small>`}` : ''}
    ${tagChips(m)}
    <button class="more" data-act="tog" data-k="mood" aria-expanded="${!!moodOpen}"><span>${moodOpen ? 'Weniger' : 'Mehr dazu: Frage, Notiz'}${!moodOpen && (qa.a || m.note) ? dot : ''}</span>${arrow(moodOpen)}</button>
    ${moodOpen ? `
      <div class="lbl row sb"><span>${esc(q)}</span><button data-act="qnext">andere ${gl('redo')}</button></div>
      <textarea data-f="mood.qa" data-q="${esc(q)}" placeholder="Kurz antworten …">${esc(qa.a || '')}</textarea>
      <div class="lbl">Freie Notiz</div>
      <textarea data-f="mood.note" placeholder="Was dir sonst noch durch den Kopf geht …">${esc(m.note || '')}</textarea>` : ''}
`;
  P.sleep = `
    <div class="row slrow"><div class="tfield">Ins Bett<button class="timebtn" data-act="tpick" data-t="sleep.bed">${sl.bed || '–:–'}</button></div>
    <div class="tfield">Aufgewacht<button class="timebtn" data-act="tpick" data-t="sleep.wake">${sl.wake || '–:–'}</button></div>
    <div class="grow sldur"><small>${sl.score ? 'Uhr-Score ' + sl.score : sl.src === 'uhr' ? 'von der Uhr' : ''}</small><div class="big">${fmtDur(dur)}</div></div></div>
    ${sl.deep || sl.rem || sl.rhr || sl.hrv || D.steps ? `<small class="mut hlrow">${[sl.deep ? 'Tief ' + fmtDur(sl.deep).replace(' h', '') : '', sl.rem ? 'REM ' + fmtDur(sl.rem).replace(' h', '') : '', sl.rhr ? 'Ruhepuls ' + sl.rhr : '', sl.hrv ? 'HRV ' + sl.hrv + ' ms' : '', D.steps ? D.steps.toLocaleString('de-DE') + ' Schritte' : ''].filter(Boolean).map(x => x.replace(/ /g, '\u00a0')).join(' · ')}</small>` : ''}
    ${sl.q || sl.fall || sl.note ? `<small class="mut slsum">${[sl.q ? REST_N[sl.q - 1] : '', sl.fall ? FALL_N[sl.fall] : ''].filter(Boolean).join(' · ')}${sl.note ? `<br>${esc(sl.note)}` : ''}</small>` : ''}
    <button class="more" data-act="moopen"><span>${D.mo ? 'Morgen-Check-in ändern' : 'Morgen-Check-in'}</span>${D.mo ? gl('check') : gl('right')}</button>
`;
  P.coffee = `
    <div class="bar ${mg > lim ? 'warn' : ''}"><i style="width:${Math.min(100, mg / lim * 100)}%"></i></div>
    <small>${lastC ? 'Letzter Eintrag ' + lastC + ' Uhr' : 'Noch nichts eingetragen'}${mg > lim ? ' · über deinem Limit' : ''}</small>
    ${cr.top.length ? `<div class="lbl">${when}</div><div class="cgrid">${cr.top.map(c => cChip(c)).join('')}</div>` : ''}
    ${copyBtns('coffee')}
    ${cr.top.length ? `<button class="more" data-act="tog" data-k="cmore" aria-expanded="${!!S.open.cmore}"><span>${S.open.cmore ? 'Weniger Getränke' : `Weitere Getränke (${cr.rest.length})`}</span>${arrow(S.open.cmore)}</button>` : ''}
    ${(!cr.top.length || S.open.cmore) ? `<div class="cgrid sub">${cr.rest.map(c => cChip(c)).join('')}<button class="cti new" data-act="edit" data-kind="coffee" data-id="_new">${gl('plus')}<span>Neu</span></button></div>${hidBlock('chid', cHid, cChip, 'cgrid')}${hintLP('Lange drücken: bearbeiten, Größen, verstecken, löschen')}` : ''}
    ${cof.map(c => `<div class="ent"><button class="timebtn t" data-act="tpick" data-t="coffee" data-id="${c.id}">${c.t}</button><span class="grow">${esc(c.name)} <small>${c.est ? '≈' : ''}${c.mg} mg</small></span><button class="x" data-act="cdel" data-id="${c.id}" aria-label="Eintrag löschen">${gl('close')}</button></div>`).join('')}
    ${caffeineBlock(d)}
`;
  P.sport = `
    <div class="chips">${[...sr.top, ...sr.rest].map(x => sChip(x)).join('')}${newChip('sports')}</div>
    ${hidBlock('shid', sHid, sChip)}
    ${copyBtns('sport')}
    ${sp.map(x => `<div class="ent">${ic(sportIc(x))}<span class="grow">${esc(x.name)}${x.t ? ` <small>${x.t} Uhr${x.min ? ' · ' + x.min + ' min' : ''}</small>` : ''}</span><button class="x" data-act="sdel" data-id="${x.id}" aria-label="Eintrag löschen">${gl('close')}</button></div>`).join('')}
    ${hintLP('Antippen fügt hinzu. Lange drücken: bearbeiten, verstecken, löschen')}
`;
  P.habit = `
    <div class="lbl" style="margin-top:0">Positiv</div>${hgrp('pos')}
    <div class="lbl">Automatisch</div><div class="hgrid">${AUTO_H.map(a => autoHab(a, d)).join('')}</div>
    <div class="lbl">Negativ (antippen, wenn es passiert ist)</div>${hgrp('neg')}
    ${hintLP('Lange drücken: bearbeiten, verstecken, löschen')}
`;
  const M = {
    mood: ['Stimmung', '', mlog.length ? (mlog.length > 1 ? 'Ø ' : '') + f1(m.v) + ' · ' + MOOD_N[Math.round(m.v) - 1] : 'offen'],
    sleep: ['Schlaf', `Nacht auf ${isToday ? 'heute' : 'diesen Tag'}`, dur != null ? fmtDur(dur) + (sl.q ? ' · ' + REST_N[sl.q - 1] : '') : 'offen'],
    coffee: ['Koffein', `${mg} / ${lim} mg`, `${mg} / ${lim} mg`],
    sport: ['Sport', sp.length ? sp.length + '×' : '', sp.length ? sp.length + '×' : 'offen'],
    habit: ['Gewohnheiten', posVis.length ? `${posDone} von ${posVis.length}` : '', posVis.length ? `${posDone} von ${posVis.length}` : '']
  };
  if (S.slf[d] == null) S.slf[d] = !!(sl.bed && sl.wake && sl.q);   // Schlaf klappt zu, wenn er beim Öffnen schon vollständig ist
  const folded = k => k === 'sleep' ? (S.fold[d] ?? S.slf[d]) : !!DB.cfg.fold[k];
  const card = k => { const f = folded(k), r = f ? M[k][2] : M[k][1]; return `<section class="card a-${k} ${f ? 'folded' : ''}"><div class="chead" role="button" tabindex="0" data-act="fold" data-k="${k}" aria-expanded="${!f}"><div class="tile on-g">${tile(k)}</div><h3>${M[k][0]}</h3>${r ? `<span class="mut">${r}</span>` : ''}${gl(f ? 'down' : 'up', 'fchev')}</div>${f ? '' : P[k]}</section>`; };
  const hr = new Date().getHours();
  const order = !isToday ? ['mood', 'sleep', 'coffee', 'sport', 'habit'] : hr < 11 ? ['sleep', 'mood', 'coffee', 'sport', 'habit'] : hr < 17 ? ['mood', 'coffee', 'sport', 'habit', 'sleep'] : ['mood', 'habit', 'sport', 'coffee', 'sleep'];
  const wdue = isToday ? wrDue() : null;
  const nAsk = isToday ? sbAskDays().length : 0, hlDue = isToday && hr >= 5 && sbSt() && Object.keys(hlAll()).length && !hlToday(), moDue = isToday && hr >= 4 && hr < 13 && !D.mo;
  const top = (moDue ? `<section class="card hlbig"><h3>Guten Morgen</h3><small class="mut">${hlDue ? 'Erst die Uhrdaten holen, dann kurz den Morgen eintragen.' : 'Wie war die Nacht? Vier kurze Fragen.'}</small>${hlDue ? '<button class="btn pri" data-act="hlrun">Jetzt synchronisieren</button><button class="btn" data-act="moopen">Morgen-Check-in</button>' : '<button class="btn pri" data-act="moopen">Morgen-Check-in starten</button>'}</section>` : hlDue ? `<section class="card hlbig"><h3>Synchronisieren</h3><small class="mut">Schlaf und Werte von der Uhr fehlen für heute.</small><button class="btn pri" data-act="hlrun">Jetzt synchronisieren</button></section>` : '') + (nAsk ? `<section class="card cta"><div class="chead a-mood" role="button" tabindex="0" data-act="sbask"><div class="tile on-g">${tile('mood')}</div><h3>Unterschiede klären<small>${nAsk === 1 ? 'Ein Tag wurde' : nAsk + ' Tage wurden'} auf zwei Geräten verschieden eingetragen</small></h3>${gl('right', 'fchev')}</div></section>` : '') + (wdue ? `<section class="card cta"><div class="chead a-sleep" role="button" tabindex="0" data-act="wropen" data-w="${wdue}"><div class="tile on-g">${tile('sleep')}</div><h3>Wochenrückblick<small>KW ${isoWeek(wdue)} · 3 kurze Schritte</small></h3>${gl('right', 'fchev')}</div></section>` : '')
    + (isToday && hr >= 17 && !D.ci ? `<section class="card cta"><div class="chead a-mood" role="button" tabindex="0" data-act="ciopen"><div class="tile on-g">${tile('mood')}</div><h3>Abend-Check-in<small>7 kurze Schritte, etwa eine Minute</small></h3>${gl('right', 'fchev')}</div></section>` : '');
  const foot = `<section class="card"><h3>Tagesnotiz</h3><textarea data-f="day.note" placeholder="Wie war der Tag insgesamt?">${esc(D.note || '')}</textarea></section>
  <button class="more cilink" data-act="ciopen"><span>${D.ci ? 'Check-in erledigt · nochmal durchgehen' : 'Check-in für diesen Tag starten'}</span>${D.ci ? gl('check') : gl('right')}</button>`;
  return head + top + order.map(card).join('') + foot;
}
/* Automatische Gewohnheiten (4.7): werden aus den Einträgen berechnet, nicht gespeichert. f(d) = true/false/null (null = noch offen oder keine Daten). */
const AUTO_H = [
  { id: 'a_kof', name: 'Koffein\u2011Stopp', i: 'tasse', open: 'ab 14 Uhr', f: d => {
    const D = day(d); if (d !== todayStr() && !Object.keys(D).length) return null;
    if ((D.coffee || []).some(x => x.t && x.t >= '14:00')) return false;
    return d === todayStr() && new Date().getHours() < 14 ? null : true; } },
  ...[['a_22', '22:00', 'Vor 22 Uhr geschlafen'], ['a_23', '23:00', 'Vor 23 Uhr geschlafen'], ['a_mn', '24:00', 'Vor Mitternacht geschlafen']].map(([id, lim, name]) => ({ id, name, i: 'spaet', open: 'noch keine Schlafzeit',
    f: d => { const b = (day(d).sleep || {}).bed; return b ? b >= '18:00' && b <= lim : null; } }))   // Einschlafzeit bis einschließlich Grenze; früher = alle Stufen
];
function autoStreak(a, d) { let x = d, n = 0; if (a.f(x) === null) x = addDays(x, -1); while (a.f(x) === true) { n++; x = addDays(x, -1); } return n; }
function autoHab(a, d) {
  const v = a.f(d), n = autoStreak(a, d);
  const sub = v === null ? a.open + (n ? ` · ${n} ${n === 1 ? 'Tag' : 'Tage'} in Folge` : '') : v ? (n ? `${n} ${n === 1 ? 'Tag' : 'Tage'} in Folge` : '') : 'diesmal nicht';
  return `<div class="hab pos auto ${v ? 'on on-g' : v === null ? 'open' : ''}">${ic(a.i)}<span>${esc(a.name)}<small>${sub}</small></span>${v ? gl('check', 'chk') : ''}</div>`;
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
  [1, 3, 5].forEach(v => s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>${faceIn(v, pl - 17, y(v) - 7, 14)}`);
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
  const cof = dates.map(d => coffeeMg(d) || null), spt = dates.map(d => sportN(d) || null);
  const nz = a => a.filter(v => v != null), ss = sleepStats(dates);
  const rng = `<div class="seg">${[7, 30, 90].map(r => `<button class="${S.range === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} Tage</button>`).join('')}</div>`;
  const hab = DB.cfg.habits.map(h => {
    const tracked = dates.filter(d => Object.keys(day(d)).length); const c = tracked.filter(d => (day(d).habits || {})[h.id]).length;
    const pct = tracked.length ? c / tracked.length : 0; if (h.hid && !c) return '';
    return `<div class="kv"><span class="a-habit">${ic(itIc('habits', h), 'sm')} ${esc(h.name)}</span><span>${c} / ${tracked.length} Tage</span></div><div class="bar" style="margin:2px 0 8px"><i style="width:${pct * 100}%;background:${h.type === 'pos' ? 'var(--pos)' : 'var(--neg)'}"></i></div>`;
  }).join('');
  return rng + `
  <section class="card"><h3>Stimmung <span style="text-transform:none">Ø ${f1(avg(nz(mood)))}</span></h3>${lineChart(dates, mood)}</section>
  <section class="card"><h3>Schlaf (Stunden) <span style="text-transform:none">Ø ${f1(avg(nz(sl)))} h</span></h3>${barChart(dates, sl, { max: 10, band: [7, 9], fmt: v => Math.round(v) })}<small>Grüner Bereich: 7–9 h</small></section>
  <section class="card"><h3>Schlaf-Rhythmus</h3>${ss ? rhythmBody(ss, dates) : '<small>Trag Bett- und Aufwachzeit ein (oder importiere Uhr-Daten). Ab 3 Nächten siehst du hier deinen Rhythmus.</small>'}</section>
  <section class="card"><h3>Koffein (mg) <span style="text-transform:none">Ø ${Math.round(avg(nz(cof)) || 0)} mg</span></h3>${barChart(dates, cof, { limit: DB.cfg.limit, colorFn: v => v > DB.cfg.limit ? 'var(--bad)' : 'var(--acc)' })}</section>
  <section class="card"><h3>Sport (Einheiten) <span style="text-transform:none">${nz(spt).length} Tage · ${nz(spt).reduce((a, b) => a + b, 0)}×</span></h3>${barChart(dates, spt, { colorFn: () => 'var(--pos)' })}</section>
  <section class="card"><h3>Gewohnheiten</h3>${hab || '<small>Noch keine angelegt.</small>'}</section>`;
}
function wstats(dates) {
  const tr = dates.filter(d => Object.keys(day(d)).length), M = dates.map(d => day(d).mood?.v ?? null), moods = M.filter(Boolean);
  const dur = dates.map(d => sleepDur(day(d).sleep)).filter(x => x != null), cof = tr.map(coffeeMg), sp = dates.map(sportN);
  const lasts = dates.map(d => (day(d).coffee || []).map(c => tmin(c.t)).sort((a, b) => b - a)[0]).filter(x => x != null);
  return { tr: tr.length, M, moodAvg: avg(moods), durAvg: avg(dur), cofAvg: cof.length ? avg(cof) : null, over: cof.filter(v => v > DB.cfg.limit).length, lastAvg: avg(lasts),
    sportN: sp.reduce((a, b) => a + b, 0), sportDays: sp.filter(x => x > 0).length, ss: sleepStats(dates) };
}
function vWoche() {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(S.week, i)), prevD = dates.map(d => addDays(d, -7)), today = todayStr();
  const a = wstats(dates), b = wstats(prevD), curW = weekStart(today), fmt = x => parse(x).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const dl = (x, y, unit = '', fx = f1) => x == null || y == null ? '' : ` <small>(${Math.abs(x - y) < .05 ? '±0' : (x > y ? '+' : '−') + fx(Math.abs(x - y))}${unit} zur Vorwoche)</small>`;
  const sleepH = d => { const x = sleepDur(day(d).sleep); return x == null ? '–' : f1(x / 60); };
  const mi = a.M.map((v, i) => v ? [v, i] : null).filter(Boolean), best = mi.length >= 3 ? mi.reduce((p, q) => q[0] > p[0] ? q : p) : null, worst = mi.length >= 3 ? mi.reduce((p, q) => q[0] < p[0] ? q : p) : null;
  const hab = DB.cfg.habits.map(h => { const c = dates.filter(d => (day(d).habits || {})[h.id]).length; if (h.hid && !c) return ''; return `<div class="kv"><span class="a-habit">${ic(itIc('habits', h), 'sm')} ${esc(h.name)}</span><span>${c} / 7 Tage</span></div><div class="bar" style="margin:2px 0 8px"><i style="width:${c / 7 * 100}%;background:${h.type === 'pos' ? 'var(--pos)' : 'var(--neg)'}"></i></div>`; }).join('');
  const nxt = S.week >= curW;
  return `<div class="dhead wk"><button data-act="wprev" aria-label="Woche zurück">${gl('left')}</button><div class="grow"><b>KW ${isoWeek(S.week)}</b><small>${fmt(dates[0])} – ${fmt(dates[6])}${S.week === curW ? ' · diese Woche' : ''}</small></div><button data-act="wnext" aria-label="Woche vor" ${nxt ? 'disabled' : ''}>${gl('right')}</button></div>
  <section class="card"><table class="wkt"><tr><th></th>${dates.map(d => `<th class="${d === today ? 'today' : ''}">${WD[parse(d).getDay()]}<br><small>${parse(d).getDate()}.</small></th>`).join('')}</tr>
    <tr><td>Stimmung</td>${dates.map(d => `<td>${day(d).mood?.v ? face(Math.round(day(d).mood.v), 'sm') : '·'}</td>`).join('')}</tr>
    <tr><td>Schlaf h</td>${dates.map(d => `<td>${sleepH(d)}</td>`).join('')}</tr>
    <tr><td>Koffein mg</td>${dates.map(d => `<td>${coffeeMg(d) || '–'}</td>`).join('')}</tr>
    <tr><td>Sport</td>${dates.map(d => `<td>${sportN(d) ? sportN(d) + '×' : '–'}</td>`).join('')}</tr></table>
    <small>${a.tr} von 7 Tagen mit Einträgen</small></section>
  <section class="card"><h3>Stimmung</h3>${a.moodAvg == null ? '<small>Keine Stimmung eingetragen.</small>' : `<div class="big row">Ø ${f1(a.moodAvg)} ${face(Math.round(a.moodAvg))}</div>${dl(a.moodAvg, b.moodAvg)}
    ${best ? `<div class="kv"><span>Bester Tag</span><span>${WD[parse(dates[best[1]]).getDay()]} ${face(Math.round(best[0]), 'sm')}</span></div><div class="kv"><span>Schwächster Tag</span><span>${WD[parse(dates[worst[1]]).getDay()]} ${face(Math.round(worst[0]), 'sm')}</span></div>` : ''}`}</section>
  <section class="card"><h3>Schlaf</h3>${a.durAvg == null ? '<small>Kein Schlaf eingetragen.</small>' : `<div class="big">Ø ${fmtDur(a.durAvg)}</div>${dl(a.durAvg, b.durAvg, ' min', v => Math.round(v))}`}
    ${a.ss ? `<div class="sub">${rhythmBody(a.ss, dates)}</div>` : '<small>Für den Rhythmus braucht es Bett- und Aufwachzeit an mindestens 3 Nächten.</small>'}</section>
  <section class="card"><h3>Koffein</h3>${a.cofAvg == null ? '<small>Nichts eingetragen.</small>' : `<div class="big">Ø ${Math.round(a.cofAvg)} mg / Tag</div>${dl(a.cofAvg, b.cofAvg, ' mg', v => Math.round(v))}
    <div class="kv"><span>Tage über dem Limit (${DB.cfg.limit} mg)</span><span>${a.over}</span></div>${a.lastAvg != null ? `<div class="kv"><span>Letzter Kaffee im Schnitt</span><span>${clockM(a.lastAvg)} Uhr</span></div>` : ''}`}</section>
  <section class="card"><h3>Sport</h3>${a.sportN ? `<div class="big">${a.sportN} ${a.sportN === 1 ? 'Einheit' : 'Einheiten'}</div>${dl(a.sportN, b.sportN, '', v => Math.round(v))}<div class="kv"><span>Aktive Tage</span><span>${a.sportDays} / 7</span></div>` : '<small>Kein Sport in dieser Woche.</small>'}</section>
  <section class="card"><h3>Gewohnheiten</h3>${hab || '<small>Keine angelegt.</small>'}</section>
  ${(() => { const o = DB.weeks[S.week] || {}, has = o.v || o.best || o.hard || o.plan; return `<section class="card"><h3>Rückblick${o.v ? face(o.v) : ''}</h3>${has ? [['best', 'Schönster Moment'], ['hard', 'Schwierig war'], ['plan', 'Vorsatz für die Woche danach']].filter(([k]) => o[k]).map(([k, l]) => `<div class="note"><small>${l}</small>${esc(o[k])}</div>`).join('') : '<small>Noch kein Rückblick für diese Woche.</small>'}<div class="sub"><button class="btn" data-act="wropen" data-w="${S.week}">${has ? 'Rückblick ändern' : 'Rückblick ausfüllen'}</button></div></section>`; })()}
  <section class="card"><h3>Auswertung mit Claude</h3><button class="btn" data-act="copyweek">Woche für Claude kopieren</button><small class="mut" style="display:block;margin-top:6px">Kopiert deine Daten dieser und der Vorwoche samt Auftrag. Im Chat einfügen, dann bekommst du eine Auswertung.</small></section>`;
}
function vSport() {
  const Y = S.year, jan1 = new Date(Y, 0, 1), off = (jan1.getDay() + 6) % 7, nd = (new Date(Y, 11, 31) - jan1) / 864e5 + 1, weeks = Math.ceil((nd + off) / 7);
  const c = 11, g = 2, W = weeks * (c + g) + 24;
  let svg = `<svg width="${W}" height="${7 * (c + g) + 16}">`, lastM = -1;
  for (let i = 0; i < nd; i++) {
    const dt = new Date(Y, 0, 1 + i), w = Math.floor((i + off) / 7), r = (i + off) % 7, d = ds(dt), mn = sportN(d), onlyC = mn > 0 && (day(d).sport || []).every(isCommute);
    if (r === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); svg += `<text x="${w * (c + g)}" y="9">${MONTHS[lastM]}</text>`; }
    const a = mn === 0 ? 0 : mn === 1 ? .55 : mn === 2 ? .8 : 1;
    svg += `<rect x="${w * (c + g)}" y="${14 + r * (c + g)}" width="${c}" height="${c}" rx="2.5" fill="${a ? (onlyC ? 'var(--com)' : 'var(--pos)') : 'var(--card2)'}" opacity="${a || 1}"/>`;
  }
  svg += '</svg>';
  const per = {}; let sess = 0, act = new Set();
  Object.keys(DB.days).filter(d => d.startsWith(Y + '-')).forEach(d => (DB.days[d].sport || []).forEach(s => {
    const k = s.name; const o = per[k] || (per[k] = { e: s.e, c: isCommute(s), n: 0, m: 0, mo: Array(12).fill(0) });
    o.n++; o.mo[parse(d).getMonth()]++; sess++; act.add(d);
  }));
  const rows = Object.entries(per).sort((a, b) => b[1].n - a[1].n).map(([k, o]) => {
    const mx = Math.max(...o.mo, 1);
    const bars = o.mo.map((v, i) => `<rect x="${i * 9}" y="${22 - v / mx * 22}" width="7" height="${v / mx * 22}" rx="1.5" fill="${o.c ? 'var(--com)' : 'var(--pos)'}"/>`).join('');
    return `<div class="ent a-sport">${ic(sportIc({ name: k, e: o.e }))}<span class="grow">${esc(k)}<br><small>${o.n}×</small></span><svg width="107" height="24">${bars}</svg></div>`;
  }).join('');
  return `<div class="dhead"><button data-act="yprev">‹</button><div><b>${Y}</b></div><button data-act="ynext" ${Y >= new Date().getFullYear() ? 'disabled' : ''}>›</button></div>
  <section class="card"><div class="stat"><div><span class="big">${sess}</span><small>Einheiten</small></div><div><span class="big">${act.size}</span><small>aktive Tage</small></div><div><span class="big">${Object.keys(per).length}</span><small>Sportarten</small></div></div>
  <div class="hscroll">${svg}</div><small>Dunkler = mehr Einheiten an dem Tag · <span style="color:var(--com)">■</span> nur Pendelweg, <span style="color:var(--pos)">■</span> anderer Sport</small></section>
  <section class="card"><h3>Nach Sportart (Balken: Einheiten je Monat)</h3>${rows || '<small>Noch keine Einheiten in diesem Jahr.</small>'}</section>`;
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
  const sp1 = b2.filter(d => sportN(d) > 0).map(d => day(d).mood.v), sp0 = b2.filter(d => !sportN(d)).map(d => day(d).mood.v);
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
  ds_.forEach(d => { const s = day(d).sleep; if (!s || sleepDur(s) == null) return; (sportN(addDays(d, -1)) > 0 ? sa : sb).push(sleepDur(s)); });
  if (sa.length >= 3 && sb.length >= 3) out.push(ins('Schlaf nach Sporttag', `<div class="kv"><span>Nach Sport</span><span>Ø ${fmtDur(avg(sa))} <small>(${sa.length})</small></span></div><div class="kv"><span>Nach Tag ohne Sport</span><span>Ø ${fmtDur(avg(sb))} <small>(${sb.length})</small></span></div>`));
  // 5) Gewohnheiten und Stimmung
  const hr = DB.cfg.habits.map(h => {
    const y = b2.filter(d => (day(d).habits || {})[h.id]).map(d => day(d).mood.v), n = b2.filter(d => !(day(d).habits || {})[h.id]).map(d => day(d).mood.v);
    return y.length >= 4 && n.length >= 4 ? { h, y, n, diff: avg(y) - avg(n) } : null;
  }).filter(Boolean).sort((p, q) => Math.abs(q.diff) - Math.abs(p.diff)).slice(0, 6);
  if (hr.length) out.push(ins('Gewohnheiten und Stimmung', hr.map(r => `<div class="kv"><span class="a-habit">${ic(itIc('habits', r.h), 'sm')} ${esc(r.h.name)}</span><span>${Math.abs(r.diff) < .05 ? '±0' : (r.diff > 0 ? '+' : '−') + f1(Math.abs(r.diff))} <small>(${r.y.length} / ${r.n.length} Tage)</small></span></div>`).join('') + '<small>Stimmungs-Unterschied an Tagen mit vs. ohne Haken.</small>'));
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
  const list = (kind, items) => `<div class="chips ${AREA[kind]}">${items.map(it => `<button class="chip ${it.hid ? 'hidc' : ''}" data-act="edit" data-kind="${kind}" data-id="${it.id}">${ic(itIc(kind, it))}<span>${esc(it.name)}</span>${kind === 'coffee' ? `<small>${it.mg}</small>` : ''}</button>`).join('')}<button class="chip new" data-act="edit" data-kind="${kind}" data-id="_new">${gl('plus')}<span>Neu</span></button></div><small class="mut">Antippen zum Bearbeiten. Blasse Einträge sind versteckt und stehen unter „weitere“.</small>`;
  return `<h2>Einstellungen</h2>
  <details class="card grp" data-k="g-erf"><summary><span>Erfassen<small>Koffein, Sportarten, Gewohnheiten</small></span></summary>
  <details class="sub" data-k="s-Koffein"><summary>Koffein</summary>
    <label class="mut">Tageslimit (mg)<br><input type="number" inputmode="numeric" data-cfgv="limit" value="${c.limit}"></label>
    <label class="mut">Halbwertszeit von Koffein (Stunden, meist 3 bis 7)<br><input type="number" inputmode="decimal" step="0.5" data-cfgv="halfLife" value="${c.halfLife || 6}"></label>
    <small class="mut">Richtwert für Erwachsene: etwa 400 mg pro Tag.</small>
    ${list('coffee', c.coffee)}
    <small class="mut">„≈“ = geschätzt (CoffeeB nennt keine Werte).</small></details>
  <details class="sub" data-k="s-Sportarten"><summary>Sportarten</summary>
    ${list('sports', c.sports)}</details>
  <details class="sub" data-k="s-Gewohnheiten"><summary>Gewohnheiten</summary>
    ${list('habits', c.habits)}
    <small class="mut">Alte Einträge bleiben erhalten, auch wenn du eine Gewohnheit löschst.</small></details>
  </details>
  <details class="card grp" data-k="g-verb" ${S.sbFirst || S.sbOpen || S.sbShow || S.puOpen || (sbSt() && (sbSt().delHold || []).length) ? 'open' : ''}><summary><span>Verbindungen<small>Sync, Apple Health, Mitteilungen</small></span></summary>
  ${sbSection()}
  ${sbSt() ? `<details class="sub" data-k="s-Apple Health"><summary>Apple Health</summary>
    <small class="mut">Kurzbefehl „${HL_SC}“: Schlaf, Ruhepuls, HRV, Schritte. Füllt nur leere Felder.</small>
    <div class="kv"><span>Letzte Daten</span><span>${(() => { const k = Object.keys(hlAll()).sort(); return k.length ? parse(k[k.length - 1]).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : 'noch keine'; })()}</span></div>
    <button class="btn" data-act="hlrun">Kurzbefehl jetzt ausführen</button></details>${puSection()}` : ''}
  </details>
  <details class="card grp" data-k="g-dat" ${S.impMsg ? 'open' : ''}><summary><span>Daten<small>Backup, Import</small></span></summary>
  <details class="sub" data-k="s-Backup"><summary>Backup</summary>
    <div class="lbl">Als Kopie</div>
    <div class="row"><button class="btn" data-act="copyexp">Backup kopieren</button><button class="btn" data-act="dlexp">Als Datei</button></div>
    <div class="lbl">Google-Tabelle</div>
    <label class="mut">Web-App-Adresse<br><input type="url" data-sync="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(syncCfg().url || '')}"></label>
    <div class="mut">Passwort<div class="pw masked${syncCfg().key ? ' has' : ''}"><input type="text" data-sync="key" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" value="${esc(syncCfg().key || '')}"><span class="pwdots" aria-hidden="true">••••••••••</span><button type="button" class="pweye" data-act="pweye" aria-label="Passwort anzeigen oder verbergen">${gl('eye')}</button></div></div>
    <button class="btn" data-act="syncnow">Jetzt in Tabelle sichern</button>
    <small class="mut">${syncCfg().last ? 'Zuletzt gesendet: ' + new Date(syncCfg().last).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) + (syncCfg().pending ? ' · Änderungen warten' : '') : 'Noch nicht gesendet.'} Die App sichert einmal am Tag automatisch, beim ersten Öffnen ab 4 Uhr.</small></details>
  <details class="sub" data-k="s-Import" ${S.impMsg ? 'open' : ''}><summary>Import</summary>
    <small class="mut">Backup einfügen.</small>
    <textarea id="imp" placeholder='{"tracker":1,"days":{…}}'></textarea>
    <div class="row"><button class="btn pri" data-act="imp" data-m="merge">Zusammenführen</button><button class="btn danger" data-act="imp" data-m="replace">Alles ersetzen</button></div>
    ${S.impMsg ? `<small>${esc(S.impMsg)}</small>` : ''}
</details>
  </details>
  <details class="card grp" data-k="g-app"><summary><span>App<small>Darstellung, Ideen, Version</small></span></summary>
  <details class="sub" data-k="s-Darstellung"><summary>Darstellung</summary>${chips([['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']], c.theme, 'theme')}</details>
  <details class="sub" data-k="s-App-Ideen"><summary>App-Ideen</summary>
    <textarea data-cfgt="ideas" placeholder="Was dir für die App einfällt. Eine Idee pro Zeile.">${esc(c.ideas || '')}</textarea>
    <small class="mut">Nur zum Sammeln, eine Idee pro Zeile.</small></details>
  <details class="sub" data-k="s-Version und Update"><summary>Version und Update</summary><div class="kv"><span>Version</span><span>${VERSION}</span></div><div class="kv"><span>Einträge</span><span>${allDates().length} Tage</span></div>
    <button class="btn" data-act="update">Nach Update suchen</button>
    ${sbSt() ? '' : '<small class="mut">Daten liegen nur auf diesem Gerät. Mach ab und zu ein Backup.</small>'}</details></details>
  <button class="btn danger wipe" data-act="wipe">Alle Daten löschen</button>`;
}

function sbSection() {
  const st = sbSt(), F = S.sbFirst;
  if (!st) return `<details class="sub" data-k="s-Sync zwischen Geräten" ${F || S.sbOpen ? 'open' : ''}><summary>Sync zwischen Geräten</summary>
    ${F ? `<p>Auf diesem Gerät und online gibt es schon Daten (${F.n} Tage online).</p>
      <div class="row"><button class="btn pri grow" data-act="sbfirst" data-m="merge">Zusammenführen</button><button class="btn grow" data-act="sbfirst" data-m="take">Online-Daten übernehmen</button></div>
      <small class="hint">Übernehmen ersetzt die Daten auf diesem Gerät. Zusammenführen behält beides und fragt bei Widersprüchen nach.</small>
      <button class="btn" data-act="sbfirst" data-m="cancel">Abbrechen</button>`
    : `<small class="mut">Gleicht deine Daten über einen Code zwischen Geräten ab. Kein Konto nötig.</small>
      <button class="btn pri" data-act="sbcreate">Neuen Code erzeugen</button>
      <div class="lbl">Oder vorhandenen Code eingeben</div>
      <input type="text" id="sbcode" autocapitalize="characters" autocorrect="off" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX">
      <button class="btn" data-act="sbconnect">Verbinden</button>`}
    ${S.sbMsg ? `<small class="hint">${esc(S.sbMsg)}</small>` : ''}</details>`;
  const t = st.last ? new Date(st.last).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const hold = st.delHold || [], asks = sbAskDays();
  return `<details class="sub" data-k="s-Sync zwischen Geräten" ${S.sbOpen || hold.length || S.sbShow ? 'open' : ''}><summary>Sync zwischen Geräten</summary>
    <div class="kv"><span>Stand</span><span>${st.err ? 'Fehler beim Abgleich' : t ? 'Abgeglichen ' + t : 'Noch nicht abgeglichen'}</span></div>
    ${st.err ? `<small class="hint">${esc(st.err)}</small>` : ''}
    ${asks.length ? `<button class="btn pri" data-act="sbask">Unterschiede klären (${asks.length} ${asks.length === 1 ? 'Tag' : 'Tage'})</button>` : ''}
    ${hold.length ? `<p>${hold.length} Tage fehlen auf diesem Gerät, sind online aber noch gespeichert.</p>
      <div class="row"><button class="btn pri grow" data-act="sbrestore">Wiederherstellen</button><button class="btn danger grow" data-act="sbdelall">Auch online löschen</button></div>` : ''}
    <button class="btn" data-act="sbnow">Jetzt abgleichen</button>
    ${S.sbShow ? `<div class="lbl">Dein Sync-Code</div><div class="sbcode">${sbFmt(st.code)}</div>
      <button class="btn" data-act="sbcopy">Code kopieren</button>
      <small class="hint">Denselben Code auf anderen Geräten und im Widget eintragen. Wer den Code kennt, sieht deine Daten.</small>`
      : `<button class="btn" data-act="sbshow">Code anzeigen</button>`}
    <button class="btn" data-act="sboff">Auf diesem Gerät trennen</button>
    ${S.sbMsg ? `<small class="hint">${esc(S.sbMsg)}</small>` : ''}</details>`;
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
const FALL_N = { schnell: 'schnell eingeschlafen', normal: 'normal eingeschlafen', lange: 'lange zum Einschlafen gebraucht' };
const restFaces = sl => `<div class="smileys">${REST_N.map((n, i) => { const on = sl.q === i + 1; return `<button class="sm ${on ? 'on' : ''}" data-act="srate" data-v="${i + 1}" aria-label="${n}" aria-pressed="${on}">${face(i + 1)}${on ? `<i class="badge">${gl('check')}</i>` : ''}</button>`; }).join('')}</div>`;
function cleanDay(d) { const D = DB.days[d]; if (!D) return; ['mood', 'sleep', 'did', 'ev', 'sup'].forEach(k => { if (D[k] && !Object.keys(D[k]).length) delete D[k]; }); ['coffee', 'sport'].forEach(k => { if (D[k] && !D[k].length) delete D[k]; }); if (D.habits && !Object.keys(D.habits).length) delete D.habits; if (!Object.keys(D).length) delete DB.days[d]; }

const A = {
  tab(el) { S.tab = el.dataset.v; S.impMsg = ''; scrollTo(0, 0); },
  dprev() { S.date = addDays(S.date, -1); },
  wxopen() { S.wxs = 1; S.wxd = null; openSheet(wxSheet()); return 'noRender'; },
  wxday(el) { S.wxd = el.dataset.d; $('#sbody').innerHTML = wxSheet(); $('#sbody .wxtabs').scrollIntoView({ block: 'nearest' }); return 'noRender'; },
  wxloc(el) { DB.cfg.wxLoc = el.dataset.v; save(); wxLoad(true); $('#sbody').innerHTML = wxSheet(); return 'noRender'; },
  dnext() { if (S.date < todayStr()) S.date = addDays(S.date, 1); },
  dtoday() { S.date = todayStr(); },
  tog(el) { S.open[el.dataset.k] = !S.open[el.dataset.k]; },
  msel(el) { markSeen('mood'); const on = S.ma && S.ma.id === el.dataset.id && moodAct(day(S.date).mood); S.ma = on ? null : { id: el.dataset.id, d: S.date, at: Date.now() }; },
  mnew() { S.ma = null; toast('Aufs Feld tippen für die nächste Stimmung'); },
  mdel(el) { const o = sec(S.date, 'mood'); o.log = moodLog(o).filter(x => x.id !== el.dataset.id); if (S.ma && S.ma.id === el.dataset.id) S.ma = null; moodSync(o); cleanDay(S.date); save(); },
  fold(el) { const k = el.dataset.k, d = S.date; if (k === 'sleep') S.fold[d] = !(S.fold[d] ?? S.slf[d]); else { DB.cfg.fold[k] = !DB.cfg.fold[k]; save(); } },
  fbx() { fbHide(); return 'noRender'; },
  ciopen() { S.ci = { step: 0 }; openSheet(ciSheet()); return 'noRender'; },
  moopen() { S.mo = 1; openSheet(moSheet()); return 'noRender'; },
  modone() { day(S.date, true).mo = 1; save(); closeSheet(); },
  ciprev() { S.ci.step = Math.max(0, S.ci.step - 1); $('#sbody').innerHTML = ciSheet(); return 'noRender'; },
  cinext() {
    S.ci.step++;
    if (S.ci.step >= CI_N) { day(S.date, true).ci = 1; save(); render(); }
    $('#sbody').innerHTML = ciSheet(); $('#sbody').scrollTop = 0; return 'noRender';
  },
  wropen(el) { S.wr = { w: el.dataset.w, step: 0 }; openSheet(wrSheet()); return 'noRender'; },
  wrprev() { S.wr.step = Math.max(0, S.wr.step - 1); $('#sbody').innerHTML = wrSheet(); return 'noRender'; },
  wrrate(el) { const o = DB.weeks[S.wr.w] || (DB.weeks[S.wr.w] = {}), v = +el.dataset.v; if (o.v === v) delete o.v; else o.v = v; save(); $('#sbody').innerHTML = wrSheet(); return 'noRender'; },
  wrnext() {
    if (++S.wr.step < 3) { $('#sbody').innerHTML = wrSheet(); $('#sbody').scrollTop = 0; return 'noRender'; }
    (DB.weeks[S.wr.w] || (DB.weeks[S.wr.w] = {})).done = 1; save(); closeSheet();
    fbShow({ a: 'sleep', t: 'Wochenrückblick gespeichert. Auf eine gute neue Woche!' });
  },
  mclose() { closeMenu(); return 'noRender'; },
  medit() { const m = S.menu; closeMenu(); if (m) openEdit(m.kind, m.id); return 'noRender'; },
  mhide() {
    const m = S.menu, it = m && DB.cfg[m.kind].find(x => x.id === m.id); closeMenu(); if (!it) return 'noRender';
    if (it.hid) delete it.hid; else it.hid = true;
    save(); toast(it.hid ? 'Versteckt, steht jetzt unter „weitere“' : 'Wieder eingeblendet');
  },
  mrm(el) {
    if (!el.dataset.sure) { el.dataset.sure = 1; el.querySelector('span').textContent = 'Wirklich? Nochmal tippen'; return 'noRender'; }
    const m = S.menu; closeMenu(); if (!m) return 'noRender';
    DB.cfg[m.kind] = DB.cfg[m.kind].filter(x => x.id !== m.id); save(); toast('Gelöscht');
  },
  srate(el) { const o = sec(S.date, 'sleep'), v = +el.dataset.v; if (o.q === v) delete o.q; else o.q = v; cleanDay(S.date); save(); },
  tag(el) { const o = sec(S.date, 'mood'), t = el.dataset.v, a = o.tags || (o.tags = []); const i = a.indexOf(t); if (i >= 0) a.splice(i, 1); else a.push(t); if (t === 'Kopfschmerzen') { if (i >= 0) delete o.kopf; else o.kopf = 3; } if (!a.length) delete o.tags; cleanDay(S.date); save(); },
  qnext() { const cur = S.qi[S.date] ?? (parse(S.date).getTime() / 864e5 | 0); S.qi[S.date] = (cur + 1) % QS.length; },
  sfall(el) { chipSet('sleep', 'fall', el); }, swakes(el) { chipSet('sleep', 'wakes', el); }, smorning(el) { chipSet('sleep', 'morning', el); },
  krank() { const o = sec(S.date, 'ev'); if (o.krank) delete o.krank; else o.krank = 1; cleanDay(S.date); save(); },
  did(el) { const o = sec(S.date, 'did'), id = el.dataset.id, a = o.t || (o.t = []), k = a.indexOf(id); if (k >= 0) { a.splice(k, 1); if (o.h) { delete o.h[id]; if (!Object.keys(o.h).length) delete o.h; } } else a.push(id); if (!a.length) delete o.t; cleanDay(S.date); save(); },
  dhrs(el) { const o = sec(S.date, 'did'), h = o.h || (o.h = {}), k = el.dataset.id, v = +el.dataset.v; if (h[k] === v) delete h[k]; else h[k] = v; if (!Object.keys(h).length) delete o.h; cleanDay(S.date); save(); },
  ja(el) { const o = sec(S.date, 'ev'), k = el.dataset.id; if (o[k]) delete o[k]; else o[k] = 1; cleanDay(S.date); save(); },
  sup(el) { const o = sec(S.date, 'sup'), k = el.dataset.id; if (o[k] != null) delete o[k]; else o[k] = k === 'kr' ? KR_DEF : 1; cleanDay(S.date); save(); },
  supall() { const o = sec(S.date, 'sup'); SUP.forEach(([k]) => { if (o[k] == null) o[k] = k === 'kr' ? KR_DEF : 1; }); save(); },
  hab(el) { const D = day(S.date, true), h = D.habits || (D.habits = {}), id = el.dataset.id; if (h[id]) delete h[id]; else h[id] = 1; cleanDay(S.date); save(); },
  cadd(el) {
    const c = DB.cfg.coffee.find(x => x.id === el.dataset.id); if (!c) return 'noRender';
    if (c.sizes && c.sizes.length > 1) {
      openSheet(`<div class="a-coffee"><h3><span class="row">${ic(itIc('coffee', c))} ${esc(c.name)}</span></h3><div class="lbl" style="margin-top:0">Welche Größe?</div>
        <div class="chips">${c.sizes.map((z, i) => `<button class="chip" data-act="csize" data-id="${c.id}" data-i="${i}">${esc(z.l || 'Standard')}<small>${z.mg} mg</small></button>`).join('')}</div>
        <div class="row" style="margin-top:var(--s-3)"><button class="btn" data-act="edit" data-kind="coffee" data-id="${c.id}">Größen ändern</button><button class="btn" data-act="sclose">Abbrechen</button></div></div>`);
      return 'noRender';
    }
    addCoffee(c, c.sizes && c.sizes[0]);
  },
  csize(el) { const c = DB.cfg.coffee.find(x => x.id === el.dataset.id), z = c && c.sizes[+el.dataset.i]; if (!z) return 'noRender'; closeSheet(); addCoffee(c, z); },
  cdel(el) { const a = sec(S.date, 'coffee'); const i = a.findIndex(x => x.id === el.dataset.id); if (i >= 0) a.splice(i, 1); cleanDay(S.date); save(); },
  sdel(el) { const a = sec(S.date, 'sport'); const i = a.findIndex(x => x.id === el.dataset.id); if (i >= 0) a.splice(i, 1); cleanDay(S.date); save(); },
  sadd(el) {
    const x = DB.cfg.sports.find(y => y.id === el.dataset.id); if (!x) return 'noRender';
    sec(S.date, 'sport').push(Object.assign({ id: uid(), t: S.date === todayStr() ? nowT() : '', name: x.name, e: x.e, i: itIc('sports', x) }, x.commute ? { c: 1 } : {}));
    save(); toast(x.name + ' hinzugefügt');
  },
  edic(el) { if (!S.ed) return 'noRender'; S.ed.d.i = el.dataset.v; el.parentElement.querySelectorAll('button').forEach(b => { const on = b === el; b.className = on ? 'on on-g' : ''; b.setAttribute('aria-pressed', on); }); return 'noRender'; },
  edit(el) { openEdit(el.dataset.kind, el.dataset.id, el.dataset.type); return 'noRender'; },
  edtype(el) { S.ed.d.type = el.dataset.v; $('#sbody').innerHTML = editSheet(); return 'noRender'; },
  edszadd() { const d = S.ed.d; if (!d.sizes || !d.sizes.length) d.sizes = [{ l: 'Standard', mg: Number(d.mg) || 50 }]; d.sizes.push({ l: '', mg: 0 }); $('#sbody').innerHTML = editSheet(); return 'noRender'; },
  edszdel(el) { const d = S.ed.d; d.sizes.splice(+el.dataset.i, 1); if (!d.sizes.length) delete d.sizes; else d.mg = d.sizes[0].mg; $('#sbody').innerHTML = editSheet(); return 'noRender'; },
  edsave() {
    const { kind, id, d } = S.ed, arr = DB.cfg[kind], i = arr.findIndex(x => x.id === id);
    d.name = (d.name || '').trim(); if (!d.name) { toast('Name fehlt'); return 'noRender'; }
    if (kind === 'coffee') {
      if (d.sizes) { d.sizes = d.sizes.map(z => ({ l: String(z.l || '').trim(), mg: Math.max(0, Number(z.mg) || 0) })).filter(z => z.l || z.mg); if (!d.sizes.length) delete d.sizes; }
      d.mg = d.sizes ? d.sizes[0].mg : Math.max(0, Number(d.mg) || 0);
      if (i < 0 || JSON.stringify([arr[i].mg, arr[i].sizes]) !== JSON.stringify([d.mg, d.sizes])) delete d.est;
    }
    if (i < 0) { d.id = uid(); arr.push(d); } else arr[i] = d;
    save(); closeSheet(); toast('Gespeichert');
  },
  edhide() {
    const { kind, id } = S.ed, it = DB.cfg[kind].find(x => x.id === id); if (!it) return 'noRender';
    if (it.hid) delete it.hid; else it.hid = true;
    save(); closeSheet(); toast(it.hid ? 'Versteckt, steht jetzt unter „weitere“' : 'Wieder eingeblendet');
  },
  eddel(el) {
    if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = 'Wirklich löschen? Nochmal tippen'; return 'noRender'; }
    const { kind, id } = S.ed; DB.cfg[kind] = DB.cfg[kind].filter(x => x.id !== id); save(); closeSheet(); toast('Gelöscht');
  },
  sclose() { if (TP.on) tpFinish(tpValue()); else closeSheet(); return 'noRender'; },
  tpick(el) {
    const t = el.dataset.t;
    if (t === 'sleep.bed' || t === 'sleep.wake') {
      const k = t.split('.')[1];
      openTime({ title: k === 'bed' ? 'Ins Bett' : 'Aufgewacht', orig: (day(S.date).sleep || {})[k] || '', def: k === 'bed' ? '23:00' : '07:00', canClear: true, apply: v => { setField(t, v); setTimeout(() => fbCheck('sleep'), 60); } });
    } else if (t === 'mood') {
      const o = sec(S.date, 'mood'), id = el.dataset.id, x = moodLog(o).find(y => y.id === id); if (!x) { cleanDay(S.date); return 'noRender'; }
      openTime({ title: 'Uhrzeit · Stimmung', orig: x.t, def: nowT(), canClear: false, apply: v => { if (v) { if (!o.log) o.log = moodLog(o); o.log.find(y => y.id === id).t = v; save(); } } });
    } else if (t === 'coffee') {
      const c = sec(S.date, 'coffee').find(x => x.id === el.dataset.id); if (!c) return 'noRender';
      openTime({ title: 'Uhrzeit · ' + c.name, orig: c.t, def: nowT(), canClear: false, apply: v => { if (v) { c.t = v; save(); } } });
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
    const txt = `Hier sind meine Tracker-Daten für KW ${isoWeek(S.week)} (${S.week} bis ${addDays(S.week, 6)}) plus die Vorwoche zum Vergleich. Bitte werte aus: Muster zwischen Schlaf, Stimmung, Koffein (Koffein-Limit ${DB.cfg.limit} mg, Halbwertszeit ${DB.cfg.halfLife || 6} h), Sport und Gewohnheiten; was lief gut, was könnte ich ändern. Schlaf zählt zum Tag des Aufwachens. mood.v 1 bis 5 (5 am besten, Tagesschnitt; mood.log sind die einzelnen Einträge mit Uhrzeit), sleep.q Erholung 1 bis 5. Bitte vorsichtig mit Schlüssen bei wenigen Tagen.\n\n` + JSON.stringify({ tracker: 1, days });
    copy(txt, 'Woche kopiert, jetzt im Chat einfügen'); return 'noRender';
  },
  vtab(el) { S.vtab = el.dataset.v; },
  range(el) { S.range = +el.dataset.v; },
  yprev() { S.year--; }, ynext() { if (S.year < new Date().getFullYear()) S.year++; },
  theme(el) { DB.cfg.theme = el.dataset.v; save(); },
  imp(el) { doImport(el.dataset.m); },
  copyprompt() { copy(CLAUDE_PROMPT, 'Auftrag kopiert'); return 'noRender'; },
  pweye(el) { const w = el.closest('.pw'); w.classList.toggle('masked'); el.style.color = w.classList.contains('masked') ? '' : 'var(--brand)'; return 'noRender'; },
  syncnow() { syncNow(true); return 'noRender'; },
  hlrun() { hlRun(); return 'noRender'; },
  puon() { S.puOpen = 1; S.puMsg = 'Wird eingeschaltet …'; puOn().catch(e => { S.puMsg = 'Hat nicht geklappt: ' + e.message; }).then(render); return 'noRender'; },
  puoff() { S.puOpen = 1; puOff().then(render); return 'noRender'; },
  putest() { S.puOpen = 1; S.puMsg = 'Wird gesendet …'; render(); puFn({ mode: 'test', code: sbSt().code }).then(j => { S.puMsg = j.n ? 'Gesendet. Die Mitteilung sollte gleich erscheinen.' : 'Kein Gerät angemeldet. Bitte aus- und wieder einschalten.'; }).catch(e => { S.puMsg = 'Hat nicht geklappt: ' + e.message; }).then(render); return 'noRender'; },

  sbcreate() { sbSave({ code: sbNewCode() }); S.sbShow = 1; S.sbOpen = 1; S.sbMsg = 'Code erzeugt. Deine Daten werden jetzt hochgeladen.'; sbRun({ full: true, ui: 1 }); },
  async sbconnect() {
    const c = sbNorm($('#sbcode') && $('#sbcode').value); S.sbOpen = 1;
    if (c.length !== 20) { S.sbMsg = 'Der Code hat 20 Zeichen.'; render(); return 'noRender'; }
    S.sbMsg = 'Verbinde …'; render();
    try {
      const r = await sbRpc('tr_pull', { p_code: c, p_since: null }), n = (r.days || []).filter(x => !x.del).length, mine = allDates().length;
      S.sbMsg = '';
      if (n && mine) S.sbFirst = { code: c, n };
      else { sbSave({ code: c }); S.sbMsg = n ? 'Verbunden. Daten werden geladen.' : 'Verbunden. Für diesen Code gab es noch keine Daten.'; await sbRun({ full: true }); }
    } catch (e) { S.sbMsg = 'Verbinden fehlgeschlagen: ' + (e.message || e); }
    render(); return 'noRender';
  },
  sbfirst(el) {
    const F = S.sbFirst; S.sbFirst = null; if (!F || el.dataset.m === 'cancel') { S.sbMsg = ''; return; }
    if (el.dataset.m === 'take') { DB.days = {}; DB.weeks = {}; try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } sbSave({ code: F.code, h: {}, mh: { cfg: sbHash(DB.cfg), weeks: sbHash(DB.weeks) } }); }
    else sbSave({ code: F.code });
    S.sbMsg = el.dataset.m === 'take' ? 'Online-Daten werden geladen.' : 'Wird zusammengeführt.'; sbRun({ full: true, ui: 1 });
  },
  sbnow() { S.sbMsg = ''; sbRun({ ui: 1 }).then(() => { if (!sbSt().err) toast('Abgeglichen'); }); return 'noRender'; },
  sbshow() { S.sbShow = 1; },
  sbcopy() { const st = sbSt(); if (st) copy(sbFmt(st.code), 'Code kopiert'); return 'noRender'; },
  sboff(el) {
    if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = 'Wirklich trennen? Nochmal tippen'; return 'noRender'; }
    if (puSt().on) puOff(true);
    sbSave(null); S.sbShow = 0; S.sbMsg = 'Getrennt. Die Daten bleiben auf diesem Gerät.';
  },
  sbrestore() { S.sbMsg = ''; sbRun({ full: true, ui: 1 }); return 'noRender'; },
  sbdelall(el) {
    if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = 'Wirklich online löschen? Nochmal tippen'; return 'noRender'; }
    sbRun({ force: true, ui: 1 }); return 'noRender';
  },
  sbask() { S.sbPick = {}; openSheet(sbAskSheet()); return 'noRender'; },
  sbpick(el) { const P = S.sbPick = S.sbPick || {}; (P[el.dataset.d] = P[el.dataset.d] || {})[el.dataset.p] = el.dataset.v; $('#sbody').innerHTML = sbAskSheet(); return 'noRender'; },
  sbresolve() { if (!sbResolve()) return 'noRender'; closeSheet(); toast('Übernommen'); },

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
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { autoCheck(); wxLoad(); if (sbSt()) sbRun(); else syncDaily(); } });
setTimeout(autoCheck, 1500);
setTimeout(() => fbCheck(), 1200);
let keepOpen = null;
function chipSet(s, k, el) { const o = sec(S.date, s), v = el.dataset.v; if (o[k] === v) delete o[k]; else o[k] = v; cleanDay(S.date); save(); }
function copy(txt, msg) {
  const fb = () => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Kopieren nicht möglich'); } t.remove(); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast(msg), fb); else fb();
}
function openSheet(html) { $('#sbody').innerHTML = html; $('#sheet').hidden = false; document.body.classList.add('noscroll'); }
function closeSheet() { $('#sheet').hidden = true; S.wxs = 0; S.sp = null; S.ed = null; S.ci = null; S.mo = null; S.wr = null; TP.on = false; document.body.classList.remove('noscroll'); }

/* Kleines Menü bei langem Drücken: Bearbeiten, Verstecken, Löschen. Tippen daneben schließt es. */
function openMenu(kind, id, el) {
  const it = DB.cfg[kind] && DB.cfg[kind].find(x => x.id === id); if (!it) return;
  S.menu = { kind, id }; markSeen('lp');
  const b = $('#mbody');
  b.className = 'menu-body ' + AREA[kind];
  b.innerHTML = `<div class="mhead">${ic(itIc(kind, it))}<b>${esc(it.name)}</b></div>
    <button class="mitem" role="menuitem" data-act="mhide">${gl(it.hid ? 'eye' : 'hide')}<span>${it.hid ? 'Wieder einblenden' : 'Verstecken'}</span></button>
    <button class="mitem danger" role="menuitem" data-act="mrm">${gl('trash')}<span>Löschen</span></button>
    <button class="mitem" role="menuitem" data-act="medit">${gl('edit')}<span>Bearbeiten</span></button>`;
  $('#menu').hidden = false;
  const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x = Math.min(vw - w - 12, Math.max(12, r.left + r.width / 2 - w / 2)), y = r.bottom + 8;
  if (y + h > vh - 12) y = r.top - h - 8;
  if (y < 12) y = Math.max(12, vh - h - 12);
  b.style.left = x + 'px'; b.style.top = y + 'px';
  b.style.transformOrigin = `${r.left + r.width / 2 - x}px ${y < r.top ? '100%' : '0'}`;
}
function closeMenu() { $('#menu').hidden = true; S.menu = null; }

/* ---------- Hinweise, Erfolge, Erkenntnisse ---------- */
function markSeen(k) { if (!DB.cfg.seen[k]) { DB.cfg.seen[k] = 1; save(); } }
const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const FB_KEY = 'tracker-fb';
const fbSeen = () => { try { return JSON.parse(localStorage.getItem(FB_KEY)) || {}; } catch (e) { return {}; } };
function fbMark(d, ids) { const s = fbSeen(); s[d] = [...new Set([...(s[d] || []), ...ids])]; Object.keys(s).sort().slice(0, -21).forEach(k => delete s[k]); try { localStorage.setItem(FB_KEY, JSON.stringify(s)); } catch (e) { } }
/* Alle Meldungen, die zu diesem Tag passen, wichtigste zuerst. a = Bereich, all = darf nach jeder Eingabe erscheinen. */
function fbList(d) {
  const D = day(d), isT = d === todayStr(), eve = !isT || new Date().getHours() >= 18, out = [];
  const add = (id, a, t, p, all, g) => out.push({ id, a, t, p, all, g });
  const cof = D.coffee || [], sp = D.sport || [], H = D.habits || {}, m = D.mood || {}, sl = D.sleep || {}, mg = coffeeMg(d), dur = sleepDur(sl), has = Object.keys(D).length > 0;
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(d, -i)), prev7 = last7.map(x => addDays(x, -7)), nn = a => a.filter(x => x != null);
  const posV = DB.cfg.habits.filter(x => x.type === 'pos' && !x.hid), negV = DB.cfg.habits.filter(x => x.type === 'neg' && !x.hid);
  // Koffein
  if (eve && cof.length && cof.every(c => tmin(c.t) < 720)) add('c12', 'coffee', 'Nach 12 Uhr kein Koffein mehr. Sehr gut, dein Schlaf dankt es dir.', 3);
  else if (eve && cof.length && cof.every(c => tmin(c.t) < 900)) add('c15', 'coffee', 'Letztes Koffein vor 15 Uhr. Gute Voraussetzung für die Nacht.', 2);
  if (eve && mg > 50 && caffeineAt(d, 1320) < 50) add('c50', 'coffee', 'Um 22 Uhr liegst du unter 50 mg Koffein. So schläft es sich leichter.', 2);
  if (eve && has && !cof.length) add('c0', 'coffee', 'Ein Tag ganz ohne Koffein. Respekt.', 2);
  if (eve && mg > 0 && mg <= DB.cfg.limit / 2) add('chalf', 'coffee', 'Heute deutlich unter deinem Koffein-Limit geblieben.', 1);
  // Sport
  const real = sp.filter(x => !isCommute(x)), sDays = last7.filter(x => sportN(x) > 0).length;
  if (real.length >= 2 || sp.length >= 3) add('s2', 'sport', 'Heute war ein sportlicher Tag.', 3);
  else if (real.length) add('s1', 'sport', real[0].name + ' erledigt. Bewegung tut dir gut.', 2);
  else if (sp.length) add('sc', 'sport', 'Den Weg aus eigener Kraft gemacht. Auch das zählt.', 1);
  if (sp.length && sDays >= 4) add('s4', 'sport', sDays + ' aktive Tage in den letzten 7. Du bist richtig gut dabei.', 3);
  if (sp.length && allDates()[0] < addDays(d, -3) && [1, 2, 3].every(i => !sportN(addDays(d, -i)))) add('sback', 'sport', 'Nach ein paar Tagen Pause wieder bewegt. Der Wiedereinstieg ist das Schwerste.', 3);
  // Gewohnheiten
  if (posV.length && posV.every(x => H[x.id])) add('hall', 'habit', 'Alle positiven Gewohnheiten geschafft. Starker Tag.', 4);
  posV.forEach(x => { const n = H[x.id] ? streak(x, d) : 0; if ([3, 7, 14, 21, 30, 50, 100].includes(n)) add('hs' + x.id + n, 'habit', `${n} Tage in Folge: ${x.name}. Das wird zur Gewohnheit.`, 4); });
  if (eve && has && negV.length && negV.every(x => !H[x.id])) add('hneg', 'habit', 'Heute keine einzige negative Gewohnheit. Das darf man feiern.', 2);
  negV.forEach(x => { const n = eve && !H[x.id] ? streak(x, d) : 0; if ([3, 7, 14, 30].includes(n)) add('hn' + x.id + n, 'habit', `${n} Tage ohne „${x.name}“. Weiter so.`, 3); });
  // Was gemacht
  const dt = (D.did || {}).t || [], dh = x => dt.includes(x), da = (id, t, p) => add(id, 'habit', t, p, 0, 'did');
  if (dh('uni')) { const n = didRun(d, 'uni'), w = last7.filter(x => didHas(x, 'uni')).length;
    if ([3, 5, 7, 10, 14].includes(n)) da('du' + n, `${n} Uni-Tage in Folge. Du bist richtig gut im Stoff drin.`, 4);
    else if (w >= 4) da('duw', `${w} Tage mit Uni in den letzten 7. Fleißig.`, 3);
    else da('du1', 'Heute was für die Uni getan. Jeder Tag zählt.', 1); }
  if (dh('uni') && dh('arbeit')) da('dua', 'Uni und Arbeit an einem Tag. Ganz schön viel geschafft.', 3);
  if (!dh('prokr') && didHas(addDays(d, -1), 'prokr') && (dh('uni') || dh('arbeit') || dh('erled'))) da('dpk', 'Gestern aufgeschoben, heute angepackt. Stark.', 4);
  if (dh('erled')) da('der', 'Erledigungen abgehakt. Eine Sache weniger im Kopf.', 2);
  if (dh('haushalt')) da('dhh', 'Haushalt gemacht. Ordnung tut gut.', 1);
  if (dh('gelesen')) { const n = didRun(d, 'gelesen'); da(n >= 3 ? 'dge' + n : 'dge', n >= 3 ? `${n} Tage in Folge gelesen. Schöne Gewohnheit.` : 'Heute gelesen. Gut für den Kopf.', n >= 3 ? 3 : 1); }
  if (dh('erholung')) da('dho', dh('uni') || dh('arbeit') ? 'Gearbeitet und trotzdem Zeit zum Erholen gefunden. Gute Balance.' : 'Du hast dir Erholung gegönnt. Das ist genauso wichtig.', dh('uni') || dh('arbeit') ? 3 : 1);
  if (dh('prokr') && dt.length === 1) da('dpr', 'Ehrlich eingetragen. Morgen ist ein neuer Versuch.', 1);
  // Schlaf
  if (dur != null && dur >= 420 && dur <= 540) add('sl7', 'sleep', fmtDur(dur) + ' geschlafen. Genau im guten Bereich.', 2);
  if (sl.q >= 4) add('slq', 'sleep', 'Gut erholt aufgewacht. Schöner Start in den Tag.', 2);
  const ss = sl.bed ? sleepStats(last7) : null;
  if (ss && ss.n >= 5 && Math.max(ss.bedSD, ss.wakeSD) < 45) add('slr', 'sleep', 'Dein Schlafrhythmus war in den letzten Tagen sehr regelmäßig.', 3);
  const dA = nn(last7.map(x => sleepDur(day(x).sleep))), dB = nn(prev7.map(x => sleepDur(day(x).sleep)));
  if (dur != null && dA.length >= 3 && dB.length >= 3 && avg(dA) - avg(dB) >= 30 && avg(dB) < 450) add('slup', 'sleep', `Du schläfst gerade im Schnitt ${Math.round(avg(dA) - avg(dB))} Minuten länger als in der Woche davor.`, 3);
  // Stimmung
  const ml = moodSorted(m), mA = nn(last7.map(x => day(x).mood?.v)), mB = nn(prev7.map(x => day(x).mood?.v));
  if (m.v >= 4) add('m4', 'mood', 'Heute geht es dir richtig gut. Halt kurz fest, woran es liegt.', 2);
  if (ml.length >= 2 && ml[ml.length - 1].v - ml[0].v >= 1) add('mup', 'mood', 'Deine Stimmung ist im Lauf des Tages gestiegen.', 2);
  if (m.v && mA.length >= 3 && mB.length >= 3 && avg(mA) - avg(mB) >= .3) add('mwk', 'mood', 'Deine Stimmung liegt gerade höher als in der Woche davor.', 3);
  if (m.note || m.qa) add('mnote', 'mood', 'Schön, dass du dir Zeit für ein paar Worte genommen hast.', 1);
  if (m.v && mA.length >= 2 && avg(mA.slice(0, 3)) <= 2.6) {
    let good = null;
    for (let i = 1; i <= 14 && !good; i++) { const x = addDays(d, -i), M = day(x).mood; if (M && M.v >= 4) { const t = (M.qa && M.qa[0] && M.qa[0].a) || M.note || day(x).note; good = { x, t }; } }
    const wb = (DB.weeks[addDays(weekStart(d), -7)] || {}).best, cut = t => t.length > 70 ? t.slice(0, 68).trim() + '…' : t;
    add('mlow', 'mood', 'Auch wenn die Tage gerade nicht so gut laufen: ' + (good && good.t ? `Erinner dich an ${WDL[parse(good.x).getDay()]}: „${cut(good.t)}“` : wb ? `Erinner dich an letzte Woche: „${cut(wb)}“` : good ? `Am ${WDL[parse(good.x).getDay()]} ging es dir richtig gut. Solche Tage kommen wieder.` : 'Solche Phasen gehen vorbei. Dass du trotzdem einträgst, zählt.'), 5);
  }
  // Allgemein
  if (['mood', 'sleep', 'coffee', 'sport', 'habits'].every(k => D[k])) add('all5', 'habit', 'Alle fünf Bereiche heute eingetragen. Volles Bild.', 3, 1);
  let run = 0; for (let x = d; Object.keys(day(x)).length; x = addDays(x, -1)) run++;
  if ([3, 7, 14, 30, 60, 100, 200, 365].includes(run)) add('run' + run, 'mood', run + ' Tage in Folge eingetragen. Du bleibst dran.', 4, 1);
  if (has && allDates().length === 1) add('first', 'mood', 'Erster Tag eingetragen. Ab jetzt lernt die App dich kennen.', 4, 1);
  return out.sort((a, b) => b.p - a.p);
}
function fbShow(m) {
  const b = $('#fb'); b.className = 'a-' + m.a; b.innerHTML = `<div class="tile on-g">${tile(m.a)}</div><span>${esc(m.t)}</span>`;
  b.hidden = true; void b.offsetWidth; b.hidden = false;
  if (m.id === 'all5') document.querySelectorAll('#app .card .tile').forEach(t => { t.classList.remove('goal'); void t.offsetWidth; t.classList.add('goal'); });
  clearTimeout(fbShow.t); fbShow.t = setTimeout(fbHide, 6500);
}
function fbHide() { $('#fb').hidden = true; }
/* Nach einer Eingabe: eine noch nicht gezeigte Meldung aus dem Bereich. Ohne Bereich (App geöffnet): die wichtigste. Nur für heute. */
function fbCheck(area) {
  const d = todayStr(); if (S.date !== d || S.ci || S.wr || S.tab !== 'heute') return;
  const seen = fbSeen()[d] || [], m = fbList(d).find(x => !seen.includes(x.id) && (!area || x.a === area || x.all));
  if (m) { fbMark(d, [m.id]); fbShow(m); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => fbCheck(), 600); });
/* Erkenntnis: ein Vergleich aus den eigenen Daten, erst ab genug Tagen und nur bei spürbarem Unterschied */
function insights() {
  const ds_ = allDates(), md = ds_.filter(d => day(d).mood?.v), out = [], mv = d => day(d).mood.v, df = x => f1(Math.abs(x));
  const cmp = (a, b, min, txt) => { if (a.length >= min && b.length >= min) { const x = avg(a) - avg(b); if (Math.abs(x) >= .2) out.push(txt(x)); } };
  cmp(md.filter(d => sportN(d)).map(mv), md.filter(d => !sportN(d)).map(mv), 3, x => `An Tagen mit Sport ist deine Stimmung im Schnitt ${df(x)} Punkte ${x > 0 ? 'höher' : 'niedriger'} als ohne.`);
  const sd = md.filter(d => sleepDur(day(d).sleep) != null), long = d => sleepDur(day(d).sleep) >= 420;
  cmp(sd.filter(long).map(mv), sd.filter(d => !long(d)).map(mv), 3, x => `Nach mindestens 7 Stunden Schlaf ist deine Stimmung im Schnitt ${df(x)} Punkte ${x > 0 ? 'höher' : 'niedriger'} als nach kürzeren Nächten.`);
  const q = ds_.filter(d => day(d).sleep?.q && Object.keys(day(addDays(d, -1))).length), late = d => (day(addDays(d, -1)).coffee || []).some(c => tmin(c.t) >= 840), qv = d => day(d).sleep.q;
  cmp(q.filter(d => !late(d)).map(qv), q.filter(late).map(qv), 3, x => `Ohne Koffein nach 14 Uhr wachst du im Schnitt ${df(x)} Punkte ${x > 0 ? 'erholter' : 'weniger erholt'} auf.`);
  DB.cfg.habits.forEach(h => { const on = d => (day(d).habits || {})[h.id]; cmp(md.filter(on).map(mv), md.filter(d => !on(d)).map(mv), 4, x => `An Tagen mit „${h.name}“ ist deine Stimmung im Schnitt ${df(x)} Punkte ${x > 0 ? 'höher' : 'niedriger'}.`); });
  if (md.length >= 14) { const g = {}; md.forEach(d => (g[parse(d).getDay()] || (g[parse(d).getDay()] = [])).push(mv(d))); const b = Object.entries(g).filter(e => e[1].length >= 2).sort((x, y) => avg(y[1]) - avg(x[1]))[0]; if (b) out.push(`${WDL[b[0]]} ist bisher dein bester Wochentag (Stimmung Ø ${f1(avg(b[1]))}).`); }
  return out;
}
const insightFor = d => { const a = insights(); return a.length ? a[dn(d) % a.length] : null; };
const insBox = d => { const t = insightFor(d); return `<div class="note"><small>Erkenntnis aus deinen Daten</small>${t ? esc(t) : 'Sobald etwa eine Woche zusammen ist, steht hier ein Zusammenhang aus deinen eigenen Einträgen.'}</div>`; };

/* ---------- Abend-Check-in: eine Frage pro Schritt ---------- */
const CI_N = 7;
const ACT_ORD = { wk: ['uni', 'arbeit', 'erled', 'haushalt', 'gelesen', 'erholung', 'prokr'], we: ['erholung', 'haushalt', 'gelesen', 'erled', 'uni', 'arbeit', 'prokr'] };
function actsFor(d) {
  const o = ACT_ORD[[0, 6].includes(parse(d).getDay()) ? 'we' : 'wk'], r = x => { const i = o.indexOf(x.id); return i < 0 ? 99 : i; };
  return (DB.cfg.acts || DEF_CFG.acts).filter(x => !x.hid).slice().sort((a, b) => r(a) - r(b));
}
const EV = { en: ['Energie', ['erschöpft', 'müde', 'mittel', 'wach', 'voller Energie']], an: ['Anspannung', ['ganz entspannt', 'entspannt', 'mittel', 'angespannt', 'sehr angespannt']],
  zf: ['Zufriedenheit mit dem Tag', ['sehr unzufrieden', 'unzufrieden', 'mittel', 'zufrieden', 'sehr zufrieden']], ko: ['Konzentration', ['sehr zerstreut', 'zerstreut', 'mittel', 'fokussiert', 'sehr fokussiert']],
  st: ['Stress durch Uni oder Arbeit', ['kein Stress', 'wenig', 'mittel', 'viel', 'sehr viel']] };
const JA = [['dl', 'Prüfung oder Deadline in ≤ 7 Tagen'], ['ereig', 'Wichtiges Ereignis'], ['streit', 'Streit oder Konflikt'], ['bild', 'Spät noch am Bildschirm'], ['weg', 'Woanders übernachtet']];
const HRS = ['unter 1 h', '1–3 h', '3–5 h', 'über 5 h'];
const SUP = [['vd', 'Vitamin D'], ['b12', 'Vitamin B12'], ['mg', 'Magnesiumbisglycinat'], ['kr', 'Kreatin']], KR_DEF = 6;
const krLab = v => String(v).replace('.', ',') + ' g';
function supBox(D) {
  const s = D.sup || {}, chk = gl('check', 'chk'), all = SUP.every(([k]) => s[k] != null);
  return `<div class="lbl">Hast du alle Supplemente genommen?</div><div class="chips sup">${SUP.map(([k, l]) => { const on = s[k] != null; return `<button class="chip ${on ? 'on on-g' : ''}" data-act="sup" data-id="${k}" aria-pressed="${on}"><span>${l}</span>${on ? chk : ''}</button>`; }).join('')}${all ? '' : `<button class="chip new" data-act="supall">${gl('check')}<span>Alle genommen</span></button>`}</div>
    ${s.kr != null ? `<div class="evbox"><div class="evtop"><b>Kreatin</b><span class="evlab">${krLab(s.kr)}</span></div><input type="range" class="mslider evs" min="0" max="20" step="1" value="${s.kr}" data-rng="sup.kr" aria-label="Kreatin in Gramm, 0 bis 20"></div>` : ''}`;
}
const evRows = (D, keys) => { const e = D.ev || {}; return keys.map(k => { const [lab, w] = EV[k]; return `<div class="evbox ${e[k] ? '' : 'unset'}"><div class="evtop"><b>${lab}</b><span class="evlab">${e[k] ? w[e[k] - 1] : 'Regler schieben'}</span></div><input type="range" class="mslider evs" min="1" max="5" step="1" value="${e[k] || 3}" data-rng="ev.${k}" aria-label="${lab} von ${w[0]} bis ${w[4]}"></div>`; }).join(''); };
function evBox(D) {
  const e = D.ev || {}, chk = gl('check', 'chk');
  return evRows(D, ['en', 'an']) + `<div class="chips evsick"><button class="chip ${e.krank ? 'on on-g' : ''}" data-act="krank" aria-pressed="${!!e.krank}"><span>Krank oder Beschwerden</span>${e.krank ? chk : ''}</button></div>`;
}
const didHas = (d, id) => ((day(d).did || {}).t || []).includes(id);
const didRun = (d, id) => { let n = 0; while (didHas(addDays(d, -n), id) && n < 400) n++; return n; };
function moSheet() {
  const D = day(S.date), sl = D.sleep || {}, m = D.mood || {}, a = moodAct(m), l = moodSorted(m), i = a ? Math.round(a.v) : 3;
  const uhr = sl.bed && sl.wake ? `${sl.bed}–${sl.wake} · ${fmtDur(sleepDur(sl))}` : '';
  return `<div class="a-sleep mo"><h3>Guten Morgen</h3>${uhr ? `<small class="mut">Von der Uhr: ${uhr}</small>` : ''}
    <div class="lbl">Wie erholt fühlst du dich?</div>${restFaces(sl)}
    <div class="lbl">Wie schnell bist du eingeschlafen?</div>${chips([['schnell', 'schnell'], ['normal', 'normal'], ['lange', 'lange gebraucht']], sl.fall, 'sfall')}</div>
    <div class="a-mood mo"><div class="lbl">Stimmung und Energie gerade</div>
    <div class="moodbox ${a ? '' : 'unset'}"><div class="moodtop"><span class="moodemo" id="mood-e">${face(i)}</span><span class="grow mlab" id="mood-l">${a ? moodTxt(a) : 'Finger aufs Feld legen'}</span></div>${moodField(l, a)}</div></div>
    <div class="a-sleep mo"><div class="lbl">Träume oder Notiz zur Nacht</div><textarea data-f="sleep.note" placeholder="Optional">${esc(sl.note || '')}</textarea></div>
    <div class="row ci-nav"><button class="btn pri grow" data-act="modone">Fertig</button></div>`;
}
function ciSheet() {
  const d = S.date, D = day(d), i = S.ci.step, isT = d === todayStr(), m = D.mood || {}, H = D.habits || {}, sp = D.sport || [], chk = gl('check', 'chk');
  if (i >= CI_N) {
    const L = fbList(d).filter((x, k, arr) => arr.findIndex(y => (y.g || y.a) === (x.g || x.a)) === k).slice(0, 3); if (isT) fbMark(d, L.map(x => x.id));
    return `<div class="ci-done a-habit"><div class="tile on-g goal">${tile('habit')}</div><h3>Geschafft</h3><span class="mut">${isT ? 'Dein Tag ist eingetragen.' : 'Der Tag ist eingetragen.'}</span></div>
      ${L.map(x => `<div class="fbrow a-${x.a}"><div class="tile on-g">${tile(x.a)}</div><span>${esc(x.t)}</span></div>`).join('')}
      ${insBox(d)}<div class="row ci-nav"><button class="btn pri grow" data-act="sclose">Schließen</button></div>`;
  }
  const top = `<div class="ci-top"><span>Check-in · ${i + 1} von ${CI_N}</span><div class="bar"><i style="width:${(i + 1) / CI_N * 100}%"></i></div></div>`;
  const nav = `<div class="row ci-nav">${i ? '<button class="btn" data-act="ciprev">Zurück</button>' : ''}<button class="btn pri grow" data-act="cinext">${i === CI_N - 1 ? 'Fertig' : 'Weiter'}</button></div>`;
  let b = '';
  if (i === 0) {
    const a = moodAct(m), l = moodSorted(m), v = a ? a.v : l.length ? l[l.length - 1].v : 3, n = Math.round(v);
    b = `<div class="a-mood"><h3>Wie geht es dir ${isT ? 'gerade' : 'an diesem Tag'}?</h3><div class="moodbox ${a ? '' : 'unset'}"><div class="moodtop"><span class="moodemo">${face(n)}</span><span class="grow mlab">${a ? MOOD_N[n - 1] + ' · ' + f1(v) : 'Regler schieben'}</span></div>
      <input type="range" class="mslider" min="1" max="5" step="0.1" value="${v}" data-rng="mood" aria-label="Stimmung von sehr schlecht bis sehr gut"></div>${l.length && !a ? `<small class="hint">Heute schon eingetragen: ${l.map(x => f1(x.v)).join(', ')}. Schieben legt einen weiteren Eintrag an, sonst einfach weiter.</small>` : ''}${evBox(D)}</div>`;
  } else if (i === 1) {
    b = `<div class="a-mood"><h3>Welche Gefühle passen dazu?</h3>${tagChips(m)}</div>`;
  } else if (i === 2) {
    const dd = D.did || {}, t = dd.t || [];
    b = `<div class="a-habit"><h3>Was hast du ${isT ? 'heute' : 'an diesem Tag'} so gemacht?</h3><div class="hgrid">${actsFor(d).map(x => { const on = t.includes(x.id); return `<button class="hab pos ${on ? 'on on-g' : ''}" data-act="did" data-id="${x.id}" aria-pressed="${on}">${ic(x.i)}<span>${esc(x.name)}</span>${on ? chk : ''}</button>`; }).join('')}</div>
      ${['uni', 'arbeit'].filter(k => t.includes(k)).map(k => `<div class="lbl">${k === 'uni' ? 'Uni' : 'Arbeit'} · wie lange etwa?</div><div class="chips hrs">${HRS.map((l, n) => { const on = (dd.h || {})[k] === n + 1; return `<button class="chip ${on ? 'on on-g' : ''}" data-act="dhrs" data-id="${k}" data-v="${n + 1}" aria-pressed="${on}"><span>${l}</span></button>`; }).join('')}</div>`).join('')}
      <textarea data-f="did.note" placeholder="Sonst noch was? Frei schreiben …">${esc(dd.note || '')}</textarea></div>`;
  } else if (i === 3) {
    const e = D.ev || {}, w = (D.did || {}).t || [];
    b = `<div class="a-mood"><h3>Wie war dein Tag?</h3>${evRows(D, ['zf', 'ko'].concat(w.includes('uni') || w.includes('arbeit') || e.st ? ['st'] : []))}
      <div class="chips evsick">${JA.map(([k, l]) => `<button class="chip ${e[k] ? 'on on-g' : ''}" data-act="ja" data-id="${k}" aria-pressed="${!!e[k]}"><span>${l}</span>${e[k] ? chk : ''}</button>`).join('')}</div><small class="hint">Nur antippen, was zutrifft.</small></div>`;
  } else if (i === 4) {
    const g = type => { const v = DB.cfg.habits.filter(h => h.type === type && (!h.hid || H[h.id])); return v.length ? `<div class="hgrid">${v.map(h => `<button class="hab ${h.type} ${H[h.id] ? 'on on-g' : ''}" data-act="hab" data-id="${h.id}" aria-pressed="${!!H[h.id]}">${ic(itIc('habits', h))}<span>${esc(h.name)}</span>${H[h.id] ? chk : ''}</button>`).join('')}</div>` : ''; };
    b = `<div class="a-habit"><h3>Was hast du heute geschafft?</h3>${g('pos')}<div class="lbl">Und was ist passiert?</div>${g('neg')}${supBox(D)}</div>`;
  } else if (i === 5) {
    b = `<div class="a-sport"><h3>Hast du dich bewegt?</h3><div class="chips">${DB.cfg.sports.filter(x => !x.hid).map(x => { const n = sp.filter(e => e.name === x.name).length; return `<button class="chip ${n ? 'on on-g' : ''}" data-act="sadd" data-id="${x.id}">${ic(itIc('sports', x))}<span>${esc(x.name)}</span>${n > 1 ? `<b class="cnt">${n}×</b>` : n ? chk : ''}</button>`; }).join('')}</div><small class="hint">Nichts dabei? Einfach weiter.</small></div>`;
  } else {
    const q = QS[(S.qi[d] ?? (parse(d).getTime() / 864e5 | 0)) % QS.length], qa = (m.qa && m.qa[0]) || {};
    b = `<div class="a-mood"><h3>${esc(q)}</h3><textarea data-f="mood.qa" data-q="${esc(q)}" placeholder="Ein Satz reicht. Oder leer lassen.">${esc(qa.a || '')}</textarea></div>`;
  }
  return top + b + nav;
}

/* ---------- Wochenrückblick ---------- */
function wrDue() {
  const t = todayStr(), wd = parse(t).getDay(), w = wd === 0 && new Date().getHours() >= 12 ? weekStart(t) : (wd === 1 || wd === 2) ? addDays(weekStart(t), -7) : null;
  if (!w || (DB.weeks[w] || {}).done) return null;
  return Array.from({ length: 7 }, (_, i) => addDays(w, i)).some(x => Object.keys(day(x)).length) ? w : null;
}
function wrSheet() {
  const { w, step: i } = S.wr, o = DB.weeks[w] || {}, dates = Array.from({ length: 7 }, (_, k) => addDays(w, k));
  const top = `<div class="ci-top"><span>Wochenrückblick KW ${isoWeek(w)} · ${i + 1} von 3</span><div class="bar"><i style="width:${(i + 1) / 3 * 100}%"></i></div></div>`;
  const nav = `<div class="row ci-nav">${i ? '<button class="btn" data-act="wrprev">Zurück</button>' : ''}<button class="btn pri grow" data-act="wrnext">${i === 2 ? 'Fertig' : 'Weiter'}</button></div>`;
  let b;
  if (i === 0) {
    const a = wstats(dates), p = wstats(dates.map(x => addDays(x, -7))), plan = (DB.weeks[addDays(w, -7)] || {}).plan;
    const dl = (x, y, u, fx = f1) => x == null || y == null || Math.abs(x - y) < .05 ? '' : ` <small>${x > y ? '+' : '−'}${fx(Math.abs(x - y))}${u}</small>`, r0 = v => Math.round(v);
    const hp = DB.cfg.habits.filter(h => h.type === 'pos').reduce((n, h) => n + dates.filter(d => (day(d).habits || {})[h.id]).length, 0);
    b = `<div class="a-sleep"><h3>Deine Woche in Zahlen</h3>
      <div class="kv"><span>Stimmung</span><span>${a.moodAvg == null ? '–' : 'Ø ' + f1(a.moodAvg)}${dl(a.moodAvg, p.moodAvg, '')}</span></div>
      <div class="kv"><span>Schlaf</span><span>${a.durAvg == null ? '–' : 'Ø ' + fmtDur(a.durAvg)}${dl(a.durAvg, p.durAvg, ' min', r0)}</span></div>
      <div class="kv"><span>Koffein</span><span>${a.cofAvg == null ? '–' : 'Ø ' + r0(a.cofAvg) + ' mg'}${dl(a.cofAvg, p.cofAvg, ' mg', r0)}</span></div>
      <div class="kv"><span>Sport</span><span>${a.sportN}× an ${a.sportDays} ${a.sportDays === 1 ? 'Tag' : 'Tagen'}${dl(a.sportN, p.sportN, '', r0)}</span></div>
      <div class="kv"><span>Positive Gewohnheiten</span><span>${hp} Haken</span></div>
      <small class="hint">Kleine Zahl: Unterschied zur Vorwoche. ${a.tr} von 7 Tagen mit Einträgen.</small>
      ${plan ? `<div class="note"><small>Dein Vorsatz für diese Woche war</small>${esc(plan)}</div>` : ''}${insBox(w)}</div>`;
  } else if (i === 1) {
    b = `<div class="a-mood"><h3>Wie war die Woche insgesamt?</h3><div class="smileys">${MOOD_N.map((n, k) => { const on = o.v === k + 1; return `<button class="sm ${on ? 'on' : ''}" data-act="wrrate" data-v="${k + 1}" aria-label="${n}" aria-pressed="${on}">${face(k + 1)}${on ? `<i class="badge">${gl('check')}</i>` : ''}</button>`; }).join('')}</div>
      <div class="lbl">Was war der schönste Moment?</div><textarea data-wr="best" placeholder="Daran erinnere ich dich, wenn es mal nicht so läuft.">${esc(o.best || '')}</textarea></div>`;
  } else {
    b = `<div class="a-habit"><h3>Blick nach vorn</h3><div class="lbl" style="margin-top:0">Was war schwierig?</div><textarea data-wr="hard" placeholder="Kurz, oder leer lassen.">${esc(o.hard || '')}</textarea>
      <div class="lbl">Was nimmst du dir für die nächste Woche vor?</div><textarea data-wr="plan" placeholder="Eine Sache reicht.">${esc(o.plan || '')}</textarea></div>`;
  }
  return top + b + nav;
}

/* ---------- Zeitrad (5-Minuten-Schritte) ---------- */
const TPI = 40, TP = { on: false };
function openTime(o) {
  Object.assign(TP, { on: true, touched: false, canClear: true, back: false }, o);
  let [h, m] = (o.orig || o.def || '07:00').split(':').map(Number), m5 = Math.round(m / 5);
  if (m5 === 12) { m5 = 0; h = Math.min(23, h + 1); }
  TP.h = h; TP.m5 = m5;
  openSheet(`<div class="tp-head"><b>${esc(o.title)}</b><button class="tp-ok" data-act="tpdone" aria-label="Übernehmen">${gl('check')}</button></div>
    <div class="tp-wheel"><div class="tp-band"></div>
      <div class="tp-col" id="tp-h">${Array.from({ length: 24 }, (_, i) => `<div class="tp-i" data-i="${i}">${pad(i)}</div>`).join('')}</div>
      <div class="tp-sep">:</div>
      <div class="tp-col" id="tp-m">${Array.from({ length: 12 }, (_, i) => `<div class="tp-i" data-i="${i}">${pad(i * 5)}</div>`).join('')}</div></div>
    <div class="row" style="justify-content:center"><button class="btn" data-act="tpnow">Jetzt</button>${TP.canClear ? '<button class="btn" data-act="tpclear">Leeren</button>' : ''}</div>
    <div class="tp-note">Mit dem Häkchen oder Tippen neben das Fenster übernehmen</div>`);
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
  const apply = TP.apply; TP.on = false;
  closeSheet(); apply(val); render();
}
function addCoffee(c, z) {
  sec(S.date, 'coffee').push({ id: uid(), t: S.date === todayStr() ? nowT() : '09:00', k: c.id, name: c.name + (z && z.l && c.sizes.length > 1 ? ' ' + z.l : ''), mg: z ? z.mg : c.mg, e: c.e, i: itIc('coffee', c) });
  save(); if (coffeeMg(S.date) > DB.cfg.limit) toast('Über deinem Koffein-Limit');
}
/* Bearbeiten-Fenster für Getränke, Sportarten und Gewohnheiten (öffnet per langem Drücken oder aus den Einstellungen) */
function openEdit(kind, id, type) {
  const it = DB.cfg[kind] && DB.cfg[kind].find(x => x.id === id);
  if (!it && id !== '_new') return;
  S.ed = { kind, id, d: it ? JSON.parse(JSON.stringify(it)) : kind === 'coffee' ? { name: '', e: '☕', i: 'tasse', mg: 50 } : kind === 'sports' ? { name: '', e: '🏅', i: 'medaille' } : { name: '', e: type === 'neg' ? '⚠️' : '✅', i: type === 'neg' ? 'punkt' : 'haken', type: type === 'neg' ? 'neg' : 'pos' } };
  openSheet(editSheet());
}
function editSheet() {
  const { kind, id, d } = S.ed, isNew = id === '_new', T = { coffee: 'Getränk', sports: 'Sportart', habits: 'Gewohnheit' }[kind], cur = itIc(kind, d);
  let h = `<div class="${AREA[kind]}"><h3>${isNew ? 'Neu: ' + T : T + ' bearbeiten'}</h3>
  <input type="text" placeholder="Name" value="${esc(d.name || '')}" data-ed="name" aria-label="Name">
  <div class="lbl">Symbol</div>
  <div class="icpick">${IC_SETS[kind].map(n => `<button class="${n === cur ? 'on on-g' : ''}" data-act="edic" data-v="${n}" aria-label="Symbol ${n}" aria-pressed="${n === cur}">${ic(n)}</button>`).join('')}</div>`;
  if (kind === 'coffee') {
    if (d.sizes && d.sizes.length) h += `<div class="lbl">Größen (Bezeichnung und mg Koffein). Die erste ist der Standard.</div>
      ${d.sizes.map((z, i) => `<div class="setrow"><input type="text" placeholder="z. B. 0,5 l" value="${esc(z.l || '')}" data-edsz="${i}" data-p="l"><input type="number" inputmode="numeric" value="${z.mg ?? ''}" data-edsz="${i}" data-p="mg" aria-label="mg"><button class="x" data-act="edszdel" data-i="${i}" aria-label="Größe entfernen">${gl('close')}</button></div>`).join('')}
      <button class="btn" data-act="edszadd">Größe hinzufügen</button>`;
    else h += `<div class="lbl">Koffein (mg)</div><input type="number" inputmode="numeric" value="${d.mg ?? ''}" data-ed="mg" aria-label="Koffein in mg">
      <div class="sub"><button class="btn" data-act="edszadd">Größen anlegen (z. B. 0,33 l und 0,5 l)</button></div>`;
  }
  if (kind === 'habits') h += `<div class="lbl">Art</div>${chips([['pos', 'Positiv'], ['neg', 'Negativ']], d.type, 'edtype')}`;
  h += `<div class="row" style="margin-top:var(--s-3)"><button class="btn pri grow" data-act="edsave">Speichern</button><button class="btn" data-act="sclose">Abbrechen</button></div>`;
  if (!isNew) h += `<div class="row sub"><button class="btn grow" data-act="edhide">${d.hid ? 'Wieder einblenden' : 'Verstecken'}</button><button class="btn danger" data-act="eddel">Löschen</button></div>
    <small class="hint">Bereits eingetragene Tage bleiben erhalten.</small>`;
  return h + '</div>';
}
function doImport(mode) {
  const txt = $('#imp').value.trim();
  if (!txt) { S.impMsg = 'Nichts eingefügt.'; return; }
  let j; try { j = JSON.parse(txt.replace(/^```(?:json)?|```$/gm, '').trim()); } catch (e) { S.impMsg = 'Das ist kein gültiges JSON. Bitte genau so einfügen, wie Claude es ausgegeben hat.'; return; }
  if (!j || typeof j.days !== 'object') { S.impMsg = 'Kein Tracker-Format (es fehlt „days“).'; return; }
  const bad = Object.keys(j.days).filter(k => !/^\d{4}-\d{2}-\d{2}$/.test(k));
  if (bad.length) { S.impMsg = 'Ungültiges Datum: ' + bad[0]; return; }
  if (mode === 'replace') { DB = norm({ v: 1, days: j.days, cfg: j.cfg, weeks: j.weeks }); }
  else {
    let n = 0;
    for (const [d, X] of Object.entries(j.days)) {
      const T = day(d, true); n++;
      for (const [k, v] of Object.entries(X || {})) {
        if (k === 'mood' && v && v.log && T.mood && moodLog(T.mood).length) { const l = moodLog(T.mood).slice(); v.log.forEach(e => { if (!l.some(x => x.id === e.id)) l.push(e); }); T.mood = Object.assign(T.mood, v, { log: l }); moodSync(T.mood); }
        else if (k === 'sleep' || k === 'mood') T[k] = Object.assign(T[k] || {}, v);
        else if (k === 'habits') T.habits = Object.assign(T.habits || {}, v);
        else if (k === 'coffee' || k === 'sport') { T[k] = T[k] || []; (v || []).forEach(e => { e.id = e.id || uid(); if (!T[k].some(x => x.id === e.id)) T[k].push(e); }); }
        else if (k === 'note') T.note = v;
        else if (k === 'ci') T.ci = v;
      }
      if (T.sleep && T.sleep.bed && T.sleep.wake) T.sleep.dur = sleepDur(T.sleep);
    }
    if (j.weeks && typeof j.weeks === 'object') Object.assign(DB.weeks, j.weeks);
    if (j.cfg && j.v === 1) { /* Einstellungen bei „Zusammenführen“ bewusst unverändert */ }
    S.impMsg = `${n} ${n === 1 ? 'Tag' : 'Tage'} übernommen.`;
  }
  if (mode === 'replace') S.impMsg = 'Alle Daten ersetzt.';
  save();
}

/* ---------- Events ---------- */
/* Langes Drücken auf Getränk, Sportart oder Gewohnheit öffnet das kleine Menü */
const LP = { t: 0, fired: false, x: 0, y: 0 };
let CG = null;
function cgAt(svg, e) {
  const r = svg.getBoundingClientRect(), g = svg.dataset, W = +g.w, pl = +g.pl, pr = +g.pr;
  let t = 360 + ((e.clientX - r.left) / r.width * W - pl) / (W - pl - pr) * 1440; t = Math.round(Math.min(1800, Math.max(360, t)) / 5) * 5;
  const v = caffeineAt(g.d, t), X = pl + (t - 360) / 1440 * (W - pl - pr), Y = +g.pt + (+g.ph) * (1 - Math.min(1, v / +g.mx));
  const l = $('#cg-l', svg), c = $('#cg-c', svg); l.setAttribute('x1', X); l.setAttribute('x2', X); c.setAttribute('cx', X); c.setAttribute('cy', Y); $('#cg-g', svg).removeAttribute('display');
  $('#cg-lab').textContent = `Um ${clockM(t)} Uhr${t >= 1440 ? ' (Folgetag)' : ''} noch im Körper`; $('#cg-val').textContent = '≈ ' + Math.round(v) + ' mg';
}
function cgEnd() {
  if (!CG) return; const svg = CG; CG = null; markSeen('cg');
  if (!svg.isConnected) return;
  $('#cg-g', svg).setAttribute('display', 'none'); $('#cg-lab').textContent = 'Um 22 Uhr noch im Körper'; $('#cg-val').textContent = '≈ ' + svg.dataset.bed + ' mg';
}
document.addEventListener('pointerdown', e => {
  LP.fired = false; clearTimeout(LP.t);
  const svg = e.target.closest && e.target.closest('svg.cgraph');
  if (svg) { CG = svg; try { svg.setPointerCapture(e.pointerId); } catch (x) { } cgAt(svg, e); return; }
  const el = e.target.closest && e.target.closest('[data-lp]'); if (!el) return;
  LP.x = e.clientX; LP.y = e.clientY;
  LP.t = setTimeout(() => { LP.fired = true; const [k, id] = el.dataset.lp.split('|'); try { navigator.vibrate && navigator.vibrate(8); } catch (x) { } openMenu(k, id, el); }, 480);
});
document.addEventListener('pointermove', e => {
  if (CG) { cgAt(CG, e); return; }
  if (Math.abs(e.clientX - LP.x) > 10 || Math.abs(e.clientY - LP.y) > 10) clearTimeout(LP.t);
});
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(LP.t); cgEnd(); }));
/* Solange die Koffein-Kurve abgetastet wird, scrollt die Seite nicht */
document.addEventListener('touchmove', e => { if (CG && e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-lp], svg.cgraph')) e.preventDefault(); });
function moodCommit(t) { moodSet(Number(t.value)); }
/* Stimmungsfeld: Finger auflegen und bewegen, erst Loslassen trägt ein */
const MF = {};
function mfPos(f, ev) { const r = f.getBoundingClientRect(), x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)); return { x, y, v: 1 + 4 * x, e: 5 - 4 * y }; }
function mfMove(ev) {
  const p = mfPos(MF.f, ev), d = $('.mpt.live', MF.f), i = Math.round(p.v);
  d.hidden = false; d.style.left = p.x * 100 + '%'; d.style.top = p.y * 100 + '%'; d.style.setProperty('--c', `var(--f${i})`); MF.f.classList.add('drag');
  const bx = MF.f.closest('.moodbox'); bx.classList.remove('unset', 'idle'); const fe = $('#mood-e', bx);
  if (fe.dataset.n !== String(i)) { fe.innerHTML = face(i); fe.dataset.n = i; }
  $('#mood-l', bx).textContent = moodTxt({ v: Math.round(p.v * 10) / 10, e: p.e });
}
document.addEventListener('pointerdown', ev => { const f = ev.target.closest && ev.target.closest('#mfield'); if (!f) return; ev.preventDefault(); try { f.setPointerCapture(ev.pointerId); } catch (x) { } MF.f = f; MF.id = ev.pointerId; mfMove(ev); });
document.addEventListener('pointermove', ev => { if (MF.f && ev.pointerId === MF.id) mfMove(ev); });
document.addEventListener('pointerup', ev => { if (!MF.f || ev.pointerId !== MF.id) return; const p = mfPos(MF.f, ev); MF.f = null; moodSet(p.v, p.e); });
document.addEventListener('pointercancel', ev => { if (MF.f && ev.pointerId === MF.id) { MF.f = null; render(); } });
function moodSet(v, en) {
  v = Math.round(v * 10) / 10; if (!(v >= 1 && v <= 5)) return;
  const o = sec(S.date, 'mood'); let e = moodAct(o);
  if (!o.log) o.log = moodLog(o);
  if (e) e = o.log.find(x => x.id === e.id);
  if (!e) { e = { id: uid(), t: S.date === todayStr() ? nowT() : '', v }; o.log.push(e); if (o.log.length > 2) markSeen('mood'); }
  e.v = v; if (en != null) e.e = Math.round(en * 10) / 10; S.ma = { id: e.id, d: S.date, at: Date.now() };
  moodSync(o); save(); render();
  if (S.ci || S.mo) $('#sbody').innerHTML = S.ci ? ciSheet() : moSheet(); else fbCheck('mood');
}
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.k) S.dk[d.dataset.k] = d.open; }, true);
document.addEventListener('click', e => {
  if (LP.fired) { LP.fired = false; e.preventDefault(); return; }
  if (e.target.dataset && e.target.dataset.rng === 'mood') { moodCommit(e.target); return; }
  if (e.target.dataset && e.target.dataset.rng && e.target.dataset.rng.startsWith('ev.')) { sec(S.date, 'ev')[e.target.dataset.rng.slice(3)] = Number(e.target.value); save(); const bx = e.target.closest('.evbox'); $('.evlab', bx).textContent = EV[e.target.dataset.rng.slice(3)][1][e.target.value - 1]; bx.classList.remove('unset'); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  e.preventDefault();
  const fn = A[el.dataset.act]; if (!fn) return;
  const act = el.dataset.act, key = el.dataset.id || el.dataset.v || '', goalBefore = act === 'hab' && habGoal();
  const r = fn(el);
  if (r !== 'noRender') {
    const open = [...document.querySelectorAll('details[open] summary')].map(s => s.textContent.trim());
    render();
    document.querySelectorAll('details summary').forEach(s => { if (open.includes(s.textContent.trim()) || (keepOpen && s.textContent.trim().toLowerCase().startsWith({ coffee: 'koffein', sports: 'sportarten', habits: 'gewohnheiten' }[keepOpen] || '#'))) s.parentElement.open = true; });
    keepOpen = null;
    if (S.ci || S.mo) $('#sbody').innerHTML = S.ci ? ciSheet() : moSheet();
    else { const fa = { hab: 'habit', sadd: 'sport', cadd: 'coffee', csize: 'coffee', srate: 'sleep', copyday: el.dataset.kind }[act]; if (fa) fbCheck(fa); }
    if (['hab', 'sadd', 'cadd', 'csize', 'srate', 'tag', 'sfall', 'swakes', 'smorning'].includes(act) && key) { const n = document.querySelector(`#app .on[data-id="${CSS.escape(key)}"], #app .on[data-v="${CSS.escape(key)}"]`); if (n) n.classList.add('pop'); }
    if (act === 'hab' && !goalBefore && habGoal()) { const t = $('.a-habit .tile'); if (t) t.classList.add('goal'); }
    if (act === 'tab' || act === 'dprev' || act === 'dnext' || act === 'dtoday') { const a = $('#app'); a.classList.remove('enter'); void a.offsetWidth; a.classList.add('enter'); }
  }
});
/* Tagesziel: alle sichtbaren positiven Gewohnheiten erledigt */
function habGoal() { const v = DB.cfg.habits.filter(h => h.type === 'pos' && !h.hid), H = day(S.date).habits || {}; return v.length > 0 && v.every(h => H[h.id]); }
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.rng === 'mood') { moodCommit(t); return; }
  if (t.dataset.rng && t.dataset.rng.startsWith('ev.')) { sec(S.date, 'ev')[t.dataset.rng.slice(3)] = Number(t.value); save(); return; }
  if (t.dataset.rng === 'sup.kr') { sec(S.date, 'sup').kr = Number(t.value); save(); return; }
  if (t.dataset.rng === 'mood.kopf') { sec(S.date, 'mood').kopf = Number(t.value); save(); return; }
  if (t.dataset.ed || t.dataset.edsz) return;
  if (t.dataset.f === 'coffeet') { const c = sec(S.date, 'coffee').find(x => x.id === t.dataset.id); if (c) { c.t = t.value || c.t; save(); } return; }
  if (t.dataset.f && t.type !== 'textarea') { setField(t.dataset.f, t.value, t); return; }
  if (t.dataset.cfg) {
    const it = DB.cfg[t.dataset.cfg].find(x => x.id === t.dataset.id); if (!it) return;
    it[t.dataset.p] = t.type === 'number' ? (Number(t.value) || 0) : t.value; if (t.dataset.p === 'mg') delete it.est; save();
    if (t.dataset.p === 'type') toast('Gespeichert');
    return;
  }
  if (t.dataset.sync) { const c = syncCfg(); c[t.dataset.sync] = t.value.trim(); localStorage.setItem(SYNC_KEY, JSON.stringify(c)); toast('Gespeichert'); return; }
  if (t.dataset.cfgv) { const k = t.dataset.cfgv, v = Number(t.value); DB.cfg[k] = k === 'halfLife' ? Math.min(12, Math.max(1, v || 6)) : (v || 400); save(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.sync === 'key') t.closest('.pw').classList.toggle('has', !!t.value);
  if (t.dataset.f && t.tagName === 'TEXTAREA') setField(t.dataset.f, t.value.trim() ? t.value : '', t);
  if (t.dataset.rng === 'mood') { const v = Number(t.value), i = Math.round(v), bx = t.closest('.moodbox'), fe = $('.moodemo', bx); if (fe.dataset.n !== String(i)) { fe.innerHTML = face(i); fe.dataset.n = i; } $('.mlab', bx).textContent = MOOD_N[i - 1] + ' · ' + f1(v); bx.classList.remove('unset', 'idle'); }
  if (t.dataset.rng === 'sup.kr') $('.evlab', t.closest('.evbox')).textContent = krLab(t.value);
  if (t.dataset.rng === 'mood.kopf') $('.evlab', t.closest('.evbox')).textContent = KOPF_N[t.value - 1];
  if (t.dataset.rng && t.dataset.rng.startsWith('ev.')) { const bx = t.closest('.evbox'); $('.evlab', bx).textContent = EV[t.dataset.rng.slice(3)][1][t.value - 1]; bx.classList.remove('unset'); }
  if (t.dataset.cfgt) { if (t.value.trim()) DB.cfg[t.dataset.cfgt] = t.value; else delete DB.cfg[t.dataset.cfgt]; save(); }
  if (t.dataset.wr && S.wr) { const o = DB.weeks[S.wr.w] || (DB.weeks[S.wr.w] = {}); if (t.value.trim()) o[t.dataset.wr] = t.value; else delete o[t.dataset.wr]; save(); }
  if (t.dataset.ed && S.ed) S.ed.d[t.dataset.ed] = t.type === 'number' ? Number(t.value) : t.value;
  if (t.dataset.edsz && S.ed && S.ed.d.sizes) { const z = S.ed.d.sizes[+t.dataset.edsz]; if (z) z[t.dataset.p] = t.type === 'number' ? Number(t.value) : t.value; }
});

/* Wetter: direkt von Open-Meteo (kostenlos, ohne Schlüssel). Zwischenspeicher tracker-wx, gilt 30 Min. */
const WX_ORTE = { gps: ['Standort'], muc: ['München', 48.14, 11.58], ros: ['Rosenheim', 47.86, 12.12], gap: ['Garmisch-Partenkirchen', 47.49, 11.10] };
const WX = { busy: false, c: null };
function wxCache() { if (!WX.c) { try { WX.c = JSON.parse(localStorage.getItem('tracker-wx')) || {}; } catch (e) { WX.c = {}; } } return WX.c; }
function wxStore() { try { localStorage.setItem('tracker-wx', JSON.stringify(WX.c)); } catch (e) { } }
function wxInfo(code, night) {
  const c = +code;
  if (c <= 1) return [night ? 'w_moon' : 'w_sun', c ? 'Überwiegend klar' : 'Klar'];
  if (c === 2) return [night ? 'w_moonc' : 'w_part', 'Teils bewölkt'];
  if (c === 3) return ['w_cloud', 'Bedeckt'];
  if (c < 50) return ['w_fog', 'Nebel'];
  if (c < 60) return ['w_rain', 'Nieselregen'];
  if (c < 70) return ['w_rain', 'Regen'];
  if (c < 80) return ['w_snow', 'Schnee'];
  if (c < 85) return ['w_rain', 'Regenschauer'];
  if (c < 90) return ['w_snow', 'Schneeschauer'];
  return ['w_storm', 'Gewitter'];
}
function wxPos() {
  const loc = DB.cfg.wxLoc || 'gps', o = WX_ORTE[loc] || WX_ORTE.muc;
  if (loc !== 'gps') return Promise.resolve({ lat: o[1], lon: o[2], name: o[0] });
  const muc = () => ({ lat: 48.14, lon: 11.58, name: 'München', fail: 1 });
  if (!navigator.geolocation) return Promise.resolve(muc());
  return new Promise(res => navigator.geolocation.getCurrentPosition(
    p => res({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2), name: 'Aktueller Standort' }),
    () => res(muc()), { timeout: 10000, maximumAge: 36e5 }));
}
async function wxLoad(force) {
  const c = wxCache(), loc = DB.cfg.wxLoc || 'gps';
  if (WX.busy || (!force && c.loc === loc && c.data && c.data.hourly && c.data.hourly.precipitation && Date.now() - c.at < 18e5)) return;
  WX.busy = true;
  try {
    const p = await wxPos();
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&timezone=Europe%2FBerlin&past_days=7&forecast_days=8`
      + '&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunshine_duration,sunrise,sunset';
    const r = await fetch(u, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    WX.c = { loc, at: Date.now(), name: p.name, fail: p.fail || 0, data: await r.json() }; wxStore();
  } catch (e) { WX.c.err = 1; }
  WX.busy = false;
  const b = $('#wxb'); if (b) b.outerHTML = wxBtn(S.date);
  if (S.wxs) $('#sbody').innerHTML = wxSheet();
}
function wxDay(d) {
  const x = (wxCache().data || {}).daily; if (!x) return null;
  const i = x.time.indexOf(d); if (i < 0) return null;
  return { d, code: x.weather_code[i], max: x.temperature_2m_max[i], min: x.temperature_2m_min[i], rain: x.precipitation_sum[i], rp: x.precipitation_probability_max[i], sun: x.sunshine_duration[i], up: x.sunrise[i], down: x.sunset[i] };
}
const deg = v => v == null ? '–' : Math.round(v) + '°';
function wxBtn(d) {
  const w = wxDay(d);
  if (!w) return d === todayStr() && WX.busy ? '<button class="wxb" id="wxb" data-act="wxopen" aria-label="Wetter"></button>' : '<i id="wxb" hidden></i>';
  const [icn, txt] = wxInfo(w.code);
  return `<button class="wxb" id="wxb" data-act="wxopen" aria-label="Wetter: ${txt}, bis ${deg(w.max)}">${gl(icn)}<b>${deg(w.max)}</b></button>`;
}
const mm = v => String(Math.round(v * 10) / 10).replace('.', ',') + ' mm';
function wxRain(H, sd) {
  const L = H.time.map((t, i) => ({ h: +t.slice(11, 13), t, mm: (H.precipitation || [])[i] || 0, p: H.precipitation_probability[i] || 0 })).filter(o => o.t.startsWith(sd));
  const win = []; let w = null;
  L.forEach(o => { if (o.mm >= 0.1) { if (!w) win.push(w = { a: o.h, b: o.h + 1, mm: 0, p: 0 }); w.b = o.h + 1; w.mm += o.mm; w.p = Math.max(w.p, o.p); } else w = null; });
  const maxP = Math.max(0, ...L.map(o => o.p)), sc = Math.max(1, ...L.map(o => o.mm));
  const txt = win.length ? win.map(w => `${w.a}–${w.b} Uhr · ${mm(w.mm)}${w.p ? ' · ' + w.p + ' %' : ''}`).join('<br>') : maxP >= 20 ? `kaum, höchstens ${maxP} %` : 'kein Regen erwartet';
  const bars = L.length ? `<div class="wxrain" aria-hidden="true">${L.map(o => `<i style="height:${o.mm >= 0.05 ? Math.max(4, o.mm / sc * 100) : 0}%;opacity:${(0.35 + 0.65 * o.p / 100).toFixed(2)}"></i>`).join('')}</div><div class="wxrax"><span style="left:0">0</span><span style="left:25%">6</span><span style="left:50%">12</span><span style="left:75%">18</span><span style="right:0">24 Uhr</span></div>` : '';
  return { txt, bars, any: win.length };
}
function wxSheet() {
  const c = wxCache(), x = c.data, d = S.date, loc = DB.cfg.wxLoc || 'gps', now = new Date(), td = todayStr();
  const chips = `<div class="chips wxorte">${Object.keys(WX_ORTE).map(k => `<button class="chip ${loc === k ? 'on' : ''}" data-act="wxloc" data-v="${k}" aria-pressed="${loc === k}">${k === 'gps' ? gl('pin') : ''}<span>${WX_ORTE[k][0]}</span></button>`).join('')}</div>`;
  const close = '<div class="row ci-nav"><button class="btn pri grow" data-act="sclose">Schließen</button></div>';
  if (!wxDay(d)) return `<h3>Wetter</h3>${chips}<p class="mut">${WX.busy ? 'Wird geladen …' : 'Für diesen Tag gibt es keine Wetterdaten.'}</p>${close}`;
  const tabsD = [0, 1, 2].map(k => addDays(d, k)).filter(wxDay), sd = tabsD.includes(S.wxd) ? S.wxd : d, w = wxDay(sd);
  const rel = t => t === td ? 'Heute' : t === addDays(td, 1) ? 'Morgen' : t === addDays(td, 2) ? 'Übermorgen' : t === addDays(td, -1) ? 'Gestern' : parse(t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const title = `<h3>Wetter<span>${parse(sd).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span></h3>`;
  const tabs = tabsD.length > 1 ? `<div class="chips wxtabs">${tabsD.map(t => `<button class="chip ${t === sd ? 'on' : ''}" data-act="wxday" data-d="${t}" aria-pressed="${t === sd}"><span>${rel(t)}</span></button>`).join('')}</div>` : '';
  const isToday = sd === td, cur = isToday && x.current, [icn, txt] = cur ? wxInfo(cur.weather_code, !cur.is_day) : wxInfo(w.code);
  const hm = s => s ? s.slice(11, 16) : '–', H = x.hourly, R = wxRain(H, sd);
  const big = `<div class="wxbig">${gl(icn)}<div class="grow"><b>${cur ? deg(x.current.temperature_2m) : deg(w.max)}</b><span>${txt}</span></div><div class="wxmm"><span>${deg(w.max)}</span><small>${deg(w.min)}</small></div></div>`;
  const rain = `<h4>Regen</h4><div class="kv"><span>Gesamt</span><span>${w.rain == null ? '–' : mm(w.rain)}${w.rp != null ? ' · ' + w.rp + ' %' : ''}</span></div><div class="kv wxwhen"><span>Wann</span><span>${R.txt}</span></div>${R.any ? R.bars : ''}`;
  const kv = `<div class="kv"><span>Höchst / Tiefst</span><span>${deg(w.max)} / ${deg(w.min)}</span></div>
    <div class="kv"><span>Sonne</span><span>${w.sun == null ? '–' : String(Math.round(w.sun / 360) / 10).replace('.', ',') + ' h'}</span></div>
    <div class="kv"><span>Sonnenaufgang</span><span>${hm(w.up)} Uhr</span></div>
    <div class="kv"><span>Sonnenuntergang</span><span>${hm(w.down)} Uhr</span></div>`;
  const h0 = isToday ? now.getHours() : 0;
  const hrs = H.time.map((t, i) => [t, i]).filter(([t]) => t.startsWith(sd) && +t.slice(11, 13) >= h0);
  const hours = hrs.length ? `<h4>Stundenverlauf</h4><div class="wxhrs">${hrs.map(([t, i]) => { const [hi] = wxInfo(H.weather_code[i], !H.is_day[i]), p = H.precipitation_probability[i], r = (H.precipitation || [])[i] || 0, nw = isToday && +t.slice(11, 13) === h0; return `<div class="${nw ? 'now' : ''}"><small>${nw ? 'Jetzt' : t.slice(11, 13) + ' Uhr'}</small>${gl(hi)}<b>${deg(H.temperature_2m[i])}</b><small class="rp">${p >= 10 ? p + ' %' : ''}</small><small class="rp">${r >= 0.1 ? mm(r) : ''}</small></div>`; }).join('')}</div>` : '';
  const next = [3, 4, 5].map(k => wxDay(addDays(d, k))).filter(Boolean);
  const days = next.length ? `<h4>Weitere Tage</h4>${next.map(n => { const [ni, nt] = wxInfo(n.code); return `<div class="wxday">${gl(ni)}<span class="grow">${parse(n.d).toLocaleDateString('de-DE', { weekday: 'long' })}<small>${nt}${n.rp >= 10 ? ' · ' + n.rp + ' % Regen' : ''}${n.rain >= 0.1 ? ' · ' + mm(n.rain) : ''}</small></span><b>${deg(n.max)}</b><small>${deg(n.min)}</small></div>`; }).join('')}` : '';
  const st = new Date(c.at), foot = `<small class="mut wxfoot">${esc(c.name)}${c.fail && loc === 'gps' ? ' (Standort nicht verfügbar)' : ''} · Open-Meteo · Stand ${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}</small>`;
  return `${title}${chips}${tabs}${big}${rain}${hours}<h4>Tag</h4>${kv}${days}${foot}${close}`;
}

render();
setTimeout(() => { if (sbSt()) sbRun(); else syncDaily(); puCheck(); }, 600);
