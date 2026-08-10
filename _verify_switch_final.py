import io

s = io.open('js/app.js', encoding='utf-8-sig').read()
u3 = io.open('js/unit3_render.js', encoding='utf-8-sig').read()

# Find the openSubActivity switch in app.js
i = s.find('switch (sub.type)')
print("app.js switch at:", i)
seg = s[i:i+3000]
print(seg[:2500])
