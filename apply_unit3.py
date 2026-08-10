import re
import json

# ============================================================
# 1. Update data/units.json : add subActivities to montanas
# ============================================================
with open("data/units.json", encoding="utf-8") as f:
    raw = f.read()

data = json.loads(raw)
for unit in data["units"]:
    if unit["id"] == "montanas":
        # remove old single activity
        unit.pop("activity", None)
        unit["castleMapImage"] = ""
        unit["subActivities"] = [
            {"id":"cuento","title":"Escucha y Lee el Cuento","prompt":"Escucha y lee Caperucita Roja. Al final, responde la pregunta.","speak":"Habia una vez una nina llamada Caperucita Roja que llevaba una cesta a su abuelita.","type":"cuento","story":"Había una vez una niña llamada Caperucita Roja. Un día, su madre le pidió que llevara una cesta de comida a su abuelita. En el camino, Caperucita se encontró con un lobo. El lobo le preguntó a dónde iba. Caperucita le dijo que iba a casa de su abuelita. El lobo corrió por el bosque y llegó antes. Cuando la abuelita abrió la puerta, el lobo entró y la escondió. Al llegar Caperucita, el lobo fingió ser la abuelita. Pero un leñador escuchó los ruidos y salvó a todos.","question":"¿Qué llevaba Caperucita Roja a su abuelita?","options":["Una cesta de comida","Una espada","Un pastel de fresa"],"answer":"Una cesta de comida","success":"¡Muy bien! Caperucita llevaba una cesta de comida a su abuelita. ¡Tu estrella dorada brilla!","hint":"Recuerda el inicio del cuento: su madre le pidió llevar una cesta de comida."},
            {"id":"teatro","title":"Teatro de Sombras Lector","prompt":"Lee en voz alta los diálogos de las sombras para avanzar la obra.","speak":"Lee en voz alta cada dialogo de las sombras para desbloquear la siguiente escena.","type":"teatro","scenes":[{"text":"¿A dónde vas, Caperucita?","emoji":"🐺"},{"text":"Voy a casa de mi abuelita.","emoji":"🔴"},{"text":"¡Corre, Caperucita, corre!","emoji":"🪵"}],"answer":["¿A dónde vas, Caperucita?","Voy a casa de mi abuelita.","¡Corre, Caperucita, corre!"],"success":"¡Excelente! Las sombras representaron la obra completa.","hint":"Lee cada burbuja en voz alta del primero al último."},
            {"id":"libro","title":"El Libro Mágico de Páginas Activas","prompt":"Pasa las hojas y toca las palabras mágicas para ver su animación.","speak":"Toca cada palabra magica del cuento para ver su definicion divertida.","type":"libro","pages":["El lobo se escondió detrás de un árbol.","Caperucita llevó la cesta por el bosque.","El leñador escuchó la voz de la abuelita."],"keywords":[{"word":"lobo","emoji":"🐺","def":"El lobo es un animal grande que vive en el bosque y aúlla a la luna."},{"word":"bosque","emoji":"🌲","def":"El bosque es un lugar lleno de árboles altos y verdes."},{"word":"cesta","emoji":"🧺","def":"La cesta es un canasto que se usa para llevar comida."}],"explored":3,"success":"¡Muy bien! Descubriste todas las palabras mágicas del libro.","hint":"Toca cada palabra resaltada para desplegar su pista."},
            {"id":"capitulos","title":"Cuento por Capítulos","prompt":"Lee cada capítulo y supera el mini-juego para avanzar.","speak":"Lee el primer capitulo, responde y desbloquea el siguiente.","type":"capitulos","chapters":[{"title":"Capítulo 1","text":"Caperucita sale de su casa con la cesta para la abuelita.","question":"¿Para quién es la cesta?","options":["La abuelita","El lobo","El leñador"],"answer":"La abuelita"},{"title":"Capítulo 2","text":"En el bosque, el lobo le pregunta a dónde va.","question":"¿Quién le pregunta a dónde va?","options":["El leñador","El lobo","La madre"],"answer":"El lobo"},{"title":"Capítulo 3","text":"El leñador salva a la abuelita y a Caperucita.","question":"¿Quién salva a todos?","options":["El lobo","El leñador","La madre"],"answer":"El leñador"}],"success":"¡Completaste el recorrido completo del cuento por capítulos!","hint":"Responde cada mini-juego para abrir el siguiente capítulo."},
            {"id":"karaoke","title":"Karaoke Literario","prompt":"Sigue el cursor que rebota y lee la estrofa con ritmo.","speak":"Caperucita va por el bosque, con su cesta y su capa roja.","type":"karaoke","verse":"Caperucita va por el bosque, con su cesta y su capa roja.","words":["Caperucita","va","por","el","bosque,","con","su","cesta","y","su","capa","roja."],"answer":True,"success":"¡Excelente lectura! Tu ritmo y precisión fueron brillantes.","hint":"Lee siguiendo el ritmo del cursor que rebota sobre cada palabra."},
            {"id":"personajes","title":"Personajes y Lugares","prompt":"Arrastra cada cromo a su categoría: Personajes o Escenarios.","speak":"Arrastra Caperucita y el lobo a Personajes, y el bosque y la casa a Escenarios.","type":"personajes","categories":[{"name":"Personajes","emoji":"🎭"},{"name":"Escenarios","emoji":"🏞️"}],"items":[{"word":"Caperucita","category":"Personajes","emoji":"🔴"},{"word":"Lobo","category":"Personajes","emoji":"🐺"},{"word":"Bosque","category":"Escenarios","emoji":"🌲"},{"word":"Casa","category":"Escenarios","emoji":"🏠"}],"answer":4,"success":"¡Todos los cromos quedaron en su categoría con su sello de aprobación!","hint":"Los personajes son quienes actúan; los escenarios son lugares donde ocurre."},
            {"id":"quien","title":"¿Quién dijo qué?","prompt":"Toca el rostro del personaje que pronunció esta frase.","speak":"Quien dijo: A donde vas, Caperucita. Toca el personaje correcto.","type":"quien","quote":"¿A dónde vas, Caperucita?","characters":[{"name":"El Lobo","emoji":"🐺"},{"name":"Caperucita","emoji":"🔴"},{"name":"La Madre","emoji":"👩"}],"answer":"El Lobo","success":"¡Se encendió el haz de luz! El lobo fue quien dijo la frase.","hint":"¿Quién esperó a Caperucita en el camino para preguntarle?"},
            {"id":"mapa","title":"Mapa del Narrador","prompt":"Ubica las fichas de los personajes en la zona del mapa donde ocurrió la acción.","speak":"Coloca a Caperucita en el camino, al lobo en el bosque y a la abuelita en la casa.","type":"mapa","zones":[{"name":"El Camino","emoji":"🛤️","events":"Caperucita caminó por el camino hacia la casa."},{"name":"El Bosque","emoji":"🌲","events":"El lobo se encontró con Caperucita en el bosque."},{"name":"La Casa","emoji":"🏠","events":"La abuelita estaba en su casa."}],"items":[{"word":"Caperucita","zone":"El Camino","emoji":"🔴"},{"word":"Lobo","zone":"El Bosque","emoji":"🐺"},{"word":"Abuelita","zone":"La Casa","emoji":"👵"}],"answer":3,"success":"¡Las zonas se activaron y mostraron el resumen del evento!","hint":"Ubica cada personaje en el lugar donde realizó su acción clave."},
            {"id":"galeria","title":"Galería de Protagonistas","prompt":"Selecciona solo a los personajes que formaron parte de la trama.","speak":"Selecciona a Caperucita, el lobo, la abuelita y el lenador. Evita los distractores.","type":"galeria","characters":[{"name":"Caperucita","emoji":"🔴","correct":True},{"name":"El Lobo","emoji":"🐺","correct":True},{"name":"La Abuelita","emoji":"👵","correct":True},{"name":"El Leñador","emoji":"🪵","correct":True},{"name":"Un Dragón","emoji":"🐉","correct":False},{"name":"Un Robot","emoji":"🤖","correct":False}],"answer":4,"success":"¡Los personajes correctos brillan en marcos dorados y los distractores desaparecen!","hint":"Elige solo a quienes aparecieron en el cuento de Caperucita."},
            {"id":"escenario","title":"Escenario Ideal","prompt":"Elige el paisaje donde se desarrolló el suceso clave.","speak":"Elige el lugar donde Caperucita se encontro con el lobo.","type":"escenario","question":"¿Dónde se encontró Caperucita con el lobo?","options":[{"label":"El bosque","emoji":"🌲","scene":"el bosque frondoso y oscuro"},{"label":"La playa","emoji":"🏖️","scene":"la playa soleada"},{"label":"El castillo","emoji":"🏰","scene":"el castillo de piedra"}],"answer":"El bosque","success":"¡El fondo se desplegó en pantalla completa! El encuentro fue en el bosque.","hint":"El lobo vivía escondido entre los árboles."},
            {"id":"ordenar","title":"Ordena la Historia","prompt":"Arrastra las viñetas a los espacios del 1 al 3 en orden lógico.","speak":"Ordena: primero sale de casa, luego encuentra al lobo, al final llega a la casa.","type":"ordenar","items":[{"label":"Caperucita sale de casa","emoji":"🏠"},{"label":"Encuentra al lobo","emoji":"🐺"},{"label":"Llega a la casa","emoji":"🏡"}],"answer":["Caperucita sale de casa","Encuentra al lobo","Llega a la casa"],"success":"¡Las viñetas se acomodaron en la línea reproduciendo la historia en orden!","hint":"¿Qué pasó primero? ¿Qué pasó después? ¿Qué pasó al final?"},
            {"id":"linea","title":"Línea del Tiempo Interactiva","prompt":"Arrastra las tarjetas a Inicio, Desarrollo o Desenlace.","speak":"Coloca la salida de casa en Inicio, el encuentro con el lobo en Desarrollo y el rescate en Desenlace.","type":"linea","categories":[{"name":"Inicio","emoji":"🌅"},{"name":"Desarrollo","emoji":"⏳"},{"name":"Desenlace","emoji":"🌇"}],"items":[{"word":"Caperucita sale de casa","category":"Inicio","emoji":"🏠"},{"word":"El lobo la engaña","category":"Desarrollo","emoji":"🐺"},{"word":"El leñador salva a todos","category":"Desenlace","emoji":"🪵"}],"answer":3,"success":"¡La línea del tiempo se completó y muestra el resumen animado del relato!","hint":"Inicio es el comienzo, Desarrollo la parte central y Desenlace el final."},
            {"id":"domino","title":"El Dominó de los Sucesos","prompt":"Une las fichas siguiendo la lógica temporal y causa-efecto.","speak":"Une las fichas en orden: primero fue el bien, luego el lobo, despues el rescate.","type":"domino","pieces":[{"text":"Caperucita sale de casa","next":"Encuentra al lobo","emoji":"🔴"},{"text":"Encuentra al lobo","next":"El lobo engaña a la abuelita","emoji":"🐺"},{"text":"El lobo engaña a la abuelita","next":"El leñador rescata a todos","emoji":"👵"}],"answer":["Caperucita sale de casa","Encuentra al lobo","El lobo engaña a la abuelita","El leñador rescata a todos"],"success":"¡Las fichas formaron una cadena continua sin interrupciones!","hint":"Busca la ficha que continúa después de cada hecho."},
            {"id":"cinta","title":"Cinta Cinematográfica","prompt":"Ordena los fotogramas de izquierda a derecha y presiona Play.","speak":"Arrastra los fotogramas para que la historia tenga coherencia causal.","type":"cinta","frames":[{"text":"Caperucita sale","emoji":"🏠"},{"text":"Encuentra al lobo","emoji":"🐺"},{"text":"El rescate","emoji":"🪵"}],"answer":["Caperucita sale","Encuentra al lobo","El rescate"],"success":"¡La mini-película se reprodujo en orden!","hint":"Pon el inicio a la izquierda y el final a la derecha."},
            {"id":"antes","title":"Antes y Después","prompt":"Elige qué ocurrió antes y qué ocurrió después de la escena central.","speak":"La escena central es en el bosque. Que paso antes y despues?","type":"antes","central":"Caperucita se encuentra con el lobo en el bosque","beforeOptions":["Caperucita caminaba por el camino","Caperucita llegó a la casa","El leñador salvó a todos"],"afterOptions":["El lobo corre a casa de la abuelita","Caperucita vuelve a casa","El leñador se esconde"],"answerBefore":"Caperucita caminaba por el camino","answerAfter":"El lobo corre a casa de la abuelita","success":"¡Enlazaste los tres momentos clave y completaste el ciclo de la historia!","hint":"Antes del encuentro, Caperucita caminaba; después, el lobo corrió a la casa."}
        ]
        break

