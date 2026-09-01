import os

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix text-transform: uppercase causing DİECAST
html = html.replace('">Diecast</a>', '">DIECAST</a>')
html = html.replace('<h3>Diecast</h3>', '<h3>DIECAST</h3>')
html = html.replace('<span class="eyebrow">Diecast Koleksiyonu</span>', '<span class="eyebrow">DIECAST Koleksiyonu</span>')
html = html.replace('eşleşen Diecast bulunamadı', 'eşleşen DIECAST bulunamadı')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Diecast uppercasing fixed.")
