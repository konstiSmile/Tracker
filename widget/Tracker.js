// Tracker-Widget (Scriptable) – Erinnerung nach Tageszeit, Koffein, Gewohnheiten
// Daten kommen aus dem Backup in der Google-Tabelle (Apps Script, doGet).
// Adresse und Passwort liegen im Schlüsselbund von Scriptable, nicht in diesem Skript.

// ================= EINSTELLUNGEN =================
const CONFIG = {
  sperrTafel: true,     // hellgraue Tafel hinter dem Sperrbildschirm-Widget (false = aus)
  bettzeit: 22,         // Restkoffein für diese Stunde anzeigen
  schwelle: 50,         // mg, ab hier wird der Abendwert hervorgehoben
  // Erinnerungen: ab welcher Stunde sie erscheinen (24 = nie)
  abSchlaf: 5,          // „Schlaf eintragen“ (bis 17 Uhr)
  abStimmung: 9,        // „Wie geht es dir?“
  abGewohnheiten: 17,   // offene positive Gewohnheiten
  abCheckin: 18,        // Abend-Check-in
  aktualisieren: 10     // Minuten bis zur nächsten Abfrage (iOS entscheidet am Ende selbst)
};
// =================================================

// ---------- reine Logik (testbar) ----------
const pad2 = n => String(n).padStart(2, "0");
function tagStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function zeitpunkt(tag, hhmm) { // "2026-11-10", "08:15" -> Date (Ortszeit)
  const a = tag.split("-").map(Number), t = String(hhmm || "00:00").split(":").map(Number);
  return new Date(a[0], a[1] - 1, a[2], t[0] || 0, t[1] || 0);
}

// Restkoffein zu einem Zeitpunkt, gleiche Formel wie caffeineAt in der App
function koffeinUm(db, wann) {
  const hl = ((db.cfg && db.cfg.halfLife) || 6) * 3600000;
  let sum = 0;
  Object.keys(db.days || {}).forEach(tag => {
    ((db.days[tag] || {}).coffee || []).forEach(c => {
      const dt = wann - zeitpunkt(tag, c.t);
      if (dt >= 0 && dt < 72 * 3600000) sum += (c.mg || 0) * Math.pow(0.5, dt / hl);
    });
  });
  return sum;
}

function lage(db, jetzt) {
  const tag = tagStr(jetzt), d = (db.days || {})[tag] || {};
  const m = d.mood || {}, s = d.sleep || {}, kaffee = d.coffee || [];
  const pos = ((db.cfg && db.cfg.habits) || []).filter(h => h.type !== "neg" && !h.hid);
  const getan = d.habits || {};
  const offen = pos.filter(h => !getan[h.id]).map(h => h.name);
  const log = m.log || [];
  const bett = zeitpunkt(tag, pad2(CONFIG.bettzeit) + ":00");
  return {
    tag,
    schlaf: !!(s.dur || (s.bed && s.wake)),
    stimmung: log.length ? log[log.length - 1].v : (m.v || 0),
    stimmungen: log.length || (m.v ? 1 : 0),
    mgHeute: kaffee.reduce((a, c) => a + (c.mg || 0), 0),
    tassen: kaffee.length,
    mgJetzt: Math.round(koffeinUm(db, jetzt)),
    mgBett: Math.round(koffeinUm(db, bett)),
    nachBett: jetzt >= bett,
    posGesamt: pos.length,
    posGetan: pos.length - offen.length,
    offen,
    sport: (d.sport || []).length,
    checkin: !!d.ci
  };
}

// Was jetzt am ehesten fehlt. null = nichts offen.
function erinnerung(l, jetzt) {
  const h = jetzt.getHours();
  if (h >= CONFIG.abCheckin && !l.checkin) return { art: "checkin", kurz: "Check-in offen", text: "Abend-Check-in" + (l.offen.length ? " · " + l.offen.length + " offen" : "") };
  if (h >= CONFIG.abGewohnheiten && l.offen.length) return { art: "habit", kurz: l.offen.length + " offen", text: "Offen: " + l.offen.slice(0, 3).join(", ") + (l.offen.length > 3 ? " …" : "") };
  if (h >= CONFIG.abSchlaf && h < 17 && !l.schlaf) return { art: "sleep", kurz: "Schlaf?", text: "Schlaf eintragen" };
  if (h >= CONFIG.abStimmung && !l.stimmungen) return { art: "mood", kurz: "Stimmung?", text: "Wie geht es dir?" };
  return null;
}

function leseAntwort(text) { // Auszug (w:1) oder komplettes Backup, beides wird verstanden
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error("Keine Daten. Skript neu bereitgestellt? Adresse richtig?"); }
  if (o && o.ok === false) throw new Error(o.err === "key" ? "Passwort stimmt nicht" : "Tabelle ist leer");
  if (!o || !o.days) throw new Error("Tabelle ist leer");
  return { cfg: o.cfg || {}, days: o.days, stand: o.stand || "" };
}

if (typeof module !== "undefined") module.exports = { CONFIG, tagStr, zeitpunkt, koffeinUm, lage, erinnerung, leseAntwort };

