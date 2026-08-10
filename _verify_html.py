import io, re

html = io.open('index.html', encoding='utf-8-sig').read()
print("=== Scripts ===")
for m in re.finditer(r'<script[^>]*src="([^"]+)"', html):
    print(m.group(1))
print("\n=== CSS ===")
for m in re.finditer(r'<link[^>]*href="([^"]+)"', html):
    print(m.group(1))
print("\n=== end of file (last 400 chars) ===")
print(html[-400:])
