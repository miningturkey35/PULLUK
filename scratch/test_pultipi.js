// Pul Tipi extraction regression tests — app.js + rebuild_gallery.js extractors
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

const cases = [
  // [label, html source, expected pulTipi]
  ['live new MG0001 (Pul Tipi: Posta Pulu + damga izi)', fs.readFileSync(path.join(__dirname, 'live_new_MG0001.html'), 'utf8'), 'Posta Pulu'],
  ['live new MG0002 (Pul Tipi: Posta Pulu + damga kalıntısı)', fs.readFileSync(path.join(__dirname, 'live_new_MG0002.html'), 'utf8'), 'Posta Pulu'],
  ['old trashed MG0001 (Türü: Damga pulu fiscal)', fs.readFileSync(path.join(__dirname, 'old_MG0001.html'), 'utf8'), 'Damga Pulu'],
  ['old trashed MG0002 (Türü: Posta pulu + damga izi)', fs.readFileSync(path.join(__dirname, 'old_MG0002.html'), 'utf8'), 'Posta Pulu'],
  // synthetic
  ['synthetic **** marker', '<h1>X</h1><p>****</p>', 'Damga Pulu'],
  ['synthetic Türü row + damga izi', '<table><tr><td>Türü</td><td>Posta pulu (Anma)</td></tr></table><p>Durum: hafif damga izi</p>', 'Posta Pulu'],
  ['synthetic bare damga (real fiscal)', '<h1>X</h1><p>Bu bir fiscal damga belgesidir.</p>', 'Damga Pulu'],
  ['synthetic only damga izi (no table)', '<h1>X</h1><p>Durum: mor kalem damga izi taşır.</p>', ''],
  // real cards where bare "damga" prose used to win (no type row in HTML)
  ['live MG0052 (no type row; "Damga Matbaası" + h1 Posta Pulu)', fs.readFileSync(path.join(__dirname, 'live_MG0052.html'), 'utf8'), 'Posta Pulu'],
  ['live MG0066 (no type row; "damga mevcuttur" + h1 Uçak Posta Pulu)', fs.readFileSync(path.join(__dirname, 'live_MG0066.html'), 'utf8'), 'Posta Pulu'],
  ['live MG0016 (no type row; only "damga yoğunluğu"/"Damgalı" prose)', fs.readFileSync(path.join(__dirname, 'live_MG0016.html'), 'utf8'), 'Posta Pulu'],
  ['live MG0008 (Pul Tipi: Damga Pulu row)', fs.readFileSync(path.join(__dirname, 'live_MG0008.html'), 'utf8'), 'Damga Pulu'],
];

let pass = 0, fail = 0;
for (const [label, html, expected] of cases) {
  for (const [name, fn] of [['app', extractApp], ['rebuild', extractRebuild]]) {
    let got;
    try {
      got = fn(html).pulTipi;
    } catch (e) {
      got = 'THROW: ' + e.message;
    }
    if (got === expected) { pass++; }
    else { fail++; console.log(`FAIL [${name}] ${label}: beklenen "${expected}", gelen "${got}"`); }
  }
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
