#!/usr/bin/env node
/**
 * rebuild_gallery.js — Rebuilds collection_data.js from scratch by fetching
 * HTML files from Google Drive and extracting metadata via regex.
 *
 * Usage:
 *   node rebuild_gallery.js              → gallery-only rebuild (default)
 *   node rebuild_gallery.js --all        → rebuild ALL sections
 *   node rebuild_gallery.js --section X  → rebuild only section X
 *   node rebuild_gallery.js --incremental → only re-fetch changed files (faster)
 *
 * Sections: galeri, diecast, plak, banknot, allother, legoverse, basilsanat, iskambil
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const DATA_FILE = path.join(__dirname, 'data', 'collection_data.js');
const PAGE_SIZE = 1000;
const RATE_LIMIT_MS = 500;

const FOLDERS = {
  galeri:     '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8',
  diecast:    '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg',
  plak:       '13FPeN7gTD3SjbUB6ENIfaJ4OVa6rYqd0',
  banknot:    '1ffJ9xKTsrKpaM3OcJ0fRU4ggcRRmKBdL',
  allother:   '1mmPvVEreFr0cbXjX3Ds21FOsZI9cRaH0',
  legoverse:  '1cJpRJ_B7wbHOJ69oYzI6JYWQdbabkLx4',
  basilsanat: '1whiqtq37efr6bpK4pJ3pPJJ_4Z01dD8W',
  iskambil:   '1ZNjWCmwVBgkCSbDkRKf-WkOZ4y3SDRQr',
};

const ALL_SECTIONS = Object.keys(FOLDERS);

// ─── STAMP COUNTRIES ────────────────────────────────────────────────────────
const STAMP_COUNTRIES = [
  { name: 'Osmanlı İmp.', keywords: ['osmanlı', 'ottoman', 'imp.', 'imparatorlugu', 'imparatorluğu'] },
  { name: 'Türkiye Cumhuriyeti', keywords: ['türkiye cumhuriyeti', 'turkiye cumhuriyeti', 'tc ', 't.c.', 'cumhuriyet', 'tayyare', 'cemiyeti', 'thk', 'türk hava', 'hava kurumu', 'ptt', 'posta ve telgraf', 'demiryolları', 'tcdd'] },
  { name: 'Birleşik Krallık', keywords: ['birleşik krallık', 'birlesik krallik', 'united kingdom', 'uk ', 'great britain', 'ingiltere', 'england'] },
  { name: 'Almanya', keywords: ['almanya', 'germany', 'deutschland', 'bundespost', 'ddr'] },
  { name: 'ABD', keywords: ['abd', 'usa', 'united states', 'amerika'] },
  { name: 'Fransa', keywords: ['fransa', 'france', 'francais'] },
  { name: 'İtalya', keywords: ['italya', 'italy', 'italia'] },
  { name: 'Rusya', keywords: ['rusya', 'russia', 'cccp', 'sssr', 'soviet'] },
  { name: 'Japonya', keywords: ['japonya', 'japan', 'nihon'] },
  { name: 'Çin', keywords: ['çin', 'chin', 'china'] },
];

// ─── PUL TIPI MAP ──────────────────────────────────────────────────────────
const PUL_TIPLERI = [
  'Posta Pulu', 'Damga Pulu', 'Vergi Pulu', 'Gazete Pulu', 'Resmî Pul',
  'Takse Pulu', 'Hava Postası', 'Hatıra / Anma Pulu', 'Yardım / Semi-Postal', 'Diğer',
];

const PUL_TIPI_MAP = {
  'posta pulu': 'Posta Pulu', 'posta pul': 'Posta Pulu', 'postage': 'Posta Pulu',
  'postage stamp': 'Posta Pulu', 'definitive': 'Posta Pulu', 'definitif': 'Posta Pulu',
  'damga pulu': 'Damga Pulu', 'damga pul': 'Damga Pulu', 'fiscal': 'Damga Pulu',
  'fiscal stamp': 'Damga Pulu',
  'vergi pulu': 'Vergi Pulu', 'vergi pul': 'Vergi Pulu', 'revenue': 'Vergi Pulu',
  'revenue stamp': 'Vergi Pulu',
  'gazete pulu': 'Gazete Pulu', 'gazete pul': 'Gazete Pulu',
  'newspaper stamp': 'Gazete Pulu', 'newspaper': 'Gazete Pulu',
  'resmî pul': 'Resmî Pul', 'resmi pul': 'Resmî Pul', 'resmî pulu': 'Resmî Pul',
  'resmi pulu': 'Resmî Pul', 'official': 'Resmî Pul', 'official stamp': 'Resmî Pul',
  'yetki pulu': 'Resmî Pul', 'yetki pul': 'Resmî Pul',
  'takse pulu': 'Takse Pulu', 'takse pul': 'Takse Pulu',
  'postage due': 'Takse Pulu', 'postage-due': 'Takse Pulu',
  'harç pulu': 'Takse Pulu', 'harç pul': 'Takse Pulu',
  'harc pulu': 'Takse Pulu', 'harc pul': 'Takse Pulu',
  'hava postası': 'Hava Postası', 'hava postasi': 'Hava Postası',
  'airmail': 'Hava Postası', 'air mail': 'Hava Postası', 'posta havalesi': 'Hava Postası',
  'anma pulu': 'Hatıra / Anma Pulu', 'anma pul': 'Hatıra / Anma Pulu',
  'hatıra pulu': 'Hatıra / Anma Pulu', 'hatıra pul': 'Hatıra / Anma Pulu',
  'anı pulu': 'Hatıra / Anma Pulu', 'anı pul': 'Hatıra / Anma Pulu',
  'commemorative': 'Hatıra / Anma Pulu', 'commerative': 'Hatıra / Anma Pulu',
  'konulu pulu': 'Hatıra / Anma Pulu', 'konulu pul': 'Hatıra / Anma Pulu',
  'tematik pulu': 'Hatıra / Anma Pulu', 'tematik pul': 'Hatıra / Anma Pulu',
  'yardım pulu': 'Yardım / Semi-Postal', 'yardım pul': 'Yardım / Semi-Postal',
  'semi-postal': 'Yardım / Semi-Postal', 'semi postal': 'Yardım / Semi-Postal',
  'semi-postal stamp': 'Yardım / Semi-Postal', 'charity': 'Yardım / Semi-Postal',
  'charity stamp': 'Yardım / Semi-Postal',
  'blok': 'Diğer', 'souvenir': 'Diğer', 'sheet': 'Diğer',
  'minyatür': 'Diğer', 'minyatur': 'Diğer',
  'perforasyonlu': 'Diğer', 'perforasyonsuz': 'Diğer',
  'çapa': 'Diğer', 'kepçe': 'Diğer', 'gümrük': 'Diğer', 'gumruk': 'Diğer',
  'resim pulu': 'Diğer', 'adi pulu': 'Diğer', 'derleme': 'Diğer', 'emisyon': 'Diğer',
  'tellaloğlu': 'Diğer', 'davalık': 'Diğer', 'mühürlü': 'Diğer',
  'parsel': 'Diğer', 'paket': 'Diğer', 'cinderella': 'Diğer',
  'telgraf': 'Diğer', 'telegraph': 'Diğer',
  'registration': 'Diğer', 'registered': 'Diğer',
  'express': 'Diğer', 'ekspres': 'Diğer', 'special delivery': 'Diğer',
  'parcel': 'Diğer', 'package': 'Diğer',
};

// ─── DIECAST CONSTANTS ──────────────────────────────────────────────────────
const DIECAST_BRANDS = [
  'MATCHBOX', 'HOT WHEELS', 'CORGI', 'DINKY', 'MAJORETTE', 'SIKU', 'BURAGO', 'MAISTO',
  'WELLY', 'JADA', 'GREENLIGHT', 'AUTOART', 'KYOSHO', 'MINICHAMPS', 'SPARK', 'IXO',
  'NOREV', 'SOLIDO', 'VANGUARDS', 'OXFORD', 'RAISE3D', 'SCHUCO', 'TOMY', 'TOMICA',
  'MAJOR', 'PLAYART', 'HUSKY', 'EFE', 'GAMA', 'MARKLIN', 'WIKING', 'HERPA',
  'BREKINA', 'ROCO', 'LIMA', 'FLEISCHMANN', 'PIKO', 'ARNOLD', 'RIVAROSSI',
  'ATHEARN', 'KATO', 'BACHMANN', 'WALTHERS', 'INTERMOUNTAIN', 'SCALE TRAINS', 'RAPIDO',
  'REMCO', 'GÖZGÖZ', 'MATCHBOX SUPER KINGS', 'POLISTIL', 'WSI', 'NZG', 'HERO', 'BBR',
  'CMR', 'GT SPIRIT', 'LOOK SMART', 'TRUE SCALE', 'TSM', 'IGUANAMODEL', 'GREAT WALL',
  'LCD', 'HPI', 'CIRCLE G', 'JONTOY', 'ERTL', 'AMT', 'MONOGRAM', 'REVELL', 'TESTORS',
];

const DIECAST_BRAND_ALIASES = {
  'LESNEY': 'MATCHBOX',
  'LESNEY PRODUCTS': 'MATCHBOX',
  'MATCHBOX SUPER KINGS': 'MATCHBOX',
  'GOZGOZ': 'GÖZGÖZ',
};

// ─── BASILSANAT CONSTANTS ───────────────────────────────────────────────────
const BASILSANAT_TUR_CANONICAL = ['Kitap', 'Çizgi Roman', 'Dergi', 'Gazete', 'Katalog', 'Broşür', 'Efemera', 'Diğer'];

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

// II. Elizabeth pullarını tespit et
function isIIElizabethStamp(scanText, country) {
  const isUK = country === 'Birleşik Krallık' || country === 'UK';
  const hasElizabeth = /elizabeth\s*ii|ii\.\s*elizabeth|queen\s+elizabeth/i.test(scanText);
  return isUK || hasElizabeth;
}

function normalizePulTipi(raw) {
  if (!raw) return '';
  const low = raw.toLowerCase().trim();
  if (PUL_TIPLERI.includes(raw.trim())) return raw.trim();
  if (PUL_TIPI_MAP[low]) return PUL_TIPI_MAP[low];
  for (const [key, val] of Object.entries(PUL_TIPI_MAP)) {
    if (low.includes(key) || key.includes(low)) return val;
  }
  return 'Diğer';
}

function stripPatterns(str) {
  return str
    .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK/gi, '')
    .replace(/KOLEKSİYON(U)?/gi, '')
    .replace(/MG[A-Z]?\s*\d+/gi, '')
    .replace(/^[\s\d\-.:|•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCountryFromText(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  for (const c of STAMP_COUNTRIES) {
    for (const kw of c.keywords) {
      const kwEscaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const kwRegex = new RegExp('\\b' + kwEscaped, 'i');
      if (kwRegex.test(lower)) return c.name;
    }
  }
  if (/\bt\.c\.\b|\btürkiye cumhuriyeti\b|\bturkiye cumhuriyeti\b|\btayyare\b|\bcemiyeti\b|\bthk\b|\btürk hava\b|\bhava kurumu\b|\bptt\b|\bposta ve telgraf\b|\bdemiryolları\b|\btcdd\b/.test(lower)) return 'Türkiye Cumhuriyeti';
  if (/\bosmanlı\b|\bottoman\b/.test(lower)) return 'Osmanlı İmp.';
  if (/\bingiltere\b|\bengland\b|\bgreat britain\b|\bunited kingdom\b|\buk\b/.test(lower)) return 'Birleşik Krallık';
  if (/\balmanya\b|\bgermany\b|\bdeutschland\b/.test(lower)) return 'Almanya';
  if (/\babd\b|\busa\b|\bunited states\b|\bamerika\b/.test(lower)) return 'ABD';
  if (/\bfransa\b|\bfrance\b/.test(lower)) return 'Fransa';
  if (/\bitalya\b|\bitaly\b|\bitalia\b/.test(lower)) return 'İtalya';
  if (/\brusya\b|\brussia\b|\bsssr\b|\bcccp\b|\bsoviet\b/.test(lower)) return 'Rusya';
  if (/\bjaponya\b|\bjapan\b/.test(lower)) return 'Japonya';
  if (/\bçin\b|\bchin\b|\bchina\b/.test(lower)) return 'Çin';
  return '';
}

function normalizeCountryName(name) {
  if (!name) return '';
  const n = name.trim();
  const map = {
    'Osmanlı İmparatorluğu': 'Osmanlı İmp.',
    'Osmanlı İmp.': 'Osmanlı İmp.',
    'Türkiye Cumhuriyeti': 'Türkiye Cumhuriyeti',
    'Türkiye': 'Türkiye Cumhuriyeti',
    'T.C.': 'Türkiye Cumhuriyeti',
    'TC': 'Türkiye Cumhuriyeti',
    'Birleşik Krallık': 'UK',
    'Almanya': 'Almanya',
    'ABD': 'ABD',
    'Fransa': 'Fransa',
    'İtalya': 'İtalya',
    'Rusya': 'Rusya',
    'Japonya': 'Japonya',
    'Çin': 'Çin',
  };
  if (map[n]) return map[n];
  for (const [full, short] of Object.entries(map)) {
    if (n.includes(full) || n.toLowerCase().includes(full.toLowerCase())) return short;
  }
  return n;
}

function toEnUpper(str) {
  if (!str) return '';
  return String(str).replace(/i/g, 'I').replace(/ğ/g, 'Ğ').replace(/ü/g, 'Ü')
    .replace(/ş/g, 'Ş').replace(/ö/g, 'Ö').replace(/ç/g, 'Ç').replace(/ı/g, 'I').toUpperCase();
}

function extractYearFromText(text) {
  if (!text) return '';
  const match = String(text).match(/\b((?:18|19|20)\d{2})\b/);
  return match ? match[1] : '';
}

function normalizeBasilsanatTur(raw) {
  if (!raw || typeof raw !== 'string') return 'Diğer';
  const toAscii = s => (s || '').replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').toLowerCase().trim();
  const norm = toAscii(raw);
  if (!norm) return 'Diğer';
  for (const canon of BASILSANAT_TUR_CANONICAL) {
    if (norm === toAscii(canon)) return canon;
  }
  if (norm.includes('cizgi roman') || norm.includes('grafik roman') || norm.includes('comic') || norm.includes('manga')) return 'Çizgi Roman';
  if (norm.includes('dergi') || norm.includes('mecmua') || norm.includes('magazine') || norm.includes('periyodik')) return 'Dergi';
  if (norm.includes('gazete') || norm.includes('newspaper') || norm.includes('bulten')) return 'Gazete';
  if (norm.includes('katalog') || norm.includes('catalogue')) return 'Katalog';
  if (norm.includes('brosur') || norm.includes('brochure') || norm.includes('prospektus') || norm.includes('kitapcik') || norm.includes('foyer')) return 'Broşür';
  if (norm.includes('efemera') || norm.includes('ephemera') || norm.includes('kartpostal') || norm.includes('bilet') || norm.includes('evrak') || norm.includes('dokuman') || norm.includes('belge')) return 'Efemera';
  if (norm.includes('kitap') || norm.includes('roman') || norm.includes('book') || norm.includes('oyku') || norm.includes('siir') || norm.includes('ansiklopedi') || norm.includes('monografi')) return 'Kitap';
  return 'Diğer';
}

function resolveDiecastBrand(rawText) {
  if (!rawText) return '';
  const upper = toEnUpper(rawText).trim();
  for (const b of DIECAST_BRANDS) {
    if (upper.includes(b)) return DIECAST_BRAND_ALIASES[b] || b;
  }
  const clean = rawText.split('(')[0].replace(/[-–—]/g, ' ').trim();
  return clean ? toEnUpper(clean) : '';
}

function detectScale(brand, title) {
  const scaleMatch = (title || '').match(/\b(1:\d+)\b/);
  if (scaleMatch) return scaleMatch[1];
  const brandScales = {
    'AUTOART': '1:18', 'KYOSHO': '1:18', 'MINICHAMPS': '1:18', 'SPARK': '1:18',
    'IXO': '1:43', 'NOREV': '1:43', 'SOLIDO': '1:43', 'VANGUARDS': '1:43', 'OXFORD': '1:43',
    'MATCHBOX': '1:64', 'HOT WHEELS': '1:64', 'CORGI': '1:36', 'DINKY': '1:43',
    'MAJORETTE': '1:64', 'SIKU': '1:64', 'BURAGO': '1:64', 'MAISTO': '1:64',
    'WELLY': '1:64', 'JADA': '1:64', 'GREENLIGHT': '1:64', 'RAISE3D': '1:64',
    'SCHUCO': '1:64', 'TOMY': '1:64', 'TOMICA': '1:64', 'REMCO': '1:64', 'GÖZGÖZ': '1:64',
  };
  return brandScales[brand] || '1:64';
}

function detectMaterial(brand, title) {
  const matMatch = (title || '').match(/\b(resin|diecast|metal|plastic|zinc|white metal)\b/i);
  if (matMatch) return matMatch[1].charAt(0).toUpperCase() + matMatch[1].slice(1).toLowerCase();
  const brandMaterials = {
    'AUTOART': 'Resin', 'KYOSHO': 'Resin', 'MINICHAMPS': 'Resin', 'SPARK': 'Resin',
    'IXO': 'Resin', 'NOREV': 'Resin', 'SOLIDO': 'Diecast Metal', 'VANGUARDS': 'Diecast Metal', 'OXFORD': 'Diecast Metal',
    'MATCHBOX': 'Diecast Metal', 'HOT WHEELS': 'Diecast Metal', 'CORGI': 'Diecast Metal', 'DINKY': 'Diecast Metal',
    'MAJORETTE': 'Diecast Metal', 'SIKU': 'Diecast Metal', 'BURAGO': 'Diecast Metal', 'MAISTO': 'Diecast Metal',
    'WELLY': 'Diecast Metal', 'JADA': 'Diecast Metal', 'GREENLIGHT': 'Diecast Metal', 'REMCO': 'Diecast Metal', 'GÖZGÖZ': 'Diecast Metal',
  };
  return brandMaterials[brand] || 'Diecast Metal';
}

// ─── HTTP FETCHING ──────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        res.resume();
        return fetchUrl(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function listDriveFiles(folderId, sectionName) {
  const allFiles = [];
  let pageToken = '';
  let page = 1;

  do {
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType='text/html' and trashed=false`);
    let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,modifiedTime,size)&pageSize=${PAGE_SIZE}&key=${API_KEY}&orderBy=name`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetchUrl(url);
    if (res.status !== 200) {
      console.error(`   ERROR listing ${sectionName} page ${page}: HTTP ${res.status} — ${res.body.substring(0, 200)}`);
      break;
    }
    const parsed = JSON.parse(res.body);
    if (parsed.files) allFiles.push(...parsed.files);
    pageToken = parsed.nextPageToken || '';
    if (pageToken) {
      console.log(`   Page ${page}: ${parsed.files.length} files (total so far: ${allFiles.length})...`);
      page++;
      await sleep(RATE_LIMIT_MS);
    }
  } while (pageToken);

  return allFiles;
}

async function downloadFile(fileId) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetchUrl(url);
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.body;
}

// ─── TABLE EXTRACTION (regex-based) ─────────────────────────────────────────

function extractTableData(html) {
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const data = {};
  for (const row of rows) {
    const thMatches = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
    const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    let key = '', val = '';
    if (thMatches && tdMatches && tdMatches.length >= 1) {
      key = thMatches[0].replace(/<[^>]+>/g, '').trim();
      val = tdMatches[0].replace(/<[^>]+>/g, '').trim();
    } else if (tdMatches && tdMatches.length >= 2) {
      key = tdMatches[0].replace(/<[^>]+>/g, '').trim();
      val = tdMatches[1].replace(/<[^>]+>/g, '').trim();
    }
    if (key && val) data[key.toLowerCase().trim()] = val;
  }
  return data;
}

function findTableValue(tableData, ...keys) {
  for (const k of keys) {
    const low = k.toLowerCase();
    for (const tk of Object.keys(tableData)) {
      if (tk === low || tk.startsWith(low + ' ') || tk.endsWith(' ' + low) ||
          low === tk || low.startsWith(tk + ' ') || low.endsWith(' ' + tk)) {
        return tableData[tk];
      }
    }
  }
  return '';
}

function normalizeTableKey(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\u0435/g, 'e').replace(/\u0430/g, 'a').replace(/\u043e/g, 'o')
    .replace(/\u0440/g, 'p').replace(/\u0441/g, 'c')
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── STAMP (GALERI) METADATA EXTRACTION ─────────────────────────────────────

function extractStampInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', country: '', year: '', katalogNo: '', ulke: '', basimYili: '', basimYeri: '', nominalDeger: '', pulTipi: '', ozet: '', durum: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  let title = '', subtitle = '', image = '', code = '';
  let country = '', year = '', nominalDeger = '', pulTipi = '';
  let basimYili = '', basimYeri = '', ozet = '', durum = '';

  const allText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const scanText = allText.toLowerCase();

  // ── TABLE DATA ──
  const tableData = extractTableData(html);

  const findKey = (...keys) => findTableValue(tableData, ...keys);

  // ── CODE ──
  const kodMatch = cleanHtml.match(/<div\s+class="kod"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="collection-number"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="coll-num"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="col-num"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="badge--code"[^>]*>([\s\S]*?)<\/div>/i);
  if (kodMatch) code = kodMatch[1].replace(/<[^>]+>/g, '').trim();
  // "Koleksiyon No: MG0005" gibi formatları temizle
  if (code) {
    const codeClean = code.match(/(MG\d+)/i);
    if (codeClean) code = codeClean[1].toUpperCase();
  }
  if (!code) {
    const titleTagMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      const rawTitle = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
      const cm = rawTitle.match(/\b(M[GCKR]\w*\d+)\b/i);
      if (cm) code = cm[1].trim();
    }
  }

  // ── TITLE ──
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  if (!title) {
    const titleSelectors = ['.title', '.name', 'h2', 'h3', '.stamp-title', '[itemprop="name"]'];
    for (const sel of titleSelectors) {
      const re = new RegExp('<' + sel.replace(/[[\]]/g, '') + '[^>]*>([\\s\\S]*?)<\\/' + sel.replace(/[[\]]/g, '').split(' ')[0] + '>', 'i');
      const m = cleanHtml.match(re);
      if (m) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 1 && text.length < 200) { title = text; break; }
      }
    }
  }
  if (!title) {
    const titleTagMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      const rawTitle = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
      const parts = rawTitle.split(/[·•|—–]/);
      if (parts.length >= 2) {
        title = parts.find(p => p.trim() && !/^MG[A-Z]?\d+$/i.test(p.trim()) && !/GÜVENTÜRK|KOLEKSİYON/i.test(p.trim())) || '';
        title = title.trim();
      } else if (rawTitle && !/GÜVENTÜRK|KOLEKSİYON/i.test(rawTitle)) {
        title = rawTitle;
      }
    }
  }

  // ── SUBTITLE ──
  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="sub"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="description"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  // ── IMAGE ──
  const imgMatch = cleanHtml.match(/<img\s+src="(data:image\/[^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  // ── CLEAN TITLE & SUBTITLE ──
  title = stripPatterns(title);
  subtitle = stripPatterns(subtitle);

  // ── NOMINAL DEĞER ──
  const currencyPattern = /(?:^|\s|:)(\d+[.,]?\d*)\s+(kuruş|kurus|para|lira|₺|TL\b|sent|cente?|penny|pence|pfenning|groschen|shilling|franc|mark|rupi|yen|yuan|won|dinar|ruble|real|peso|riyal|cents?|dollars?|euro?)/i;
  if (title) {
    const cm = title.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  if (!nominalDeger && subtitle) {
    const cm = subtitle.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  if (!nominalDeger) {
    const tableNominal = findKey('nominal', 'değer', 'deger', 'value', 'bedel', 'kiymet', 'fiyat', 'tutar', 'birim', 'denomination', 'face value');
    if (tableNominal) {
      const cm = tableNominal.match(currencyPattern);
      if (cm) nominalDeger = cm[0].trim();
      else if (tableNominal.length < 40) nominalDeger = tableNominal.trim();
    }
  }
  if (!nominalDeger) {
    const cm = allText.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  if (!nominalDeger) {
    const denomMatch = allText.match(/(?:değer|deger|nominal|value|bedel|kiymet|fiyat|tutar|birim)[:\s]+([^,;\n]{3,40})/i);
    if (denomMatch) nominalDeger = denomMatch[1].trim();
  }
  if (nominalDeger) {
    nominalDeger = nominalDeger.replace(/\s*\([^)]*\)\s*$/, '').trim();
    nominalDeger = nominalDeger.replace(/\s*\(.*$/, '').trim();
    nominalDeger = nominalDeger.replace(/^(değer|değeri|deger|nominal|bedel|kiymet|fiyat|tutar|birim)[:\s]+/i, '').trim();
  }

  // ── COUNTRY ──
  const countryInfo = STAMP_COUNTRIES.find(c => c.keywords.some(kw => scanText.includes(kw)));
  if (countryInfo) country = countryInfo.name;
  if (!country) {
    const tableCountry = findKey('ülke', 'ulke', 'country', 'menşe', 'mense', 'menşei', 'origin', 'devlet', 'state');
    if (tableCountry) country = extractCountryFromText(tableCountry) || tableCountry;
  }

  // ── YEAR ──
  if (title) {
    const tYear = title.match(/\b((?:18|19|20)\d{2})\b/);
    if (tYear) year = tYear[1];
  }
  if (!year) {
    const tableYear = findKey('yıl', 'yil', 'year', 'tarih', 'basım yılı', 'basim yili', 'yayın yılı', 'dönem', 'üretim yılı');
    if (tableYear) {
      const ym = tableYear.match(/\b((?:18|19|20)\d{2})\b/);
      if (ym) year = ym[1];
    }
  }
  if (!year) {
    const yearMatch = scanText.match(/\b((?:18|19|20)\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
  }

  // ── BASIM YILI ──
  basimYili = findKey('basım yılı', 'basim yili', 'basım yili');
  if (!basimYili && year) basimYili = year;

  // ── PUL TİPİ ──
  // First, check title for definitive/definitif keywords (high confidence)
  if (title) {
    const titleLower = title.toLowerCase();
    if (/\bdefinitive\b|\bdefinitif\b|\badi\s+pul/i.test(titleLower)) {
      pulTipi = 'Posta Pulu';
    }
  }
  if (allText.match(/\*{4,}/)) {
    pulTipi = 'Damga Pulu';
  }
  if (!pulTipi && /\b(fiscal\s+)?damga\b/i.test(allText)) {
    pulTipi = 'Damga Pulu';
  }
  const stampTypePatterns = [
    /\b(hazır\s+antetli|ılk\s+gün|prime\s+cover|first\s+day|air\s*mail|posta\s+havalesi|kargo\s+pulu|posta\s+kutusu|posta\s+kasası)\b/i,
    /\b(vergi\s+pulu|vergi\s+pul|harç\s+pulu|harç\s+pul|damga\s+pulu|damga\s+pul|posta\s+pulu|posta\s+pul|anma\s+pulu|anma\s+pul|konulu\s+pulu|konulu\s+pul|tematik\s+pulu|tematik\s+pul|hatıra\s+pulu|hatıra\s+pul|anı\s+pulu|anı\s+pul|resim\s+pulu|resim\s+pul|adi\s+pulu|adi\s+pul|tellaloğlu|davalık|mühürlü|derleme|emisyon|blok|souvenir|sheet|minyatür|minyatur|çapa|kepçe|perforasyon|perforasyonlu|perforasyonsuz|gümrük|gumruk|telegraph|telgraf|parsel|paket|hava\s+postası|hava\s+postasi|express|ekspres|resmi|resmî|resmi\s+pulu|resmi\s+pul|yetki|yetki\s+pulu|yetki\s+pul|resmî\s+pulu|resmi\s+pulu)\b/i,
    /\b(commemorative|definitive|posta\s+pulu|posta\s+pul|revenue|cinderella|charity|charity\s+stamp|airmail|air\s+mail|postage|fiscal|official|semi-postal|semi\s+postal|postage\s+due|postage-due|registration|registered|express|special\s+delivery|parcel|package|newspaper|newspaper\s+stamp|telegraph|telegram)\b/i,
    /\b(pul)\b/i,
  ];
  if (!pulTipi) {
    for (const pat of stampTypePatterns) {
      const tm = scanText.match(pat);
      if (tm) { pulTipi = tm[1] || tm[0]; break; }
    }
  }
  if (!pulTipi && subtitle) {
    for (const pat of stampTypePatterns) {
      const tm = subtitle.toLowerCase().match(pat);
      if (tm) { pulTipi = tm[1] || tm[0]; break; }
    }
  }
  if (!pulTipi) {
    const tableTip = findKey('pul tipi', 'tip', 'type', 'tür', 'tur', 'kategori', 'category', 'seri', 'konu', 'nominal değer', 'nominal');
    if (tableTip) {
      for (const pat of stampTypePatterns) {
        const tm = tableTip.toLowerCase().match(pat);
        if (tm) { pulTipi = tm[1] || tm[0]; break; }
      }
      if (!pulTipi && /^(posta|damga|vergi|harç|anma|konulu|tematik|hatıra|resim|adi|resmi|derleme|emisyon|blok)/i.test(tableTip)) {
        pulTipi = tableTip;
      }
    }
  }
  pulTipi = normalizePulTipi(pulTipi);

  // II. Elizabeth pullarını her zaman "Posta Pulu" olarak ayarla
  if (isIIElizabethStamp(scanText, country)) {
    pulTipi = 'Posta Pulu';
  }

  // ── BASIM YERİ ──
  const basimYeriKeys = [
    'basım yeri', 'baskı yeri', 'bastığı yer', 'basıldığı yer', 'bas yeri',
    'basım şehri', 'baskı şehri', 'baski yeri', 'basim yeri',
    'place of printing', 'printed in', 'printing place', 'printing city',
    'city of issue', 'issue place', 'place of issue',
    'yayın yeri', 'yayin yeri', 'yayınevi',
    'basım bölgesi', 'basım merkezi', 'şehir', 'yer', 'location',
  ];
  basimYeri = findKey(...basimYeriKeys);
  if (!basimYeri) {
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rows) {
      const thMatches = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
      const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      let key = '', val = '';
      if (thMatches && tdMatches && tdMatches.length >= 1) {
        key = thMatches[0].replace(/<[^>]+>/g, '').trim();
        val = tdMatches[0].replace(/<[^>]+>/g, '').trim();
      } else if (tdMatches && tdMatches.length >= 2) {
        key = tdMatches[0].replace(/<[^>]+>/g, '').trim();
        val = tdMatches[1].replace(/<[^>]+>/g, '').trim();
      }
      if (key && val) {
        const tLow = key.toLowerCase().trim();
        if (basimYeriKeys.some(k => tLow === k || tLow.includes(k))) {
          basimYeri = val;
          break;
        }
      }
    }
  }
  if (!basimYeri) {
    for (const key of basimYeriKeys) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[:\s]+([a-zA-ZçğıöşüÇĞİÖŞÜ\\s.,-]{2,60})', 'i');
      const cm = allText.match(regex);
      if (cm) { basimYeri = cm[1].trim(); break; }
    }
  }

  // ── ÖZET ──
  const descMatch = cleanHtml.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch) ozet = descMatch[1];
  if (!ozet) {
    const descSelectors = ['.summary', '.overview', '.description', '.detail-text', '.info-text', '.notlar', '.notes'];
    for (const sel of descSelectors) {
      const re = new RegExp('<div\\s+class="' + sel.replace('.', '') + '"[^>]*>([\\s\\S]*?)</div>', 'i');
      const m = cleanHtml.match(re);
      if (m) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 3 && text.length < 300) { ozet = text; break; }
      }
    }
  }
  if (!ozet) {
    const pMatch = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const t = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (t && t.length > 10 && t.length < 300 && !/GÜVENTÜRK|KOLEKSİYON/i.test(t)) {
        ozet = t;
      }
    }
  }

  // ── DURUM ──
  durum = findKey('durum', 'condition', 'status', 'kalite', 'nitelik', 'stamped', 'cancel', 'mint', 'mnh', 'mlh', 'used', 'kullanılmış', 'damga durumu');
  if (!durum) {
    const mintMatch = scanText.match(/\b(mint\s*unused|mint\s*hinge|mint\s*no\s*hinge|mnh|mlh|mint|mn)\b/i);
    if (mintMatch) {
      const m = mintMatch[1].toUpperCase().trim();
      const mintMap = { 'MINT UNUSED': 'Mint', 'MINT HINGE': 'MNH', 'MINT NO HINGE': 'MLH', 'MNH': 'MNH', 'MLH': 'MLH', 'MINT': 'Mint', 'MN': 'Mint' };
      durum = mintMap[m] || m;
    }
  }
  if (!durum) {
    const damgaMatch = scanText.match(/\b(damgal[ıi]|damgas[ıi]z|kullan[ıi]lm[ıi]ş|kullan[ıi]lmam[ıi]ş|cancel(?:ed|led)?|uncancel(?:ed|led)?|used|unused|postally\s+used|pre-cancel|precancel)\b/i);
    if (damgaMatch) {
      const d = damgaMatch[1].toLowerCase();
      if (/damgal[ıi]|cancel|used|kullan[ıi]lm[ıi]ş|postally/.test(d)) {
        durum = 'Damgalı';
      } else {
        durum = 'Damgasız';
      }
    }
  }
  if (durum && !/damgal|damgas/.test(durum)) {
    const isDamgali = /damgal[ıi]|cancel|used|kullan[ıi]lm[ıi]ş|postally/.test(scanText);
    const isDamgasiz = /damgas[ıi]z|uncancel|unused|kullan[ıi]lmam[ıi]ş/.test(scanText);
    if (isDamgali) durum = 'Damgalı · ' + durum;
    else if (isDamgasiz) durum = 'Damgasız · ' + durum;
  } else if (!durum) {
    const isDamgali = /damgal[ıi]|cancel|used|kullan[ıi]lm[ıi]ş|postally/.test(scanText);
    const isDamgasiz = /damgas[ıi]z|uncancel|unused|kullan[ıi]lmam[ıi]ş/.test(scanText);
    if (isDamgali) durum = 'Damgalı';
    else if (isDamgasiz) durum = 'Damgasız';
  }

  return {
    title, subtitle, image, code, country, year, katalogNo: code,
    ulke: country, nominalDeger, pulTipi, basimYili, basimYeri, durum, ozet,
  };
}

// ─── DIECAST METADATA EXTRACTION ────────────────────────────────────────────

function extractDiecastInfoFromHtml(html) {
  if (!html) return {};
  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const tableData = extractTableData(html);
  const allText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // ── TITLE ──
  let title = '';
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  if (!title) {
    const titleTag = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTag) title = titleTag[1].replace(/<[^>]+>/g, '').trim();
  }

  // ── IMAGE ──
  let image = '';
  const imgMatch = cleanHtml.match(/<img\s+src="(data:image\/[^"]+)"/i)
    || cleanHtml.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  // ── SUBTITLE ──
  let subtitle = '';
  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  // ── CODE ──
  let code = '';
  const kodMatch = cleanHtml.match(/class="kod"[^>]*>([\s\S]*?)<\//i);
  if (kodMatch) code = kodMatch[1].replace(/<[^>]+>/g, '').trim();
  if (!code) code = tableData['katalog kodu'] || tableData['katalog no'] || '';

  // ── BRAND ──
  const rawBrand = tableData['marka / üretici'] || tableData['marka / seri'] || tableData['marka'] || tableData['üretici'] || '';
  let brand = resolveDiecastBrand(rawBrand);
  if (!brand) {
    const searchTexts = (title + ' ' + (cleanHtml.match(/<[^>]+>/g, '') || []).join(' ')).toUpperCase();
    for (const b of DIECAST_BRANDS) {
      if (new RegExp('\\b' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\b', 'i').test(searchTexts)) {
        brand = b;
        break;
      }
    }
  }
  if (!brand) brand = 'DIE-CAST';

  // ── MODEL ──
  let model = tableData['araç'] || tableData['model'] || tableData['model / casting'] || tableData['model adı'] || tableData['model kodu'] || '';
  if (!model) model = title || '';
  model = model
    .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK/gi, '')
    .replace(/KOLEKSİYON(U)?/gi, '')
    .replace(/^[-–—|\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!model) model = 'Diecast Model';

  // ── SCALE ──
  let scale = tableData['ölçek (yaklaşık)'] || tableData['ölçek'] || tableData['scale'] || '';
  if (!scale) {
    const sm = allText.match(/\b(1:\d+)\b/);
    if (sm) scale = sm[1];
    else scale = detectScale(brand, model);
  }

  // ── YEAR / PRODUCTION YEAR ──
  let productionYear = tableData['üretim yılı'] || tableData['dönem'] || tableData['üretim yılı (yaklaşık)'] || tableData['yıl'] || '';
  if (productionYear && productionYear.length > 25) {
    const ym = productionYear.match(/\b(19|20)\d{2}\b/);
    if (ym) productionYear = ym[1];
  }
  if (!productionYear) {
    productionYear = extractYearFromText(title + ' ' + allText);
  }

  // ── MODEL YEAR ──
  let modelYear = '';
  const modelYearMatch = model.match(/^\b((?:18|19|20)\d{2})\b/);
  if (modelYearMatch) {
    modelYear = modelYearMatch[1];
  } else {
    const modelYearFallback = model.match(/\b((?:18|19|20)\d{2})\b/);
    if (modelYearFallback) modelYear = modelYearFallback[1];
  }
  if (!modelYear) {
    modelYear = tableData['model yılı'] || tableData['araç yılı'] || tableData['dönem'] || '';
    if (modelYear && modelYear.length > 10) {
      const ym = modelYear.match(/\b(19|20)\d{2}\b/);
      if (ym) modelYear = ym[1];
    }
  }

  // ── ORIGIN ──
  let origin = tableData['menşei'] || tableData['üretim yeri'] || tableData['ülke'] || '';
  origin = origin.replace(/Made in\s*/i, '').replace(/İngiltere\s*\((.*?)\)/i, 'İngiltere').trim();

  // ── SERIES ──
  let series = tableData['seri / numara'] || tableData['seri'] || tableData['model no.'] || tableData['model kodu'] || tableData['seri / tip'] || '';
  if (series.length > 35) series = series.substring(0, 35) + '…';

  // ── MATERIAL ──
  let material = tableData['malzeme'] || tableData['material'] || tableData['gövde'] || tableData['govde'] || '';
  if (!material) {
    material = detectMaterial(brand, model);
  } else if (/metal|die-cast|diecast/i.test(material)) {
    material = 'Diecast Metal';
  }

  // ── COUNTRY ──
  let country = origin || 'Bilinmiyor';

  return {
    title, subtitle, image, code, brand, model, scale, year: productionYear, origin,
    series, material, modelYear, productionYear, country,
  };
}

