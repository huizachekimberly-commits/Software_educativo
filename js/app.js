import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const state = {
  data: null,
  user: null,
  avatar: localStorage.getItem("reino.avatar") || "mago",
  completed: [],
  activeUnit: null,
  activeSubActivityIndex: null,
  selectedAnswer: null,
  sequenceAnswer: [],
  escudoTimer: null,
  escudoExpired: false,
  escudoStarted: false,
  audioLock: false,
  currentAudio: null,
  confettiLock: false,
  checkingLock: false,
  sound: localStorage.getItem("reino.sound") !== "off",
  music: localStorage.getItem("reino.music") !== "off",
  authMode: "login",
  inCastleMap: false,
  cofreDropped: null,
  redoble: null,
  frasePlaced: null,
  replaySubActivity: null
};

const $ = (selector) => document.querySelector(selector);
const unitGrid = $("#unitGrid");
const avatarGrid = $("#avatarGrid");
const bookList = $("#bookList");
const mapBoard = $("#mapBoard");
const badgeBoard = $("#badgeBoard");
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

const SELECTABLE_AVATAR_IDS = new Set(["mago", "princesa", "caballero"]);
const AVATAR_AUDIO_BY_ID = {
  mago: ["assets/avatars/rey.mp3"],
  caballero: ["assets/avatars/principe.mp3"],
  princesa: ["assets/avatars/reina.mp3", "assets/avatars/reino.mp3"]
};

let threeRuntimePromise = null;
let avatarViewer = null;
let activityAvatarViewer = null;
let activityAvatarRenderToken = 0;
let firebaseRuntimePromise = null;
let backgroundMusic = null;

async function getFirebaseRuntime() {
  if (!firebaseEnabled) return null;
  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]).then(([appModule, firestoreModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const db = firestoreModule.getFirestore(app);
      return { db, doc: firestoreModule.doc, getDoc: firestoreModule.getDoc, setDoc: firestoreModule.setDoc, serverTimestamp: firestoreModule.serverTimestamp };
    }).catch((error) => {
      console.warn("Firebase no pudo iniciar. Se usara localStorage.", error);
      return null;
    });
  }
  return firebaseRuntimePromise;
}

async function hashValue(value) {
  const input = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getCloudUser(accountId) {
  const runtime = await getFirebaseRuntime();
  if (!runtime) return null;
  const userDoc = await runtime.getDoc(runtime.doc(runtime.db, "usuarios", accountId));
  return userDoc.exists() ? userDoc.data() : null;
}

async function saveCloudUser(user) {
  const runtime = await getFirebaseRuntime();
  if (!runtime) return false;
  const cloudUser = { ...user, updatedAt: runtime.serverTimestamp() };
  delete cloudUser.password;
  const accountId = user.accountId || user.username;
  await runtime.setDoc(runtime.doc(runtime.db, "usuarios", accountId), cloudUser, { merge: true });
  return true;
}

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem("reino.users") || "{}") || {}; } catch { return {}; }
}

function saveStoredUsers(users) {
  localStorage.setItem("reino.users", JSON.stringify(users));
}

function normalizeIdentifier(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[^a-z0-9]+/g, "");
}

function buildPassword(birthday, lastName) {
  return normalizeIdentifier(`${birthday}${lastName}`);
}

function buildAccountId(username, birthday, lastName) {
  const nameKey = normalizeIdentifier(username);
  const lastNameKey = normalizeIdentifier(lastName);
  const birthdayKey = normalizeIdentifier(birthday);
  return [nameKey, lastNameKey, birthdayKey].filter(Boolean).join("__");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function persistCurrentUser() {
  if (!state.user) return;
  state.user.avatar = state.avatar;
  state.user.completed = [...state.completed];
  state.user.sound = "on";
  state.user.music = state.music ? "on" : "off";
  state.user.unit1VideoSeen = hasSeenUnit1Video();
  cacheUserLocally(state.user);
  await saveCloudUser(state.user);
}

function cacheUserLocally(user) {
  const users = getStoredUsers();
  const accountId = user.accountId || user.username;
  users[accountId] = user;
  saveStoredUsers(users);
  localStorage.setItem("reino.sessionUser", accountId);
}

function applyUserSession(user) {
  state.user = user;
  state.avatar = user.avatar || "mago";
  normalizeSelectedAvatar();
  state.completed = [...(user.completed || [])];
  state.sound = true;
  state.music = user.music !== "off";
  cacheUserLocally(user);
  renderAvatars();
  renderUnits();
  renderProgress();
  updateHeroAvatar();
  syncSoundButton();
  showAppScreen();
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

function setAuthFeedback(message, kind) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = "auth-feedback" + (kind === "error" ? " error" : kind === "success" ? " success" : "");
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
    authNav.innerHTML = '<button class="auth-link" id="openAuth" type="button">Iniciar sesion</button>';
    $("#openAuth")?.addEventListener("click", () => { showAuthScreen(); setAuthMode("login"); });
    return;
  }
  authNav.innerHTML = `<span class="user-badge">Hola, ${escapeHtml(state.user.name)}</span><button class="auth-link" id="logoutBtn" type="button">Cerrar sesion</button>`;
  $("#logoutBtn")?.addEventListener("click", logoutUser);
}

async function loginUser({ username, birthday, lastName }) {
  const normalizedUsername = normalizeIdentifier(username);
  const normalizedLastName = normalizeIdentifier(lastName);
  const accountId = buildAccountId(username, birthday, lastName);
  const expectedPassword = buildPassword(birthday, lastName);
  const expectedHash = await hashValue(expectedPassword);

  if (!username || !birthday || !lastName) {
    setAuthFeedback("Completa los tres campos para iniciar sesion.", "error");
    return;
  }

  setAuthFeedback("Buscando tu cuenta...", "info");

  let user = null;
  try {
    user = await getCloudUser(accountId);
    if (!user) {
      user = await getCloudUser(normalizedUsername);
    }
  } catch (error) {
    console.warn("No se pudo buscar en Firebase:", error);
  }

  if (!user) {
    const users = getStoredUsers();
    user = users[accountId] || users[normalizedUsername] || null;
  }

  const storedPasswordOk = user?.password === expectedPassword;
  const storedHashOk = user?.passwordHash === expectedHash;

  if (!user || (!storedPasswordOk && !storedHashOk)) {
    setAuthFeedback("Ese nombre, fecha o apellido no coinciden. Intenta otra vez o crea una cuenta nueva.", "error");
    return;
  }

  const normalizedUser = {
    ...user,
    accountId,
    username: normalizedUsername,
    lastNameKey: normalizedLastName,
    name: user.name || username.trim(),
    lastName: user.lastName || lastName.trim(),
    birthday: user.birthday || birthday,
    password: expectedPassword,
    passwordHash: user.passwordHash || expectedHash,
    avatar: user.avatar || "mago",
    completed: [...(user.completed || [])],
    sound: user.sound || "on"
  };

  applyUserSession(normalizedUser);
  await persistCurrentUser();
  setAuthFeedback(`Que alegria, ${normalizedUser.name}. Tu progreso ya esta listo.`, "success");
}

async function signupUser({ username, birthday, lastName }) {
  const normalizedUsername = normalizeIdentifier(username);
  const normalizedLastName = normalizeIdentifier(lastName);
  const accountId = buildAccountId(username, birthday, lastName);

  if (!username || !birthday || !lastName) {
    setAuthFeedback("Completa los tres campos para crear una cuenta.", "error");
    return;
  }

  setAuthFeedback("Creando tu cuenta...", "info");

  const users = getStoredUsers();
  const password = buildPassword(birthday, lastName);
  const passwordHash = await hashValue(password);
  const localExactUser = users[accountId] || null;
  const localLegacyUser = users[normalizedUsername] || null;
  const legacyPasswordOk = localLegacyUser?.password === password || localLegacyUser?.passwordHash === passwordHash;
  const localExistingUser = localExactUser || (legacyPasswordOk ? localLegacyUser : null);

  try {
    const existingCloudUser = await getCloudUser(accountId);
    if (existingCloudUser) {
      setAuthFeedback("Ya existe una cuenta con ese nombre, apellido y cumpleanos. Intenta iniciar sesion.", "error");
      return;
    }
  } catch (error) {
    console.warn("No se pudo verificar Firebase antes del registro:", error);
  }

  const newUser = {
    ...localExistingUser,
    accountId,
    username: normalizedUsername,
    lastNameKey: normalizedLastName,
    name: username.trim(),
    lastName: lastName.trim(),
    birthday,
    password,
    passwordHash,
    avatar: localExistingUser?.avatar || "mago",
    completed: [...(localExistingUser?.completed || [])],
    sound: localExistingUser?.sound || "on"
  };

  try {
    const savedInCloud = await saveCloudUser(newUser);
    if (!savedInCloud && firebaseEnabled) {
      setAuthFeedback("No se pudo guardar en Firebase. Revisa la conexion o las reglas de Firestore.", "error");
      return;
    }
  } catch (error) {
    console.error("Error guardando usuario en Firebase:", error);
    setAuthFeedback(`Firebase rechazo el registro: ${error.message}`, "error");
    return;
  }

  applyUserSession(newUser);
  setAuthFeedback(`Cuenta creada para ${newUser.name}. A aprender.`, "success");
}

function logoutUser() {
  state.user = null;
  state.completed = [];
  state.avatar = localStorage.getItem("reino.avatar") || "mago";
  state.sound = true;
  localStorage.removeItem("reino.sessionUser");
  showAuthScreen();
  setAuthMode("login");
  renderAuthNav();
  setAuthFeedback("Sesion cerrada. Vuelve cuando quieras continuar tu aventura.", "success");
}

async function restoreSession() {
  const storedUser = localStorage.getItem("reino.sessionUser");
  if (!storedUser) {
    showAuthScreen();
    setAuthMode("login");
    setAuthFeedback("Inicia sesion para guardar tu progreso y volver mas tarde.", "info");
    return;
  }

  const users = getStoredUsers();
  let stored = users[storedUser];

  try {
    const cloudUser = await getCloudUser(storedUser);
    if (cloudUser) {
      stored = {
        ...stored,
        ...cloudUser,
        password: stored?.password || buildPassword(cloudUser.birthday || "", cloudUser.lastName || "")
      };
      cacheUserLocally(stored);
    }
  } catch (error) {
    console.warn("No se pudo restaurar desde Firebase:", error);
  }

  if (!stored) {
    localStorage.removeItem("reino.sessionUser");
    showAuthScreen();
    setAuthMode("login");
    return;
  }

  applyUserSession(stored);
  setAuthFeedback(`Hola otra vez, ${stored.name}. Tu progreso quedo guardado.`, "success");
}
/* =============================================
   BACKGROUND MUSIC
   ============================================= */
function initBackgroundMusic() {
  if (backgroundMusic) return; // Already initialized

  backgroundMusic = new Audio("assets/music.mpeg");
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.13; // 13% volume 

  // Start playing if sound and music are enabled
  if (state.music) {
    backgroundMusic.play().catch(() => {
      // Autoplay may be blocked by browser, user interaction will start it
    });
  }

  // Resume music when user interacts with the page (for autoplay policy)
  const resumeMusic = () => {
    if (state.music && backgroundMusic.paused) {
      backgroundMusic.play().catch(() => {});
    }
    document.removeEventListener("click", resumeMusic);
    document.removeEventListener("touchstart", resumeMusic);
  };
  document.addEventListener("click", resumeMusic);
  document.addEventListener("touchstart", resumeMusic);
}

async function init() {
  try {
    const response = await fetch("data/units.json");
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    state.data = await response.json();
    normalizeSelectedAvatar();
  } catch (error) {
    console.error("Error loading units.json:", error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial; color: #333;">
        <h1>❌ No se pudo cargar la app</h1>
        <p>Abre este proyecto con <strong>Live Server</strong> para permitir la lectura del archivo JSON.</p>
        <p style="color: #666; margin-top: 20px;">Error: ${error.message}</p>
        <p style="color: #999; margin-top: 10px; font-size: 12px;">Si usas VS Code, instala la extensión "Live Server" y haz clic derecho en el archivo index.html → "Open with Live Server"</p>
      </div>
    `;
    return;
  }

  renderAvatars();
renderUnits();
  renderLibrary();
  renderMap();
  renderProgress();
  bindMapTabs();
  bindGlobalEvents();
  bindAuthEvents();
  renderAuthNav();
  initBackgroundMusic();
  await restoreSession();
}

function bindAuthEvents() {
  showLoginButton.addEventListener("click", () => setAuthMode("login"));
  showSignupButton.addEventListener("click", () => setAuthMode("signup"));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("#loginName").value.trim();
    const birthday = $("#loginBirthday").value;
    const lastName = $("#loginLastName").value.trim();
    await loginUser({ username, birthday, lastName });
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("#signupName").value.trim();
    const birthday = $("#signupBirthday").value;
    const lastName = $("#signupLastName").value.trim();
    await signupUser({ username, birthday, lastName });
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
  $("#listenPrompt").addEventListener("click", () => {
    if (state.replaySubActivity) {
      const { unitId, index } = state.replaySubActivity;
      openSubActivity(unitId, index, { forceReplay: true });
      return;
    }

    // Handle sub-activities
    if (state.activeSubActivityIndex !== null && state.activeUnit?.subActivities) {
      const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
      if (sub) {
        // Use MP3 files from assets/unit_{N}_sounds/ for any unit with subActivities
        // This plays activity_{N}.mp3 (the instruction audio) for all sub-activity types
        playUnitSound(state.activeUnit.id, state.activeSubActivityIndex);
        return;
      }
    }
    speak(state.activeUnit?.activity.speak || state.activeUnit?.activity.prompt);
  });
  $("#pronunciationBtn").addEventListener("click", practicePronunciation);

  soundToggle.addEventListener("click", () => {
    state.music = !state.music;
    localStorage.setItem("reino.music", state.music ? "on" : "off");
    if (!state.music) {
      // Pause background music
      if (backgroundMusic) backgroundMusic.pause();
    } else {
      // Resume background music
      if (backgroundMusic) backgroundMusic.play().catch(() => {});
    }
    syncSoundButton();
    persistCurrentUser();
  });

  syncSoundButton();
}

function syncSoundButton() {
  soundToggle.classList.toggle("muted", !state.music);
  soundToggle.querySelector("span").textContent = state.music ? "♪" : "×";
  soundToggle.title = state.music ? "Desactivar música" : "Activar música";
  // Only control background music — sounds, instructions, feedback, effects always play
  if (backgroundMusic) {
    if (state.music) {
      backgroundMusic.play().catch(() => {});
    } else {
      backgroundMusic.pause();
    }
  }
}

function getSelectableAvatars() {
  if (!state.data?.avatars) return [];
  const filtered = state.data.avatars.filter((avatar) => SELECTABLE_AVATAR_IDS.has(avatar.id));
  return filtered.length ? filtered : state.data.avatars;
}

function getAvatarById(id) {
  const selectable = getSelectableAvatars();
  return selectable.find((avatar) => avatar.id === id) || selectable[0] || null;
}

function normalizeSelectedAvatar() {
  const selected = getAvatarById(state.avatar);
  if (!selected) return;
  if (state.avatar !== selected.id) {
    state.avatar = selected.id;
    localStorage.setItem("reino.avatar", selected.id);
  }
}

function playAvatarVoice(avatarId) {
  const candidates = AVATAR_AUDIO_BY_ID[avatarId] || [];
  if (!candidates.length) return;

  const playCandidate = (index) => {
    if (index >= candidates.length) return;
    const audio = new Audio(candidates[index]);
    audio.preload = "auto";
    let fallbackQueued = false;
    audio.addEventListener("error", () => {
      if (fallbackQueued) return;
      fallbackQueued = true;
      setTimeout(() => playCandidate(index + 1), 0);
    }, { once: true });
    safePlayAudio(audio);
  };

  playCandidate(0);
}

function updateActivityAvatarBadge() {
  const activityCard = activityZone?.querySelector(".activity-card");
  if (!activityCard) return;

  let badge = document.getElementById("activityAvatarBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "activityAvatarBadge";
    badge.className = "activity-avatar-badge";
    activityCard.appendChild(badge);
  }

  const avatar = getAvatarById(state.avatar);
  if (!avatar) {
    badge.hidden = true;
    stopActivityAvatarViewer();
    return;
  }

  badge.hidden = false;
  badge.innerHTML = `
    <div class="activity-avatar-model" data-role="activity-avatar-model"></div>
  `;

  const modelHost = badge.querySelector('[data-role="activity-avatar-model"]');
  renderActivityAvatarModel(avatar, modelHost);
}

async function renderActivityAvatarModel(avatar, host) {
  if (!host) return;

  const renderToken = ++activityAvatarRenderToken;
  stopActivityAvatarViewer();

  const showFallback = () => {
    host.innerHTML = `<span class="activity-avatar-fallback">${escapeHtml(avatar.emoji || "A")}</span>`;
  };

  if (!avatar.model) {
    showFallback();
    return;
  }

  const canvas = document.createElement("canvas");
  host.innerHTML = "";
  host.appendChild(canvas);

  try {
    const { THREE, FBXLoader } = await loadThreeRuntime();
    if (renderToken !== activityAvatarRenderToken || !host.isConnected) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
    camera.position.set(0, 0.6, 5.2);
    camera.lookAt(0, 0.05, 0);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    const fillLight = new THREE.HemisphereLight(0xffffff, 0x8dc7b3, 1.45);
    scene.add(keyLight, fillLight);

    const loader = new FBXLoader();
    const model = await loader.loadAsync(avatar.model);
    const texture = avatar.texture ? await loadAvatarTexture(THREE, avatar.texture) : null;
    if (renderToken !== activityAvatarRenderToken || !host.isConnected) {
      renderer.dispose();
      return;
    }

    prepareModel(THREE, model, texture);
    scene.add(model);

    const resize = () => {
      const size = Math.max(host.clientWidth || 34, 34);
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("resize", resize);
    animate();

    activityAvatarViewer = { renderer, scene, frame, resize };
  } catch (error) {
    if (renderToken === activityAvatarRenderToken) {
      showFallback();
    }
  }
}

function stopActivityAvatarViewer() {
  if (!activityAvatarViewer) return;

  cancelAnimationFrame(activityAvatarViewer.frame);
  window.removeEventListener("resize", activityAvatarViewer.resize);
  activityAvatarViewer.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
  activityAvatarViewer.renderer.dispose();
  activityAvatarViewer = null;
}

function renderAvatars() {
  avatarGrid.innerHTML = "";
  const selectableAvatars = getSelectableAvatars();
  selectableAvatars.forEach((avatar) => {
    const button = document.createElement("button");
    button.className = "avatar-choice";
    button.type = "button";
    button.setAttribute("aria-pressed", String(avatar.id === state.avatar));
    button.innerHTML = `
      <span class="avatar-emoji">${avatar.emoji}</span>
      <span class="avatar-meta">
        <span class="avatar-name">${avatar.name}</span>
        <span class="avatar-type">Toca para escuchar su voz</span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.avatar = avatar.id;
      localStorage.setItem("reino.avatar", avatar.id);
      persistCurrentUser();
      renderAvatars();
      updateHeroAvatar();
      updateActivityAvatarBadge();
      playAvatarVoice(avatar.id);
      playTone("tap");
    });
    avatarGrid.appendChild(button);
  });
}

