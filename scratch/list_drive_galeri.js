const https = require('https');
function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}
(async () => {
  const key = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
  const folder = '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8';
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=1000&key=${key}`;
  const r = await get(url);
  let parsed;
  try { parsed = JSON.parse(r.body); } catch (e) { console.log('status', r.status, 'body:', r.body.slice(0, 500)); return; }
  if (!parsed.files) { console.log('hata:', r.status, r.body.slice(0, 500)); return; }
  const names = {};
  for (const f of parsed.files) (names[f.name] = names[f.name] || []).push(f);
  const dup = Object.entries(names).filter(([, v]) => v.length > 1);
  console.log('toplam dosya:', parsed.files.length);
  console.log('duplicate isimler:', JSON.stringify(dup, null, 1));
  console.log('MG0004:', JSON.stringify(names['MG0004.html'], null, 1));
  // ilk 10 dosya adı sırayla
  console.log('ilk 12:', parsed.files.slice(0, 12).map(f => f.name).join(', '));
})();
