import io, json

s = io.open('js/app.js', encoding='utf-8-sig').read()
types = ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']

print("=== render functions defined ===")
for t in types:
    fn = 'render' + t.capitalize() + 'Activity'
    print(f"{t:12} defined={fn+'(' in s}")

print("\n=== openSubActivity switch render cases ===")
for t in types:
    fn = 'render' + t.capitalize() + 'Activity'
    # look for "case \"type\":" followed by render call
    case = 'case "' + t + '":'
    # find the case and check next render call
    idx = s.find(case)
    if idx == -1:
        print(f"{t:12} MISSING case")
    else:
        seg = s[idx:idx+400]
        print(f"{t:12} case found, render={fn+'(' in seg}")

print("\n=== checkAnswer cases present ===")
for t in types:
    case = 'case "' + t + '":'
    print(f"{t:12} {'OK' if case in s else 'MISSING'}")

print("\n=== popButton classes ===")
rif = s.find('(e) => {')
clip = s[rif:rif+2000]
for t in ['cuento-option','teatro-next','libro-keyword','capitulo-option','karaoke-done','personajes-item','quien-char','mapa-item','galeria-char','escenario-option','ordenar-item','linea-item','domino-piece','cinta-frame','cinta-play','antes-option']:
    print(f"{t:20} {'OK' if t in clip else 'MISSING'}")

print("\n=== closeActivity cleanup ===")
for k in ['karaokeTimer','cintaTimer']:
    print(f"{k:12} reset in close={k+' )' in s or (k+' = null' in s and 'function closeActivity' in s)} ")

print("\n=== JSON valid ===")
d = json.load(open('data/units.json', encoding='utf-8'))
u = [x for x in d['units'] if x['id']=='montanas'][0]
print("montanas subActivities:", len(u.get('subActivities',[])))