// ---------- Scriptable-Teil ----------
if (typeof Script !== "undefined") {
  const KEY_URL = "tracker_url", KEY_PW = "tracker_key";
  const hhmm = d => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  const fm = FileManager.local();
  const cachePfad = fm.joinPath(fm.documentsDirectory(), "tracker_cache.json");

  async function zugangErfragen() {
    const a = new Alert();
    a.title = "Tracker-Zugang";
    a.message = "Adresse der Web-App (endet auf /exec) und dein Passwort, beides wie in der Tracker-App unter Backup. Bleibt im Schlüsselbund dieses Geräts.";
    a.addTextField("https://script.google.com/…/exec", Keychain.contains(KEY_URL) ? Keychain.get(KEY_URL) : "");
    a.addSecureTextField("Passwort", "");
    a.addAction("Speichern");
    a.addCancelAction("Abbrechen");
    if ((await a.present()) === 0) {
      const u = a.textFieldValue(0).trim(), k = a.textFieldValue(1).trim();
      if (u) Keychain.set(KEY_URL, u);
      if (k) Keychain.set(KEY_PW, k);
    }
  }
  const hatZugang = () => Keychain.contains(KEY_URL) && Keychain.contains(KEY_PW);

  async function holeDaten() {
    const u = Keychain.get(KEY_URL);
    const r = new Request(u + (u.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(Keychain.get(KEY_PW)) + "&w=1");
    r.timeoutInterval = 20;
    return leseAntwort(await r.loadString());
  }

  async function datenHolen() {
    try {
      const db = await holeDaten();
      db.geholt = Date.now();
      fm.writeString(cachePfad, JSON.stringify(db));
      return db;
    } catch (e) {
      if (fm.fileExists(cachePfad)) {
        const c = JSON.parse(fm.readString(cachePfad));
        c.alt = true; c.fehler = String(e.message || e);
        return c;
      }
      return { cfg: {}, days: {}, leer: true, fehler: String(e.message || e) };
    }
  }

  // Farben „Abendlicht“ (hell / dunkel)
  const F = {
    grund: Color.dynamic(new Color("#FBF5EC"), new Color("#221B1E")),
    text: Color.dynamic(new Color("#3A2F33"), new Color("#F3E9DB")),
    neben: Color.dynamic(new Color("#74646A"), new Color("#B5A4A9")),
    haus: Color.dynamic(new Color("#A04C58"), new Color("#E08E9A")),
    gut: Color.dynamic(new Color("#5E8A5A"), new Color("#9CCB96")),
    kaffee: Color.dynamic(new Color("#9A6238"), new Color("#E0A877"))
  };
  const MOOD = ["", "sehr schlecht", "schlecht", "okay", "gut", "sehr gut"];

  function baueWidget(db) {
    const fam = config.widgetFamily || "medium";
    const lock = fam.indexOf("accessory") === 0;
    const jetzt = new Date();
    const w = new ListWidget();
    w.refreshAfterDate = new Date(Date.now() + CONFIG.aktualisieren * 60000);

    if (db.leer) {
      const t = w.addText("Tracker: " + (db.fehler || "keine Daten"));
      t.font = Font.systemFont(lock ? 11 : 13);
      if (!lock) { w.backgroundColor = F.grund; t.textColor = F.haus; }
      return w;
    }

    const l = lage(db, jetzt), e = erinnerung(l, jetzt);
    const kTxt = l.tassen || l.mgJetzt >= 5
      ? "≈ " + l.mgJetzt + " mg" + (l.nachBett ? "" : " · " + CONFIG.bettzeit + " Uhr " + l.mgBett)
      : "kein Koffein";
    const hTxt = l.posGesamt ? l.posGetan + "/" + l.posGesamt : "";

    if (fam === "accessoryInline") {
      w.addText(e ? e.text : (l.tassen ? "Koffein " + l.mgJetzt + " mg" : "Alles eingetragen"));
      return w;
    }
    if (fam === "accessoryCircular") {
      w.addSpacer();
      const a = w.addText(e ? "!" : String(l.mgJetzt)); a.font = Font.boldSystemFont(e ? 22 : 18); a.centerAlignText();
      const b = w.addText(e ? e.kurz : "mg"); b.font = Font.systemFont(8); b.centerAlignText(); b.lineLimit = 1; b.minimumScaleFactor = 0.6;
      w.addSpacer();
      return w;
    }

    if (lock) {
      const tafel = CONFIG.sperrTafel;
      const c = tafel ? w.addStack() : w;
      if (tafel) { c.layoutVertically(); c.backgroundColor = new Color("#f2f2f7", 1); c.cornerRadius = 12; c.setPadding(4, 8, 4, 8); }
      const col = tafel ? Color.black() : Color.white();
      const z = (txt, fett) => { const t = c.addText(txt); t.font = fett ? Font.boldSystemFont(12) : Font.mediumSystemFont(11); t.textColor = col; t.lineLimit = 1; t.minimumScaleFactor = 0.7; };
      z(e ? e.text : "✓ Alles eingetragen", true);
      z("Koffein " + kTxt.replace("≈ ", ""));
      z([hTxt ? "Gewohnh. " + hTxt : "", l.stimmung ? "Stimmung " + l.stimmung : "", db.alt ? "alt" : ""].filter(Boolean).join(" · ") || "Tracker");
      if (tafel) { const r = c.addStack(); r.addSpacer(); } // Tafel über die volle Breite
      return w;
    }

    // Homescreen klein / mittel
    const klein = fam === "small";
    w.backgroundColor = F.grund;
    w.setPadding(12, 14, 10, 14);
    const kopf = w.addText("Tracker");
    kopf.font = new Font("Georgia-Bold", 13); kopf.textColor = F.haus;
    w.addSpacer(4);
    const haupt = w.addText(e ? e.text : "Alles eingetragen");
    haupt.font = new Font("Georgia-Bold", klein ? 16 : 19);
    haupt.textColor = e ? F.text : F.gut;
    haupt.lineLimit = klein ? 3 : 2; haupt.minimumScaleFactor = 0.7;
    w.addSpacer();

    const zeile = (name, wert, farbe) => {
      const r = w.addStack(); r.centerAlignContent();
      const a = r.addText(name); a.font = Font.systemFont(klein ? 11 : 13); a.textColor = F.neben;
      r.addSpacer();
      const b = r.addText(wert); b.font = Font.semiboldSystemFont(klein ? 11 : 13); b.textColor = farbe || F.text; b.lineLimit = 1; b.minimumScaleFactor = 0.7;
    };
    const hoch = !l.nachBett && l.mgBett >= CONFIG.schwelle;
    if (klein) {
      zeile("Koffein", l.tassen || l.mgJetzt >= 5 ? l.mgJetzt + " mg" : "–", F.kaffee);
      if (!l.nachBett && l.mgBett >= 5) zeile(CONFIG.bettzeit + " Uhr", l.mgBett + " mg", hoch ? F.haus : F.neben);
      if (hTxt) zeile("Gewohnh.", hTxt, l.posGetan === l.posGesamt ? F.gut : F.text);
    } else {
      zeile("Koffein jetzt", kTxt, hoch ? F.haus : F.kaffee);
      if (hTxt) zeile("Gewohnheiten", hTxt + (l.offen.length && (!e || e.art !== "habit") ? " · " + l.offen.slice(0, 2).join(", ") : ""), l.posGetan === l.posGesamt ? F.gut : F.text);
      zeile("Stimmung", l.stimmung ? MOOD[Math.round(l.stimmung)] || String(l.stimmung) : "noch offen");
    }
    w.addSpacer(4);
    const s = w.addText((db.alt ? "Offline · " : "") + "Stand " + hhmm(new Date(db.geholt || Date.now())));
    s.font = Font.systemFont(9); s.textColor = db.alt ? F.haus : F.neben;
    return w;
  }

  // ---------- Start ----------
  if (!config.runsInWidget) {
    const m = new Alert();
    m.title = "Tracker-Widget";
    ["Vorschau (klein)", "Vorschau (mittel)", "Vorschau (Sperrbildschirm)", "Zugang eingeben", "Verbindung prüfen"].forEach(t => m.addAction(t));
    m.addCancelAction("Schließen");
    const wahl = await m.presentSheet();
    if (wahl === 3) await zugangErfragen();
    else if (wahl === 4) {
      if (!hatZugang()) await zugangErfragen();
      let text;
      try {
        const db = await holeDaten(), l = lage(db, new Date()), e = erinnerung(l, new Date());
        text = "✅ Verbindung OK\nLetzte Sicherung: " + (db.stand ? hhmm(new Date(db.stand)) + " Uhr (" + tagStr(new Date(db.stand)) + ")" : "unbekannt") +
          "\nTage geladen: " + Object.keys(db.days).length +
          "\nHeute: " + l.tassen + " Getränke, " + l.mgHeute + " mg, jetzt ≈ " + l.mgJetzt + " mg" +
          "\nGewohnheiten: " + l.posGetan + "/" + l.posGesamt +
          "\nErinnerung: " + (e ? e.text : "keine");
      } catch (e) { text = "❌ " + String(e.message || e); }
      const a = new Alert(); a.title = "Verbindung"; a.message = text; a.addAction("OK"); await a.present();
    } else if (wahl >= 0) {
      if (!hatZugang()) await zugangErfragen();
      if (hatZugang()) {
        const db = await datenHolen();
        config.widgetFamily = ["small", "medium", "accessoryRectangular"][wahl];
        const w = baueWidget(db);
        if (wahl === 0) await w.presentSmall(); else if (wahl === 1) await w.presentMedium(); else await w.presentAccessoryRectangular();
      }
    }
    Script.complete();
  } else {
    let w;
    if (!hatZugang()) { w = new ListWidget(); w.addText("Skript in Scriptable öffnen und Zugang eingeben"); }
    else w = baueWidget(await datenHolen());
    Script.setWidget(w);
    Script.complete();
  }
}
