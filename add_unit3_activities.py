import json

with open("data/units.json", encoding="utf-8") as f:
    data = json.load(f)

# The montanas unit data
montanas = {
    "id": "montanas",
    "number": 3,
    "title": "Montañas de los Cuentos",
    "icon": "",
    "theme": "theme-mountain",
    "castleMapImage": "",
    "description": "Lee cuentos cortos e identifica personajes, lugares, acciones y secuencias.",
    "content": ["Lectura de cuentos cortos.", "Identificacion de personajes, lugares y acciones.", "Secuencia de acontecimientos."],
    "activities": ["Ordenar escenas de una historia.", "Responder preguntas sobre cuentos.", "Descubrir finales alternativos."],
    "evaluation": ["Comprension de textos narrativos.", "Identificacion de elementos principales de una historia."],
    "feedback": ["Explicaciones sobre respuestas correctas.", "Relectura guiada de fragmentos importantes."],
    "reward": "Corona del Narrador",
    "requires": "bosque",
    "subActivities": []
}

def add(sub):
    montanas["subActivities"].append(sub)

# 1. cuento
add({
    "id": "cuento",
    "title": "Escucha y Lee el Cuento",
    "prompt": "Escucha y lee Caperucita Roja. Al final, responde la pregunta.",
    "speak": "Habia una vez una nina llamada Caperucita Roja que llevaba una cesta a su abuelita.",
    "type": "cuento",
    "story": "Había una vez una niña llamada Caperucita Roja. Un día, su madre le pidió que llevara una cesta de comida a su abuelita. En el camino, Caperucita se encontró con un lobo. El lobo le preguntó a dónde iba. Caperucita le dijo que iba a casa de su abuelita. El lobo corrió por el bosque y llegó antes. Cuando la abuelita abrió la puerta, el lobo entró y la escondió. Al llegar Caperucita, el lobo fingió ser la abuelita. Pero un leñador escuchó los ruidos y salvó a todos.",
    "question": "¿Qué llevaba Caperucita Roja a su abuelita?",
    "options": ["Una cesta de comida", "Una espada", "Un pastel de fresa"],
    "answer": "Una cesta de comida",
    "success": "¡Muy bien! Caperucita llevaba una cesta de comida a su abuelita. ¡Tu estrella dorada brilla!",
    "hint": "Recuerda el inicio del cuento: su madre le pidió llevar una cesta de comida."
})

# 2. teatro
add({
    "id": "teatro",
    "title": "Teatro de Sombras Lector",
    "prompt": "Lee en voz alta los diálogos de las sombras para avanzar la obra.",
    "speak": "Lee en voz alta cada dialogo de las sombras para desbloquear la siguiente escena.",
    "type": "teatro",
    "scenes": [
        {"text": "¿A dónde vas, Caperucita?", "emoji": "🐺"},
        {"text": "Voy a casa de mi abuelita.", "emoji": "🔴"},
        {"text": "¡Corre, Caperucita, corre!", "emoji": "🪵"}
    ],
    "answer": ["¿A dónde vas, Caperucita?", "Voy a casa de mi abuelita.", "¡Corre, Caperucita, corre!"],
    "success": "¡Excelente! Las sombras representaron la obra completa.",
    "hint": "Lee cada burbuja en voz alta del primero al último."
})

# 3. libro
add({
    "id": "libro",
    "title": "El Libro Mágico de Páginas Activas",
    "prompt": "Pasa las hojas y toca las palabras mágicas para ver su animación.",
    "speak": "Toca cada palabra magica del cuento para ver su definicion divertida.",
    "type": "libro",
    "pages": [
        "El lobo se escondió detrás de un árbol.",
        "Caperucita llevó la cesta por el bosque.",
        "El leñador escuchó la voz de la abuelita."
    ],
    "keywords": [
        {"word": "lobo", "emoji": "🐺", "def": "El lobo es un animal grande que vive en el bosque y aúlla a la luna."},
        {"word": "bosque", "emoji": "🌲", "def": "El bosque es un lugar lleno de árboles altos y verdes."},
        {"word": "cesta", "emoji": "🧺", "def": "La cesta es un canasto que se usa para llevar comida."}
    ],
    "explored": 3,
    "success": "¡Muy bien! Descubriste todas las palabras mágicas del libro.",
    "hint": "Toca cada palabra resaltada para desplegar su pista."
})

