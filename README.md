# Tracker

Persönlicher Tracker für Stimmung, Schlaf, Kaffee/Koffein, Sport und Gewohnheiten (positiv/negativ). Web-App (PWA), Daten nur lokal im Gerät (`localStorage`, Schlüssel `tracker-v1`). Keine Build-Schritte: `index.html`, `app.js`, `app.css`, `sw.js`.

Live über GitHub Pages: `https://konstiSmile.github.io/Tracker/`

## Datenformat (`tracker-v1`)
```
{ v:1,
  cfg:{ theme, limit, coffee:[{id,name,mg,e}], sports:[{id,name,e}], habits:[{id,name,type:'pos'|'neg',e}] },
  days:{ "JJJJ-MM-TT":{
    mood:{ v:1-5, tags:[], qa:[{q,a}], note },
    sleep:{ bed:"HH:MM", wake:"HH:MM", dur:min, q:1-5, fall, wakes, morning, score, deep, rem, light, awake, rhr, src, note },
    coffee:[{id,t:"HH:MM",k,name,mg,e}],
    sport:[{id,t,name,e,min,int:1-3}],
    habits:{ habitId:1 },
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
