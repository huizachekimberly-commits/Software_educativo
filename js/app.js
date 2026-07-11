const state = {
  data: null,
  user: null,
  avatar: localStorage.getItem("reino.avatar") || "mago",
  completed: [],
  activeUnit: null,
  selectedAnswer: null,
  sequenceAnswer: [],
  sound: localStorage.getItem("reino.sound") !== "off",
  authMode: "login"
};

const $ = (selector) => document.querySelector(selector);
const unitGrid = $("#unitGrid");
const avatarGrid = $("#avatarGrid");
const bookList = $("#bookList");
const mapBoard = $("#mapBoard");
const rewardStrip = $("#rewardStrip");
const activityZone = $("#actividad");
const activityScene = $("#activityScene");
const activityUnit = $("#activityUnit");
const activityTitle = $("#activityTitle");
const activityPrompt = $("#activityPrompt");
const activityWorkspace = $("#activityWorkspace");
const feedback = $("#feedback");
const progressRing = $("#progressRing");
const progressPercent = $("#progressPercent");
const soundToggle = $("#soundToggle");
const heroAvatar = $("#heroAvatar");
const authScreen = $("#authScreen");
const appShell = $("#appShell");
const authNav = $("#authNav");
const loginForm = $("#loginForm");
const signupForm = $("#signupForm");
const authMessage = $("#authMessage");
const showLoginButton = $("#showLogin");
const showSignupButton = $("#showSignup");

let threeRuntimePromise = null;
let avatarViewer = null;

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem("reino.users") || "{}") || {};
  } catch {
    return {};
  }
}

function saveStoredUsers(users) {
  localStorage.setItem("reino.users", JSON.stringify(users));
}