function updateHeroAvatar() {
  const avatar = getAvatarById(state.avatar);
  if (!avatar) return;
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

  // Neutral standing pose with relaxed arms.
  setBoneRotation(bones["shoulder.L"], 0, 0, -0.05);
  setBoneRotation(bones["shoulder.R"], 0, 0, 0.05);
  setBoneRotation(bones["upper_arm.L"], 0.03, 0.02, -0.35);
  setBoneRotation(bones["upper_arm.R"], 0.03, -0.02, 0.35);
  setBoneRotation(bones["forearm.L"], 0, 0.02, -0.06);
  setBoneRotation(bones["forearm.R"], 0, -0.02, 0.06);
  setBoneRotation(bones["hand.L"], 0, 0, -0.02);
  setBoneRotation(bones["hand.R"], 0, 0, 0.02);

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

/* =============================================
   SUB-ACTIVITY HELPERS for castle map units
   ============================================= */
function getSubKey(unitId, index) {
  return `${unitId}-${index}`;
}

function isSubActivityCompleted(unitId, index) {
  return state.completed.includes(getSubKey(unitId, index));
}

function isActivityUnlocked(unitId, index) {
  if (index === 0) return true;
  return isSubActivityCompleted(unitId, index - 1);
}

function allSubActivitiesCompleted(unit) {
  if (!unit.subActivities) return false;
  return unit.subActivities.every((_, i) => isSubActivityCompleted(unit.id, i));
}

function isUnitLocked(unit) {
  if (!unit.requires) return false;
  const requiredUnit = state.data?.units?.find((u) => u.id === unit.requires);
  if (!requiredUnit) return false;
  if (requiredUnit.subActivities && requiredUnit.subActivities.length > 0) {
    return !allSubActivitiesCompleted(requiredUnit);
  }
  return !state.completed.includes(requiredUnit.id);
}

function completeSubActivity(unitId, index) {
  const key = getSubKey(unitId, index);
  if (!state.completed.includes(key)) {
    state.completed.push(key);
    persistCurrentUser();
    renderProgress();
    renderUnits();
  }
}

function countCompletedSubs(unitId, count) {
  let done = 0;
  for (let i = 0; i < count; i++) {
    if (isSubActivityCompleted(unitId, i)) done++;
  }
  return done;
}

function renderUnits() {
  unitGrid.innerHTML = "";
  const template = $("#unitTemplate");

  state.data.units.forEach((unit) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const isUnitCompleted = unit.subActivities
      ? allSubActivitiesCompleted(unit)
      : state.completed.includes(unit.id);
const isLocked = isUnitLocked(unit);
    card.classList.toggle("completed", isUnitCompleted);
    card.classList.toggle("locked", isLocked);
    if (isLocked) {
      const legend = document.createElement("div");
      legend.className = "unit-locked-legend";
      legend.textContent = "Bloqueada";
      card.appendChild(legend);
    }
    card.querySelector(".unit-art").classList.add(unit.theme);
    card.querySelector(".unit-art").dataset.icon = unit.icon;
    card.querySelector(".unit-kicker").textContent = `Unidad ${unit.number}`;
    card.querySelector("h3").textContent = unit.title;
    card.querySelector(".unit-description").textContent = unit.description;
    card.querySelector(".mini-list").innerHTML = unit.activities
      .slice(0, 3)
      .map((activity) => `<span><strong>\u2022</strong>${activity}</span>`)
      .join("");
    const startButton = card.querySelector(".unit-start");
    startButton.addEventListener("click", () => openActivity(unit.id));
    if (isLocked) {
      const requiredUnit = state.data.units.find((u) => u.id === unit.requires);
      const requiredName = requiredUnit ? `${requiredUnit.title}` : "la unidad anterior";
      startButton.textContent = "Completa " + requiredName;
      startButton.classList.add("locked-btn");
    }
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
    { left: "12%", top: "22%" },
    { left: "42%", top: "60%" },
    { left: "72%", top: "26%" }
  ];

  mapBoard.innerHTML = "";
  state.data.units.forEach((unit, index) => {
    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "map-stop";
    const locked = isUnitLocked(unit);
    if (locked) stop.classList.add("map-stop-locked");
    stop.style.left = positions[index].left;
    stop.style.top = positions[index].top;
    stop.innerHTML = `${locked ? "🔒" : unit.icon} Unidad ${unit.number}<small>${unit.title}</small>`;
    stop.addEventListener("click", () => openActivity(unit.id));
    mapBoard.appendChild(stop);
  });
}

// Map reward names to their icon image paths
function getBadgeIcon(rewardName) {
  const iconMap = {
    "Insignia de la Letra Brillante": "assets/images/icons/insignia_de_la_letra_brillante_icon.png",
    "Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png",
    "Corona del Narrador": "assets/images/icons/unit3_icon.png"
  };
  const path = iconMap[rewardName];
  if (path) {
    return `<img src="${path}" alt="" class="badge-icon" />`;
  }
  // Fallback to unit emoji for rewards without a custom icon
  const unit = state.data.units.find((u) => u.reward === rewardName);
  return unit?.icon || "🏆";
}

function isUnitRewardEarned(unit) {
  if (unit.subActivities && unit.subActivities.length > 0) {
    return allSubActivitiesCompleted(unit);
  }
  return state.completed.includes(unit.id);
}

function renderBadges() {
  if (!badgeBoard) return;
  // Show the first three badges (rewards of the first three units)
  const badgeUnits = state.data.units.slice(0, 3);
  badgeBoard.innerHTML = badgeUnits.map((unit) => {
    const earned = isUnitRewardEarned(unit);
    return `
      <article class="badge-card ${earned ? "earned" : "locked"}">
        <div class="badge-card-icon">${getBadgeIcon(unit.reward)}</div>
        <h3 class="badge-card-name">${escapeHtml(unit.reward)}</h3>
        <p class="badge-card-status">${earned ? "¡Obtenida!" : "🔒 Bloqueada"}</p>
      </article>
    `;
  }).join("");
}

function bindMapTabs() {
  const btnViaje = $("#btnViajeLector");
  const btnInsignias = $("#btnInsignias");
  if (!btnViaje || !btnInsignias || !mapBoard || !badgeBoard) return;

  btnViaje.addEventListener("click", () => {
    btnViaje.classList.add("active");
    btnViaje.setAttribute("aria-selected", "true");
    btnInsignias.classList.remove("active");
    btnInsignias.setAttribute("aria-selected", "false");
    mapBoard.hidden = false;
    badgeBoard.hidden = true;
    playTone("tap");
  });

  btnInsignias.addEventListener("click", () => {
    btnInsignias.classList.add("active");
    btnInsignias.setAttribute("aria-selected", "true");
    btnViaje.classList.remove("active");
    btnViaje.setAttribute("aria-selected", "false");
    renderBadges();
    mapBoard.hidden = true;
    badgeBoard.hidden = false;
    playTone("tap");
  });
}

function renderProgress() {
  // Calculate progress based on individual sub-activity completions
  let totalActivities = 0;
  let doneActivities = 0;

  state.data.units.forEach((unit) => {
    if (unit.subActivities && unit.subActivities.length > 0) {
      totalActivities += unit.subActivities.length;
      doneActivities += countCompletedSubs(unit.id, unit.subActivities.length);
    } else if (state.completed.includes(unit.id)) {
      totalActivities++;
      doneActivities++;
    }
  });

  const percent = totalActivities > 0 ? Math.round((doneActivities / totalActivities) * 100) : 0;
  progressPercent.textContent = `${percent}%`;
  progressRing.style.setProperty("--value", `${percent * 3.6}deg`);

  const rewards = state.data.units.filter((unit) => {
    if (unit.subActivities && unit.subActivities.length > 0) {
      return allSubActivitiesCompleted(unit);
    }
    return state.completed.includes(unit.id);
  });

rewardStrip.innerHTML = rewards.length
    ? rewards.map((unit) => `<span class="badge">${getBadgeIcon(unit.reward)}</span>`).join("")
    : `<span class="badge">Comienza una unidad para ganar recompensas</span>`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "reino-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

/* =============================================
   UNIT 1 INTRO VIDEO — plays once (first time)
   ============================================= */
function hasSeenUnit1Video() {
  // Per-user tracking (persisted). Fallback to a per-account localStorage flag.
  if (state.user && state.user.unit1VideoSeen) return true;
  const accountId = state.user?.accountId || state.user?.username;
  if (accountId && localStorage.getItem(`reino.unit1VideoSeen.${accountId}`) === "1") return true;
  return false;
}

function markUnit1VideoSeen() {
  const accountId = state.user?.accountId || state.user?.username;
  if (accountId) {
    localStorage.setItem(`reino.unit1VideoSeen.${accountId}`, "1");
  }
  if (state.user) {
    state.user.unit1VideoSeen = true;
    persistCurrentUser();
  }
}

function playUnit1IntroVideo(unit) {
  // Pause background music while the video plays
  if (backgroundMusic) backgroundMusic.pause();

  // Create a fullscreen overlay that cannot be skipped
  const overlay = document.createElement("div");
  overlay.className = "unit1-intro-overlay";
  overlay.id = "unit1IntroOverlay";

  const video = document.createElement("video");
  video.id = "unit1IntroVideo";
  video.src = "assets/videos/unit1.mp4";
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.removeAttribute("controls");
  video.style.pointerEvents = "none";

  overlay.appendChild(video);
  document.body.appendChild(overlay);

  // Block user interaction (cannot be skipped via clicks/touches)
  const blockEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  overlay.addEventListener("click", blockEvent, true);
  overlay.addEventListener("touchstart", blockEvent, true);
  overlay.addEventListener("contextmenu", blockEvent, true);

  // Block keyboard shortcuts (Esc, space, arrows, F11, etc.)
  const blockKey = (e) => {
    if (e.key === "Escape" || e.key === " " || e.key === "F11" ||
        e.key === "ArrowLeft" || e.key === "ArrowRight" ||
        e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener("keydown", blockKey, true);

  // Block context menu
  const blockContext = (e) => e.preventDefault();
  document.addEventListener("contextmenu", blockContext, true);

  // Attempt native fullscreen
  const root = document.documentElement;
  const reqFull = root.requestFullscreen || root.webkitRequestFullscreen;
  if (reqFull) {
    try { reqFull.call(root); } catch (err) { /* fullscreen may be unavailable */ }
  }

  const finish = () => {
    // Remove the block listeners
    overlay.removeEventListener("click", blockEvent, true);
    overlay.removeEventListener("touchstart", blockEvent, true);
    overlay.removeEventListener("contextmenu", blockEvent, true);
    document.removeEventListener("keydown", blockKey, true);
    document.removeEventListener("contextmenu", blockContext, true);

    // Exit native fullscreen if we entered it
    const exitFull = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFull && document.fullscreenElement) {
      try { exitFull.call(document); } catch (err) { /* ignore */ }
    }

    // Remove the overlay
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

    // Resume background music
    if (state.music && backgroundMusic) backgroundMusic.play().catch(() => {});

    // Mark as seen and open the unit (castle map) now
    markUnit1VideoSeen();
    openActivity(unit.id);
  };

  // Only proceed to the map once the video has fully ended
  video.addEventListener("ended", finish, { once: true });
  video.addEventListener("error", finish, { once: true });
}

function openActivity(unitId) {
  const unit = state.data.units.find((item) => item.id === unitId);
  if (!unit) return;
if (isUnitLocked(unit)) {
    const requiredUnit = state.data.units.find((u) => u.id === unit.requires);
    showToast(`Completa ${requiredUnit ? requiredUnit.title : "la unidad anterior"} para desbloquear esta unidad.`);
    playTone("error");
    return;
  }

  // Unit 1 (Castillo): play the intro video the first time (cannot be skipped).
  // The castle map is only shown after the video has fully ended.
  if (unit.id === "castillo" && !hasSeenUnit1Video()) {
    playUnit1IntroVideo(unit);
    return;
  }

  state.activeUnit = unit;
  state.selectedAnswer = null;
  state.sequenceAnswer = [];
  state.escudoTimer = null;
  state.escudoExpired = false;
  state.cofreDropped = null;
  state.activeSubActivityIndex = null;
  state.replaySubActivity = null;
  state.audioLock = false; // release any stuck audio lock when opening a new activity
  state.checkingLock = false; // re-enable checkAnswer for new activity

  // Reset any background image leftover from a sub-activity
  const existingBg = document.getElementById("subActivityBg");
  if (existingBg) existingBg.style.display = "none";
  activityZone.classList.remove("has-castle-bg");
  activityZone.classList.remove("has-forest-bg");

  // If unit has subActivities (castle map), show the map
  if (unit.subActivities && unit.subActivities.length > 0) {
    state.inCastleMap = true;
    activityZone.classList.add("unit-fullscreen");
    renderCastleMap(unit);
    updateActivityAvatarBadge();
    activityZone.hidden = false;
    playTone("open");
    return;
  }

  // Otherwise standard single-activity unit (bosque, montanas, oceano)
  state.inCastleMap = false;
  activityZone.classList.remove("unit-fullscreen");
  activityScene.className = `activity-scene ${unit.theme}`;
  activityScene.textContent = unit.icon;
  activityScene.hidden = false;
  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  activityTitle.textContent = unit.activity.title;
  activityPrompt.textContent = unit.activity.prompt;
  feedback.className = "feedback";
  feedback.textContent = buildFeedbackSummary(unit);
  activityWorkspace.innerHTML = "";
  $("#checkAnswer").hidden = false;
  $("#listenPrompt").hidden = false;
  $("#listenPrompt").textContent = "Escuchar";
  $("#pronunciationBtn").hidden = false;

  if (unit.activity.type === "choice") renderChoiceActivity(unit.activity);
  if (unit.activity.type === "input") renderInputActivity(unit.activity);
  if (unit.activity.type === "sequence") renderSequenceActivity(unit.activity);

  updateActivityAvatarBadge();
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

function safePlayAudio(audio, onEnded) {
  if (!state.sound) {
    if (onEnded) onEnded();
    return;
  }

  if (state.audioLock) {
    return;
  }

  if (state.currentAudio && state.currentAudio !== audio) {
    state.currentAudio.pause();
    state.currentAudio.currentTime = 0;
  }

  state.audioLock = true;
  state.currentAudio = audio;

  const releasePlayback = () => {
    if (state.currentAudio === audio) {
      state.currentAudio = null;
    }
    state.audioLock = false;
    if (onEnded) onEnded();
  };

  stopAllAudio(audio);

  audio.play().then(() => {
    audio.addEventListener("ended", releasePlayback, { once: true });
    audio.addEventListener("error", releasePlayback, { once: true });
  }).catch(() => {
    releasePlayback();
  });
}

function stopAllAudio(exceptAudio = null) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  // Stop any currently playing MP3 Audio elements, except the one we are about
  // to start so a rapid repeat press doesn't cause overlapping playback.
  document.querySelectorAll("audio").forEach((el) => {
    if (el === exceptAudio) return;
    el.pause();
    el.currentTime = 0;
  });

  if (state.currentAudio && state.currentAudio !== exceptAudio) {
    state.currentAudio.pause();
    state.currentAudio.currentTime = 0;
    state.currentAudio = null;
  }
}

/* =============================================
   ðŸ”Š UNIT SOUND PLAYER â€” Uses MP3 from assets/unit_X_sounds/
   ============================================= */
function getUnitSoundFolder(unitId, subIndex) {
  const unit = state.data?.units?.find((u) => u.id === unitId);
  const unitNumber = unit?.number || 1;
  // Unit 1 (Castillo) has three themes: theme1 (activities 1-5, indices 0-4), theme2 (activities 6-10, indices 5-9), theme3 (activity 11, index 10+)
  if (unitId === "castillo") {
    if (subIndex <= 4) return `assets/unit_${unitNumber}_sounds/theme1`;
    if (subIndex <= 9) return `assets/unit_${unitNumber}_sounds/theme2`;
    return `assets/unit_${unitNumber}_sounds/theme3`;
  }
  // Unit 2 (Bosque) uses theme1
  if (unitId === "bosque") {
    return `assets/unit_${unitNumber}_sounds/theme1`;
  }
  // Unit 3 (Montañas) uses a flat folder: assets/unit_3_sounds/
  if (unitId === "montanas") {
    return `assets/unit_${unitNumber}_sounds`;
  }
  return `assets/unit_${unitNumber}_sounds`;
}

function playUnitSound(unitId, subIndex) {
  const activityNumber = subIndex + 1;
  const folder = getUnitSoundFolder(unitId, subIndex);
  const audioCandidates = [`${folder}/activity_${activityNumber}.mp3`];
  // Backward compatibility: existing unit 3 file has a typo in its name.
  if (unitId === "montanas" && activityNumber === 2) {
    audioCandidates.push(`${folder}/activiy_2.mp3`);
  }
  const unit = state.data?.units?.find((u) => u.id === unitId);
  const sub = unit?.subActivities?.[subIndex];

  const fallbackToSpeech = () => {
    if (sub?.speak) {
      speak(sub.speak);
    } else {
      speak(sub?.prompt || "Escucha con atención la instrucción.");
    }
  };

  const tryPlay = (candidateIndex = 0) => {
    if (candidateIndex >= audioCandidates.length) {
      fallbackToSpeech();
      return;
    }

    const audioPath = audioCandidates[candidateIndex];

    // Narración por voz si no existe el MP3
    fetch(audioPath, { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          const audio = new Audio(audioPath);
          safePlayAudio(audio);
        } else {
          tryPlay(candidateIndex + 1);
        }
      })
      .catch(() => {
        tryPlay(candidateIndex + 1);
      });
  };

  tryPlay();
}

function buildOptionAudioName(optionText) {
  return String(optionText).trim().replace(/[.!?]+$/, "");
}

function playOptionSound(optionText) {
  if (!state.sound || state.audioLock) return;
  const unit = state.activeUnit;
  if (!unit) return;
  const subIndex = state.activeSubActivityIndex ?? 0;
  const folder = getUnitSoundFolder(unit.id, subIndex);
  const audioPath = `${folder}/${buildOptionAudioName(optionText)}.mp3`;

  fetch(audioPath, { method: "HEAD" })
    .then((res) => {
      if (res.ok) {
        const audio = new Audio(audioPath);
        safePlayAudio(audio);
      } else {
        speak(String(optionText));
      }
    })
    .catch(() => {
      speak(String(optionText));
    });
}

/* =============================================
   ðŸŽ‰ CORRECT ANSWER SEQUENCE â€” Correct sound â†’ Feedback â†’ Done
   ============================================= */
function playCorrectThenFeedback(unitId, subIndex, onComplete) {
  if (!state.sound) {
    if (onComplete) onComplete();
    return;
  }

  // 1. Pick a random correct sound from the unit-specific correct_sounds folder.
  const correctFolder = unitId === "montanas" ? "assets/correct_sounds3" : "assets/correct_sounds2";
  const maxPhrases = unitId === "montanas" ? 7 : 8;
  const correctSoundIndex = Math.floor(Math.random() * maxPhrases) + 1;
  const correctSound = new Audio(`${correctFolder}/phrase${correctSoundIndex}.mp3`);

  // 2. Determine feedback file dynamically based on unit number
  const activityNumber = subIndex + 1;
  const folder = getUnitSoundFolder(unitId, subIndex);
  const feedbackPath = `${folder}/feedback${activityNumber}.mp3`;

// Play correct sound first
  safePlayAudio(correctSound, () => {
    // After correct sound ends (or fails), play feedback
    const feedbackSound = new Audio(feedbackPath);
    safePlayAudio(feedbackSound, () => {
      if (onComplete) onComplete();
    });
  });
}

/* =============================================
   PUENTE ACTIVITY — close only when BOTH
   the feedback dialogue has ended AND the
   monkey video has finished playing.
   ============================================= */
function returnToMapAfterPuente(unitId, subIndex) {
  let feedbackDone = false;
  let videoDone = false;

  const tryClose = () => {
    if (feedbackDone && videoDone) {
      openActivity(unitId);
    }
  };

  // 1. Play the correct sound → feedback. When the feedback ends, mark feedbackDone.
  playCorrectThenFeedback(unitId, subIndex, () => {
    feedbackDone = true;
    tryClose();
  });

  // 2. Track the monkey video so we only close once it has finished too.
  const monkeyVideo = document.getElementById("puenteMonkey");
  if (!monkeyVideo) {
    // If for some reason the video is not present, don't block closing.
    videoDone = true;
    tryClose();
    return;
  }

  const markVideoDone = () => {
    videoDone = true;
    tryClose();
  };

  monkeyVideo.addEventListener("ended", markVideoDone, { once: true });
  monkeyVideo.addEventListener("error", markVideoDone, { once: true });

  // Safety fallback: if the video never fires 'ended' (e.g. it loads but the
  // app is closed or the element is removed), close anyway after a timeout.
  setTimeout(() => {
    if (!videoDone) {
      videoDone = true;
      tryClose();
    }
  }, 15000);
}

/* =============================================
   ORACION ACTIVITY — close only when BOTH
   the feedback dialogue has ended AND the
   gato video has finished playing.
   ============================================= */
function returnToMapAfterOracion(unitId, subIndex) {
  let feedbackDone = false;
  let videoDone = false;

  const tryClose = () => {
    if (feedbackDone && videoDone) {
      openActivity(unitId);
    }
  };

  // 1. Play the correct sound → feedback. When the feedback ends, mark feedbackDone.
  playCorrectThenFeedback(unitId, subIndex, () => {
    feedbackDone = true;
    tryClose();
  });

  // 2. Track the gato video so we only close once it has finished too.
  const gatoVideo = document.getElementById("oracionVideo");
  if (!gatoVideo) {
    // If for some reason the video is not present, don't block closing.
    videoDone = true;
    tryClose();
    return;
  }

  const markVideoDone = () => {
    videoDone = true;
    tryClose();
  };

  gatoVideo.addEventListener("ended", markVideoDone, { once: true });
  gatoVideo.addEventListener("error", markVideoDone, { once: true });

  // Safety fallback: if the video never fires 'ended' (e.g. it loads but the
  // app is closed or the element is removed), close anyway after a timeout.
  setTimeout(() => {
    if (!videoDone) {
      videoDone = true;
      tryClose();
    }
  }, 15000);
}

/* =============================================
   CASTLE MAP RENDERER
   ============================================= */
function renderCastleMap(unit) {
  activityScene.hidden = true;
  activityZone.classList.add("unit-fullscreen");
  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  const isForest = unit.id === "bosque";
  const isMountain = unit.id === "montanas";
  activityTitle.textContent = isForest
    ? "Mapa del Bosque \u2014 Elige una actividad"
    : isMountain
    ? "Mapa de las Monta\u00f1as \u2014 Elige un cuento"
    : "Mapa del Castillo \u2014 Elige una actividad";
  activityPrompt.textContent = "Completa cada actividad para desbloquear la siguiente.";
  feedback.className = "feedback";
  feedback.textContent = `Progreso: ${countCompletedSubs(unit.id, unit.subActivities.length)}/${unit.subActivities.length} actividades completadas.`;
  activityWorkspace.innerHTML = "";
  $("#checkAnswer").hidden = true;
  $("#listenPrompt").hidden = true;
  $("#pronunciationBtn").hidden = true;

  const total = unit.subActivities.length;
  const done = countCompletedSubs(unit.id, total);
  const allDone = done === total;

  const container = document.createElement("div");
  container.className = unit.id === "bosque" ? "castle-map-container forest-map" : unit.id === "montanas" ? "castle-map-container mountain-map" : "castle-map-container";
  if (unit.castleMapImage) {
    container.style.backgroundImage = `url("${unit.castleMapImage}")`;
  }

  const overlay = document.createElement("div");
  overlay.className = "castle-map-overlay";

  if (!allDone) {
    const title = document.createElement("h3");
    title.className = "castle-map-title";
    title.textContent = `\ud83d\uddfa\ufe0f ${done}/${total} actividades completadas`;
    overlay.appendChild(title);
  } else {
    const title = document.createElement("h3");
    title.className = "castle-map-title";
    title.textContent = "\ud83c\udff0 \u00a1Todas las actividades completadas! \ud83c\udf89";
    overlay.appendChild(title);
  }

  const row = document.createElement("div");
  row.className = "castle-path-row";

  unit.subActivities.forEach((sub, i) => {
    if (i > 0) {
      const connector = document.createElement("div");
      connector.className = "castle-path-connector";
      row.appendChild(connector);
    }

    const node = document.createElement("button");
    node.type = "button";
    node.className = "castle-node";
    node.dataset.index = i;

    const unlocked = isActivityUnlocked(unit.id, i);
    const completed = isSubActivityCompleted(unit.id, i);

    if (completed) {
      node.classList.add("completed");
      node.innerHTML = `<span>${i + 1}</span><span class="node-label">${sub.title.substring(0, 12)}</span>`;
    } else if (unlocked) {
      node.classList.add("unlocked");
      const emojis = ["\ud83c\udf88", "\ud83c\udfe0", "\ud83d\udd75\ufe0f", "\ud83d\udee1\ufe0f", "\ud83d\udc51"];
      node.innerHTML = `<span>${emojis[i] || "\u2b50"}</span><span class="node-label">${sub.title.substring(0, 12)}</span>`;
    } else {
      node.classList.add("locked");
      node.innerHTML = `<span>${i + 1}</span><span class="node-label">Bloqueado</span>`;
    }

    // Allow clicking to re-open even if completed (for review/feedback)
    // Completed activities can be re-entered without affecting progress
    if (unlocked) {
      node.addEventListener("click", () => openSubActivity(unit.id, i));
    }

    row.appendChild(node);
  });

  overlay.appendChild(row);

  // If all done show a completion message
  if (allDone) {
    const completeMsg = document.createElement("p");
    completeMsg.style.cssText = "color:#fff;font-weight:800;text-shadow:0 2px 6px rgba(0,0,0,0.6);margin-top:16px;text-align:center;";
    completeMsg.textContent = `\ud83c\udf8a \u00a1Has ganado: ${unit.reward}! \ud83c\udf8a`;
    overlay.appendChild(completeMsg);
  }

  container.appendChild(overlay);
  activityWorkspace.appendChild(container);
}

/* =============================================
   SUB-ACTIVITY LAUNCHER
   ============================================= */

// Background images for each sub-activity (b1 through b15)
const SUB_ACTIVITY_BACKGROUNDS = [
  "assets/castle_images/b1.jpeg",
  "assets/castle_images/b2.jpeg",
  "assets/castle_images/b3.jpeg",
  "assets/castle_images/b4.png",
  "assets/castle_images/b5.png",
  "assets/castle_images/b6.jpeg",
  "assets/castle_images/b7.png",
  "assets/castle_images/b8.jpeg",
  "assets/castle_images/b9.png",
  "assets/castle_images/b10.jpeg",
  "assets/castle_images/b11.png",
  "assets/castle_images/b12.jpeg",
  "assets/castle_images/b13.png",
  "assets/castle_images/b14.png",
  "assets/castle_images/b15.jpeg"
];

const SUB_ACTIVITY_BACKGROUNDS_FOREST = [
  "assets/forest_images/b1 (1).jpeg",
  "assets/forest_images/b1 (2).jpeg",
  "assets/forest_images/b1 (3).jpeg",
  "assets/forest_images/b1 (4).jpeg",
  "assets/forest_images/b1 (5).jpeg",
  "assets/forest_images/b1 (6).jpeg",
  "assets/forest_images/b1 (7).jpeg",
  "assets/forest_images/b1 (8).jpeg",
  "assets/forest_images/b1 (9).jpeg",
  "assets/forest_images/b1 (10).jpeg",
  "assets/forest_images/b1 (11).jpeg",
  "assets/forest_images/b1 (12).jpeg",
  "assets/forest_images/b1 (13).jpeg",
  "assets/forest_images/b1 (14).jpeg",
  // Unit 2 has only 14 backgrounds; reuse b1 for activity 15.
  "assets/forest_images/b1 (1).jpeg"
];

const SUB_ACTIVITY_BACKGROUNDS_MOUNTAIN = [
  "assets/mountain_images/b (1).jpeg",
  "assets/mountain_images/b (2).jpeg",
  "assets/mountain_images/b (3).jpeg",
  "assets/mountain_images/b (4).jpeg",
  "assets/mountain_images/b (5).jpeg",
  "assets/mountain_images/b (6).jpeg",
  "assets/mountain_images/b (7).jpeg",
  "assets/mountain_images/b (8).jpeg",
  "assets/mountain_images/b (9).jpeg",
  "assets/mountain_images/b (10).jpeg",
  "assets/mountain_images/b (11).jpeg",
  "assets/mountain_images/b (12).jpeg",
  "assets/mountain_images/b (13).jpeg",
  "assets/mountain_images/b (14).jpeg",
  "assets/mountain_images/b (15).jpeg"
];

function getSubActivityBackgroundByUnit(unitId, index) {
  const byUnit = unitId === "bosque"
    ? SUB_ACTIVITY_BACKGROUNDS_FOREST
    : unitId === "montanas"
    ? SUB_ACTIVITY_BACKGROUNDS_MOUNTAIN
    : SUB_ACTIVITY_BACKGROUNDS;

  if (!Array.isArray(byUnit) || !byUnit.length) return "";
  if (index < 0) return byUnit[0];
  return byUnit[index] || byUnit[byUnit.length - 1];
}

function openSubActivity(unitId, index, options = {}) {
  const unit = state.data.units.find((u) => u.id === unitId);
  if (!unit) return;
  const sub = unit.subActivities[index];
  if (!sub) return;
  const forceReplay = Boolean(options.forceReplay);

  state.activeSubActivityIndex = index;
  state.selectedAnswer = null;
  state.sequenceAnswer = [];
  state.escudoTimer = null;
  state.escudoExpired = false;
  state.escudoStarted = false;
  state.cofreDropped = null;
state.redoble = null;
  state.frasePlaced = null;
  // Unit 3 state resets
  state.antesBefore = null;
  state.antesAfter = null;
  if (state.karaokeTimer) { clearInterval(state.karaokeTimer); state.karaokeTimer = null; }
  if (state.cintaTimer) { clearInterval(state.cintaTimer); state.cintaTimer = null; }

  activityScene.hidden = true;
  activityZone.classList.add("unit-fullscreen");

  // Keep unit-specific gradient tint and add per-activity image background layer.
  if (unit.id === "bosque") {
    activityZone.classList.add("has-forest-bg");
  } else {
    activityZone.classList.remove("has-forest-bg");
  }

  // Montañas unit uses its own mountain-themed gradient background
  if (unit.id === "montanas") {
    activityZone.classList.add("has-mountain-bg");
  } else {
    activityZone.classList.remove("has-mountain-bg");
  }

  // Set background image inside the activity card for each unit: activity 1->b1, activity 2->b2, etc.
  const backgroundImagePath = getSubActivityBackgroundByUnit(unit.id, index);
  if (backgroundImagePath) {
    let bgLayer = document.getElementById("subActivityBg");
    if (!bgLayer) {
      bgLayer = document.createElement("div");
      bgLayer.id = "subActivityBg";
      bgLayer.className = "sub-activity-bg";
      const content = activityZone.querySelector(".activity-content");
      if (content) {
        content.insertBefore(bgLayer, content.firstChild);
      }
    }
    bgLayer.style.backgroundImage = `url("${backgroundImagePath}")`;
    bgLayer.style.display = "block";
    activityZone.classList.add("has-castle-bg");
  }

  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  activityTitle.textContent = sub.title;
  activityPrompt.textContent = sub.prompt;
  feedback.className = "feedback";
  feedback.textContent = "";
  activityWorkspace.innerHTML = "";
  updateActivityAvatarBadge();
  state.replaySubActivity = null;

  // If activity is completed, show a completion panel first.
  const alreadyCompleted = isSubActivityCompleted(unitId, index);

  if (alreadyCompleted && !forceReplay) {
    activityWorkspace.innerHTML = `
      <div class="completed-subactivity-panel">
        <h3>Has completado ${escapeHtml(sub.title)}</h3>
        <p>Puedes repasar esta actividad cuando quieras sin afectar tu progreso ni tus medallas.</p>
      </div>
    `;

    $("#checkAnswer").hidden = true;
    $("#listenPrompt").hidden = false;
    $("#listenPrompt").textContent = "Repasar actividad";
    $("#pronunciationBtn").hidden = true;
    feedback.className = "feedback ok";
    feedback.textContent = `Has completado ${sub.title}.`;
    state.replaySubActivity = { unitId, index };
    return;
  } else {
    $("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta" || sub.type === "camaleon" || sub.type === "granja" || sub.type === "inspector" || sub.type === "foco" || sub.type === "laberinto" || sub.type === "asociacion" || sub.type === "memorama" || sub.type === "canastos" || sub.type === "red" || sub.type === "arbol" || sub.type === "teatro" || sub.type === "libro" || sub.type === "capitulos" || sub.type === "karaoke" || sub.type === "personajes" || sub.type === "mapa" || sub.type === "galeria" || sub.type === "linea" || sub.type === "domino" || sub.type === "cinta"; // Auto-checked
    $("#listenPrompt").hidden = false;
    $("#listenPrompt").textContent = "Escuchar";
    $("#pronunciationBtn").hidden = true;
  }

  switch (sub.type) {
    case "globo":
      renderGloboActivity(sub);
      break;
    case "balcon":
      renderBalconActivity(sub);
      break;
    case "intruso":
      renderIntrusoActivity(sub);
      break;
    case "escudo":
      renderEscudoActivity(sub, alreadyCompleted);
      break;
    case "cofre":
      renderCofreActivity(sub, alreadyCompleted);
      break;
    case "caldero":
      renderCalderoActivity(sub);
      break;
    case "carruaje":
      renderCarruajeActivity(sub);
      break;
    case "bingo":
      renderBingoActivity(sub);
      break;
    case "escalera":
      renderEscaleraActivity(sub);
      break;
    case "redoble":
      renderRedobleActivity(sub, alreadyCompleted);
      break;
    case "banquete":
      renderBanqueteActivity(sub, alreadyCompleted);
      break;
    case "pergamino":
      renderPergaminoActivity(sub, alreadyCompleted);
      break;
    case "mensaje":
      renderMensajeActivity(sub, alreadyCompleted);
      break;
    case "pasaje":
      renderPasajeActivity(sub, alreadyCompleted);
      break;
    case "palabra-oculta":
      renderPalabraOcultaActivity(sub, alreadyCompleted);
      break;
    case "oracion":
      renderOracionActivity(sub);
      break;
    case "puente":
      renderPuenteActivity(sub);
      break;
    case "frase":
      renderFraseActivity(sub);
      break;
    case "detective":
      renderDetectiveActivity(sub);
      break;
case "accion":
      renderAccionActivity(sub);
      break;
    case "camaleon":
      renderCamaleonActivity(sub, alreadyCompleted);
      break;
    case "granja":
      renderGranjaActivity(sub, alreadyCompleted);
      break;
    case "inspector":
      renderInspectorActivity(sub, alreadyCompleted);
      break;
    case "foco":
      renderFocoActivity(sub, alreadyCompleted);
      break;
    case "laberinto":
      renderLaberintoActivity(sub, alreadyCompleted);
      break;
    case "asociacion":
      renderAsociacionActivity(sub, alreadyCompleted);
      break;
    case "memorama":
      renderMemoramaActivity(sub, alreadyCompleted);
      break;
    case "canastos":
      renderCanastosActivity(sub, alreadyCompleted);
      break;
    case "red":
      renderRedActivity(sub, alreadyCompleted);
      break;
    case "arbol":
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
}

/* =============================================
   GLOBO ACTIVITY
   ============================================= */
function renderGloboActivity(sub) {
  const container = document.createElement("div");
  container.className = "globo-container";

  // Map letters to balloon image files
  const balloonImages = {
    "M": "assets/images/unit_1/green_ballon.png",
    "S": "assets/images/unit_1/blue_ballon.png",
    "P": "assets/images/unit_1/yellow_ballon.png",
    "L": "assets/images/unit_1/red_ballon.png"
  };

  sub.letters.forEach((letter) => {
    const balloon = document.createElement("button");
    balloon.type = "button";
    balloon.className = "globo";
    balloon.textContent = letter;
    // Set balloon image as background
    const imgPath = balloonImages[letter] || "";
    if (imgPath) {
      balloon.style.backgroundImage = `url("${imgPath}")`;
      balloon.style.backgroundSize = "contain";
      balloon.style.backgroundRepeat = "no-repeat";
      balloon.style.backgroundPosition = "center";
    }
    balloon.addEventListener("click", () => {
      document.querySelectorAll(".globo").forEach((g) => g.classList.remove("selected-globo"));
      balloon.classList.add("selected-globo");
      state.selectedAnswer = letter;
      playLetterSound(sub, letter);
      playTone("tap");
    });
    container.appendChild(balloon);
  });

  activityWorkspace.appendChild(container);
}

/* =============================================
   BALCON ACTIVITY
   ============================================= */
function renderBalconActivity(sub) {
  const container = document.createElement("div");
  container.className = "balcon-container";

  const wordDisplay = document.createElement("div");
  wordDisplay.className = "balcon-word";
  wordDisplay.textContent = sub.word;
  container.appendChild(wordDisplay);

  const boxes = document.createElement("div");
  boxes.className = "balcon-boxes";

  const icons = [
    "assets/images/unit_1/cat1.png",
    "assets/images/unit_1/cat2.png",
    "assets/images/unit_1/cat3.png"
  ];

  sub.positions.forEach((pos, i) => {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "balcon-box";
    box.dataset.position = pos;
    box.innerHTML = `<span class="box-icon"><img src="${icons[i] || "assets/images/unit_1/cat1.png"}" alt="${pos}" class="balcon-image" /></span><span class="box-label">${pos}</span>`;
    box.addEventListener("click", () => {
      document.querySelectorAll(".balcon-box").forEach((b) => b.classList.remove("selected-balcon"));
      box.classList.add("selected-balcon");
      state.selectedAnswer = pos;
      playTone("tap");
    });
    boxes.appendChild(box);
  });

  container.appendChild(boxes);
  activityWorkspace.appendChild(container);
}

/* =============================================
   INTRUSO ACTIVITY
   ============================================= */
function renderIntrusoActivity(sub) {
  const container = document.createElement("div");
  container.className = "intruso-container";

  sub.options.forEach((option, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "intruso-card";
    const iconPath = sub.icons[i] || "";
    card.innerHTML = `<span class="card-icon"><img src="${iconPath}" alt="${option}" class="intruso-image" /></span><span class="card-label">${option}</span>`;
    card.addEventListener("click", () => {
      document.querySelectorAll(".intruso-card").forEach((c) => c.classList.remove("selected-intruso"));
      card.classList.add("selected-intruso");
      state.selectedAnswer = option;
      playTone("tap");
    });
    container.appendChild(card);
  });

  activityWorkspace.appendChild(container);
}

/* =============================================
   ESCUDO ACTIVITY
   ============================================= */
function renderEscudoActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "escudo-container";

  // Top row: shield centered, no overlapping text
  const topRow = document.createElement("div");
  topRow.className = "escudo-top-row";

  // Shield display
  const shield = document.createElement("div");
  shield.className = "escudo-shield";
  shield.innerHTML = `<img src="assets/images/unit_1/escudo.png" alt="Escudo" class="shield-img" /><span class="shield-letter">?</span>`;
  topRow.appendChild(shield);
  container.appendChild(topRow);

  // Middle row: timer + key display
  const middleRow = document.createElement("div");
  middleRow.className = "escudo-middle-row";

  // Timer ring
  const timerRing = document.createElement("div");
  timerRing.className = "escudo-timer-ring";
  timerRing.id = "escudoTimerRing";
  timerRing.textContent = sub.timeLimit;
  middleRow.appendChild(timerRing);

  // Key press display
  const keyDisplay = document.createElement("div");
  keyDisplay.className = "escudo-key-display";
  keyDisplay.id = "escudoKeyDisplay";
  keyDisplay.textContent = reviewMode ? sub.answer.toUpperCase() : "\u2014";
  middleRow.appendChild(keyDisplay);

  container.appendChild(middleRow);

  // Hint
  const hint = document.createElement("p");
  hint.className = "escudo-hint";
  hint.id = "escudoHint";
  hint.textContent = reviewMode
    ? "Actividad completada. Puedes escuchar la instruccion, pero ya no necesitas responder otra vez."
    : "Escucha el sonido de la letra. Luego presiona la tecla correcta en tu teclado.";
  container.appendChild(hint);

  if (reviewMode) {
    activityWorkspace.appendChild(container);
    return;
  }

  // Start button
  const startBtn = document.createElement("button");
  startBtn.className = "primary-btn escudo-start-btn";
  startBtn.id = "escudoStartBtn";
  startBtn.textContent = "¡Empezar!";
  startBtn.addEventListener("click", () => {
    state.escudoStarted = true;
    startBtn.hidden = true;
    hint.textContent = "¡Presiona la tecla de la letra que suena!";
    // Play phoneme sound
    playPhonemeSound(sub.phonemeFile, sub.phoneme);
    // Start timer after a short delay so the kid can hear the phoneme first
    setTimeout(() => {
      startEscudoTimer(sub);
    }, 800);
  });
  container.appendChild(startBtn);

  activityWorkspace.appendChild(container);
}

function playPhonemeSound(file, fallbackLetter) {
  if (!state.sound || state.audioLock) return;
  const audio = new Audio(file);
  safePlayAudio(audio);
}

function playLetterSound(sub, letter) {
  const normalizedLetter = String(letter).toUpperCase();
  const soundFile = sub.letterSounds?.[normalizedLetter];
  if (soundFile) {
    playPhonemeSound(soundFile, normalizedLetter);
    return;
  }

  speak(`Sonido de la letra ${normalizedLetter}`);
}

function startEscudoTimer(sub) {
  // Guard: if the activity was closed or escudo was reset, don't start
  if (!state.escudoStarted) return;

  let timeLeft = sub.timeLimit;
  state.escudoExpired = false;
  const timerRing = $("#escudoTimerRing");
  const keyDisplay = $("#escudoKeyDisplay");

  if (state.escudoTimer) {
    clearInterval(state.escudoTimer);
  }

  function updateTimer() {
    if (timerRing) timerRing.textContent = timeLeft;
    if (timerRing) {
      timerRing.classList.remove("timer-warning", "timer-critical");
      if (timeLeft <= 1) timerRing.classList.add("timer-critical");
      else if (timeLeft <= 3) timerRing.classList.add("timer-warning");
    }
  }

  updateTimer();

  state.escudoTimer = setInterval(() => {
    timeLeft--;
    updateTimer();

    if (timeLeft <= 0) {
      clearInterval(state.escudoTimer);
      state.escudoTimer = null;
      state.escudoExpired = true;
      if (timerRing) timerRing.textContent = "0";
      feedback.className = "feedback try";
      feedback.textContent = "\u00a1Se acab\u00f3 el tiempo! Intenta de nuevo.";
      playTone("error");
    }
  }, 1000);

  // Listen for keypress
  function onKeyDown(e) {
    if (state.escudoExpired) return;
    const key = e.key.toLowerCase();
    if (keyDisplay) keyDisplay.textContent = key.toUpperCase();

    // Check answer
    if (key === sub.answer.toLowerCase()) {
      clearInterval(state.escudoTimer);
      state.escudoTimer = null;
      state.selectedAnswer = key;
      feedback.className = "feedback ok";
      feedback.textContent = sub.success;
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      playTone("success");
      celebrateConfetti();
      document.removeEventListener("keydown", onKeyDown);
      state.escudoTimerCleanup = null;

      // Unit 1 (Castillo): play correct sound â†’ feedback â†’ return to map
      if (state.activeUnit.id === "castillo") {
        playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
          openActivity(state.activeUnit.id);
        });
      }
    } else {
      // Show incorrect but don't stop timer
      keyDisplay.style.borderColor = "#e86f68";
      keyDisplay.style.background = "#ffe8e7";
      setTimeout(() => {
        keyDisplay.style.borderColor = "";
        keyDisplay.style.background = "";
      }, 300);
    }
  }

  document.addEventListener("keydown", onKeyDown);

  // Store cleanup
  state.escudoTimerCleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    if (state.escudoTimer) {
      clearInterval(state.escudoTimer);
      state.escudoTimer = null;
    }
  };
}

