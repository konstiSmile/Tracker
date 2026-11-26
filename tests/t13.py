# 4.0: Sync über Supabase. Fake-Server leitet die RPC-Aufrufe an ein lokales PostgreSQL mit dem echten SQL (Rolle anon) weiter.
# Vorher: PostgreSQL auf /tmp:5499 mit Rolle anon und supabase/tracker.sql.
import subprocess, time, json
from playwright.sync_api import sync_playwright
PSQL = ['psql', '-h', '/tmp', '-p', '5499', '-U', 'postgres', '-qtA', '-v', 'ON_ERROR_STOP=1']
def sql(q, admin=False, **v):
    args = PSQL[:]; [args.extend(['-v', f'{k}={x}']) for k, x in v.items()]
    r = subprocess.run(args, input=('' if admin else 'set role anon;\n') + q + ';\n', capture_output=True, text=True)
    if r.returncode: raise Exception(r.stderr.strip().split('\n')[0])
    return r.stdout.strip()
subprocess.run(PSQL + ['-c', 'delete from tracker_days; delete from tracker_meta;'])
CALLS = []
def rpc(route):
    fn = route.request.url.rsplit('/', 1)[1]; b = json.loads(route.request.post_data or '{}'); CALLS.append(fn)
    try:
        if fn == 'tr_pull': out = sql("select tr_pull(:'c', nullif(:'s','')::timestamptz)", c=b['p_code'], s=b.get('p_since') or '')
        elif fn == 'tr_push': out = sql("select tr_push(:'c', :'d'::jsonb, :'m'::jsonb, :'f'::boolean)", c=b['p_code'], d=json.dumps(b.get('p_days', [])), m=json.dumps(b.get('p_meta', {})), f=str(bool(b.get('p_force'))).lower())
        else: return route.fulfill(status=404, body='{}')
        route.fulfill(status=200, content_type='application/json', body=out)
    except Exception as e: route.fulfill(status=400, content_type='application/json', body=json.dumps({'message': str(e)}))
SHEET = []
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []
def dev(b, init=''):
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, service_workers='block')
    ctx.add_init_script("localStorage.setItem('tracker-fb-off','1');" + init)
    ctx.route('https://qbdpzamygonpruaafcrt.supabase.co/**', rpc)
    ctx.route('https://script.google.com/**', lambda r: (SHEET.append(1), r.fulfill(status=200, body='ok')))
    ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(status=500, body=''))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.errs = errs
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(900); pg.add_style_tag(content='#fb{pointer-events:none}')
    return pg
