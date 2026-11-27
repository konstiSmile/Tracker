# 4.1/4.2: Apple Health (ohne Workouts seit 4.2) über tracker_health (Kurzbefehl simuliert per tr_health_put). Voraussetzungen wie t13, dazu supabase/tracker_health.sql.
import subprocess, time, json, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
PSQL = ['psql', '-h', '/tmp', '-p', '5499', '-U', 'postgres', '-qtA', '-v', 'ON_ERROR_STOP=1']
def sql(q, admin=False, **v):
    args = PSQL[:]; [args.extend(['-v', f'{k}={x}']) for k, x in v.items()]
    r = subprocess.run(args, input=('' if admin else 'set role anon;\n') + q + ';\n', capture_output=True, text=True)
    if r.returncode: raise Exception(r.stderr.strip().split('\n')[0])
    return r.stdout.strip()
sql('delete from tracker_days; delete from tracker_meta; delete from tracker_health', True)
def rpc(route):
    fn = route.request.url.rsplit('/', 1)[1]; b = json.loads(route.request.post_data or '{}'); vs = {}; parts = []
    for i, (k, x) in enumerate(b.items()):
        if x is None: parts.append(f'{k} => null'); continue
        vs[f'a{i}'] = json.dumps(x) if isinstance(x, (dict, list)) else str(x).lower() if isinstance(x, bool) else str(x)
        parts.append(f"{k} => :'a{i}'" + ('::jsonb' if isinstance(x, (dict, list)) else '::boolean' if isinstance(x, bool) else ''))
    try: route.fulfill(status=200, content_type='application/json', body=sql(f"select {fn}({', '.join(parts)})", **vs))
    except Exception as e: route.fulfill(status=400, content_type='application/json', body=json.dumps({'message': str(e)}))
now = datetime.datetime.now(ZoneInfo('Europe/Berlin')); T = now.date(); Y = T - datetime.timedelta(days=1)
iso = lambda d, hm: f"{d.isoformat()}T{hm}:00+01:00"; de = lambda d, hm: f"{d.day:02d}.{d.month:02d}.{d.year}, {hm}"
CODE = 'ABCDEFGHJKMNPQRSTUVW'
sleep = '\n'.join([f"Im Bett;{iso(Y,'22:50')};{iso(T,'07:00')}", f"Kern;{iso(Y,'23:10')};{iso(T,'01:00')}", f"Tief;{iso(T,'01:00')};{iso(T,'02:00')}", f"REM;{iso(T,'02:00')};{iso(T,'03:00')}", f"Wach;{iso(T,'03:00')};{iso(T,'03:10')}", f"Kern;{iso(T,'03:10')};{iso(T,'06:50')}"])
wo = '\n'.join([f"Radfahren;{de(T,'10:15')};{de(T,'10:58')}", f"Traditionelles Krafttraining;{iso(T,'17:00')};{iso(T,'17:45')}", f"Gehen;{iso(Y,'12:00')};{iso(Y,'12:30')}"])
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin')
    ctx.add_init_script(f"if(!localStorage.getItem('tracker-sb')){{localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-sb',JSON.stringify({{code:'{CODE}'}}));localStorage.setItem('tracker-health',JSON.stringify({{'{(T-datetime.timedelta(days=3)).isoformat()}':{{rhr:50}}}}));localStorage.setItem('tracker-v1',JSON.stringify({{v:1,days:{{'{T.isoformat()}':{{sport:[{{id:'k1',t:'17:20',name:'Krafttraining'}}]}}}}}}))}}")
    ctx.route('https://qbdpzamygonpruaafcrt.supabase.co/**', rpc); ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1200); pg.add_style_tag(content='#fb{pointer-events:none}')
    pg.evaluate("DB.cfg.fold={};render()")
    res.append(('karte uhrdaten holen', 'Jetzt synchronisieren' in pg.inner_text('#app')))
    # Kurzbefehl schickt Daten
    sql("select tr_health_put(:'c', :'d', :'j'::jsonb)", c=CODE, d=T.isoformat(), j=json.dumps({'sleep': sleep, 'rhr': '52', 'hrv': 47.6, 'workouts': wo, 'steps_y': 8432}))
    pg.evaluate("sbRun()"); pg.wait_for_timeout(500)
    s = pg.evaluate(f"day('{T.isoformat()}').sleep")
    res.append(('schlaf', s.get('bed') == '23:10' and s.get('wake') == '06:50' and s.get('deep') == 60 and s.get('rem') == 60 and s.get('light') == 330 and s.get('awake') == 10 and s.get('dur') == 460 and s.get('src') == 'uhr', s))
    res.append(('puls hrv', s.get('rhr') == 52 and s.get('hrv') == 48))
    res.append(('schritte gestern', pg.evaluate(f"day('{Y.isoformat()}').steps") == 8432))
    res.append(('karte weg', 'Jetzt synchronisieren' not in pg.inner_text('#app')))
    t = pg.inner_text('#app').replace('\u00a0', ' ')
    res.append(('anzeige schlaf', 'HRV 48 ms' in t and 'Ruhepuls 52' in t and 'Tief 1:00' in t))
    res.append(('keine workouts', 'Von der Uhr' not in t and pg.locator('[data-act=hwadd]').count() == 0))
    pg.locator('section.a-sleep').screenshot(path='/tmp/hlsleep.png')
    # eigener Eintrag bleibt, gelöschter Wert kommt nicht wieder
    pg.evaluate(f"delete DB.days['{T.isoformat()}'].sleep.hrv; save(); sbRun()"); pg.wait_for_timeout(600)
    res.append(('kein erneutes füllen', pg.evaluate(f"day('{T.isoformat()}').sleep.hrv") is None))
    pg.wait_for_timeout(3500)
    res.append(('gesendet', '"steps": 8432' in sql("select data::text from tracker_days where d=:'d'", True, d=Y.isoformat())))
    pg.evaluate("S.tab='set';render()"); t = pg.inner_text('#app'); res.append(('einstellungen', 'Apple Health' in t and 'Workouts' not in t and 'Mitteilungen' in t))
    res.append(('keine fehler', not errs, errs)); res.append(('breite', pg.evaluate("document.documentElement.scrollWidth<=390")))
    b.close()
srv.terminate()
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], *(r[2:] if not r[1] else []))
