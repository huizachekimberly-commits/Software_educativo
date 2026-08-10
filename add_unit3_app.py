import re

with open("js/app.js", encoding="utf-8") as f:
    content = f.read()

# ---------- 1. getBadgeIcon: add Corona del Narrador mapping ----------
old_icon = '''  const iconMap = {
    "Insignia de la Letra Brillante": "assets/images/icons/insignia_de_la_letra_brillante_icon.png",
    "Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png"
  };'''
new_icon = '''  const iconMap = {
    "Insignia de la Letra Brillante": "assets/images/icons/insignia_de_la_letra_brillante_icon.png",
    "Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png",
    "Corona del Narrador": "assets/images/icons/unit3_icon.png"
  };'''
assert old_icon in content, "icon map not found"
content = content.replace(old_icon, new_icon)

# ---------- 2. getUnitSoundFolder: add montanas ----------
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
assert old_sound in content, "sound folder not found"
content = content.replace(old_sound, new_sound)

# ---------- 3. openSubActivity switch cases ----------
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
assert old_switch in content, "openSubActivity switch not found"
content = content.replace(old_switch, new_switch)

# ---------- 4. checkAnswer visibility: hide for auto-complete unit3 types ----------
old_hidden = '''$("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta" || sub.type === "camaleon" || sub.type === "granja" || sub.type === "inspector" || sub.type === "foco" || sub.type === "laberinto" || sub.type === "asociacion" || sub.type === "memorama" || sub.type === "canastos" || sub.type === "red" || sub.type === "arbol"; // Auto-checked by keypress or number click'''
new_hidden = '''$("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta" || sub.type === "camaleon" || sub.type === "granja" || sub.type === "inspector" || sub.type === "foco" || sub.type === "laberinto" || sub.type === "asociacion" || sub.type === "memorama" || sub.type === "canastos" || sub.type === "red" || sub.type === "arbol" || sub.type === "teatro" || sub.type === "libro" || sub.type === "capitulos" || sub.type === "karaoke" || sub.type === "personajes" || sub.type === "mapa" || sub.type === "galeria" || sub.type === "linea" || sub.type === "domino" || sub.type === "cinta"; // Auto-checked'''
assert old_hidden in content, "checkAnswer hidden list not found"
content = content.replace(old_hidden, new_hidden)

# ---------- 5. checkAnswer: add cases before default ----------
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
assert old_check in content, "checkAnswer switch not found"
content = content.replace(old_check, new_check)

# ---------- 6. add montanas to the correct-answer flow ----------
old_flow = '''if (state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque") {'''
new_flow = '''if (state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque" || state.activeUnit.id === "montanas") {'''
assert old_flow in content, "correct-answer flow condition not found"
content = content.replace(old_flow, new_flow)

# ---------- 7. animateActivitySuccess: add cases ----------
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
assert old_anim in content, "animateActivitySuccess not found"
content = content.replace(old_anim, new_anim)

# ---------- 8. closeActivity cleanup ----------
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
assert old_close in content, "closeActivity cleanup not found"
content = content.replace(old_close, new_close)

# ---------- 9. popButton: add unit3 classes ----------
old_pop = '''const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot");'''
new_pop = '''const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot, .cuento-option, .teatro-next, .libro-keyword, .capitulo-option, .karaoke-done, .personajes-item, .quien-char, .mapa-item, .galeria-char, .escenario-option, .ordenar-item, .linea-item, .domino-piece, .cinta-frame, .cinta-play, .antes-option");'''
assert old_pop in content, "popButton selector not found"
content = content.replace(old_pop, new_pop)