/* =============================================
   COFRE ACTIVITY
   ============================================= */
function renderCofreActivity(sub) {
  const container = document.createElement("div");
  container.className = "cofre-container";

  function dropIntoBox(box, letter) {
    document.querySelectorAll(".cofre-box").forEach((item) => item.classList.remove("drag-over", "dropped"));
    state.selectedAnswer = letter;
    state.cofreDropped = letter;
    box.classList.add("dropped");

    const dragged = $("#draggableCard");
    if (dragged) {
      box.appendChild(dragged);
      dragged.draggable = false;
      dragged.classList.remove("tap-selected");
    }

    const fbZone = $("#cofreFeedback");
    if (fbZone) fbZone.textContent = `Elegiste el cofre de la letra ${letter}. Presiona Revisar.`;
    playTone("tap");
  }

  // Draggable card
  const card = document.createElement("div");
  card.className = "draggable-card";
  card.id = "draggableCard";
  card.draggable = true;
  card.textContent = sub.word;
  card.tabIndex = 0;
  card.title = "Arrastra la tarjeta o t\u00f3cala y luego elige un cofre.";
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", sub.word);
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
  card.addEventListener("click", () => {
    card.classList.toggle("tap-selected");
    const fbZone = $("#cofreFeedback");
    if (fbZone) fbZone.textContent = card.classList.contains("tap-selected")
      ? "Ahora toca el cofre correcto."
      : "Arrastra la palabra al cofre correcto.";
  });
  container.appendChild(card);

  // Boxes row
  const boxes = document.createElement("div");
  boxes.className = "cofre-boxes";

  sub.boxes.forEach((boxData) => {
    const box = document.createElement("div");
    box.className = "cofre-box";
    box.dataset.letter = boxData.letter;
    box.innerHTML = `<span class="cofre-letter">${boxData.letter}</span><span class="cofre-label">${boxData.label}</span>`;

    box.addEventListener("dragover", (e) => {
      e.preventDefault();
      document.querySelectorAll(".cofre-box").forEach((b) => b.classList.remove("drag-over"));
      box.classList.add("drag-over");
    });

    box.addEventListener("dragleave", () => {
      box.classList.remove("drag-over");
    });

    box.addEventListener("drop", (e) => {
      e.preventDefault();
      dropIntoBox(box, boxData.letter);
    });

    box.addEventListener("click", () => {
      const dragged = $("#draggableCard");
      if (!dragged || !dragged.classList.contains("tap-selected")) return;
      dropIntoBox(box, boxData.letter);
    });

    boxes.appendChild(box);
  });

  container.appendChild(boxes);

  // Feedback zone
  const fbZone = document.createElement("div");
  fbZone.className = "cofre-feedback-zone";
  fbZone.id = "cofreFeedback";
  fbZone.textContent = "Arrastra la palabra al cofre correcto.";
  container.appendChild(fbZone);

  activityWorkspace.appendChild(container);
}

/* =============================================
   CALDERO ACTIVITY — Silaba cauldron multiple choice
   ============================================= */
function renderCalderoActivity(sub) {
  const container = document.createElement("div");
  container.className = "caldero-container";

  // Cauldron with reflection
  const cauldron = document.createElement("div");
  cauldron.className = "caldero-cauldron";
  cauldron.id = "calderoCauldron";
  cauldron.title = "Caldero mágico";

  const cauldronText = document.createElement("span");
  cauldronText.className = "cauldron-text";
  cauldronText.id = "calderoText";
  cauldronText.textContent = "?";
  cauldron.appendChild(cauldronText);

  container.appendChild(cauldron);

  // Hint text
  const hint = document.createElement("p");
  hint.className = "caldero-hint";
  hint.id = "calderoHint";
  hint.textContent = "Selecciona la sílaba correcta.";
  container.appendChild(hint);

  // Option buttons
  const optionsRow = document.createElement("div");
  optionsRow.className = "caldero-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "caldero-option";
    btn.textContent = option;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".caldero-option").forEach((o) => o.classList.remove("selected-caldero"));
      btn.classList.add("selected-caldero");
      state.selectedAnswer = option;
      // Show the selected syllable in the cauldron
      const cal = $("#calderoCauldron");
      const calText = $("#calderoText");
      if (calText) {
        calText.textContent = option;
      }
      if (cal) {
        cal.classList.add("bubbling");
        setTimeout(() => cal.classList.remove("bubbling"), 600);
      }
      // Play the phoneme sound from assets/phonemes/ (e.g. ma.mp3, me.mp3, mi.mp3, mu.mp3)
      const phonemePath = `assets/phonemes/${option.toLowerCase()}.mp3`;
      const audio = new Audio(phonemePath);
      safePlayAudio(audio);
      playTone("tap");
    });
    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

/* =============================================
   CARRUAJE ACTIVITY — Syllable train sequential assembly
   ============================================= */
function renderCarruajeActivity(sub) {
  const container = document.createElement("div");
  container.className = "carruaje-container";

  // Word display
  const wordDisplay = document.createElement("div");
  wordDisplay.className = "carruaje-word-display";
  wordDisplay.id = "carruajeWordDisplay";
  wordDisplay.textContent = "";
  container.appendChild(wordDisplay);

  // Train with wagons
  const train = document.createElement("div");
  train.className = "carruaje-train";
  train.id = "carruajeTrain";

  // Reset state for this activity
  state.sequenceAnswer = [];

  sub.answer.forEach((_, i) => {
    const wagon = document.createElement("div");
    wagon.className = "carruaje-wagon";
    wagon.id = `carruajeWagon${i}`;
    wagon.dataset.index = i;
    train.appendChild(wagon);
  });

  container.appendChild(train);

  // Hint
  const hint = document.createElement("p");
  hint.className = "carruaje-hint";
  hint.id = "carruajeHint";
  hint.textContent = "Haz clic en las sílabas en el orden correcto.";
  container.appendChild(hint);

  // Syllable blocks (shuffled — NEVER in the correct answer order)
  const blocks = document.createElement("div");
  blocks.className = "carruaje-blocks";

  // Store block references for undoing
  const blockMap = {};

  // Shuffle until the order is different from the answer
  let shuffled;
  do {
    shuffled = [...sub.syllables].sort(() => Math.random() - 0.5);
  } while (shuffled.every((s, i) => s === sub.answer[i]));

  shuffled.forEach((syllable) => {
    const block = document.createElement("button");
    block.type = "button";
    block.className = "carruaje-block";
    block.textContent = syllable;
    block.dataset.syllable = syllable;
    blockMap[syllable] = block;

    block.addEventListener("click", () => {
      // If block is already used — ignore (undo is done by clicking the wagon)
      if (block.classList.contains("used")) return;

      const nextIndex = state.sequenceAnswer.length;
      const total = sub.answer.length;

      // All wagons filled?
      if (nextIndex >= total) return;

      // Place in wagon
      const wagon = $(`#carruajeWagon${nextIndex}`);
      if (wagon) {
        wagon.textContent = syllable;
        wagon.classList.add("filled");
        // Store which syllable is in this wagon for undo
        wagon.dataset.syllable = syllable;
      }

      block.classList.add("used");
      state.sequenceAnswer.push(syllable);

      // Update word display
      wordDisplay.textContent = state.sequenceAnswer.join(" - ");

      playTone("tap");
    });

    blocks.appendChild(block);
  });

  // Wagons ARE clickable — clicking a filled wagon returns the syllable to its block
  sub.answer.forEach((_, i) => {
    const wagon = container.querySelector(`#carruajeWagon${i}`);
    if (!wagon) return;
    // Make sure we don't double-add event listeners (in case function is called twice)
    wagon._listenerAttached = wagon._listenerAttached || false;
    if (wagon._listenerAttached) return;
    wagon._listenerAttached = true;

    wagon.addEventListener("click", (e) => {
      e.stopPropagation();
      const lastIndex = state.sequenceAnswer.length - 1;
      if (lastIndex < 0) return;
      // Only the last filled wagon can be undone
      const dataIdx = parseInt(wagon.dataset.index);
      if (dataIdx !== lastIndex) return;
      // Must have content
      if (!wagon.classList.contains("filled")) return;

      const syllable = wagon.textContent.trim();
      // Clear wagon
      wagon.textContent = "";
      wagon.classList.remove("filled");
      delete wagon.dataset.syllable;

      // Restore block
      const block = blockMap[syllable];
      if (block) {
        block.classList.remove("used");
      }

      state.sequenceAnswer.pop();

      wordDisplay.textContent = state.sequenceAnswer.length > 0
        ? state.sequenceAnswer.join(" - ")
        : "";

      playTone("tap");
    });
  });

  container.appendChild(blocks);
  activityWorkspace.appendChild(container);
}

/* =============================================
   BINGO ACTIVITY — Medieval Bingo grid
   ============================================= */
