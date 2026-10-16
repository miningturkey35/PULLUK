// Geçici teşhis v2: uc?export=download ile dosyaları çek, LOT + sayı ifadelerini tara
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8';

function get(url, redirects = 5) {
  return new Promise((res, rej) => {
    https.get(url, { timeout: 90000 }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects > 0) {
        r.resume();
        return res(get(r.headers.location, redirects - 1));
      }
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d, headers: r.headers }));
    }).on('error', rej);
  });
}

function ctx(html, re, radius = 100) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(html)) && out.length < 6) {
    const s = Math.max(0, m.index - radius);
    const e = Math.min(html.length, m.index + m[0].length + radius);
    out.push(html.slice(s, e).replace(/\s+/g, ' '));
    if (m.index === r.lastIndex) r.lastIndex++;
  }
  return out;
}

(async () => {
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='text/html'+and+trashed=false&fields=files(id,name,modifiedTime)&pageSize=200&key=${API_KEY}&orderBy=name`;
  const r = await get(listUrl);
  const files = (JSON.parse(r.body).files || []);
  console.log('dosya:', files.length);

  const outDir = path.join(__dirname, 'lot_fixtures');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const f of files) {
    const dl = await get(`https://drive.google.com/uc?export=download&id=${f.id}`);
    let html = dl.body;
    // Viral/uyarı sayfası koruması: confirm=tune & uuid akışı
    if (dl.status === 200 && !/^\s*</.test(html) && /confirm/i.test(html)) {
      const uuid = (html.match(/name="uuid" value="([^"]+)"/) || [])[1];
      const tid = (html.match(/name="tid" value="([^"]+)"/) || [])[1];
      if (uuid) {
        const dl2 = await get(`https://drive.usercontent.google.com/download?id=${f.id}&export=download&confirm=t&uuid=${uuid}${tid ? '&tid=' + tid : ''}`);
        html = dl2.body;
      }
    }
    if (dl.status !== 200) { console.log(f.name, 'HTTP', dl.status, html.slice(0, 80).replace(/\s+/g,' ')); continue; }
    if (!/<html|<!doctype/i.test(html)) { console.log(f.name, 'HTML degil:', html.slice(0, 100).replace(/\s+/g,' ')); continue; }

    const lotMatches = ctx(html, /\bLOT\s*\d+\b/i, 50);
    if (!lotMatches.length) continue;
    console.log('\n==========', f.name, '==========');
    for (const c of lotMatches) console.log('  LOT ctx:', c.slice(0, 180));
    const countSignals = ctx(html, /[^>]{0,50}(say[ıi]s[ıi]|adet|toplam|toplu)[^<]{0,50}/i, 70);
    for (const c of countSignals.slice(0, 8)) console.log('  count ctx:', c.slice(0, 200));
    const classes = [...new Set((html.match(/class="[^"]+"/g) || []).filter(c => /lot|say|adet|count|total|toplam/i.test(c)))];
    console.log('  classes:', classes.slice(0, 12).join(' | '));
    // Fixture kaydet (küçük: sadece header bölümü yeterli ama tam kaydetmek daha güvenli)
    fs.writeFileSync(path.join(outDir, f.name), html, 'utf8');
    await new Promise(res => setTimeout(res, 300));
  }
  console.log('\nbitti');
})();
