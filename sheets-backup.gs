// Tracker-Backup für Google Tabellen. Einfügen unter Erweiterungen → Apps Script.
// 1) Unten bei PASSWORT ein eigenes Wort eintragen (dasselbe später in der App).
// 2) Bereitstellen → Neue Bereitstellung → Typ „Web-App“ → Ausführen als: Ich → Zugriff: Jeder.
// Nach Änderungen am Skript: Bereitstellen → Bereitstellungen verwalten → Stift → Version „Neue Version“ → Bereitstellen (Adresse bleibt gleich).
const PASSWORT = 'HIER-EIGENES-PASSWORT';

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_(n) { const ss = SpreadsheetApp.getActiveSpreadsheet(); return ss.getSheetByName(n) || ss.insertSheet(n); }

function doPost(e) {
  let b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: 'json' }); }
  if (b.key !== PASSWORT || !b.db || !b.db.days) return out_({ ok: false, err: 'key' });
  const db = b.db;
  // Rohdaten: komplettes Backup in Stücken (eine Zelle fasst max. 50000 Zeichen)
  const raw = sheet_('Rohdaten'), json = JSON.stringify(db), rows = [['Stand', new Date().toISOString()]];
  for (let i = 0; i < json.length; i += 40000) rows.push([json.slice(i, i + 40000)]);
  raw.clearContents(); raw.getRange(1, 1, rows.length, 2).setValues(rows.map(r => [r[0], r[1] || '']));
  // Tage: eine Zeile pro Tag
  const t = sheet_('Tage'), head = ['Datum', 'Stimmung', 'Gefühle', 'Ins Bett', 'Aufgewacht', 'Schlafdauer (min)', 'Erholung', 'Schlafscore', 'Ruhepuls', 'Koffein (mg)', 'Getränke', 'Sport', 'Gewohnheiten', 'Gemacht', 'Notiz'];
  const cfg = db.cfg || {}, hn = {}, an = {}; (cfg.habits || []).forEach(h => hn[h.id] = h.name); (cfg.acts || []).forEach(h => an[h.id] = h.name);
  const data = Object.keys(db.days).sort().map(d => {
    const x = db.days[d], m = x.mood || {}, s = x.sleep || {}, c = x.coffee || [], sp = x.sport || [];
    return [d, m.v || '', (m.tags || []).join(', '), s.bed || '', s.wake || '', s.dur || '', s.q || '', s.score || '', s.rhr || '',
      c.reduce((a, k) => a + (k.mg || 0), 0) || '', c.map(k => (k.t || '') + ' ' + k.name).join('; '),
      sp.map(k => (k.t || '') + ' ' + k.name + (k.min ? ' ' + k.min + ' min' : '')).join('; '),
      Object.keys(x.habits || {}).map(k => hn[k] || k).join(', '),
      x.did ? [(x.did.t || []).map(k => an[k] || k).join(', '), x.did.note].filter(Boolean).join(' | ') : '', [x.note, m.note, s.note].filter(Boolean).join(' | ')];
  });
  if (b.w) sheet_('Widget').getRange(1, 1, 1, 2).setValues([['Hinweise', JSON.stringify(b.w)]]);   // für das Scriptable-Widget
  t.clearContents(); t.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); t.setFrozenRows(1);
  if (data.length) t.getRange(2, 1, data.length, head.length).setValues(data);
  return out_({ ok: true, days: data.length });
}

function doGet(e) {
  if (!e.parameter || e.parameter.key !== PASSWORT) return out_({ ok: false, err: 'key' });
  const rows = sheet_('Rohdaten').getDataRange().getValues(), v = rows.slice(1).map(r => r[0]).join('');
  if (e.parameter.w) {   // kleiner Auszug für das Scriptable-Widget: letzte 10 Tage und das Nötigste aus den Einstellungen
    let db; try { db = JSON.parse(v); } catch (x) { return out_({ ok: false, err: 'leer' }); }
    const c = db.cfg || {}, days = {};
    Object.keys(db.days || {}).sort().slice(-10).forEach(k => days[k] = db.days[k]);
    const weeks = {}; Object.keys(db.weeks || {}).sort().slice(-2).forEach(k => weeks[k] = { done: !!db.weeks[k].done });
    let hint = null; try { hint = JSON.parse(sheet_('Widget').getRange(1, 2).getValue() || 'null'); } catch (x) { }
    return out_({ ok: true, w: 1, stand: rows[0] && rows[0][1] ? String(rows[0][1]) : '', cfg: { halfLife: c.halfLife, limit: c.limit, habits: (c.habits || []).map(h => ({ id: h.id, name: h.name, type: h.type, hid: h.hid })) }, days: days, weeks: weeks, hint: hint });
  }
  return ContentService.createTextOutput(v || '{}').setMimeType(ContentService.MimeType.JSON);
}