function renderBingoActivity(sub) {
  const container = document.createElement("div");
  container.className = "bingo-container";

  // Title
  const title = document.createElement("h3");
  title.className = "bingo-title";
  title.textContent = "Cartón de Bingo";
  container.appendChild(title);

  // Bingo grid (2 rows x 3 cols)
  const grid = document.createElement("div");
  grid.className = "bingo-grid";

  // Track marked cells
  state.bingoMarked = [];
  state.bingoPlaying = false;
  state.bingoRound = 0;

  // Shuffle syllables for the grid so each time the card is different
  const shuffledGrid = [...sub.syllables].sort(() => Math.random() - 0.5);

  shuffledGrid.forEach((syllable) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "bingo-cell";
    cell.textContent = syllable;
    cell.dataset.syllable = syllable;

    cell.addEventListener("click", () => {
      // Only respond if currently playing a round
      if (!state.bingoPlaying) return;
      // If already marked, ignore
      if (cell.classList.contains("bingo-marked")) return;
      // If this syllable == current target
      if (syllable !== state.bingoCurrentTarget) {
        // Wrong cell — flash red
        cell.classList.add("bingo-wrong");
        setTimeout(() => cell.classList.remove("bingo-wrong"), 400);
        playTone("error");
        return;
      }
      // Correct!
      cell.classList.add("bingo-marked");
      state.bingoMarked.push(syllable);
      playTone("success");

      // Check if all 6 marked → BINGO!
      if (state.bingoMarked.length >= sub.answer.length) {
        state.bingoPlaying = false;
        state.selectedAnswer = true; // signal complete
        feedback.className = "feedback ok";
        feedback.textContent = sub.success;
        // Auto-check as complete
        setTimeout(() => {
          checkAnswer();
        }, 500);
        return;
      }

      // Schedule next syllable after a short pause
      setTimeout(() => {
        playNextBingoSyllable(sub);
      }, 1200);
    });

    grid.appendChild(cell);
  });

  container.appendChild(grid);

  // Progress indicator
  const progress = document.createElement("div");
  progress.className = "bingo-progress";
  progress.id = "bingoProgress";
  progress.textContent = "Presiona \"¡Jugar!\" para comenzar";
  container.appendChild(progress);

  // Hint / current target display
  const targetDisplay = document.createElement("div");
  targetDisplay.className = "bingo-target";
  targetDisplay.id = "bingoTarget";
  targetDisplay.textContent = "Escucha la sílaba...";
  container.appendChild(targetDisplay);

  // Start button
  const startBtn = document.createElement("button");
  startBtn.className = "primary-btn bingo-start-btn";
  startBtn.id = "bingoStartBtn";
  startBtn.textContent = "¡Jugar!";
  startBtn.addEventListener("click", () => {
    startBtn.hidden = true;
    state.bingoMarked = [];
    state.bingoRound = 0;
    state.bingoPlaying = true;
    feedback.className = "feedback";
    feedback.textContent = "¡Escucha y marca las sílabas en tu cartón!";
    setTimeout(() => {
      playNextBingoSyllable(sub);
    }, 500);
  });
  container.appendChild(startBtn);

  activityWorkspace.appendChild(container);
}

function playNextBingoSyllable(sub) {
  if (!state.bingoPlaying) return;
  // Only the syllables in sub.answer (PA, LE, SO, TU, MI, RO) are ever spoken.
  // The distractors (Ti, Mo, Si) remain visible on the card but are never a target.
  const remaining = sub.answer.filter((s) => !state.bingoMarked.includes(s));
  if (remaining.length === 0) return;

  // Pick random remaining syllable
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  state.bingoCurrentTarget = pick;

  const targetDisplay = $("#bingoTarget");
  if (targetDisplay) targetDisplay.textContent = `Busca...`;

  const progress = $("#bingoProgress");
  if (progress) progress.textContent = `Marcadas: ${state.bingoMarked.length}/${sub.answer.length}`;

  // Try to play MP3; fallback to speech synth
  const phonemePath = `assets/phonemes/${pick.toLowerCase()}.mp3`;
  const audio = new Audio(phonemePath);
  audio.onerror = () => {
    // Fallback to robotic voice
    speak(`Encuentra la sílaba ${pick}`);
  };
  // Check if file exists by trying to load it
  fetch(phonemePath, { method: "HEAD" })
    .then((res) => {
      if (res.ok) {
        safePlayAudio(audio);
      } else {
        speak(`Encuentra la sílaba ${pick}`);
      }
    })
    .catch(() => {
      speak(`Encuentra la sílaba ${pick}`);
    });
}

/* =============================================
   ESCALERA ACTIVITY — Series completion staircase
   ============================================= */
function renderEscaleraActivity(sub) {
  const container = document.createElement("div");
  container.className = "escalera-container";

  // Reset selected answer
  state.selectedAnswer = null;

  // Series display — show the sequence with a blank
  const seriesDisplay = document.createElement("div");
  seriesDisplay.className = "escalera-series";

  sub.series.forEach((item, i) => {
    const step = document.createElement("span");
    step.className = "escalera-step";
    if (item === "__") {
      step.classList.add("escalera-step-blank");
      step.id = "escaleraBlankStep";
      step.textContent = "?";
    } else {
      step.textContent = item;
    }
    seriesDisplay.appendChild(step);

    // Add arrow between steps
    if (i < sub.series.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "escalera-arrow";
      arrow.textContent = "→";
      seriesDisplay.appendChild(arrow);
    }
  });

  container.appendChild(seriesDisplay);

  // Instruction text
  const prompt = document.createElement("p");
  prompt.className = "escalera-prompt";
  prompt.textContent = sub.prompt || "¿Qué sílaba falta en la serie?";
  container.appendChild(prompt);

  // Options (multiple choice)
  const optionsRow = document.createElement("div");
  optionsRow.className = "escalera-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "escalera-option";
    btn.textContent = option;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".escalera-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.selectedAnswer = option;

      // Show the selected option in the blank step
      const blank = document.getElementById("escaleraBlankStep");
      if (blank) {
        blank.textContent = option;
        blank.classList.add("escalera-step-filled");
      }

      // Play phoneme sound for the selected syllable
      const phonemePath = `assets/phonemes/${option.toLowerCase()}.mp3`;
      const audio = new Audio(phonemePath);
      safePlayAudio(audio);

      playTone("tap");
    });

    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);

  activityWorkspace.appendChild(container);
}

/* =============================================
   REDOBLE ACTIVITY — Syllable drum-roll counting
   ============================================= */
function renderRedobleActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "redoble-container";

  // Initialize game state
  state.redoble = {
    round: 0,
    words: sub.words.map((w) => ({ ...w, used: false })),
    currentWord: null,
    phase: "idle", // idle → playing → answering → done
    correctCount: 0,
    totalRounds: 3
  };

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "redoble-status";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Round indicator
  const roundDisplay = document.createElement("div");
  roundDisplay.className = "redoble-round";
  roundDisplay.id = "redobleRound";
  roundDisplay.textContent = "Ronda 1 / 3";
  container.appendChild(roundDisplay);

  // Word display (shows word/emoji while playing)
  const wordDisplay = document.createElement("div");
  wordDisplay.className = "redoble-word";
  wordDisplay.id = "redobleWord";
  wordDisplay.textContent = "";
  container.appendChild(wordDisplay);

  // Status message
  const statusMsg = document.createElement("p");
  statusMsg.className = "redoble-status";
  statusMsg.id = "redobleStatus";
  statusMsg.textContent = "Presiona \"Comenzar\" para escuchar una palabra.";
  container.appendChild(statusMsg);

  // Comenzar button
  const startBtn = document.createElement("button");
  startBtn.className = "redoble-comenzar";
  startBtn.id = "redobleComenzar";
  startBtn.textContent = "¡Comenzar!";
  startBtn.addEventListener("click", () => {
    playRedobleRound();
  });
  container.appendChild(startBtn);

  // Number buttons (1, 2, 3)
  const numbersRow = document.createElement("div");
  numbersRow.className = "redoble-numbers";

  sub.options.forEach((num) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "redoble-number";
    btn.dataset.number = num;
    btn.textContent = num;
    btn.addEventListener("click", () => {
      if (!state.redoble || state.redoble.phase !== "answering") return;
      // Select this number
      document.querySelectorAll(".redoble-number").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.selectedAnswer = num;
      // Auto-check
      checkRedobleAnswer();
    });
    numbersRow.appendChild(btn);
  });

  container.appendChild(numbersRow);

  activityWorkspace.appendChild(container);
}

function playRedobleRound() {
  if (!state.redoble) return;

  const redoble = state.redoble;
  if (redoble.phase === "done") return;

  // Find unused words
  const unused = redoble.words.filter((w) => !w.used);
  if (unused.length === 0) {
    // All words used — shouldn't happen but handle gracefully
    redoble.phase = "done";
    return;
  }

  // Pick a random unused word
  const pick = unused[Math.floor(Math.random() * unused.length)];
  pick.used = true;
  redoble.currentWord = pick;
  redoble.phase = "playing";

  // Update UI
  const roundDisplay = document.getElementById("redobleRound");
  if (roundDisplay) roundDisplay.textContent = `Ronda ${redoble.round + 1} / ${redoble.totalRounds}`;

  const wordDisplay = document.getElementById("redobleWord");
  if (wordDisplay) wordDisplay.textContent = pick.word;

  const startBtn = document.getElementById("redobleComenzar");
  if (startBtn) startBtn.disabled = true;

  const statusMsg = document.getElementById("redobleStatus");
  if (statusMsg) statusMsg.textContent = "Escuchando...";

  // Reset selected answer
  state.selectedAnswer = null;
  document.querySelectorAll(".redoble-number").forEach((b) => b.classList.remove("selected"));

  // Play the word audio
  const audio = new Audio(pick.audio);
  safePlayAudio(audio, () => {
    // Audio ended — switch to answering phase
    redoble.phase = "answering";
    const statusMsg = document.getElementById("redobleStatus");
    if (statusMsg) statusMsg.textContent = "¿Cuántas sílabas escuchaste?";
    const startBtn = document.getElementById("redobleComenzar");
    if (startBtn) startBtn.disabled = false;
    const wordDisplay = document.getElementById("redobleWord");
    if (wordDisplay) wordDisplay.textContent = "❓";
  });
}

function checkRedobleAnswer() {
  if (!state.redoble || state.redoble.phase !== "answering" || state.selectedAnswer === null) return;

  const redoble = state.redoble;
  const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
  const isCorrect = state.selectedAnswer === redoble.currentWord.syllables;

  if (isCorrect) {
    redoble.correctCount++;
    redoble.round++;
    playTone("success");

    // Check if all rounds completed
    if (redoble.round >= redoble.totalRounds) {
      // All 3 rounds done!
      redoble.phase = "done";
      feedback.className = "feedback ok";
      feedback.textContent = sub.success + " ¡Has completado esta actividad!";
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      celebrateConfetti();

      const statusMsg = document.getElementById("redobleStatus");
      if (statusMsg) statusMsg.textContent = "¡Redoble completado!";

      // Play correct sound + feedback, then return to map
      playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
        openActivity(state.activeUnit.id);
      });
      return;
    }

    // Move to next round
    feedback.className = "feedback ok";
    feedback.textContent = `¡Correcto! "${redoble.currentWord.word}" tiene ${redoble.currentWord.syllables} sílaba(s).`;

    const wordDisplay = document.getElementById("redobleWord");
    if (wordDisplay) wordDisplay.textContent = redoble.currentWord.word;

    const statusMsg = document.getElementById("redobleStatus");
    if (statusMsg) statusMsg.textContent = `¡Bien! Prepárate para la siguiente ronda.`;

    // Reset for next round (user clicks Comenzar again)
    state.selectedAnswer = null;
    document.querySelectorAll(".redoble-number").forEach((b) => b.classList.remove("selected"));

    const roundDisplay = document.getElementById("redobleRound");
    if (roundDisplay) roundDisplay.textContent = `Ronda ${redoble.round + 1} / ${redoble.totalRounds}`;
  } else {
    // Wrong — replay audio automatically
    playTone("error");
    feedback.className = "feedback try";
    feedback.textContent = `¡Oops! "${redoble.currentWord.word}" no tiene ${state.selectedAnswer} sílaba(s). Escúchala de nuevo.`;

    // Reset selection
    state.selectedAnswer = null;
    document.querySelectorAll(".redoble-number").forEach((b) => b.classList.remove("selected"));

    // Re-enter playing phase and replay audio
    redoble.phase = "playing";
    const statusMsg = document.getElementById("redobleStatus");
    if (statusMsg) statusMsg.textContent = "Escuchando de nuevo...";

    const audio = new Audio(redoble.currentWord.audio);
    safePlayAudio(audio, () => {
      redoble.phase = "answering";
      const statusMsg = document.getElementById("redobleStatus");
      if (statusMsg) statusMsg.textContent = "¿Cuántas sílabas escuchaste?";
      const wordDisplay = document.getElementById("redobleWord");
      if (wordDisplay) wordDisplay.textContent = "❓";
    });
  }
}

/* =============================================
   BANQUETE ACTIVITY — Infinite conveyor belt
   Products move as individual instances LECHE → PAN → SOPA → LECHE → ...
   Each product disappears when crossing the checkout line (left side).
   ============================================= */
function renderBanqueteActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "banquete-container";

  // Initialize game state
  state.banquete = {
    round: 0,
    totalRounds: sub.rounds,
    words: [...sub.words],
    currentWord: null,
    phase: "idle", // idle → playing → answering → done
    correctCount: 0,
    selectedLabel: null,
    beltInterval: null,
    beltRAF: null,
    products: [],
    productIndex: 0,
    spawnTimeout: null,
    cleanup: null
  };

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "banquete-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Conveyor belt
  const beltContainer = document.createElement("div");
  beltContainer.className = "banquete-belt-container";

  // Checkout line indicator
  const checkoutLine = document.createElement("div");
  checkoutLine.className = "banquete-checkout-line";
  beltContainer.appendChild(checkoutLine);

  const belt = document.createElement("div");
  belt.className = "banquete-belt";
  belt.id = "banqueteBelt";
  beltContainer.appendChild(belt);
  container.appendChild(beltContainer);

  // Status display
  const statusMsg = document.createElement("p");
  statusMsg.className = "banquete-status";
  statusMsg.id = "banqueteStatus";
  statusMsg.textContent = 'Presiona "Comenzar" para iniciar';
  container.appendChild(statusMsg);

  // Round display
  const roundDisplay = document.createElement("div");
  roundDisplay.className = "banquete-round";
  roundDisplay.id = "banqueteRound";
  roundDisplay.textContent = `Producto: --`;
  container.appendChild(roundDisplay);

  // Speaker icon (order display)
  const orderDisplay = document.createElement("div");
  orderDisplay.className = "banquete-order";
  orderDisplay.id = "banqueteOrder";
  orderDisplay.textContent = "Escucha la orden...";
  container.appendChild(orderDisplay);

  // Start button
  const startBtn = document.createElement("button");
  startBtn.className = "primary-btn banquete-start-btn";
  startBtn.id = "banqueteStartBtn";
  startBtn.textContent = "¡Comenzar!";
  startBtn.addEventListener("click", () => {
    startBanqueteRound(sub);
    startBtn.hidden = true;
  });
  container.appendChild(startBtn);

  // Store cleanup reference
  state.banquete.cleanup = () => {
    if (state.banquete.beltInterval) {
      clearInterval(state.banquete.beltInterval);
      state.banquete.beltInterval = null;
    }
    if (state.banquete.beltRAF) {
      cancelAnimationFrame(state.banquete.beltRAF);
      state.banquete.beltRAF = null;
    }
    if (state.banquete.spawnTimeout) {
      clearTimeout(state.banquete.spawnTimeout);
      state.banquete.spawnTimeout = null;
    }
    // Remove all product elements
    document.querySelectorAll(".banquete-label").forEach((el) => el.remove());
    state.banquete.products = [];
    state.banquete.productIndex = 0;
  };

  activityWorkspace.appendChild(container);
}

/**
 * Start the infinite belt and the first round
 */
function startBanqueteRound(sub) {
  const banquete = state.banquete;
  if (!banquete || banquete.phase === "done") return;

  // Clean up any existing belt from previous round FIRST
  if (banquete.cleanup) banquete.cleanup();

  // Pick a random word for this round
  const pick = banquete.words[Math.floor(Math.random() * banquete.words.length)];
  banquete.currentWord = pick;
  banquete.phase = "playing";

  // Update UI
  const statusMsg = document.getElementById("banqueteStatus");
  if (statusMsg) statusMsg.textContent = "Escuchando...";

  const roundDisplay = document.getElementById("banqueteRound");
  if (roundDisplay) roundDisplay.textContent = `Producto: ???`;

  const orderDisplay = document.getElementById("banqueteOrder");
  if (orderDisplay) orderDisplay.textContent = "¡Escucha atentamente!";

  // Reset selection
  state.banquete.selectedLabel = null;
  state.selectedAnswer = null;

  // Start the infinite belt spawning products
  startBanqueteBelt(sub);

  // Play the word audio
  const audio = new Audio(pick.audio);
  safePlayAudio(audio, () => {
    // Audio ended — switch to answering phase
    banquete.phase = "answering";
    const statusMsg = document.getElementById("banqueteStatus");
    if (statusMsg) statusMsg.textContent = "¿Qué producto pidió el cliente? ¡Haz clic en la etiqueta correcta!";

    const orderDisplay = document.getElementById("banqueteOrder");
    if (orderDisplay) {
      orderDisplay.innerHTML = "";
      if (pick.image) {
        const orderImg = document.createElement("img");
        orderImg.className = "banquete-order-image";
        orderImg.src = pick.image;
        orderImg.alt = pick.label;
        orderImg.draggable = false;
        orderDisplay.appendChild(orderImg);
      } else {
        orderDisplay.textContent = `"${pick.label}"`;
      }
    }

    const roundDisplay = document.getElementById("banqueteRound");
    if (roundDisplay) roundDisplay.textContent = `Producto: ${pick.label}`;
  });
}

/**
 * Spawn products infinitely: LECHE → PAN → SOPA → LECHE → ...
 * Products move from right to left and disappear at the checkout line.
 */
function startBanqueteBelt(sub) {
  const banquete = state.banquete;
  if (!banquete) return;

  const belt = document.getElementById("banqueteBelt");
  if (!belt) return;

const BELT_WIDTH = belt.parentElement.clientWidth || 700;
  const PRODUCT_WIDTH = 180;
  const SPAWN_INTERVAL = 3500; // ms between spawns — ensures ~250px gap between products
  const SPEED = 1.5; // pixels per frame (~90px/s at 60fps)
  const CHECKOUT_X = 80; // checkout line position (left)

  // Cleanup any existing belt loop
  if (banquete.beltInterval) {
    clearInterval(banquete.beltInterval);
  }
  if (banquete.beltRAF) {
    cancelAnimationFrame(banquete.beltRAF);
  }
  banquete.products = [];
  banquete.productIndex = 0;

  // Product label order: LECHE (index 0), PAN (index 1), SOPA (index 2) — repeat
  const productLabels = sub.words.map((w) => w.label);
  let nextProductIdx = 0;

  /**
   * Create a new product element and add it to the belt
   */
  function spawnProduct() {
    if (banquete.phase === "done") return;

    const label = productLabels[nextProductIdx % productLabels.length];
    nextProductIdx++;

    const el = document.createElement("button");
    el.type = "button";
    el.className = "banquete-label";
    el.dataset.label = label;
    el.style.left = `${BELT_WIDTH}px`;

    // Use the product image (pan.png, sopa.png, leche.png) instead of text
    const word = sub.words.find((w) => w.label === label);
    const imgPath = word?.image;
    if (imgPath) {
      el.classList.add("has-image");
      const img = document.createElement("img");
      img.className = "banquete-label-image";
      img.src = imgPath;
      img.alt = label;
      img.draggable = false;
      el.appendChild(img);
    } else {
      el.textContent = label;
    }

    // Click handler for answering
    el.addEventListener("click", (e) => {
      if (banquete.phase !== "answering") return;
      // Deselect others
      document.querySelectorAll(".banquete-label").forEach((l) => l.classList.remove("selected-banquete"));
      el.classList.add("selected-banquete");
      banquete.selectedLabel = label;
      state.selectedAnswer = label;
      // Auto-check
      checkBanqueteAnswer();
    });

    belt.appendChild(el);

    const product = {
      el: el,
      x: BELT_WIDTH,
      label: label,
      alive: true
    };

    banquete.products.push(product);
  }

// Spawn first product immediately; let the interval handle the rest evenly spaced
  spawnProduct();

  // Spawn new products periodically
  banquete.beltInterval = setInterval(() => {
    if (banquete.phase === "done") return;
    spawnProduct();
  }, SPAWN_INTERVAL);

  /**
   * Animation loop — move all products left
   */
  function animateBelt() {
    if (banquete.phase === "done") {
      // Clean all products
      banquete.products.forEach((p) => {
        if (p.el && p.el.parentNode) p.el.remove();
      });
      banquete.products = [];
      return;
    }

    banquete.beltRAF = requestAnimationFrame(animateBelt);

    for (let i = banquete.products.length - 1; i >= 0; i--) {
      const p = banquete.products[i];
      if (!p.alive) continue;

      p.x -= SPEED;

      // Check if product has crossed the checkout line (disappear)
      if (p.x + PRODUCT_WIDTH < CHECKOUT_X) {
        p.alive = false;
        if (p.el && p.el.parentNode) {
          p.el.classList.add("tagged-out");
          setTimeout(() => {
            if (p.el && p.el.parentNode) p.el.remove();
          }, 400);
        }
        banquete.products.splice(i, 1);
        continue;
      }

      // Update position
      if (p.el) {
        p.el.style.left = `${p.x}px`;
      }
    }
  }

  // Start animation loop
  banquete.beltRAF = requestAnimationFrame(animateBelt);
}

/**
 * Check the user's answer in the banquete activity
 */
function checkBanqueteAnswer() {
  const banquete = state.banquete;
  if (!banquete || banquete.phase !== "answering" || banquete.selectedLabel === null) return;

  const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
  const isCorrect = banquete.selectedLabel === banquete.currentWord.label;

  if (isCorrect) {
    banquete.correctCount++;
    banquete.round++;
    playTone("success");

    // Check if all rounds completed
    if (banquete.round >= banquete.totalRounds) {
      banquete.phase = "done";
      feedback.className = "feedback ok";
      feedback.textContent = sub.success + " ¡Has completado esta actividad!";
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      celebrateConfetti();

      const statusMsg = document.getElementById("banqueteStatus");
      if (statusMsg) statusMsg.textContent = "¡Banquete servido! Todos los productos cobrados.";

      // Cleanup belt
      if (banquete.cleanup) banquete.cleanup();

      // Play correct sound + feedback, then return to map
      playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
        openActivity(state.activeUnit.id);
      });
      return;
    }

    // Move to next round
    feedback.className = "feedback ok";
    feedback.textContent = `¡Correcto! Cobraste "${banquete.currentWord.label}". Prepárate para el siguiente.`;

    const statusMsg = document.getElementById("banqueteStatus");
    if (statusMsg) statusMsg.textContent = `¡Bien! Siguiente producto...`;

    const orderDisplay = document.getElementById("banqueteOrder");
    if (orderDisplay) orderDisplay.textContent = " Nueva orden...";

    // Auto-start next round after a short delay
    // Belt keeps running continuously — just pick a new word
    setTimeout(() => {
      startBanqueteRound(sub);
    }, 2000);

  } else {
    // Wrong answer
    playTone("error");
    feedback.className = "feedback try";
    feedback.textContent = `¡Ese no es! Pedían "${banquete.currentWord.label}". Busca la etiqueta correcta en la cinta.`;

    // Reset selection
    state.banquete.selectedLabel = null;
    state.selectedAnswer = null;
    document.querySelectorAll(".banquete-label").forEach((l) => l.classList.remove("selected-banquete"));
  }
}

/* =============================================
   MENSAJE ACTIVITY — True/False word matching
   ============================================= */
function renderMensajeActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "mensaje-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "mensaje-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Initialize game state
  state.mensaje = {
    phase: "playing", // playing → answering
    writtenWord: sub.writtenWord,
    audioFile: sub.audioFile,
    correctAnswer: sub.answer
  };

  // Card with written word
  const card = document.createElement("div");
  card.className = "mensaje-card";
  card.id = "mensajeCard";
  card.innerHTML = `<span class="mensaje-card-word">${sub.writtenWord}</span>`;
  container.appendChild(card);

  // Listen button
  const listenBtn = document.createElement("button");
  listenBtn.className = "primary-btn mensaje-listen-btn";
  listenBtn.id = "mensajeListenBtn";
  listenBtn.textContent = "Escuchar";
  listenBtn.addEventListener("click", () => {
    const audio = new Audio(sub.audioFile);
    safePlayAudio(audio);
  });
  container.appendChild(listenBtn);

  // True / False buttons
  const buttonsRow = document.createElement("div");
  buttonsRow.className = "mensaje-buttons";

  const trueBtn = document.createElement("button");
  trueBtn.className = "mensaje-btn mensaje-true";
  trueBtn.id = "mensajeTrue";
  trueBtn.textContent = "✓ Coincide";
  trueBtn.dataset.value = "si";
  trueBtn.addEventListener("click", () => {
    if (state.mensaje.phase !== "playing") return;
    state.mensaje.phase = "answering";
    document.querySelectorAll(".mensaje-btn").forEach((b) => b.classList.remove("selected-mensaje"));
    trueBtn.classList.add("selected-mensaje");
    state.selectedAnswer = "si";
    checkMensajeAnswer();
  });

  const falseBtn = document.createElement("button");
  falseBtn.className = "mensaje-btn mensaje-false";
  falseBtn.id = "mensajeFalse";
  falseBtn.textContent = "✗ No coincide";
  falseBtn.dataset.value = "no";
  falseBtn.addEventListener("click", () => {
    if (state.mensaje.phase !== "playing") return;
    state.mensaje.phase = "answering";
    document.querySelectorAll(".mensaje-btn").forEach((b) => b.classList.remove("selected-mensaje"));
    falseBtn.classList.add("selected-mensaje");
    state.selectedAnswer = "no";
    checkMensajeAnswer();
  });

  buttonsRow.appendChild(trueBtn);
  buttonsRow.appendChild(falseBtn);
  container.appendChild(buttonsRow);

  activityWorkspace.appendChild(container);
}

function checkMensajeAnswer() {
  if (!state.mensaje || state.mensaje.phase !== "answering" || !state.selectedAnswer) return;

  const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
  const isCorrect = state.selectedAnswer === sub.answer;

  if (isCorrect) {
    state.mensaje.phase = "done";
    feedback.className = "feedback ok";
    feedback.textContent = sub.success + " ¡Has completado esta actividad!";
    completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
    playTone("success");
    celebrateConfetti();

    // Play correct sound + feedback, then return to map
    playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
      openActivity(state.activeUnit.id);
    });
  } else {
    // Wrong — let them try again
    playTone("error");
    feedback.className = "feedback try";
    feedback.textContent = sub.hint || "Intenta de nuevo. Escucha otra vez la palabra.";
    state.mensaje.phase = "playing";
    state.selectedAnswer = null;
    document.querySelectorAll(".mensaje-btn").forEach((b) => b.classList.remove("selected-mensaje"));
  }
}

/* =============================================
   PASAJE ACTIVITY — Hidden passage sentence reordering
   ============================================= */
function renderPasajeActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "pasaje-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "pasaje-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset sequence for this activity
  state.sequenceAnswer = [];

  // Listen button for the full sentence
  const listenBtn = document.createElement("button");
  listenBtn.className = "primary-btn pasaje-listen-btn";
  listenBtn.id = "pasajeListenBtn";
  listenBtn.textContent = "Escuchar oración";
  listenBtn.addEventListener("click", () => {
    const audio = new Audio(sub.sentenceAudio);
    safePlayAudio(audio);
  });
  container.appendChild(listenBtn);

  // Sentence strip: slots to place words left-to-right
  const strip = document.createElement("div");
  strip.className = "pasaje-strip";
  strip.id = "pasajeStrip";

  sub.answer.forEach((_, i) => {
    const slot = document.createElement("div");
    slot.className = "pasaje-slot";
    slot.id = `pasajeSlot${i}`;
    slot.dataset.index = i;
    slot.textContent = "___";
    strip.appendChild(slot);
  });

  container.appendChild(strip);

  // Hint
  const hint = document.createElement("p");
  hint.className = "pasaje-hint";
  hint.id = "pasajeHint";
  hint.textContent = "Presiona el botón Escuchar, luego haz clic en las palabras en el orden en que las escuchaste.";
  container.appendChild(hint);

  // Word cards (shuffled — NEVER in the correct order)
  const cardsRow = document.createElement("div");
  cardsRow.className = "pasaje-cards";

  // Store card references for undo
  const cardMap = {};

  // Shuffle until the order is different from the answer
  let shuffled;
  do {
    shuffled = [...sub.words].sort(() => Math.random() - 0.5);
  } while (shuffled.every((w, i) => w === sub.answer[i]));

  shuffled.forEach((word) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pasaje-card";
    card.textContent = word;
    card.dataset.word = word;
    cardMap[word] = card;

    card.addEventListener("click", () => {
      // If card already placed — ignore
      if (card.classList.contains("used")) return;

      const nextIndex = state.sequenceAnswer.length;
      const total = sub.answer.length;

      // All slots filled?
      if (nextIndex >= total) return;

      // Play the word sound
      const soundPath = sub.wordSounds?.[word];
      if (soundPath) {
        const audio = new Audio(soundPath);
        safePlayAudio(audio);
      }

      // Place in slot
      const slot = document.getElementById(`pasajeSlot${nextIndex}`);
      if (slot) {
        slot.textContent = word;
        slot.classList.add("filled");
        slot.dataset.word = word;
      }

      card.classList.add("used");
      state.sequenceAnswer.push(word);

      // Update hint
      const hint = document.getElementById("pasajeHint");
      if (hint) {
        if (state.sequenceAnswer.length < total) {
          hint.textContent = `Colocaste "${word}". Sigue con la siguiente palabra.`;
        } else {
          hint.textContent = "¡Todas las palabras colocadas! Presiona Revisar.";
        }
      }

      playTone("tap");
    });

    cardsRow.appendChild(card);
  });

  container.appendChild(cardsRow);

  // Slots ARE clickable — clicking a filled slot returns the word to its card
  sub.answer.forEach((_, i) => {
    const slot = container.querySelector(`#pasajeSlot${i}`);
    if (!slot) return;
    slot._listenerAttached = slot._listenerAttached || false;
    if (slot._listenerAttached) return;
    slot._listenerAttached = true;

    slot.addEventListener("click", (e) => {
      e.stopPropagation();
      const lastIndex = state.sequenceAnswer.length - 1;
      if (lastIndex < 0) return;
      // Only the last filled slot can be undone
      const dataIdx = parseInt(slot.dataset.index);
      if (dataIdx !== lastIndex) return;
      // Must have content
      if (!slot.classList.contains("filled")) return;

      const word = slot.textContent.trim();
      // Clear slot
      slot.textContent = "___";
      slot.classList.remove("filled");
      delete slot.dataset.word;

      // Restore card
      const card = cardMap[word];
      if (card) {
        card.classList.remove("used");
      }

      state.sequenceAnswer.pop();

      const hint = container.querySelector("#pasajeHint");
      if (hint) {
        hint.textContent = `Quitaste "${word}". Puedes volver a elegir otra palabra.`;
      }

      playTone("tap");
    });
  });

  activityWorkspace.appendChild(container);
}

/* =============================================
   PALABRA OCULTA ACTIVITY — Typewriter hidden word (Ahorcado simplificado por teclado)
   ============================================= */
function renderPalabraOcultaActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "palabra-oculta-container";

  // Initialize or reset state
  state.palabraOculta = {
    typedLetters: [],
    phase: "playing"
  };

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "palabra-oculta-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Riddle / hint display
  const riddle = document.createElement("p");
  riddle.className = "palabra-oculta-riddle";
  riddle.textContent = sub.prompt;
  container.appendChild(riddle);

  // Word display: slots for each letter
  const wordDisplay = document.createElement("div");
  wordDisplay.className = "palabra-oculta-word";
  wordDisplay.id = "palabraOcultaWord";

  sub.letters.forEach((letter, i) => {
    const slot = document.createElement("span");
    slot.className = "palabra-oculta-slot";
    slot.id = `palabraOcultaSlot${i}`;
    slot.dataset.index = i;
    slot.dataset.letter = letter;
    slot.textContent = "_";
    wordDisplay.appendChild(slot);
  });

  container.appendChild(wordDisplay);

  // Hint
  const hint = document.createElement("p");
  hint.className = "palabra-oculta-hint";
  hint.id = "palabraOcultaHint";
  hint.textContent = "Escribe la palabra con tu teclado. Presiona G, A, T, O para formar la palabra.";
  container.appendChild(hint);

  activityWorkspace.appendChild(container);

  // Auto-focus a hidden input so keyboard works on mobile too
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.className = "palabra-oculta-hidden-input";
  hiddenInput.id = "palabraOcultaInput";
  hiddenInput.autocomplete = "off";
  hiddenInput.autocorrect = "off";
  hiddenInput.spellcheck = false;
  hiddenInput.setAttribute("inputmode", "none");
  container.appendChild(hiddenInput);

  // Listen for keyboard presses — always on the hidden input or document
  function onKeyDown(e) {
    if (state.palabraOculta.phase !== "playing") return;

    // Handle Backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = state.palabraOculta.typedLetters;
      if (arr.length === 0) return;

      // Remove last typed letter
      const removedIndex = arr.length - 1;
      arr.pop();

      // Clear the slot
      const slot = document.getElementById(`palabraOcultaSlot${removedIndex}`);
      if (slot) {
        slot.textContent = "_";
        slot.classList.remove("revealed");
      }

      // Update hint
      if (hint) {
        const remaining = sub.letters.length - arr.length;
        hint.textContent = `Borraste la última letra. Te faltan ${remaining} letra(s).`;
      }

      playTone("tap");
      return;
    }

    // Only accept letters that are in the word
    const key = e.key.toUpperCase();
    if (!sub.letters.includes(key)) return;

    e.preventDefault();

    // Check if we still have space
    const maxLength = sub.letters.length;
    if (state.palabraOculta.typedLetters.length >= maxLength) return;

    const nextIndex = state.palabraOculta.typedLetters.length;

    // Reveal the slot with the pressed letter
    const slot = document.getElementById(`palabraOcultaSlot${nextIndex}`);
    if (slot) {
      slot.textContent = key;
      slot.classList.add("revealed");
    }

    state.palabraOculta.typedLetters.push(key);

    playTone("tap");

    // Check if all slots are filled
    const currentText = state.palabraOculta.typedLetters.join("");
    if (currentText.length >= sub.letters.length) {
      // Compare with the answer
      if (currentText === sub.answer) {
        // Correct! Auto-complete
        state.palabraOculta.phase = "done";
        state.selectedAnswer = sub.answer;
        if (hint) hint.textContent = "¡Palabra completa!";

        feedback.className = "feedback ok";
        feedback.textContent = `${sub.success} ¡Has completado esta actividad!`;
        completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
        playTone("success");
        celebrateConfetti();

        // Play correct sound + feedback, then return to map
        playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
          openActivity(state.activeUnit.id);
        });
      } else {
        // Wrong word — allow backspace to fix
        if (hint) hint.textContent = "Revisa bien. Puedes borrar con Backspace e intentar de nuevo.";
      }
    } else {
      const remaining = sub.letters.length - state.palabraOculta.typedLetters.length;
      if (hint) hint.textContent = `¡Bien! Llevas ${state.palabraOculta.typedLetters.length} letra(s). Te faltan ${remaining}.`;
    }
  }

  document.addEventListener("keydown", onKeyDown);

  // Focus the hidden input so keyboard works
  setTimeout(() => hiddenInput.focus(), 200);

  // Also refocus if user clicks anywhere in the container
  container.addEventListener("click", () => {
    hiddenInput.focus();
  });

  // Store cleanup
  state.palabraOcultaCleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
  };
}

/* =============================================
   PERGAMINO ACTIVITY — Keyboard writing practice
   ============================================= */
function renderPergaminoActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "pergamino-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "pergamino-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Support image (e.g. sol.png)
  const imageWrapper = document.createElement("div");
  imageWrapper.className = "pergamino-image-wrapper";
  const img = document.createElement("img");
  img.className = "pergamino-image";
  img.src = sub.image;
  img.alt = sub.word;
  img.draggable = false;
  imageWrapper.appendChild(img);
  container.appendChild(imageWrapper);

  // Scroll / parchment paper input area
  const scroll = document.createElement("div");
  scroll.className = "pergamino-scroll";

  const scrollLabel = document.createElement("p");
  scrollLabel.className = "pergamino-label";
  scrollLabel.textContent = "Escribe la palabra aquí:";
  scroll.appendChild(scrollLabel);

  const inputRow = document.createElement("div");
  inputRow.className = "pergamino-input-row";

  const input = document.createElement("input");
  input.className = "pergamino-input";
  input.id = "pergaminoInput";
  input.type = "text";
  input.placeholder = "Escribe...";
  input.autocomplete = "off";
  input.autofocus = true;
  input.maxLength = 10;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      state.selectedAnswer = input.value.trim();
      checkAnswer();
    }
  });
  inputRow.appendChild(input);

  const sendBtn = document.createElement("button");
  sendBtn.className = "primary-btn pergamino-send-btn";
  sendBtn.type = "button";
  sendBtn.textContent = "Enviar";
  sendBtn.addEventListener("click", () => {
    state.selectedAnswer = input.value.trim();
    checkAnswer();
  });
  inputRow.appendChild(sendBtn);

  scroll.appendChild(inputRow);

  // Letter count hint
  const letterHint = document.createElement("p");
  letterHint.className = "pergamino-letter-hint";
  letterHint.textContent = `La palabra tiene ${sub.word.length} letras.`;
  scroll.appendChild(letterHint);

  container.appendChild(scroll);

  activityWorkspace.appendChild(container);

  // Focus the input after rendering
  setTimeout(() => input.focus(), 300);
}

/* =============================================
   ORACION ACTIVITY (Unidad 2) — "El gato toma de la ___"
   ============================================= */
function renderOracionActivity(sub) {
  const container = document.createElement("div");
  container.className = "oracion-container";

  // Scene with gato video (starts paused on the first frame and plays
  // exactly once when the activity is completed correctly, like the
  // monkey video in the Puente activity).
  const scene = document.createElement("div");
  scene.className = "oracion-scene";
  scene.id = "oracionScene";

  const gatoVideo = document.createElement("video");
  gatoVideo.className = "oracion-gato-video";
  gatoVideo.id = "oracionVideo";
  gatoVideo.src = sub.video || "assets/videos/gato_video.mp4";
  gatoVideo.muted = true;
  gatoVideo.playsInline = true;
  gatoVideo.setAttribute("playsinline", "");
  gatoVideo.setAttribute("webkit-playsinline", "");
  gatoVideo.setAttribute("muted", "");
  gatoVideo.preload = "auto";
  gatoVideo.removeAttribute("controls");
  gatoVideo.style.pointerEvents = "none";
  // No autoplay and no loop: the video stays paused showing the first frame
  // and plays exactly once when the activity is completed correctly.
  gatoVideo.autoplay = false;
  gatoVideo.loop = false;

  scene.appendChild(gatoVideo);
  container.appendChild(scene);

  // Sentence display: prefix + blank
  const sentence = document.createElement("div");
  sentence.className = "oracion-sentence";
  sentence.innerHTML = `<span>${sub.prefix}</span> <span class="oracion-blank" id="oracionBlank">___</span>`;
  container.appendChild(sentence);

  // Options
  const optionsRow = document.createElement("div");
  optionsRow.className = "oracion-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "oracion-option";
    btn.dataset.label = option.label;
    const imageValue = option.image || option.icon || "";
    const isImage = typeof imageValue === "string" && (imageValue.includes(".") || imageValue.startsWith("data:") || imageValue.startsWith("http"));
    btn.innerHTML = isImage
      ? `<span class="oracion-option-icon"><img src="${imageValue}" alt="${option.label}" class="oracion-option-img" /></span><span class="oracion-option-label">${option.label}</span>`
      : `<span class="oracion-option-emoji">${imageValue}</span><span class="oracion-option-label">${option.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".oracion-option").forEach((b) => b.classList.remove("selected-oracion"));
      btn.classList.add("selected-oracion");
      state.selectedAnswer = option.label;
      const blank = document.getElementById("oracionBlank");
      if (blank) {
        blank.textContent = option.label;
        blank.classList.add("filled-oracion");
      }
      playTone("tap");
      playOptionSound(option.label);
    });
    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

/* =============================================
   PUENTE ACTIVITY (Unidad 2) — "El mono come una ___"
   ============================================= */
function renderPuenteActivity(sub) {
  const container = document.createElement("div");
  container.className = "puente-container";

  // Scene with monkey video (starts paused, shows first frame, plays once on success)
  const scene = document.createElement("div");
  scene.className = "puente-scene";
  scene.id = "puenteScene";

  const monkeyVideo = document.createElement("video");
  monkeyVideo.className = "puente-monkey-video";
  monkeyVideo.id = "puenteMonkey";
  monkeyVideo.src = "assets/videos/mono_video.mp4";
  monkeyVideo.muted = true;
  monkeyVideo.playsInline = true;
  monkeyVideo.setAttribute("playsinline", "");
  monkeyVideo.setAttribute("webkit-playsinline", "");
  monkeyVideo.setAttribute("muted", "");
  monkeyVideo.preload = "auto";
  monkeyVideo.removeAttribute("controls");
  monkeyVideo.style.pointerEvents = "none";
  // No autoplay and no loop: the video stays paused on the first frame and
  // plays exactly once when the activity is completed correctly.
  monkeyVideo.autoplay = false;
  monkeyVideo.loop = false;

  scene.appendChild(monkeyVideo);
  container.appendChild(scene);

  // Sentence display
  const sentence = document.createElement("div");
  sentence.className = "puente-sentence";
  sentence.innerHTML = `<span>${sub.prefix}</span> <span class="puente-blank" id="puenteBlank">___</span>`;
  container.appendChild(sentence);

  // Options
  const optionsRow = document.createElement("div");
  optionsRow.className = "puente-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "puente-option";
    btn.dataset.label = option.label;
    const imageValue = option.image || option.icon || "";
    const isImage = typeof imageValue === "string" && (imageValue.includes(".") || imageValue.startsWith("data:") || imageValue.startsWith("http"));
    btn.innerHTML = isImage
      ? `<span class="puente-option-icon"><img src="${imageValue}" alt="${option.label}" class="puente-option-img" /></span><span class="puente-option-label">${option.label}</span>`
      : `<span class="puente-option-emoji">${imageValue}</span><span class="puente-option-label">${option.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".puente-option").forEach((b) => b.classList.remove("selected-puente"));
      btn.classList.add("selected-puente");
      state.selectedAnswer = option.label;
      const blank = document.getElementById("puenteBlank");
      if (blank) {
        blank.textContent = option.label;
        blank.classList.add("filled-puente");
      }
      playTone("tap");
      playOptionSound(option.label);
    });
    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

/* =============================================
   FRASE ACTIVITY (Unidad 2) — Drag the completing sentence
   ============================================= */
function renderFraseActivity(sub) {
  const container = document.createElement("div");
  container.className = "frase-container";

  // Cuento image (libro) shown above the story paragraph
  const image = document.createElement("img");
  image.className = "frase-image";
  image.src = sub.image || "assets/images/unit_2/libro.png";
  image.alt = "Libro";
  image.draggable = false;
  container.appendChild(image);

  // Story paragraph
  const paragraph = document.createElement("div");
  paragraph.className = "frase-paragraph";
  paragraph.id = "fraseParagraph";
  paragraph.textContent = sub.story;
  container.appendChild(paragraph);

  // Drop zone (blank)
  const dropZone = document.createElement("div");
  dropZone.className = "frase-dropzone";
  dropZone.id = "fraseDropZone";
  dropZone.textContent = "Arrastra aquí la frase que completa la idea…";
  container.appendChild(dropZone);

  // Options: one of them is a draggable box
  const optionsRow = document.createElement("div");
  optionsRow.className = "frase-options";

  sub.options.forEach((option) => {
    const box = document.createElement("div");
    box.className = "frase-option";
    box.dataset.frase = option;
    box.textContent = option;
    box.draggable = true;
    box.tabIndex = 0;

    box.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", option);
      box.classList.add("dragging-frase");
    });
    box.addEventListener("dragend", () => box.classList.remove("dragging-frase"));
    box.addEventListener("click", () => {
      // Fallback for touch: click = place into drop zone
      placeFrase(sub, option, box);
    });
    optionsRow.appendChild(box);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over-frase");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over-frase"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over-frase");
    const frase = e.dataTransfer.getData("text/plain");
    const box = [...optionsRow.querySelectorAll(".frase-option")].find((b) => b.dataset.frase === frase);
    placeFrase(sub, frase, box);
  });

  // Clicking the placed phrase returns it to its place among the options
  dropZone.addEventListener("click", () => {
    if (state.frasePlaced) {
      returnFrase(sub);
    }
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

function placeFrase(sub, frase, box) {
  const dropZone = document.getElementById("fraseDropZone");
  const paragraph = document.getElementById("fraseParagraph");
  if (!dropZone || !paragraph) return;
  if (state.frasePlaced) return; // already placed

  state.frasePlaced = { frase, box };
  dropZone.dataset.placed = "true";
  dropZone.textContent = frase;
  dropZone.classList.add("placed-frase");
  dropZone.title = "Haz clic aquí para devolver la frase a su lugar";

  // Mark the chosen box and disable the others
  document.querySelectorAll(".frase-option").forEach((b) => {
    b.draggable = false;
    b.style.pointerEvents = "none";
    b.classList.add("used-frase");
  });
  if (box) box.classList.add("chosen-frase");

  // Update paragraph with completed sentence
  paragraph.textContent = sub.story + " " + frase;

  state.selectedAnswer = frase;
  playTone("tap");
  playOptionSound(frase);
}

function returnFrase(sub) {
  const dropZone = document.getElementById("fraseDropZone");
  const paragraph = document.getElementById("fraseParagraph");
  if (!dropZone || !paragraph) return;
  if (!state.frasePlaced) return;

  // Restore the placeholder and drop zone styles
  state.frasePlaced = null;
  delete dropZone.dataset.placed;
  dropZone.textContent = "Arrastra aquí la frase que completa la idea…";
  dropZone.classList.remove("placed-frase");
  dropZone.title = "";

  // Re-enable all option boxes
  document.querySelectorAll(".frase-option").forEach((b) => {
    b.draggable = true;
    b.style.pointerEvents = "";
    b.classList.remove("used-frase", "chosen-frase");
  });

  // Restore the original story paragraph
  paragraph.textContent = sub.story;

  state.selectedAnswer = null;
  playTone("tap");
}

/* =============================================
   DETECTIVE ACTIVITY (Unidad 2) — Visual clues
   ============================================= */
function renderDetectiveActivity(sub) {
  const container = document.createElement("div");
  container.className = "detective-container";

// Scene with the room image (replaces the emoji canvas)
  const scene = document.createElement("div");
  scene.className = "detective-scene";
  scene.id = "detectiveScene";

  const roomImage = document.createElement("img");
  roomImage.className = "detective-room-image";
  roomImage.src = sub.roomImage || "assets/images/unit_2/room.png";
  roomImage.alt = "Recámara";
  roomImage.draggable = false;

  scene.appendChild(roomImage);
  container.appendChild(scene);

  // Question
  const question = document.createElement("p");
  question.className = "detective-question";
  question.textContent = sub.question;
  container.appendChild(question);

  // Options
  const optionsRow = document.createElement("div");
  optionsRow.className = "detective-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "detective-option";
    btn.dataset.label = option.label;
    const imageValue = option.image || option.icon || "";
    const isImage = typeof imageValue === "string" && (imageValue.includes(".") || imageValue.startsWith("data:") || imageValue.startsWith("http"));
    btn.innerHTML = isImage
      ? `<span class="detective-option-icon"><img src="${imageValue}" alt="${option.label}" class="detective-option-img" /></span><span class="detective-option-label">${option.label}</span>`
      : `<span class="detective-option-emoji">${imageValue}</span><span class="detective-option-label">${option.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".detective-option").forEach((b) => b.classList.remove("selected-detective"));
      btn.classList.add("selected-detective");
      state.selectedAnswer = option.label;
      playTone("tap");
      playOptionSound(option.label);
    });
    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

/* =============================================
   ACCION ACTIVITY (Unidad 2) — "El niño está ___"
   ============================================= */
function renderAccionActivity(sub) {
  const container = document.createElement("div");
  container.className = "accion-container";

  // Animation scene: looping silent video
  const scene = document.createElement("div");
  scene.className = "accion-scene";
  scene.id = "accionScene";

  const video = document.createElement("video");
  video.className = "accion-video";
  video.id = "accionVideo";
  video.src = sub.video || "assets/videos/unit_2_activity_5.mp4";
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.removeAttribute("controls");
  video.preload = "auto";
  video.style.pointerEvents = "none";

  // Loading indicator shown while the video buffers
  const loading = document.createElement("div");
  loading.className = "accion-loading";
  loading.textContent = "Cargando...";
  scene.appendChild(loading);

  let bufferingTimer = null;
  let attempts = 0;

  function hideLoading() {
    if (bufferingTimer) {
      clearTimeout(bufferingTimer);
      bufferingTimer = null;
    }
    loading.style.opacity = "0";
    loading.style.pointerEvents = "none";
  }

  function showLoading() {
    loading.style.opacity = "1";
    loading.style.pointerEvents = "none";
  }

  // Start playback only when the whole (tiny) video can play through —
  // avoids the first-loop stutter that happened while frames were still
  // being fetched/decoded during an option click.
  video.addEventListener("canplaythrough", () => {
    hideLoading();
    video.play().catch(() => {});
  }, { once: true });

  video.addEventListener("loadeddata", () => {
    // If canplaythrough hasn't fired after a short while, start anyway.
    bufferingTimer = setTimeout(() => {
      hideLoading();
      video.play().catch(() => {});
    }, 1500);
  });

  // When the player is starving for frames, show a subtle indicator
  // instead of appearing frozen. It usually resolves by itself now that
  // the file is much lighter.
  video.addEventListener("waiting", showLoading);
  video.addEventListener("stalled", showLoading);
  video.addEventListener("playing", hideLoading);
  video.addEventListener("canplay", hideLoading);

  // If the video ever fails, retry up to 3 times with a small delay.
  video.addEventListener("error", () => {
    attempts++;
    if (attempts > 3) {
      hideLoading();
      loading.textContent = "";
      return;
    }
    showLoading();
    setTimeout(() => {
      video.load();
      video.play().catch(() => {});
    }, 600 * attempts);
  });

  scene.appendChild(video);
  container.appendChild(scene);

  // Sentence display
  const sentence = document.createElement("div");
  sentence.className = "accion-sentence";
  sentence.innerHTML = `<span>${sub.prefix}</span> <span class="accion-blank" id="accionBlank">___</span>`;
  container.appendChild(sentence);

  // Options
  const optionsRow = document.createElement("div");
  optionsRow.className = "accion-options";

  sub.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "accion-option";
    btn.dataset.label = option.label;
    const imageValue = option.image || option.icon || "";
    const isImage = typeof imageValue === "string" && (imageValue.includes(".") || imageValue.startsWith("data:") || imageValue.startsWith("http"));
    btn.innerHTML = isImage
      ? `<span class="accion-option-icon"><img src="${imageValue}" alt="${option.label}" class="accion-option-img" /></span><span class="accion-option-label">${option.label}</span>`
      : `<span class="accion-option-emoji">${imageValue}</span><span class="accion-option-label">${option.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accion-option").forEach((b) => b.classList.remove("selected-accion"));
      btn.classList.add("selected-accion");
      state.selectedAnswer = option.label;
      const blank = document.getElementById("accionBlank");
      if (blank) {
        blank.textContent = option.label;
        blank.classList.add("filled-accion");
      }
      playTone("tap");
      playOptionSound(option.label);
    });
    optionsRow.appendChild(btn);
  });

  container.appendChild(optionsRow);
  activityWorkspace.appendChild(container);
}

