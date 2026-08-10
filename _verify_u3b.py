# -*- coding: utf-8 -*-
import io

s = io.open('js/app.js', encoding='utf-8-sig').read()
ids = ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']

print("=== TYPE OCCURRENCES (should be >=2 each: render + switch) ===")
for i in ids:
    print(i, s.count(i))

print("\n=== openSubActivity switch cases ===")
import re
# find the switch block in openSubActivity
m = re.search(r'switch \(sub\.type\) \{', s)
block = s[m.start():m.start()+4000]
for i in ids:
    print(i, 'case' in block and ('"%s"' % i) in block)

print("\n=== checkAnswer switch cases ===")
mc = re.search(r'if \(sub\.type\) \{', s)
cb = s[mc.start():mc.start()+4000]
for i in ids:
    print(i, 'case "%s"' % i in cb)

print("\n=== render functions present ===")
for i in ids:
    name = 'render%sActivity' % i.capitalize()
    print(i, name, s.count('function %s' % name) > 0)
