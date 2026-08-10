# -*- coding: utf-8 -*-
import io
import json

s = io.open('js/app.js', encoding='utf-8-sig').read()
print('renderCuentoActivity defs:', s.count('function renderCuentoActivity'))
print('renderTeatroActivity defs:', s.count('function renderTeatroActivity'))
print('completeUnit3Activity defs:', s.count('function completeUnit3Activity'))
print('has-mountain-bg count:', s.count('has-mountain-bg'))
print('Corona del Narrador in getBadgeIcon:', 'Corona del Narrador' in s)
print('montanas flow present:', 'state.activeUnit.id === "montanas"' in s)
# check the switch cases exist
for t in ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']:
    print('switch case', t, ':', ('case "' + t + '":') in s)

d = json.load(open('data/units.json', encoding='utf-8'))
m = [u for u in d['units'] if u['id'] == 'montanas'][0]
subs = m.get('subActivities', [])
print('subActivities count:', len(subs))
print('types:', [x['type'] for x in subs])
