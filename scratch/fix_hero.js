const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Find the marker
const startMarker = 'async function loadHeroStampImages() {';
const endMarker = '// \u2500\u2500 MAIN INIT';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found. startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

// Go back to include the \r\n before the function
let actualStart = startIdx;
while (actualStart > 0 && content[actualStart - 1] === '\n') actualStart--;
while (actualStart > 0 && content[actualStart - 1] === '\r') actualStart--;
while (actualStart > 0 && content[actualStart - 1] === '\n') actualStart--;

const newFunction = `async function loadHeroStampImages() {
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
          q: \`'\${folder.id}' in parents and trashed=false\`,
          fields: 'files(id, name, mimeType)',
          pageSize: 10,
          key: apiKey,
          orderBy: 'name',
        });
        const res = await fetch(\`https://www.googleapis.com/drive/v3/files?\${params}\`);
        if (res.ok) {
          const data = await res.json();
          const htmlFiles = (data.files || []).filter(f => f.mimeType === 'text/html' || f.name.endsWith('.html'));
          console.log(\`[PULLUK] hero: \${folder.label} -> \${htmlFiles.length} HTML files\`);
          allFiles.push(...htmlFiles);
        }
      } catch (e) { console.warn(\`[PULLUK] hero: \${folder.label} error\`, e); }
    }
    console.log(\`[PULLUK] hero: total \${allFiles.length} files to scan\`);
    if (allFiles.length === 0) return;

    const shuffled = allFiles.sort(() => Math.random() - 0.5);
    const useProxy = window.location.protocol === 'http:';

    const extractImage = async (file) => {
      try {
        const url = useProxy
          ? \`/drive-proxy?fileId=\${file.id}\`
          : \`https://www.googleapis.com/drive/v3/files/\${file.id}?alt=media&key=\${apiKey}\`;
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
        console.log(\`[PULLUK] hero: \${file.name} -> \${resolved ? resolved.substring(0, 60) : 'null'}\`);
        return resolved;
      } catch (e) { return null; }
    };

    const results = await Promise.allSettled(shuffled.map(extractImage));
    heroStampPool = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    console.log(\`[PULLUK] hero: \${heroStampPool.length} images ready\`);
    if (heroStampPool.length === 0) return;
    heroStampPool.sort(() => Math.random() - 0.5);
    heroStampOffset = 0;
    rotateHeroStamps();
    startHeroStampRotation();
  } catch (err) {
    console.error('[PULLUK] hero error:', err);
  }
}

`;

content = content.substring(0, actualStart) + newFunction + content.substring(endIdx);
fs.writeFileSync('app.js', content, 'utf8');
console.log('OK: hero section replaced');
