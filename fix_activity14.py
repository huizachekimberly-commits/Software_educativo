import json

# Read the JSON file
with open("data/units.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Find the castillo unit
for unit in data["units"]:
    if unit["id"] == "castillo":
        # Add pasaje activity
        pasaje = {
            "id": "pasaje",
            "title": "El Secreto del Pasaje Oculto",
            "prompt": "Escucha la oración y ordena las palabras de izquierda a derecha.",
            "speak": "EL PERRO CORRE. Coloca las palabras en el orden correcto para formar la oración.",
            "type": "pasaje",
            "question": "Ordena las palabras para formar la oración",
            "sentence": "EL PERRO CORRE",
            "words": ["EL", "PERRO", "CORRE"],
            "answer": ["EL", "PERRO", "CORRE"],
            "sentenceAudio": "assets/unit_1_sounds/theme3/el_perro_corre.mp3",
            "wordSounds": {
                "EL": "assets/unit_1_sounds/theme3/el.mp3",
                "PERRO": "assets/unit_1_sounds/theme3/perro.mp3",
                "CORRE": "assets/unit_1_sounds/theme3/corre.mp3"
            },
            "success": "¡Excelente! Ordenaste las palabras correctamente: EL PERRO CORRE. ¡Has descubierto el pasaje oculto!",
            "hint": "Escucha la oración completa y presta atención al orden de las palabras."
        }
        unit["subActivities"].append(pasaje)
        break

# Write back
with open("data/units.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Added pasaje sub-activity to castillo unit")

