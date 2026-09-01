import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the loadHeroStampImages function and replace everything from it to the MAIN INIT comment
pattern = r'async function loadHeroStampImages\(\) \{.*?\}\r?\n\r?\n// ─── MAIN INIT'
replacement = """async function loadHeroStampImages() {
  const apiKey = CONFIG.GOOGLE_API_KEY.trim();
  if (!apiKey) { console.log('[PULLUK] hero: no API key'); return; }
  console.log('[PULLUK] hero: loading stamp images...');

  const folders = [
    { id: CONFIG.FOLDERS['galeri'],   label: 'pul' },
    { id: CONFIG.FOLDERS['diecast'],  label: 'diecast' },
    { id: CONFIG.FOLDERS['plak'],     label: 'plak' },
  ].filter(f => f.id);

  try {
    const allFiles = [];
    for (const folder of folders) {
      try {
        const params = new URLSearchParams({
          q: `'${folder.id}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType)',
          pageSize: 10,
          key: apiKey,
          orderBy: 'name',
        });
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
        if (res.ok) {
          const data = await res.json();
          const htmlFiles = (data.files || []).filter(f => f.mimeType === 'text/html' || f.name.endsWith('.html'));
          console.log(`[PULLUK] hero: ${folder.label} -> ${htmlFiles.length} HTML files`);
          allFiles.push(...htmlFiles);
        }
      } catch (e) { console.warn(`[PULLUK] hero: ${folder.label} error`, e); }
    }
    console.log(`[PULLUK] hero: total ${allFiles.length} files to scan`);
    if (allFiles.length === 0) return;

    const shuffled = allFiles.sort(() => Math.random() - 0.5);
    const useProxy = window.location.protocol === 'http:';

    const extractImage = async (file) => {
      try {
        const url = useProxy
          ? `/drive-proxy?fileId=${file.id}`
          : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        let htmlRes;
        try { htmlRes = await fetch(url, { signal: ctrl.signal }); }
        finally { clearTimeout(tid); }
        if (!htmlRes.ok) return null;
        const html = await htmlRes.text();
        const rawSrc = extractFirstImageSrc(html);
        if (!rawSrc) return null;
        const resolved = resolveHeroImgSrc(rawSrc, file.id);
        console.log(`[PULLUK] hero: ${file.name} -> ${resolved ? resolved.substring(0, 60) : 'null'}`);
        return resolved;
      } catch (e) { return null; }
    };

    const results = await Promise.allSettled(shuffled.map(extractImage));
    heroStampPool = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    console.log(`[PULLUK] hero: ${heroStampPool.length} images ready`);
    if (heroStampPool.length === 0) return;
    heroStampPool.sort(() => Math.random() - 0.5);
    heroStampOffset = 0;
    rotateHeroStamps();
    startHeroStampRotation();
  } catch (err) {
    console.error('[PULLUK] hero error:', err);
  }
}

// ─── MAIN INIT"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if new_content == content:
    print("WARNING: No replacement made!")
else:
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("OK: hero section replaced")
