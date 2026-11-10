import json
AW,LW,TW,HR=3.8,4.6,7.6,4.3
def pl(pts,cls,w,extra=''):
    d='M'+'L'.join(f'{x} {y}' for x,y in pts)
    return f'<path d="{d}" class="{cls}" stroke-width="{w}"{extra}/>'
def fig(head,S,H,arms=(),legs=(),back='',front='',mid='',tw=TW,shadow=(24,43.5,13),hr=HR,back_arms=()):
    o=''
    if shadow: o+=f'<ellipse cx="{shadow[0]}" cy="{shadow[1]}" rx="{shadow[2]}" ry="2" class="a"/>'
    o+=back
    for a in back_arms: o+=pl(a,'sb',AW)
    for l in legs[1:]: o+=pl(l,'sd',LW)
    o+=mid
    o+=pl([S,H],'sc',tw)
    for l in legs[:1]: o+=pl(l,'sd',LW)
    for a in arms: o+=pl(a,'sb',AW)
    o+=f'<circle cx="{head[0]}" cy="{head[1]}" r="{hr}" class="b"/>'
    return o+front
I={}
# Laufen
I['laufen']=fig((30,8.5),(27,16),(22,27),arms=[[(27,16.5),(32.5,21),(37,17)]],back_arms=[[(26.5,16.5),(20,20),(16,16)]],
  legs=[[(22.5,27),(30,31),(28,40.5),(32,41)],[(21.5,27),(16,33.5),(8,32)]],shadow=(24,43.5,12))
# Spazieren
I['spazieren']=fig((24.5,8),(24,15.5),(24,27),arms=[[(24,16),(27,22),(29.5,26.5)]],back_arms=[[(24,16),(21,22),(19.5,27)]],
  legs=[[(24.5,27),(27.5,34.5),(29,42),(32,42)],[(23.5,27),(21.5,34.5),(18,41.5)]],shadow=(24,44,11))
# Wandern: Rucksack, Stock
I['wandern']=fig((25.5,8),(24.5,15.5),(23.5,27),arms=[[(24.5,16.5),(29,22.5),(34,21)]],
  legs=[[(24,27),(28.5,34),(29.5,42),(32.5,42)],[(23,27),(20,34.5),(16,41.5)]],
  mid='<rect x="13.5" y="13.5" width="9" height="13.5" rx="3.6" class="a"/>',
  front='<path d="M35 13L37 43" class="sa" stroke-width="2.4"/><circle cx="34.3" cy="21" r="2.1" class="b"/>',shadow=(25,44,13))
# Klettern: Wand rechts, Seil
wall='<path d="M33 2h13v44H31c2-4 4-6 3-10s-3-6-2-10 4-5 4-9-3-5-3-9 1-4 0-6z" class="a"/>'
I['klettern']=fig((23,11.5),(24.5,18.5),(22,30),arms=[[(25,18.5),(30,13.5),(34,8)]],back_arms=[[(24.5,19),(30,22),(34.5,20)]],
  legs=[[(22.5,30),(29.5,30.5),(33.5,35)],[(21.5,30),(23,38),(32,41.5)]],back=wall,
  mid='<path d="M22 30c-6 2-7 8-5 16" class="sc" stroke-width="1.8"/>',shadow=None)
# Bouldern: Griffe, Matte, kein Seil
holds='<ellipse cx="33.5" cy="6.5" rx="4.2" ry="3.2" class="c"/><ellipse cx="38" cy="19" rx="3.8" ry="3" class="a"/><ellipse cx="34" cy="31" rx="4.2" ry="3" class="c"/><ellipse cx="14" cy="10" rx="3.6" ry="2.8" class="a"/>'
I['bouldern']=fig((22,13),(23.5,20),(20,30.5),arms=[[(24,20),(29,13),(33,7.5)]],back_arms=[[(23.5,20.5),(30,21.5),(37,19.5)]],
  legs=[[(20.5,30.5),(28,29),(33.5,31)],[(19.5,30.5),(18,36.5),(22,39)]],back=holds,
  front='<rect x="5" y="40" width="38" height="5.5" rx="2.75" class="a"/>',shadow=None)
