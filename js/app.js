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
  audioLock: false, // prevents stacked audio from rapid clicks
  sound: localStorage.getItem("reino.sound") !== "off",
  authMode: "login",
  inCastleMap: false,
  cofreDropped: null
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

async function getFirebaseRuntime() {
  if (!firebaseEnabled) return null;

  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]).then(([appModule, firestoreModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const db = firestoreModule.getFirestore(app);
      return {
        db,
        doc: firestoreModule.doc,
        getDoc: firestoreModule.getDoc,
        setDoc: firestoreModule.setDoc,
        serverTimestamp: firestoreModule.serverTimestamp
      };
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
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  try {
    return JSON.parse(localStorage.getItem("reino.users") || "{}") || {};
  } catch { return {}; }
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
  state.user.sound = state.sound ? "on" : "off";
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
  state.sound = user.sound !== "off";
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
  state.sound = localStorage.getItem("reino.sound") !== "off";
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
        // For escudo, replay the phoneme sound
        if (sub.type === "escudo") {
          playPhonemeSound(sub.phonemeFile, sub.phoneme);
          return;
        }
        // Unit 1 (Castillo): use MP3 files from assets/unit_1_sounds/
        if (state.activeUnit.id === "castillo") {
          playUnitSound(state.activeUnit.id, state.activeSubActivityIndex);
          return;
        }
        speak(sub.speak || sub.prompt);
        return;
      }
    }
    speak(state.activeUnit?.activity.speak || state.activeUnit?.activity.prompt);
  });
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
  soundToggle.querySelector("span").textContent = state.sound ? "\u266a" : "\u00d7";
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
  // Calculate progress: count fully completed units
  // For units with subActivities, count as complete only if all sub-activities done
  const total = state.data.units.length;
  let done = 0;

  state.data.units.forEach((unit) => {
    if (unit.subActivities && unit.subActivities.length > 0) {
      if (allSubActivitiesCompleted(unit)) {
        done++;
      }
    } else if (state.completed.includes(unit.id)) {
      done++;
    }
  });

  const percent = Math.round((done / total) * 100);
  progressPercent.textContent = `${percent}%`;
  progressRing.style.setProperty("--value", `${percent * 3.6}deg`);

  const rewards = state.data.units.filter((unit) => {
    if (unit.subActivities && unit.subActivities.length > 0) {
      return allSubActivitiesCompleted(unit);
    }
    return state.completed.includes(unit.id);
  });
  rewardStrip.innerHTML = rewards.length
    ? rewards.map((unit) => `<span class="badge">${unit.icon} ${unit.reward}</span>`).join("")
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

/* =============================================
   ðŸŽµ SAFE AUDIO PLAY â€” Debounces & stops previous
   ============================================= */
function safePlayAudio(audio, onEnded) {
  if (!state.sound || state.audioLock) return;
  state.audioLock = true;
  stopAllAudio();

  audio.currentTime = 0;
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

/* =============================================
   ðŸŽµ STOP ALL AUDIO â€” Avoid overlapping voice lines
   ============================================= */
function stopAllAudio() {
  // Cancel speech synthesis
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
  const audioPath = `assets/unit_${unitNumber}_sounds/activity_${activityNumber}.mp3`;
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

  // 2. Determine feedback file: feedback_{N}.mp3 where N = subIndex + 1
  const activityNumber = subIndex + 1;
  // feedback5.mp3 has no underscore (naming inconsistency), handle specifically
  const feedbackPath = activityNumber === 5
    ? `assets/unit_1_sounds/feedback5.mp3`
    : `assets/unit_1_sounds/feedback_${activityNumber}.mp3`;

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

  activityScene.hidden = true;
  activityZone.classList.add("unit-fullscreen");
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
    $("#checkAnswer").hidden = sub.type === "escudo"; // Escudo is auto-checked by keypress
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

  sub.letters.forEach((letter) => {
    const balloon = document.createElement("button");
    balloon.type = "button";
    balloon.className = "globo";
    balloon.textContent = letter;
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

  const icons = ["\ud83d\udd24", "\ud83c\udfaf", "\ud83d\udd1a"];

  sub.positions.forEach((pos, i) => {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "balcon-box";
    box.dataset.position = pos;
    box.innerHTML = `<span class="box-icon">${icons[i] || "\u2b1c"}</span><span class="box-label">${pos}</span>`;
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
    card.innerHTML = `<span class="card-icon">${sub.icons[i]}</span><span class="card-label">${option}</span>`;
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
  shield.innerHTML = `<span class="shield-icon">\ud83d\udee1\ufe0f</span><span class="shield-letter">?</span>`;
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
  startBtn.textContent = "â–¶ Â¡Empezar!";
  startBtn.addEventListener("click", () => {
    state.escudoStarted = true;
    startBtn.hidden = true;
    hint.textContent = "Â¡Presiona la tecla de la letra que suena!";
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
  if (!state.sound) return;
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
      } else {
        speak(sub.success);
        setTimeout(() => {
          openActivity(state.activeUnit.id);
        }, 1600);
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

function checkAnswer() {
  if (!state.activeUnit) return;

  // Stop any playing voice line / instruction audio when checking
  stopAllAudio();

  // Handle sub-activities (globo, balcon, intruso, escudo, cofre)
  if (state.activeSubActivityIndex !== null) {
    const sub = state.activeUnit.subActivities[state.activeSubActivityIndex];
    if (!sub) return;

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
      default:
        isCorrect = false;
    }

    if (isCorrect) {
      feedback.className = "feedback ok";
      feedback.textContent = `${sub.success} \u00a1Has completado esta actividad!`;
      completeSubActivity(state.activeUnit.id, state.activeSubActivityIndex);
      playTone("success");
      celebrateConfetti();

      // Unit 1 (Castillo): play correct sound â†’ feedback â†’ return to map
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
  // Stop speech/audio before playing a tone so they don't overlap
  stopAllAudio();
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
  const btn = e.target.closest(".primary-btn, .secondary-btn, .answer-choice, .sequence-item, .globo, .balcon-box, .intruso-card, .castle-node, .map-stop, .auth-tab, .auth-link, .auth-submit, .icon-btn, .unit-start");
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