# ---------- 10. Insert render functions before ANIMATE SUCCESS ----------
render_block = r'''
/* =============================================
   UNIT 3 (MONTANAS) — 15 ACTIVITIES
   Historia central: Caperucita Roja
   ============================================= */

/* ---------- shared completion helper for unit 3 ---------- */
function completeUnit3Activity(sub) {
  feedback.className = "feedback ok";
  feedback.textContent = sub.success + " ¡Has completado esta actividad!";
  completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
  playTone("success");
  celebrateConfetti();
  animateActivitySuccess(sub);
  playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
    openActivity(state.activeUnit.id);
  });
}

/* ---------- 1. CUENTO: listen & read + final question ---------- */
function renderCuentoActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "cuento-container";

  const storyBox = document.createElement("div");
  storyBox.className = "cuento-story";
  storyBox.id = "cuentoStory";
  storyBox.innerHTML = sub.story.split(" ").map((w) => `<span class="cuento-word">${escapeHtml(w)}</span>`).join(" ");
  container.appendChild(storyBox);

  const narrateBtn = document.createElement("button");
  narrateBtn.className = "primary-btn cuento-listn";
  narrateBtn.textContent = "🔊 Escuchar el cuento";
  narrateBtn.addEventListener("click", () => {
    speak(sub.story);
    highlightCuentoWords();
  });
  container.appendChild(narrateBtn);

  const question = document.createElement("p");
  question.className = "cuento-question";
  question.textContent = sub.question;
  container.appendChild(question);

  const optionsRow = document.createElement("div");
  optionsRow.className = "cuento-options";
  sub.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cuento-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cuento-option").forEach((b) => b.classList.remove("selected-cuento"));
      btn.classList.add("selected-cuento");
      state.selectedAnswer = opt;
      playTone("tap");
    });
    optionsRow.appendChild(btn);
  });
  container.appendChild(optionsRow);

  const star = document.createElement("div");
  star.className = "cuento-star";
  star.id = "cuentoStar";
  star.textContent = "⭐";
  container.appendChild(star);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "cuento-msg";
    msg.textContent = "¡Completaste el cuento! Puedes escucharlo de nuevo.";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

function highlightCuentoWords() {
  const words = document.querySelectorAll(".cuento-word");
  let i = 0;
  const id = setInterval(() => {
    if (state.activeSubActivityIndex === null) { clearInterval(id); return; }
    words.forEach((w) => w.classList.remove("active-cuento"));
    if (words[i]) words[i].classList.add("active-cuento");
    i++;
    if (i >= words.length) clearInterval(id);
  }, 400);
}

/* ---------- 2. TEATRO: shadow theater read-aloud ---------- */
function renderTeatroActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "teatro-container";

  const stage = document.createElement("div");
  stage.className = "teatro-stage";
  stage.id = "teatroStage";
  container.appendChild(stage);

  const bubble = document.createElement("div");
  bubble.className = "teatro-bubble";
  bubble.id = "teatroBubble";
  stage.appendChild(bubble);

  const counter = document.createElement("div");
  counter.className = "teatro-counter";
  counter.id = "teatroCounter";
  container.appendChild(counter);

  const nextBtn = document.createElement("button");
  nextBtn.className = "primary-btn teatro-next";
  nextBtn.id = "teatroNext";
  nextBtn.textContent = "¡Leí en voz alta! Siguiente escena";
  container.appendChild(nextBtn);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "teatro-msg";
    msg.textContent = "¡Ya completaste la obra de sombras!";
    container.appendChild(msg);
    nextBtn.disabled = true;
  }

  state.teatroIndex = 0;
  state.teatroDone = false;

  function renderScene() {
    const idx = state.teatroIndex;
    if (state.teatroDone) return;
    if (idx >= sub.scenes.length) {
      state.teatroDone = true;
      state.selectedAnswer = sub.answer;
      completeUnit3Activity(sub);
      return;
    }
    const scene = sub.scenes[idx];
    bubble.textContent = scene.text;
    bubble.dataset.emoji = scene.emoji;
    stage.className = "teatro-stage scene-" + idx;
    bubble.innerHTML = `<span class="teatro-emoji">${scene.emoji}</span><span class="teatro-text">${escapeHtml(scene.text)}</span>`;
    counter.textContent = `Escena ${idx + 1} de ${sub.scenes.length}`;
  }

  nextBtn.addEventListener("click", () => {
    if (state.teatroDone) return;
    state.teatroIndex++;
    renderScene();
  });

  renderScene();
  activityWorkspace.appendChild(container);
}

/* ---------- 3. LIBRO: magic book with clickable keywords ---------- */
function renderLibroActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "libro-container";

  const book = document.createElement("div");
  book.className = "libro-book";
  book.id = "libroBook";
  container.appendChild(book);

  const page = document.createElement("div");
  page.className = "libro-page";
  page.id = "libroPage";
  book.appendChild(page);

  const defBox = document.createElement("div");
  defBox.className = "libro-def";
  defBox.id = "libroDef";
  defBox.textContent = "Toca una palabra mágica para ver su pista.";
  container.appendChild(defBox);

  const nav = document.createElement("div");
  nav.className = "libro-nav";
  const prevBtn = document.createElement("button");
  prevBtn.className = "secondary-btn libro-prev";
  prevBtn.textContent = "◀ Hoja anterior";
  const nextBtn = document.createElement("button");
  nextBtn.className = "secondary-btn libro-next";
  nextBtn.textContent = "Hoja siguiente ▶";
  nav.append(prevBtn, nextBtn);
  container.appendChild(nav);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "libro-msg";
    msg.textContent = "¡Ya descubriste todas las palabras mágicas!";
    container.appendChild(msg);
  }

  state.libroPage = 0;
  state.libroExplored = 0;

  function renderPage() {
    const pageText = sub.pages[state.libroPage];
    const html = pageText.split(" ").map((w) => {
      const clean = w.replace(/[.,;:!¿?]/g, "").toLowerCase();
      const kw = sub.keywords.find((k) => k.word === clean);
      if (kw) {
        return `<button type="button" class="libro-keyword ${state.libroExplored >= 0 ? '' : ''}" data-word="${kw.word}">${escapeHtml(w)}</button>`;
      }
      return `<span>${escapeHtml(w)}</span>`;
    }).join(" ");
    page.innerHTML = html;

    page.querySelectorAll(".libro-keyword").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kw = sub.keywords.find((k) => k.word === btn.dataset.word);
        if (!kw) return;
        if (btn.classList.contains("discovered")) return;
        btn.classList.add("discovered");
        defBox.innerHTML = `${kw.emoji} <strong>${kw.word}</strong>: ${kw.def}`;
        state.libroExplored++;
        playTone("success");
        if (state.libroExplored >= sub.explored) {
          state.selectedAnswer = sub.explored;
          completeUnit3Activity(sub);
        }
      });
    });
  }

  prevBtn.addEventListener("click", () => {
    if (state.libroPage > 0) { state.libroPage--; renderPage(); }
  });
  nextBtn.addEventListener("click", () => {
    if (state.libroPage < sub.pages.length - 1) { state.libroPage++; renderPage(); }
  });

  renderPage();
  activityWorkspace.appendChild(container);
}

/* ---------- 4. CAPITULOS: progress in 3 stations + mini-game ---------- */
function renderCapitulosActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "capitulos-container";

  // Progress bar with 3 stations
  const progress = document.createElement("div");
  progress.className = "capitulos-progress";
  progress.id = "capitulosProgress";
  container.appendChild(progress);

  const chapterBox = document.createElement("div");
  chapterBox.className = "capitulos-box";
  chapterBox.id = "capitulosBox";
  container.appendChild(chapterBox);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "capitulos-msg";
    msg.textContent = "¡Ya completaste el cuento por capítulos!";
    container.appendChild(msg);
  }

  state.capitulos = { index: 0, done: false };

  function renderProgress() {
    const idx = state.capitulos.index;
    progress.innerHTML = sub.chapters.map((c, i) => {
      let cls = "capitulos-station";
      if (i < idx) cls += " done";
      if (i === idx) cls += " active";
      return `<span class="${cls}">${i < idx ? "✓" : i + 1}</span>`;
    }).join("");
  }

  function renderChapter() {
    if (state.capitulos.done) return;
    const idx = state.capitulos.index;
    if (idx >= sub.chapters.length) {
      state.capitulos.done = true;
      state.selectedAnswer = true;
      completeUnit3Activity(sub);
      return;
    }
    const ch = sub.chapters[idx];
    renderProgress();
    chapterBox.innerHTML = "";
    const title = document.createElement("h4");
    title.className = "capitulos-title";
    title.textContent = ch.title;
    const text = document.createElement("p");
    text.className = "capitulos-text";
    text.textContent = ch.text;
    const q = document.createElement("p");
    q.className = "capitulos-q";
    q.textContent = ch.question;
    chapterBox.append(title, text, q);

    const opts = document.createElement("div");
    opts.className = "capitulos-options";
    ch.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "capitulo-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (ch.answer === opt) {
          playTone("success");
          state.capitulos.index++;
          renderChapter();
        } else {
          playTone("error");
          feedback.className = "feedback try";
          feedback.textContent = sub.hint;
        }
      });
      opts.appendChild(btn);
    });
    chapterBox.appendChild(opts);
  }

  renderChapter();
  activityWorkspace.appendChild(container);
}

/* ---------- 5. KARAOKE: bouncing cursor + read the verse ---------- */
function renderKaraokeActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "karaoke-container";

  const stage = document.createElement("div");
  stage.className = "karaoke-stage";
  stage.id = "karaokeStage";
  container.appendChild(stage);

  const wordsRow = document.createElement("div");
  wordsRow.className = "karaoke-words";
  stage.appendChild(wordsRow);

  const cursor = document.createElement("div");
  cursor.className = "karaoke-cursor";
  cursor.textContent = "🎤";
  stage.appendChild(cursor);

  const doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn karaoke-done";
  doneBtn.textContent = "✔ Terminé de leer la estrofa";
  container.appendChild(doneBtn);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "karaoke-msg";
    msg.textContent = "¡Ya leíste la estrofa con ritmo!";
    container.appendChild(msg);
    doneBtn.disabled = true;
  }

  const wordEls = [];
  sub.words.forEach((w) => {
    const span = document.createElement("span");
    span.className = "karaoke-word";
    span.textContent = w;
    wordsRow.appendChild(span);
    wordEls.push(span);
  });

  let idx = 0;
  wordEls[idx].classList.add("active-karaoke");
  state.karaokeTimer = setInterval(() => {
    if (state.activeSubActivityIndex === null) { if (state.karaokeTimer) { clearInterval(state.karaokeTimer); state.karaokeTimer = null; } return; }
    wordEls[idx].classList.remove("active-karaoke");
    idx = (idx + 1) % wordEls.length;
    wordEls[idx].classList.add("active-karaoke");
    cursor.style.left = wordEls[idx].offsetLeft + "px";
    cursor.style.top = (wordEls[idx].offsetTop - 34) + "px";
  }, 700);

  doneBtn.addEventListener("click", () => {
    if (state.karaokeTimer) { clearInterval(state.karaokeTimer); state.karaokeTimer = null; }
    state.selectedAnswer = true;
    completeUnit3Activity(sub);
  });

  activityWorkspace.appendChild(container);
}

/* ---------- 6. PERSONAJES: drag to Personajes / Escenarios ---------- */
function renderPersonajesActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "personajes-container";

  state.personajesMatched = 0;

  const catsRow = document.createElement("div");
  catsRow.className = "personajes-cats";
  sub.categories.forEach((cat) => {
    const catEl = document.createElement("div");
    c
