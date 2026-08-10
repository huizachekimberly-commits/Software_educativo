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
  narrateBtn.className = "primary-btn cuento-listen";
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
        return `<button type="button" class="libro-keyword" data-word="${kw.word}">${escapeHtml(w)}</button>`;
      }
      return `<span>${escapeHtml(w)}</span>`;
    }).join(" ");
    page.innerHTML = html;

    page.querySelectorAll(".libro-keyword").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kw = sub.keywords.find((k) => k.word === btn.dataset.word);
        if (!kw || btn.classList.contains("discovered")) return;
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

  function renderProgressBar() {
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
    renderProgressBar();
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
  if (wordEls[0]) wordEls[0].classList.add("active-karaoke");
  state.karaokeTimer = setInterval(() => {
    if (state.activeSubActivityIndex === null) {
      if (state.karaokeTimer) { clearInterval(state.karaokeTimer); state.karaokeTimer = null; }
      return;
    }
    if (wordEls[idx]) wordEls[idx].classList.remove("active-karaoke");
    idx = (idx + 1) % wordEls.length;
    if (wordEls[idx]) wordEls[idx].classList.add("active-karaoke");
    cursor.style.left = (wordEls[idx].offsetLeft + wordEls[idx].offsetWidth / 2 - 16) + "px";
    cursor.style.top = (wordEls[idx].offsetTop - 40) + "px";
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
    catEl.className = "personajes-cat";
    catEl.dataset.category = cat.name;
    catEl.innerHTML = `<span class="personajes-cat-emoji">${cat.emoji}</span><span class="personajes-cat-name">${cat.name}</span>`;
    catEl.addEventListener("dragover", (e) => { e.preventDefault(); catEl.classList.add("drag-over-personajes"); });
    catEl.addEventListener("dragleave", () => catEl.classList.remove("drag-over-personajes"));
    catEl.addEventListener("drop", (e) => {
      e.preventDefault();
      catEl.classList.remove("drag-over-personajes");
      const word = e.dataTransfer.getData("text/plain");
      const item = sub.items.find((it) => it.word === word);
      const chip = document.getElementById("personajesItem-" + word);
      if (item && item.category === cat.name && chip && !chip.classList.contains("correct")) {
        chip.classList.add("correct");
        chip.draggable = false;
        catEl.appendChild(chip);
        state.personajesMatched++;
        playTone("success");
        if (state.personajesMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      } else {
        playTone("error");
      }
    });
    catsRow.appendChild(catEl);
  });
  container.appendChild(catsRow);

  const itemsRow = document.createElement("div");
  itemsRow.className = "personajes-items";
  const shuffled = [...sub.items].sort(() => Math.random() - 0.5);
  shuffled.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "personajes-item";
    chip.id = "personajesItem-" + item.word;
    chip.dataset.word = item.word;
    chip.innerHTML = `<span class="personajes-item-emoji">${item.emoji}</span><span class="personajes-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-personajes"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-personajes"));
    // click fallback for touch
    chip.addEventListener("click", () => {
      if (chip.classList.contains("correct")) return;
      const targetCat = sub.categories.find((c) => c.name === item.category).name;
      const catEl = [...catsRow.querySelectorAll(".personajes-cat")].find((c) => c.dataset.category === targetCat);
      if (catEl) {
        chip.classList.add("correct");
        chip.draggable = false;
        catEl.appendChild(chip);
        state.personajesMatched++;
        playTone("success");
        if (state.personajesMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      }
    });
    itemsRow.appendChild(chip);
  });
  container.appendChild(itemsRow);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "personajes-msg";
    msg.textContent = "¡Ya clasificaste todos los cromos!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

/* ---------- 7. QUIEN: light-beam association ---------- */
function renderQuienActivity(sub) {
  const container = document.createElement("div");
  container.className = "quien-container";

  const quote = document.createElement("div");
  quote.className = "quien-quote";
  quote.textContent = "💬 " + sub.quote;
  container.appendChild(quote);

  const charsRow = document.createElement("div");
  charsRow.className = "quien-chars";
  sub.characters.forEach((ch) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quien-char";
    btn.dataset.name = ch.name;
    btn.innerHTML = `<span class="quien-char-emoji">${ch.emoji}</span><span class="quien-char-name">${ch.name}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".quien-char").forEach((b) => b.classList.remove("selected-quien"));
      btn.classList.add("selected-quien");
      state.selectedAnswer = ch.name;
      playTone("tap");
    });
    charsRow.appendChild(btn);
  });
  container.appendChild(charsRow);

  activityWorkspace.appendChild(container);
}

