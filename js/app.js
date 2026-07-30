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
  confettiLock: false,
  checkingLock: false,
  sound: localStorage.getItem("reino.sound") !== "off",
  music: localStorage.getItem("reino.music") !== "off",
  authMode: "login",
  inCastleMap: false,
  cofreDropped: null,
  redoble: null
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
    card.classList.toggle("completed", isUnitCompleted);
    card.querySelector(".unit-art").classList.add(unit.theme);
    card.querySelector(".unit-art").dataset.icon = unit.icon;
    card.querySelector(".unit-kicker").textContent = `Unidad ${unit.number}`;
    card.querySelector("h3").textContent = unit.title;
    card.querySelector(".unit-description").textContent = unit.description;
    card.querySelector(".mini-list").innerHTML = unit.activities
      .slice(0, 3)
      .map((activity) => `<span><strong>\u2022</strong>${activity}</span>`)
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

  // Map reward names to their icon image paths
  function getBadgeIcon(rewardName) {
    const iconMap = {
      "Insignia de la Letra Brillante": "assets/images/icons/insignia_de_la_letra_brillante_icon.png",
      "Hoja del Vocabulario": "assets/images/icons/hoja_del_vocabulario_icon.png"
    };
    const path = iconMap[rewardName];
    if (path) {
      return `<img src="${path}" alt="" class="badge-icon" />`;
    }
    // Fallback to unit emoji for rewards without a custom icon
    const unit = state.data.units.find((u) => u.reward === rewardName);
    return unit?.icon || "🏆";
  }

  rewardStrip.innerHTML = rewards.length
    ? rewards.map((unit) => `<span class="badge">${getBadgeIcon(unit.reward)} ${unit.reward}</span>`).join("")
    : `<span class="badge">Comienza una unidad para ganar recompensas</span>`;
}

