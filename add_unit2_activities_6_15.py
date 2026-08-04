import json

with open('data/units.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for unit in data['units']:
    if unit['id'] == 'bosque':
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
            },
            # ============================================================
            # ACTIVIDAD 6 — Encontrar palabras ocultas
            # ============================================================
            {
                "id": "camaleon",
                "title": "La Palabra Escondida",
                "prompt": "Encuentra la palabra corta 'cama' escondida dentro de 'camaleón'.",
                "speak": "Dentro de la palabra camaleon se esconde la palabra cama. Toca las letras C, A, M, A en orden para buscarla.",
                "type": "camaleon",
                "question": "Toca, en orden, las letras que forman la palabra oculta.",
                "longWord": "CAMALEÓN",
                "target": "CAMA",
                "letters": ["C", "A", "M", "A", "L", "E", "Ó", "N"],
                "answer": "CAMA",
                "success": "¡Brillante! La palabra 'cama' brilló en tonos dorados dentro del cofre.",
                "hint": "Recorre la palabra de izquierda a derecha: C, luego A, M y A otra vez."
            },
            # ============================================================
            # ACTIVIDAD 7 — Palabras en la Granja
            # ============================================================
            {
                "id": "granja",
                "title": "El Letrero del Establo",
                "prompt": "Recorre la granja con la vista y encuentra el letrero oculto.",
                "speak": "Busca con la vista los letreros camuflados detras de las bardas y los arboles. Toca el letrero que dice pato.",
                "type": "granja",
                "question": "Haz clic sobre el letrero oculto que dice 'pato'.",
                "target": "pato",
                "signs": [
                    {"word": "pato", "pos": "left", "emoji": "🦆"},
                    {"word": "vaca", "pos": "right", "emoji": "🐄"},
                    {"word": "perro", "pos": "tree", "emoji": "🐕"}
                ],
                "answer": "pato",
                "success": "¡Cuac! Desplegaste el letrero 'pato' y escuchaste el sonido del animal.",
                "hint": "El letrero del pato está detrás de una barda. El pato nada y dice cuac."
            },
            # ============================================================
            # ACTIVIDAD 8 — El Inspector de Letras
            # ============================================================
            {
                "id": "inspector",
                "title": "El Inspector de Letras",
                "prompt": "Lee el párrafo y sella cada vez que aparezca la palabra 'sol'.",
                "speak": "Escanea el texto con la vista y coloca tu sello cada vez que encuentres la palabra sol. Encuentra las tres repeticiones.",
                "type": "inspector",
                "question": "Sella todas las apariciones de la palabra 'sol'.",
                "paragraph": "El sol brilla en el cielo. El sol calienta el campo. En la tarde el sol se esconde y sale la luna.",
                "target": "sol",
                "need": 3,
                "answer": 3,
                "success": "¡Inspector genial! Sellaste las 3 veces que aparece 'sol'.",
                "hint": "Busca la palabra sol en cada oración: sol, sol y sol."
            },
            # ============================================================
            # ACTIVIDAD 9 — Foco Mágico
            # ============================================================
            {
                "id": "foco",
                "title": "La Linterna Mágica",
                "prompt": "Mueve la linterna para iluminar los fragmentos y únelos en orden.",
                "speak": "Usa la linterna para iluminar los fragmentos za, pa, to. Unelos en orden para formar la palabra zapato.",
                "type": "foco",
                "question": "Ilumina los fragmentos y tócalos en orden para formar la palabra.",
                "fragments": ["za", "pa", "to"],
                "answer": ["za", "pa", "to"],
                "word": "zapato",
                "success": "¡La linterna iluminó la palabra completa: ZAPATO!",
                "hint": "Busca los fragmentos dispersos en la oscuridad: za - pa - to."
            },
            # ============================================================
            # ACTIVIDAD 10 — Laberinto de Vocablos
            # ============================================================
            {
                "id": "laberinto",
                "title": "El Laberinto del Conejo",
                "prompt": "Elige el camino cuyas paredes digan 'casa' y evita los distractores.",
                "speak": "El conejito esta atrapado en el centro. Elige el camino correcto cuyas paredes digan casa para que encuentre la salida.",
                "type": "laberinto",
                "question": "Construye el camino correcto para el conejo eligiendo las paredes que dicen 'casa'.",
                "target": "casa",
"paths": [
                    {"word": "casa", "correct": True},
                    {"word": "luna", "correct": False},
                    {"word": "casa", "correct": True},
                    {"word": "sol", "correct": False}
                ],
                "needed": 2,
                "answer": 2,
                "success": "¡El conejo encontró la salida sin tropezar con las palabras incorrectas!",
                "hint": "Elige solo las paredes que dicen casa. Evita luna y sol."
            },
            # ============================================================
            # ACTIVIDAD 11 — Juegos de asociación de conceptos
            # ============================================================
            {
                "id": "asociacion",
                "title": "Une las Palabras",
                "prompt": "Traza líneas para unir cada palabra con su ilustración.",
                "speak": "Toca una palabra de la izquierda y luego su ilustracion correcta de la derecha. Une rio con su dibujo y arbol con el suyo.",
                "type": "asociacion",
                "question": "Une cada palabra con su ilustración.",
                "pairs": [
                    {"word": "río", "image": "🌊", "answer": "río"},
                    {"word": "árbol", "image": "🌳", "answer": "árbol"}
                ],
                "answer": ["río", "árbol"],
                "success": "¡Las líneas se fijaron en color azul! La relación semántica es correcta.",
                "hint": "El río corre con agua y el árbol tiene hojas. Únelos con su dibujo."
            },
            # ============================================================
            # ACTIVIDAD 12 — Parejas Ocultas (Memorama Semántico)
            # ============================================================
            {
                "id": "memorama",
                "title": "Parejas Ocultas",
                "prompt": "Voltea las cartas y encuentra la palabra 'perro' con su pareja de animal.",
                "speak": "Voltea una carta con la palabra perro y encuentra su carta gemela que tiene la ilustracion de un animal.",
                "type": "memorama",
                "question": "Encuentra las parejas de conceptos.",
                "cards": [
                    {"label": "perro", "kind": "word", "emoji": "🐕"},
                    {"label": "perro", "kind": "image", "emoji": "🐕"},
                    {"label": "gato", "kind": "word", "emoji": "🐱"},
                    {"label": "gato", "kind": "image", "emoji": "🐱"},
                    {"label": "pez", "kind": "word", "emoji": "🐟"},
                    {"label": "pez", "kind": "image", "emoji": "🐟"}
                ],
                "pairs": 3,
                "answer": 3,
                "success": "¡Memorama completado! Las cartas que coinciden quedaron destapadas.",
                "hint": "Busca la palabra perro y su pareja con el dibujo del animal."
            },
            # ============================================================
            # ACTIVIDAD 13 — Clasificación en Canastos
            # ============================================================
            {
                "id": "canastos",
                "title": "Clasifica en Canastos",
                "prompt": "Arrastra cada ficha a su canasto correcto.",
                "speak": "Arrastra la ficha manzana al canasto de alimentos, martillo al de herramientas y vaca al de animales.",
                "type": "canastos",
                "question": "Coloca cada palabra en el canasto que le corresponde.",
                "baskets": [
                    {"name": "Alimentos", "emoji": "🍎"},
                    {"name": "Herramientas", "emoji": "🔨"},
                    {"name": "Animales", "emoji": "🐄"}
                ],
                "items": [
                    {"word": "manzana", "category": "Alimentos"},
                    {"word": "martillo", "category": "Herramientas"},
                    {"word": "vaca", "category": "Animales"}
                ],
                "answer": 3,
                "success": "¡Todos los canastos recibieron sus fichas! Sonido de confirmación.",
                "hint": "La manzana es un alimento, el martillo es una herramienta y la vaca es un animal."
            },
            # ============================================================
            # ACTIVIDAD 14 — Red de Conexiones
            # ============================================================
            {
                "id": "red",
                "title": "La Red de Conexiones",
                "prompt": "Dispara hilos hacia las tarjetas que se relacionan con 'Fuego'.",
                "speak": "Conecta el concepto fuego con las tarjetas que guardan relacion: calor y humo. Descarta la tarjeta hielo.",
                "type": "red",
                "question": "Toca las tarjetas relacionadas con 'Fuego'.",
                "center": "Fuego",
                "centerEmoji": "🔥",
"satellites": [
                    {"label": "calor", "related": True, "emoji": "🌡️"},
                    {"label": "humo", "related": True, "emoji": "💨"},
                    {"label": "hielo", "related": False, "emoji": "🧊"}
                ],
                "answer": ["calor", "humo"],
                "success": "¡Se formó una red conceptual iluminada alrededor del centro!",
                "hint": "El fuego produce calor y humo. El hielo es frío, no tiene relación."
            },
            # ============================================================
            # ACTIVIDAD 15 — El Árbol Genealógico de Palabras
            # ============================================================
            {
                "id": "arbol",
                "title": "El Árbol de las Palabras",
                "prompt": "Ubica los términos específicos en la rama de Plantas.",
                "speak": "Arrastra los terminos rosa y pino al nivel correcto dentro de la rama de Plantas. Cuando completes la jerarquia, creceran las hojas.",
                "type": "arbol",
                "question": "Arrastra cada término a la rama de Plantas.",
                "category": "Plantas",
                "categoryEmoji": "🌱",
                "terms": [
                    {"label": "rosa", "image": "🌹"},
                    {"label": "pino", "image": "🌲"}
                ],
                "answer": 2,
                "success": "¡Las hojas del árbol crecieron al completar la jerarquía!",
                "hint": "La rosa y el pino son plantas. Colócalos en el nido correcto del árbol."
            }
        ]
        break

with open('data/units.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Unidad 2 actualizada con 15 actividades')
print(f'Total sub-activities: {len(unit["subActivities"])}')
