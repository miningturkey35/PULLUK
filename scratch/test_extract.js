// Test extraction functions from app.js against real Drive HTML samples
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const acorn = require('acorn');

const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const ast = acorn.parse(appSrc, { ecmaVersion: 2022 });

const wantedFns = new Set([
  'normalizePulTipi', 'isIIElizabethStamp', 'buildStampCodeBadge',
  'extractCountryFromText', 'normalizeCountryName', 'normalizeBasilsanatTur',
  'textHasCountryKeyword',
  'extractStampInfoFromHtml', 'extractBasilsanatInfoFromHtml', 'extractPlakInfoFromHtml',
]);
const wantedConsts = new Set(['STAMP_COUNTRIES', 'STAMP_COUNTRY_ABBREVS', 'PUL_TIPLERI', 'PUL_TIPI_MAP']);

const pieces = [];
for (const node of ast.body) {
  if (node.type === 'FunctionDeclaration' && node.id && wantedFns.has(node.id.name)) {
    pieces.push(appSrc.slice(node.start, node.end));
    wantedFns.delete(node.id.name);
  } else if (node.type === 'VariableDeclaration') {
    for (const d of node.declarations) {
      if (d.id && d.id.name && wantedConsts.has(d.id.name)) {
        pieces.push(appSrc.slice(node.start, node.end));
        wantedConsts.delete(d.id.name);
      }
    }
  }
}
if (wantedFns.size) throw new Error('missing fns: ' + [...wantedFns]);
if (wantedConsts.size) throw new Error('missing consts: ' + [...wantedConsts]);

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.navigator = dom.window.navigator;

const code = pieces.join('\n\n') + '\nmodule.exports = { extractStampInfoFromHtml, extractBasilsanatInfoFromHtml, extractPlakInfoFromHtml };';
const Module = require('module');
const m = new Module('extractors');
m._compile(code, 'extractors.js');
const ex = m.exports;

const files = ['MGP001', 'MGP002', 'MGP003', 'MGP004', 'MGP010', 'MGV001', 'MGV002', 'MGV003'];
for (const f of files) {
  const html = fs.readFileSync(path.join(__dirname, 'sample_' + f + '.html'), 'utf8');
  try {
    if (f.startsWith('MGP')) {
      const r = ex.extractBasilsanatInfoFromHtml(html);
      console.log(`\n=== ${f} (basilsanat) ===`);
      console.log(JSON.stringify({ title: r.title, code: r.code, yazar: r.yazar, yayinevi: r.yayinevi, dil: r.dil, tur: r.tur, year: r.year, basimYili: r.basimYili, durum: r.durum, image: r.image ? r.image.slice(0, 50) : '' }));
    } else {
      const r = ex.extractPlakInfoFromHtml(html);
      console.log(`\n=== ${f} (plak) ===`);
      console.log(JSON.stringify({ title: r.title, code: r.code, artist: r.artist, album: r.album, plakSirketi: r.plakSirketi, katalogNo: r.katalogNo, year: r.year, format: r.format, country: r.country, image: r.image ? r.image.slice(0, 50) : '' }));
    }
    const g = ex.extractStampInfoFromHtml(html);
    console.log('generic:', JSON.stringify({ title: g.title, code: g.code, country: g.country, year: g.year, image: g.image ? g.image.slice(0, 40) : '' }));
  } catch (e) {
    console.log(`\n=== ${f} ERROR: ${e.stack}`);
  }
}
