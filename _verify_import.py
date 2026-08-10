import io
s = io.open('js/app.js', encoding='utf-8-sig').read()
print("=== imports in app.js ===")
for line in s.splitlines()[:5]:
    if 'import' in line:
        print(line)

print("\n=== unit3_render referenced in app.js? ===")
print("'unit3_render' in app.js:", 'unit3_render' in s)

print("\n=== unit3_render.js first 30 lines ===")
u3 = io.open('js/unit3_render.js', encoding='utf-8-sig').read()
for i, line in enumerate(u3.splitlines()[:30]):
    print(i, line)
