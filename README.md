# Tracker

Persönlicher Tracker für Stimmung, Schlaf, Kaffee/Koffein, Sport und Gewohnheiten (positiv/negativ). Web-App (PWA), Daten nur lokal im Gerät (`localStorage`, Schlüssel `tracker-v1`). Keine Build-Schritte: `index.html`, `app.js`, `app.css`, `sw.js`.

Live über GitHub Pages: `https://konstiSmile.github.io/Tracker/`

## Datenformat (`tracker-v1`)
```
{ v:1,
  cfg:{ v, theme, acts:[{id,name,i,hid?}], limit, halfLife, coffee:[{id,name,mg,e,i,sizes?,hid?}], sports:[{id,name,e,i,hid?}], habits:[{id,name,type:'pos'|'neg',e,i,hid?}] },
  days:{ "JJJJ-MM-TT":{
    mood:{ v:1-5, tags:[], qa:[{q,a}], note },
    sleep:{ bed:"HH:MM", wake:"HH:MM", dur:min, q:1-5, fall, wakes, morning, score, deep, rem, light, awake, rhr, src, note },
    coffee:[{id,t:"HH:MM",k,name,mg,e,i}],
    sport:[{id,t,name,e,i,c?}],
    habits:{ habitId:1 },
    did:{ t:[actId], note },
    note } } }
```
Schlaf gehört zum **Tag des Aufwachens**.

## Import (z. B. Uhr-Screenshots, von Claude ausgewertet)
Einstellungen → Daten, Backup und Import. Dort „Auftrag für Claude kopieren“, im Chat mit Screenshot einfügen, JSON zurück einfügen:
```
{"tracker":1,"days":{"2026-11-08":{"sleep":{"bed":"23:20","wake":"07:05","score":82,"deep":75,"rem":95,"light":230,"awake":25,"rhr":54,"src":"uhr"}}}}
```
„Zusammenführen“ ergänzt Felder je Tag, „Alles ersetzen“ ersetzt die gesamte Datenbasis (für Backups).

## Änderungen
In `sw.js` die Cache-Version (`tracker-vN`) und in `app.js` `VERSION` erhöhen. Der Service Worker lädt zuerst aus dem Netz, sonst aus dem Zwischenspeicher.

## Version 1.1
- Kaffee und Sport: Oft genutztes steht vorn (Gewichtung nach Häufigkeit, gleichem Wochentag und Tageszeit, letzte 120 Tage). Knöpfe „Wie gestern“ und „Wie letzten <Wochentag>“.
- CoffeeB als Getränke (Espresso, Lungo, Lungo Forte, Decaf). Der Hersteller nennt keinen mg-Wert; geschätzt aus ca. 5,7 bis 6,2 g Arabica pro Ball (`est: true`, Anzeige „≈“).
- Restkoffein-Kurve (Halbwertszeit einstellbar, Standard 5 h) mit Wert jetzt und beim Zubettgehen.
- Schlaf-Rhythmus (Balkenchart, Streuung, Wochenende vs. Woche), Wochenrückblick (KW, Vergleich zur Vorwoche, „Woche für Claude kopieren“), Muster nach Restkoffein beim Zubettgehen.
- Config-Migration: `cfg.v = 2` ergänzt fehlende Standard-Getränke bei bestehenden Daten.

## Version 1.2
Weiches Design: gedämpfte Salbei-/Apricot-Töne, warmes Dunkel und Creme im Hellmodus, größere Rundungen, sanfte Schatten, Überschriften in Serifenschrift (`ui-serif`/New York), Fließtext in Rundschrift (`ui-rounded`/SF Rounded), Navigation mit Unschärfe. Neue Icons in den gleichen Farben.

## Version 1.3
Farbschema „Bergnebel“ nach Vorlage des Nutzers: #F8DEBD (Pfirsichcreme), #D1B091 (Sand), #9C8E8D (Mauvegrau), #4E4C4F (Anthrazit), #22211F (fast Schwarz). Dunkel: warmes Schwarz mit Sand als Akzent; Hell: Creme mit dunklem Sandbraun. Stimmungsfarben abgestimmt (Rosenstaub bis Moos-/Salbeigrün). Icons in den neuen Farben.