# 4. capitulos
add({
    "id": "capitulos",
    "title": "Cuento por Capítulos",
    "prompt": "Lee cada capítulo y supera el mini-juego para avanzar.",
    "speak": "Lee el primer capitulo, responde y desbloquea el siguiente.",
    "type": "capitulos",
    "chapters": [
        {"title": "Capítulo 1", "text": "Caperucita sale de su casa con la cesta para la abuelita.", "question": "¿Para quién es la cesta?", "options": ["La abuelita", "El lobo", "El leñador"], "answer": "La abuelita"},
        {"title": "Capítulo 2", "text": "En el bosque, el lobo le pregunta a dónde va.", "question": "¿Quién le pregunta a dónde va?", "options": ["El leñador", "El lobo", "La madre"], "answer": "El lobo"},
        {"title": "Capítulo 3", "text": "El leñador salva a la abuelita y a Caperucita.", "question": "¿Quién salva a todos?", "options": ["El lobo", "El leñador", "La madre"], "answer": "El leñador"}
    ],
    "success": "¡Completaste el recorrido completo del cuento por capítulos!",
    "hint": "Responde cada mini-juego para abrir el siguiente capítulo."
})

# 5. karaoke
add({
    "id": "karaoke",
    "title": "Karaoke Literario",
    "prompt": "Sigue el cursor que rebota y lee la estrofa con ritmo.",
    "speak": "Caperucita va por el bosque, con su cesta y su capa roja.",
    "type": "karaoke",
    "verse": "Caperucita va por el bosque, con su cesta y su capa roja.",
    "words": ["Caperucita", "va", "por", "el", "bosque,", "con", "su", "cesta", "y", "su", "capa", "roja."],
    "answer": True,
    "success": "¡Excelente lectura! Tu ritmo y precisión fueron brillantes.",
    "hint": "Lee siguiendo el ritmo del cursor que rebota sobre cada palabra."
})

# 6. personajes
add({
    "id": "personajes",
    "title": "Personajes y Lugares",
    "prompt": "Arrastra cada cromo a su categoría: Personajes o Escenarios.",
    "speak": "Arrastra Caperucita y el lobo a Personajes, y el bosque y la casa a Escenarios.",
    "type": "personajes",
    "categories": [{"name": "Personajes", "emoji": "🎭"}, {"name": "Escenarios", "emoji": "🏞️"}],
    "items": [
        {"word": "Caperucita", "category": "Personajes", "emoji": "🔴"},
        {"word": "Lobo", "category": "Personajes", "emoji": "🐺"},
        {"word": "Bosque", "category": "Escenarios", "emoji": "🌲"},
        {"word": "Casa", "category": "Escenarios", "emoji": "🏠"}
    ],
    "answer": 4,
    "success": "¡Todos los cromos quedaron en su categoría con su sello de aprobación!",
    "hint": "Los personajes son quienes actúan; los escenarios son lugares donde ocurre."
})

# 7. quien
add({
    "id": "quien",
    "title": "¿Quién dijo qué?",
    "prompt": "Toca el rostro del personaje que pronunció esta frase.",
    "speak": "Quien dijo: A donde vas, Caperucita. Toca el personaje correcto.",
    "type": "quien",
    "quote": "¿A dónde vas, Caperucita?",
    "characters": [{"name": "El Lobo", "emoji": "🐺"}, {"name": "Caperucita", "emoji": "🔴"}, {"name": "La Madre", "emoji": "👩"}],
    "answer": "El Lobo",
    "success": "¡Se encendió el haz de luz! El lobo fue quien dijo la frase.",
    "hint": "¿Quién esperó a Caperucita en el camino para preguntarle?"
})

