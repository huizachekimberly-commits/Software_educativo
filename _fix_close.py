# -*- coding: utf-8 -*-
import io

p = 'js/app.js'
s = io.open(p, encoding='utf-8-sig').read()

target = '''  activityZone.classList.remove("has-castle-bg");
  activityZone.classList.remove("has-forest-bg");

  activityZone.hidden = true;'''

repl = '''  activityZone.classList.remove("has-castle-bg");
  activityZone.classList.remove("has-forest-bg");
  activityZone.classList.remove("has-mountain-bg");

  activityZone.hidden = true;'''

count = s.count(target)
print('matches:', count)
assert count == 1, count
s = s.replace(target, repl)
io.open(p, 'w', encoding='utf-8').write(s)
print('done')