/* =============================================
   CAMALEON ACTIVITY (Unidad 2, act 6) — Encontrar palabras ocultas
   ============================================= */
function renderCamaleonActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "camaleon-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "camaleon-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset answer state
  state.sequenceAnswer = [];

  // Camaleon image (decorative scene)
  const scene = document.createElement("div");
  scene.className = "camaleon-scene";
  scene.id = "camaleonScene";
  const camaleonImg = document.createElement("img");
  camaleonImg.className = "camaleon-image";
  camaleonImg.src = sub.image || "assets/images/unit_2/camaleon.png";
  camaleonImg.alt = "Camaleón";
  camaleonImg.draggable = false;
  scene.appendChild(camaleonImg);
  container.appendChild(scene);

  // Word display
  const wordDisplay = document.createElement("div");
  wordDisplay.className = "camaleon-word";
  wordDisplay.id = "camaleonWord";
  wordDisplay.textContent = sub.longWord;
  container.appendChild(wordDisplay);

  // Targeted word hint
  const targetHint = document.createElement("p");
  targetHint.className = "camaleon-target";
  targetHint.textContent = `Busca la palabra: ${sub.target}`;
  container.appendChild(targetHint);

  // Letter tiles (in the order they appear in the long word)
  const tiles = document.createElement("div");
  tiles.className = "camaleon-tiles";

const palette = ["--pink", "--blue", "--mint", "--purple", "--orange", "--gold", "--teal", "--rose"];
  sub.letters.forEach((letter, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "camaleon-tile";
    tile.classList.add("camaleon-tile-swar");
    tile.dataset.index = i;
    tile.dataset.letter = letter.toLowerCase();
    tile.style.setProperty("--tile-color", `var(${palette[i % palette.length]})`);
    tile.style.setProperty("--swar-delay", `${i * 0.07}s`);
    tile.textContent = letter;
    tile.addEventListener("click", () => {
      // Already found
      if (tile.classList.contains("found")) return;
      // Expect the next letter of the target
      const expected = sub.target[state.sequenceAnswer.length];
      if (letter.toLowerCase() === expected.toLowerCase()) {
        tile.classList.add("found");
        tile.style.setProperty("--tile-color", "var(--gold)");
        state.sequenceAnswer.push(letter);
        playTone("tap");
        // Check if the whole target is found
        const found = state.sequenceAnswer.join("").toLowerCase();
        if (found === sub.target.toLowerCase()) {
          state.selectedAnswer = sub.target;
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          container.classList.add("camaleon-solved");
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          playTone("success");
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        } else {
          // Update the progress display
          const progressLetter = document.createElement("span");
          progressLetter.className = "camaleon-found-letter";
          progressLetter.textContent = letter;
          targetDisplay.appendChild(progressLetter);
        }
      } else {
        // Wrong letter — shake
        tile.classList.add("shake");
        setTimeout(() => tile.classList.remove("shake"), 400);
        playTone("error");
      }
    });
    tiles.appendChild(tile);
  });

  container.appendChild(tiles);

  // Progress display (found letters)
  const targetDisplay = document.createElement("div");
  targetDisplay.className = "camaleon-progress";
  targetDisplay.id = "camaleonProgress";
  targetDisplay.textContent = "Progreso: ";
  container.appendChild(targetDisplay);

  activityWorkspace.appendChild(container);
}

/* =============================================
   GRANJA ACTIVITY (Unidad 2, act 7) — Palabras en la Granja
   ============================================= */
function renderGranjaActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "granja-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "granja-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

// Scene uses the granja.png image as the background. A single purple
  // clickable button is overlaid on the sign hidden behind the tree.
  // The button is the ONLY correct answer (target word).
  const scene = document.createElement("div");
  scene.className = "granja-scene";
  scene.id = "granjaScene";

  // Farm image background
  const granjaImg = document.createElement("img");
  granjaImg.className = "granja-image";
  granjaImg.src = sub.image || "assets/images/unit_2/granja.png";
  granjaImg.alt = "Granja";
  granjaImg.draggable = false;
  scene.appendChild(granjaImg);

// ============================================================
  // CONFIGURACIÓN DEL BOTÓN DEL PATO (actividad 7, Unidad 2)
  // ============================================================
  // Ajusta manualmente aquí estos valores:
  //
  //  - posX: posición horizontal en porcentaje (%).
  //          0 = borde izquierdo, 50 = centro, 100 = borde derecho.
  //  - posY: posición vertical en porcentaje (%).
  //          0 = arriba, 50 = centro, 100 = abajo.
  //  - color: color de fondo del botón (acepta cualquier color CSS,
  //           por ejemplo "#7c3aed", "purple", "rgb(255,0,0)", etc.)
  //  - size: tamaño del botón en píxeles (controla el texto y el área).
  //          Valor sugerido: 32.
  const botonPato = {
    posX: 60,     // % horizontal
    posY: 52,     // % vertical
    color: "#00000000", // color de fondo
    size:1// tamaño (px)
  };

  // Botón clickeable posicionado sobre el letrero del pato.
  const signBtn = document.createElement("button");
  signBtn.type = "button";
  signBtn.className = "granja-sign granja-target-btn";
  signBtn.dataset.word = sub.target;
  signBtn.style.left = `${botonPato.posX}%`;
  signBtn.style.top = `${botonPato.posY}%`;
  signBtn.style.setProperty("--pato-color", botonPato.color);
  signBtn.style.setProperty("--pato-size", `${botonPato.size}px`);
  signBtn.title = "Haz clic en el letrero del pato";
  signBtn.innerHTML = `<span class="granja-sign-word">${sub.target}</span>`;
  signBtn.addEventListener("click", () => {
    // Already solved
    if (signBtn.classList.contains("revealed")) return;
    signBtn.classList.add("revealed");
    playTone("tap");
    state.selectedAnswer = sub.target;
    feedback.className = "feedback ok";
    feedback.textContent = sub.success;
    container.classList.add("granja-solved");
    completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
    playTone("success");
    celebrateConfetti();
    animateActivitySuccess(sub);

    const cuackSound = new Audio("assets/unit_2_sounds/theme1/cuack.mp3");

    playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
      safePlayAudio(cuackSound, () => {
        openActivity(state.activeUnit.id);
      });
    });
  });
  scene.appendChild(signBtn);

  container.appendChild(scene);

  const hint = document.createElement("p");
  hint.className = "granja-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   INSPECTOR ACTIVITY (Unidad 2, act 8) — El Inspector de Letras
   ============================================= */
function renderInspectorActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "inspector-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "inspector-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

// Inspector de Letras: read the paragraph and "seal" (stamp) each
  // occurrence of the target word (e.g. "sol"). Friendly animated chips.
  const scene = document.createElement("div");
  scene.className = "inspector-scene inspector-paper";
  scene.id = "inspectorScene";

  const titleBar = document.createElement("div");
  titleBar.className = "inspector-toolbar";
  titleBar.innerHTML = `<span class="inspector-search-icon">🔍</span><span class="inspector-search-label">Busca la palabra: <strong>${sub.target}</strong></span>`;
  scene.appendChild(titleBar);

  // Paragraph rendered as word chips so each word is a clickable container
  const paragraphBox = document.createElement("div");
  paragraphBox.className = "inspector-paragraph";
  paragraphBox.id = "inspectorParagraph";

  const words = String(sub.paragraph || "").split(/\s+/);
  let foundCount = 0;

  words.forEach((raw) => {
    const clean = raw.replace(/[.,;:!?¿¡]/g, "");
    const punctuation = raw.replace(clean, "");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "inspector-word-chip";
    chip.dataset.word = clean.toLowerCase();
    chip.textContent = clean;

    if (clean.toLowerCase() === sub.target.toLowerCase()) {
      chip.classList.add("is-target");
      chip.addEventListener("click", () => {
        if (chip.classList.contains("sealed")) return;
        chip.classList.add("sealed");
        foundCount++;
        playTone("tap");
        updateProgress();
        if (foundCount >= sub.need) {
          state.selectedAnswer = sub.need;
          scene.classList.add("inspector-solved");
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          playTone("success");
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      });
    }

    paragraphBox.appendChild(chip);
    if (punctuation) {
      const span = document.createElement("span");
      span.className = "inspector-punct";
      span.textContent = punctuation;
      paragraphBox.appendChild(span);
    }
    paragraphBox.appendChild(document.createTextNode(" "));
  });

  scene.appendChild(paragraphBox);

  // Progress counter
  const progress = document.createElement("div");
  progress.className = "inspector-progress";
  progress.id = "inspectorProgress";
  progress.textContent = `Selladas: 0 / ${sub.need}`;
  scene.appendChild(progress);

  function updateProgress() {
    progress.textContent = `Selladas: ${foundCount} / ${sub.need}`;
    if (foundCount > 0) progress.classList.add("has-progress");
  }

  container.appendChild(scene);

  const hint = document.createElement("p");
  hint.className = "inspector-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   FOCO ACTIVITY (Unidad 2, act 9) — La Linterna Mágica
   ============================================= */
function renderFocoActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "foco-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "foco-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset answer state
  state.sequenceAnswer = [];

  // Word display
  const wordDisplay = document.createElement("div");
  wordDisplay.className = "foco-word";
  wordDisplay.id = "focoWord";

  // Placeholder slots for the full word (e.g. Z A P A T O)
  const wordSlots = document.createElement("div");
  wordSlots.className = "foco-word-slots";
  wordSlots.id = "focoWordSlots";
  const fullWord = (sub.word || sub.answer.join("")).toUpperCase();
  [...fullWord].forEach((letter) => {
    const slot = document.createElement("span");
    slot.className = "foco-letter-slot";
    slot.textContent = "_";
    wordSlots.appendChild(slot);
  });
  wordDisplay.appendChild(wordSlots);
  container.appendChild(wordDisplay);

  // Dark room scene with a lamp (linterna) following the pointer.
  const scene = document.createElement("div");
  scene.className = "foco-scene foco-room";
  scene.id = "focoScene";

  // Dim image background (room2.png rendered dark/desaturated via CSS)
  const roomImg = document.createElement("div");
  roomImg.className = "foco-room-image";
  roomImg.style.backgroundImage = `url("assets/images/unit_2/room2.png")`;
  scene.appendChild(roomImg);

  // The lamp cursor (yellow aura that illuminates fragments near it)
  const lamp = document.createElement("div");
  lamp.className = "foco-lamp";
  lamp.id = "focoLamp";
  scene.appendChild(lamp);

  // Separate syllable boxes (za, pa, to) scattered around the dark scene.
  // They start dim; when the lamp is near, they light up and become clickable.
  const boxesWrap = document.createElement("div");
  boxesWrap.className = "foco-boxes";

  const positions = [
    { left: "18%", top: "30%" },
    { left: "55%", top: "18%" },
    { left: "38%", top: "62%" }
  ];

  sub.fragments.forEach((fragment, i) => {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "foco-box";
    box.dataset.fragment = fragment;
    box.dataset.index = i;
    box.textContent = fragment;
    box.style.left = positions[i % positions.length].left;
    box.style.top = positions[i % positions.length].top;

    box.addEventListener("click", () => {
      const expected = sub.answer[state.sequenceAnswer.length];
      if (!box.classList.contains("lit")) {
        // Not illuminated yet — invite the child to move the lamp closer
        box.classList.add("foco-nudge");
        setTimeout(() => box.classList.remove("foco-nudge"), 400);
        playTone("error");
        return;
      }
      if (box.classList.contains("used")) return;
      if (fragment === expected) {
        box.classList.add("used");
        state.sequenceAnswer.push(fragment);
        playTone("tap");
        // Reveal the matching letters in the word slots
        let filled = 0;
        for (let k = 0; k < state.sequenceAnswer.length; k++) {
          filled += sub.answer[k].length;
        }
        const revealed = state.sequenceAnswer.join("");
        const slots = wordSlots.querySelectorAll(".foco-letter-slot");
        slots.forEach((slot, idx) => {
          if (idx < revealed.length) {
            slot.textContent = revealed[idx];
            slot.classList.add("revealed");
          }
        });
        // Check if complete
        if (state.sequenceAnswer.join("") === sub.answer.join("")) {
          state.selectedAnswer = sub.answer;
          wordDisplay.classList.add("foco-word-complete");
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          playTone("success");
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      } else {
        // Wrong illuminated fragment — shake
        box.classList.add("shake");
        setTimeout(() => box.classList.remove("shake"), 400);
        playTone("error");
      }
    });

    boxesWrap.appendChild(box);
  });

  scene.appendChild(boxesWrap);

  // Move the lamp with the pointer/touch and light up boxes within range.
  let lastX = 0, lastY = 0;
  const litRadiusSq = 110 * 110;

function updateLamp(clientX, clientY) {
    const rect = scene.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    lastX = x; lastY = y;
    // The lamp is 220x220px and its base CSS uses translate(-50%,-50%),
    // so position it at the cursor and let the CSS center it on the pointer.
    lamp.style.left = x + "px";
    lamp.style.top = y + "px";
    lamp.classList.add("on");

    scene.querySelectorAll(".foco-box").forEach((box) => {
      const bx = parseFloat(box.style.left) * rect.width / 100;
      const by = parseFloat(box.style.top) * rect.height / 100;
      const dx = bx - x;
      const dy = by - y;
      if (dx * dx + dy * dy < litRadiusSq) {
        box.classList.add("lit");
      } else {
        box.classList.remove("lit");
      }
    });
  }

  scene.addEventListener("pointermove", (e) => updateLamp(e.clientX, e.clientY));
  scene.addEventListener("pointerdown", (e) => updateLamp(e.clientX, e.clientY));

  // Keep the lamp centered on first touch so it is visible immediately.
  setTimeout(() => {
    const rect = scene.getBoundingClientRect();
    updateLamp(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, 100);

  container.appendChild(scene);

  const hint = document.createElement("p");
  hint.className = "foco-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   LABERINTO ACTIVITY (Unidad 2, act 10) — El Laberinto del Conejo
   ============================================= */
function renderLaberintoActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "laberinto-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "laberinto-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  state.laberintoCorrect = 0;
  const target = (sub.target || "casa").toLowerCase();

  const board = document.createElement("div");
  board.className = "laberinto-board laberinto-path-board";
  board.id = "laberintoBoard";

  const startStone = document.createElement("div");
  startStone.className = "laberinto-start";
  startStone.innerHTML = '<span class="laberinto-start-label">Inicio</span>';
  board.appendChild(startStone);

  const rabbit = document.createElement("div");
  rabbit.className = "laberinto-rabbit";
  rabbit.textContent = "🐰";
  rabbit.style.left = "12%";
  rabbit.style.top = "10%";
  board.appendChild(rabbit);

  const rows = Array.isArray(sub.rows) && sub.rows.length ? sub.rows : (Array.isArray(sub.paths) ? [{ stones: sub.paths }] : []);
  const needed = Number(sub.needed || sub.answer || rows.length || 1);

  rows.forEach((row, rowIndex) => {
    const rowEl = document.createElement("div");
    rowEl.className = "laberinto-row";

    const stones = Array.isArray(row?.stones) ? row.stones : row || [];
    stones.forEach((stone) => {
      const stoneButton = document.createElement("button");
      stoneButton.type = "button";
      stoneButton.className = "laberinto-stone";
      const isCorrect = Boolean(stone.correct) || String(stone.word || "").toLowerCase() === target;
      stoneButton.dataset.correct = String(isCorrect);
      stoneButton.dataset.row = String(rowIndex);
      stoneButton.dataset.word = String(stone.word || "");
      stoneButton.innerHTML = `<span class="laberinto-stone-word">${stone.word}</span>`;

      stoneButton.addEventListener("click", () => {
        if (stoneButton.classList.contains("selected") || stoneButton.classList.contains("wrong")) return;
        const rowButtons = [...rowEl.querySelectorAll(".laberinto-stone")];
        if (rowButtons.some((btn) => btn.classList.contains("selected"))) return;

        if (isCorrect) {
          stoneButton.classList.add("selected");
          rowButtons.forEach((btn) => { btn.disabled = true; });
          state.laberintoCorrect++;
          playTone("success");
          rabbit.classList.add("hop");
          setTimeout(() => rabbit.classList.remove("hop"), 420);

          const boardRect = board.getBoundingClientRect();
          const stoneRect = stoneButton.getBoundingClientRect();
          const leftPercent = ((stoneRect.left - boardRect.left) + (stoneRect.width / 2)) / boardRect.width * 100;
          const topPercent = ((stoneRect.top - boardRect.top) + (stoneRect.height / 2)) / boardRect.height * 100;
          rabbit.style.left = `${Math.min(90, Math.max(10, leftPercent))}%`;
          rabbit.style.top = `${Math.min(88, Math.max(12, topPercent))}%`;

          if (state.laberintoCorrect >= needed) {
            board.classList.add("laberinto-solved");
            rabbit.textContent = "🏠";
            state.selectedAnswer = needed;
            feedback.className = "feedback ok";
            feedback.textContent = sub.success;
            completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
            celebrateConfetti();
            animateActivitySuccess(sub);
            playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
              openActivity(state.activeUnit.id);
            });
          }
        } else {
          stoneButton.classList.add("wrong");
          setTimeout(() => stoneButton.classList.remove("wrong"), 420);
          playTone("error");
          feedback.className = "feedback try";
          feedback.textContent = "Esa piedra no lleva a casa. Intenta otra vez.";
        }
      });

      rowEl.appendChild(stoneButton);
    });

    board.appendChild(rowEl);
  });

  const finalStone = document.createElement("div");
  finalStone.className = "laberinto-end";
  finalStone.innerHTML = '<span>🏠</span>';
  board.appendChild(finalStone);

  container.appendChild(board);

  const hint = document.createElement("p");
  hint.className = "laberinto-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   ASOCIACION ACTIVITY (Unidad 2, act 11) — Une las Palabras
   ============================================= */
function renderAsociacionActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "asociacion-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "asociacion-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  state.asociacionMatched = 0;

  const board = document.createElement("div");
  board.className = "asociacion-board";
  board.setAttribute("aria-label", "Asociación de imágenes y palabras");

  const canvas = document.createElement("canvas");
  canvas.className = "asociacion-canvas";
  board.appendChild(canvas);

  const topRow = document.createElement("div");
  topRow.className = "asociacion-top";
  const bottomRow = document.createElement("div");
  bottomRow.className = "asociacion-bottom";

  let drawing = null;

  const updateCanvasSize = () => {
    const rect = board.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const getCenter = (el) => {
    const rect = el.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    return {
      x: rect.left - boardRect.left + rect.width / 2,
      y: rect.top - boardRect.top + rect.height / 2
    };
  };

  const drawStroke = (from, to) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    updateCanvasSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#1d4ed8";
    ctx.shadowColor = "rgba(29, 78, 216, 0.45)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const clearLine = () => {
    drawing = null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const completeMatch = (fromEl, toEl) => {
    fromEl.classList.add("matched");
    toEl.classList.add("matched");
    fromEl.disabled = true;
    toEl.disabled = true;
    state.asociacionMatched++;
    playTone("success");
    clearLine();

    if (state.asociacionMatched >= sub.pairs.length) {
      state.selectedAnswer = sub.answer;
      feedback.className = "feedback ok";
      feedback.textContent = sub.success;
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      celebrateConfetti();
      animateActivitySuccess(sub);
      playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
        openActivity(state.activeUnit.id);
      });
    }
  };

  const failMatch = (targetEl) => {
    targetEl.classList.add("shake");
    setTimeout(() => targetEl.classList.remove("shake"), 420);
    playTone("error");
    clearLine();
  };

  const finalizeStroke = (endEl) => {
    if (!drawing || !endEl || endEl === drawing.startEl) {
      clearLine();
      return;
    }

    const startAnswer = drawing.startEl.dataset.answer;
    const endAnswer = endEl.dataset.answer;
    if (startAnswer === endAnswer) {
      completeMatch(drawing.startEl, endEl);
    } else {
      failMatch(endEl);
    }
  };

  const startStroke = (startEl) => {
    if (startEl.disabled || startEl.classList.contains("matched")) return;
    drawing = { startEl, from: getCenter(startEl), current: getCenter(startEl) };
    drawStroke(drawing.from, drawing.current);
    startEl.classList.add("selected");
  };

  const handlePointerMove = (event) => {
    if (!drawing) return;
    const rect = board.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    drawing.current = { x, y };
    drawStroke(drawing.from, drawing.current);
  };

  const handlePointerUp = (event) => {
    if (!drawing) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".asociacion-icon, .asociacion-word-card");
    if (target) {
      finalizeStroke(target);
    } else {
      clearLine();
    }
    document.querySelectorAll(".asociacion-icon, .asociacion-word-card").forEach((el) => el.classList.remove("selected"));
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: false });

  sub.pairs.forEach((pair) => {
    const iconBtn = document.createElement("button");
    iconBtn.type = "button";
    iconBtn.className = "asociacion-icon";
    iconBtn.dataset.answer = pair.answer;
    iconBtn.innerHTML = `<img src="${pair.image}" alt="${pair.answer}" />`;
    iconBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      document.querySelectorAll(".asociacion-icon, .asociacion-word-card").forEach((el) => el.classList.remove("selected"));
      startStroke(iconBtn);
      playTone("tap");
    });
    topRow.appendChild(iconBtn);

    const wordBtn = document.createElement("button");
    wordBtn.type = "button";
    wordBtn.className = "asociacion-word-card";
    wordBtn.dataset.answer = pair.answer;
    wordBtn.textContent = pair.word;
    wordBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      document.querySelectorAll(".asociacion-icon, .asociacion-word-card").forEach((el) => el.classList.remove("selected"));
      if (drawing) {
        finalizeStroke(wordBtn);
      } else {
        startStroke(wordBtn);
        playTone("tap");
      }
    });
    bottomRow.appendChild(wordBtn);
  });

  board.appendChild(topRow);
  board.appendChild(bottomRow);
  container.appendChild(board);

  const hint = document.createElement("p");
  hint.className = "asociacion-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  setTimeout(updateCanvasSize, 0);
  window.addEventListener("resize", updateCanvasSize);
  activityWorkspace.appendChild(container);
}