/* ---------- 8. MAPA: place character chips into zones ---------- */
function renderMapaActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "mapa-container";

  state.mapaMatched = 0;

  const zonesRow = document.createElement("div");
  zonesRow.className = "mapa-zones";
  sub.zones.forEach((zone) => {
    const zoneEl = document.createElement("div");
    zoneEl.className = "mapa-zone";
    zoneEl.dataset.zone = zone.name;
    zoneEl.innerHTML = `<span class="mapa-zone-emoji">${zone.emoji}</span><span class="mapa-zone-name">${zone.name}</span><span class="mapa-zone-event"></span>`;
    zoneEl.addEventListener("dragover", (e) => { e.preventDefault(); zoneEl.classList.add("drag-over-mapa"); });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("drag-over-mapa"));
    zoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      zoneEl.classList.remove("drag-over-mapa");
      const word = e.dataTransfer.getData("text/plain");
      const item = sub.items.find((it) => it.word === word);
      const chip = document.getElementById("mapaItem-" + word);
      if (item && item.zone === zone.name && chip && !chip.classList.contains("correct")) {
        chip.classList.add("correct");
        chip.draggable = false;
        zoneEl.appendChild(chip);
        zoneEl.querySelector(".mapa-zone-event").textContent = "📌 " + zone.events;
        state.mapaMatched++;
        playTone("success");
        if (state.mapaMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      } else {
        playTone("error");
      }
    });
    zonesRow.appendChild(zoneEl);
  });
  container.appendChild(zonesRow);

  const tray = document.createElement("div");
  tray.className = "mapa-tray";
  const shuffled = [...sub.items].sort(() => Math.random() - 0.5);
  shuffled.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "mapa-item";
    chip.id = "mapaItem-" + item.word;
    chip.dataset.zone = item.zone;
    chip.innerHTML = `<span class="mapa-item-emoji">${item.emoji}</span><span class="mapa-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-mapa"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-mapa"));
    chip.addEventListener("click", () => {
      if (chip.classList.contains("correct")) return;
      const zoneEl = [...zonesRow.querySelectorAll(".mapa-zone")].find((z) => z.dataset.zone === item.zone);
      if (zoneEl) {
        chip.classList.add("correct");
        chip.draggable = false;
        zoneEl.appendChild(chip);
        zoneEl.querySelector(".mapa-zone-event").textContent = "📌 " + item.zone;
        state.mapaMatched++;
        playTone("success");
        if (state.mapaMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      }
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "mapa-msg";
    msg.textContent = "¡Ya ubicaste todos los personajes en el mapa!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

/* ---------- 9. GALERIA: select real characters ---------- */
function renderGaleriaActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "galeria-container";

  state.galeriaCorrect = 0;

  const grid = document.createElement("div");
  grid.className = "galeria-grid";
  const shuffled = [...sub.characters].sort(() => Math.random() - 0.5);
  shuffled.forEach((ch) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "galeria-char";
    card.dataset.correct = ch.correct ? "true" : "false";
    card.innerHTML = `<span class="galeria-char-emoji">${ch.emoji}</span><span class="galeria-char-name">${ch.name}</span>`;
    card.addEventListener("click", () => {
      if (card.classList.contains("resolved")) return;
      if (ch.correct) {
        card.classList.add("correct-char");
        card.classList.add("resolved");
        state.galeriaCorrect++;
        playTone("success");
        if (state.galeriaCorrect >= sub.answer) {
          // hide distractors
          document.querySelectorAll(".galeria-char[data-correct='false']").forEach((d) => d.classList.add("rejected-char"));
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      } else {
        card.classList.add("rejected-char");
        card.classList.add("resolved");
        playTone("error");
      }
    });
    grid.appendChild(card);
  });
  container.appendChild(grid);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "galeria-msg";
    msg.textContent = "¡Ya identificaste a todos los protagonistas!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

/* ---------- 10. ESCENARIO: choose the correct landscape ---------- */
function renderEscenarioActivity(sub) {
  const container = document.createElement("div");
  container.className = "escenario-container";

  const scene = document.createElement("div");
  scene.className = "escenario-scene";
  scene.id = "escenarioScene";
  scene.textContent = "🌄 ¿En qué lugar ocurrió?";
  container.appendChild(scene);

  const question = document.createElement("p");
  question.className = "escenario-question";
  question.textContent = sub.question;
  container.appendChild(question);

  const optionsRow = document.createElement("div");
  optionsRow.className = "escenario-options";
  sub.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "escenario-option";
    btn.dataset.label = opt.label;
    btn.innerHTML = `<span class="escenario-option-emoji">${opt.emoji}</span><span class="escenario-option-label">${opt.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".escenario-option").forEach((b) => b.classList.remove("selected-escenario"));
      btn.classList.add("selected-escenario");
      state.selectedAnswer = opt.label;
      scene.textContent = opt.emoji + " " + opt.scene;
      playTone("tap");
    });
    optionsRow.appendChild(btn);
  });
  container.appendChild(optionsRow);

  activityWorkspace.appendChild(container);
}

