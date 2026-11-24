# 3.0: Wetter oben rechts (Open-Meteo, Standort / München / Rosenheim / Garmisch)
import subprocess, time, json, datetime, urllib.parse
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3','-m','http.server','8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res=[]; calls=[]
def fake(lat):
    t0 = datetime.date.today() - datetime.timedelta(days=7); days=[str(t0+datetime.timedelta(days=i)) for i in range(15)]
    hrs=[f'{d}T{h:02d}:00' for d in days for h in range(24)]
    return {'current':{'temperature_2m':7.4,'weather_code':2,'is_day':1},
      'daily':{'time':days,'weather_code':[61 if i%2 else 1 for i in range(15)],'temperature_2m_max':[10.6+i for i in range(15)],'temperature_2m_min':[1.2]*15,
        'precipitation_sum':[2.35]*15,'precipitation_probability_max':[40]*15,'sunshine_duration':[14400]*15,'sunrise':[d+'T07:31' for d in days],'sunset':[d+'T16:22' for d in days]},
      'hourly':{'time':hrs,'temperature_2m':[5]*len(hrs),'precipitation_probability':[30]*len(hrs),'weather_code':[3]*len(hrs),'is_day':[1 if 7<=int(h[11:13])<17 else 0 for h in hrs]}}
def route(r):
    q=urllib.parse.parse_qs(urllib.parse.urlparse(r.request.url).query); calls.append(q['latitude'][0])
    r.fulfill(status=200, content_type='application/json', body=json.dumps(fake(q['latitude'][0])), headers={'access-control-allow-origin':'*'})
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':390,'height':780}, service_workers='block', geolocation={'latitude':47.856,'longitude':12.128}, permissions=['geolocation'])
    ctx.route('https://api.open-meteo.com/**', route)
    pg = ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1200); pg.evaluate("fbHide()")
    res.append(('standort genutzt', calls and calls[0]=='47.86'))
    res.append(('kreis da', pg.locator('#app .wxb').count()==1 and '18°' in pg.inner_text('#app .wxb')))
    res.append(('pfeile links', pg.locator('.dnav [data-act=dprev]').count()==1))
    pg.screenshot(path='/tmp/wx_head.png', clip={'x':0,'y':0,'width':390,'height':140})
    pg.click('#app .wxb'); pg.wait_for_timeout(200)
    tx=pg.inner_text('#sbody')
    res.append(('blatt', all(s in tx for s in ['Aktueller Standort','7°','Teils bewölkt','2,4 mm · 40 %','4 h','07:31','16:22','Stundenverlauf','Jetzt','Nächste Tage'])))
    pg.locator('#sheet .sheet-body').screenshot(path='/tmp/wx_sheet.png')
    pg.click('#sbody [data-act=wxloc][data-v=gap]'); pg.wait_for_timeout(500)
    res.append(('ort gewechselt', calls[-1]=='47.49' and 'Garmisch-Partenkirchen ·' in pg.inner_text('#sbody') and pg.evaluate("DB.cfg.wxLoc")=='gap'))
    pg.click('#sbody [data-act=sclose]'); pg.click('[data-act=dprev]'); pg.wait_for_timeout(200)
    res.append(('gestern wetter', '17°' in pg.inner_text('#app .wxb')))
    for i in range(8): pg.click('[data-act=dprev]')
    res.append(('alt ohne kreis', pg.locator('#app .wxb').count()==0))
    n=len(calls); pg.click('[data-act=dtoday]'); pg.wait_for_timeout(300); res.append(('cache', len(calls)==n))
    res.append(('keine fehler', not errs))
    b.close()
srv.kill()
for n,ok in res: print('OK ' if ok else 'FAIL', n)