/* =============================================
   MEMORAMA ACTIVITY (Unidad 2, act 12) — Parejas Ocultas
   ============================================= */
function renderMemoramaActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "memorama-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "memorama-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  state.memoramaMatched = 0;

  const shuffled = [...sub.cards].sort(() => Math.random() - 0.5);
  let firstCard = null;
  let lock = false;
  const targetLabel = String(sub.targetLabel || "").trim().toLowerCase();
  const targetKinds = Array.isArray(sub.targetKinds)
    ? sub.targetKinds.map((k) => String(k || "").toLowerCase())
    : [];
  const targetMode = targetLabel.length > 0;

  const grid = document.createElement("div");
  grid.className = "memorama-grid";

  function getMemoramaFrontContent(card) {
    const kind = String(card.kind || "").toLowerCase();
    const textValue = String(card.text ?? card.word ?? card.label ?? "");
    const imageValue = String(card.image ?? card.emoji ?? card.icon ?? "").trim();
    const hasImage = /^(data:image\/|https?:\/\/|\.{0,2}\/|\/|assets\/).+|\.(png|jpe?g|gif|webp|svg)$/i.test(imageValue);

    if (kind === "image") {
      if (hasImage) {
        return `<img src="${imageValue}" alt="${escapeHtml(String(card.label || textValue || "imagen"))}" class="memorama-icon" />`;
      }
      return escapeHtml(textValue);
    }

    if (kind === "word" || kind === "text") {
      return escapeHtml(textValue);
    }

    if (hasImage) {
      return `<img src="${imageValue}" alt="${escapeHtml(String(card.label || textValue || "imagen"))}" class="memorama-icon" />`;
    }

    return escapeHtml(textValue);
  }

  function isTargetMemoramaPair(cardA, cardB) {
    if (!targetMode) return true;

    const labelA = String(cardA?.dataset?.label || "").toLowerCase();
    const labelB = String(cardB?.dataset?.label || "").toLowerCase();
    if (labelA !== targetLabel || labelB !== targetLabel) return false;

    if (!targetKinds.length) return true;

    const kindA = String(cardA?.dataset?.kind || "").toLowerCase();
    const kindB = String(cardB?.dataset?.kind || "").toLowerCase();
    return targetKinds.every((kind) => kind === kindA || kind === kindB);
  }

  shuffled.forEach((card, i) => {
    const cardEl = document.createElement("button");
    cardEl.type = "button";
    cardEl.className = "memorama-card";
    cardEl.dataset.index = i;
    cardEl.dataset.label = card.label;
    cardEl.dataset.kind = card.kind || "auto";
    cardEl.innerHTML = `
      <span class="memorama-back">?</span>
      <span class="memorama-front">
        ${getMemoramaFrontContent(card)}
      </span>
    `;
    cardEl.addEventListener("click", () => {
      if (lock) return;
      if (cardEl.classList.contains("matched") || cardEl.classList.contains("flipped")) return;
      cardEl.classList.add("flipped");
      if (!firstCard) {
        firstCard = cardEl;
        playTone("tap");
      } else {
        lock = true;
        const isLabelMatch = firstCard.dataset.label === cardEl.dataset.label;
        const isGoalMatch = isLabelMatch && isTargetMemoramaPair(firstCard, cardEl);
        if (isGoalMatch) {
          firstCard.classList.add("matched");
          cardEl.classList.add("matched");
          state.memoramaMatched++;
          playTone("success");
          firstCard = null;
          lock = false;
          const shouldComplete = targetMode ? true : state.memoramaMatched >= sub.pairs;
          if (shouldComplete) {
            state.selectedAnswer = targetMode ? sub.targetLabel : sub.pairs;
            feedback.className = "feedback ok";
            feedback.textContent = sub.success;
            completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
            celebrateConfetti();
            animateActivitySuccess(sub);
            playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
              openActivity(state.activeUnit.id);
            });
          }
        } else {
          setTimeout(() => {
            firstCard.classList.remove("flipped");
            cardEl.classList.remove("flipped");
            firstCard = null;
            lock = false;
            playTone("error");
            if (targetMode) {
              feedback.className = "feedback try";
              feedback.textContent = sub.targetHint || `Busca solo la pareja "${sub.targetLabel}".`;
            }
          }, 850);
        }
      }
    });
    grid.appendChild(cardEl);
  });

  container.appendChild(grid);

  const hint = document.createElement("p");
  hint.className = "memorama-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   CANASTOS ACTIVITY (Unidad 2, act 13) — Clasifica en Canastos
   ============================================= */
function renderCanastosActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "canastos-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "canastos-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset matched count
  state.canastosMatched = 0;

  const baskets = document.createElement("div");
  baskets.className = "canastos-baskets";

  sub.baskets.forEach((basket) => {
    const basketEl = document.createElement("div");
    basketEl.className = "canastos-basket";
    basketEl.dataset.category = basket.name;
    basketEl.innerHTML = `
      <img src="${basket.image}" alt="${basket.name}" class="canastos-basket-image" />
      <span class="canastos-basket-name">${basket.name}</span>
    `;
    basketEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      basketEl.classList.add("drag-over-canastos");
    });
    basketEl.addEventListener("dragleave", () => basketEl.classList.remove("drag-over-canastos"));
    basketEl.addEventListener("drop", (e) => {
      e.preventDefault();
      basketEl.classList.remove("drag-over-canastos");
      const word = e.dataTransfer.getData("text/plain");
      const item = sub.items.find((it) => it.word === word);
      if (item && item.category === basket.name) {
        const chip = document.getElementById(`canastosItem-${word}`);
        if (chip) {
          chip.classList.add("correct");
          chip.draggable = false;
          basketEl.appendChild(chip);
          state.canastosMatched++;
          playTone("success");
          if (state.canastosMatched >= sub.items.length) {
            state.selectedAnswer = sub.answer;
            feedback.className = "feedback ok";
            feedback.textContent = sub.success;
            completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
            celebrateConfetti();
            animateActivitySuccess(sub);
            playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
              openActivity(state.activeUnit.id);
            });
          }
        }
      } else {
        basketEl.classList.add("shake");
        setTimeout(() => basketEl.classList.remove("shake"), 400);
        playTone("error");
      }
    });
    baskets.appendChild(basketEl);
  });

  container.appendChild(baskets);

  const items = document.createElement("div");
  items.className = "canastos-items";

  const shuffledItems = [...sub.items].sort(() => Math.random() - 0.5);
  shuffledItems.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "canastos-item";
    chip.id = `canastosItem-${item.word}`;
    chip.dataset.word = item.word;
    chip.innerHTML = `<img src="${item.icon}" alt="${item.word}" class="canastos-item-icon" /><span>${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item.word);
      chip.classList.add("dragging-canastos");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-canastos"));
    chip.addEventListener("click", () => {
      const target = sub.items.find((it) => it.word === item.word);
      if (chip.classList.contains("correct")) return;
      const targetBasket = [...baskets.querySelectorAll(".canastos-basket")].find((b) => b.dataset.category === target.category);
      if (targetBasket) {
        chip.classList.add("correct");
        chip.draggable = false;
        targetBasket.appendChild(chip);
        state.canastosMatched++;
        playTone("success");
        if (state.canastosMatched >= sub.items.length) {
          state.selectedAnswer = sub.answer;
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      }
    });
    items.appendChild(chip);
  });

  container.appendChild(items);

  const hint = document.createElement("p");
  hint.className = "canastos-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   RED ACTIVITY (Unidad 2, act 14) — La Red de Conexiones
   ============================================= */
function renderRedActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "red-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "red-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset selected related
  state.redSelected = 0;

  // Center concept
  const center = document.createElement("div");
  center.className = "red-center";
  const centerImage = sub.centerImage ? `<img src="${sub.centerImage}" alt="${sub.center}" class="red-center-image" />` : `<span class="red-center-emoji">${sub.centerEmoji || "🔥"}</span>`;
  center.innerHTML = `${centerImage}<span class="red-center-word">${sub.center}</span>`;
  container.appendChild(center);

  // Satellites
  const satellites = document.createElement("div");
  satellites.className = "red-satellites";

  sub.satellites.forEach((sat) => {
    const satEl = document.createElement("button");
    satEl.type = "button";
    satEl.className = "red-satellite";
    satEl.dataset.label = sat.label;
    satEl.dataset.related = sat.related ? "true" : "false";
    const satImage = sat.image ? `<img src="${sat.image}" alt="${sat.label}" class="red-satellite-image" />` : `<span class="red-satellite-emoji">${sat.emoji || "•"}</span>`;
    satEl.innerHTML = `${satImage}<span class="red-satellite-word">${sat.label}</span>`;
    satEl.addEventListener("click", () => {
      // Already selected
      if (satEl.classList.contains("selected-satellite")) return;
      if (sat.related) {
        satEl.classList.add("selected-satellite");
        state.redSelected++;
        playTone("success");
        // Check if all related selected
        if (state.redSelected >= sub.answer.length) {
          // Mark the unrelated one as rejected
          const unrelated = [...satellites.querySelectorAll(".red-satellite")].find((s) => s.dataset.related === "false");
          if (unrelated) unrelated.classList.add("rejected-satellite");
          state.selectedAnswer = sub.answer;
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      } else {
        // Wrong — shake
        satEl.classList.add("shake");
        setTimeout(() => satEl.classList.remove("shake"), 400);
        playTone("error");
      }
    });
    satellites.appendChild(satEl);
  });

  container.appendChild(satellites);

  const hint = document.createElement("p");
  hint.className = "red-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

/* =============================================
   ARBOL ACTIVITY (Unidad 2, act 15) — El Árbol de las Palabras
   ============================================= */
function renderArbolActivity(sub, reviewMode = false) {
  const container = document.createElement("div");
  container.className = "arbol-container";

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "arbol-msg";
    msg.textContent = `¡Completaste "${sub.title}"! Puedes escuchar la instrucción de nuevo con el botón "Escuchar".`;
    container.appendChild(msg);
    activityWorkspace.appendChild(container);
    return;
  }

  // Reset matched count
  state.arbolMatched = 0;

  // Category node at top
  const category = document.createElement("div");
  category.className = "arbol-category";
  const categoryImage = sub.categoryImage ? `<img src="${sub.categoryImage}" alt="${sub.category}" class="arbol-category-image" />` : `<span class="arbol-category-emoji">${sub.categoryEmoji || "🌱"}</span>`;
  category.innerHTML = `${categoryImage}<span class="arbol-category-name">${sub.category}</span>`;
  container.appendChild(category);

  // Branch where terms are placed
  const branch = document.createElement("div");
  branch.className = "arbol-branch";
  branch.id = "arbolBranch";
  branch.textContent = "Arrastra los términos aquí";
  branch.addEventListener("dragover", (e) => {
    e.preventDefault();
    branch.classList.add("drag-over-arbol");
  });
  branch.addEventListener("dragleave", () => branch.classList.remove("drag-over-arbol"));
  branch.addEventListener("drop", (e) => {
    e.preventDefault();
    branch.classList.remove("drag-over-arbol");
    const term = e.dataTransfer.getData("text/plain");
    const termData = sub.terms.find((t) => t.label === term);
    if (termData) {
      const chip = document.getElementById(`arbolTerm-${term}`);
      if (chip && !chip.classList.contains("correct")) {
        chip.classList.add("correct");
        chip.draggable = false;
        branch.appendChild(chip);
        state.arbolMatched++;
        playTone("success");
        // Grow leaves
        const leaves = document.getElementById("arbolLeaves");
        if (leaves) leaves.classList.add("growing");
        if (state.arbolMatched >= sub.terms.length) {
          state.selectedAnswer = sub.answer;
          feedback.className = "feedback ok";
          feedback.textContent = sub.success;
          completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
          celebrateConfetti();
          animateActivitySuccess(sub);
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      }
    }
  });
  container.appendChild(branch);

  // Leaves (grow on success)
  const leaves = document.createElement("div");
  leaves.className = "arbol-leaves";
  leaves.id = "arbolLeaves";
  leaves.innerHTML = `<img src="assets/images/unit_2/hojas.png" alt="hojas" class="arbol-leaves-image" />`;
  container.appendChild(leaves);

  // Term chips
  const terms = document.createElement("div");
  terms.className = "arbol-terms";

  sub.terms.forEach((term) => {
    const chip = document.createElement("div");
    chip.className = "arbol-term";
    chip.id = `arbolTerm-${term.label}`;
    chip.dataset.term = term.label;
    const termImage = term.image ? `<img src="${term.image}" alt="${term.label}" class="arbol-term-image" />` : `<span class="arbol-term-emoji">${term.emoji || "•"}</span>`;
    chip.innerHTML = `${termImage}<span class="arbol-term-label">${term.label}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", term.label);
      chip.classList.add("dragging-arbol");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-arbol"));
    // Click fallback for touch
    chip.addEventListener("click", () => {
      if (chip.classList.contains("correct")) return;
      chip.classList.add("correct");
      chip.draggable = false;
      branch.appendChild(chip);
      state.arbolMatched++;
      playTone("success");
      const leaves = document.getElementById("arbolLeaves");
      if (leaves) leaves.classList.add("growing");
      if (state.arbolMatched >= sub.terms.length) {
        state.selectedAnswer = sub.answer;
        feedback.className = "feedback ok";
        feedback.textContent = sub.success;
        completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
        celebrateConfetti();
        animateActivitySuccess(sub);
        playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
          openActivity(state.activeUnit.id);
        });
      }
    });
    terms.appendChild(chip);
  });

  container.appendChild(terms);

  const hint = document.createElement("p");
  hint.className = "arbol-hint";
  hint.textContent = sub.hint;
  container.appendChild(hint);

  activityWorkspace.appendChild(container);
}

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
  narrateBtn.textContent = "Escuchar el cuento";
  narrateBtn.addEventListener("click", () => {
    const unitId = state.activeUnit?.id;
    const subIndex = state.activeSubActivityIndex;
    const defaultAudioPath = "assets/unit_3_sounds/activity_1.1.mp3";
    const folder = unitId ? getUnitSoundFolder(unitId, subIndex ?? 0) : "assets/unit_3_sounds";
    const audioPath = `${folder}/activity_1.1.mp3`;
    const preferredPath = unitId === "montanas" ? audioPath : defaultAudioPath;

    fetch(preferredPath, { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          const audio = new Audio(preferredPath);
          safePlayAudio(audio);
        } else {
          speak(sub.story);
        }
      })
      .catch(() => {
        speak(sub.story);
      });

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
  nextBtn.textContent = "🎙️ Hablar frase";
  container.appendChild(nextBtn);

  const micStatus = document.createElement("p");
  micStatus.className = "teatro-mic-status";
  micStatus.id = "teatroMicStatus";
  micStatus.textContent = "Di en voz alta la frase mostrada para avanzar.";
  container.appendChild(micStatus);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "teatro-msg";
    msg.textContent = "¡Ya completaste la obra de sombras!";
    container.appendChild(msg);
    nextBtn.disabled = true;
  }

  state.teatroIndex = 0;
  state.teatroDone = false;
  state.teatroListening = false;

  const teatroRoleImages = [
    "assets/images/unit_3/lobo.png",
    "assets/images/unit_3/caperucita_roja.png",
    "assets/images/unit_3/leñador.png"
  ];

  function normalizeSpeechText(text) {
    return normalize(String(text || "").toLowerCase())
      .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isSpeechMatch(transcript, expectedText) {
    const spoken = normalizeSpeechText(transcript);
    const expected = normalizeSpeechText(expectedText);
    if (!spoken || !expected) return false;
    if (spoken.includes(expected)) return true;

    const expectedWords = expected.split(" ").filter((w) => w.length > 2);
    const matchedWords = expectedWords.filter((w) => spoken.includes(w)).length;
    const threshold = Math.max(2, Math.ceil(expectedWords.length * 0.6));
    return matchedWords >= threshold;
  }

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
    const roleImage = scene.image || teatroRoleImages[idx] || "assets/images/unit_3/lobo.png";
    bubble.innerHTML = `<img src="${roleImage}" alt="personaje" class="teatro-role-image" /><span class="teatro-text">${escapeHtml(scene.text)}</span>`;
    counter.textContent = `Escena ${idx + 1} de ${sub.scenes.length}`;
    micStatus.textContent = "Di la frase mostrada y luego presiona el botón del micrófono.";
  }

  nextBtn.addEventListener("click", () => {
    if (state.teatroDone || state.teatroListening) return;

    const scene = sub.scenes[state.teatroIndex];
    if (!scene) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      feedback.className = "feedback try";
      feedback.textContent = "Tu navegador no permite reconocimiento de voz para esta actividad.";
      micStatus.textContent = "No hay soporte de micrófono en este navegador.";
      return;
    }

    state.teatroListening = true;
    micStatus.textContent = "Escuchando... di la frase completa.";

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      const ok = isSpeechMatch(transcript, scene.text);

      if (ok) {
        playTone("success");
        micStatus.textContent = `✓ Escuché: "${transcript}"`;
        state.teatroIndex++;
        renderScene();
      } else {
        playTone("error");
        micStatus.textContent = `No coincidió. Escuché: "${transcript}"`;
        feedback.className = "feedback try";
        feedback.textContent = "Pronuncia la frase completa de nuevo para continuar.";
      }
    };

    recognition.onerror = () => {
      playTone("error");
      micStatus.textContent = "No pude escucharte. Revisa permiso del micrófono e intenta otra vez.";
    };

    recognition.onend = () => {
      state.teatroListening = false;
    };

    recognition.start();
  });

  renderScene();
  activityWorkspace.appendChild(container);
}

/* ---------- 3. LIBRO: magic book with clickable keywords ---------- */
function renderLibroActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "libro-container";

  const book = document.createElement("div");
  book.className = "libro-book-frame";
  book.id = "libroBook";

  const bookImage = document.createElement("img");
  bookImage.className = "libro-book-image";
  bookImage.src = sub.bookImage || "assets/images/unit_3/libro.png";
  bookImage.alt = "Libro";
  bookImage.draggable = false;
  book.appendChild(bookImage);

  const page = document.createElement("div");
  page.className = "libro-page-overlay";
  page.id = "libroPage";

  // Editable coordinates so you can align the text with the book art.
  const libroLayout = {
    x: 15,
    y: 32,
    width: 68,
    height: 58,
    ...(sub.pageLayout || {})
  };
  page.style.left = `${libroLayout.x}%`;
  page.style.top = `${libroLayout.y}%`;
  page.style.width = `${libroLayout.width}%`;
  page.style.height = `${libroLayout.height}%`;
  book.appendChild(page);
  container.appendChild(book);

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

  function playPageTurnSound() {
    const folder = getUnitSoundFolder(state.activeUnit?.id || "montanas", state.activeSubActivityIndex || 0);
    const pageAudio = new Audio(`${folder}/hoja.mp3`);
    safePlayAudio(pageAudio);
  }

  function renderPage() {
    const pageText = sub.pages[state.libroPage];
    const html = String(pageText)
      .split(/\r?\n/)
      .map((line) => line
        .split(" ")
        .map((w) => {
          const clean = w.replace(/[.,;:!¿?]/g, "").toLowerCase();
          const kw = sub.keywords.find((k) => k.word === clean);
          if (kw) {
            return `<button type="button" class="libro-keyword" data-word="${kw.word}">${escapeHtml(w)}</button>`;
          }
          return `<span>${escapeHtml(w)}</span>`;
        })
        .join(" "))
      .join("<br />");
    page.innerHTML = html;

    page.querySelectorAll(".libro-keyword").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kw = sub.keywords.find((k) => k.word === btn.dataset.word);
        if (!kw || btn.classList.contains("discovered")) return;
        btn.classList.add("discovered");
        btn.classList.remove("magic-burst");
        void btn.offsetWidth;
        btn.classList.add("magic-burst");
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
    if (state.libroPage > 0) {
      state.libroPage--;
      playPageTurnSound();
      renderPage();
    }
  });
  nextBtn.addEventListener("click", () => {
    if (state.libroPage < sub.pages.length - 1) {
      state.libroPage++;
      playPageTurnSound();
      renderPage();
    }
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

  const followStatus = document.createElement("p");
  followStatus.className = "karaoke-follow-status";
  followStatus.id = "karaokeFollowStatus";
  followStatus.textContent = "Sigue cada palabra con tu cursor para volverla verde.";
  container.appendChild(followStatus);

  if (reviewMode) {
    const msg = document.createElement("p");
    msg.className = "karaoke-msg";
    msg.textContent = "¡Ya leíste la estrofa con ritmo!";
    container.appendChild(msg);
  }

  const wordEls = [];
  sub.words.forEach((w) => {
    const span = document.createElement("span");
    span.className = "karaoke-word";
    span.textContent = w;
    span.dataset.index = String(wordEls.length);
    wordsRow.appendChild(span);
    wordEls.push(span);
  });

  let pointerX = null;
  let pointerY = null;
  let idx = 0;
  let hitCount = 0;

  function isPointerOverWord(wordEl) {
    if (!wordEl || pointerX === null || pointerY === null) return false;
    const rect = wordEl.getBoundingClientRect();
    return pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom;
  }

  function updateFollowGlow() {
    wordEls.forEach((wordEl, wordIndex) => {
      const isActive = wordIndex === idx;
      const isFollowing = isActive && isPointerOverWord(wordEl);
      wordEl.classList.toggle("following-karaoke", isFollowing);
    });

    if (state.karaokeFollowRunning) {
      state.karaokeFollowRaf = requestAnimationFrame(updateFollowGlow);
    }
  }

  stage.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  stage.addEventListener("pointerdown", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  });

  if (wordEls[0]) wordEls[0].classList.add("active-karaoke");
  state.karaokeFollowRunning = true;
  updateFollowGlow();

  state.karaokeTimer = setInterval(() => {
    if (state.activeSubActivityIndex === null) {
      if (state.karaokeTimer) { clearInterval(state.karaokeTimer); state.karaokeTimer = null; }
      state.karaokeFollowRunning = false;
      if (state.karaokeFollowRaf) {
        cancelAnimationFrame(state.karaokeFollowRaf);
        state.karaokeFollowRaf = null;
      }
      return;
    }

    const currentWord = wordEls[idx];
    if (currentWord) {
      const followed = isPointerOverWord(currentWord);
      currentWord.classList.toggle("followed-karaoke", followed);
      currentWord.classList.toggle("missed-karaoke", !followed);
      if (followed) {
        hitCount++;
      }
      currentWord.classList.remove("active-karaoke");
    }

    idx += 1;
    if (idx >= wordEls.length) {
      if (hitCount >= wordEls.length) {
        if (state.karaokeTimer) {
          clearInterval(state.karaokeTimer);
          state.karaokeTimer = null;
        }
        state.karaokeFollowRunning = false;
        if (state.karaokeFollowRaf) {
          cancelAnimationFrame(state.karaokeFollowRaf);
          state.karaokeFollowRaf = null;
        }
        followStatus.textContent = "¡Excelente! Seguiste todo el ritmo con el cursor.";
        state.selectedAnswer = true;
        completeUnit3Activity(sub);
        return;
      }

      idx = 0;
      hitCount = 0;
      wordEls.forEach((wordEl) => {
        wordEl.classList.remove("followed-karaoke", "missed-karaoke", "following-karaoke");
      });
      followStatus.textContent = "Inténtalo de nuevo: sigue cada palabra cuando se ilumina.";
    }

    if (wordEls[idx]) {
      wordEls[idx].classList.add("active-karaoke");
      cursor.style.left = (wordEls[idx].offsetLeft + wordEls[idx].offsetWidth / 2 - 16) + "px";
      cursor.style.top = (wordEls[idx].offsetTop - 40) + "px";
    }
  }, 700);

  activityWorkspace.appendChild(container);
}

