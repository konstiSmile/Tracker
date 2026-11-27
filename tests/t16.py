# 4.5: Morgen-Check-in (Karte 4–13 Uhr, Blatt mit Erholung, Einschlafen, Stimmungsfeld, Notiz). Uhrzeit per Playwright-Clock fest auf 8:00.
import subprocess, time, datetime
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8768'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin', device_scale_factor=2)
    ctx.add_init_script("localStorage.setItem('tracker-fb-off','1')")
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 28, 8, 0))
    pg.goto('http://localhost:8768/'); pg.wait_for_timeout(800); pg.add_style_tag(content='#fb{pointer-events:none}')
    res.append(('karte', 'Guten Morgen' in pg.inner_text('#app') and pg.locator('#app [data-act=moopen]').count() >= 1))
    pg.screenshot(path='/tmp/mo_karte.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 400})
    pg.locator('#app .hlbig [data-act=moopen]').click(); pg.wait_for_timeout(200)
    res.append(('blatt', not pg.locator('#sheet').is_hidden() and 'Wie schnell' in pg.inner_text('#sbody')))
    pg.locator('#sbody [data-act=srate][data-v="4"]').click(); pg.locator('#sbody [data-act=sfall][data-v=schnell]').click()
    f = pg.locator('#sbody #mfield').bounding_box(); pg.mouse.move(f['x'] + f['width'] * .75, f['y'] + f['height'] * .25); pg.mouse.down(); pg.mouse.move(f['x'] + f['width'] * .76, f['y'] + f['height'] * .26); pg.mouse.up(); pg.wait_for_timeout(200)
    pg.locator('#sbody textarea').fill('Wirr geträumt'); pg.locator('#sbody textarea').blur(); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/mo_blatt.png')
    D = pg.evaluate("day(todayStr())")
    res.append(('daten', D.get('sleep', {}).get('q') == 4 and D['sleep'].get('fall') == 'schnell' and D['sleep'].get('note') == 'Wirr geträumt' and len(D.get('mood', {}).get('log', [])) == 1 and D['mood']['log'][0].get('e', 0) > 3.5, D))
    pg.locator('#sbody [data-act=modone]').click(); pg.wait_for_timeout(200)
    t = pg.inner_text('#app')
    res.append(('fertig', pg.evaluate("day(todayStr()).mo") == 1 and 'Guten Morgen' not in t and 'gut erholt · schnell eingeschlafen' in t))
    res.append(('keine fehler', not errs, errs))
srv.terminate()
for r in res: print('OK ' if r[1] else 'FEHLER', *[x for x in r if not isinstance(x, bool)])
