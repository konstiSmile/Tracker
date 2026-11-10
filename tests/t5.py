# Version 2.5: Einklappen, Hinweise, Check-in, Wochenrückblick, Erfolge, Erkenntnis
import json,subprocess,time,datetime
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8766','-d','/home/claude/tracker'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
ok=0; bad=[]
def chk(n,c):
    global ok
    if c: ok+=1
    else: bad.append(n)
T0=datetime.date.today(); D=lambda n:(T0-datetime.timedelta(days=n)).isoformat()
days={}
for n in range(1,15):   # 14 Tage: Sporttage mit besserer Stimmung
    sport=n%2==0
    days[D(n)]={"mood":{"v":4.2 if sport else 3.0},"sleep":{"bed":"23:00","wake":"07:00","dur":480,"q":4},"coffee":[{"id":"c%d"%n,"t":"08:00","k":"espresso","name":"Espresso","mg":63}],"habits":{"h1":1}}
    if sport: days[D(n)]["sport"]=[{"id":"s%d"%n,"t":"18:00","name":"Laufen"}]
days[D(1)]["mood"]["note"]="Abend am See mit Freunden"
days[D(0)]={"sleep":{"bed":"23:10","wake":"07:05","dur":475,"q":4},"coffee":[{"id":"x","t":"08:10","k":"espresso","name":"Espresso","mg":63}]}
seed={"v":1,"days":days,"cfg":{"theme":"light","v":7}}
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':390,'height':780},has_touch=True,is_mobile=True,service_workers='block',device_scale_factor=2)
    ctx.add_init_script("if(!sessionStorage.s){sessionStorage.s=1;localStorage.setItem('tracker-v1',%s)}"%json.dumps(json.dumps(seed)))
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8766/'); pg.wait_for_selector('.card'); time.sleep(1.6); pg.evaluate('fbHide()')
    # Einklappen
    chk('Schlaf vollständig -> eingeklappt',pg.locator('.card.a-sleep.folded').count()==1 and '7:55' in pg.inner_text('.card.a-sleep'))
    pg.click('.card.a-sleep .chead'); chk('Schlaf aufklappen',pg.locator('.card.a-sleep.folded').count()==0 and pg.locator('.card.a-sleep .smileys').count()==1)
    pg.click('.card.a-sport .chead'); chk('Sport einklappen bleibt gespeichert',pg.locator('.card.a-sport.folded').count()==1 and pg.evaluate("DB.cfg.fold.sport")==True)
    pg.click('.card.a-sport .chead'); chk('Sport wieder auf',pg.locator('.card.a-sport .chips').count()>=1)
    chk('fünf Karten',pg.locator('#app .card[class*=" a-"]:not(.cta)').count()==5)
    # Hinweise
    chk('Hinweis da',pg.locator('.card.a-habit .hint').count()==1)
    pg.evaluate("openMenu('habits','h1',document.querySelector('.hab'));closeMenu();render()")
    chk('Hinweis weg nach Nutzung',pg.locator('.card.a-habit .hint').count()==0 and pg.locator('.card.a-sport .hint').count()==0)
    # Erfolge: Regeln
    ids=pg.evaluate("fbList(todayStr()).map(x=>x.id)")
    chk('Schlaf-Erfolge',set(['sl7','slq'])<=set(ids))
    pg.evaluate("localStorage.removeItem('tracker-fb')")
    pg.click('.chip[data-lp="sports|laufen"]'); time.sleep(.2)
    chk('Meldung nach Sport',pg.locator('#fb').is_visible() and pg.evaluate("document.querySelector('#fb').className")=='a-sport')
    t1=pg.inner_text('#fb'); pg.click('#fb'); chk('Meldung wegtippen',pg.locator('#fb').is_hidden())
    pg.click('.card.a-sport [data-act=sdel]'); pg.click('.chip[data-lp="sports|laufen"]'); time.sleep(.2)
    chk('gleiche Meldung nicht doppelt',pg.locator('#fb').is_hidden() or pg.inner_text('#fb')!=t1); pg.evaluate("fbHide()")
    low=pg.evaluate("(()=>{const d=todayStr();DB.days[d].mood={v:2,log:[{id:'a',t:'10:00',v:2}]};DB.days[addDays(d,-1)].mood.v=2.2;DB.days[addDays(d,-2)].mood.v=2.4;const m=fbList(d).find(x=>x.id==='mlow');DB.days[addDays(d,-1)].mood.v=3;DB.days[addDays(d,-2)].mood.v=4.2;delete DB.days[d].mood;return m&&m.t})()")
    chk('Tief-Meldung erinnert an guten Tag',bool(low) and 'Auch wenn' in low and ('Erinner' in low or 'ging es dir' in low)); print('mlow:',low)
    ins=pg.evaluate("insights()"); chk('Erkenntnis Sport',any('mit Sport' in x and 'höher' in x for x in ins)); print('Erkenntnisse:',ins[:2])
    # Check-in
    pg.evaluate("render()"); pg.click('.cilink'); pg.wait_for_selector('.ci-top')
    chk('Check-in Schritt 1','1 von 5' in pg.inner_text('#sbody'))
    pg.evaluate("v=>{const s=document.querySelector('#sbody .mslider');s.value=v;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))}",4.3)
    chk('Stimmung im Check-in',pg.evaluate("DB.days[todayStr()].mood.v")==4.3 and '4,3' in pg.inner_text('#sbody .mlab'))
    pg.click('[data-act=cinext]'); pg.click('#sbody [data-v=froh]'); chk('Gefühl gewählt',pg.locator('#sbody .chip.on').count()==1)
    pg.click('[data-act=cinext]'); pg.click('#sbody .hab[data-id=h2]'); chk('Gewohnheit im Check-in',pg.evaluate("DB.days[todayStr()].habits.h2")==1 and pg.locator('#sbody .hab.on').count()>=1)
    pg.click('[data-act=cinext]'); pg.click('#sbody [data-act=sadd][data-id=laufen]'); chk('Sport im Check-in',pg.evaluate("DB.days[todayStr()].sport.length")==2)
    pg.click('[data-act=ciprev]'); chk('Zurück','3 von 5' in pg.inner_text('#sbody')); pg.click('[data-act=cinext]')
    pg.click('[data-act=cinext]'); pg.fill('#sbody textarea','Guter Lauf'); chk('Antwort gespeichert',pg.evaluate("DB.days[todayStr()].mood.qa[0].a")=='Guter Lauf')
    pg.click('[data-act=cinext]')
    chk('Abschluss','Geschafft' in pg.inner_text('#sbody') and pg.locator('#sbody .fbrow').count()>=1 and pg.locator('#sbody .note').count()==1 and pg.evaluate("DB.days[todayStr()].ci")==1)
    chk('Abschluss ohne Überlauf',pg.evaluate("document.querySelector('#sbody').scrollWidth")<=390)
    chk('Text >=16 im Fenster',pg.evaluate("Math.min(...[...document.querySelectorAll('#sbody *')].filter(e=>e.children.length==0&&e.textContent.trim()).map(e=>parseFloat(getComputedStyle(e).fontSize)))")>=16)
    pg.screenshot(path='/tmp/ci.png',clip={'x':0,'y':250,'width':390,'height':530})
    pg.click('#sbody [data-act=sclose]'); chk('Fenster zu, Knopf zeigt erledigt',pg.locator('#sheet').is_hidden() and 'erledigt' in pg.inner_text('.cilink'))
    # Wochenrückblick
    pg.click('[data-v=verlauf]'); pg.click('[data-act=vtab][data-v=woche]'); pg.click('[data-act=wropen]'); pg.wait_for_selector('.ci-top')
    chk('Woche in Zahlen','Deine Woche in Zahlen' in pg.inner_text('#sbody') and 'Erkenntnis' in pg.inner_text('#sbody'))
    pg.click('[data-act=wrnext]'); pg.click('#sbody [data-act=wrrate][data-v="4"]'); pg.fill('#sbody textarea','See'); 
    pg.click('[data-act=wrnext]'); pg.locator('#sbody textarea').nth(1).fill('Früher ins Bett'); pg.click('[data-act=wrnext]')
    w=pg.evaluate("DB.weeks[S.week]"); chk('Rückblick gespeichert',w=={'v':4,'best':'See','plan':'Früher ins Bett','done':1}); print(w)
    chk('Rückblick im Verlauf',pg.locator('#sheet').is_hidden() and 'Früher ins Bett' in pg.inner_text('#app'))
    chk('Backup enthält Wochen','weeks' in pg.evaluate("JSON.parse(JSON.stringify(DB))"))
    chk('keine JS-Fehler',not errs); print(errs)
    b.close()
finally: srv.terminate()
print(ok,'ok;','FEHLER:',bad)
