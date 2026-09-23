// Ülke anahtar kelime eşleşmesi birim testi (app.js kaynak fonksiyonlarını çıkarır)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractSnippet(startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error('not found: ' + startMarker);
  const j = src.indexOf(endMarker, i);
  if (j < 0) throw new Error('end not found: ' + endMarker);
  return src.slice(i, j + endMarker.length);
}

const countries = extractSnippet('const STAMP_COUNTRIES = [', '\n];');
const helper = extractSnippet('function textHasCountryKeyword', '\n}');
const fromText = extractSnippet('function extractCountryFromText', '\n}');

const code = countries + '\n' + helper + '\n' + fromText +
  '\nmodule.exports = { extractCountryFromText, textHasCountryKeyword, STAMP_COUNTRIES };';
const Module = require('module');
const m = new Module('country-test');
m._compile(code, 'country-test.js');
const { extractCountryFromText } = m.exports;

const norm = (s) => s.toLowerCase().replace(/\u0307/g, '');

const cases = [
  // Yanlış eşleşmeler (bug'lar)
  ['23. Nisan Uluslararası Çocuk Bayramı', ''],
  ['çocuk pulu temalı seri', ''],
  ['güzel bir şey için not', ''],
  ['ATC standardı', ''],
  ['abdülkadir adlı koleksiyoner', ''],
  ['muhabbet kuşu kafesi', ''],
  // Doğru eşleşmeler
  ['Çin Seddi temalı pul', 'Çin'],
  ['İtalya posta pulu 1962', 'İtalya'],
  ['Bu bir İngiltere puludur', 'Birleşik Krallık'],
  ['uk koleksiyon parçası', 'Birleşik Krallık'],
  ['ABD posta idaresi', 'ABD'],
  ['Osmanlı İmparatorluğu dönemi', 'Osmanlı İmp.'],
  ['t.c. 1926 resmî seri', 'Türkiye Cumhuriyeti'],
  ['TCDD demiryolları serisi', 'Türkiye Cumhuriyeti'],
  ['Almanya Bundespost', 'Almanya'],
  ['Fransa Francetimbre', 'Fransa'],
  ['Japonya Japan Post', 'Japonya'],
  ['Rusya CCCP sovyet dönemi', 'Rusya'],
  ['ptt pulları', 'Türkiye Cumhuriyeti'],
  ['england victoria dönemi', 'Birleşik Krallık'],
  // TC + Osmanlı birlikte geçen sayfalarda TC kazanmalı (commit 3ca1d11 niyeti)
  ['Osmanlı Bankası deposundan Cumhuriyet dönemi pullar', 'Türkiye Cumhuriyeti'],
  ['Türkiye Cumhuriyeti — 5 Kuruş', 'Türkiye Cumhuriyeti'],
  ['Osmanlı Arzuhâl Varakası — 1 Kuruş', 'Osmanlı İmp.'],
  ['Ülke / Dönem: Osmanlı İmparatorluğu • Sultan Abdülaziz', 'Osmanlı İmp.'],
  ['Ülke: Türkiye Cumhuriyeti', 'Türkiye Cumhuriyeti'],
];

let pass = 0, fail = 0;
for (const [input, expected] of cases) {
  const got = extractCountryFromText(norm(input));
  if (got === expected) { pass++; }
  else { fail++; console.log(`FAIL: "${input}" → beklenen "${expected}", gelen "${got}"`); }
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