function normalizeIdentifier(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function buildPassword(birthday, lastName) {
  return normalizeIdentifier(`${birthday}${lastName}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function persistCurrentUser() {
  if (!state.user) return;

  state.user.avatar = state.avatar;
  state.user.completed = [...state.completed];
  state.user.sound = state.sound ? "on" : "off";

  const users = getStoredUsers();
  users[state.user.username] = state.user;
  saveStoredUsers(users);
  localStorage.setItem("reino.sessionUser", state.user.username);
}

function showAuthScreen() {
  if (authScreen) authScreen.hidden = false;
  if (appShell) appShell.hidden = true;
  if (authNav) authNav.innerHTML = "";
}

function showAppScreen() {
  if (authScreen) authScreen.hidden = true;
  if (appShell) appShell.hidden = false;
  renderAuthNav();
}

function setAuthFeedback(message, kind = "info") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = `auth-feedback ${kind === "error" ? "error" : kind === "success" ? "success" : ""}`.trim();
}

function setAuthMode(mode) {
  state.authMode = mode;
  loginForm.hidden = mode !== "login";
  signupForm.hidden = mode !== "signup";
  showLoginButton.classList.toggle("active", mode === "login");
  showSignupButton.classList.toggle("active", mode === "signup");
}

function renderAuthNav() {
  if (!authNav) return;

  if (!state.user) {
    authNav.innerHTML = '<button class="auth-link" id="openAuth" type="button">Iniciar sesión</button>';
    const openAuthButton = $("#openAuth");
    openAuthButton?.addEventListener("click", () => {
      showAuthScreen();
      setAuthMode("login");
    });
    return;
  }

  authNav.innerHTML = `
    <span class="user-badge">Hola, ${escapeHtml(state.user.name)} ✨</span>
    <button class="auth-link" id="logoutBtn" type="button">Cerrar sesión</button>
  `;

  $("#logoutBtn")?.addEventListener("click", logoutUser);
}

function loginUser({ username, birthday, lastName }) {
  const users = getStoredUsers();
  const normalizedUsername = normalizeIdentifier(username);
  const user = users[normalizedUsername];
  const expectedPassword = buildPassword(birthday, lastName);

  if (!user || user.password !== expectedPassword) {
    setAuthFeedback("Ese nombre, fecha o apellido no coinciden. Intenta otra vez o crea una cuenta nueva.", "error");
    return;
  }

  state.user = user;
  state.avatar = user.avatar || state.avatar;
  state.completed = [...(user.completed || [])];
  state.sound = user.sound !== "off";
  persistCurrentUser();

  renderAvatars();
  renderUnits();
  renderProgress();
  updateHeroAvatar();
  syncSoundButton();
  showAppScreen();
  setAuthFeedback(`¡Qué alegría, ${user.name}! Tu progreso ya está listo.`, "success");
}

function signupUser({ username, birthday, lastName }) {
  const users = getStoredUsers();
  const normalizedUsername = normalizeIdentifier(username);

  if (!username || !birthday || !lastName) {
    setAuthFeedback("Completa los tres campos para crear una cuenta.", "error");
    return;
  }

  if (users[normalizedUsername]) {
    setAuthFeedback("Ese nombre ya existe. Elige otro o inicia sesión con el que ya registraste.", "error");
    return;
  }

  const password = buildPassword(birthday, lastName);
  const newUser = {
    username: normalizedUsername,
    name: username.trim(),
    lastName: lastName.trim(),
    birthday,
    password,
    avatar: "mago",
    completed: [],
    sound: "on"
  };

  users[normalizedUsername] = newUser;
  saveStoredUsers(users);

  state.user = newUser;
  state.avatar = newUser.avatar;
  state.completed = [];
  state.sound = true;
  persistCurrentUser();

  renderAvatars();
  renderUnits();
  renderProgress();
  updateHeroAvatar();
  syncSoundButton();
  showAppScreen();
  setAuthFeedback(`Cuenta creada para ${newUser.name}. ¡A aprender!`, "success");
}

function logoutUser() {
  state.user = null;
  state.completed = [];
  state.avatar = localStorage.getItem("reino.avatar") || "mago";
  state.sound = localStorage.getItem("reino.sound") !== "off";
  localStorage.removeItem("reino.sessionUser");
  showAuthScreen();
  setAuthMode("login");
  renderAuthNav();
  setAuthFeedback("Sesión cerrada. Vuelve cuando quieras continuar tu aventura.", "success");
}

function restoreSession() {
  const storedUser = localStorage.getItem("reino.sessionUser");
  if (!storedUser) {
    showAuthScreen();
    setAuthMode("login");
    setAuthFeedback("Inicia sesión para guardar tu progreso y volver más tarde.", "info");
    return;
  }

  const users = getStoredUsers();
  const stored = users[storedUser];
  if (!stored) {
    localStorage.removeItem("reino.sessionUser");
    showAuthScreen();
    setAuthMode("login");
    return;
  }

  state.user = stored;
  state.avatar = stored.avatar || state.avatar;
  state.completed = [...(stored.completed || [])];
  state.sound = stored.sound !== "off";
  showAppScreen();
  renderAvatars();
  renderUnits();
  renderProgress();
  updateHeroAvatar();
  syncSoundButton();
  setAuthFeedback(`¡Hola otra vez, ${stored.name}! Tu progreso quedó guardado.`, "success");
}

async function init() {
  const response = await fetch("data/units.json");
  state.data = await response.json();

  renderAvatars();
  renderUnits();
  renderLibrary();
  renderMap();
  renderProgress();
  bindGlobalEvents();
  bindAuthEvents();
  renderAuthNav();
  restoreSession();
}

function bindAuthEvents() {
  showLoginButton.addEventListener("click", () => setAuthMode("login"));
  showSignupButton.addEventListener("click", () => setAuthMode("signup"));

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = $("#loginName").value.trim();
    const birthday = $("#loginBirthday").value;
    const lastName = $("#loginLastName").value.trim();
    loginUser({ username, birthday, lastName });
  });

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = $("#signupName").value.trim();
    const birthday = $("#signupBirthday").value;
    const lastName = $("#signupLastName").value.trim();
    signupUser({ username, birthday, lastName });
  });
}

function bindGlobalEvents() {
  const audioIntro = $("#Audio_de_inicio");

  $("#narrateIntro").addEventListener("click", () => {
    if (audioIntro) {
      audioIntro.currentTime = 0;
      audioIntro.play().catch(() => {
        speak("Bienvenido al Reino de las Palabras. Elige tu avatar y visita las cuatro regiones para convertirte en lector experto.");
      });
    } else {
      speak("Bienvenido al Reino de las Palabras. Elige tu avatar y visita las cuatro regiones para convertirte en lector experto.");
    }
    playTone("success");
  });

  $("#closeActivity").addEventListener("click", closeActivity);
  $("#checkAnswer").addEventListener("click", checkAnswer);
  $("#listenPrompt").addEventListener("click", () => speak(state.activeUnit?.activity.speak || state.activeUnit?.activity.prompt));
  $("#pronunciationBtn").addEventListener("click", practicePronunciation);

  soundToggle.addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem("reino.sound", state.sound ? "on" : "off");
    syncSoundButton();
    persistCurrentUser();
  });

  syncSoundButton();
}

function syncSoundButton() {
  soundToggle.classList.toggle("muted", !state.sound);
  soundToggle.querySelector("span").textContent = state.sound ? "♪" : "×";
}

function renderAvatars() {
  avatarGrid.innerHTML = "";
  state.data.avatars.forEach((avatar) => {
    const button = document.createElement("button");
    button.className = "avatar-choice";
    button.type = "button";
    button.setAttribute("aria-pressed", String(avatar.id === state.avatar));
    button.innerHTML = `
      <span class="avatar-emoji">${avatar.emoji}</span>
      <span class="avatar-meta">
        <span class="avatar-name">${avatar.name}</span>
        <span class="avatar-type">${avatar.model ? "Modelo 3D FBX" : "Avatar visual"}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.avatar = avatar.id;
      localStorage.setItem("reino.avatar", avatar.id);
      persistCurrentUser();
      renderAvatars();
      updateHeroAvatar();
      playTone("tap");
    });
    avatarGrid.appendChild(button);
  });
}

