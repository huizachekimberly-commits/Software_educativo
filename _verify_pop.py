import io

files = ['js/app.js', 'js/unit3_render.js']
classes = ['cuento-option','teatro-next','libro-keyword','capitulo-option','karaoke-done','personajes-item','quien-char','mapa-item','galeria-char','escenario-option','ordenar-item','linea-item','domino-piece','cinta-frame','cinta-play','antes-option']

alltext = ''
for f in files:
    try:
        alltext += io.open(f, encoding='utf-8-sig').read()
    except Exception as e:
        print(f, 'ERROR', e)

# Find popButton handler block
idx = alltext.find('closest("')
print("Found closest selector at:", idx)
if idx != -1:
    clip = alltext[idx:idx+2500]
    print("--- selector text ---")
    print(clip[:1500])
    print("\n--- classes in selector ---")
    for c in classes:
        print(f"{c:20} {'OK' if c in clip else 'MISSING'}")