with open("data/units.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("units.json updated. montanas subActivities:", len([u for u in data["units"] if u["id"]=="montanas"][0]["subActivities"]))

# ============================================================
# 2. Merge render functions into app.js
# ============================================================
with open("js/app.js", encoding="utf-8") as f:
    app = f.read()

with open("js/unit3_render.js", encoding="utf-8") as f:
    render = f.read()

# Insert render block before the ANIMATE SUCCESS comment
marker = "/* =============================================\n   ANIMATE SUCCESS — per-scene celebration for Unidad 2"
assert marker in app, "animate marker not found"
app = app.replace(marker, render + "\n" + marker)

# ---------- getBadgeIcon ----------
old_icon = '"Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png"\n  };'
new_icon = '"Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png",\n    "Corona del Narrador": "assets/images/icons/unit3_icon.png"\n  };'
assert old_icon in app, "icon map not found"
app = app.replace(old_icon, new_icon)

# ---------- getUnitSoundFolder ----------
old_sound = '''  // Unit 2 (Bosque) uses theme1
  if (unitId === "bosque") {
    return `assets/unit_${unitNumber}_sounds/theme1`;
  }
  return `assets/unit_${unitNumber}_sounds`;'''
new_sound = '''  // Unit 2 (Bosque) uses theme1
  if (unitId === "bosque") {
    return `assets/unit_${unitNumber}_sounds/theme1`;
  }
  // Unit 3 (Montañas) has no MP3 folder: fall back to theme1-style path
  if (unitId === "montanas") {
    return `assets/unit_${unitNumber}_sounds/theme1`;
  }
  return `assets/unit_${unitNumber}_sounds`;'''
assert old_sound in app, "sound folder not found"
app = app.replace(old_sound, new_sound)

# ---------- openSubActivity switch cases ----------
old_switch = '''    case "arbol":
      renderArbolActivity(sub, alreadyCompleted);
      break;
    default:
      feedback.textContent = "Actividad no disponible.";
  }
}'''
new_switch = '''    case "arbol":
      renderArbolActivity(sub, alreadyCompleted);
      break;
    case "cuento":
      renderCuentoActivity(sub, alreadyCompleted);
      break;
    case "teatro":
      renderTeatroActivity(sub, alreadyCompleted);
      break;
    case "libro":
      renderLibroActivity(sub, alreadyCompleted);
      break;
    case "capitulos":
      renderCapitulosActivity(sub, alreadyCompleted);
      break;
    case "karaoke":
      renderKaraokeActivity(sub, alreadyCompleted);
      break;
    case "personajes":
      renderPersonajesActivity(sub, alreadyCompleted);
      break;
    case "quien":
      renderQuienActivity(sub);
      break;
    case "mapa":
      renderMapaActivity(sub, alreadyCompleted);
      break;
    case "galeria":
      renderGaleriaActivity(sub, alreadyCompleted);
      break;
    case "escenario":
      renderEscenarioActivity(sub);
      break;
    case "ordenar":
      renderOrdenarActivity(sub, alreadyCompleted);
      break;
    case "linea":
      renderLineaActivity(sub, alreadyCompleted);
      break;
    case "domino":
      renderDominoActivity(sub, alreadyCompleted);
      break;
    case "cinta":
      renderCintaActivity(sub, alreadyCompleted);
      break;
    case "antes":
      renderAntesActivity(sub);
      break;
    default:
      feedback.textContent = "Actividad no disponible.";
  }
}'''
assert old_switch in app, "openSubActivity switch not found"
app = app.replace(old_switch, new_switch)

# ---------- checkAnswer hidden list ----------
old_hidden = '''$("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta" || sub.type === "camaleon" || sub.type === "granja" || sub.type === "inspector" || sub.type === "foco" || sub.type === "laberinto" || sub.type === "asociacion" || sub.type === "memorama" || sub.type === "canastos" || sub.type === "red" || sub.type === "arbol"; // Auto-checked by keypress or number click'''
new_hidden = '''$("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta" || sub.type === "camaleon" || sub.type === "granja" || sub.type === "inspector" || sub.type === "foco" || sub.type === "laberinto" || sub.type === "asociacion" || sub.type === "memorama" || sub.type === "canastos" || sub.type === "red" || sub.type === "arbol" || sub.type === "teatro" || sub.type === "libro" || sub.type === "capitulos" || sub.type === "karaoke" || sub.type === "personajes" || sub.type === "mapa" || sub.type === "galeria" || sub.type === "linea" || sub.type === "domino" || sub.type === "cinta"; // Auto-checked'''
assert old_hidden in app, "checkAnswer hidden list not found"
app = app.replace(old_hidden, new_hidden)

# ---------- checkAnswer switch cases ----------
old_check = '''      case "oracion":
      case "puente":
      case "frase":
      case "detective":
      case "accion":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      default:
        isCorrect = false;
    }'''
new_check = '''      case "oracion":
      case "puente":
      case "frase":
      case "detective":
      case "accion":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "cuento":
      case "quien":
      case "escenario":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "antes":
        isCorrect = state.antesBefore === sub.answerBefore && state.antesAfter === sub.answerAfter;
        break;
      case "ordenar":
        isCorrect = sub.answer.every((item, idx) => state.sequenceAnswer[idx] === item);
        break;
      default:
        isCorrect = false;
    }'''
assert old_check in app, "checkAnswer switch not found"
app = app.replace(old_check, new_check)

# ---------- correct-answer flow condition ----------
old_flow = 'if (state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque") {'
new_flow = 'if (state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque" || state.activeUnit.id === "montanas") {'
assert old_flow in app, "correct-answer flow condition not found"
app = app.replace(old_flow, new_flow)

# ---------- animateActivitySuccess cases ----------
old_anim = '''    case "accion": {
      // Victory glow on the scene — the video keeps looping silently
      const scene = document.getElementById("accionScene");
      if (scene) scene.classList.add("accion-victory");
      break;
    }
    default:
      break;
  }
}'''
new_anim = '''    case "accion": {
      // Victory glow on the scene — the video keeps looping silently
      const scene = document.getElementById("accionScene");
      if (scene) scene.classList.add("accion-victory");
      break;
    }
    case "cuento": {
      const star = document.getElementById("cuentoStar");
      if (star) star.classList.add("star-won");
      break;
    }
    case "karaoke": {
      const karaoke = document.getElementById("karaokeStage");
      if (karaoke) karaoke.classList.add("karaoke-won");
      break;
    }
    case "escenario": {
      const scene = document.getElementById("escenarioScene");
      if (scene) scene.classList.add("escenario-revealed");
      break;
    }
    case "cinta": {
      const film = document.getElementById("cintaFilm");
      if (film) film.classList.add("film-playing");
      break;
    }
    default:
      break;
  }
}'''
assert old_anim in app, "animateActivitySuccess not found"
app = app.replace(old_anim, new_anim)

# ---------- closeActivity cleanup ----------
old_close = '''  // Pause any active looping video (accion activity) so it doesn't keep playing in the background
  const accionVideo = document.getElementById("accionVideo");
  if (accionVideo) {
    accionVideo.pause();
    accionVideo.currentTime = 0;
  }'''
new_close = '''  // Pause any active looping video (accion activity) so it doesn't keep playing in the background
  const accionVideo = document.getElementById("accionVideo");
  if (accionVideo) {
    accionVideo.pause();
    accionVideo.currentTime = 0;
  }
  // Unit 3 cleanup: stop karaoke cursor interval
  if (state.karaokeTimer) {
    clearInterval(state.karaokeTimer);
    state.karaokeTimer = null;
  }
  // Unit 3 cleanup: stop cinta playback interval
  if (state.cintaTimer) {
    clearInterval(state.cintaTimer);
    state.cintaTimer = null;
  }'''
assert old_close in app, "closeActivity cleanup not found"
app = app.replace(old_close, new_close)

# ---------- popButton selector ----------
old_pop = '''const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot");'''
new_pop = '''const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot, .cuento-option, .teatro-next, .libro-keyword, .capitulo-option, .karaoke-done, .personajes-item, .quien-char, .mapa-item, .galeria-char, .escenario-option, .ordenar-item, .linea-item, .domino-piece, .cinta-frame, .cinta-play, .antes-option");'''
assert old_pop in app, "popButton selector not found"
app = app.replace(old_pop, new_pop)

# ============================================================
# 3. Write back app.js
# ============================================================
with open("js/app.js", "w", encoding="utf-8") as f:
    f.write(app)

print("app.js updated successfully.")
print("app.js length:", len(app))