# Kraft: von vorn, Hantel über Kopf
I['kraft']=('<ellipse cx="24" cy="44" rx="13" ry="2" class="a"/>'
  +pl([(20.5,31),(16.5,37),(17,43)],'sd',LW)+pl([(27.5,31),(31.5,37),(31,43)],'sd',LW)
  +pl([(24,20.5),(24,30)],'sc',10)
  +pl([(19.5,20),(13.5,15.5),(14.5,7.5)],'sb',AW)+pl([(28.5,20),(34.5,15.5),(33.5,7.5)],'sb',AW)
  +'<circle cx="24" cy="12.5" r="4.3" class="b"/>'
  +'<path d="M6 7h36" class="sd" stroke-width="2.6"/><rect x="4" y="1.5" width="4.6" height="11" rx="2.3" class="c"/><rect x="39.4" y="1.5" width="4.6" height="11" rx="2.3" class="c"/>')
# Schwimmen
wave=lambda y,c:f'<path d="M3 {y}c4-3.6 7.5-3.6 11.500 0s7.500 3.600 11.500 0 7.500-3.600 11.500 0 5 3 7.500 1.500V46H3z" class="{c}"/>'
I['schwimmen']=(pl([(29,25.5),(12,28.5)],'sc',TW)+pl([(28,24.5),(31,14.5),(39.5,17.5)],'sb',AW)
  +'<circle cx="34.500" cy="24.500" r="4.300" class="b"/>'+pl([(13,28),(7,24.5)],'sd',LW)
  +wave(29,'a')+wave(36,'b'))
# Radfahren
def bike(pack=False):
    wheels='<circle cx="10.500" cy="35" r="7" class="sb" stroke-width="3"/><circle cx="37.500" cy="35" r="7" class="sb" stroke-width="3"/>'
    frame='<path d="M10.500 35L18 24.500h13.500M18 24.500L23.500 35H10.500M23.500 35l8-10.500 6 10.500M31.500 24.500l-1-3.500h4.500M15 23.500h6" class="sc" stroke-width="2.200"/>'
    rider=(pl([(18.5,22),(26,27.5),(23.5,35),(26.5,35)],'sd',LW)
      +('<rect x="11" y="9" width="9" height="12.500" rx="3.600" transform="rotate(32 15.500 15.250)" class="a"/>' if pack else '')
      +pl([(26.5,13.5),(18.5,22)],'sc',TW)+pl([(27,14.5),(30,20.5),(35,21)],'sb',AW)
      +'<circle cx="30.500" cy="7.500" r="4.300" class="b"/>')
    return wheels+frame+rider
I['rad']=bike(); I['pendel']=bike(True)
# Yoga: Lotossitz von vorn
I['yoga']=('<rect x="5" y="39.500" width="38" height="5" rx="2.500" class="a"/>'
  +pl([(12,37),(20,34),(28,37.5),(36,37)],'sd',5)+pl([(36,37),(28,34),(20,37.5),(12,37)],'sd',5)
  +pl([(24,18.5),(24,31)],'sc',9.5)
  +pl([(19.5,18.5),(14.5,25),(13,32)],'sb',AW)+pl([(28.5,18.5),(33.5,25),(35,32)],'sb',AW)
  +'<circle cx="24" cy="10.500" r="4.300" class="b"/>')
# Ballsport: Sprungwurf
I['ball']=fig((21.5,12.5),(22,20),(20,31),arms=[[(22.5,20),(28.5,15),(32.5,9.5)]],back_arms=[[(21.5,20.5),(15.5,23),(11,20)]],
  legs=[[(20.5,31),(27,35),(24.5,42.5)],[(19.5,31),(14,35.5),(8,36)]],
  front='<circle cx="36" cy="6.500" r="5" class="c"/><path d="M40.240 3.850A5 5 0 0 1 33.350 10.740 6 6 0 0 0 40.240 3.850z" class="d"/>',shadow=(20,45,9))
