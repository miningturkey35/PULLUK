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

// Gerçek lot dosyaları (Drive'dan indirildi, base64 kısaltıldı)
const realLot = name => fs.readFileSync(path.join(__dirname, 'lot_fixtures', name), 'utf8');

// MG0005-8 şablonu: div.lot-contents > plain <ul> + "Toplam: N adet pul"
const lotContentsListAndTotal = `<!DOCTYPE html><html><head><title>MG0099 · LOT09</title></head><body>
<div class="card">
  <header><h1>MG0099 · LOT09</h1><div class="lot-badge">LOT09 — Test Lotu</div></header>
  <div class="lot-contents">
    <p>Lot içeriği (adetler kesin):</p>
    <ul>
      <li>10 Para — 1 adet</li>
      <li>5 Kuruş — 4 adet</li>
      <li>25 Kuruş — 2 adet</li>
    </ul>
    <p>Toplam: 7 adet pul</p>
  </div>
</div>
</body></html>`;

// Sadece liste var, "Toplam:" metni yok → liste toplamı
const lotListOnly = `<!DOCTYPE html><html><head><title>MG0098 · LOT08</title></head><body>
<div class="card">
  <header><h1>MG0098 · LOT08</h1><div class="lot-badge">LOT08</div></header>
  <div class="lot-contents">
    <ul>
      <li>1 Kuruş — 2 adet</li>
      <li>2 Kuruş — 3 adet</li>
      <li>3 Kuruş — 1 adet</li>
    </ul>
  </div>
</div>
</body></html>`;

// MG0004 şablonu: "Lot Kodu" tablo satırı + "Toplam Adet" satırı + ul.lot-list
const lotKoduToplamAdet = `<!DOCTYPE html><html><head><title>MG0097 · LOT07</title></head><body>
<div class="card">
  <header><h1>Damga Pul Lotu</h1></header>
  <table>
    <tr><th>Koleksiyon No</th><td>MG0097</td></tr>
    <tr><th>Lot Kodu</th><td>LOT07</td></tr>
    <tr><th>Toplam Adet</th><td>9 adet</td></tr>
  </table>
  <ul class="lot-list">
    <li><strong>1 Kuruş</strong> — 4 adet</li>
    <li><strong>2 Kuruş</strong> — 5 adet</li>
  </ul>
</div>
</body></html>`;

// [label, html, expectedLotNo, expectedPulSayisi]
const cases = [
  ['.lot-no element + "Pul Sayısı" tablo satırı', lotElementAndTableRow, 'LOT01', 20],
  ['sadece "Lot No" + "Adet" tablo satırları', tableOnlyLot, 'LOT02', 15],
  ['başlıkta LOT03 + .lot element + .pul-sayisi', titleLotWithCountElement, 'LOT03', 7],
  ['.lot-no-badge + görsel sayım fallback', imgFallbackLot, 'LOT04', 3],
  ['tek pul regresyonu (MG0001: lot yok)', singleStamp, '', 0],
  ['div.lot-contents liste + "Toplam: 7 adet pul"', lotContentsListAndTotal, 'LOT09', 7],
  ['sadece div.lot-contents listesi (Toplam metni yok)', lotListOnly, 'LOT08', 6],
  ['"Lot Kodu" + "Toplam Adet" tablo + ul.lot-list', lotKoduToplamAdet, 'LOT07', 9],
  ['gerçek MG0004 (LOT01: Toplam Adet tablo satırı)', realLot('MG0004.html'), 'LOT01', 11],
  ['gerçek MG0005 (LOT02: lot-contents + Toplam: 38)', realLot('MG0005.html'), 'LOT02', 38],
  ['gerçek MG0006 (LOT03: lot-contents + Toplam: 37)', realLot('MG0006.html'), 'LOT03', 37],
  ['gerçek MG0007 (LOT04: Toplam: 7 adet pul)', realLot('MG0007.html'), 'LOT04', 7],
  ['gerçek MG0008 (LOT05: Toplam: 5 adet pul)', realLot('MG0008.html'), 'LOT05', 5],
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