run = lambda pg, o='{}': pg.evaluate(f"sbRun({o})")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    seed = {'v': 1, 'days': {'2026-11-20': {'mood': {'v': 3}}, '2026-11-21': {'note': 'a'}, '2026-11-22': {'sleep': {'bed': '23:00', 'wake': '07:00', 'dur': 480}}, '2026-11-23': {'note': 'b'}, '2026-11-24': {'note': 'c'}}, 'weeks': {'2026-11-16': {'done': 1, 'v': 4}}, 'cfg': {}}
    A = dev(b, f"if(!localStorage.getItem('tracker-v1'))localStorage.setItem('tracker-v1',JSON.stringify({json.dumps(seed)}));localStorage.setItem('tracker-sync',JSON.stringify({{url:'https://script.google.com/x',key:'k',last:0}}))")
    res.append(('tabelle beim start einmal', len(SHEET) == 1, len(SHEET)))
    A.evaluate("S.tab='set';S.sbOpen=1;render()"); A.click('[data-act=sbcreate]'); A.wait_for_timeout(1200)
    code = A.evaluate("sbSt().code")
    res.append(('code + hochgeladen', len(code) == 20 and sql("select count(*) from tracker_days", True) == '5' and sql("select count(*) from tracker_meta", True) == '3' and code[:4] in A.inner_text('#app')))
    A.evaluate("sec(todayStr(),'note');DB.days[todayStr()]={note:'heute'};save()"); A.wait_for_timeout(3600)
    res.append(('änderung nach 3 s gesendet', sql("select count(*) from tracker_days", True) == '6'))
    res.append(('tabelle nicht bei jeder änderung', len(SHEET) == 1, len(SHEET)))
    # Gerät B: leer, Code eingeben
    B_ = dev(b); B_.evaluate("S.tab='set';S.sbOpen=1;render()"); B_.fill('#sbcode', code[:4].lower() + '-' + code[4:]); B_.click('[data-act=sbconnect]'); B_.wait_for_timeout(1500)
    res.append(('B geladen', B_.evaluate("allDates().length") == 6 and B_.evaluate("DB.weeks['2026-11-16'].v") == 4 and B_.evaluate("day('2026-11-22').sleep.bed") == '23:00'))
    # gleichzeitig geändert, ohne Widerspruch → zusammenführen
    A.evaluate("DB.days['2026-11-24'].sport=[{id:'s1',t:'10:00',name:'Rad'}]"); B_.evaluate("DB.days['2026-11-24'].coffee=[{id:'c1',t:'09:00',mg:80,name:'Espresso'}]")
    run(A); run(B_); run(A)
    ok = lambda pg: pg.evaluate("(day('2026-11-24').sport||[]).length==1&&(day('2026-11-24').coffee||[]).length==1&&day('2026-11-24').note==='c'")
    res.append(('zusammengeführt ohne frage', ok(A) and ok(B_) and B_.evaluate("sbAskDays().length") == 0))
    # Widerspruch
    A.evaluate("DB.days['2026-11-22'].sleep.bed='23:30'"); B_.evaluate("DB.days['2026-11-22'].sleep.bed='00:15'")
    run(A); run(B_)
    res.append(('widerspruch erkannt', B_.evaluate("sbAskDays()") == ['2026-11-22'] and B_.evaluate("day('2026-11-22').sleep.bed") == '00:15'))
    B_.evaluate("S.tab='heute';S.date=todayStr();render()")
    res.append(('karte auf heute', 'Unterschiede klären' in B_.inner_text('#app')))
    B_.click('#app [data-act=sbask]'); B_.wait_for_timeout(200)
    t = B_.inner_text('#sbody')
    res.append(('blatt zeigt werte', 'Ins Bett' in t and '00:15' in t and '23:30' in t))
    B_.locator('#sbody').screenshot(path='/tmp/sbask.png')
    B_.click('[data-act=sbresolve]'); res.append(('ohne wahl nicht', B_.evaluate("sbAskDays().length") == 1))
    B_.click('[data-act=sbpick][data-v=b]'); B_.click('[data-act=sbresolve]'); B_.wait_for_timeout(3600); run(A)
    res.append(('aufgelöst', B_.evaluate("sbAskDays().length") == 0 and B_.evaluate("day('2026-11-22').sleep.bed") == '23:30' and A.evaluate("day('2026-11-22').sleep.dur") == 450 and B_.evaluate("day('2026-11-22').sleep.dur") == 450))
    # einzelnen Tag löschen
    A.evaluate("delete DB.days['2026-11-21']"); run(A); run(B_)
    res.append(('löschen kommt an', B_.evaluate("!DB.days['2026-11-21']") and sql("select deleted from tracker_days where d='2026-11-21'", True) == 't'))
    # leere App: alles gelöscht → zurückgehalten
    B_.evaluate("DB=norm({v:1});DB.cfg.limit=999"); run(B_)
    res.append(('löschschutz', len(B_.evaluate("sbSt().delHold")) >= 4 and sql("select count(*) from tracker_days where not deleted", True) == '5' and sql("select data->>'limit' from tracker_meta where k='cfg'", True) != '999'))
    B_.evaluate("S.tab='set';S.sbOpen=1;render()"); res.append(('hinweis', 'fehlen auf diesem Gerät' in B_.inner_text('#app')))
    B_.click('[data-act=sbrestore]'); B_.wait_for_timeout(1500)
    res.append(('wiederhergestellt', B_.evaluate("allDates().length") == 5 and not B_.evaluate("sbSt().delHold")))
    # Widget-Funktion
    w = json.loads(sql("select tr_widget(:'c')", c=code))
    res.append(('widget', w['ok'] and len(w['days']) == 5 and w['hint'] and 'habits' in w['cfg']))
    res.append(('trennen', (B_.click('[data-act=sboff]'), B_.click('[data-act=sboff]'), B_.evaluate("!sbSt() && allDates().length==5"))[2]))
    res.append(('keine fehler', not A.errs and not B_.errs, A.errs + B_.errs))
    res.append(('breite', B_.evaluate("document.documentElement.scrollWidth<=390")))
    b.close()
srv.terminate()
for r in res: print('OK ' if r[1] else 'FEHLER', r[0], *(r[2:] if not r[1] else []))
print('aufrufe', len(CALLS))
