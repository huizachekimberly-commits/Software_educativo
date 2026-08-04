import json

with open('data/units.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for unit in data['units']:
    if unit['id'] == 'bosque':
        unit['requires'] = 'castillo'
        unit['subActivities'] = [
            {
                "id": "letrero",
                "title": "El Letrero del Bosque",
                "prompt": "El gato toma de la...",
                "speak": "El gato toma de la. Elige la palabra que completa la oracion y tocala.",
                "type": "oracion",
                "question": "El gato toma de la...",
                "prefix": "El gato toma de la",
                "options": [
                    {"label": "luna", "icon": "assets/images/unit_2/luna.png"},
                    {"label": "sopa", "icon": "assets/images/unit_1/sopa.png"},
                    {"label": "armadura", "icon": "assets/images/unit_2/armadura.png"}
                ],
                "answer": "sopa",
                "success": "¡Muy bien! El gato toma de la sopa y se acerca a comer contento.",
                "hint": "El gato tiene hambre. ¿Qué plato humeante puede tomar?",
                "catImage": "assets/images/unit_1/cat1.png",
                "bowlImage": "assets/images/unit_1/sopa.png"
            },
            {
                "id": "puente",
                "title": "El Puente del Mono",
                "prompt": "El mono come una...",
                "speak": "El mono come una. Elige la palabra correcta para construir el puente.",
                "type": "puente",
                "question": "El mono come una...",
                "prefix": "El mono come una",
                "options": [
                    {"label": "piedra", "image": "assets/images/unit_2/piedra.png"},
                    {"label": "banana", "image": "assets/images/unit_2/banana.png"},
                    {"label": "nube", "image": "assets/images/unit_2/nube.png"}
                ],
                "answer": "banana",
                "success": "¡Correcto! El mono come una banana y cruza el puente hasta el otro lado.",
                "hint": "Los monos adoran las frutas amarillas y largas.",
                "monkeyEmoji": "🐵"
            },
            {
                "id": "frase",
                "title": "El Cuento Incompleto",
                "prompt": "Lee el cuento y arrastra el recuadro que cierre la idea.",
                "speak": "Lee el cuento incompleto y arrastra el recuadro con la frase que completa la idea de forma logica.",
                "type": "frase",
                "question": "Arrastra la frase que completa el cuento.",
                "story": "Había una vez un niño llamado Leo. Cada mañana salía a jugar con su perro Max. Cuando el sol se ponía, Leo y Max",
                "options": [
                    "regresaban a casa a descansar.",
                    "volaban sobre la luna.",
                    "se convertían en estrellas."
                ],
                "answer": "regresaban a casa a descansar.",
                "success": "¡Excelente! El párrafo se iluminó: la idea tiene sentido completo.",
                "hint": "Después de jugar todo el día, al anochecer Leo y Max vuelven a casa."
            },
            {
                "id": "detective",
                "title": "El Detective de la Recámara",
                "prompt": "Observa las pistas y elige la palabra que completa la descripción.",
                "speak": "Observa la recamara. Hay una cama y una almohada. Elige la palabra que completa la oracion.",
                "type": "detective",
                "question": "En la recámara hay una...",
                "clues": ["cama", "almohada"],
                "options": [
                    {"label": "cama", "icon": "assets/images/unit_2/cama.png"},
                    {"label": "manzana", "icon": "assets/images/unit_2/manzana.png"},
                    {"label": "armadura", "icon": "assets/images/unit_2/armadura.png"}
                ],
                "answer": "cama",
                "success": "¡Detective experto! En la recámara hay una cama.",
                "hint": "Las pistas son una cama y una almohada. ¿Qué mueble está en la recámara?"
            },
            {
                "id": "accion",
                "title": "El Gran Deportista",
                "prompt": "Mira la animación y elige la acción correcta.",
                "speak": "El nino esta corriendo en el campo. Que accion realiza? Elige la palabra correcta.",
                "type": "accion",
                "question": "El niño está...",
                "prefix": "El niño está",
                "options": [
                    {"label": "corriendo", "icon": "🏃"},
                    {"label": "saltando", "icon": "🤸"},
                    {"label": "durmiendo", "icon": "😴"}
                ],
                "answer": "corriendo",
                "success": "¡Victoria! El niño está corriendo. ¡Completaste la oración!",
                "hint": "Observa bien la animación: el niño mueve las piernas muy rápido."
            }
        ]
        break

with open('data/units.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Unidad 2 (bosque) actualizada exitosamente')
print(f'Sub-activities: {len(unit["subActivities"])}')
print(f'Requires: {unit.get("requires")}')

