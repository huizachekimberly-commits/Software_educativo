# Reino de las Palabras

Aplicacion web educativa para lectura inicial, construida con HTML, CSS y JavaScript sin frameworks. Incluye actividades interactivas por unidad, narracion, audio de instrucciones, biblioteca de video, mapa de progreso y sistema de cuentas con persistencia local y opcion de sincronizacion en Firebase.

## Resumen

La aplicacion esta orientada a trabajo escolar guiado y practica autonoma. El estudiante avanza por rutas de actividades, desbloquea unidades, repasa actividades ya completadas y conserva su progreso entre sesiones.

Estado funcional actual:

- 3 unidades activas: castillo, bosque y montanas.
- Mapa de viaje lector con nodos bloqueados/desbloqueados.
- Biblioteca con video por unidad y reglas de desbloqueo.
- Actividades de seleccion, arrastre, memoria, secuencias, lectura y voz.
- Avatares con soporte 3D en formato FBX.

## Tecnologias

- HTML5
- CSS3
- JavaScript (ES Modules en runtime para cargas dinamicas)
- Web Speech API (sintesis y reconocimiento de voz, segun navegador)
- Web Audio / HTMLAudioElement
- Three.js + FBXLoader (desde CDN)
- Firebase Firestore (opcional)

## Estructura del Proyecto

```text
lectura-reino-limpio/
├── index.html
├── css/
│   ├── styles.css
│   └── unit3.css
├── js/
│   ├── app.js
│   ├── firebase-config.js
│   └── unit3_render.js
├── data/
│   └── units.json
├── assets/
│   ├── avatars/
│   ├── images/
│   ├── videos/
│   ├── unit_1_sounds/
│   ├── unit_2_sounds/
│   ├── unit_3_sounds/
│   ├── correct_sounds/
│   ├── correct_sounds2/
│   └── correct_sounds3/
└── scripts de verificacion y mantenimiento
```

## Flujo Pedagogico

1. Inicio de sesion o registro de estudiante.
2. Seleccion de avatar.
3. Seleccion de unidad disponible.
4. Avance actividad por actividad con desbloqueo secuencial.
5. Retroalimentacion auditiva y visual inmediata.
6. Registro de progreso y medallas.
7. Opcion de repaso de actividades completadas sin alterar progreso.

## Caracteristicas Principales

### 1) Unidades y actividades

- Cada unidad define subactividades en data/units.json.
- Las subactividades pueden bloquearse por prerequisitos.
- El motor de render en js/app.js enruta por type y pinta la actividad correspondiente.

### 2) Mapa y progreso

- Mapa general de unidades con posiciones configurables.
- Mapa interno por unidad con avance secuencial.
- Barra/porcentaje de progreso global.
- Insignias por unidad completada.

### 3) Audio y retroalimentacion

- Audio instruccional por actividad.
- Carpeta de frases de acierto por unidad:
  - Unidad 1: assets/correct_sounds
  - Unidad 2: assets/correct_sounds2
  - Unidad 3: assets/correct_sounds3
- Secuencia de exito: frase correcta aleatoria y luego feedback de actividad.

### 4) Video por unidad

- Video introductorio por unidad.
- Reproduccion obligatoria la primera vez (si aplica).
- Reproduccion opcional desde biblioteca cuando la unidad este desbloqueada.

### 5) Cuentas y persistencia

- Persistencia local con localStorage.
- Soporte de sincronizacion con Firestore cuando la configuracion esta habilitada.

### 6) Avatares 3D

- Carga dinamica de modelos FBX y textura.
- Render del avatar principal y render dentro de actividades.
- Ajuste de pose base en codigo.

## Requisitos

- Visual Studio Code.
- Extension Live Server.
- Navegador moderno (Chrome o Edge recomendados).
- Conexion a internet para cargar Three.js desde CDN y para Firebase si se usa sincronizacion.

## Ejecucion Local

1. Abrir la carpeta del proyecto en Visual Studio Code.
2. Verificar que index.html este en la raiz.
3. Iniciar Live Server sobre index.html.
4. Abrir la URL local generada por Live Server.

Importante: no abrir index.html con doble clic. La app usa fetch sobre data/units.json y requiere servidor local.

## Configuracion de Contenido

Archivo principal de contenido:

- data/units.json

Desde este archivo puedes ajustar:

- Titulo, descripcion y dependencia de unidades.
- Lista de subactividades y tipo de actividad.
- Preguntas, opciones, respuestas, pistas y mensajes de exito.
- Rutas de imagen, audio y video.

## Configuracion Visual

Archivos principales:

- css/styles.css
- css/unit3.css

Se recomienda separar cambios por bloques:

- layout general
- mapa y nodos
- estilos por actividad
- animaciones

## Configuracion Funcional

Archivo principal de logica:

- js/app.js

Secciones clave:

- estado global
- autenticacion y persistencia
- render de unidades, biblioteca y mapa
- openSubActivity y enrutamiento por tipo
- motor de audio y feedback
- integracion de reconocimiento de voz
- renderizado de avatar 3D

## Configuracion Firebase (Opcional)

Archivo:

- js/firebase-config.js

Pasos generales:

1. Crear proyecto en Firebase.
2. Habilitar Firestore.
3. Completar credenciales web en js/firebase-config.js.
4. Verificar reglas de seguridad de Firestore.

Si Firebase no responde, la app continua usando localStorage.

## Personalizacion Frecuente

### Mover nodos del mapa de unidades

En js/app.js modificar el objeto de posiciones del mapa general.

### Cambiar fondos por actividad

En js/app.js revisar arreglos de rutas por unidad para backgrounds de subactividades.

### Ajustar voz y reconocimiento

En js/app.js revisar:

- llamadas a speechSynthesis
- bloques SpeechRecognition/webkitSpeechRecognition

### Cambiar animaciones

En css/styles.css editar keyframes y transiciones de cada actividad.

## Troubleshooting

### No carga la app

- Verifica que estes usando Live Server.
- Revisa la consola del navegador para errores de fetch a data/units.json.

### No se escucha audio

- Verifica permisos del navegador.
- Confirma rutas de audio en units.json.
- Valida que no haya bloqueo por autoplay hasta primer clic.

### No funciona el microfono

- Usa HTTPS o localhost.
- Permite acceso al microfono.
- Verifica compatibilidad del navegador con SpeechRecognition.

### No carga avatar 3D

- Revisa rutas de model y texture en units.json.
- Verifica conexion para cargar Three.js desde CDN.

## Calidad y Verificacion

El repositorio incluye scripts auxiliares de verificacion para contenido y consistencia de archivos (json/html/imports/estados). Puedes ejecutarlos segun tu flujo interno para validar integridad antes de publicar cambios.

## Mantenimiento Recomendado

- Mantener data/units.json como fuente unica de contenido pedagogico.
- Versionar cambios por unidad o por actividad para facilitar rollback.
- Probar cada actividad en modo normal y en modo repaso.
- Verificar rutas de assets despues de mover archivos.

## Licencia

Define aqui la licencia del proyecto segun tu institucion o equipo.
