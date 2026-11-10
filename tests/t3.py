import json,subprocess,time,sys,datetime
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765','-d','/home/claude/tracker'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
ok=0; bad=[]
def chk(n,c):
    global ok
    if c: ok+=1
    else: bad.append(n)
today=datetime.date.today().isoformat(); yday=(datetime.date.today()-datetime.timedelta(days=1)).isoformat()
seed={"v":1,"days":{yday:{"mood":{"v":4.2,"tags":["froh"]},"coffee":[{"id":"a","t":"08:00","k":"espresso","name":"Espresso","mg":63}]},
 today:{"coffee":[{"id":"b","t":"08:10","k":"espresso","name":"Espresso","mg":63},{"id":"c","t":"13:00","k":"filter","name":"Filterkaffee Tasse","mg":95}]}}}
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for theme in ['light','dark']:
        sd=json.loads(json.dumps(seed)); sd['cfg']={'theme':theme,'v':6}
        ctx=b.new_context(viewport={'width':390,'height':780},has_touch=True,is_mobile=True,service_workers='block',device_scale_factor=2)
        ctx.add_init_script("if(!sessionStorage.s){sessionStorage.s=1;localStorage.setItem('tracker-v1',%s)}"%json.dumps(json.dumps(sd)))
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/'); pg.wait_for_selector('.card'); pg.add_style_tag(content='#fb{pointer-events:none}')
        T=theme+': '
        # --- Stimmung mehrfach
        def slide(v): pg.evaluate("v=>{const s=document.querySelector('.mslider');s.value=v;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))}",v)
        slide(2); 
        chk(T+'1 Eintrag',pg.locator('.mlog .ent').count()==1)
        slide(2.4)
        chk(T+'aktiver Eintrag wird geändert',pg.locator('.mlog .ent').count()==1 and pg.evaluate("DB.days[S.date].mood.log[0].v")==2.4)
        pg.click('[data-act=mnew]'); slide(4.4)
        chk(T+'2 Einträge',pg.locator('.mlog .ent').count()==2)
        chk(T+'Schnitt',pg.evaluate("DB.days[S.date].mood.v")==3.4)
        pg.evaluate("S.ma.at-=7e5;render()"); 
        chk(T+'Leerlauf zeigt Schnitt','Ø' in pg.inner_text('#mood-l'))
        slide(5)
        chk(T+'nach Ablauf neuer Eintrag',pg.locator('.mlog .ent').count()==3)
        pg.locator('.mlog [data-act=msel]').first.click(); slide(1.4)
        chk(T+'antippen wählt aus',pg.locator('.mlog .ent').count()==3 and sorted(pg.evaluate("DB.days[S.date].mood.log.map(x=>x.v)"))==[1.4,4.4,5])
        pg.locator('.mlog [data-act=mdel]').first.click()
        chk(T+'löschen',pg.locator('.mlog .ent').count()==2)
        pg.locator('.mlog [data-act=tpick]').first.click(); pg.wait_for_selector('.tp-wheel'); pg.click('[data-act=tpdone]')
        chk(T+'Zeitrad schließt',pg.locator('#sheet').is_hidden())
        # alter Tag ohne log
        pg.click('[data-act=dprev]')
        chk(T+'Alt-Eintrag sichtbar',pg.locator('.mlog .ent').count()==1 and '4,2' in pg.inner_text('.mlog'))
        slide(3)
        chk(T+'Alt-Eintrag bleibt, neuer dazu',pg.evaluate("DB.days[S.date].mood.log.length")==2 and pg.evaluate("DB.days[S.date].mood.v")==3.6 and pg.evaluate("DB.days[S.date].mood.tags[0]")=='froh')
        pg.locator('.mlog [data-act=mdel]').nth(0).click(); pg.locator('.mlog [data-act=mdel]').nth(0).click()
        chk(T+'alles gelöscht, Gefühle bleiben',pg.evaluate("!DB.days[S.date].mood.v && !DB.days[S.date].mood.log && DB.days[S.date].mood.tags.length")==1)
        pg.click('[data-act=dnext]')
        # --- Getränke-Raster
        pg.click('[data-k=cmore]') if pg.locator('[data-k=cmore]').count() else None
        n=pg.locator('.cgrid .cti').count(); chk(T+'Raster da',n>=10)
        boxes=pg.evaluate("[...document.querySelectorAll('.cgrid.sub .cti:not(.on)')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height,e.scrollWidth-e.clientWidth]})")
        chk(T+'zwei nebeneinander',abs(boxes[0][1]-boxes[1][1])<1 and boxes[1][0]>boxes[0][0])
        chk(T+'Tippflächen >=44',all(x[3]>=44 for x in boxes))
        chk(T+'kein Überlauf in Kacheln',all(x[4]<=0 for x in boxes))
        chk(T+'Seite kein Überlauf',pg.evaluate("document.documentElement.scrollWidth")<=390)
        chk(T+'Text >=16',pg.evaluate("Math.min(...[...document.querySelectorAll('.cti span,.cti small,.mlog *,.mitem')].map(e=>parseFloat(getComputedStyle(e).fontSize)))")>=16)
        pg.locator('.cti[data-id=espresso]').first.click()
        chk(T+'Getränk eintragen',pg.evaluate("DB.days[S.date].coffee.length")==3)
        if theme=='light': pg.locator('.card.a-coffee').screenshot(path='/tmp/coffee.png')
        # --- langes Drücken -> kleines Menü
        cdp=ctx.new_cdp_session(pg)
        def lp(sel):
            el=pg.locator(sel).first; el.evaluate("e=>e.scrollIntoView({block:'center'})"); bx=el.bounding_box(); x=bx['x']+bx['width']/2; y=bx['y']+bx['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); time.sleep(.65)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); time.sleep(.15)
        before=pg.evaluate("(DB.days[S.date].habits||{}).h1||0")
        lp('.hab[data-id=h1]')
        chk(T+'Menü offen',pg.locator('#menu').is_visible() and pg.locator('#sheet').is_hidden())
        chk(T+'Reihenfolge',[x.strip() for x in pg.locator('.mitem').all_inner_texts()]==['Verstecken','Löschen','Bearbeiten'])
        chk(T+'langes Drücken hakt nicht ab',pg.evaluate("(DB.days[S.date].habits||{}).h1||0")==before)
        print(ok,bad, pg.locator('#menu').is_visible()); mb=pg.locator('.menu-body').bounding_box() or {'x':-1,'y':-1,'width':0,'height':0}; chk(T+'Menü im Bild',mb['x']>=0 and mb['x']+mb['width']<=390 and mb['y']>=0 and mb['y']+mb['height']<=780)
        if theme=='light': pg.screenshot(path='/tmp/menu.png')
        pg.mouse.click(5,5) if False else pg.locator('.menu-bg').click(position={'x':5,'y':5})
        chk(T+'rausklicken schließt',pg.locator('#menu').is_hidden())
        lp('.hab[data-id=h1]'); pg.click('[data-act=medit]')
        chk(T+'Bearbeiten öffnet großes Fenster',pg.locator('#sheet').is_visible() and pg.locator('#menu').is_hidden() and 'Gewohnheit bearbeiten' in pg.inner_text('#sbody'))
        pg.click('#sbody [data-act=sclose]')
        lp('.chip[data-lp="sports|laufen"]'); pg.click('[data-act=mhide]')
        chk(T+'Sport verstecken',pg.evaluate("DB.cfg.sports.find(x=>x.id==='laufen').hid")==True and pg.locator('#menu').is_hidden())
        lp('.hab[data-id=h2]'); pg.click('[data-act=mrm]')
        chk(T+'Löschen fragt nach','Nochmal' in pg.inner_text('[data-act=mrm]') and pg.evaluate("DB.cfg.habits.some(x=>x.id==='h2')"))
        pg.click('[data-act=mrm]')
        chk(T+'gelöscht',not pg.evaluate("DB.cfg.habits.some(x=>x.id==='h2')") and pg.locator('#menu').is_hidden())
        lp('.cti[data-id=espresso]'); chk(T+'Menü auch bei Getränk',pg.locator('#menu').is_visible()); pg.locator('.menu-bg').click(position={'x':5,'y':5})
        # --- Kurve: kein Scrollen beim Ziehen
        g=pg.locator('svg.cgraph'); g.evaluate("e=>e.scrollIntoView({block:'center'})"); chk(T+'50er-Linie',pg.locator('svg.cgraph .l50').count()==1); chk(T+'touch-action none',g.evaluate("e=>getComputedStyle(e).touchAction")=='none')
        bx=g.bounding_box(); sy=pg.evaluate("scrollY"); x=bx['x']+80; y=bx['y']+bx['height']/2
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        for i in range(1,12): cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+i*12,'y':y-i*14}]}); time.sleep(.02)
        chk(T+'Kurve zeigt Wert beim Ziehen',pg.evaluate("document.querySelector('#cg-g').getAttribute('display')")!='none' and '22 Uhr' not in pg.inner_text('#cg-lab'))
        chk(T+'Seite scrollt nicht',pg.evaluate("scrollY")==sy)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); time.sleep(.1)
        chk(T+'nach Loslassen 22 Uhr','22 Uhr' in pg.inner_text('#cg-lab'))
        # Verlauf läuft
        pg.click('[data-v=verlauf]'); chk(T+'Verlauf ok',pg.locator('svg').count()>3)
        for v in ['woche','sport','muster']: pg.click(f'[data-act=vtab][data-v={v}]')
        pg.click('[data-v=set]'); pg.click('[data-v=heute]')
        if theme=='light': pg.locator('.card.a-mood').screenshot(path='/tmp/mood.png')
        chk(T+'keine JS-Fehler',not errs)
        if errs: print(errs)
        ctx.close()
    b.close()
finally: srv.terminate()
print(ok,'ok;','FEHLER:',bad)
