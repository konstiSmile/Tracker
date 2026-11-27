# 4.2: Mitteilungen. Push-Schnittstellen des Browsers werden nachgebildet, RPCs gehen an das lokale PostgreSQL
# (wie t13/t14, dazu supabase/tracker_push.sql ohne den Zeitplan-Teil), die Edge Function wird simuliert.
import subprocess, time, json
from playwright.sync_api import sync_playwright
PSQL = ['psql', '-h', '/tmp', '-p', '5499', '-U', 'postgres', '-qtA', '-v', 'ON_ERROR_STOP=1']
def sql(q, admin=False, **v):
    args = PSQL[:]; [args.extend(['-v', f'{k}={x}']) for k, x in v.items()]
    r = subprocess.run(args, input=('' if admin else 'set role anon;\n') + q + ';\n', capture_output=True, text=True)
    if r.returncode: raise Exception(r.stderr.strip().split('\n')[0])
    return r.stdout.strip()
sql('delete from tracker_push; delete from tracker_health', True)
CODE = 'ABCDEFGHJKMNPQRSTUVW'
fn_calls = []
def rpc(route):
    url = route.request.url
    if '/functions/v1/tracker-push' in url:
        b = json.loads(route.request.post_data or '{}'); fn_calls.append(b)
        if b.get('mode') == 'key': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'key': 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM'}))
        n = int(sql("select count(*) from tracker_push", True))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'n': n, 'r': ['ok'] * n}))
    fn = url.rsplit('/', 1)[1]; b = json.loads(route.request.post_data or '{}'); vs = {}; parts = []
    for i, (k, x) in enumerate(b.items()):
        vs[f'a{i}'] = json.dumps(x) if isinstance(x, (dict, list)) else str(x)
        parts.append(f"{k} => :'a{i}'" + ('::jsonb' if isinstance(x, (dict, list)) else ''))
    try: route.fulfill(status=200, content_type='application/json', body=sql(f"select {fn}({', '.join(parts)})", **vs) or 'null')
    except Exception as e: route.fulfill(status=400, content_type='application/json', body=json.dumps({'message': str(e)}))
MOCK = """
(() => {
  window.__perm = 'granted'; let sub = null;
  const mk = () => ({ endpoint: 'https://web.push.apple.com/test' + (window.__epn || ''), toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQt', auth: 'tBHItJI5svbpez7KI4CCXg' } }; }, unsubscribe: async () => { sub = null; return true; } });
  const pm = { getSubscription: async () => sub, subscribe: async o => { window.__key = o.applicationServerKey.length; sub = mk(); return sub; } };
  window.__drop = () => { sub = null; };
  Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({ pushManager: pm }), register: () => Promise.resolve() } });
  window.PushManager = function () { };
  window.Notification = { get permission() { return window.__perm; }, requestPermission: async () => window.__perm };
  const mm = window.matchMedia.bind(window); window.matchMedia = q => q.includes('standalone') ? { matches: !window.__browser, addListener() { }, addEventListener() { } } : mm(q);
})();
"""
srv = subprocess.Popen(['python3', '-m', 'http.server', '8766'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block', timezone_id='Europe/Berlin')
    ctx.add_init_script(MOCK)
    ctx.add_init_script(f"if(!localStorage.getItem('tracker-sb')){{localStorage.setItem('tracker-fb-off','1');localStorage.setItem('tracker-sb',JSON.stringify({{code:'{CODE}'}}))}}")
    ctx.route('https://qbdpzamygonpruaafcrt.supabase.co/**', rpc); ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8766/'); pg.wait_for_timeout(1200); pg.add_style_tag(content='#fb{pointer-events:none}')
    pg.evaluate("S.tab='set';render()")
    pg.locator('summary', has_text='Mitteilungen').click(); pg.wait_for_timeout(150)
    t = pg.inner_text('#app')
    res.append(('abschnitt', '6:30 Uhr' in t and '9:00 Uhr' in t and pg.locator('[data-act=puon]').count() == 1))
    pg.locator('[data-act=puon]').click(); pg.wait_for_timeout(800)
    res.append(('eingeschaltet', 'Eingeschaltet' in pg.inner_text('#app') and pg.evaluate("puSt().on") == 1))
    res.append(('schlüssel geholt', {'mode': 'key'} in fn_calls and pg.evaluate("window.__key") == 65))
    row = sql("select endpoint, code_hash = encode(sha256(convert_to(:'c','UTF8')),'hex') from tracker_push", True, c=CODE)
    res.append(('abo in db', row == 'https://web.push.apple.com/test|t', row))
    pg.locator('section, details').filter(has_text='Mitteilungen').first.screenshot(path='/tmp/push_on.png')
    pg.locator('[data-act=putest]').click(); pg.wait_for_timeout(600)
    res.append(('test', any(c.get('mode') == 'test' and c.get('code') == CODE for c in fn_calls) and 'Gesendet' in pg.inner_text('#app')))
    # Adresse ändert sich (iOS erneuert Abos) -> beim Start neu melden
    pg.evaluate("window.__drop(); window.__epn = '2'"); pg.evaluate("puCheck()"); pg.wait_for_timeout(600)
    res.append(('neu gemeldet', 'test2' in sql("select string_agg(endpoint, ',') from tracker_push", True) and pg.evaluate("puSt().ep").endswith('test2')))
    pg.locator('[data-act=puoff]').click(); pg.wait_for_timeout(600)
    left = sql("select string_agg(endpoint, ',') from tracker_push", True)
    res.append(('ausgeschaltet', pg.evaluate("puSt().on") is None and 'test2' not in left and pg.locator('[data-act=puon]').count() == 1, left))
    # nicht erlaubt
    pg.evaluate("window.__perm = 'denied'"); pg.locator('[data-act=puon]').click(); pg.wait_for_timeout(500)
    res.append(('nicht erlaubt', 'nicht erlaubt' in pg.inner_text('#app') and pg.evaluate("puSt().on") is None))
    # im Browser statt Home-Bildschirm
    pg.evaluate("window.__perm = 'granted'; window.__browser = 1"); pg.locator('[data-act=puon]').click(); pg.wait_for_timeout(400)
    res.append(('nur home-bildschirm', 'Home-Bildschirm' in pg.inner_text('#app')))
    res.append(('keine fehler', not errs, errs)); res.append(('breite', pg.evaluate("document.documentElement.scrollWidth<=390")))
    b.close()
srv.terminate()
# Service Worker: Push zeigt Mitteilung, Tippen öffnet die App
sw = open('/home/claude/tracker/sw.js').read()
res.append(('sw push', "addEventListener('push'" in sw and 'showNotification' in sw and "addEventListener('notificationclick'" in sw and "const CACHE = 'tracker-v" in sw))
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], *(r[2:] if not r[1] else []))
