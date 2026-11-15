# 2.8: Energie, Anspannung, Krank im Check-in
import subprocess, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3','-m','http.server','8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res=[]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':390,'height':780}, service_workers='block')
    pg = ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(700); pg.evaluate("fbHide(); A.ciopen()"); pg.wait_for_timeout(200)
    res.append(('zwei regler', pg.locator('#sbody .evbox').count()==2 and pg.locator('#sbody .evbox.unset').count()==2))
    r = pg.locator('#sbody [data-rng="ev.en"]')
    r.evaluate("e=>{e.value=4;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}")
    res.append(('energie', pg.evaluate("day(todayStr()).ev.en")==4 and 'wach' in pg.locator('#sbody .evbox').first.inner_text()))
    pg.locator('#sbody [data-rng="ev.an"]').evaluate("e=>{e.value=2;e.dispatchEvent(new Event('change',{bubbles:true}))}")
    pg.click('#sbody [data-act=krank]'); pg.wait_for_timeout(200)
    res.append(('daten', pg.evaluate("day(todayStr()).ev")=={'en':4,'an':2,'krank':1}))
    res.append(('regler bleibt nach neu zeichnen', pg.locator('#sbody [data-rng="ev.en"]').input_value()=='4' and pg.locator('#sbody .evbox.unset').count()==0))
    pg.click('#sbody [data-act=krank]'); res.append(('krank aus', 'krank' not in pg.evaluate("day(todayStr()).ev")))
    pg.locator('#sheet').screenshot(path='/tmp/ci1.png')
    pg.evaluate("delete DB.days[todayStr()].ev.en; delete DB.days[todayStr()].ev.an; cleanDay(todayStr())")
    res.append(('aufgeräumt', pg.evaluate("day(todayStr()).ev")==None))
    res.append(('breite', pg.evaluate('document.documentElement.scrollWidth')<=390)); res.append(('fehler', not errs)); print(errs)
    b.close()
srv.kill(); print(res); print('OK' if all(r[1] for r in res) else 'FEHLER')
