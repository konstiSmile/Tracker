# 4.7: automatische Gewohnheiten Koffein-Stopp und Vor Mitternacht geschlafen (Uhr fest 16 Uhr Berlin).
import subprocess, time, datetime, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8770'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
T = datetime.date(2026, 11, 28); ds = lambda k: (T - datetime.timedelta(days=k)).isoformat()
days = {ds(0): {'coffee': [{'id': 'c1', 't': '09:00', 'name': 'Espresso', 'mg': 63}], 'sleep': {'bed': '23:30', 'wake': '07:00'}},
        ds(1): {'coffee': [{'id': 'c2', 't': '10:00', 'name': 'Espresso', 'mg': 63}], 'sleep': {'bed': '22:50', 'wake': '06:40'}},
        ds(2): {'coffee': [{'id': 'c3', 't': '15:30', 'name': 'Espresso', 'mg': 63}], 'sleep': {'bed': '00:40', 'wake': '08:00'}}}
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin', device_scale_factor=2)
    ctx.add_init_script("if(!localStorage.getItem('x')){localStorage.setItem('x',1);localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-v1',JSON.stringify({v:1,days:%s,cfg:{v:9}}))}" % json.dumps(days))
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 28, 15, 0))
    pg.goto('http://localhost:8770/'); pg.wait_for_timeout(800)
    r = pg.evaluate(f"AUTO_H.map(a => [a.f('{ds(0)}'), a.f('{ds(1)}'), a.f('{ds(2)}'), a.f('{ds(5)}'), autoStreak(a, '{ds(0)}')])")
    res.append(('koffein', r[0] == [True, True, False, None, 2], r[0]))
    res.append(('vor 22', r[1] == [False, False, False, None, 0], r[1]))
    res.append(('vor 23', r[2] == [False, True, False, None, 0], r[2]))
    res.append(('mitternacht', r[3] == [True, True, False, None, 2], r[3]))
    g = pg.evaluate("['21:30','22:00','22:01','23:00','23:59','00:10'].map(b => AUTO_H.slice(1).map(a => { DB.days['2026-11-20'] = {sleep:{bed:b}}; return a.f('2026-11-20'); }))")
    res.append(('stufen', g == [[True,True,True],[True,True,True],[False,True,True],[False,True,True],[False,False,True],[False,False,False]], g))
    pg.evaluate("DB.cfg.fold={};render()"); t = pg.inner_text('.card.a-habit')
    res.append(('karte', 'Automatisch' in t and 'Koffein\u2011Stopp' in t and '2 Tage in Folge' in t))
    pg.locator('.card.a-habit').screenshot(path='/tmp/auto.png')
    pg.evaluate(f"day('{ds(0)}').coffee.push({{id:'c9',t:'14:20',name:'Cola',mg:33}});render()")
    res.append(('nach 14 uhr', 'diesmal nicht' in pg.inner_text('.card.a-habit')))
    res.append(('keine fehler', not errs, errs))
srv.terminate()
for r in res: print('OK ' if r[1] else 'FEHLER', *[x for x in r if not isinstance(x, bool)])