function updateHeroAvatar() {
  const avatar = state.data.avatars.find((item) => item.id === state.avatar) || state.data.avatars[0];
  renderHeroAvatar(avatar);
}

async function renderHeroAvatar(avatar) {
  stopAvatarViewer();
  heroAvatar.innerHTML = "";
  heroAvatar.classList.toggle("has-3d", Boolean(avatar.model));

  if (!avatar.model) {
    renderAvatarFallback(avatar, "Sin modelo 3D asignado");
    return;
  }

  const canvas = document.createElement("canvas");
  const status = document.createElement("span");
  status.className = "avatar-loading";
  status.textContent = "Cargando 3D";
  heroAvatar.append(canvas, status);

  try {
    const { THREE, FBXLoader } = await loadThreeRuntime();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    camera.position.set(0, 0.7, 4.8);
    camera.lookAt(0, 0.05, 0);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 5, 4);
    const fillLight = new THREE.HemisphereLight(0xffffff, 0x8dc7b3, 1.6);
    scene.add(keyLight, fillLight);

    const loader = new FBXLoader();
    const model = await loader.loadAsync(avatar.model);
    const texture = avatar.texture ? await loadAvatarTexture(THREE, avatar.texture) : null;
    prepareModel(THREE, model, texture);
    scene.add(model);

    const resize = () => {
      const size = Math.max(heroAvatar.clientWidth, 180);
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      model.rotation.y += 0.008;
      renderer.render(scene, camera);
    };

    status.remove();
    resize();
    window.addEventListener("resize", resize);
    animate();

    avatarViewer = { renderer, scene, model, frame, resize };
  } catch (error) {
    renderAvatarFallback(avatar, "No se pudo cargar el modelo 3D");
  }
}

function loadThreeRuntime() {
  if (!threeRuntimePromise) {
    threeRuntimePromise = Promise.all([
      import("https://esm.sh/three@0.160.0"),
      import("https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js?deps=three@0.160.0")
    ]).then(([THREE, loaderModule]) => ({
      THREE,
      FBXLoader: loaderModule.FBXLoader
    }));
  }

  return threeRuntimePromise;
}

function loadAvatarTexture(THREE, texturePath) {
  const loader = new THREE.TextureLoader();

  return new Promise((resolve) => {
    loader.load(
      texturePath,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function prepareModel(THREE, model, texture) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.15 / maxAxis;

  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 0.15;

  applyStandingPose(model);

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = new THREE.MeshStandardMaterial({
        map: texture,
        color: texture ? 0xffffff : 0xf1c47b,
        roughness: 0.72,
        metalness: 0.02
      });
      child.material.needsUpdate = true;
    }
  });
}

function applyStandingPose(model) {
  const bones = {};
  model.traverse((child) => {
    if (child.isBone) bones[child.name] = child;
  });

  setBoneRotation(bones["shoulder.L"], 0, 0, -0.15);
  setBoneRotation(bones["shoulder.R"], 0, 0, 0.15);
  setBoneRotation(bones["upper_arm.L"], 0.08, 0.05, -1.18);
  setBoneRotation(bones["upper_arm.R"], 0.08, -0.05, 1.18);
  setBoneRotation(bones["forearm.L"], 0, 0.05, -0.22);
  setBoneRotation(bones["forearm.R"], 0, -0.05, 0.22);
  setBoneRotation(bones["hand.L"], 0, 0, -0.08);
  setBoneRotation(bones["hand.R"], 0, 0, 0.08);

  model.updateMatrixWorld(true);
}

