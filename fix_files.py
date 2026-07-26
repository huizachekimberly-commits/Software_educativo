import json
import os

print("="*60)
print("CHECKING DATA/UNITS.JSON")
print("="*60)

# Read current corrupted file
current_path = 'data/units.json'
with open(current_path, 'r', encoding='utf-8-sig') as f:
    current_content = f.read()
print(f"Current file length: {len(current_content)} chars")
print(f"Current file first 100 chars: {repr(current_content[:100])}")
print(f"Current file last 100 chars: {repr(current_content[-100:])}")

# Read restored from git (restored_units3 was saved with Out-File -Encoding utf8)
restored_path = 'restored_units3.json'
with open(restored_path, 'r', encoding='utf-8-sig') as f:
    restored_content = f.read()

# Remove BOM if present
if restored_content.startswith('\ufeff'):
    restored_content = restored_content[1:]

try:
    data = json.loads(restored_content)
    print(f"\nGit version is valid JSON!")
    print(f"Units: {len(data.get('units', []))}")
    for u in data['units']:
        subs = u.get('subActivities', [])
        print(f"  - Unit {u['id']} (number {u['number']}): {len(subs)} sub-activities")
        if subs:
            for s in subs:
                print(f"      * {s['id']} (type: {s['type']})")
except json.JSONDecodeError as e:
    print(f"\nGit version JSON error: {e}")

# Overwrite the corrupted file with the git version
with open(current_path, 'w', encoding='utf-8') as f:
    # Write without BOM
    f.write(restored_content)

print(f"\n✅ Written {len(restored_content)} bytes to {current_path}")

print("\n" + "="*60)
print("CHECKING JS/APP.JS - OPENSUBACTIVITY FUNCTION")
print("="*60)

with open('js/app.js', 'r', encoding='utf-8-sig') as f:
    js_content = f.read()

# Check for the switch statement
if 'switch (sub.type)' in js_content:
    print("✅ switch (sub.type) found in app.js")
    
    # Extract the switch block
    switch_start = js_content.find('switch (sub.type)')
    # Find the closing brace of the switch
    switch_end = js_content.find('default:', switch_start)
    block = js_content[switch_start:switch_end + 200]
    
    import re
    cases = re.findall(r'case "(\w+)"', block)
    print(f"   Cases found: {cases}")
    
    expected = ['globo', 'balcon', 'intruso', 'escudo', 'cofre', 'caldero', 'carruaje', 'bingo', 'escalera', 'redoble', 'banquete', 'pergamino']
    missing = [c for c in expected if c not in cases]
    if missing:
        print(f"❌ Missing cases: {missing}")
    else:
        print(f"✅ All 12 cases present!")
else:
    print("❌ switch (sub.type) NOT found in app.js!")

# Check for the fix_carruaje_final.py script patterns
print("\n" + "="*60)
print("VERIFYING FIX SCRIPT DOESN'T NEED TO RUN")
print("="*60)

old_broken = '''  } else {
    $("#checkAnswer").hidden = sub.type === "escudo"; // Escudo is auto-checked by keypress
    $("#listenPrompt").hidden = false;
    $("#pronunciationBtn").hidden = true;
  }


      break;
    case "escalera":
      renderEscaleraActivity(sub);
      break;
    default:
      feedback.textContent = "Actividad no disponible.";
  }
}



  sub.positions.forEach((pos, i) => {'''

if old_broken in js_content:
    print("❌ Broken pattern STILL present! Fix script would run.")
else:
    print("✅ Broken pattern NOT present. App.js is already fixed!")

print("\n" + "="*60)
print("DONE!")
print("="*60)

