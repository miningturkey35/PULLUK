const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'collection_data.js');
const s = fs.readFileSync(dataFile, 'utf8');

// 1. MG0004 entry raw
const i = s.indexOf('"name":"MG0004.html"');
console.log('entry bulundu:', i >= 0);
if (i >= 0) console.log(s.slice(i, i + 600));
console.log('---');

// 2. all entries with name MG0004.html (count)
let count = 0, idx = 0;
while ((idx = s.indexOf('"name":"MG0004.html"', idx + 1)) !== -1) count++;
console.log('MG0004.html entry sayisi (raw):', count + (i >= 0 ? 1 : 0));

// 3. parsed: find entry and print title-ish fields
const eq = s.indexOf('=');
let j = s.substring(eq + 1).trim();
if (j.endsWith(';')) j = j.slice(0, -1);
const d = JSON.parse(j);
const matches = (d.galeri || []).filter(it => it.name === 'MG0004.html');
console.log('parsed MG0004 entry sayisi:', matches.length);
for (const m of matches) {
  console.log(JSON.stringify({ id: m.id, name: m.name, _title: m._title, _country: m._country, _ulke: m._ulke, _subtitle: m._subtitle, _year: m._year }, null, 1));
}

// 4. Birinci Ayyıldız title owner
for (const it of d.galeri || []) {
  if ((it._title || '').includes('Ayyıldız')) console.log('AYYILDIZ:', it.name, '|', it._title, '|', it._country);
}
