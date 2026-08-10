# -*- coding: utf-8 -*-
import json, io

# Validate units.json
data = json.loads(io.open('data/units.json', encoding='utf-8-sig').read())
montanas = None
for u in data['units']:
    if u['id'] == 'montanas':
        montanas = u
        break

print("Montanas found:", montanas is not None)
if montanas:
    subs = montanas.get('subActivities', [])
    print("Number of sub-activities:", len(subs))
    types = [s['type'] for s in subs]
    print("Types:", types)
    print("Has requires:", montanas.get('requires'))
    print("Reward:", montanas.get('reward'))
