# 4.15: Supplemente zugeklappt bei den Gewohnheiten, gleiche Daten wie im Abend-Check-in.
import subprocess, time, datetime, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8771'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin', device_scale_factor=2)
    ctx.add_init_script("if(!localStorage.getItem('x')){localStorage.setItem('x',1);localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-v1',JSON.stringify({v:1,days:{},cfg:{v:10}}))}")
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 28, 15, 0))
    pg.goto('http://localhost:8771/'); pg.wait_for_timeout(800)
    pg.evaluate("DB.cfg.fold={};render()"); t0 = pg.inner_text('.card.a-habit')
    res.append(('zu', 'Supplemente · 0 von 4' in t0 and 'Vitamin D' not in t0 and t0.index('Supplemente') < t0.index('Automatisch'), t0[-300:]))
    pg.click('.card.a-habit [data-k=hsup]'); pg.click('.card.a-habit [data-act=sup][data-id=vd]')
    t = pg.inner_text('.card.a-habit')
    res.append(('eins', 'Supplemente · 1 von 4' in t and pg.evaluate("day(S.date).sup.vd") == 1))
    pg.click('.card.a-habit [data-act=supall]')
    res.append(('alle', pg.evaluate("JSON.stringify(day(S.date).sup)") == '{"vd":1,"b12":1,"mg":1,"kr":6}' and 'Alle genommen' not in pg.inner_text('.card.a-habit') and pg.locator('.card.a-habit [data-rng="sup.kr"]').count() == 1))
    pg.locator('.card.a-habit').screenshot(path='/tmp/sup.png')
    pg.click('.card.a-habit [data-act=sup][data-id=kr]')
    res.append(('kr weg', pg.locator('.card.a-habit [data-rng="sup.kr"]').count() == 0 and 'Supplemente · 3 von 4' in pg.inner_text('.card.a-habit')))
    res.append(('fehler', not errs, errs))
    b.close()
srv.kill()
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], '' if r[1] else r[2:])
