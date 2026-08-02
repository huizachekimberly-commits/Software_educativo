# TODO: Unidad 2 — Bosque de las Palabras (5 actividades)

## ✅ Estado: COMPLETADO

## Objetivo ✅
Implementar las primeras 5 actividades de la Unidad 2 (Bosque de las Palabras), accesible solo cuando la Unidad 1 (Castillo de las Letras) esté completada al 100%. La dinámica es la misma que la Unidad 1: se abre la unidad, se abre el mapa y aparecen las actividades.

## Actividades implementadas ✅
1. **El Letrero del Bosque** (`oracion`) — Completar "El gato toma de la ___" con el pictograma "sopa"; el gato se acerca a comer.
2. **El Puente del Mono** (`puente`) — Completar "El mono come una ___" con "banana"; se construye el puente y el mono cruza.
3. **El Cuento Incompleto** (`frase`) — Arrastrar el recuadro de texto externo que cierra la idea; el párrafo se ilumina.
4. **El Detective de la Recámara** (`detective`) — Deducir con pistas visuales (cama, almohada) que la palabra es "cama".
5. **El Gran Deportista** (`accion`) — Elegir la acción correcta ("corriendo") tras ver la animación; efecto de victoria.

## Pasos completados

### 1. Modificar `data/units.json` ✅
- [x] Agregar `"requires": "castillo"` a la unidad `bosque`
- [x] Agregar `subActivities` con las 5 actividades nuevas

### 2. Modificar `js/app.js` ✅
- [x] `isUnitLocked(unit)` — bloqueo de unidades con `requires`
- [x] Bloquear tarjeta y mapa de la Unidad 2 hasta completar Unidad 1
- [x] Guardia de bloqueo en `openActivity()`
- [x] Nuevos casos en `openSubActivity()`: oracion, puente, frase, detective, accion
- [x] Funciones render: `renderOracionActivity`, `renderPuenteActivity`, `renderFraseActivity`, `renderDetectiveActivity`, `renderAccionActivity`
- [x] `animateActivitySuccess(sub)` — animaciones de éxito por escena
- [x] Nuevos casos en `checkAnswer()`
- [x] `playUnitSound()` con narración por voz si no hay MP3 (Unidad 2)
- [x] `renderCastleMap()` con tema bosque cuando no hay imagen de mapa
- [x] `closeActivity()` limpieza del fondo bosque

### 3. Modificar `css/styles.css` ✅
- [x] Estilos de unidad bloqueada (`.unit-card.locked`, `.map-stop-locked`)
- [x] Fondo de mapa bosque (`.forest-map`)
- [x] Fondo de actividad bosque (`.has-forest-bg`)
- [x] Estilos de las 5 actividades nuevas
- [x] Animaciones (gato come, tablones, mono cruza, correr, victoria)

### 4. Verificar pendiente
- [ ] Unidad 2 bloqueada hasta completar Unidad 1 al 100%
- [ ] Mapa del bosque con las 5 actividades en cadena
- [ ] Las 5 actividades responden y completan correctamente
- [ ] Progreso cuenta 20 actividades (15 castillo + 5 bosque)
- [ ] Botón "Escuchar" narra las instrucciones de la Unidad 2
