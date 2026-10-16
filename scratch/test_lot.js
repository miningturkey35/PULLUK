// Lot extraction regression tests — app.js + rebuild_gallery.js extractors
// Sözleşme: .lot-no/.lot/.lot-no-badge element → "Lot No"/"Lot" tablo satırı → başlık metninde LOT\d+
// Pul Sayısı: .pul-sayisi/.pul-count/.adet element → tablo satırı → görsel sayımı (fallback)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const acorn = require('acorn');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.navigator = dom.window.navigator;

function loadFromSource(srcPath, wantedFns, wantedConsts, exportName) {
  let src = fs.readFileSync(srcPath, 'utf8');
  if (src.startsWith('#!')) src = src.slice(src.indexOf('\n') + 1);
  const ast = acorn.parse(src, { ecmaVersion: 2022 });
  const fns = new Set(wantedFns);
  const consts = new Set(wantedConsts);
  const pieces = [];
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id && fns.has(node.id.name)) {
      pieces.push(src.slice(node.start, node.end));
      fns.delete(node.id.name);
    } else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id && d.id.name && consts.has(d.id.name)) {
          pieces.push(src.slice(node.start, node.end));
          consts.delete(d.id.name);
        }
      }
    }
  }
  if (fns.size) throw new Error(srcPath + ' missing fns: ' + [...fns]);
  if (consts.size) throw new Error(srcPath + ' missing consts: ' + [...consts]);
  const Module = require('module');
  const m = new Module(exportName);
  m._compile(pieces.join('\n\n') + '\nmodule.exports = { ' + exportName + ' };', exportName + '.js');
  return m.exports[exportName];
}

const root = path.join(__dirname, '..');

const extractApp = loadFromSource(
  path.join(root, 'app.js'),
  ['normalizePulTipi', 'isIIElizabethStamp', 'extractCountryFromText', 'normalizeCountryName',
   'textHasCountryKeyword', 'extractStampInfoFromHtml'],
  ['STAMP_COUNTRIES', 'STAMP_COUNTRY_ABBREVS', 'PUL_TIPLERI', 'PUL_TIPI_MAP'],
  'extractStampInfoFromHtml'
);

const extractRebuild = loadFromSource(
  path.join(root, 'rebuild_gallery.js'),
  ['normalizePulTipi', 'isIIElizabethStamp', 'extractCountryFromText', 'normalizeCountryName',
   'textHasCountryKeyword', 'extractTableData', 'findTableValue', 'stripPatterns', 'htmlToText',
   'extractStampInfoFromHtml'],
  ['STAMP_COUNTRIES', 'PUL_TIPLERI', 'PUL_TIPI_MAP'],
  'extractStampInfoFromHtml'
);

const lotElementAndTableRow = `<!DOCTYPE html><html><head><title>MG0112 — Karışık Lot</title></head><body>
<div class="card">
  <header>
    <div class="brand">MERT GÜVENTÜRK KOLEKSİYONU</div>
    <div class="coll-num">MG0112</div>
    <div class="lot-no">LOT01</div>
    <h1>1970'ler Karışık Posta Pul Lotu</h1>
    <div class="subtitle">Türkiye Cumhuriyeti · Karışık</div>
  </header>
  <div class="content">
    <table>
      <tr><th>Pul Tipi</th><td>Posta Pulu</td></tr>
      <tr><th>Pul Sayısı</th><td>20</td></tr>
      <tr><th>Durum</th><td>Damgalı</td></tr>
    </table>
  </div>
</div>
</body></html>`;

const tableOnlyLot = `<!DOCTYPE html><html><head><title>MG0113 Lot</title></head><body>
<div class="card">
  <header><h1>Osmanlı Dönemi Lot</h1><div class="subtitle">Türkiye</div></header>
  <table>
    <tr><th>Lot No</th><td>LOT02</td></tr>
    <tr><th>Adet</th><td>15 adet</td></tr>
  </table>
</div>
</body></html>`;

const titleLotWithCountElement = `<!DOCTYPE html><html><head><title>MG0114 — LOT03 Karışık</title></head><body>
<div class="card">
  <header>
    <h1>Ephemera Lotu</h1>
    <div class="lot">lot 03</div>
    <div class="pul-sayisi">7 Adet</div>
  </header>
</div>
</body></html>`;

const imgFallbackLot = `<!DOCTYPE html><html><head><title>MG0115 Lot</title></head><body>
<header><div class="brand">MERT GÜVENTÜRK KOLEKSİYONU</div></header>
<div class="card">
  <header>
    <h1>Görsel Sayım Lotu</h1>
    <div class="lot-no-badge">LOT04</div>
  </header>
  <div class="main-images">
    <figure><img src="data:image/gif;base64,R0lGOD" alt="pul1"></figure>
    <figure><img src="data:image/gif;base64,R0lGOD" alt="pul2"></figure>
    <figure><img src="data:image/gif;base64,R0lGOD" alt="pul3"></figure>
  </div>
</div>
</body></html>`;

const singleStamp = fs.readFileSync(path.join(root, 'files', 'MG0001.html'), 'utf8');

// [label, html, expectedLotNo, expectedPulSayisi]
const cases = [
  ['.lot-no element + "Pul Sayısı" tablo satırı', lotElementAndTableRow, 'LOT01', 20],
  ['sadece "Lot No" + "Adet" tablo satırları', tableOnlyLot, 'LOT02', 15],
  ['başlıkta LOT03 + .lot element + .pul-sayisi', titleLotWithCountElement, 'LOT03', 7],
  ['.lot-no-badge + görsel sayım fallback', imgFallbackLot, 'LOT04', 3],
  ['tek pul regresyonu (MG0001: lot yok)', singleStamp, '', 0],
];

let pass = 0, fail = 0;
for (const [label, html, expectedLot, expectedCount] of cases) {
  for (const [name, fn] of [['app', extractApp], ['rebuild', extractRebuild]]) {
    let r;
    try {
      r = fn(html);
    } catch (e) {
      r = { lotNo: 'THROW: ' + e.message, pulSayisi: -1 };
    }
    const okLot = r.lotNo === expectedLot;
    const okCount = r.pulSayisi === expectedCount;
    if (okLot && okCount) { pass++; }
    else {
      fail++;
      console.log(`FAIL [${name}] ${label}: beklenen lotNo="${expectedLot}" pulSayisi=${expectedCount}, gelen lotNo="${r.lotNo}" pulSayisi=${r.pulSayisi}`);
    }
  }
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
