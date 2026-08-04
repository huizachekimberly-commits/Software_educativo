#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_unit2.py — Verificación de la Unidad 2 (Bosque de las Palabras)

Comprueba:
  1. data/units.json es JSON válido y la unidad "bosque" tiene
     requires == "castillo" y exactamente 5 sub-actividades con tipos
     correctos (oracion, puente, frase, detective, accion).
  2. Existencia de assets de audio e imágenes referenciados.
  3. Cableado en js/app.js (render functions, casos en openSubActivity
     y checkAnswer, clases CSS, has-forest-bg, playOptionSound,
     getUnitSoundFolder, animateActivitySuccess).
  4. Matemática de progreso: 15 (castillo) + 5 (bosque) = 20.
"""

import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))

UNITS_JSON = os.path.join(BASE, "data", "units.json")
APP_JS = os.path.join(BASE, "js", "app.js")
STYLES_CSS = os.path.join(BASE, "css", "styles.css")

EXPECTED_TYPES = {"oracion", "puente", "frase", "detective", "accion"}
REQUIRED_SUB_FIELDS = ["id", "title", "prompt", "speak", "type", "question", "answer", "success", "hint"]

PASS = 0
WARN = 0
ERROR = 0


def ok(msg):
    global PASS
    PASS += 1
    print(f"  [OK]    {msg}")


def warn(msg):
    global WARN
    WARN += 1
    print(f"  [WARN]  {msg}")


def err(msg):
    global ERROR
    ERROR += 1
    print(f"  [ERROR] {msg}")


def path_exists(*parts):
    return os.path.exists(os.path.join(BASE, *parts))


def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def option_audio_name(label):
    """La app quita la puntuación final antes de buscar el MP3."""
    return re.sub(r"[.!?]+$", "", str(label).strip())


def section(title):
    print(f"\n=== {title} ===")


# ----------------------------------------------------------------------
# 1) UNITS.JSON — estructura
# ----------------------------------------------------------------------
section("1) data/units.json — estructura de la Unidad 2")

try:
    with open(UNITS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    ok("units.json es JSON válido")
except Exception as e:
    err(f"units.json no es JSON válido: {e}")
    print(f"\nResumen: {PASS} OK, {WARN} WARN, {ERROR} ERROR")
    sys.exit(1)

units = data.get("units", [])
bosque = next((u for u in units if u.get("id") == "bosque"), None)

if not bosque:
    err("No existe la unidad con id 'bosque'")
    print(f"\nResumen: {PASS} OK, {WARN} WARN, {ERROR} ERROR")
    sys.exit(1)

ok("La unidad 'bosque' existe")

if bosque.get("requires") == "castillo":
    ok("bosque.requires == 'castillo'")
else:
    err(f"bosque.requires debe ser 'castillo', se encontró: {bosque.get('requires')!r}")

if bosque.get("number") == 2:
    ok("bosque.number == 2")
else:
    warn(f"bosque.number es {bosque.get('number')!r} (se espera 2)")

if bosque.get("theme") == "theme-forest":
    ok("bosque.theme == 'theme-forest'")
else:
    warn(f"bosque.theme es {bosque.get('theme')!r} (se espera 'theme-forest')")

subs = bosque.get("subActivities", [])
if len(subs) == 5:
    ok("bosque tiene exactamente 5 sub-actividades")
else:
    err(f"bosque tiene {len(subs)} sub-actividades (se esperan 5)")

types = [s.get("type") for s in subs]
if set(types) == EXPECTED_TYPES:
    ok(f"Tipos correctos: {sorted(types)}")
else:
    err(f"Tipos incorrectos: {types} — se esperan {sorted(EXPECTED_TYPES)}")

for sub in subs:
    missing = [f for f in REQUIRED_SUB_FIELDS if f not in sub]
    if missing:
        err(f"Sub-actividad '{sub.get('id', '?')}' le faltan campos: {missing}")
    else:
        ok(f"Sub-actividad '{sub['id']}' ({sub['type']}) tiene todos los campos básicos")

    # Campos específicos por tipo
    t = sub.get("type")
    if t == "oracion":
        for f in ["prefix", "options", "catImage", "bowlImage"]:
            if f not in sub:
                err(f"oracion '{sub.get('id')}' le falta '{f}'")
        if "options" in sub and all(isinstance(o, dict) and "label" in o and "icon" in o for o in sub["options"]):
            ok(f"oracion '{sub['id']}' options bien formadas")
    elif t == "puente":
        for f in ["prefix", "options", "monkeyEmoji"]:
            if f not in sub:
                err(f"puente '{sub.get('id')}' le falta '{f}'")
    elif t == "frase":
        for f in ["story", "options"]:
            if f not in sub:
                err(f"frase '{sub.get('id')}' le falta '{f}'")
    elif t == "detective":
        for f in ["clues", "options"]:
            if f not in sub:
                err(f"detective '{sub.get('id')}' le falta '{f}'")
    elif t == "accion":
        for f in ["prefix", "options"]:
            if f not in sub:
                err(f"accion '{sub.get('id')}' le falta '{f}'")


# ----------------------------------------------------------------------
# 2) ASSETS — audio e imágenes
# ----------------------------------------------------------------------
section("2) Assets (audio e imágenes)")

SOUND_FOLDER = os.path.join("assets", "unit_2_sounds", "theme1")

for i, sub in enumerate(subs, start=1):
    act = os.path.join(SOUND_FOLDER, f"activity_{i}.mp3")
    fb = os.path.join(SOUND_FOLDER, f"feedback{i}.mp3")
    if path_exists(act):
        ok(f"audio instrucción {act}")
    else:
        err(f"falta audio instrucción: {act}")
    if path_exists(fb):
        ok(f"audio feedback {fb}")
    else:
        err(f"falta audio feedback: {fb}")

# MP3 de palabras de cada opción (con fallback a voz sintética en la app)
for sub in subs:
    t = sub.get("type")
    if t == "frase":
        opts = [o for o in sub.get("options", [])]
    else:
        opts = [o.get("label") for o in sub.get("options", []) if isinstance(o, dict)]
    for opt in opts:
        name = option_audio_name(opt)
        p = os.path.join(SOUND_FOLDER, f"{name}.mp3")
        if path_exists(p):
            ok(f"MP3 de opción: {name}.mp3")
        else:
            warn(f"MP3 de opción no encontrado (usa voz sintética): {name}.mp3")

# Imágenes referenciadas
image_refs = set()
for sub in subs:
    for key in ["catImage", "bowlImage"]:
        v = sub.get(key)
        if v and isinstance(v, str) and ("assets/" in v or v.startswith("assets/")):
            image_refs.add(v)
    for o in sub.get("options", []):
        if isinstance(o, dict):
            icon = o.get("icon", "")
            if isinstance(icon, str) and icon.startswith("assets/"):
                image_refs.add(icon)

for img in sorted(image_refs):
    if path_exists(img):
        ok(f"imagen: {img}")
    else:
        err(f"falta imagen: {img}")


# ----------------------------------------------------------------------
# 3) CABLEADO EN js/app.js
# ----------------------------------------------------------------------
section("3) Cableado en js/app.js")

if not os.path.exists(APP_JS):
    err("No se encontró js/app.js")
    print(f"\nResumen: {PASS} OK, {WARN} WARN, {ERROR} ERROR")
    sys.exit(1)

app_js = read_text(APP_JS)

# Render functions
for fn in ["renderOracionActivity", "renderPuenteActivity", "renderFraseActivity",
           "renderDetectiveActivity", "renderAccionActivity", "placeFrase",
           "playOptionSound", "animateActivitySuccess"]:
    if f"function {fn}" in app_js:
        ok(f"función {fn}() presente")
    else:
        err(f"falta función {fn}()")

# Casos de switch en openSubActivity y checkAnswer (cada tipo >= 2 ocurrencias:
# una en openSubActivity y otra en checkAnswer; también puede aparecer en animateActivitySuccess)
for t in sorted(EXPECTED_TYPES):
    token = f'case "{t}":'
    count = app_js.count(token)
    if count >= 2:
        ok(f"switch case '{t}' presente ({count} veces: openSubActivity/checkAnswer)")
    else:
        err(f"switch case '{t}' aparece solo {count} veces (se esperan >= 2)")

# animateActivitySuccess cases
for t in sorted(EXPECTED_TYPES):
    token = f'case "{t}":'
    # localizar dentro de animateActivitySuccess
    start = app_js.find("function animateActivitySuccess")
    end = app_js.find("function checkAnswer")
    block = app_js[start:end] if start != -1 and end != -1 else ""
    if token in block:
        ok(f"animateActivitySuccess maneja '{t}'")
    else:
        warn(f"animateActivitySuccess no tiene caso explícito para '{t}'")

# limpieza has-forest-bg
if "has-forest-bg" in app_js:
    ok("clase 'has-forest-bg' referenciada en app.js")
    for ctx in ["openActivity", "closeActivity"]:
        start = app_js.find(f"function {ctx}")
        end = app_js.find("function ", start + 1) if start != -1 else -1
        block = app_js[start:end] if start != -1 else ""
        if "has-forest-bg" in block:
            ok(f"limpieza de 'has-forest-bg' en {ctx}()")
        else:
            err(f"{ctx}() no limpia 'has-forest-bg'")
else:
    err("app.js no menciona 'has-forest-bg'")

# getUnitSoundFolder → bosque usa theme1
if 'unitId === "bosque"' in app_js and "assets/unit_${unitNumber}_sounds/theme1" in app_js:
    ok("getUnitSoundFolder devuelve theme1 para 'bosque'")
else:
    err("getUnitSoundFolder no está cableado correctamente para 'bosque' (theme1)")

# playOptionSound reproducir MP3 de la opción en placeFrase (TODO paso 1)
if "playOptionSound(frase)" in app_js:
    ok("placeFrase() reproduce el MP3 de la opción (playOptionSound)")
else:
    err("placeFrase() no llama playOptionSound")

# checkAnswer reproduce correct->feedback->map para castillo Y bosque
if 'state.activeUnit.id === "castillo" || state.activeUnit.id === "bosque"' in app_js:
    ok("checkAnswer reproduce correct→feedback→mapa para castillo y bosque")
else:
    err("checkAnswer no incluye 'bosque' en la secuencia correct→feedback→mapa")

# isUnitLocked (unidad bloqueada por requires)
if "isUnitLocked" in app_js and "allSubActivitiesCompleted" in app_js:
    ok("isUnitLocked / allSubActivitiesCompleted presentes (desbloqueo por castillo)")
else:
    warn("No se encontró la lógica isUnitLocked/allSubActivitiesCompleted")


# ----------------------------------------------------------------------
# 4) CLASES CSS
# ----------------------------------------------------------------------
section("4) Clases CSS de la Unidad 2")

if not os.path.exists(STYLES_CSS):
    err("No se encontró css/styles.css")
else:
    css = read_text(STYLES_CSS)
    required_css = [
        # escenario/bosque
        ".has-forest-bg", ".forest-map",
        # oracion
        ".oracion-container", ".oracion-scene", ".oracion-cat", ".oracion-bowl",
        ".oracion-options", ".oracion-option", ".oracion-blank",
        # puente
        ".puente-container", ".puente-scene", ".puente-monkey", ".puente-planks",
        ".puente-options", ".puente-option", ".puente-blank",
        # frase
        ".frase-container", ".frase-paragraph", ".frase-dropzone", ".frase-options", ".frase-option",
        # detective
        ".detective-container", ".detective-scene", ".detective-clue",
        ".detective-options", ".detective-option",
        # accion
        ".accion-container", ".accion-scene", ".accion-runner", ".accion-trail",
        ".accion-options", ".accion-option", ".accion-blank",
        # animaciones de éxito
        ".activity-success", ".cat-walks-to-bowl", ".monkey-crosses",
        ".paragraph-lit", ".detective-solved", ".runner-victory",
    ]
    for cls in required_css:
        if cls in css:
            ok(f"clase CSS {cls} presente")
        else:
            err(f"falta clase CSS {cls}")


# ----------------------------------------------------------------------
# 5) MATEMÁTICA DE PROGRESO
# ----------------------------------------------------------------------
section("5) Matemática de progreso (castillo + bosque)")

castillo = next((u for u in units if u.get("id") == "castillo"), None)
if castillo and castillo.get("subActivities"):
    castle_count = len(castillo["subActivities"])
    if castle_count == 15:
        ok(f"Castillo tiene 15 sub-actividades (encontradas: {castle_count})")
    else:
        err(f"Castillo tiene {castle_count} sub-actividades (se esperan 15)")
else:
    castle_count = 0
    err("No se encontró la unidad 'castillo' con subActivities")

bosque_count = len(subs)
if bosque_count == 5:
    ok("Bosque tiene 5 sub-actividades")
else:
    err(f"Bosque tiene {bosque_count} sub-actividades (se esperan 5)")

total = castle_count + bosque_count
if total == 20:
    ok(f"Total de actividades: {castle_count} + {bosque_count} = {total} (esperado 20)")
else:
    err(f"Total de actividades: {castle_count} + {bosque_count} = {total} (se esperan 20)")


# ----------------------------------------------------------------------
# RESUMEN
# ----------------------------------------------------------------------
print("\n" + "=" * 50)
print(f"RESUMEN: {PASS} OK | {WARN} ADVERTENCIAS | {ERROR} ERRORES")
print("=" * 50)

if ERROR == 0:
    print("✅ UNIDAD 2 VERIFICADA CORRECTAMENTE")
    sys.exit(0)
else:
    print("❌ SE ENCONTRARON PROBLEMAS QUE REQUIEREN CORRECCIÓN")
    sys.exit(1)

