import io, re, json

app = io.open('js/app.js', encoding='utf-8-sig').read()

print("=== FINAL INTEGRATION VERIFICATION FOR UNIT 3 ===")

# 1. JSON
data = json.load(io.open('data/units.json', encoding='utf-8'))
m = next(u for u in data['units'] if u['id']=='montanas')
print("\n[1] units.json: VALID, unit3 has", len(m['subActivities']), "activities")

# 2. render functions defined in app.js
print("\n[2] render functions defined in app.js:")
ok = True
for t in ['Cuento','Teatro','Libro','Capitulos','Karaoke','Personajes','Quien','Mapa','Galeria','Escenario','Ordenar','Linea','Domino','Cinta','Antes']:
    d = 'function render'+t+'Activity' in app
    ok = ok and d
    print(f"    render{t}Activity: {'OK' if d else 'MISSING'}")
print("   ALL defined:", ok)

# 3. openSubActivity switch cases
print("\n[3] openSubActivity switch cases:")
opens = app[app.find('function openSubActivity'):app.find('function renderGloboActivity')]
ok = True
for t in ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']:
    d = 'case "'+t+'"' in opens
    ok = ok and d
    print(f"    case '{t}': {'OK' if d else 'MISSING'}")
print("   ALL cases:", ok)

# 4. closeActivity cleanup
print("\n[4] closeActivity cleanup:")
close = app[app.find('function closeActivity'):app.find('function practicePronunciation')]
print("    karaokeTimer cleanup:", 'karaokeTimer' in close)
print("    cintaTimer cleanup:", 'cintaTimer' in close)
print("    has-mountain-bg:", 'has-mountain-bg' in close)

# 5. getUnitSoundFolder montanas
print("\n[5] getUnitSoundFolder handles montanas:", 'montanas' in app[app.find('function getUnitSoundFolder'):app.find('function playUnitSound')])

# 6. getBadgeIcon Corona
print("\n[6] getBadgeIcon Corona del Narrador:", 'Corona del Narrador' in app[app.find('function getBadgeIcon'):app.find('function isUnitRewardEarned')])

# 7. renderCastleMap mountain
rcm = app[app.find('function renderCastleMap'):app.find('function openSubActivity')]
print("\n[7] renderCastleMap mountain support:")
print("    isMountain:", 'isMountain' in rcm)
print("    mountain-map:", 'mountain-map' in rcm)
print("    Mapa de las Montañas:", 'Mapa de las Monta' in rcm)

# 8. mountain background CSS class used in openSubActivity
oas = app[app.find('function openSubActivity'):app.find('function renderGloboActivity')]
print("\n[8] openSubActivity mountain bg:", 'has-mountain-bg' in oas)

# 9. popButton classes
pop = app[app.find('document.addEventListener("click"'):]
print("\n[9] popButton unit3 classes:")
ok=True
for cls in ['cuento-option','quien-char','escenario-option','antes-option','capitulo-option','teatro-next','libro-keyword','karaoke-done','personajes-item','mapa-item','galeria-char','domino-piece','cinta-frame','ordenar-item','linea-item']:
    d = cls in pop
    ok = ok and d
print("    ALL present:", ok)

# 10. checkAnswer handles the button-based types
ck = app[app.find('function checkAnswer'):app.find('function markCompleted')]
print("\n[10] checkAnswer button-based types:")
for t in ['cuento','quien','escenario','ordenar','antes']:
    print(f"    case '{t}': {'OK' if ('case "'+t+'"') in ck else 'MISSING'}")
