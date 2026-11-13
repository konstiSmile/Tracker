# 2.7: Check-in-Schritt „Was hast du heute so gemacht?“
import json, subprocess, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3','-m','http.server','8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res=[]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':390,'height':780}, service_workers='block')
    pg = ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(700); pg.evaluate("fbHide()")
    # alte Daten ohne acts -> acts ergänzt
    res.append(('acts da', pg.evaluate("DB.cfg.acts.length")==7))
    pg.evaluate("A.ciopen()"); pg.wait_for_timeout(200)
    pg.click('[data-act=cinext]'); pg.click('[data-act=cinext]'); pg.wait_for_timeout(200)
    res.append(('schritt 3', 'so gemacht' in pg.inner_text('#sbody') and '3 von 6' in pg.inner_text('#sbody')))
    wd = pg.evaluate("parse(todayStr()).getDay()")
    first = pg.locator('#sbody [data-act=did]').first.get_attribute('data-id')
    res.append(('reihenfolge', first == ('erholung' if wd in (0,6) else 'uni')))
    pg.click('#sbody [data-act=did][data-id=uni]'); pg.click('#sbody [data-act=did][data-id=haushalt]'); pg.wait_for_timeout(200)
    res.append(('an', pg.locator('#sbody [data-act=did].on').count()==2))
    pg.fill('#sbody textarea[data-f="did.note"]', 'Mit Lena gekocht'); pg.locator('#sbody textarea').dispatch_event('change'); pg.wait_for_timeout(100)
    pg.click('#sbody [data-act=did][data-id=haushalt]'); pg.wait_for_timeout(200)
    D = pg.evaluate("day(todayStr()).did")
    res.append(('daten', D == {'t':['uni'],'note':'Mit Lena gekocht'}))
    res.append(('text bleibt', pg.input_value('#sbody textarea[data-f="did.note"]')=='Mit Lena gekocht'))
    pg.locator('#sbody .ci-top').evaluate("e=>e.closest('#sheet').scrollTop=0")
    pg.locator('#sheet').screenshot(path='/tmp/ci3.png')
    for _ in range(4): pg.click('[data-act=cinext]'); pg.wait_for_timeout(150)
    res.append(('abschluss', 'Geschafft' in pg.inner_text('#sbody')))
    # leeren -> did weg
    pg.evaluate("S.ci=null; const D=day(todayStr()); D.did={t:['uni']}; A.did({dataset:{id:'uni'}}); setField('did.note','',null)")
    res.append(('aufgeräumt', pg.evaluate("day(todayStr()).did")==None))
    # Erfolge: 3 Uni-Tage in Folge, gestern prokrastiniert
    pg.evaluate("const t=todayStr(); DB.days[addDays(t,-2)]={did:{t:['uni']}}; DB.days[addDays(t,-1)]={did:{t:['uni','prokr']}}; DB.days[t]={did:{t:['uni','arbeit','erholung']}}")
    L = pg.evaluate("fbList(todayStr()).filter(x=>x.g==='did').map(x=>x.id)")
    res.append(('erfolge', all(x in L for x in ['du3','dua','dpk','dho']))); print(L)
    pg.evaluate("DB.days[todayStr()].habits={h1:1}; DB.cfg.habits.filter(h=>h.type==='pos'&&!h.hid).forEach(h=>DB.days[todayStr()].habits[h.id]=1)")
    pg.evaluate("S.ci={step:6}; openSheet(ciSheet())")
    res.append(('abschluss beide gruppen', pg.locator('#sbody .fbrow').count()>=2))
    res.append(('hint', isinstance(pg.evaluate("widgetHint().fb"), list)))
    res.append(('breite', pg.evaluate('document.documentElement.scrollWidth')<=390)); res.append(('fehler', not errs)); print(errs)
    b.close()
srv.kill(); print(res); print('OK' if all(r[1] for r in res) else 'FEHLER')