function openActivity(unitId) {
  const unit = state.data.units.find((item) => item.id === unitId);
  state.activeUnit = unit;
  state.selectedAnswer = null;
  state.sequenceAnswer = [];
  state.escudoTimer = null;
  state.escudoExpired = false;
  state.cofreDropped = null;
  state.activeSubActivityIndex = null;
  state.audioLock = false; // release any stuck audio lock when opening a new activity
  state.checkingLock = false; // re-enable checkAnswer for new activity

  // Reset any background image leftover from a sub-activity
  const existingBg = document.getElementById("subActivityBg");
  if (existingBg) existingBg.style.display = "none";
  activityZone.classList.remove("has-castle-bg");

  // If unit has subActivities (castle map), show the map
  if (unit.subActivities && unit.subActivities.length > 0) {
    state.inCastleMap = true;
    activityZone.classList.add("unit-fullscreen");
    renderCastleMap(unit);
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
  $("#pronunciationBtn").hidden = false;

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

function safePlayAudio(audio, onEnded) {
  if (!state.sound) {
    if (onEnded) onEnded();
    return;
  }
  // If any audio is already playing, ignore this new request entirely
  if (state.audioLock) return;
  state.audioLock = true;
  stopAllAudio();
  audio.play().then(() => {
    audio.addEventListener("ended", () => {
      state.audioLock = false;
      if (onEnded) onEnded();
    }, { once: true });
    audio.addEventListener("error", () => {
      state.audioLock = false;
      if (onEnded) onEnded();
    }, { once: true });
  }).catch(() => {
    state.audioLock = false;
    if (onEnded) onEnded();
  });
}

function stopAllAudio() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  // Stop any currently playing MP3 Audio elements
  document.querySelectorAll("audio").forEach((el) => {
    el.pause();
    el.currentTime = 0;
  });
}

/* =============================================
   ðŸ”Š UNIT SOUND PLAYER â€” Uses MP3 from assets/unit_X_sounds/
   ============================================= */
function playUnitSound(unitId, subIndex) {
  const activityNumber = subIndex + 1;
  // Find the unit number from data
  const unit = state.data?.units?.find((u) => u.id === unitId);
  const unitNumber = unit?.number || unitId.replace("unit", "");
  // Unit 1 (Castillo) has three themes: theme1 (activities 1-5, indices 0-4), theme2 (activities 6-10, indices 5-9), theme3 (activity 11, index 10+)
  let audioPath;
  if (unitId === "castillo") {
    if (subIndex <= 4) {
      audioPath = `assets/unit_${unitNumber}_sounds/theme1/activity_${activityNumber}.mp3`;
    } else if (subIndex <= 9) {
      audioPath = `assets/unit_${unitNumber}_sounds/theme2/activity_${activityNumber}.mp3`;
    } else {
      audioPath = `assets/unit_${unitNumber}_sounds/theme3/activity_${activityNumber}.mp3`;
    }
  } else {
    audioPath = `assets/unit_${unitNumber}_sounds/activity_${activityNumber}.mp3`;
  }
  const audio = new Audio(audioPath);
  safePlayAudio(audio);
}

/* =============================================
   ðŸŽ‰ CORRECT ANSWER SEQUENCE â€” Correct sound â†’ Feedback â†’ Done
   ============================================= */
function playCorrectThenFeedback(unitId, subIndex, onComplete) {
  if (!state.sound) {
    if (onComplete) onComplete();
    return;
  }

  // 1. Pick a random correct sound from assets/correct_sounds/phrase1-8.mp3
  const correctSoundIndex = Math.floor(Math.random() * 8) + 1; // 1 to 8
  const correctSound = new Audio(`assets/correct_sounds/phrase${correctSoundIndex}.mp3`);

  // 2. Determine feedback file dynamically based on unit number
  const unit = state.data?.units?.find((u) => u.id === unitId);
  const unitNumber = unit?.number || 1;
  const activityNumber = subIndex + 1;
  // Unit 1 (Castillo) has three themes: theme1 (activities 1-5, indices 0-4), theme2 (activities 6-10, indices 5-9), theme3 (activity 11, index 10+)
  let feedbackPath;
  if (unitId === "castillo") {
    if (subIndex <= 4) {
      feedbackPath = `assets/unit_${unitNumber}_sounds/theme1/feedback${activityNumber}.mp3`;
    } else if (subIndex <= 9) {
      feedbackPath = `assets/unit_${unitNumber}_sounds/theme2/feedback${activityNumber}.mp3`;
    } else {
      feedbackPath = `assets/unit_${unitNumber}_sounds/theme3/feedback${activityNumber}.mp3`;
    }
  } else {
    feedbackPath = `assets/unit_${unitNumber}_sounds/feedback${activityNumber}.mp3`;
  }

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
   CASTLE MAP RENDERER
   ============================================= */
function renderCastleMap(unit) {
  activityScene.hidden = true;
  activityZone.classList.add("unit-fullscreen");
  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  activityTitle.textContent = "Mapa del Castillo \u2014 Elige una actividad";
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
  container.className = "castle-map-container";
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

function openSubActivity(unitId, index) {
  const unit = state.data.units.find((u) => u.id === unitId);
  if (!unit) return;
  const sub = unit.subActivities[index];
  if (!sub) return;

  state.activeSubActivityIndex = index;
  state.selectedAnswer = null;
  state.sequenceAnswer = [];
  state.escudoTimer = null;
  state.escudoExpired = false;
  state.escudoStarted = false;
  state.cofreDropped = null;
  state.redoble = null;

  activityScene.hidden = true;
  activityZone.classList.add("unit-fullscreen");

  // Set background image inside the activity card (b1 for index 0, b2 for index 1, etc.)
  if (index >= 0 && index < SUB_ACTIVITY_BACKGROUNDS.length) {
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
    bgLayer.style.backgroundImage = `url("${SUB_ACTIVITY_BACKGROUNDS[index]}")`;
    bgLayer.style.display = "block";
    activityZone.classList.add("has-castle-bg");
  }

  activityUnit.textContent = `Unidad ${unit.number}: ${unit.title}`;
  activityTitle.textContent = sub.title;
  activityPrompt.textContent = sub.prompt;
  feedback.className = "feedback";
  feedback.textContent = "";
  activityWorkspace.innerHTML = "";

  // If activity is completed â†’ review mode: no check button, show success feedback
  const alreadyCompleted = isSubActivityCompleted(unitId, index);

  if (alreadyCompleted) {
    $("#checkAnswer").hidden = true;
    $("#listenPrompt").hidden = false;
    $("#pronunciationBtn").hidden = true;
    feedback.className = "feedback ok";
    feedback.textContent = `¡Completaste "${sub.title}"! Usa el botón "Escuchar" para repasar las instrucciones.`;
  } else {
    $("#checkAnswer").hidden = sub.type === "escudo" || sub.type === "redoble" || sub.type === "banquete" || sub.type === "mensaje" || sub.type === "palabra-oculta"; // Auto-checked by keypress or number click
    $("#listenPrompt").hidden = false;
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
      if (state.bingoMarked.length >= sub.syllables.length) {
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
  const remaining = sub.syllables.filter((s) => !state.bingoMarked.includes(s));
  if (remaining.length === 0) return;

  // Pick random remaining syllable
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  state.bingoCurrentTarget = pick;

  const targetDisplay = $("#bingoTarget");
  if (targetDisplay) targetDisplay.textContent = `Busca...`;

  const progress = $("#bingoProgress");
  if (progress) progress.textContent = `Marcadas: ${state.bingoMarked.length}/${sub.syllables.length}`;

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
   BANQUETE ACTIVITY — Conveyor belt cashier game
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
    selectedLabel: null
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

  const belt = document.createElement("div");
  belt.className = "banquete-belt";
  belt.id = "banqueteBelt";

  // Create product labels
  sub.words.forEach((word, i) => {
    const label = document.createElement("button");
    label.type = "button";
    label.className = "banquete-label";
    label.dataset.label = word.label;
    label.textContent = word.label;
    label.style.animationDelay = `${i * 0.3}s`;

    label.addEventListener("click", () => {
      if (state.banquete.phase !== "answering") return;
      // Deselect others
      document.querySelectorAll(".banquete-label").forEach((l) => l.classList.remove("selected-banquete"));
      label.classList.add("selected-banquete");
      state.banquete.selectedLabel = word.label;
      state.selectedAnswer = word.label;
      // Auto-check
      checkBanqueteAnswer();
    });

    belt.appendChild(label);
  });

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

  activityWorkspace.appendChild(container);
}

function startBanqueteRound(sub) {
  const banquete = state.banquete;
  if (!banquete || banquete.phase === "done") return;

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

  // Reset labels
  document.querySelectorAll(".banquete-label").forEach((l) => l.classList.remove("selected-banquete"));
  state.banquete.selectedLabel = null;
  state.selectedAnswer = null;

  // Play the word audio
  const audio = new Audio(pick.audio);
  safePlayAudio(audio, () => {
    // Audio ended — switch to answering phase
    banquete.phase = "answering";
    const statusMsg = document.getElementById("banqueteStatus");
    if (statusMsg) statusMsg.textContent = "¿Qué producto pidió el cliente? ¡Haz clic en la etiqueta correcta!";

    const orderDisplay = document.getElementById("banqueteOrder");
    if (orderDisplay) orderDisplay.textContent = `"${pick.label}"`;

    const roundDisplay = document.getElementById("banqueteRound");
    if (roundDisplay) roundDisplay.textContent = `Producto: ${pick.label}`;

    // Start belt animation
    document.querySelectorAll(".banquete-label").forEach((l) => {
      l.style.animation = "slideLabels 2s linear infinite";
    });
  });
}

function checkBanqueteAnswer() {
  const banquete = state.banquete;
  if (!banquete || banquete.phase !== "answering" || banquete.selectedLabel === null) return;

  const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
  const isCorrect = banquete.selectedLabel === banquete.currentWord.label;

  if (isCorrect) {
    banquete.correctCount++;
    banquete.round++;
    playTone("success");

    // Stop belt animation
    document.querySelectorAll(".banquete-label").forEach((l) => {
      l.style.animation = "";
    });

    // Check if all rounds completed
    if (banquete.round >= banquete.totalRounds) {
      banquete.phase = "done";
      feedback.className = "feedback ok";
      feedback.textContent = sub.success + " ¡Has completado esta actividad!";
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      celebrateConfetti();

      const statusMsg = document.getElementById("banqueteStatus");
      if (statusMsg) statusMsg.textContent = "¡Banquete servido! Todos los productos cobrados.";

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
  listenBtn.textContent = "🔊 Escuchar";
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
  listenBtn.textContent = "🔊 Escuchar oración";
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
      default:
        isCorrect = false;
    }

    if (isCorrect) {
      feedback.className = "feedback ok";
      feedback.textContent = `${sub.success} \u00a1Has completado esta actividad!`;
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      playTone("success");
      celebrateConfetti();

      // For units with subActivities: play correct sound → feedback → return to map
      if (state.activeUnit.id === "castillo") {
        playCorrectThenFeedback(state.activeUnit.id, state.activeSubActivityIndex, () => {
          openActivity(state.activeUnit.id);
        });
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

  // Reset background image
  const existingBg = document.getElementById("subActivityBg");
  if (existingBg) existingBg.style.display = "none";
  activityZone.classList.remove("has-castle-bg");

  activityZone.hidden = true;
  activityZone.classList.remove("unit-fullscreen");
  state.activeUnit = null;
  state.activeSubActivityIndex = null;
  state.inCastleMap = false;
  state.escudoStarted = false;
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

function playTone(kind) {
  if (!state.sound) return;
  // If an MP3 or speech is playing, skip the tone to avoid interrupting it
  if (state.audioLock) return;
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
const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start, .redoble-number, .redoble-comenzar, .banquete-label, .banquete-start-btn, .pergamino-send-btn, .mensaje-btn, .mensaje-listen-btn, .pasaje-card, .pasaje-slot, .pasaje-listen-btn, .palabra-oculta-slot");
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

