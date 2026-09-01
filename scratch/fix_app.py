import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace("Matchbox", "Diecast")
html = html.replace("MATCHBOX", "DIECAST")
html = html.replace("matchbox", "diecast")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

with open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace("Matchbox", "Diecast")
js = js.replace("MATCHBOX", "DIECAST")
js = js.replace("matchbox", "diecast")

js = js.replace("_htmlContent: file._htmlContent", "// _htmlContent: file._htmlContent")

rate_limit_fix = """      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
      if (res.status === 429) {
        console.warn('[PULLUK] Rate limit hit, waiting 3 seconds...');
        previewQueue.unshift(item);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      if (res.ok) {"""

js = js.replace("""      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
      if (res.ok) {""", rate_limit_fix)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Done")
