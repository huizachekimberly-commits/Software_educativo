import io

app_path = 'js/app.js'
u3_path = 'js/unit3_render.js'

app = io.open(app_path, encoding='utf-8-sig').read()
u3 = io.open(u3_path, encoding='utf-8-sig').read()

# Guard: don't merge twice
if 'renderCuentoActivity' in app:
    print("Unit 3 render functions already merged into app.js — skipping.")
else:
    # Append unit3 content before the final init().catch block
    marker = 'init().catch((error) => {'
    if marker in app:
        app = app.replace(marker, u3 + '\n\n' + marker)
    else:
        app = app.rstrip() + '\n\n' + u3 + '\n'
    io.open(app_path, 'w', encoding='utf-8-sig').write(app)
    print("Merged unit3_render.js into app.js")

# Verify
check = io.open(app_path, encoding='utf-8-sig').read()
print("renderCuentoActivity in app.js:", 'renderCuentoActivity' in check)
print("renderAntesActivity in app.js:", 'renderAntesActivity' in check)
print("completeUnit3Activity in app.js:", 'completeUnit3Activity' in check)
print("init().catch present once:", check.count('init().catch') == 1)