/* ---------- 11. ORDENAR: arrange 3 vignettes ---------- */
function renderOrdenarActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "ordenar-container";

  state.sequenceAnswer = [];

  const slots = document.createElement("div");
  slots.className = "ordenar-slots";
  sub.items.forEach((_, i) => {
    const slot = document.createElement("div");
    slot.className = "ordenar-slot";
    slot.id = "ordenarSlot" + i;
    slot.dataset.index = i;
    slot.textContent = (i + 1) + ". ___";
    slots.appendChild(slot);
  });
  container.appendChild(slots);

  const tray = document.createElement("div");
  tray.className = "ordenar-tray";
  const shuffled = [...sub.items].sort(() => Math.random() - 0.5);
  const itemMap = {};
  shuffled.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "ordenar-item";
    chip.id = "ordenarItem-" + item.label;
    chip.dataset.label = item.label;
    chip.innerHTML = `<span class="ordenar-item-emoji">${item.emoji}</span><span class="ordenar-item-label">${item.label}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    itemMap[item.label] = chip;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.label); chip.classList.add("dragging-ordenar"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-ordenar"));
    chip.addEventListener("click", () => {
      if (chip.classList.contains("used")) return;
      const next = state.sequenceAnswer.length;
      if (next >= sub.items.length) return;
      const slot = document.getElementById("ordenarSlot" + next);
      if (slot) { slot.textContent = (next + 1) + ". " + item.label; slot.classList.add("filled-ordenar"); }
      chip.classList.add("used");
      state.sequenceAnswer.push(item.label);
      playTone("tap");
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  // clicking a filled slot returns it
  sub.items.forEach((_, i) => {
    const slot = container.querySelector("#ordenarSlot" + i);
    slot.addEventListener("click", (e) => {
      e.stopPropagation();
      const last = state.sequenceAnswer.length - 1;
      if (parseInt(slot.dataset.index) !== last) return;
      const label = state.sequenceAnswer.pop();
      slot.textContent = (last + 1) + ". ___";
      slot.classList.remove("filled-ordenar");
      const chip = itemMap[label];
      if (chip) chip.classList.remove("used");
      playTone("tap");
    });
  });

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "ordenar-msg";
    msg.textContent = "¡Ya ordenaste la historia!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

/* ---------- 12. LINEA: timeline Inicio/Desarrollo/Desenlace ---------- */
function renderLineaActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "linea-container";

  state.lineaMatched = 0;

  const catsRow = document.createElement("div");
  catsRow.className = "linea-cats";
  sub.categories.forEach((cat) => {
    const catEl = document.createElement("div");
    catEl.className = "linea-cat";
    catEl.dataset.category = cat.name;
    catEl.innerHTML = `<span class="linea-cat-emoji">${cat.emoji}</span><span class="linea-cat-name">${cat.name}</span>`;
    catEl.addEventListener("dragover", (e) => { e.preventDefault(); catEl.classList.add("drag-over-linea"); });
    catEl.addEventListener("dragleave", () => catEl.classList.remove("drag-over-linea"));
    catEl.addEventListener("drop", (e) => {
      e.preventDefault();
      catEl.classList.remove("drag-over-linea");
      const word = e.dataTransfer.getData("text/plain");
      const item = sub.items.find((it) => it.word === word);
      const chip = document.getElementById("lineaItem-" + word);
      if (item && item.category === cat.name && chip && !chip.classList.contains("correct")) {
        chip.classList.add("correct");
        chip.draggable = false;
        catEl.appendChild(chip);
        state.lineaMatched++;
        playTone("success");
        if (state.lineaMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      } else {
        playTone("error");
      }
    });
    catsRow.appendChild(catEl);
  });
  container.appendChild(catsRow);

  const tray = document.createElement("div");
  tray.className = "linea-tray";
  const shuffled = [...sub.items].sort(() => Math.random() - 0.5);
  shuffled.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "linea-item";
    chip.id = "lineaItem-" + item.word;
    chip.dataset.category = item.category;
    chip.innerHTML = `<span class="linea-item-emoji">${item.emoji}</span><span class="linea-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-linea"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-linea"));
    chip.addEventListener("click", () => {
      if (chip.classList.contains("correct")) return;
      const catEl = [...catsRow.querySelectorAll(".linea-cat")].find((c) => c.dataset.category === item.category);
      if (catEl) {
        chip.classList.add("correct");
        chip.draggable = false;
        catEl.appendChild(chip);
        state.lineaMatched++;
        playTone("success");
        if (state.lineaMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          completeUnit3Activity(sub);
        }
      }
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "linea-msg";
    msg.textContent = "¡Ya completaste la línea del tiempo!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

/* ---------- 13. DOMINO: chain of events ---------- */
function renderDominoActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "domino-container";

  state.dominoPlaced = [];

  const chain = document.createElement("div");
  chain.className = "domino-chain";
  chain.id = "dominoChain";
  container.appendChild(chain);

  const tray = document.createElement("div");
  tray.className = "domino-tray";
  const shuffled = [...sub.pieces].sort(() => Math.random() - 0.5);
  shuffled.forEach((piece) => {
    const chip = document.createElement("div");
    chip.className = "domino-piece";
    chip.id = "dominoPiece-" + piece.text;
    chip.dataset.text = piece.text;
    chip.innerHTML = `<span class="domino-piece-emoji">${piece.emoji}</span><span class="domino-piece-text">${piece.text}</span><span class="domino-piece-next">→ ${piece.next}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", piece.text); chip.classList.add("dragging-domino"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-domino"));
    chip.addEventListener("click", () => {
      placeDomino(sub, piece.text);
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  chain.addEventListener("dragover", (e) => e.preventDefault());
  chain.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    placeDomino(sub, text);
  });

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "domino-msg";
    msg.textContent = "¡Ya formaste la cadena de sucesos!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

function placeDomino(sub, text) {
  const chip = document.getElementById("dominoPiece-" + text);
  if (!chip || chip.classList.contains("placed")) return;
  const nextExpected = sub.answer[state.dominoPlaced.length];
  if (text !== nextExpected) {
    chip.classList.add("shake");
    setTimeout(() => chip.classList.remove("shake"), 400);
    playTone("error");
    return;
  }
  chip.classList.add("placed");
  chip.draggable = false;
  document.getElementById("dominoChain").appendChild(chip);
  state.dominoPlaced.push(text);
  playTone("success");
  if (state.dominoPlaced.length >= sub.answer.length) {
    state.selectedAnswer = sub.answer;
    completeUnit3Activity(sub);
  }
}

/* ---------- 14. CINTA: film strip + Play ---------- */
function renderCintaActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "cinta-container";

  state.cintaOrder = [];

  const film = document.createElement("div");
  film.className = "cinta-film";
  film.id = "cintaFilm";
  container.appendChild(film);

  const tray = document.createElement("div");
  tray.className = "cinta-tray";
  const shuffled = [...sub.frames].sort(() => Math.random() - 0.5);
  const frameMap = {};
  shuffled.forEach((frame) => {
    const chip = document.createElement("div");
    chip.className = "cinta-frame";
    chip.id = "cintaFrame-" + frame.text;
    chip.dataset.text = frame.text;
    chip.innerHTML = `<span class="cinta-frame-emoji">${frame.emoji}</span><span class="cinta-frame-text">${frame.text}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    frameMap[frame.text] = chip;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", frame.text); chip.classList.add("dragging-cinta"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-cinta"));
    chip.addEventListener("click", () => {
      placeCinta(sub, frame.text);
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  film.addEventListener("dragover", (e) => e.preventDefault());
  film.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    placeCinta(sub, text);
  });

const playBtn = document.createElement("button");
  playBtn.className = "primary-btn cinta-play";
  playBtn.id = "cintaPlayBtn";
  playBtn.textContent = "▶ Play";
  playBtn.disabled = true;
  playBtn.addEventListener("click", playCinta);
  container.appendChild(playBtn);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "cinta-msg";
    msg.textContent = "¡Ya ordenaste la película!";
    container.appendChild(msg);
  }

  activityWorkspace.appendChild(container);
}

