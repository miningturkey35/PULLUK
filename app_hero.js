// ─── HERO STAMP IMAGES ──────────────────────────────────────────────────────
const HERO_STAMP_IDS = ['heroStamp1','heroStamp2','heroStamp3','heroStamp4','heroStamp5','heroStamp6','heroStamp7','heroStamp8'];
let heroStampPool = [];
let heroStampOffset = 0;
let heroStampTimer = null;

function setHeroStampImage(slotEl, src) {
  if (!slotEl || !src) return;
  const img = slotEl.querySelector('.stamp-img');
  if (!img) return;
  img.style.transition = 'opacity .5s ease';
  img.style.opacity = '0';
  const onLoad = () => { img.style.opacity = '1'; img.classList.add('is-loaded'); };
  const onError = () => { img.style.display = 'none'; };
  img.onload = onLoad;
  img.onerror = onError;
  img.src = src;
  if (img.complete && img.naturalWidth > 0) onLoad();
}

function rotateHeroStamps() {
  if (heroStampPool.length === 0) return;
  HERO_STAMP_IDS.forEach((id, i) => {
    const poolIdx = (heroStampOffset + i) % heroStampPool.length;
    setHeroStampImage(document.getElementById(id), heroStampPool[poolIdx]);
  });
  heroStampOffset = (heroStampOffset + HERO_STAMP_IDS.length) % heroStampPool.length;
}

function startHeroStampRotation() {
  if (heroStampTimer) return;
  heroStampTimer = setInterval(rotateHeroStamps, 10000);
}

function extractFirstImageSrc(html) {
  if (!html) return null;
  const m1 = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m1) return m1[1];
  const m2 = html.match(/<img[^>]+src=([^\s>"']+)/i);
  if (m2) return m2[1];
  return null;
}

function resolveHeroImgSrc(rawSrc, fileId) {
  if (!rawSrc) return null;
  if (rawSrc.startsWith('data:')) return rawSrc;
  const idMatch = rawSrc.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return `/drive-proxy?fileId=${idMatch[1]}`;
  if (rawSrc.startsWith('http')) return rawSrc;
  if (fileId) return `/drive-proxy?fileId=${fileId}`;
  return null;
}

async function loadHeroStampImages() {
  const apiKey = CONFIG.GOOGLE_API_KEY.trim();
  if (!apiKey) { console.log('[PULLUK] hero: no API key'); return; }
  console.log('[PULLUK] hero: loading stamp images...');

  const folders = [
    { id: CONFIG.FOLDERS['galeri'],  label: 'pul' },
    { id: CONFIG.FOLDERS['diecast'], label: 'diecast' },
    { id: CONFIG.FOLDERS['plak'],    label: 'plak' },
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
          console.log(`[PULLUK] hero: ${folder.label} → ${htmlFiles.length} HTML files`);
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
        console.log(`[PULLUK] hero: ${file.name} → ${resolved ? resolved.substring(0, 60) : 'null'}`);
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
