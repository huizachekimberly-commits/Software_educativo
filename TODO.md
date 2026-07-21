# TODO: Castle Map for Unidad 1 with 5 Gated Activities

## Step 1: Update `data/units.json`
- [x] Restructure "castillo" unit with 5 sub-activities
- [x] Add `castleMapImage` field pointing to `castle_map.jpeg`
- [x] Define content/answer data for: Globos, Balcones, Intruso, Escudo, Cofres

## Step 2: Update `css/styles.css`
- [x] Castle map layout (background image, node pins, paths)
- [x] Locked/unlocked/completed node states
- [x] Globo (balloon) floating activity styles
- [x] Balcon (3-box) positional selection styles
- [x] Intruso card selection styles
- [x] Escudo timer/shield styles
- [x] Cofre drag & drop styles

## Step 3: Update `js/app.js`
- [x] Import castle phoneme audio system
- [x] Add sub-activity tracking in state (e.g., "castillo-0" to "castillo-4")
- [x] Modify `openActivity` to detect castle unit → show castle map
- [x] `renderCastleMap()` — show map image + numbered pins + path connections
- [x] Gate logic: `isActivityUnlocked(unitId, index)`
- [x] `renderGloboActivity()` — 4 floating balloons with letters
- [x] `renderBalconActivity()` — word + 3 boxes (Inicio, Medio, Fin)
- [x] `renderIntrusoActivity()` — 4 picture/word cards
- [x] `renderEscudoActivity()` — phoneme audio + 5s countdown
- [x] `renderCofreActivity()` — drag word card to vowel boxes
- [x] Modify `checkAnswer` for all 5 types
- [x] Modify unit completion logic (all 5 sub-activities marked done)

## Step 4: Verify & Cleanup
- [x] Verify `index.html` needs no changes (uses existing activity zone)
- [x] Final review of all files

