// Geçici: Drive'daki lot dosyalarını bul ve HTML'lerini scratch/lot_fixtures altına indir
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8';

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { timeout: 60000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}

(async () => {
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&pageSize=200&key=${API_KEY}&orderBy=name`;
  const r = await get(listUrl);
  const j = JSON.parse(r.body);
  const files = j.files || [];
  console.log('toplam dosya:', files.length);

  const news = files.filter(f => {
    const m = f.name.match(/MG(\d+)/i);
    return !m || parseInt(m[1], 10) > 111;
  });
  console.log('yeni dosyalar:');
  for (const f of news) console.log(' ', f.name, f.modifiedTime, f.id);

  const outDir = path.join(__dirname, 'lot_fixtures');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const f of news.slice(0, 6)) {
    const dl = await get(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`);
    if (dl.status === 200) {
      const out = path.join(outDir, f.name.replace(/[^\w.-]/g, '_'));
      fs.writeFileSync(out, dl.body, 'utf8');
      console.log('indirildi:', f.name, dl.body.length, 'char');
    } else {
      console.log('indirilemedi:', f.name, dl.status, dl.body.substring(0, 200));
    }
  }
})();