// ─── PLAK (VINYL) METADATA EXTRACTION ───────────────────────────────────────

function extractPlakInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', artist: '', album: '', plakSirketi: '', katalogNo: '', year: '', format: '', country: '', genre: '', pressing: '', matrixNo: '', condition: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const allText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const scanText = allText.toLowerCase();

  let title = '', subtitle = '', image = '', code = '';
  let artist = '', album = '', plakSirketi = '', katalogNo = '', year = '', format = '', country = '';
  let genre = '', pressing = '', matrixNo = '', condition = '';

  // ── TITLE ──
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  if (!title) {
    const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // ── IMAGE ──
  const imgMatch = cleanHtml.match(/<img\s+src="(data:image\/[^"]+)"/i)
    || cleanHtml.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  // ── SUBTITLE ──
  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="sub"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  // ── TABLE DATA ──
  const tableData = extractTableData(html);

  const findKey = (...keys) => findTableValue(tableData, ...keys);

  artist = findKey('sanatçı', 'sanatci', 'artist', 'müzisyen', 'ses sanatçısı', 'group', 'grup', 'performer');
  album = findKey('albüm', 'album', 'plak adı', 'eser', 'konu', 'title', 'lp', 'ep');
  plakSirketi = findKey('plak şirketi', 'plak sirketi', 'şirket', 'sirket', 'label', 'record label', 'yayın', 'yayinevi', 'firma', 'şirketi', 'etiket');
  katalogNo = findKey('katalog', 'catalog', 'kat no', 'no', 'numara', 'katalog no', 'catalog no');

  if (plakSirketi && /[–—-]/.test(plakSirketi)) {
    const sepMatch = plakSirketi.match(/^(.+?)\s*[–—-]\s+(.+)$/);
    if (sepMatch) {
      const possibleLabel = sepMatch[1].trim();
      const possibleCatNo = sepMatch[2].trim();
      if (/\d/.test(possibleCatNo)) {
        plakSirketi = possibleLabel;
        if (!katalogNo) katalogNo = possibleCatNo;
      }
    }
  }

  year = findKey('yıl', 'yil', 'year', 'tarih', 'basım yılı', 'basim yili', 'yayın yılı', 'release year');
  format = findKey('format', 'tür', 'tur', 'tip', 'tipi', 'format:', 'plak formatı', 'çap', 'cap', 'rpm', 'devir', 'boyut');
  country = findKey('ülke', 'ulke', 'country', 'menşe', 'mense', 'menşei', 'origin', 'press country');
  genre = findKey('tür', 'tur', 'genre', 'style', 'müzik türü', 'muzik turu', 'kategori');
  pressing = findKey('basım', 'basim', 'pressing', 'press', 'reissue', 'remaster', 'baskı', 'baski', 'edition', 'sürüm', 'surum');
  matrixNo = findKey('matriks', 'matrix', 'runout', 'run-out', 'dead wax', 'katalog no', 'catalog no', 'matris');
  condition = findKey('durum', 'condition', 'grade', 'grading', 'kondisyon');

  if (!year) {
    const yearMatch = scanText.match(/\b((?:19|20)\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
  }
  if (!format) {
    const fmtMatch = scanText.match(/\b(lp|ep|single|45\s*rpm|33\s*rpm|78\s*rpm|7["\u2033]|12["\u2033]|10["\u2033]|vinyl|plak|cd|kaset|cassette|box\s*set|picture\s*disc|colored\s*vinyl|coloured\s*vinyl|flexi|flexi\s*disc)\b/i);
    if (fmtMatch) format = fmtMatch[1];
  }
  if (!katalogNo) {
    const kodElMatch = cleanHtml.match(/<div\s+class="(kod|collection-number|catalog)"[^>]*>([\s\S]*?)<\/div>/i);
    if (kodElMatch) katalogNo = kodElMatch[2].replace(/<[^>]+>/g, '').trim();
    if (!katalogNo) {
      const tMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (tMatch) {
        const cm = tMatch[1].replace(/<[^>]+>/g, '').match(/\b([A-Z]{2,5}[-\s]?\d{2,8})\b/);
        if (cm) katalogNo = cm[1];
      }
    }
  }

  if (!artist && subtitle) artist = subtitle;
  if (title && !artist) {
    const parts = title.split(/\s*[—–\-|]\s*/);
    if (parts.length >= 2) {
      artist = parts[0].trim();
      album = parts.slice(1).join(' — ').trim();
    }
  }
  if (!album && title) album = title;
  code = katalogNo;

  // Format normalization
  if (format) {
    const f = format.toLowerCase().trim();
    if (/(^lp$|33\s*rpm|long\s*play|12["\u2033])/.test(f) && !/ep|single|7["\u2033]/.test(f)) format = 'LP (12", 33 RPM)';
    else if (/(^ep$|extended\s*play|45\s*rpm.*ep|7["\u2033].*ep)/.test(f)) format = 'EP (7", 45 RPM)';
    else if (/(^single$|45\s*rpm|7["\u2033])/.test(f) && !/ep/.test(f)) format = 'Single (7", 45 RPM)';
    else if (/12["\u2033].*single|12["\u2033].*45/.test(f)) format = '12" Single (45 RPM)';
    else if (/10["\u2033]/.test(f)) format = '10" LP';
    else if (/box\s*set/.test(f)) format = 'Box Set';
    else if (/picture\s*disc/.test(f)) format = 'Picture Disc';
    else if (/colored\s*vinyl|coloured\s*vinyl/.test(f)) format = 'Colored Vinyl';
    else if (/flexi/.test(f)) format = 'Flexi Disc';
    else if (/78\s*rpm/.test(f)) format = '78 RPM';
    else format = format.charAt(0).toUpperCase() + format.slice(1).toLowerCase();
  }

  // Genre normalization
  if (genre) {
    const g = genre.toLowerCase().trim();
    const genreMap = {
      'rock': 'Rock', 'pop': 'Pop', 'jazz': 'Jazz', 'blues': 'Blues',
      'klasik': 'Klasik', 'classical': 'Klasik', 'anadolu pop': 'Anadolu Pop',
      'psychedelic': 'Psikodelik', 'psikodelik': 'Psikodelik', 'funk': 'Funk',
      'soul': 'Soul', 'disco': 'Disco', 'new wave': 'New Wave', 'punk': 'Punk',
      'metal': 'Metal', 'heavy metal': 'Metal', 'folk': 'Folk', 'halk müziği': 'Folk',
      'electronic': 'Elektronik', 'electronica': 'Elektronik', 'hip hop': 'Hip Hop',
      'rap': 'Hip Hop', 'reggae': 'Reggae', 'country': 'Country', 'ambient': 'Ambient',
      'soundtrack': 'Soundtrack', 'ost': 'Soundtrack', 'world': 'World', 'dünya müziği': 'World',
    };
    genre = genreMap[g] || genre.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  // Pressing normalization
  if (pressing) {
    const p = pressing.toLowerCase().trim();
    if (/first\s*press|original\s*press|ilk\s*basım|ilk\s*basim/.test(p)) pressing = 'First Press';
    else if (/reissue|re-issue|yeniden\s*basım|yeniden\s*basim/.test(p)) pressing = 'Reissue';
    else if (/remaster|remastered|remaster edilmiş/.test(p)) pressing = 'Remaster';
    else if (/promo|promotional|promosyon/.test(p)) pressing = 'Promo';
    else if (/test\s*press|test\s*pressing|deneme\s*basım/.test(p)) pressing = 'Test Pressing';
    else if (/limited|sınırlı|limited\s*edition/.test(p)) pressing = 'Limited Edition';
    else if (/deluxe|özel\s*seri/.test(p)) pressing = 'Deluxe Edition';
    else pressing = pressing.charAt(0).toUpperCase() + pressing.slice(1).toLowerCase();
  }

  // Condition normalization
  if (condition) {
    const c = condition.toLowerCase().trim();
    const condMap = {
      'mint': 'Mint (M)', 'm': 'Mint (M)',
      'near mint': 'Near Mint (NM)', 'nm': 'Near Mint (NM)',
      'very good+': 'Very Good+ (VG+)', 'vg+': 'Very Good+ (VG+)',
      'very good': 'Very Good (VG)', 'vg': 'Very Good (VG)',
      'good+': 'Good+ (G+)', 'g+': 'Good+ (G+)',
      'good': 'Good (G)', 'g': 'Good (G)',
      'fair': 'Fair (F)', 'f': 'Fair (F)',
      'poor': 'Poor (P)', 'p': 'Poor (P)',
    };
    condition = condMap[c] || condition.charAt(0).toUpperCase() + condition.slice(1);
  }

  artist = artist.replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '').replace(/KOLEKSİYON(U)?/gi, '').trim();
  album = album.replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '').replace(/KOLEKSİYON(U)?/gi, '').trim();

  return { title, subtitle, image, code, artist, album, plakSirketi, katalogNo, year, format, country, genre, pressing, matrixNo, condition };
}

// ─── LEGOVERSE METADATA EXTRACTION ──────────────────────────────────────────

function extractLegoverseInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', setNo: '', setName: '', theme: '', subTheme: '', pieceCount: '', minifigCount: '', year: '', rarity: '', condition: '', setStatus: '', rrp: '', estValue: '', rareMinifigs: '', rarePieces: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  let title = '', subtitle = '', image = '', code = '';
  let setNo = '', setName = '', theme = '', subTheme = '', pieceCount = '', minifigCount = '';
  let year = '', rarity = '', condition = '', setStatus = '', rrp = '', estValue = '';
  let rareMinifigs = '', rarePieces = '';

  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();

  const imgMatch = cleanHtml.match(/<img[^>]+src="(data:image\/[^"]+)"/i)
    || cleanHtml.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  const tableData = extractTableData(html);

  // ── .field divs ──
  const fieldPattern = /<div\s+class="field"[^>]*>\s*<label[^>]*>([\s\S]*?)<\/label>\s*<div\s+class="val"[^>]*>([\s\S]*?)<\/div>/gi;
  let fieldMatch;
  while ((fieldMatch = fieldPattern.exec(cleanHtml)) !== null) {
    const key = fieldMatch[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const value = fieldMatch[2].replace(/<[^>]+>/g, '').trim();
    if (key && value && !tableData[key]) tableData[key] = value;
  }

  // ── .set-no ──
  const setNoMatch = cleanHtml.match(/<div\s+class="set-no"[^>]*>([\s\S]*?)<\/div>/i);
  if (setNoMatch) {
    const snText = setNoMatch[1].replace(/<[^>]+>/g, '').trim();
    const snMatch = snText.match(/(\d{4,6})/);
    if (snMatch && !tableData['lego set no']) tableData['lego set no'] = snMatch[1];
    if (!tableData['tema / theme']) {
      const themeMatch = snText.match(/LEGO®?\s*(.+?)(?:\s*\d{4,6})?$/);
      if (themeMatch) tableData['tema / theme'] = themeMatch[1].trim();
    }
  }

  // ── .rarity ──
  const rarityMatch = cleanHtml.match(/<div\s+class="rarity"[^>]*>([\s\S]*?)<\/div>/i);
  if (rarityMatch && !tableData['nadirlik derecesi']) {
    tableData['nadirlik derecesi'] = rarityMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // ── .coll-num ──
  const collNumMatch = cleanHtml.match(/<div\s+class="(coll-num|collection-number|col-num)"[^>]*>([\s\S]*?)<\/div>/i);
  if (collNumMatch) code = collNumMatch[2].replace(/<[^>]+>/g, '').trim();

  const findKey = (...keys) => findTableValue(tableData, ...keys);

  setNo = findKey('lego set no', 'set no', 'set numarası', 'set number');
  setName = findKey('set adı', 'set name', 'set adi');
  theme = findKey('tema / theme', 'tema', 'theme');
  subTheme = findKey('alt tema / subtheme', 'alt tema', 'subtheme');
  pieceCount = findKey('parça sayısı', 'parça', 'pieces', 'piece count');
  minifigCount = findKey('minifigür sayısı', 'minifigür', 'minifigure', 'minifigures');
  year = findKey('çıkış yılı', 'yıl', 'year', 'tarih', 'release year');
  rarity = findKey('nadirlik derecesi', 'nadirlik', 'rarity');
  condition = findKey('set durumu', 'tamlık oranı', 'durum', 'condition');
  setStatus = findKey('ürün durumu', 'üretim durumu', 'set durumu');
  rrp = findKey('rrp', 'orijinal fiyat', 'rrp (orijinal)');
  estValue = findKey('tahmini değer', 'güncel tahmini değer', 'güncel tahmini değer (yeni/kapalı)');
  rareMinifigs = findKey('özel / nadir minifigürler', 'özel minifigürler', 'nadir minifigürler');
  rarePieces = findKey('özel / nadir parçalar', 'özel parçalar', 'nadir parçalar');

  if (!year) {
    const yearMatch = cleanHtml.replace(/<[^>]+>/g, ' ').match(/\b((?:19|20)\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
  }

  if (!setName && title) setName = title;
  if (!code) code = setNo;

  return { title, subtitle, image, code, setNo, setName, theme, subTheme, pieceCount, minifigCount, year, rarity, condition, setStatus, rrp, estValue, rareMinifigs, rarePieces };
}

// ─── BASILSANAT METADATA EXTRACTION ─────────────────────────────────────────

function extractBasilsanatInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', yazar: '', yayinevi: '', dil: '', tur: '', year: '', basimYili: '', basimYeri: '', durum: '', ozet: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  let title = '', subtitle = '', image = '', code = '';
  let yazar = '', yayinevi = '', dil = '', tur = '', year = '', basimYili = '', basimYeri = '', durum = '', ozet = '';

  // ── CODE ──
  const codeMatch = cleanHtml.match(/<div\s+class="(col-num|coll-num|kod|badge--code)"[^>]*>([\s\S]*?)<\/div>/i);
  if (codeMatch) code = codeMatch[2].replace(/<[^>]+>/g, '').trim();

  // ── TITLE ──
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1].replace(/<[^>]+>/g, '').trim()) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  } else {
    const mainTitleMatch = cleanHtml.match(/<div\s+class="(main-title|title)"[^>]*>([\s\S]*?)<\/div>/i);
    if (mainTitleMatch && mainTitleMatch[2].replace(/<[^>]+>/g, '').trim()) {
      title = mainTitleMatch[2].replace(/<[^>]+>/g, '').trim();
    }
  }

  // ── SUBTITLE ──
  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  // ── IMAGE ──
  const heroImgMatch = cleanHtml.match(/<div\s+class="hero"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
  if (heroImgMatch) image = heroImgMatch[1];
  if (!image) {
    const imgMatch = cleanHtml.match(/<img[^>]+src="(data:image\/[^"]+)"/i)
      || cleanHtml.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) image = imgMatch[1];
  }

  // ── CATEGORY BADGE ──
  const badgeMatch = cleanHtml.match(/<div\s+class="(category-badge|cat-badge)"[^>]*>([\s\S]*?)<\/div>/i);
  if (badgeMatch) tur = badgeMatch[2].replace(/<[^>]+>/g, '').trim();

  // ── TABLE DATA ──
  const tableData = extractTableData(html);
  const findKey = (...keys) => findTableValue(tableData, ...keys);

  if (!title) title = findKey('başlık', 'baslik', 'title', 'eser adı', 'kitap adı');
  if (!tur) tur = findKey('tür', 'tur', 'kategori', 'category', 'type');
  yazar = findKey('yazar / çizer', 'yazar / cizer', 'yazar', 'author', 'çizer', 'cizer');
  yayinevi = findKey('yayıncı', 'yayinevi', 'yayın evi', 'publisher', 'yayinci');
  dil = findKey('dil', 'language');
  basimYili = findKey('basım yılı', 'basim yili', 'yıl', 'yil', 'year');
  basimYeri = findKey('basım yeri', 'basim yeri', 'yer', 'place');
  durum = findKey('genel durum', 'durum', 'condition');
  if (!code) code = findKey('koleksiyon no', 'katalog no', 'kod');

  // Fallback title from <title> tag
  if (!title) {
    const titleTagMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      const rawTitle = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
      const parts = rawTitle.split(/[—\-|]/);
      if (parts.length > 1) title = parts[1].trim();
      else title = rawTitle;
    }
  }

  // ── YEAR ──
  if (basimYili) {
    const yearMatch = basimYili.match(/\b((?:18|19|20)\d{2})\b/);
    year = yearMatch ? yearMatch[1] : basimYili;
  } else {
    const yearMatch = cleanHtml.replace(/<[^>]+>/g, ' ').match(/\b((?:18|19|20)\d{2})\b/);
    year = yearMatch ? yearMatch[1] : '';
    basimYili = year;
  }

  // ── ÖZET ──
  const noteMatch = cleanHtml.match(/<div\s+class="note"[^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/div>/i);
  if (noteMatch) ozet = noteMatch[1].replace(/<[^>]+>/g, '').trim();
  if (!ozet) {
    const pMatch = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const pText = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (pText.length > 20) ozet = pText.substring(0, 300);
    }
  }

  return { title, subtitle, image, code, yazar, yayinevi, dil, tur, year, basimYili, basimYeri, durum, ozet };
}

// ─── İSKAMBİL METADATA EXTRACTION ──────────────────────────────────────────

function extractIskambilInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', marka: '', deste: '', basimYili: '', ulke: '', durum: '', kartSayisi: '', boyut: '', indeks: '', ozet: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  let title = '', subtitle = '', image = '', code = '';
  let marka = '', deste = '', basimYili = '', ulke = '', durum = '', kartSayisi = '', boyut = '', indeks = '', ozet = '';

  // ── CODE ──
  const codeMatch = cleanHtml.match(/<div\s+class="(coll-num|col-num|kod)"[^>]*>([\s\S]*?)<\/div>/i);
  if (codeMatch) code = codeMatch[2].replace(/<[^>]+>/g, '').trim();

  // ── TITLE ──
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  if (!title) {
    const titleTagMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) title = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // ── SUBTITLE ──
  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  // ── IMAGE ──
  const heroImgMatch = cleanHtml.match(/<div\s+class="hero"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
  if (heroImgMatch) image = heroImgMatch[1];
  if (!image) {
    const imgMatch = cleanHtml.match(/<img[^>]+src="(data:image\/[^"]+)"/i)
      || cleanHtml.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) image = imgMatch[1];
  }

  // ── TABLE DATA (with homoglyph normalization) ──
  const rawRows = cleanHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const tableData = {};
  for (const rawRow of rawRows) {
    const thM = rawRow.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const tdM = rawRow.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (thM && tdM) {
      const k = normalizeTableKey(thM[1].replace(/<[^>]+>/g, ''));
      const v = tdM[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (k && v) tableData[k] = v;
    } else {
      const tdAll = rawRow.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (tdAll.length >= 2) {
        const k = normalizeTableKey(tdAll[0].replace(/<[^>]+>/g, ''));
        const v = tdAll[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (k && v) tableData[k] = v;
      }
    }
  }

  const findKey = (...keys) => findTableValue(tableData, ...keys);

  // ── MARKA ──
  marka = findKey('marka uretici', 'marka yetici', 'marka', 'manufacturer', 'brand');
  if (marka) {
    marka = marka.split('·')[0].trim();
  } else {
    const textAll = cleanHtml.toLowerCase();
    if (textAll.includes('bicycle')) marka = 'Bicycle';
    else if (textAll.includes('berliner spielkarten')) marka = 'Berliner Spielkarten';
  }

  // ── DESTE ──
  deste = findKey('deste pattern', 'pattern', 'deste', 'deck');
  if (deste) {
    if (/rider back/i.test(deste)) deste = 'Rider Back';
    else if (/skat rekord/i.test(deste)) deste = 'SKAT Rekord';
    else deste = deste.split('·')[0].trim();
  } else {
    const textAll = cleanHtml.toLowerCase();
    if (textAll.includes('rider back')) deste = 'Rider Back';
    else if (textAll.includes('skat rekord')) deste = 'SKAT Rekord';
  }

  // ── DURUM ──
  const desteDurumu = findKey('deste durumu');
  const kartDurumu = findKey('kart durumu');
  const genelDurum = findKey('genel durum', 'durum', 'condition');

  if (/kapali|kapalı|mühürlü/i.test(desteDurumu) || /kapali|kapalı|mühürlü/i.test(genelDurum)) {
    durum = 'Kapalı';
  } else if (/acil|açıl/i.test(desteDurumu) || /acil|açıl/i.test(genelDurum) || /acil|açıl/i.test(kartDurumu)) {
    durum = 'Açılmış';
  } else if (genelDurum) {
    durum = genelDurum.replace(/damgal[ıi]|damgas[ıi]z/gi, '').trim();
  } else if (desteDurumu) {
    durum = desteDurumu.split('(')[0].trim();
  } else if (kartDurumu) {
    durum = kartDurumu.split('/')[0].trim();
  }
  if (durum) {
    durum = durum.replace(/damgal[ıi]|damgas[ıi]z/gi, '').replace(/^[\s·•\-,]+|[\s·•\-,]+$/g, '').trim();
  }
  if (!durum) durum = 'Açılmış';

  // ── ÜLKE ──
  const yerRaw = findKey('uretim yeri', 'mense', 'yer', 'ulke', 'country');
  if (/almanya|germany|deutschland|darmstadt/i.test(yerRaw)) ulke = 'Almanya';
  else if (/abd|usa|united states|kentucky|erlanger/i.test(yerRaw)) ulke = 'ABD';
  else if (/avusturya|austria/i.test(yerRaw)) ulke = 'Avusturya';
  else if (/fransa|france/i.test(yerRaw)) ulke = 'Fransa';
  else if (/italya|italy/i.test(yerRaw)) ulke = 'İtalya';
  else if (/ingiltere|england|uk|britain/i.test(yerRaw)) ulke = 'Birleşik Krallık';
  else if (yerRaw) ulke = yerRaw.split('·')[0].split(',')[0].trim();

  // ── ÜRETİM YILI ──
  const yilRaw = findKey('uretim yili', 'basim yili', 'yil', 'year');
  const yMatch = (yilRaw || '').match(/\b((?:18|19|20)\d{2})\b/);
  if (yMatch) {
    basimYili = yMatch[1];
  } else if (/1970/i.test(yilRaw)) {
    basimYili = '1970';
  } else if (yilRaw) {
    basimYili = yilRaw.split('(')[0].trim();
  }

  // ── KART SAYISI, BOYUT, İNDEKS ──
  kartSayisi = findKey('kart sayisi', 'card count');
  boyut = findKey('boyut', 'size');
  indeks = findKey('i ndeks', 'indeks', 'indis', 'index');

  // ── ÖZET ──
  const noteMatch = cleanHtml.match(/<div\s+class="note"[^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/div>/i);
  if (noteMatch) ozet = noteMatch[1].replace(/<[^>]+>/g, '').trim();

  return { title, subtitle, image, code, marka, deste, basimYili, ulke, durum, kartSayisi, boyut, indeks, ozet };
}

// ─── BUILD ENTRY FOR EACH SECTION ──────────────────────────────────────────

function buildGaleriEntry(file, meta) {
  // Dosya adındaki kodu birincil olarak kullan (HTML içeriğindeki kod hatalı olabilir)
  const fileNameCode = file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const codeMatch = fileNameCode.match(/(MG\d+)/i);
  const code = (codeMatch ? codeMatch[1].toUpperCase() : fileNameCode);
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';

  // HTML dosyaları Drive'da render edilsin
  const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
  const viewLink = isHtml
    ? `https://drive.google.com/uc?export=view&id=${file.id}`
    : `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`;

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _image: meta.image || '',
    _code: code,
    _country: meta.country || 'Türkiye Cumhuriyeti',
    _year: meta.year || '',
    _nominalDeger: meta.nominalDeger || '',
    _pulTipi: meta.pulTipi || 'Posta Pulu',
    _durum: meta.durum || '',
    _katalogNo: code,
    webViewLink: viewLink,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

function buildDiecastEntry(file, meta) {
  const code = meta.code || file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _image: meta.image || '',
    _code: code,
    _country: meta.country || 'Bilinmiyor',
    _year: meta.productionYear || meta.year || '',
    _nominalDeger: '',
    _pulTipi: '',
    _durum: '',
    _katalogNo: code,
    _brand: meta.brand || '',
    _model: meta.model || '',
    _scale: meta.scale || '',
    _origin: meta.origin || '',
    _series: meta.series || '',
    _material: meta.material || '',
    _modelYear: meta.modelYear || '',
    _productionYear: meta.productionYear || '',
    webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

function buildPlakEntry(file, meta) {
  const code = meta.code || meta.katalogNo || file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _image: meta.image || '',
    _code: code,
    _country: meta.country || '',
    _year: meta.year || '',
    _nominalDeger: '',
    _pulTipi: '',
    _durum: meta.condition || '',
    _katalogNo: code,
    _artist: meta.artist || '',
    _album: meta.album || '',
    _plakSirketi: meta.plakSirketi || '',
    _format: meta.format || '',
    _genre: meta.genre || '',
    _pressing: meta.pressing || '',
    _matrixNo: meta.matrixNo || '',
    webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

function buildLegoverseEntry(file, meta) {
  const code = meta.code || meta.setNo || file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _image: meta.image || '',
    _code: code,
    _country: '',
    _year: meta.year || '',
    _nominalDeger: '',
    _pulTipi: '',
    _durum: meta.condition || '',
    _katalogNo: code,
    _setNo: meta.setNo || '',
    _setName: meta.setName || '',
    _theme: meta.theme || '',
    _subTheme: meta.subTheme || '',
    _pieceCount: meta.pieceCount || '',
    _minifigCount: meta.minifigCount || '',
    _rarity: meta.rarity || '',
    _setStatus: meta.setStatus || '',
    _condition: meta.condition || '',
    _rrp: meta.rrp || '',
    _estValue: meta.estValue || '',
    _rareMinifigs: meta.rareMinifigs || '',
    _rarePieces: meta.rarePieces || '',
    webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

function buildBasilsanatEntry(file, meta) {
  const code = meta.code || file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';
  const normalizedTur = normalizeBasilsanatTur(meta.tur);

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    category: normalizedTur,
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _image: meta.image || '',
    _code: code,
    _katalogNo: code,
    _yazar: meta.yazar || '',
    _yayinevi: meta.yayinevi || '',
    _tur: normalizedTur,
    _dil: meta.dil || '',
    _year: meta.year || '',
    _basimYili: meta.basimYili || '',
    _durum: meta.durum || '',
    _ozet: meta.ozet || '',
    webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

function buildIskambilEntry(file, meta) {
  const code = meta.code || file.name.replace(/\.(html|htm)$/i, '').toUpperCase();
  const cleanTitle = stripPatterns(meta.title) || file.name.replace('.html', '');
  const cleanSubtitle = stripPatterns(meta.subtitle) || '';

  return {
    id: file.id,
    name: file.name,
    mimeType: 'text/html',
    category: 'İskambil',
    _title: cleanTitle,
    _subtitle: cleanSubtitle,
    _code: code,
    _katalogNo: code,
    _marka: meta.marka || '',
    _deste: meta.deste || '',
    _durum: meta.durum || '',
    _ulke: meta.ulke || '',
    _country: meta.ulke || '',
    _year: meta.basimYili || '',
    _basimYili: meta.basimYili || '',
    _kartSayisi: meta.kartSayisi || '',
    _boyut: meta.boyut || '',
    _indeks: meta.indeks || '',
    _ozet: meta.ozet || '',
    _image: meta.image || '',
    webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}

// ─── SECTION REBUILD ────────────────────────────────────────────────────────

function getExtractor(section) {
  switch (section) {
    case 'galeri': return extractStampInfoFromHtml;
    case 'diecast': return extractDiecastInfoFromHtml;
    case 'plak': return extractPlakInfoFromHtml;
    case 'legoverse': return extractLegoverseInfoFromHtml;
    case 'basilsanat': return extractBasilsanatInfoFromHtml;
    case 'iskambil': return extractIskambilInfoFromHtml;
    default: return extractStampInfoFromHtml;
  }
}

function getBuilder(section) {
  switch (section) {
    case 'galeri': return buildGaleriEntry;
    case 'diecast': return buildDiecastEntry;
    case 'plak': return buildPlakEntry;
    case 'legoverse': return buildLegoverseEntry;
    case 'basilsanat': return buildBasilsanatEntry;
    case 'iskambil': return buildIskambilEntry;
    default: return buildGaleriEntry;
  }
}

async function rebuildSection(section, existingData, incremental = false) {
  const folderId = FOLDERS[section];
  if (!folderId) {
    console.error(`Unknown section: ${section}`);
    return null;
  }

  console.log(`\n═══ Rebuilding "${section}" ${incremental ? '(incremental)' : ''} ═══`);

  // 1. List all HTML files from Drive
  console.log(`1. Listing Drive files for "${section}"...`);
  const driveFiles = await listDriveFiles(folderId, section);
  console.log(`   Found ${driveFiles.length} HTML files\n`);

  if (driveFiles.length === 0) {
    console.log(`   No files found — skipping section.`);
    return existingData[section] || [];
  }

  // 2. Build map of existing entries by name for incremental mode
  const existingMap = {};
  if (incremental && existingData[section]) {
    for (const entry of existingData[section]) {
      existingMap[entry.name] = entry;
    }
  }

  // 3. Download and extract metadata for each file
  const extract = getExtractor(section);
  const build = getBuilder(section);
  const entries = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  console.log(`2. Fetching and parsing HTML files...`);
  for (let i = 0; i < driveFiles.length; i++) {
    const file = driveFiles[i];
    const progress = `(${i + 1}/${driveFiles.length})`;

    // Incremental: skip if file hasn't changed
    if (incremental && existingMap[file.name]) {
      const existing = existingMap[file.name];
      if (existing.modifiedTime && existing.modifiedTime >= file.modifiedTime) {
        entries.push(existing);
        skippedCount++;
        process.stdout.write(`   Skipping ${file.name} ${progress} (unchanged)\n`);
        continue;
      }
    }

    try {
      process.stdout.write(`   Fetching ${file.name} ${progress}...`);
      const html = await downloadFile(file.id);
      const meta = extract(html);
      const entry = build(file, meta);
      entries.push(entry);
      successCount++;
      console.log(` OK [${entry._code || 'no-code'}]`);
    } catch (err) {
      errorCount++;
      console.log(` ERROR: ${err.message}`);
      // Still add a minimal entry so the file isn't lost
      entries.push({
        id: file.id,
        name: file.name,
        mimeType: 'text/html',
        _title: file.name.replace('.html', ''),
        _code: file.name.replace('.html', '').toUpperCase(),
        webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
        modifiedTime: file.modifiedTime || new Date().toISOString(),
      });
    }

    // Rate limit
    if (i < driveFiles.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // 4. Sort entries by name
  entries.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

  const skippedMsg = skippedCount > 0 ? `, ${skippedCount} skipped (unchanged)` : '';
  console.log(`\n   Done: ${successCount} fetched, ${errorCount} errors, ${skippedMsg} ${entries.length} total entries.`);

  return entries;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const isIncremental = args.includes('--incremental');
  const sectionIdx = args.indexOf('--section');
  const specificSection = sectionIdx !== -1 ? args[sectionIdx + 1] : null;

  let sectionsToRebuild;
  if (specificSection) {
    if (!FOLDERS[specificSection]) {
      console.error(`Unknown section: "${specificSection}". Valid: ${ALL_SECTIONS.join(', ')}`);
      process.exit(1);
    }
    sectionsToRebuild = [specificSection];
  } else if (isAll) {
    sectionsToRebuild = ALL_SECTIONS;
  } else {
    sectionsToRebuild = ['galeri'];
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   PULLUK Collection Data Rebuilder       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Sections to rebuild: ${sectionsToRebuild.join(', ')}`);
  if (isIncremental) console.log(`Mode: incremental (only changed files)`);
  console.log('');

  // 1. Read existing data to preserve non-rebuilt sections
  let data = {};
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    const eqIdx = content.indexOf('=');
    let jsonStr = content.substring(eqIdx + 1);
    while (jsonStr.length > 0 && '; \r\n'.includes(jsonStr[jsonStr.length - 1])) {
      jsonStr = jsonStr.substring(0, jsonStr.length - 1);
    }
    data = JSON.parse(jsonStr);
    console.log(`Existing data loaded: ${Object.keys(data).map(k => `${k}(${(data[k] || []).length})`).join(', ')}`);
  } catch (err) {
    console.log('No existing data found or parse error — starting fresh.');
    // Initialize all sections as empty
    for (const s of ALL_SECTIONS) data[s] = [];
  }

  // 2. Rebuild each section
  for (const section of sectionsToRebuild) {
    const entries = await rebuildSection(section, data, isIncremental);
    if (entries) {
      data[section] = entries;
    }
  }

  // 3. Ensure all sections exist
  for (const s of ALL_SECTIONS) {
    if (!data[s]) data[s] = [];
  }

  // 4. Write output
  console.log('\n═══ Writing collection_data.js ═══');
  const prefix = '/* PULLUK Precompiled Collection Data */\nwindow.PULLUK_COLLECTION_DATA =';
  const jsonStr = JSON.stringify(data);
  const newContent = prefix + jsonStr + ';\n';

  // Check if content actually changed
  let oldContent = '';
  try { oldContent = fs.readFileSync(DATA_FILE, 'utf8'); } catch (_) {}
  const hasChanges = oldContent !== newContent;

  fs.writeFileSync(DATA_FILE, newContent, 'utf8');

  const totalEntries = Object.values(data).reduce((sum, arr) => sum + (arr || []).length, 0);
  console.log(`   Written ${totalEntries} total entries across ${Object.keys(data).length} sections.`);
  console.log(`   Sections: ${Object.keys(data).map(k => `${k}(${(data[k] || []).length})`).join(', ')}`);

  if (hasChanges) {
    console.log('\nChanges detected. Commit and push to deploy.\n');
  } else {
    console.log('\nNo changes detected. Data is up to date.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