function placeCinta(sub, text) {
  const chip = document.getElementById("cintaFrame-" + text);
  if (!chip || chip.classList.contains("placed")) return;
  const nextExpected = sub.answer[state.cintaOrder.length];
  if (text !== nextExpected) {
    chip.classList.add("shake");
    setTimeout(() => chip.classList.remove("shake"), 400);
    playTone("error");
    return;
  }
  chip.classList.add("placed");
  chip.draggable = false;
  document.getElementById("cintaFilm").appendChild(chip);
  state.cintaOrder.push(text);
  playTone("success");
  if (state.cintaOrder.length >= sub.answer.length) {
    const playBtn = document.getElementById("cintaPlayBtn");
    if (playBtn) playBtn.disabled = false;
  }
}

/* Play button handler — attached in render, but re-bound here for safety */
function playCinta() {
  const film = document.getElementById("cintaFilm");
  if (!film || state.cintaOrder.length === 0) return;
  const frames = film.querySelectorAll(".cinta-frame");
  if (state.cintaTimer) { clearInterval(state.cintaTimer); state.cintaTimer = null; }
  frames.forEach((f) => f.classList.remove("playing-cinta"));
  let i = 0;
  frames[0]?.classList.add("playing-cinta");
  state.cintaTimer = setInterval(() => {
    frames[i]?.classList.remove("playing-cinta");
    i++;
    if (i >= frames.length) {
      clearInterval(state.cintaTimer);
      state.cintaTimer = null;
      const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
      state.selectedAnswer = sub.answer;
      completeUnit3Activity(sub);
      return;
    }
    frames[i]?.classList.add("playing-cinta");
  }, 900);
}