## Version 1.4 (Update-Mechanik)
- Service Worker holt Dateien mit `cache: 'no-cache'` (prüft beim Server nach, umgeht die 10 Minuten Zwischenspeicher von GitHub Pages).
- Echte Update-Prüfung: lädt `app.js` ohne Cache und vergleicht `VERSION`. Beim Start und beim Zurückkehren in die App (höchstens alle 10 Min.) sowie über Einstellungen → App → „Nach Update suchen“. Bei neuer Version erscheint unten „Update … bereit · Neu laden“ (leert Zwischenspeicher und Service Worker, Daten in `localStorage` bleiben).
- **Bei jedem Release drei Stellen erhöhen:** `VERSION` in `app.js`, `?v=` an `app.js` in `index.html`, `CACHE` in `sw.js`.
- Achtung: Lernkiste und Tracker liegen unter demselben Ursprung (`konstismile.github.io`). „Website-Daten löschen“ in Safari löscht die Daten beider Apps.

## Version 1.5
Helleres Design (neuer Standard, `cfg.v = 3`; ein gespeicherter Dunkelmodus wird einmalig auf Hell umgestellt, in Einstellungen → Darstellung wieder wählbar). Orientierung an den oberen drei Farben #F8DEBD, #D1B091, #9C8E8D als Flächen; Schrift in den dunklen Tönen (#34302F, #4E4C4F, #22211F), Akzent-Text in dunklem Sand (`--acc-t`). Sanfter Verlauf im Hintergrund, helle Icons.

## Version 1.6
Eigenes Zeitrad statt der Browser-Zeitfelder: Stunden 00–23, Minuten in 5-Minuten-Schritten. Schließt nicht beim Drehen, nur mit dem Haken (✓) oder Tippen neben das Fenster (übernimmt den gewählten Wert); „Jetzt“ und „Leeren“ (bei Kaffee-Uhrzeit ohne „Leeren“). Wird das Rad nicht angefasst, bleibt eine vorhandene krumme Uhrzeit (z. B. 12:34) unverändert. Gilt für Schlaf (Bett, Aufgewacht), Kaffee-Uhrzeit und Sport-Uhrzeit.

### 1.7
- Zeitrad: nur noch vertikale Bewegung (kein seitliches Verschieben mehr), ausgewählte Zahl wird per Schriftgröße statt Skalierung hervorgehoben.

### 1.8
- Koffein: Die Anzeige "Um 22 Uhr noch im Körper" und die Markierung in der Kurve beziehen sich jetzt fest auf 22 Uhr (vorher: Zubettgehzeit). Der Verlauf-Vergleich "Restkoffein beim Zubettgehen" bleibt bei der echten Bettzeit.

### 1.9
- Backup in Google Tabelle: Einstellungen → Daten, Backup und Import → „Backup in Google Tabelle“. Adresse der Apps-Script-Web-App und Passwort eintragen (Skript: `sheets-backup.gs`). Die App sendet ca. 20 s nach jeder Änderung das komplette Backup (Blätter „Rohdaten“ und „Tage“); offline wird nachgeholt. Adresse und Passwort liegen separat unter `tracker-sync` im localStorage.

### 1.10
(Hinweis: ab 1.11 hat auch app.css eine ?v=-Nummer im Link; sonst bleibt eine alte Stilvorlage im Zwischenspeicher. Release-Checkliste: beide ?v= erhöhen.)
- Passwortfeld (Tabellen-Backup) ist verschwommen und zeigt immer gleich viele Punkte; Auge-Knopf rechts macht es sichtbar/unsichtbar.

### 1.11
- Fix: app.css wird jetzt mit Versionsnummer geladen, damit neue Stile (Passwortfeld) sicher ankommen.

### 1.12
- Sport: neue Option „Pendelweg 🚴“ (≈3–4 km, `commute:true`, Standard 15 min, leicht). Chip mit bläulicher Umrandung; Eintrag trägt `c:1`. Verlauf → Sport: Tage nur mit Pendelweg und die Balken in „Nach Sportart“ sind blau statt grün. Migration `cfg.v = 4` ergänzt Pendelweg bei bestehenden Daten.

### 1.13
- **Langes Drücken** (ca. 0,5 s) auf Getränk, Sportart oder Gewohnheit öffnet „Bearbeiten“: Symbol, Name, Speichern, Verstecken/Einblenden, Löschen. Versteckte Einträge (`hid:true`) stehen unter einem kleinen grauen „weitere (n)“. In den Einstellungen sind die Listen antippbare Chips mit demselben Fenster.
- **Gewohnheiten:** 12 zusätzliche Vorschläge (h9–h20, je 6 positiv/negativ), anfangs versteckt. „＋ Neu“ unter „weitere“.
- **Sport:** Antippen fügt sofort hinzu (keine Dauer/Intensität mehr; Eintrag `{id,t,name,e,c?}`). 16 Sportarten, 6 neue anfangs versteckt. Verlauf zählt Einheiten statt Minuten (`sportN`). Blauer Streifen beim Pendelweg in der Tagesliste entfernt (Chip und Verlauf bleiben blau).
- **Stimmung:** Regler 1–5 in Zehntelschritten (rot → grün), `mood.v` kann Kommawerte haben; Emoji über `Math.round`.
- **Koffein:** Kurve gedrückt halten und ziehen zeigt das Restkoffein zur Uhrzeit, beim Loslassen wieder 22 Uhr. Getränke können **Größen** haben (`sizes:[{l,mg}]`, erste = Standard); beim Antippen erscheint die Größenwahl, der Eintrag heißt z. B. „Cola 0,5 l“.
- Migration `cfg.v = 5`: ergänzt Größen bei unveränderten Standard-Getränken, „Mate“, neue Sportarten und Gewohnheiten (versteckt). Gelöschte Standard-Einträge kommen nicht zurück.

