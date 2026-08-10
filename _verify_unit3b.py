import re

c = open('js/app.js', encoding='utf-8').read()

print("=== getUnitSoundFolder montanas handling ===")
print("has montanas branch:", 'montanas' in c.split('function getUnitSoundFolder')[1].split('return `assets')[0] if 'function getUnitSoundFolder' in c else 'NOT FOUND')

print("\n=== animateActivitySuccess cases ===")
for t in ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']:
    print(t, '=>', len(re.findall(r'case\s+"' + t + r'"\s*:', c)))

print("\n=== closeActivity cleanup ===")
idx = c.find('function closeActivity')
seg = c[idx:idx+2500]
for marker in ['capitulosInterval','karaokeInterval','cintaPlaying','state.capitulos','state.karaoke','state.cinta','clearInterval']:
    print(marker, '=>', seg.count(marker))

print("\n=== getBadgeIcon Corona ===")
idx2 = c.find('function getBadgeIcon')
seg2 = c[idx2:c.find('function isUnitRewardEarned')]
print('Corona del Narrador =>', 'Corona del Narrador' in seg2)

print("\n=== CSS check: montanas styles present ===")
try:
    css = open('css/styles.css', encoding='utf-8').read()
    for cls in ['cuento-story','teatro-stage','libro-book','capitulos-bar','karaoke-stage','personajes-board','quien-board','mapa-zones','galeria-grid','escenario-options','ordenar-slots','linea-timeline','domino-chain','cinta-strip','antes-board']:
        print(cls, '=>', css.count(cls))
except Exception as e:
    print("CSS error:", e)
