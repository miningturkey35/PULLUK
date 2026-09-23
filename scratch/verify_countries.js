const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'data', 'collection_data.js'), 'utf8');
const eq = s.indexOf('=');
let j = s.substring(eq + 1).trim();
if (j.endsWith(';')) j = j.slice(0, -1);
const d = JSON.parse(j);
const g = d.galeri || [];

const byName = {};
for (const it of g) (byName[it.name] = byName[it.name] || []).push(it);

console.log('=== Hedef kartlar ===');
for (const nm of ['MG0004.html', 'MG0005.html', 'MG0006.html', 'MG0007.html',
  'MG0016.html', 'MG0019.html', 'MG0023.html', 'MG0025.html', 'MG0032.html',
  'MG0041.html', 'MG0001.html', 'MG0002.html']) {
  const list = byName[nm] || [];
  for (const it of list) {
    console.log(nm.padEnd(12), '|', (it._country || '—').padEnd(20), '|', it._title);
  }
}

console.log('\n=== Kontroller ===');
let mismatch = 0, weirdCountry = 0, mergedTitle = 0;
for (const it of g) {
  const t = ((it._title || '') + ' ' + (it._subtitle || '')).toLowerCase().replace(/\u0307/g, '');
  if (/cumhuriyet|türkiye|turkiye|ptt/.test(t) && /Osmanl/.test(it._country || '')) {
    console.log('TC-baslik/OSMANLI-ulke:', it.name, '|', it._title, '|', it._country);
    mismatch++;
  }
  const c = it._country || '';
  if (c.includes('·') || c.includes('/') && !['Osmanlı İmp.', 'Türkiye Cumhuriyeti', 'Birleşik Krallık'].includes(c)) {
    if (!['Almanya', 'ABD', 'Fransa', 'İtalya', 'Japonya', 'Çin', 'Rusya', 'Hollanda', 'İsveç', 'İspanya', 'Avusturya', 'Belçika', 'Portekiz', 'Yunanistan', 'Mısır', 'Kanada', 'Avustralya', 'İsviçre', 'Polonya', 'Romanya', 'Macaristan'].includes(c)) {
      console.log('GARIP ULKE:', it.name, '|', c);
      weirdCountry++;
    }
  }
  if (/^[^\s]+\d/.test(it._title || '')) {
    console.log('BIRLESMIS BASLIK:', it.name, '|', it._title);
    mergedTitle++;
  }
  if (!c) console.log('ULKE YOK:', it.name, '|', it._title);
}
console.log('mismatch:', mismatch, '| garip ulke:', weirdCountry, '| birlesmis baslik:', mergedTitle);

const dist = {};
for (const it of g) dist[it._country || '—'] = (dist[it._country || '—'] || 0) + 1;
console.log('dagilim:', JSON.stringify(dist));

const names = {};
for (const it of g) names[it.name] = (names[it.name] || 0) + 1;
const dups = Object.entries(names).filter(([, n]) => n > 1);
console.log('duplicate isimli entry:', JSON.stringify(dups));
