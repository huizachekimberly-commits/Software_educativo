import io

s = io.open('js/app.js', encoding='utf-8-sig').read()
u3 = io.open('js/unit3_render.js', encoding='utf-8-sig').read()
alltext = s + u3

print("=== state object unit3 vars ===")
for v in ['antesBefore','antesAfter','karaokeTimer','cintaTimer','capitulos','domino','cintaOrder','galeriaSelected','mapaPlaced','personajesMatched','lineaMatched','quienSelected','escenarioSelected','teatroStep','libroExplored','cuentoHighlight']:
    print(f"{v:20} {'OK' if v + ':' in alltext or v + ':' in s else 'MISSING'}")

print("\n=== reset in openSubActivity ===")
# find openSubActivity in whichever file
for fname, txt in [('app.js',s),('unit3_render.js',u3)]:
    idx = txt.find('function openSubActivity')
    if idx != -1:
        # find reset block region: look for state.activeSubActivityIndex = index;
        i2 = txt.find('state.activeSubActivityIndex = index;', idx)
        seg = txt[i2:i2+800]
        print(f"--- {fname} reset block ---")
        for v in ['antesBefore','antesAfter','karaokeTimer','cintaTimer']:
            print(f"{v:20} {'OK' if v in seg else 'MISSING'}")
        break

print("\n=== getUnitSoundFolder montanas ===")
print("montanas referenced:", 'montanas' in s)

print("\n=== getBadgeIcon Corona ===")
print("Corona del Narrador:", 'Corona del Narrador' in s)