function setBoneRotation(bone, x = 0, y = 0, z = 0) {
  if (!bone) return;

  bone.rotation.x += x;
  bone.rotation.y += y;
  bone.rotation.z += z;
}

function renderAvatarFallback(avatar, message) {
  stopAvatarViewer();
  heroAvatar.classList.remove("has-3d");
  heroAvatar.innerHTML = `
    <span class="avatar-fallback-symbol">${avatar.emoji}</span>
    <span class="avatar-loading">${message}</span>
  `;
}

function stopAvatarViewer() {
  if (!avatarViewer) return;

  cancelAnimationFrame(avatarViewer.frame);
  window.removeEventListener("resize", avatarViewer.resize);
  avatarViewer.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
  avatarViewer.renderer.dispose();
  avatarViewer = null;
}

function renderUnits() {
  unitGrid.innerHTML = "";
  const template = $("#unitTemplate");

  state.data.units.forEach((unit) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle("completed", state.completed.includes(unit.id));
    card.querySelector(".unit-art").classList.add(unit.theme);
    card.querySelector(".unit-art").dataset.icon = unit.icon;
    card.querySelector(".unit-kicker").textContent = `Unidad ${unit.number}`;
    card.querySelector("h3").textContent = unit.title;
    card.querySelector(".unit-description").textContent = unit.description;
    card.querySelector(".mini-list").innerHTML = unit.activities
      .slice(0, 3)
      .map((activity) => `<span><strong>•</strong>${activity}</span>`)
      .join("");
    card.querySelector(".unit-start").addEventListener("click", () => openActivity(unit.id));
    unitGrid.appendChild(card);
  });
}

function renderLibrary() {
  bookList.innerHTML = state.data.library
    .map((book) => `
      <article class="book">
        <div class="book-icon">${book.icon}</div>
        <div>
          <h3>${book.title}</h3>
          <p>${book.level}: ${book.summary}</p>
        </div>
      </article>
    `)
    .join("");
}

function renderMap() {
  const positions = [
    { left: "10%", top: "18%" },
    { left: "30%", top: "58%" },
    { left: "58%", top: "24%" },
    { left: "72%", top: "66%" }
  ];

  mapBoard.innerHTML = "";
  state.data.units.forEach((unit, index) => {
    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "map-stop";
    stop.style.left = positions[index].left;
    stop.style.top = positions[index].top;
    stop.innerHTML = `${unit.icon} Unidad ${unit.number}<small>${unit.title}</small>`;
    stop.addEventListener("click", () => openActivity(unit.id));
    mapBoard.appendChild(stop);
  });
}

function renderProgress() {
  const total = state.data.units.length;
  const done = state.completed.length;
  const percent = Math.round((done / total) * 100);
  progressPercent.textContent = `${percent}%`;
  progressRing.style.setProperty("--value", `${percent * 3.6}deg`);

  const rewards = state.data.units.filter((unit) => state.completed.includes(unit.id));
  rewardStrip.innerHTML = rewards.length
    ? rewards.map((unit) => `<span class="badge">${unit.icon} ${unit.reward}</span>`).join("")
    : `<span class="badge">Comienza una unidad para ganar recompensas</span>`;
}

function openActivity(unitId) {
  const unit = state.data.units.find((item) => item.id === unitId);
  state.activeUnit = unit;
  state.selectedAnswer = null;
  state.sequenceAnswer = [];

  activityScene.className = `activity-scene ${unit.theme}`;
  activityScene.textContent = unit.icon;
  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  activityTitle.textContent = unit.activity.title;
  activityPrompt.textContent = unit.activity.prompt;
  feedback.className = "feedback";
  feedback.textContent = buildFeedbackSummary(unit);
  activityWorkspace.innerHTML = "";

  if (unit.activity.type === "choice") renderChoiceActivity(unit.activity);
  if (unit.activity.type === "input") renderInputActivity(unit.activity);
  if (unit.activity.type === "sequence") renderSequenceActivity(unit.activity);

  activityZone.hidden = false;
  playTone("open");
}

function buildFeedbackSummary(unit) {
  return `Contenido: ${unit.content.join(" ")} Evaluacion: ${unit.evaluation.join(" ")} Retroalimentacion: ${unit.feedback.join(" ")}`;
}

