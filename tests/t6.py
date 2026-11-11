import json, subprocess, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3','-m','http.server','8765'], cwd='/home/claude/tracker', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res=[]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':390,'height':780}, service_workers='block')
    pg = ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(700); pg.evaluate("S.tab='settings';render();fbHide()"); pg.wait_for_timeout(300)
    det = pg.locator('details:has(summary:text-is("App-Ideen"))'); res.append(('kachel', det.count()==1))
    det.locator('summary').click(); ta = det.locator('textarea'); ta.fill('Idee eins\nIdee zwei'); pg.wait_for_timeout(1500)
    db = pg.evaluate("JSON.parse(localStorage.getItem('tracker-v1'))"); res.append(('gespeichert', db['cfg'].get('ideas')=='Idee eins\nIdee zwei'))
    pg.reload(); pg.wait_for_timeout(700); pg.evaluate("S.tab='settings';render();fbHide()"); pg.locator('summary:text-is("App-Ideen")').click()
    res.append(('nach neu laden', pg.locator('details:has(summary:text-is("App-Ideen")) textarea').input_value()=='Idee eins\nIdee zwei'))
    h = pg.evaluate("widgetHint()"); res.append(('hint', h['d']==pg.evaluate('todayStr()') and isinstance(h['fb'], list)))
    res.append(('breite', pg.evaluate('document.documentElement.scrollWidth')<=390)); res.append(('fehler', not errs))
    pg.locator('details:has(summary:text-is("App-Ideen"))').screenshot(path='/tmp/ideen.png')
    b.close()
srv.kill(); print(res)