# 8. mapa
add({
    "id": "mapa",
    "title": "Mapa del Narrador",
    "prompt": "Ubica las fichas de los personajes en la zona del mapa donde ocurrió la acción.",
    "speak": "Coloca a Caperucita en el camino, al lobo en el bosque y a la abuelita en la casa.",
    "type": "mapa",
    "zones": [
        {"name": "El Camino", "emoji": "🛤️", "events": "Caperucita caminó por el camino hacia la casa."},
        {"name": "El Bosque", "emoji": "🌲", "events": "El lobo se encontró con Caperucita en el bosque."},
        {"name": "La Casa", "emoji": "🏠", "events": "La abuelita estaba en su casa."}
    ],
    "items": [
        {"word": "Caperucita", "zone": "El Camino", "emoji": "🔴"},
        {"word": "Lobo", "zone": "El Bosque", "emoji": "🐺"},
        {"word": "Abuelita", "zone": "La Casa", "emoji": "👵"}
    ],
    "answer": 3,
    "success": "¡Las zonas se activaron y mostraron el resumen del evento!",
    "hint": "Ubica cada personaje en el lugar donde realizó su acción clave."
})

# 9. galeria
add({
    "id": "galeria",
    "title": "Galería de Protagonistas",
    "prompt": "Selecciona solo a los personajes que formaron parte de la trama.",
    "speak": "Selecciona a Caperucita, el lobo, la abuelita y el lenador. Evita los distractores.",
    "type": "galeria",
    "characters": [
        {"name": "Caperucita", "emoji": "🔴", "correct": True},
        {"name": "El Lobo", "emoji": "🐺", "correct": True},
        {"name": "La Abuelita", "emoji": "👵", "correct": True},
        {"name": "El Leñador", "emoji": "🪵", "correct": True},
        {"name": "Un Dragón", "emoji": "🐉", "correct": False},
        {"name": "Un Robot", "emoji": "🤖", "correct": False}
    ],
    "answer": 4,
    "success": "¡Los personajes correctos brillan en marcos dorados y los distractores desaparecen!",
    "hint": "Elige solo a quienes aparecieron en el cuento de Caperucita."
})

# 10. escenario
add({
    "id": "escenario",
    "title": "Escenario Ideal",
    "prompt": "Elige el paisaje donde se desarrolló el suceso clave.",
    "speak": "Elige el lugar donde Caperucita se encontro con el lobo.",
    "type": "escenario",
    "question": "¿Dónde se encontró Caperucita con el lobo?",
    "options": [
        {"label": "El bosque", "emoji": "🌲", "scene": "el bosque frondoso y oscuro"},
        {"label": "La playa", "emoji": "🏖️", "scene": "la playa soleada"},
        {"label": "El castillo", "emoji": "🏰", "scene": "el castillo de piedra"}
    ],
    "answer": "El bosque",
    "success": "¡El fondo se desplegó en pantalla completa! El encuentro fue en el bosque.",
    "hint": "El lobo vivía escondido entre los árboles."
})

# 11. ordenar
add({
    "id": "ordenar",
    "title": "Ordena la Historia",
    "prompt": "Arrastra las viñetas a los espacios del 1 al 3 en orden lógico.",
    "speak": "Ordena: primero sale de casa, luego encuentra al lobo, al final llega a la casa.",
    "type": "ordenar",
    "items": [
        {"label": "Caperucita sale de casa", "emoji": "🏠"},
        {"label": "Encuentra al lobo", "emoji": "🐺"},
        {"label": "Llega a la casa", "emoji": "🏡"}
    ],
    "answer": ["Caperucita sale de casa", "Encuentra al lobo", "Llega a la casa"],
    "success": "¡Las viñetas se acomodaron en la línea reproduciendo la historia en orden!",
    "hint": "¿Qué pasó primero? ¿Qué pasó después? ¿Qué pasó al final?"
})

