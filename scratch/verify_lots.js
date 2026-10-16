// Geçici: fixture'ları base64'ten arındır + her iki extractor'ı gerçek lot dosyalarında doğrula
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
  const Module = require('module');
  const m = new Module(exportName);
  m._compile(pieces.join('\n\n') + '\nmodule.exports = { ' + exportName + ' };', exportName + '.js');
  return m.exports[exportName];
}

const root = path.join(__dirname, '..');
const extractApp = loadFromSource(path.join(root, 'app.js'),
  ['normalizePulTipi', 'isIIElizabethStamp', 'extractCountryFromText', 'normalizeCountryName',
   'textHasCountryKeyword', 'extractStampInfoFromHtml'],
  ['STAMP_COUNTRIES', 'STAMP_COUNTRY_ABBREVS', 'PUL_TIPLERI', 'PUL_TIPI_MAP'], 'extractStampInfoFromHtml');
const extractRebuild = loadFromSource(path.join(root, 'rebuild_gallery.js'),
  ['normalizePulTipi', 'isIIElizabethStamp', 'extractCountryFromText', 'normalizeCountryName',
   'textHasCountryKeyword', 'extractTableData', 'findTableValue', 'stripPatterns', 'htmlToText',
   'extractStampInfoFromHtml'],
  ['STAMP_COUNTRIES', 'PUL_TIPLERI', 'PUL_TIPI_MAP'], 'extractStampInfoFromHtml');

const dir = path.join(__dirname, 'lot_fixtures');
for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
  const p = path.join(dir, name);
  let html = fs.readFileSync(p, 'utf8');
  // base64 görselleri kısalt (yapı korunur, <img> sayısı aynı kalır)
  const trimmed = html.replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{80,}/g, 'data:image/gif;base64,R0lGOD');
  if (trimmed !== html) { fs.writeFileSync(p, trimmed, 'utf8'); html = trimmed; }
  const a = extractApp(html);
  const b = extractRebuild(html);
  console.log(name, '| app:', a.lotNo, a.pulSayisi, '| rebuild:', b.lotNo, b.pulSayisi, '| size:', html.length);
}
