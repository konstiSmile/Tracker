# 4.17: Schlafscore aus Uhrdaten.
import subprocess, time, datetime, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8773'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
T = datetime.date(2026, 11, 28); ds = lambda k: (T - datetime.timedelta(days=k)).isoformat()
base = {ds(k): {'sleep': {'bed': '23:00', 'wake': '07:00', 'deep': 80, 'rem': 110, 'light': 270, 'awake': 10, 'hrv': 80, 'rhr': 60, 'src': 'uhr'}} for k in range(1, 8)}
days = dict(base); days[ds(0)] = {'sleep': {'bed': '23:10', 'wake': '07:00', 'deep': 80, 'rem': 110, 'light': 270, 'awake': 10, 'hrv': 85, 'rhr': 59, 'src': 'uhr'}}
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin', device_scale_factor=2)
    ctx.add_init_script("if(!localStorage.getItem('x')){localStorage.setItem('x',1);localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-v1',JSON.stringify({v:1,days:%s,cfg:{v:10}}))}" % json.dumps(days))
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 28, 15, 0))
    pg.goto('http://localhost:8773/'); pg.wait_for_timeout(800)
    r = pg.evaluate(f"sleepScore('{ds(0)}')")
    res.append(('gut voll', r['v'] >= 95 and not r['part'], r))
    r = pg.evaluate(f"(()=>{{const s=day('{ds(0)}').sleep; s.bed='01:30'; s.light=120; s.awake=45; s.hrv=60; s.rhr=66; return sleepScore('{ds(0)}');}})()")
    res.append(('schlecht', r['v'] < 40, r))
    r = pg.evaluate(f"sleepScore('{ds(10)}')")
    res.append(('ohne daten', r is None, r))
    r = pg.evaluate(f"(()=>{{DB.days['2026-10-01']={{sleep:{{bed:'23:00',wake:'07:00',deep:80,rem:110,light:270,awake:10,src:'uhr'}}}}; return sleepScore('2026-10-01');}})()")
    res.append(('vorläufig', r['part'] and r['v'] >= 95, r))
    pg.evaluate(f"Object.assign(day('{ds(0)}').sleep,{{bed:'23:10',light:270,awake:10,hrv:85,rhr:59}});DB.cfg.fold={{}};S.fold[S.date]=false;render()")
    c = pg.locator('.card.a-sleep'); pg.click('.card.a-sleep [data-k=slsc]')
    t = c.inner_text()
    res.append(('karte', 'Schlafscore' in t and 'Regelmäßigkeit' in t and 'von 35' in t, t[-400:]))
    c.screenshot(path='/tmp/score.png')
    pg.evaluate("DB.cfg.fold={sleep:true};S.fold[S.date]=true;render()")
    res.append(('zugeklappt', 'Score' in pg.locator('.card.a-sleep').inner_text()))
    res.append(('fehler', not errs, errs))
    b.close()
srv.kill()
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], '' if r[1] else r[2:])