/* ---------- 15. ANTES: before & after the central scene ---------- */
function renderAntesActivity(sub) {
  const container = document.createElement("div");
  container.className = "antes-container";

  const central = document.createElement("div");
  central.className = "antes-central";
  central.textContent = "🎬 " + sub.central;
  container.appendChild(central);

  state.antesBefore = null;
  state.antesAfter = null;

  const beforeBox = document.createElement("div");
  beforeBox.className = "antes-box";
  beforeBox.id = "antesBeforeBox";
  beforeBox.innerHTML = "<strong>Antes:</strong> <span class='antes-value' id='antesBeforeValue'>___</span>";
  container.appendChild(beforeBox);

  const afterBox = document.createElement("div");
  afterBox.className = "antes-box";
  afterBox.id = "antesAfterBox";
  afterBox.innerHTML = "<strong>Después:</strong> <span class='antes-value' id='antesAfterValue'>___</span>";
  container.appendChild(afterBox);

  const beforeRow = document.createElement("div");
  beforeRow.className = "antes-options";
  beforeRow.innerHTML = "<p class='antes-label'>¿Qué ocurrió ANTES?</p>";
  sub.beforeOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "antes-option";
    btn.dataset.slot = "before";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".antes-option[data-slot='before']").forEach((b) => b.classList.remove("selected-antes"));
      btn.classList.add("selected-antes");
      state.antesBefore = opt;
      document.getElementById("antesBeforeValue").textContent = opt;
      playTone("tap");
    });
    beforeRow.appendChild(btn);
  });
  container.appendChild(beforeRow);

  const afterRow = document.createElement("div");
  afterRow.className = "antes-options";
  afterRow.innerHTML = "<p class='antes-label'>¿Qué ocurrió DESPUÉS?</p>";
  sub.afterOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "antes-option";
    btn.dataset.slot = "after";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".antes-option[data-slot='after']").forEach((b) => b.classList.remove("selected-antes"));
      btn.classList.add("selected-antes");
      state.antesAfter = opt;
      document.getElementById("antesAfterValue").textContent = opt;
      playTone("tap");
    });
    afterRow.appendChild(btn);
  });
  container.appendChild(afterRow);

  activityWorkspace.appendChild(container);
}