function renderChoiceActivity(activity) {
  const question = document.createElement("strong");
  question.textContent = activity.question;
  const row = document.createElement("div");
  row.className = "choice-row";

  activity.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-choice";
    button.textContent = option;
    button.addEventListener("click", () => {
      state.selectedAnswer = option;
      document.querySelectorAll(".answer-choice").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      playTone("tap");
    });
    row.appendChild(button);
  });

  activityWorkspace.append(question, row);
}

function renderInputActivity(activity) {
  const label = document.createElement("label");
  label.textContent = activity.question;
  label.setAttribute("for", "textAnswer");
  const input = document.createElement("input");
  input.className = "text-input";
  input.id = "textAnswer";
  input.type = "text";
  input.placeholder = "Escribe tu respuesta";
  input.autocomplete = "off";
  activityWorkspace.append(label, input);
}

function renderSequenceActivity(activity) {
  const shuffled = [...activity.items].sort(() => Math.random() - 0.5);
  shuffled.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sequence-item";
    button.textContent = item;
    button.addEventListener("click", () => {
      if (button.classList.contains("selected")) return;
      state.sequenceAnswer.push(item);
      button.classList.add("selected");
      button.textContent = `${state.sequenceAnswer.length}. ${item}`;
      playTone("tap");
    });
    activityWorkspace.appendChild(button);
  });
}

function checkAnswer() {
  if (!state.activeUnit) return;
  const activity = state.activeUnit.activity;
  let isCorrect = false;

  if (activity.type === "choice") {
    isCorrect = state.selectedAnswer === activity.answer;
  }

  if (activity.type === "input") {
    const value = ($("#textAnswer").value || "").trim().toLowerCase();
    isCorrect = normalize(value) === normalize(activity.answer);
  }

  if (activity.type === "sequence") {
    isCorrect = activity.answer.every((item, index) => state.sequenceAnswer[index] === item);
  }

  if (isCorrect) {
    feedback.className = "feedback ok";
    feedback.textContent = `${activity.success} Recompensa desbloqueada: ${state.activeUnit.reward}.`;
    markCompleted(state.activeUnit.id);
    speak(activity.success);
    playTone("success");
  } else {
    feedback.className = "feedback try";
    feedback.textContent = activity.hint;
    playTone("error");
  }
}

function markCompleted(unitId) {
  if (!state.completed.includes(unitId)) {
    state.completed.push(unitId);
    persistCurrentUser();
    renderProgress();
    renderUnits();
  }
}

function closeActivity() {
  activityZone.hidden = true;
  state.activeUnit = null;
}

function practicePronunciation() {
  if (!state.activeUnit) return;
  const activity = state.activeUnit.activity;
  const target = activity.answer || activity.question;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    feedback.className = "feedback try";
    feedback.textContent = `Tu navegador no permite reconocimiento de voz aqui. Practica diciendo: "${target}". Observa cada silaba y repitela despacio.`;
    speak(`Practica diciendo ${target}`);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "es-MX";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  feedback.className = "feedback";
  feedback.textContent = "Te escucho. Di la palabra u opcion correcta en voz clara.";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    const ok = normalize(transcript).includes(normalize(String(target)));
    feedback.className = ok ? "feedback ok" : "feedback try";
    feedback.textContent = ok
      ? `Excelente pronunciacion. Escuche: "${transcript}".`
      : `Escuche: "${transcript}". Intenta separar los sonidos y repetir: "${target}".`;
    playTone(ok ? "success" : "error");
  };

  recognition.onerror = () => {
    feedback.className = "feedback try";
    feedback.textContent = "No pude escuchar con claridad. Revisa el permiso del microfono e intentalo otra vez.";
  };

  recognition.start();
}

function speak(text) {
  if (!state.sound || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.92;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
}

function playTone(kind) {
  if (!state.sound) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const tones = {
    tap: [520, 0.05],
    open: [360, 0.08],
    success: [720, 0.13],
    error: [180, 0.12]
  };
  const [frequency, duration] = tones[kind] || tones.tap;

  oscillator.frequency.value = frequency;
  oscillator.type = kind === "error" ? "sawtooth" : "sine";
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

init().catch((error) => {
  document.body.innerHTML = `
    <main class="section-shell">
      <h1>No se pudo cargar la app</h1>
      <p>Abre este proyecto con Live Server para permitir la lectura del archivo JSON.</p>
      <pre>${error.message}</pre>
    </main>
  `;
});
