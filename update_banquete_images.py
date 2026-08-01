#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Actualiza la Actividad 11 (Banquete) para usar imagenes
(pan.png, sopa.png, leche.png) en lugar de palabras de texto.
"""
import json
import os

BASE = r"c:\Users\jesus\Documents\Codex\2026-06-23\m\outputs\lectura-reino"
units_path = os.path.join(BASE, "data", "units.json")

with open(units_path, "r", encoding="utf-8-sig") as f:
    data = json.load(f)

# Buscar la sub-actividad "banquete" en la unidad "castillo"
updated = False
for unit in data.get("units", []):
    if unit.get("id") != "castillo":
        continue
    for sub in unit.get("subActivities", []):
        if sub.get("type") != "banquete":
            continue
        # Mapa de etiqueta -> imagen
        image_map = {
            "LECHE": "assets/images/unit_1/leche.png",
            "SOPA": "assets/images/unit_1/sopa.png",
            "PAN": "assets/images/unit_1/pan.png",
        }
        for w in sub.get("words", []):
            label = w.get("label", "").upper()
            if label in image_map:
                w["image"] = image_map[label]
        updated = True

if not updated:
    print("ERROR: No se encontro la sub-actividad banquete.")
    raise SystemExit(1)

with open(units_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

print("units.json actualizado con imagenes de pan, sopa y leche.")

# Verificacion
with open(units_path, "r", encoding="utf-8-sig") as f:
    check = json.load(f)
for unit in check["units"]:
    if unit.get("id") != "castillo":
        continue
    for sub in unit.get("subActivities", []):
        if sub.get("type") == "banquete":
            for w in sub["words"]:
                print(" ", w["label"], "->", w.get("image"))
print("OK")

