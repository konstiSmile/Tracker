# 4.16: Schlafverlauf aus den Health-Rohdaten (Phasen mit Start/Ende).
import subprocess, time, datetime, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8772'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
seq = [('Kern', 30), ('Tief', 40), ('Kern', 50), ('REM', 20), ('Wach', 4), ('Kern', 60), ('Tief', 25), ('REM', 35), ('Kern', 70), ('Wach', 2), ('REM', 30), ('Kern', 40)]
t = datetime.datetime(2026, 11, 27, 23, 20); lines = []
for k, m in seq:
    e = t + datetime.timedelta(minutes=m); lines.append(f"{k};{t.isoformat()}+01:00;{e.isoformat()}+01:00"); t = e
hl = {'2026-11-28': {'sleep': '\n'.join(lines), 'rhr': '62', 'hrv': '80'}}
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin', device_scale_factor=2)
    ctx.add_init_script("if(!localStorage.getItem('x')){localStorage.setItem('x',1);localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-health',%s);localStorage.setItem('tracker-v1',JSON.stringify({v:1,days:{},cfg:{v:10}}))}" % json.dumps(json.dumps(hl)))
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 28, 15, 0))
    pg.goto('http://localhost:8772/'); pg.wait_for_timeout(800)
    pg.evaluate("hlFill();DB.cfg.fold={};S.fold[S.date]=false;render()"); pg.wait_for_timeout(200)
    c = pg.locator('.card.a-sleep')
    res.append(('diagramm', c.locator('.slchart svg rect').count() == 4 + len(seq), c.locator('.slchart svg rect').count()))
    leg = c.locator('.slleg').inner_text()
    res.append(('legende', all(x in leg for x in ['Wach 0:06', 'REM 1:25', 'Kern 4:10', 'Tief 1:05']), leg))
    txt = c.inner_text().replace('\u00a0', ' ')
    res.append(('zeiten', '23:20' in txt and '6:24' not in txt and 'Ruhepuls 62' in txt and 'Tief' not in c.locator('.hlrow').inner_text(), txt[:300]))
    c.screenshot(path='/tmp/slchart.png')
    pg.evaluate("localStorage.setItem('tracker-health','{}');render()")
    res.append(('ohne rohdaten', c.locator('.slchart').count() == 0 and 'Tief' in c.inner_text()))
    res.append(('fehler', not errs, errs))
    b.close()
srv.kill()
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], '' if r[1] else r[2:])
