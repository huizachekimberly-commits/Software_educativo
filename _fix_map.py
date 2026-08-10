# -*- coding: utf-8 -*-
import io

p = 'js/app.js'
s = io.open(p, encoding='utf-8-sig').read()

# 1. Update title logic to handle montanas
old_title = '''  const isForest = unit.id === "bosque";
  activityTitle.textContent = isForest
    ? "Mapa del Bosque \\u2014 Elige una actividad"
    : "Mapa del Castillo \\u2014 Elige una actividad";'''

new_title = '''  const isForest = unit.id === "bosque";
  const isMountain = unit.id === "montanas";
  activityTitle.textContent = isForest
    ? "Mapa del Bosque \\u2014 Elige una actividad"
    : isMountain
    ? "Mapa de las Monta\\u00f1as \\u2014 Elige un cuento"
    : "Mapa del Castillo \\u2014 Elige una actividad";'''

count = s.count(old_title)
print('title matches:', count)
assert count == 1, count
s = s.replace(old_title, new_title)

# 2. Update container class to handle montanas
old_container = '''  container.className = unit.id === "bosque" ? "castle-map-container forest-map" : "castle-map-container";'''
new_container = '''  container.className = unit.id === "bosque" ? "castle-map-container forest-map" : unit.id === "montanas" ? "castle-map-container mountain-map" : "castle-map-container";'''

count = s.count(old_container)
print('container matches:', count)
assert count == 1, count
s = s.replace(old_container, new_container)

io.open(p, 'w', encoding='utf-8').write(s)
print('done')
