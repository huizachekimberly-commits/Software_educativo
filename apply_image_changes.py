#!/usr/bin/env python3
import os

BASE = r"c:\Users\jesus\Documents\Codex\2026-06-23\m\outputs\lectura-reino"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written: " + path)

css_path = os.path.join(BASE, 'css', 'styles.css')
css = read_file(css_path)

# --- 1. Caldero cauldron ---
old_c = """  width: 200px;
  height: 180px;
  background: linear-gradient(145deg, #6b3a2a, #4a2518);
  border-radius: 50% 50% 45% 45% / 40% 40% 55% 55%;"""

new_c = """  width: 240px;
  height: 240px;
  background: url('../assets/images/unit_1/caldero.png') no-repeat center center;
  background-size: contain;"""

if old_c in css:
    css = css.replace(old_c, new_c)
    print("Caldero 1: OK")
else:
    print("Caldero 1: NOT FOUND")

# Remove box-shadow and text-shadow that were part of old cauldron
old_c2 = """  box-shadow:
    0 12px 32px rgba(0,0,0,0.25),
    inset 0 -20px 40px rgba(0,0,0,0.3),
    inset 0 8px 20px rgba(255, 228, 77, 0.1);
  position: relative;
  transition: all 0.4s var(--bounce);
  text-shadow: 0 0 20px rgba(255, 228, 77, 0.3);
}"""

new_c2 = """  position: relative;
  transition: all 0.4s var(--bounce);
  text-shadow: 0 0 20px rgba(0,0,0,0.8);
}"""

if old_c2 in css:
    css = css.replace(old_c2, new_c2)
    print("Caldero 2: OK")
else:
    print("Caldero 2: NOT FOUND")

# --- 2. Carruaje wagon emoji to image ---
old_w = """  content: "\U0001F683";
  position: absolute;
  top: -28px;
  font-size: 1.4rem;"""

new_w = """  content: "";
  position: absolute;
  top: -36px;
  width: 40px;
  height: 40px;
  background: url('../assets/images/unit_1/carruaje.png') no-repeat center center;
  background-size: contain;"""

if old_w in css:
    css = css.replace(old_w, new_w)
    print("Carruaje: OK")
else:
    print("Carruaje: NOT FOUND - trying emoji escape")

# --- 3. Escalera series to use escalera.png background ---
old_e1 = """  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 24px;
  background: linear-gradient(180deg, #fce4d6, #f5d0b8);
  border: 4px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  width: 100%;
}"""

new_e1 = """  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  padding: 10px;
  width: 100%;
  min-height: 350px;
  background: url('../assets/images/unit_1/escalera.png') no-repeat center bottom;
  background-size: contain;
  position: relative;
}"""

# Find the escalera-series block more precisely
idx = css.find(".escalera-series {")
if idx >= 0:
    # Find the closing brace
    end_idx = css.find("\n}", idx)
    if end_idx >= 0:
        end_idx = css.find("}", end_idx)
        if end_idx >= 0:
            old_block = css[idx:end_idx+1]
            new_block = ".escalera-series {\n" + new_e1
            css = css.replace(old_block, new_block)
            print("Escalera series: OK")
        else:
            print("Escalera series: no closing brace found")
    else:
        print("Escalera series: no newline+brace found")
else:
    print("Escalera series: NOT FOUND")

# Update escalera-step to be absolute positioned
old_step = """  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 56px;
  padding: 8px 16px;
  font-size: 2rem;"""

new_step = """  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 56px;
  padding: 8px 16px;
  font-size: 2rem;"""

if old_step in css:
    css = css.replace(old_step, new_step)
    print("Escalera step: OK")
else:
    print("Escalera step: NOT FOUND")

# Hide escalera arrows
old_arrow = """.escalera-arrow {
  font-size: 1.6rem;
  color: var(--muted);
  font-weight: 700;
  padding: 0 2px;
}"""

new_arrow = """.escalera-arrow {
  display: none;
}"""

if old_arrow in css:
    css = css.replace(old_arrow, new_arrow)
    print("Escalera arrow: OK")
else:
    print("Escalera arrow: NOT FOUND")

write_file(css_path, css)

# ===========================================================================
# JS CHANGES
# ===========================================================================
js_path = os.path.join(BASE, 'js', 'app.js')
js = read_file(js_path)

old_js_e = """  // Series display -- show the sequence with a blank
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
      arrow.textContent = "\u2192";
      seriesDisplay.appendChild(arrow);
    }
  });"""

new_js_e = """  // Series display -- stairway with escalera.png background
  const seriesDisplay = document.createElement("div");
  seriesDisplay.className = "escalera-series";
  seriesDisplay.style.position = "relative";

  // Positions for each syllable on the staircase steps (left%, bottom%)
  const stepPositions = [
    { left: "8%", bottom: "4%" },
    { left: "14%", bottom: "22%" },
    { left: "20%", bottom: "40%" },
    { left: "26%", bottom: "58%" },
    { left: "32%", bottom: "76%" }
  ];

  sub.series.forEach((item, i) => {
    const step = document.createElement("span");
    step.className = "escalera-step";
    step.style.position = "absolute";
    step.style.left = stepPositions[i].left;
    step.style.bottom = stepPositions[i].bottom;
    step.style.transform = "translateX(-50%)";
    if (item === "__") {
      step.classList.add("escalera-step-blank");
      step.id = "escaleraBlankStep";
      step.textContent = "?";
    } else {
      step.textContent = item;
    }
    seriesDisplay.appendChild(step);
  });"""

if old_js_e in js:
    js = js.replace(old_js_e, new_js_e)
    print("JS Escalera: OK")
else:
    print("JS Escalera: NOT FOUND")

write_file(js_path, js)

print("\nDone!")
