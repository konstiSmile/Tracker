// Prüft die Logik des Scriptable-Widgets und den Widget-Auszug im Apps Script. Start: node tests/t_widget.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../widget/Tracker.js'), 'utf8');
const W = (() => { const m = { exports: {} }; new Function('module', SRC.split('// ---------- Scriptable-Teil')[0])(m); return m.exports; })();
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FEHLER', m); } };
const db = { cfg: { halfLife: 6, habits: [{ id: 'a', name: 'Lesen', type: 'pos' }, { id: 'b', name: 'Dehnen', type: 'pos' }, { id: 'c', name: 'Alt', type: 'pos', hid: 1 }, { id: 'n', name: 'Naschen', type: 'neg' }] },
  days: { '2026-11-09': { coffee: [{ t: '20:00', mg: 100 }] }, '2026-11-10': { coffee: [{ t: '08:00', mg: 100 }, { t: '14:00', mg: 60 }], habits: { a: 1 }, mood: { v: 4, log: [{ t: '09:00', v: 3 }, { t: '13:00', v: 5 }] } } } };
const at = (h, m) => new Date(2026, 10, 10, h, m || 0);
// Koffein: 100 mg um 8, nach 6 h die Hälfte; Vortag 20 Uhr -> 18 h später ein Achtel
ok(Math.abs(W.koffeinUm(db, at(14)) - (50 + 60 + 12.5)) < 1e-6, 'koffein 14 Uhr');
ok(Math.abs(W.koffeinUm(db, at(7, 59)) - 100 * Math.pow(.5, 719 / 360)) < 1e-6, 'vor erstem Kaffee nur Vortag');
let l = W.lage(db, at(15));
ok(l.mgHeute === 160 && l.tassen === 2, 'summe'); ok(l.posGesamt === 2 && l.posGetan === 1 && l.offen[0] === 'Dehnen', 'gewohnheiten');
ok(l.stimmung === 5 && l.stimmungen === 2, 'stimmung letzter Eintrag'); ok(!l.schlaf && !l.checkin && !l.nachBett, 'flags');
ok(l.mgBett === Math.round(W.koffeinUm(db, at(22))), 'bettwert');
ok(W.erinnerung(l, at(15)).art === 'sleep', '15 Uhr Schlaf fehlt');
ok(W.erinnerung(l, at(17, 30)).art === 'habit', '17:30 Gewohnheit');
ok(W.erinnerung(l, at(19)).art === 'checkin' && /1 offen/.test(W.erinnerung(l, at(19)).text), '19 Uhr Check-in');
db.days['2026-11-10'].ci = 1; db.days['2026-11-10'].habits.b = 1; db.days['2026-11-10'].sleep = { bed: '23:00', wake: '07:00' };
l = W.lage(db, at(19)); ok(l.schlaf && W.erinnerung(l, at(19)) === null, 'alles erledigt');
const leer = W.lage({ cfg: {}, days: {} }, at(10)); ok(leer.mgJetzt === 0 && W.erinnerung(leer, at(10)).art === 'sleep', 'leerer Tag');
ok(W.erinnerung(Object.assign({}, leer, { schlaf: true }), at(10)).art === 'mood', 'Stimmung ab 9'); ok(W.erinnerung(Object.assign({}, leer, { schlaf: true }), at(8)) === null, 'vor 9 nichts');
ok(W.lage(db, at(22, 5)).nachBett, 'nach 22 Uhr');
try { W.leseAntwort('<html>'); ok(false, 'html'); } catch (e) { ok(/Keine Daten/.test(e.message), 'html-Fehler'); }
try { W.leseAntwort('{"ok":false,"err":"key"}'); ok(false, 'key'); } catch (e) { ok(/Passwort/.test(e.message), 'key-Fehler'); }
ok(Object.keys(W.leseAntwort(JSON.stringify(db)).days).length === 2, 'volles Backup lesbar');

// Apps Script: doGet mit nachgebauter Tabelle
const full = { cfg: { halfLife: 5, limit: 400, habits: db.cfg.habits, coffee: [1, 2, 3] }, days: {} };
for (let i = 1; i <= 9; i++) full.days['2026-11-0' + i] = { note: 'x' + i };
const json = JSON.stringify(full), rows = [['Stand', '2026-11-10T08:00:00.000Z'], [json.slice(0, 50), ''], [json.slice(50), '']];
const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => rows }) }) }) },
  ContentService: { MimeType: { JSON: 1 }, createTextOutput: t => ({ t, setMimeType() { return this; } }) } };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '../sheets-backup.gs'), 'utf8').replace("'HIER-EIGENES-PASSWORT'", "'pw'") + ';this.doGet=doGet', ctx);
ok(JSON.parse(ctx.doGet({ parameter: { key: 'x' } }).t).err === 'key', 'gs falsches Passwort');
const a = JSON.parse(ctx.doGet({ parameter: { key: 'pw', w: '1' } }).t);
ok(a.ok && Object.keys(a.days).join() === '2026-11-06,2026-11-07,2026-11-08,2026-11-09', 'gs letzte 4 Tage');
ok(a.cfg.halfLife === 5 && a.cfg.habits.length === 4 && !a.cfg.coffee && a.stand.startsWith('2026-11-10'), 'gs cfg schlank');
ok(Object.keys(JSON.parse(ctx.doGet({ parameter: { key: 'pw' } }).t).days).length === 9, 'gs volles Backup wie bisher');
ok(W.leseAntwort(JSON.stringify(a)).cfg.halfLife === 5, 'Auszug lesbar');

// Rauchtest: Widget in allen Größen mit nachgebautem Scriptable bauen
const texts = []; const el = () => new Proxy(function () {}, { get: (t, k) => k === 'addText' ? (s => { texts.push(String(s)); return el(); }) : k === 'then' ? undefined : (() => el()), set: () => true });
const C = function () { return el(); }; C.dynamic = () => el(); C.black = C.white = () => el();
const Fnt = function () { return el(); }; ['systemFont', 'boldSystemFont', 'mediumSystemFont', 'semiboldSystemFont'].forEach(k => Fnt[k] = () => el());
for (const fam of ['small', 'medium', 'accessoryRectangular', 'accessoryInline', 'accessoryCircular']) {
  texts.length = 0; let set = null;
  const sb = { module: undefined, console, Date, Math, JSON, Object, String, encodeURIComponent, Color: C, Font: Fnt, ListWidget: function () { return el(); },
    config: { runsInWidget: true, widgetFamily: fam }, Keychain: { contains: () => true, get: () => 'https://x/exec' },
    FileManager: { local: () => ({ joinPath: (a, b) => a + '/' + b, documentsDirectory: () => '/tmp', writeString() {}, fileExists: () => false }) },
    Request: function (u) { ok(/\?key=.*&w=1$/.test(u), 'url'); return { loadString: async () => JSON.stringify({ ok: true, cfg: db.cfg, days: { [W.tagStr(new Date())]: { coffee: [{ t: '00:00', mg: 80 }] } } }) }; },
    Script: { setWidget(w) { set = w; }, complete() {} } };
  vm.createContext(sb);
  vm.runInContext('(async()=>{' + fs.readFileSync(path.join(__dirname, '../widget/Tracker.js'), 'utf8') + '})()', sb).then(() => {
    ok(set && texts.length > 0, 'gebaut ' + fam); if (process.argv[2]) console.log(fam, JSON.stringify(texts));
  }).catch(e => { ok(false, fam + ': ' + e.message); });
}
setTimeout(() => { console.log(bad ? bad + ' Fehler' : 'alle ' + n + ' Prüfungen ok'); process.exit(bad ? 1 : 0); }, 300);