# 12. linea
add({
    "id": "linea",
    "title": "Línea del Tiempo Interactiva",
    "prompt": "Arrastra las tarjetas a Inicio, Desarrollo o Desenlace.",
    "speak": "Coloca la salida de casa en Inicio, el encuentro con el lobo en Desarrollo y el rescate en Desenlace.",
    "type": "linea",
    "categories": [{"name": "Inicio", "emoji": "🌅"}, {"name": "Desarrollo", "emoji": "⏳"}, {"name": "Desenlace", "emoji": "🌇"}],
    "items": [
        {"word": "Caperucita sale de casa", "category": "Inicio", "emoji": "🏠"},
        {"word": "El lobo la engaña", "category": "Desarrollo", "emoji": "🐺"},
        {"word": "El leñador salva a todos", "category": "Desenlace", "emoji": "🪵"}
    ],
    "answer": 3,
    "success": "¡La línea del tiempo se completó y muestra el resumen animado del relato!",
    "hint": "Inicio es el comienzo, Desarrollo la parte central y Desenlace el final."
})

# 13. domino
add({
    "id": "domino",
    "title": "El Dominó de los Sucesos",
    "prompt": "Une las fichas siguiendo la lógica temporal y causa-efecto.",
    "speak": "Une las fichas en orden: primero sale de casa, luego el lobo, despues el rescate.",
    "type": "domino",
    "pieces": [
        {"text": "Caperucita sale de casa", "next": "Encuentra al lobo", "emoji": "🔴"},
        {"text": "Encuentra al lobo", "next": "El lobo engaña a la abuelita", "emoji": "🐺"},
        {"text": "El lobo engaña a la abuelita", "next": "El leñador rescata a todos", "emoji": "👵"}
    ],
    "answer": ["Caperucita sale de casa", "Encuentra al lobo", "El lobo engaña a la abuelita", "El leñador rescata a todos"],
    "success": "¡Las fichas formaron una cadena continua sin interrupciones!",
    "hint": "Busca la ficha que continúa después de cada hecho."
})

# 14. cinta
add({
    "id": "cinta",
    "title": "Cinta Cinematográfica",
    "prompt": "Ordena los fotogramas de izquierda a derecha y presiona Play.",
    "speak": "Arrastra los fotogramas para que la historia tenga coherencia causal.",
    "type": "cinta",
    "frames": [
        {"text": "Caperucita sale", "emoji": "🏠"},
        {"text": "Encuentra al lobo", "emoji": "🐺"},
        {"text": "El rescate", "emoji": "🪵"}
    ],
    "answer": ["Caperucita sale", "Encuentra al lobo", "El rescate"],
    "success": "¡La mini-película se reprodujo en orden!",
    "hint": "Pon el inicio a la izquierda y el final a la derecha."
})

# 15. antes
add({
    "id": "antes",
    "title": "Antes y Después",
    "prompt": "Elige qué ocurrió antes y qué ocurrió después de la escena central.",
    "speak": "La escena central es en el bosque. Que paso antes y despues?",
    "type": "antes",
    "central": "Caperucita se encuentra con el lobo en el bosque",
    "beforeOptions": ["Caperucita caminaba por el camino", "Caperucita llegó a la casa", "El leñador salvó a todos"],
    "afterOptions": ["El lobo corre a casa de la abuelita", "Caperucita vuelve a casa", "El leñador se esconde"],
    "answerBefore": "Caperucita caminaba por el camino",
    "answerAfter": "El lobo corre a casa de la abuelita",
    "success": "¡Enlazaste los tres momentos clave y completaste el ciclo de la historia!",
    "hint": "Antes del encuentro, Caperucita caminaba; después, el lobo corrió a la casa."
})

# Replace the montanas unit in the data
units = data["units"]
for i, u in enumerate(units):
    if u.get("id") == "montanas":
        units[i] = montanas
        break
else:
    units.append(montanas)

with open("data/units.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("montanas subActivities count:", len(montanas["subActivities"]))
print("Total units:", len(units))
