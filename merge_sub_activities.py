import json

# Read current restored JSON (from git)
with open('data/units.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# The corrupted file had these 2 extra sub-activities at the end of castillo
# They were: banquete (type: banquete) and pergamino (type: pergamino)
banquete_activity = {
    "id": "banquete",
    "title": "El Banquete del Gran Comedor",
    "prompt": "¡Cobra la SOPA! Escucha la orden y haz clic en la etiqueta correcta antes de que desaparezca.",
    "speak": "Escucha el producto que debes cobrar y haz clic en la etiqueta correcta en la cinta transportadora.",
    "type": "banquete",
    "question": "Haz clic en la etiqueta correcta",
    "words": [
        {"label": "LECHE", "audio": "assets/unit_1_sounds/theme3/leche.mp3"},
        {"label": "SOPA", "audio": "assets/unit_1_sounds/theme3/sopa.mp3"},
        {"label": "PAN", "audio": "assets/unit_1_sounds/theme3/pan.mp3"}
    ],
    "rounds": 5,
    "success": "¡Excelente! Cobraste todos los productos correctamente. ¡El banquete está servido!",
    "hint": "Escucha atentamente la orden del altavoz y busca la etiqueta que coincide."
}

pergamino_activity = {
    "id": "pergamino",
    "title": "El Pergamino del Escriba",
    "prompt": "Escucha la palabra y escríbela correctamente en el pergamino.",
    "speak": "Escribe la palabra: S - O - L, ¡SOL!",
    "type": "pergamino",
    "question": "Escribe la palabra que escuchaste",
    "image": "assets/images/unit_1/sol.png",
    "word": "SOL",
    "answer": "sol",
    "success": "¡Excelente! Escribiste SOL correctamente. ¡El pergamino brilló con tu escritura!",
    "hint": "Escucha atentamente los sonidos de la palabra. Escribe cada letra en el pergamino."
}

# Find the castillo unit
for unit in data['units']:
    if unit['id'] == 'castillo':
        print(f"Castillo unit found. Current sub-activities: {len(unit['subActivities'])}")
        # Add banquete (index 10) and pergamino (index 11)
        unit['subActivities'].append(banquete_activity)
        unit['subActivities'].append(pergamino_activity)
        print(f"After merge: {len(unit['subActivities'])} sub-activities")
        break

# Validate the merged JSON
try:
    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    json.loads(json_str)  # validate
    print("Merged JSON is valid!")
    
    # Write the merged file
    with open('data/units.json', 'w', encoding='utf-8') as f:
        f.write(json_str)
    print(f"Written {len(json_str)} bytes to data/units.json")
    
    # Show final structure
    for u in data['units']:
        subs = u.get('subActivities', [])
        print(f"  Unit {u['id']} (number {u['number']}): {len(subs)} sub-activities")
        if subs:
            for s in subs:
                print(f"    [{s['type']:12s}] {s['id']}")
except json.JSONDecodeError as e:
    print(f"ERROR: Invalid JSON after merge: {e}")