function getUnit3ImagePath(name) {
  const value = normalize(String(name || "")).toLowerCase();
  if (!value) return "";
  if (value.includes("caperucita")) return "assets/images/unit_3/caperucita_roja.png";
  if (value.includes("lobo")) return "assets/images/unit_3/lobo.png";
  if (value.includes("bosque")) return "assets/images/unit_3/bosque.png";
  if (value.includes("casa")) return "assets/images/unit_3/casa.png";
  if (value.includes("camino")) return "assets/images/unit_3/camino.png";
  if (value.includes("abuela") || value.includes("abuelita")) return "assets/images/unit_3/abuela.png";
  if (value.includes("madre") || value.includes("mama")) return "assets/images/unit_3/mama.png";
  if (value.includes("lenador") || value.includes("leñador")) return "assets/images/unit_3/leñador.png";
  if (value.includes("playa")) return "assets/images/unit_3/playa.png";
  if (value.includes("castillo")) return "assets/images/unit_3/castillo.png";
  if (value.includes("dragon")) return "assets/images/unit_3/dragon.png";
  if (value.includes("robot")) return "assets/images/unit_3/robot.png";
  return "";
}

function buildUnit3ImageMarkup(name, className) {
  const raw = String(name || "").trim();
  const directPath = /^(assets\/|\.\/|\.\.\/|https?:\/\/|data:image\/)/i.test(raw)
    || /\.(png|jpe?g|webp|gif|svg)$/i.test(raw);
  if (directPath) {
    return `<img src="${raw}" alt="${escapeHtml(raw.split("/").pop() || "imagen")}" class="${className}" />`;
  }
  const path = getUnit3ImagePath(name);
  if (!path) {
    return `<span class="${className} fallback-unit3-image">${escapeHtml(String(name || "?"))}</span>`;
  }
  return `<img src="${path}" alt="${escapeHtml(String(name || "imagen"))}" class="${className}" />`;
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
    catEl.innerHTML = `<span class="personajes-cat-name">${cat.name}</span><span class="personajes-cat-hint">Suelta aquí las tarjetas correctas</span>`;
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
        if (chip) {
          chip.classList.add("wrong-drop-personajes");
          setTimeout(() => chip.classList.remove("wrong-drop-personajes"), 450);
        }
        catEl.classList.add("wrong-drop-zone");
        setTimeout(() => catEl.classList.remove("wrong-drop-zone"), 450);
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
    chip.innerHTML = `${buildUnit3ImageMarkup(item.word, "personajes-item-image")}<span class="personajes-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-personajes"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-personajes"));
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
    btn.innerHTML = `${buildUnit3ImageMarkup(ch.image || ch.name, "quien-char-image")}<span class="quien-char-name">${ch.name}</span>`;
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
    zoneEl.innerHTML = `${buildUnit3ImageMarkup(zone.image || zone.name, "mapa-zone-image")}<span class="mapa-zone-name">${zone.name}</span><span class="mapa-zone-event"></span>`;
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
        if (chip) {
          chip.classList.add("wrong-drop-mapa");
          setTimeout(() => chip.classList.remove("wrong-drop-mapa"), 450);
        }
        zoneEl.classList.add("wrong-drop-zone");
        setTimeout(() => zoneEl.classList.remove("wrong-drop-zone"), 450);
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
    chip.innerHTML = `${buildUnit3ImageMarkup(item.image || item.word, "mapa-item-image")}<span class="mapa-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-mapa"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-mapa"));
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
    card.innerHTML = `<span class="galeria-char-frame">${buildUnit3ImageMarkup(ch.image || ch.name, "galeria-char-image")}</span><span class="galeria-char-name">${ch.name}</span>`;
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
  const sceneImage = document.createElement("img");
  sceneImage.className = "escenario-scene-image";
  sceneImage.src = getUnit3ImagePath(sub.sceneImage || "bosque");
  sceneImage.alt = "Bosque";
  sceneImage.draggable = false;
  scene.appendChild(sceneImage);
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
    btn.innerHTML = `${buildUnit3ImageMarkup(opt.image || opt.label, "escenario-option-image")}<span class="escenario-option-label">${opt.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".escenario-option").forEach((b) => b.classList.remove("selected-escenario"));
      btn.classList.add("selected-escenario");
      state.selectedAnswer = opt.label;
      sceneImage.src = getUnit3ImagePath(opt.image || opt.label) || getUnit3ImagePath("bosque");
      sceneImage.alt = opt.label;
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

  function placeOrdenarChip(label) {
    const chip = itemMap[label] || document.getElementById("ordenarItem-" + label);
    if (!chip || chip.classList.contains("used")) return;
    const next = state.sequenceAnswer.length;
    if (next >= sub.items.length) return;
    const slot = document.getElementById("ordenarSlot" + next);
    if (slot) {
      slot.innerHTML = `<span class="ordenar-slot-order">${next + 1}.</span><span class="ordenar-slot-chip">${chip.innerHTML}</span>`;
      slot.classList.add("filled-ordenar");
      slot.dataset.label = label;
    }
    chip.classList.add("used");
    state.sequenceAnswer.push(label);
    playTone("tap");
  }

  shuffled.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "ordenar-item";
    chip.id = "ordenarItem-" + item.label;
    chip.dataset.label = item.label;
    chip.innerHTML = `${buildUnit3ImageMarkup(item.image || item.label, "ordenar-item-image")}<span class="ordenar-item-label">${item.label}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    itemMap[item.label] = chip;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.label); chip.classList.add("dragging-ordenar"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-ordenar"));
    chip.addEventListener("click", () => placeOrdenarChip(item.label));
    tray.appendChild(chip);
  });

  slots.addEventListener("dragover", (e) => e.preventDefault());
  slots.addEventListener("drop", (e) => {
    e.preventDefault();
    const label = e.dataTransfer.getData("text/plain");
    placeOrdenarChip(label);
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
      delete slot.dataset.label;
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

  function updateLineaCompletion() {
    if (state.lineaMatched >= sub.items.length) {
      state.selectedAnswer = sub.answer;
      completeUnit3Activity(sub);
    }
  }

  function returnLineaChip(chip) {
    if (!chip || !chip.classList.contains("correct")) return;
    chip.classList.remove("correct");
    chip.draggable = true;
    tray.appendChild(chip);
    state.lineaMatched = Math.max(0, state.lineaMatched - 1);
    playTone("tap");
  }

  sub.categories.forEach((cat) => {
    const catEl = document.createElement("div");
    catEl.className = "linea-cat";
    catEl.dataset.category = cat.name;
    catEl.innerHTML = `<span class="linea-cat-name">${cat.name}</span><span class="linea-cat-hint">Suelta aquí la tarjeta correcta</span>`;
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
        updateLineaCompletion();
      } else {
        if (chip) {
          chip.classList.add("wrong-drop-linea");
          setTimeout(() => chip.classList.remove("wrong-drop-linea"), 420);
        }
        catEl.classList.add("wrong-drop-zone");
        setTimeout(() => catEl.classList.remove("wrong-drop-zone"), 420);
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
    chip.innerHTML = `${buildUnit3ImageMarkup(item.image || item.word, "linea-item-image")}<span class="linea-item-word">${item.word}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", item.word); chip.classList.add("dragging-linea"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-linea"));
    chip.addEventListener("click", () => {
      if (chip.classList.contains("correct")) {
        returnLineaChip(chip);
      }
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  catsRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".linea-item.correct");
    if (!chip) return;
    returnLineaChip(chip);
  });

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
  state.dominoExpectedStart = null;
  state.dominoExpectedTail = null;

  const chainInfo = document.createElement("p");
  chainInfo.className = "domino-chain-info";
  chainInfo.textContent = "Arrastra una ficha para iniciar la cadena de causa-efecto.";
  container.appendChild(chainInfo);

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
    chip.innerHTML = `<span class="domino-piece-half domino-half-top">${buildUnit3ImageMarkup(piece.text, "domino-piece-image")}<span class="domino-piece-text">${piece.text}</span></span><span class="domino-piece-divider"></span><span class="domino-piece-half domino-half-bottom"><span class="domino-piece-next-label">Conduce a:</span><span class="domino-piece-next">${piece.next}</span></span>`;
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

  const piece = sub.pieces.find((p) => p.text === text);
  if (!piece) return;

  const chainInfo = document.querySelector(".domino-chain-info");

  if (!state.dominoPlaced.length) {
    const startText = sub.answer?.[0] || "";
    if (text !== startText) {
      chip.classList.add("shake");
      setTimeout(() => chip.classList.remove("shake"), 400);
      if (chainInfo) chainInfo.textContent = `La cadena debe iniciar con: ${startText}`;
      playTone("error");
      return;
    }
    state.dominoExpectedStart = text;
    state.dominoExpectedTail = piece.next;
  } else if (text !== state.dominoExpectedTail) {
    chip.classList.add("shake");
    setTimeout(() => chip.classList.remove("shake"), 400);
    if (chainInfo) chainInfo.textContent = `Después de "${state.dominoPlaced[state.dominoPlaced.length - 1]}" sigue: ${state.dominoExpectedTail}`;
    playTone("error");
    return;
  }

  chip.classList.add("placed");
  chip.draggable = false;
  document.getElementById("dominoChain").appendChild(chip);
  state.dominoPlaced.push(text);
  state.dominoExpectedTail = piece.next;
  if (chainInfo) chainInfo.textContent = `Cadena actual: ${state.dominoPlaced.join(" → ")}`;
  playTone("success");

  if (state.dominoPlaced.length >= sub.pieces.length && state.dominoExpectedTail === sub.answer[sub.answer.length - 1]) {
    state.selectedAnswer = sub.answer;
    if (chainInfo) chainInfo.textContent = "¡Cadena completa sin interrupciones!";
    completeUnit3Activity(sub);
  }
}

/* ---------- 14. CINTA: film strip + Play ---------- */
function renderCintaActivity(sub, reviewMode) {
  const container = document.createElement("div");
  container.className = "cinta-container";

  state.cintaOrder = [];

  const info = document.createElement("p");
  info.className = "cinta-info";
  info.id = "cintaInfo";
  info.textContent = "Ordena libremente los fotogramas. Puedes quitar el último tocándolo.";
  container.appendChild(info);

  const film = document.createElement("div");
  film.className = "cinta-film";
  film.id = "cintaFilm";
  container.appendChild(film);

  const tray = document.createElement("div");
  tray.className = "cinta-tray";
  const shuffled = [...sub.frames].sort(() => Math.random() - 0.5);
  const frameMap = {};

  function placeCintaInNextSlot(text) {
    const chip = frameMap[text] || document.getElementById("cintaFrame-" + text);
    if (!chip || chip.classList.contains("placed")) return;
    chip.classList.add("placed");
    chip.draggable = false;
    document.getElementById("cintaFilm").appendChild(chip);
    state.cintaOrder.push(text);
    playTone("tap");

    const playBtn = document.getElementById("cintaPlayBtn");
    if (playBtn) playBtn.disabled = state.cintaOrder.length < sub.answer.length;
  }

  shuffled.forEach((frame) => {
    const chip = document.createElement("div");
    chip.className = "cinta-frame";
    chip.id = "cintaFrame-" + frame.text;
    chip.dataset.text = frame.text;
    chip.innerHTML = `${buildUnit3ImageMarkup(frame.image || frame.text, "cinta-frame-image")}<span class="cinta-frame-text">${frame.text}</span>`;
    chip.draggable = true;
    chip.tabIndex = 0;
    frameMap[frame.text] = chip;
    chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", frame.text); chip.classList.add("dragging-cinta"); });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging-cinta"));
    chip.addEventListener("click", () => {
      if (chip.classList.contains("placed")) {
        const last = state.cintaOrder[state.cintaOrder.length - 1];
        if (last !== frame.text) return;
        state.cintaOrder.pop();
        chip.classList.remove("placed", "playing-cinta");
        chip.draggable = true;
        tray.appendChild(chip);
        const playBtn = document.getElementById("cintaPlayBtn");
        if (playBtn) playBtn.disabled = true;
        playTone("tap");
        return;
      }
      placeCintaInNextSlot(frame.text);
    });
    tray.appendChild(chip);
  });
  container.appendChild(tray);

  film.addEventListener("dragover", (e) => e.preventDefault());
  film.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    placeCintaInNextSlot(text);
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
  const info = document.getElementById("cintaInfo");

  const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
  const isCorrectOrder = sub.answer.every((item, idx) => state.cintaOrder[idx] === item);
  if (!isCorrectOrder) {
    feedback.className = "feedback try";
    feedback.textContent = "El orden aún no es correcto. Ajusta los fotogramas y prueba de nuevo.";
    if (info) info.textContent = "Hay un error en la secuencia: toca el último fotograma para corregir.";
    playTone("error");
    return;
  }

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

      const videoWrap = document.createElement("div");
      videoWrap.className = "cinta-video-wrap";
      const video = document.createElement("video");
      video.className = "cinta-video";
      video.id = "cintaVideo";
      video.src = "assets/videos/caperucita.mp4";
      video.controls = false;
      video.autoplay = true;
      video.muted = false;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.preload = "auto";
      videoWrap.appendChild(video);
      film.replaceChildren(videoWrap);

      if (info) info.textContent = "Reproduciendo la secuencia final...";

      video.addEventListener("ended", () => {
        state.selectedAnswer = sub.answer;
        feedback.className = "feedback ok";
        feedback.textContent = sub.success + " ¡Has completado esta actividad!";
        completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
        playTone("success");
        celebrateConfetti();
        animateActivitySuccess(sub);
        playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
          openActivity(state.activeUnit.id);
        });
      }, { once: true });

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

/* =============================================
   ANIMATE SUCCESS — per-scene celebration for Unidad 2
   ============================================= */
function animateActivitySuccess(sub) {
  const workspace = activityWorkspace;
  if (!workspace) return;

  // Mark container as success (enables success animations)
  workspace.classList.add("activity-success");
  workspace.classList.add(`success-${sub.type}`);

  switch (sub.type) {
    case "oracion": {
      // Play the gato video once (it is paused initially; no loop, so it
      // stops on the last frame after playing through).
      const gatoVideo = document.getElementById("oracionVideo");
      if (gatoVideo && gatoVideo.paused) {
        gatoVideo.currentTime = 0;
        gatoVideo.play().catch(() => {});
      }
      break;
    }
    case "puente": {
      // Play the monkey video once (it is paused initially; no loop, so it
      // stops on the last frame after playing through).
      const monkeyVideo = document.getElementById("puenteMonkey");
      if (monkeyVideo && monkeyVideo.paused) {
        monkeyVideo.currentTime = 0;
        monkeyVideo.play().catch(() => {});
      }
      break;
    }
    case "frase": {
      // Paragraph illuminates
      const paragraph = document.getElementById("fraseParagraph");
      if (paragraph) paragraph.classList.add("paragraph-lit");
      break;
    }
    case "detective": {
      // Clues glow, detective finds answer
      const scene = document.getElementById("detectiveScene");
      if (scene) scene.classList.add("detective-solved");
      break;
    }
    case "accion": {
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
}

function checkAnswer() {
  if (!state.activeUnit) return;
  // Prevent rapid double-clicks from repeating audio/confetti or cutting audio
  if (state.checkingLock) return;
  state.checkingLock = true;

  // Release the lock after a reasonable timeout so the button can be used again
  setTimeout(() => { state.checkingLock = false; }, 3000);

  // Handle sub-activities (globo, balcon, intruso, escudo, cofre)
  if (state.activeSubActivityIndex !== null) {
    const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
    if (!sub) { state.checkingLock = false; return; }

    let isCorrect = false;

    switch (sub.type) {
      case "globo":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "balcon":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "intruso":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "escudo":
        // Already handled via keydown, but check state
        isCorrect = state.selectedAnswer === sub.answer.toLowerCase() && !state.escudoExpired;
        break;
      case "cofre":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "caldero":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
case "carruaje":
        isCorrect = sub.answer.every((item, idx) => state.sequenceAnswer[idx] === item);
        break;
case "bingo":
        isCorrect = state.selectedAnswer === true;
        break;
      case "escalera":
        isCorrect = state.selectedAnswer === sub.answer;
        break;
      case "pergamino":
        isCorrect = state.selectedAnswer && normalize(state.selectedAnswer) === normalize(sub.answer);
        break;
      case "pasaje":
        isCorrect = sub.answer.every((item, idx) => state.sequenceAnswer[idx] === item);
        break;
      case "oracion":
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
    }

    if (isCorrect) {
      feedback.className = "feedback ok";
      feedback.textContent = `${sub.success} \u00a1Has completado esta actividad!`;
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      playTone("success");
      celebrateConfetti();

      // Run per-scene success animations (cat eats, monkey crosses, etc.)
      animateActivitySuccess(sub);

// For units with subActivities: play correct sound → feedback → return to map
      if (state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque" || state.activeUnit.id === "montanas") {
        // El Puente del Mono (actividad 2 de la unidad 2): la actividad solo se
        // cierra cuando el diálogo de feedback ha terminado Y el video del mono
        // también ha acabado de reproducirse.
        if (sub.type === "puente") {
          returnToMapAfterPuente(state.activeUnit.id, state.activeSubActivityIndex);
        } else if (sub.type === "oracion") {
          // El Gato y el Tazón (actividad 1 de la unidad 2): la actividad solo se
          // cierra cuando el diálogo de feedback ha terminado Y el video del gato
          // también ha acabado de reproducirse.
          returnToMapAfterOracion(state.activeUnit.id, state.activeSubActivityIndex);
        } else {
          playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
            openActivity(state.activeUnit.id);
          });
        }
      } else {
        speak(sub.success);
        setTimeout(() => {
          openActivity(state.activeUnit.id);
        }, 2000);
      }
    } else {
      // Give a more specific hint based on type
      let hint = sub.hint || "Intenta de nuevo.";
      if (sub.type === "cofre") {
        hint = state.selectedAnswer ? `Elegiste la letra ${state.selectedAnswer}. ${sub.hint}` : sub.hint;
      } else if (sub.type === "globo" || sub.type === "balcon" || sub.type === "intruso") {
        hint = !state.selectedAnswer ? "Selecciona una opci\u00f3n primero." : sub.hint;
      }
      feedback.className = "feedback try";
      feedback.textContent = hint;
      playTone("error");
    }

    return;
  }

  // Standard activity types (bosque, montanas, oceano)
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
    celebrateConfetti();
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
  stopActivityAvatarViewer();

  // Cleanup escudo timer if active
  if (state.escudoTimerCleanup) {
    state.escudoTimerCleanup();
    state.escudoTimerCleanup = null;
  }
  if (state.escudoTimer) {
    clearInterval(state.escudoTimer);
    state.escudoTimer = null;
  }
  // Cleanup palabra-oculta keydown listener
  if (state.palabraOcultaCleanup) {
    state.palabraOcultaCleanup();
    state.palabraOcultaCleanup = null;
  }
  // Cleanup banquete belt if active
  if (state.banquete && state.banquete.cleanup) {
    state.banquete.cleanup();
    state.banquete = null;
  }
  // Pause any active looping video (accion activity) so it doesn't keep playing in the background
  const accionVideo = document.getElementById("accionVideo");
  if (accionVideo) {
    accionVideo.pause();
    accionVideo.currentTime = 0;
  }
  const cintaVideo = document.getElementById("cintaVideo");
  if (cintaVideo) {
    cintaVideo.pause();
    cintaVideo.currentTime = 0;
  }
  // Unit 3 cleanup: stop karaoke cursor interval
  if (state.karaokeTimer) {
    clearInterval(state.karaokeTimer);
    state.karaokeTimer = null;
  }
  state.karaokeFollowRunning = false;
  if (state.karaokeFollowRaf) {
    cancelAnimationFrame(state.karaokeFollowRaf);
    state.karaokeFollowRaf = null;
  }
  // Unit 3 cleanup: stop cinta playback interval
  if (state.cintaTimer) {
    clearInterval(state.cintaTimer);
    state.cintaTimer = null;
  }

  // Reset background image
  const existingBg = document.getElementById("subActivityBg");
  if (existingBg) existingBg.style.display = "none";
  activityZone.classList.remove("has-castle-bg");
  activityZone.classList.remove("has-forest-bg");
  activityZone.classList.remove("has-mountain-bg");

  activityZone.hidden = true;
  activityZone.classList.remove("unit-fullscreen");
  state.activeUnit = null;
  state.activeSubActivityIndex = null;
  state.inCastleMap = false;
  state.escudoStarted = false;
  state.replaySubActivity = null;
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
  if (!state.sound || !("speechSynthesis" in window) || state.audioLock) return;
  state.audioLock = true;
  stopAllAudio();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.92;
  utterance.pitch = 1.04;
  utterance.onend = () => { state.audioLock = false; };
  utterance.onerror = () => { state.audioLock = false; };
  window.speechSynthesis.speak(utterance);
}

let toneContext = null;

function playTone(kind) {
  if (!state.sound) return;
  // If an MP3 or speech is playing, skip the tone to avoid interrupting it
  if (state.audioLock) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  // Reuse a single AudioContext instead of creating (and leaking) a new one
  // on every click — this keeps the main thread free for video decoding.
  if (!toneContext) {
    try {
      toneContext = new AudioContext();
    } catch {
      return;
    }
  }
  if (toneContext.state === "closed") {
    try {
      toneContext = new AudioContext();
    } catch {
      return;
    }
  }
  if (toneContext.state === "suspended") {
    toneContext.resume().catch(() => {});
  }

  const context = toneContext;
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

/* =============================================
   ðŸŽ‰ CONFETTI CELEBRATION
   ============================================= */
function celebrateConfetti() {
  // Prevent multiple confetti bursts from rapid clicks
  if (state.confettiLock) return;
  state.confettiLock = true;
  // Release lock after animation completes (~4s)
  setTimeout(() => { state.confettiLock = false; }, 4000);

  const colors = ["#ff4d9e", "#8ce63d", "#00b8ff", "#9b7eff", "#ff6b2b", "#ffe44d", "#00d4aa"];
  const container = document.body;

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 1.5;
    const duration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 10;

    piece.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
      box-shadow: 0 0 6px rgba(255,255,255,0.3);
    `;

    container.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + delay) * 1000 + 100);
  }
}

/* =============================================
   ðŸŽ¯ POP BUTTON ANIMATION
   ============================================= */
function popButton(element) {
  if (!element) return;
  element.style.transition = "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)";
  element.style.transform = "scale(0.92)";
  setTimeout(() => {
    element.style.transform = "scale(1)";
    setTimeout(() => {
      element.style.transform = "";
      element.style.transition = "";
    }, 150);
  }, 100);
}

// Apply pop effect to all primary and secondary buttons
document.addEventListener("click", (e) => {
const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot, .cuento-option, .teatro-next, .libro-keyword, .capitulo-option, .karaoke-done, .personajes-item, .quien-char, .mapa-item, .galeria-char, .escenario-option, .ordenar-item, .linea-item, .domino-piece, .cinta-frame, .cinta-play, .antes-option");
  if (btn) {
    popButton(btn);
  }
});

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