# Fussball: Schuss
I['fussball']=fig((20.5,8.5),(21,16),(20.5,27.5),arms=[[(21.5,16.5),(27.5,19.5),(31,15.5)]],back_arms=[[(20.5,16.5),(15,20.5),(10.5,18.5)]],
  legs=[[(21,27.5),(27.5,32),(35,31)],[(20,27.5),(18,35),(17,42.5),(20,42.5)]],
  front='<circle cx="41" cy="36" r="4.600" class="a"/><circle cx="41" cy="36" r="1.900" class="c"/>',shadow=(22,44,14))
# Tennis
I['tennis']=fig((19.5,11),(20,18.5),(19,29.5),arms=[[(20.5,18.5),(26.5,15),(30.5,11.5)]],back_arms=[[(19.5,19),(14,23),(10.5,21)]],
  legs=[[(19.5,29.5),(25.5,35),(27,42.5),(30,42.5)],[(18.5,29.5),(14,36),(9.5,41.5)]],
  front='<path d="M30.500 11.500l3-3" class="sd" stroke-width="2.600"/><ellipse cx="37.500" cy="5.500" rx="4.800" ry="5.800" transform="rotate(42 37.500 5.500)" class="a"/><ellipse cx="37.500" cy="5.500" rx="4.800" ry="5.800" transform="rotate(42 37.500 5.500)" class="sc" stroke-width="2.200"/><circle cx="43" cy="17.500" r="2.600" class="c"/>',shadow=(20,44,13))
# Ski
I['ski']=('<path d="M2 36L46 43v5H2z" class="a"/>'
  +'<path d="M18.500 25.500L37 35" class="sb" stroke-width="1.800"/>'
  +pl([(18.5,27.5),(27,31),(22.5,38.5)],'sd',LW)
  +pl([(26.5,18),(18.5,27.5)],'sc',TW)+pl([(27,19),(31.5,24.5),(36,27)],'sb',AW)
  +'<circle cx="31" cy="12" r="4.300" class="b"/>'
  +'<path d="M8 38.200l32 5.100c1.500.2 2.800-.2 3.800-1" class="sd" stroke-width="2.600"/>')
# Tanzen
I['tanzen']=('<ellipse cx="24" cy="44.500" rx="11" ry="2" class="a"/>'
  +pl([(22.5,33),(21.5,43.5)],'sd',LW)+pl([(26.5,33),(32.5,37),(30.5,42.5)],'sd',LW)
  +'<path d="M20.500 22.500h7.500l8.500 10.500c-6 4-17 4.500-23.500-.5z" class="a"/>'
  +pl([(24,14.5),(24,24)],'sc',TW)
  +pl([(24.5,14.5),(30,10.500),(31.500,4)],'sb',AW)+pl([(23.5,15),(17.5,18.5),(12,16.5)],'sb',AW)
  +'<circle cx="23.500" cy="7" r="4.300" class="b"/>')
# HIIT: Hampelmann
I['hiit']=('<ellipse cx="24" cy="44.500" rx="14" ry="2" class="a"/>'
  +pl([(22,27.5),(16.5,35),(12.5,43)],'sd',LW)+pl([(26,27.5),(31.5,35),(35.5,43)],'sd',LW)
  +pl([(24,17),(24,26.5)],'sc',9)
  +pl([(20,16.5),(13,12),(10,4.5)],'sb',AW)+pl([(28,16.5),(35,12),(38,4.5)],'sb',AW)
  +'<circle cx="24" cy="8.500" r="4.300" class="b"/>'
  +'<path d="M4.500 22l3 1.500M4 29h3.500M43.500 22l-3 1.500M44 29h-3.500" class="sa" stroke-width="2.200"/>')
open('figs.js','w').write('const FIG='+json.dumps(I,indent=0)+';\n')
print(len(I))
