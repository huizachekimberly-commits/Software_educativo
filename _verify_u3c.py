# -*- coding: utf-8 -*-
import io, re

s = io.open('js/app.js', encoding='utf-8-sig').read()

print("Badge 'Corona del Narrador' count:", s.count('Corona del Narrador'))

m = re.search(r'function getUnitSoundFolder[\s\S]{0,900}', s)
if m:
    print(m.group(0))

print("\ngetBadgeIcon unit3:")
m2 = re.search(r'function getBadgeIcon[\s\S]{0,600}', s)
if m2:
    print(m2.group(0))