### 2.0 (neues Design „Abendlicht“, Heute-Ansicht)
- Gestaltungsgrundlagen zentral in `tokens.css`: Farben, ein Verlauf pro Bereich (Stimmung, Schlaf, Koffein, Sport, Gewohnheiten), Schriften, 8-px-Raster, Radien, Schatten, Zeiten. Helles und dunkles Thema.
- Schriften liegen in `fonts/` (Lora für Überschriften und Zahlen, Instrument Sans für Text; beide unter SIL Open Font License), funktionieren offline.
- Alle Emojis ersetzt durch eigene flache Zeichnungen in `icons.js` (Stimmungs-Gesichter, Getränke, Sportfiguren, Gewohnheiten, Tab-Symbole). Getränke, Sportarten und Gewohnheiten haben dazu das Feld `i` (Symbolname); `e` bleibt für ältere Sicherungen. Migration `cfg.v` 6 ordnet alle Einträge zu, auch selbst angelegte (über das Emoji).
- Bearbeiten-Fenster: Symbolauswahl statt Emoji-Feld.
- Heute: Kopf mit Illustrationskachel je Bereich, ausgewählte Einträge mit Verlauf und Häkchen bzw. Zähler (z. B. „2×“), Koffein-Kurve mit Verlaufsfüllung, Erholung mit den Stimmungs-Gesichtern, kurze Animationen, kleine Animation, wenn alle sichtbaren positiven Gewohnheiten erledigt sind.
- Gewohnheits-Symbole eindeutig gemacht: „Gelernt“ ist jetzt ein Heft mit Stift (nicht mehr Bücherstapel wie „Gelesen“), „Kreativ“ eine Palette, „Spät gegessen“ Teller mit Mond, „Bildschirm im Bett“ Bett mit Handy, „Aufgeräumt“ ein Besen. Sterne und Mond allein gibt es nicht mehr.
- Verlauf und Einstellungen nutzen schon Farben, Schrift und Zeichnungen; deren eigener Umbau folgt.
- Entwurfsdateien unter `design/` (Stilblatt, Erzeuger der Sportfiguren).

### 2.1
- **Koffein-Kurve:** Solange man die Kurve abtastet, scrollt die Seite nicht mehr (`touch-action:none` plus `touchmove`-Sperre).
- **Kleines Menü bei langem Drücken** (Getränk, Sportart, Gewohnheit): Verstecken, Löschen (zweimal tippen), Bearbeiten. Tippen daneben schließt es. Erst „Bearbeiten“ öffnet das große Fenster (`openMenu`, `#menu`).
- **Getränke** als kompaktes Raster, zwei nebeneinander (`.cgrid`, `.cti`); Häkchen bzw. Zähler als kleine Marke oben rechts.
- **Mehrere Stimmungen pro Tag:** `mood.log = [{id,t,v}]`, `mood.v` ist der Tagesschnitt (Verlauf und Muster rechnen damit weiter). Ältere Tage mit nur `mood.v` erscheinen als ein Eintrag ohne Uhrzeit. Regler ändert den gerade aktiven Eintrag (10 Minuten lang oder nach Antippen), sonst legt er einen neuen an.
- Test: `tests/t3.py` (Playwright, 70 Prüfungen hell/dunkel).

### 2.2
- Standard-Halbwertszeit von Koffein 6 h statt 5 h. Migration `cfg.v = 7`: wer noch 5 h (alter Standard) eingestellt hatte, bekommt 6 h; eigene Werte bleiben.

### 2.3
- Koffein-Kurve: dünne gestrichelte Orientierungslinie bei 50 mg (Faustregel nach EFSA: Effekte auf den Schlaf ab etwa 100 mg kurz vor dem Schlafen, darunter keine gefunden). Die mittlere Hilfslinie entfällt, wenn sie zu nah an der 50er-Linie läge.

