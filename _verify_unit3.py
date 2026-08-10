import re

c = open('js/app.js', encoding='utf-8').read()

funcs = [
    'renderCuentoActivity','renderTeatroActivity','renderLibroActivity','renderCapitulosActivity',
    'renderKaraokeActivity','renderPersonajesActivity','renderQuienActivity','renderMapaActivity',
    'renderGaleriaActivity','renderEscenarioActivity','renderOrdenarActivity','renderLineaActivity',
    'renderDominoActivity','renderCintaActivity','renderAntesActivity'
]

print("=== Render functions definition count ===")
for f in funcs:
    # count function definitions (def or function name followed by )
    count = len(re.findall(r'function\s+' + f + r'\s*\(', c))
    print(f, '=>', count)

print("\n=== switch cases in openSubActivity ===")
for t in ['cuento','teatro','libro','capitulos','karaoke','personajes','quien','mapa','galeria','escenario','ordenar','linea','domino','cinta','antes']:
    count = len(re.findall(r'case\s+"' + t + r'"\s*:', c))
    print('case "' + t + '" =>', count)

print("\n=== checkAnswer cases present ===")
for t in ['cuento','libro','capitulos','escenario','personajes','quien','mapa','galeria','linea','domino','cinta','antes']:
    print(t, '=>', len(re.findall(r'case\s+"' + t + r'"\s*:', c)))
