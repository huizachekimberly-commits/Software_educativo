# TODO: Actividad 8 - Bingo solo sílabas PA, LE, SO, TU, MI, RO

## Objetivo
En la actividad "El Torneo del Gran BINGO Medieval" (sub-activity 8, index 7), solo deben pronunciarse las sílabas **PA, LE, SO, TU, MI, RO**. Las sílabas distractoras **Ti, Mo, Si** quedan visibles en el cartón como distracción visual, pero **NUNCA** serán dichas por la voz robótica ni seleccionadas como objetivo.

## Pasos

### 1. Modificar `js/app.js`
- [x] `playNextBingoSyllable()`: cambiar fuente de selección de `sub.syllables` → `sub.answer` (solo PA, LE, SO, TU, MI, RO)
- [x] Handler de clic correcto del BINGO: finalizar al marcar las 6 correctas (`sub.answer.length`) en vez de 9 (`sub.syllables.length`)
- [x] Contador `Marcadas: X/Y` mostrar `/6` en vez de `/9`

### 2. Verificar
- [ ] Probar que solo se pronuncien PA, LE, SO, TU, MI, RO
- [ ] Probar que Ti, Mo, Si nunca se pronuncien
- [ ] Probar que el BINGO se complete al marcar las 6 sílabas correctas
- [ ] Probar que las 3 distractoras sigan visibles en el cartón

---

## Actividad 11 (Banquete) — Imágenes en la cinta transportadora

## Objetivo
En la actividad "El Banquete del Gran Comedor" (sub-activity 12, index 11), los productos de la cinta transportadora deben mostrarse con sus imágenes (pan.png, sopa.png, leche.png) en lugar de texto. La orden del cliente también muestra la imagen del producto solicitado.

## Pasos

### 1. Modificar `data/units.json`
- [x] Añadir la propiedad `image` a cada palabra del banquete:
  - `LECHE` → `assets/images/unit_1/leche.png`
  - `SOPA` → `assets/images/unit_1/sopa.png`
  - `PAN` → `assets/images/unit_1/pan.png`

### 2. Modificar `js/app.js`
- [x] `spawnProduct()`: renderizar `<img class="banquete-label-image">` con la imagen del producto y clase `has-image` cuando `word.image` exista
- [x] `startBanqueteRound()`: mostrar la imagen del producto en la orden (`banquete-order-image`) tras escuchar el audio
- [x] `PRODUCT_WIDTH` ajustado de 170 → 180 para acomodar las imágenes

### 3. Modificar `css/styles.css`
- [x] Estilos para `.banquete-label.has-image` (fondo blanco, sin mayúsculas, padding reducido)
- [x] Estilos para `.banquete-label-image` (tamaño máximo 140×76px, object-fit contain)
- [x] Estados seleccionado/correcto/incorrecto con fondo blanco para variantes con imagen
- [x] Estilos para `.banquete-order-image` (tamaño máximo 90×48px)

### 4. Verificar
- [ ] Probar que los productos aparezcan con imágenes en la cinta transportadora
- [ ] Probar que la orden del cliente muestre la imagen del producto
- [ ] Probar que las imágenes mantengan los estados visuales al seleccionar (correcto/incorrecto)