### 2.4
- Die 50-mg-Linie erscheint nur, wenn die Kurve an dem Tag über 50 mg kommt.

### 2.5
- **Heute kürzer:** Jede Karte lässt sich über ihren Kopf ein- und ausklappen (`cfg.fold`, eingeklappt mit Kurzfassung rechts). Schlaf klappt von selbst zu, wenn er beim Öffnen schon vollständig ist. Reihenfolge heute nach Tageszeit (vor 11 Uhr Schlaf oben, ab 17 Uhr Stimmung und Gewohnheiten oben).
- **Hinweistexte** verschwinden nach der ersten Nutzung (`cfg.seen`: `lp`, `cg`, `mood`).
- **Abend-Check-in** (`ciSheet`): fünf Schritte im Fenster (Stimmung, Gefühle, Gewohnheiten, Bewegung, Frage des Tages), danach Abschluss mit Erfolgen und einer Erkenntnis. Karte oben ab 17 Uhr, sonst Knopf unten. `day.ci = 1`.
- **Wochenrückblick** (`wrSheet`, `DB.weeks[Montag] = {v,best,hard,plan,done}`): Woche in Zahlen, Bewertung, schönster Moment, Schwieriges, Vorsatz. Karte auf Heute sonntags ab 12 Uhr sowie montags und dienstags für die Vorwoche; jederzeit unter Verlauf → Woche.
- **Erfolge** (`fbList`, `fbCheck`, `#fb`): kurze Meldung oben, passend zum Tag oder zur Woche, jede höchstens einmal pro Tag (`tracker-fb` im localStorage), nur für heute.
- **Erkenntnis** (`insights`): ein Satz aus den eigenen Daten, z. B. Stimmung an Sporttagen gegen Tage ohne.
- Kleine Belohnung: Alle fünf Bereiche eingetragen lässt alle Kacheln kurz aufleuchten.

## Scriptable-Widget (10.11.2026)
- `widget/Tracker.js`: Widget für Homescreen (klein, mittel) und Sperrbildschirm. Zeigt eine Erinnerung nach Tageszeit (Schlaf, Stimmung, offene Gewohnheiten, Abend-Check-in), Koffein jetzt und um 22 Uhr, Gewohnheiten, Stimmung. Adresse und Passwort liegen im Schlüsselbund von Scriptable.
- `sheets-backup.gs`: `doGet` liefert mit `&w=1` einen kleinen Auszug (letzte 4 Tage, Halbwertszeit, Gewohnheiten). Nach dem Einfügen als neue Version bereitstellen. Das Widget versteht auch das komplette Backup der älteren Fassung.
- Test: `node tests/t_widget.js`. Die App selbst ist unverändert (Version 2.5).

## Version 2.6 (11.11.2026)
- Einstellungen: Kachel „App-Ideen“ mit Notizfeld (`cfg.ideas`, wird mitgesichert). Nur zum Sammeln.
- Backup sendet zusätzlich `w` (heutige Erfolge `fb`, Erkenntnis `ins`) für das Widget; das Apps Script legt es im Blatt „Widget“ ab. Nicht Teil der Daten.
- Widget: fragt erneut nach der Stimmung, wenn der letzte Eintrag 5 h alt ist (bis 21 Uhr, nicht nach dem Check-in); erinnert an den Wochenrückblick (So ab 12 Uhr, Mo/Di für die Vorwoche); zeigt ohne offene Erinnerung einen Erfolg oder eine Erkenntnis. `doGet&w=1` liefert jetzt 10 Tage, die letzten 2 Wochen (`done`) und `hint`.
- Tests: `node tests/t_widget.js` (48), `tests/t6.py` (Ideen-Kachel).


## Version 2.7 (13.11.2026)
- Abend-Check-in hat jetzt 6 Schritte. Neu als Schritt 3: „Was hast du heute so gemacht?“ mit Kacheln Uni, Arbeit, Erledigungen, Haushalt, Gelesen, Erholung, Prokrastiniert und freiem Textfeld (`day.did = {t:[id], note}`, Liste in `cfg.acts`). Reihenfolge unter der Woche Pflichten zuerst, am Wochenende Erholung zuerst (`actsFor`).
- Neue Erfolge dazu (Uni-Tage in Folge, Uni und Arbeit, gestern aufgeschoben – heute angepackt, Gelesen in Folge, Erholung als Balance u. a.). Im Abschluss zählen sie als eigene Gruppe neben den Gewohnheiten.
- Apps Script: neue Spalte „Gemacht“ im Blatt „Tage“.
- Neues Symbol `koffer` für Arbeit.
