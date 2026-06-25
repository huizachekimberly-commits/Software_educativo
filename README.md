# Aventura de Lectura en el Reino de las Palabras

App web educativa hecha con HTML, CSS y JavaScript puro. Funciona con Live Server en Visual Studio Code y guarda el progreso del estudiante en `localStorage`.

## Jerarquia

```text
lectura-reino/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    └── units.json
```

## Que incluye

- Pantalla principal con menu, avatar lector, progreso, recompensas, biblioteca y mapa.
- Cuatro unidades educativas:
  - Castillo de las Letras.
  - Bosque de las Palabras.
  - Montanas de los Cuentos.
  - Oceano de la Comprension Lectora.
- Actividades interactivas por unidad.
- Narracion con Web Speech API.
- Practica de pronunciacion cuando el navegador permite reconocimiento de voz.
- Efectos de sonido generados con Web Audio API.
- Animaciones CSS y escenarios visuales.

## Probar con Live Server

1. Abre Visual Studio Code.
2. Abre la carpeta `lectura-reino`.
3. Instala la extension Live Server si no la tienes.
4. Haz clic derecho sobre `index.html`.
5. Selecciona `Open with Live Server`.

> Importante: usa Live Server porque la app lee `data/units.json` con `fetch`. Si abres el HTML directo, algunos navegadores bloquean esa lectura.

## Editar contenido

Para cambiar unidades, actividades, evaluaciones, retroalimentacion, biblioteca o avatares, edita:

```text
data/units.json
```

## Que modificar en VS Code

Para cambiar la pantalla de inicio:

```text
index.html
```

Busca:

```html
<section class="hero hero-split" id="inicio">
```

Ahi esta la mitad izquierda con el titulo del reino y la mitad derecha con el selector de avatares.

Para cambiar colores, tamanos, animaciones y distribucion:

```text
css/styles.css
```

Busca estas clases:

```css
.hero
.hero-copy
.hero-avatar-panel
.avatar-grid-vertical
.avatar-choice
```

Para cambiar nombres, iconos o futuros modelos de avatar:

```text
data/units.json
```

Busca:

```json
"avatars"
```

Para modificar como se dibujan o seleccionan los avatares:

```text
js/app.js
```

Busca:

```js
function renderAvatars()
function updateHeroAvatar()
```

## Avatares 3D

La app ya puede mostrar modelos 3D reales en formato `.fbx` usando Three.js. Los modelos actuales estan en:

```text
assets/avatars/
```

Modelos agregados:

```text
assets/avatars/King.fbx
assets/avatars/Queen.fbx
assets/avatars/Prince.fbx
assets/avatars/Texture.png
```

La relacion entre avatar y modelo se modifica en:

```text
data/units.json
```

Busca:

```json
"model": "assets/avatars/King.fbx"
"texture": "assets/avatars/Texture.png"
```

La carga 3D se modifica en:

```text
js/app.js
```

Busca:

```js
function renderHeroAvatar()
function loadAvatarTexture()
function loadThreeRuntime()
function prepareModel()
function applyStandingPose()
```

Importante: como los archivos son `.fbx`, la app carga Three.js desde CDN. Para ver los modelos 3D necesitas internet al probar con Live Server. Si quieres que funcione 100% offline, conviene convertir los modelos a `.glb` o descargar Three.js dentro del proyecto.

## Ajustar pose de los modelos 3D

Si los brazos quedan muy abiertos o cruzados, modifica estos valores en:

```text
js/app.js
```

Busca:

```js
function applyStandingPose(model)
```

Los valores principales son:

```js
setBoneRotation(bones["upper_arm.L"], 0.08, 0.05, -1.18);
setBoneRotation(bones["upper_arm.R"], 0.08, -0.05, 1.18);
```

Para acercar mas los brazos al cuerpo, aumenta un poco la magnitud de `-1.18` y `1.18`. Para regresarlos hacia pose T, usa valores mas cercanos a `0`.

## Subir a GitHub

Desde la terminal dentro de `lectura-reino`:

```bash
git init
git add .
git commit -m "Version inicial de app educativa"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Para futuras versiones:

```bash
git add .
git commit -m "Mejora actividades y diseno"
git push
```
