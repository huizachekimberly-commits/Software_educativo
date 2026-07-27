import json

with open('data/units.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find castillo unit
for unit in data['units']:
    if unit['id'] == 'castillo':
        # Add new sub-activity 15
        unit['subActivities'].append({
            'id': 'palabra-oculta',
            'title': 'La Palabra Oculta',
            'prompt': "Es un animal que dice 'miau' y toma leche. Empieza con G.",
            'speak': 'Es un animal que dice miau y toma leche. Empieza con G. Presiona las teclas G, A, T, O para revelar la palabra.',
            'type': 'palabra-oculta',
            'question': 'Revela la palabra oculta presionando las teclas correctas',
            'word': 'GATO',
            'letters': ['G', 'A', 'T', 'O'],
            'answer': 'GATO',
            'success': '¡Excelente! Completaste la palabra GATO. ¡El gato salió del castillo!',
            'hint': 'Escucha la pista: es un animal que dice miau, toma leche y empieza con G. Presiona G, A, T, O en tu teclado.'
        })
        break

with open('data/units.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Sub-actividad 15 agregada exitosamente')
print(f'Total sub-activities: {len(unit["subActivities"])}')

