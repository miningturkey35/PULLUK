/* =============================================
   SEYR-İ DEVRAN — app.js
   Google Drive API integration, theme, search,
   filtering, scroll reveal, mobile menu
   ============================================= */

'use strict';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  FOLDERS: {
    'galeri': '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8', // Pul Arşivi
    'diecast': '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg', // Diecast Koleksiyonu (Klasör ID'si eklenecek)
    'plak': '13FPeN7gTD3SjbUB6ENIfaJ4OVa6rYqd0', // Plak Arşivi (Klasör ID'si eklenecek)
    'banknot': '1ffJ9xKTsrKpaM3OcJ0fRU4ggcRRmKBdL', // Banknot Koleksiyonu
    'allother': '1mmPvVEreFr0cbXjX3Ds21FOsZI9cRaH0', // Daha Ne Varsa (ALLOTHER)
    'preview': '1cyZ7qFqvoTA39E0jWSK2LuueK7l0Da-W' // Önizleme görselleri
  },

  // Paste your Google Cloud API Key here to enable live Drive integration.
  GOOGLE_API_KEY: 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs',

  PAGE_SIZE: 9,
};

// ─── STAMP COUNTRIES ────────────────────────────────────────────────────────
const STAMP_COUNTRIES = [
  { name: 'Osmanlı İmp.', keywords: ['osmanlı', 'ottoman', 'imp.', 'imparatorlugu', 'imparatorluğu'] },
  { name: 'Türkiye Cumhuriyeti', keywords: ['türkiye cumhuriyeti', 'turkiye cumhuriyeti', 'tc ', 't.c.', 'cumhuriyet'] },
  { name: 'Birleşik Krallık', keywords: ['birleşik krallık', 'birlesik krallik', 'united kingdom', 'uk ', 'great britain', 'ingiltere', 'england'] },
  { name: 'Almanya', keywords: ['almanya', 'germany', 'deutschland', 'bundespost', 'ddr'] },
  { name: 'ABD', keywords: ['abd', 'usa', 'united states', 'amerika'] },
  { name: 'Fransa', keywords: ['fransa', 'france', 'francais'] },
  { name: 'İtalya', keywords: ['italya', 'italy', 'italia'] },
  { name: 'Rusya', keywords: ['rusya', 'russia', 'cccp', 'sssr', 'soviet'] },
  { name: 'Japonya', keywords: ['japonya', 'japan', 'nihon'] },
  { name: 'Çin', keywords: ['çin', 'chin', 'china'] },
];

const STAMP_COUNTRY_ABBREVS = {
  'Osmanlı İmp.': 'OSMANLI',
  'Türkiye Cumhuriyeti': 'T.C.',
  'Birleşik Krallık': 'UK',
  'Almanya': 'ALMANYA',
  'ABD': 'ABD',
  'Fransa': 'FRANSA',
  'İtalya': 'İTALYA',
  'Rusya': 'RUSYA',
  'Japonya': 'JAPONYA',
  'Çin': 'ÇİN',
};

function buildStampCodeBadge(code, country, year) {
  // If country or year missing, try to extract from code pattern
  // e.g. "MG0001 OSMANLI-1900" or "MG0016 T.C.-1926" or just "MG0001"
  let c = country || '';
  let y = year || '';

  if (code && (!c || !y)) {
    // Try to extract from code: "MG0001 OSMANLI-1900"
    const codeParts = code.trim().split(/\s+/);
    // Check last part for COUNTRY-YEAR pattern
    const lastPart = codeParts[codeParts.length - 1] || '';
    const cyMatch = lastPart.match(/^(.+)-(\d{4})$/);
    if (cyMatch) {
      if (!c) c = cyMatch[1];
      if (!y) y = cyMatch[2];
    }
    // Also check second-to-last part
    if (codeParts.length >= 3) {
      const secondLast = codeParts[codeParts.length - 2] || '';
      const slMatch = secondLast.match(/^(.+)-(\d{4})$/);
      if (slMatch) {
        if (!c) c = slMatch[1];
        if (!y) y = slMatch[2];
      }
    }
  }

  // If still no country, try to extract from code text
  if (code && !c) {
    const codeText = code.toUpperCase();
    if (/\bOSMANLI\b/.test(codeText)) c = 'OSMANLI';
    else if (/\bT\.C\.\b/.test(codeText) || /\bTC\b/.test(codeText)) c = 'T.C.';
    else if (/\bUK\b/.test(codeText)) c = 'UK';
  }

  // If still no year, try to extract 4-digit year from code
  if (code && !y) {
    const yearMatch = code.match(/\b((?:18|19|20)\d{2})\b/);
    if (yearMatch) y = yearMatch[1];
  }

  const parts = [];
  // Code part (without the country-year suffix if we extracted it)
  let codeOnly = code || '';
  if (c || y) {
    // Remove trailing COUNTRY-YEAR or COUNTRY from code
    codeOnly = codeOnly.replace(/\s+\S*-\d{4}\s*$/, '').replace(/\s+$/, '');
  }
  if (codeOnly) parts.push(codeOnly.trim());

  // Normalize country to abbrev (fuzzy: Osmanlı İmparatorluğu → OSMANLI, Türkiye Cumhuriyeti → T.C.)
  let abbrev = '';
  if (c) {
    const norm = c.trim();
    // direct mapping first
    if (STAMP_COUNTRY_ABBREVS[norm]) abbrev = STAMP_COUNTRY_ABBREVS[norm];
    else {
      const found = extractCountryFromText(norm);
      if (found && STAMP_COUNTRY_ABBREVS[found]) abbrev = STAMP_COUNTRY_ABBREVS[found];
      else {
        const up = norm.toLocaleUpperCase('tr');
        if (up.includes('OSMANLI')) abbrev = 'OSMANLI';
        else if (up.includes('TÜRKİYE') || up === 'T.C.' || up === 'TC' || up.includes('T.C')) abbrev = 'T.C.';
        else if (up.includes('UK') || up.includes('BİRLEŞİK')) abbrev = 'UK';
        else abbrev = up;
      }
    }
  }
  const yr = y || '';
  if (abbrev && yr) parts.push(`${abbrev}-${yr}`);
  else if (abbrev) parts.push(abbrev);
  else if (yr) parts.push(yr);
  return parts.join(' ');
}

function extractCountryFromText(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  // Check more specific terms first to avoid false matches
  for (const c of STAMP_COUNTRIES) {
    for (const kw of c.keywords) {
      // Use word-boundary matching to avoid false positives like 'uk ' matching inside 'çocuk '
      const kwEscaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const kwRegex = new RegExp('\\b' + kwEscaped, 'i');
      if (kwRegex.test(lower)) return c.name;
    }
  }
  // Additional fallback patterns
  if (/\bt\.c\.\b|\btürkiye cumhuriyeti\b|\bturkiye cumhuriyeti\b/.test(lower)) return 'Türkiye Cumhuriyeti';
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

// Normalize country names to short form for card display
function normalizeCountryName(name) {
  if (!name) return '';
  const n = name.trim();
  // Direct mapping
  const map = {
    'Osmanlı İmparatorluğu': 'Osmanlı İmp.',
    'Osmanlı İmp.': 'Osmanlı İmp.',
    'Türkiye Cumhuriyeti': 'T.C.',
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
  // Fuzzy: check if it contains a known country name
  for (const [full, short] of Object.entries(map)) {
    if (n.includes(full) || n.toLowerCase().includes(full.toLowerCase())) return short;
  }
  return n;
}
// Turkish-safe uppercase: i→I, ı→I, ğ→Ğ, ü→Ü, ş→Ş, ö→Ö, ç→Ç
function toEnUpper(str) {
  if (!str) return '';
  return String(str).replace(/i/g, 'I').replace(/ğ/g, 'Ğ').replace(/ü/g, 'Ü').replace(/ş/g, 'Ş').replace(/ö/g, 'Ö').replace(/ç/g, 'Ç').replace(/ı/g, 'I').toUpperCase();
}

// Extract year from any field value or text
function extractYearFromText(text) {
  if (!text) return '';
  const match = String(text).match(/\b(18|19|20)\d{2}\b/);
  return match ? match[0] : '';
}

const DIECAST_BRANDS = [
  'MATCHBOX', 'HOT WHEELS', 'CORGI', 'DINKY', 'MAJORETTE', 'SIKU', 'BURAGO', 'MAISTO',
  'WELLY', 'JADA', 'GREENLIGHT', 'AUTOART', 'KYOSHO', 'MINICHAMPS', 'SPARK', 'IXO',
  'NOREV', 'SOLIDO', 'VANGUARDS', 'OXFORD', 'RAISE3D', 'SCHUCO', 'TOMY', 'TOMICA',
  'MAJOR', 'PLAYART', 'HUSKY', 'EFE', 'GAMA', 'MARKLIN', 'WIKING', 'HERPA',
  'BREKINA', 'ROCO', 'LIMA', 'FLEISCHMANN', 'PIKO', 'ARNOLD', 'RIVAROSSI',
  'ATHEARN', 'KATO', 'BACHMANN', 'WALTHERS', 'INTERMOUNTAIN', 'SCALE TRAINS', 'RAPIDO',
  'REMCO', 'GÖZGÖZ', 'MATCHBOX SUPER KINGS', 'POLISTIL', 'WSI', 'NZG', 'HERO', 'BBR',
  'CMR', 'GT SPIRIT', 'LOOK SMART', 'TRUE SCALE', 'TSM', 'IGUANAMODEL', 'GREAT WALL',
  'LCD', 'HPI', 'CIRCLE G', 'JONTOY', 'ERTL', 'AMT', 'MONOGRAM', 'REVELL', 'TESTORS'
];

const DIECAST_BRAND_ALIASES = {
  'LESNEY': 'MATCHBOX',
  'LESNEY PRODUCTS': 'MATCHBOX',
  'MATCHBOX SUPER KINGS': 'MATCHBOX',
  'GOZGOZ': 'GÖZGÖZ'
};

function resolveDiecastBrand(rawText) {
  if (!rawText) return '';
  const upper = toEnUpper(rawText).trim();
  for (const b of DIECAST_BRANDS) {
    if (upper.includes(b)) return DIECAST_BRAND_ALIASES[b] || b;
  }
  const clean = rawText.split('(')[0].replace(/[-–—]/g, ' ').trim();
  return clean ? toEnUpper(clean) : '';
}

// ─── EXTRACT DIECAST DATA FROM HTML TABLE ────────────────────────────────────
function extractDiecastDataFromHtml(html) {
  if (!html) return {};
  const data = {};
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return data;
  for (const row of rows) {
    const thMatch = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
    const tdMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    let key = '', val = '';
    if (thMatch && tdMatch && tdMatch.length >= 1) {
      key = thMatch[0].replace(/<[^>]+>/g, '').trim();
      val = tdMatch[0].replace(/<[^>]+>/g, '').trim();
    } else if (tdMatch && tdMatch.length >= 2) {
      key = tdMatch[0].replace(/<[^>]+>/g, '').trim();
      val = tdMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    if (key && val) data[key] = val;
  }
  return data;
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
    'SCHUCO': '1:64', 'TOMY': '1:64', 'TOMICA': '1:64', 'REMCO': '1:64', 'GÖZGÖZ': '1:64'
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
    'WELLY': 'Diecast Metal', 'JADA': 'Diecast Metal', 'GREENLIGHT': 'Diecast Metal', 'REMCO': 'Diecast Metal', 'GÖZGÖZ': 'Diecast Metal'
  };
  return brandMaterials[brand] || 'Diecast Metal';
}

function parseDiecastInfo(file, html) {
  const tableData = html ? extractDiecastDataFromHtml(html) : (file?._htmlContent ? extractDiecastDataFromHtml(file._htmlContent) : {});

  // 1. Code
  const codeMatch = html ? html.match(/class="kod"[^>]*>([\s\S]*?)<\//i) : null;
  let code = (codeMatch ? codeMatch[1].replace(/<[^>]+>/g, '').trim() : '') ||
             tableData['Katalog Kodu'] || tableData['Katalog No'] ||
             file?._code || '';
  if (!code && file?.name) {
    const fnm = file.name.match(/^(MG[A-Z0-9]+)/i);
    if (fnm) code = fnm[1].toUpperCase();
  }

  // 2. Brand
  const rawBrand = tableData['Marka / Üretici'] || tableData['Marka / Seri'] || tableData['Marka'] || tableData['Üretici'] || file?._brand || '';
  let brand = resolveDiecastBrand(rawBrand);
  if (!brand) {
    const searchTexts = [file?._title || '', file?.name || '', file?.description || ''].join(' ');
    for (const b of DIECAST_BRANDS) {
      if (new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i').test(searchTexts)) {
        brand = b;
        break;
      }
    }
  }
  if (!brand) brand = 'DIE-CAST';

  // 3. Model
  let model = tableData['Araç'] || tableData['Model'] || tableData['Model / Casting'] || tableData['Model Adı'] || tableData['Model Kodu'] || file?._model || '';
  if (!model && file) {
    model = file._title || file.name.replace(/\.(html|htm|pdf|jpg|jpeg|png)$/i, '');
  }
  model = (model || '')
    .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK/gi, '')
    .replace(/KOLEKSİYON(U)?/gi, '')
    .replace(/^[-–—|\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!model) model = 'Diecast Model';

  // 4. Scale
  let scale = tableData['Ölçek (yaklaşık)'] || tableData['Ölçek'] || tableData['Scale'] || file?._scale || '';
  if (!scale) {
    const sm = (html || file?.name || '').match(/\b1:\d+\b/);
    if (sm) scale = sm[0];
    else scale = detectScale(brand, model) || '1:64';
  }

  // 5a. Production Year (oyuncak üretim yılı)
  let productionYear = tableData['Üretim Yılı'] || tableData['Dönem'] || tableData['Üretim Yılı (yaklaşık)'] || tableData['Yıl'] || file?._productionYear || file?._year || '';
  if (productionYear && productionYear.length > 25) {
    const ym = productionYear.match(/\b(19|20)\d{2}\b/);
    if (ym) productionYear = ym[0];
  }
  if (!productionYear) {
    const searchTexts = [file?._title || '', file?.name || '', file?.description || ''].join(' ');
    productionYear = extractYearFromText(searchTexts);
  }

  // 5b. Model Year (araç model yılı — model adından çıkarılır)
  let modelYear = '';
  // Try from model name: e.g. "1957 Ford Custom 300" → 1957
  const modelYearMatch = model.match(/^\b((?:18|19|20)\d{2})\b/);
  if (modelYearMatch) {
    modelYear = modelYearMatch[1];
  } else {
    // Also try: "Ford Mustang 1965" or "BMW M1 (1978-1981)"
    const modelYearFallback = model.match(/\b((?:18|19|20)\d{2})\b/);
    if (modelYearFallback) modelYear = modelYearFallback[1];
  }
  // Fallback: try table data fields for model year
  if (!modelYear) {
    modelYear = tableData['Model Yılı'] || tableData['Araç Yılı'] || file?._modelYear || '';
    if (modelYear && modelYear.length > 10) {
      const ym = modelYear.match(/\b(19|20)\d{2}\b/);
      if (ym) modelYear = ym[0];
    }
  }

  // Use productionYear as the main 'year' for backward compat
  const year = productionYear;

  // 6. Origin
  let origin = tableData['Menşei'] || tableData['Üretim Yeri'] || tableData['Ülke'] || file?._origin || '';
  origin = origin.replace(/Made in\s*/i, '').replace(/İngiltere\s*\((.*?)\)/i, 'İngiltere').trim();
  if (!origin) {
    const originMatch = (file?.name || '').match(/\b(İngiltere|China|Çin|Thailand|Tayland|Hong Kong|Germany|Almanya|France|Fransa|Italy|İtalya|USA|ABD)\b/i);
    if (originMatch) origin = originMatch[0];
  }

  // 7. Series
  let series = tableData['Seri / Numara'] || tableData['Seri'] || tableData['Model No.'] || tableData['Model Kodu'] || tableData['Seri / Tip'] || file?._series || '';
  if (series.length > 35) series = series.substring(0, 35) + '…';

  // 8. Material
  let material = tableData['Malzeme'] || tableData['Material'] || tableData['Gövde'] || tableData['Govde'] || file?._material || '';
  if (!material) {
    material = detectMaterial(brand, model) || 'Diecast Metal';
  } else if (/metal|die-cast|diecast/i.test(material)) {
    material = 'Diecast Metal';
  }

  return { code, brand, model, scale, year, origin, series, material, modelYear, productionYear };
}

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
function generateMockFiles(type) {
  const categories = type === 'galeri'
    ? ['Türkiye', 'Avrupa', 'Asya', 'Amerika', 'Afrika', 'Nadir', 'Tematik']
    : type === 'diecast' ? ['Klasik', 'Spor', 'Off-Road', 'Kamyon']
      : type === 'allother' ? ['Antika', 'Madeni Para', 'Kartpostal', 'Kitap', 'Çeşitli']
        : type === 'plak' ? ['Rock', 'Pop', 'Jazz', 'Blues', 'Klasik', 'Türkçe', 'Elektronik', 'Hip Hop', 'Folk', 'Metal']
          : ['33lük', '45lik', 'Yerli', 'Yabancı', 'Jazz', 'Rock'];

  const themes = ['Doğa', 'Mimari', 'Spor', 'Sanat', 'Ulaşım', 'Tarih', 'Flora', 'Fauna'];
  const diecastModels = [
    'BMW M1', 'Porsche 911', 'Ferrari F40', 'Lamborghini Countach', 'Ford Mustang',
    'Chevrolet Camaro', 'Dodge Charger', 'Volkswagen Beetle', 'Mini Cooper', 'Mercedes 300SL',
    'Toyota 2000GT', 'Nissan Skyline', 'Mazda RX-7', 'Honda NSX', 'Subaru Impreza',
    'Land Rover Defender', 'Jeep Wrangler', 'Ford Bronco', 'Toyota Land Cruiser', 'Mercedes G-Wagen',
    'Volvo 240', 'Saab 900', 'Peugeot 205', 'Renault 5', 'Citroen DS',
    'Alfa Romeo Spider', 'Fiat 500', 'Lancia Delta', 'Audi Quattro', 'BMW M3'
  ];
  const plakArtists = [
    'Barış Manço', 'Cem Karaca', 'Erkin Koray', 'Moğollar', '3 Hürel', 'Selda Bağcan',
    'Fikret Kızılok', 'Bülent Ortaçgil', 'Sezen Aksu', 'Ajda Pekkan', 'MFÖ',
    'Pink Floyd', 'Led Zeppelin', 'The Beatles', 'Queen', 'David Bowie',
    'Miles Davis', 'John Coltrane', 'Bill Evans', 'Keith Jarrett',
    'Deep Purple', 'Black Sabbath', 'AC/DC', 'Metallica', 'Iron Maiden'
  ];
  const plakAlbums = [
    '2023', 'Yeni Bir Gün', 'Koleksiyon', 'En İyileri', 'Live', 'Best Of',
    'Greatest Hits', 'Anthology', 'Remastered', 'Deluxe Edition',
    'First Press', 'Original Recording', 'Studio Album', 'Live Concert'
  ];
  const plakLabels = [
    'Kervan Plak', 'Yonca Plak', 'Odeon', 'Philips Records', 'Polydor', 'CBS Records',
    'RCA Victor', 'Atlantic Records', 'EMI', 'Decca Records', 'Capitol Records',
    'Verve Records', 'Blue Note', 'Impulse!', 'Columbia Records', 'Warner Bros.',
    'Elektra Records', 'A&M Records', 'Island Records', 'Virgin Records'
  ];
  const plakFormats = ['LP (12", 33 RPM)', 'EP (7", 45 RPM)', 'Single (7", 45 RPM)', '12" Single', '10" LP', 'Box Set', 'Picture Disc', 'Colored Vinyl'];
  const plakGenres = ['Rock', 'Pop', 'Jazz', 'Blues', 'Klasik', 'Anadolu Pop', 'Psikodelik', 'Funk', 'Soul', 'Disco', 'New Wave', 'Punk', 'Metal', 'Folk', 'Electronic', 'Hip Hop'];
  const files = [];

  for (let i = 1; i <= 60; i++) {
    const cat = categories[i % categories.length];
    const theme = themes[i % themes.length];
    const year = 1950 + Math.floor(Math.random() * 73);

    if (type === 'diecast') {
      const brand = DIECAST_BRANDS[i % DIECAST_BRANDS.length];
      const model = diecastModels[i % diecastModels.length];
      files.push({
        id: `mock_${type}_${i}`,
        name: `${brand} ${model} ${year}`,
        category: cat,
        webViewLink: `https://drive.google.com/drive/folders/${CONFIG.FOLDERS[type] || ''}`,
        isMock: true,
        _scale: ['1:64', '1:43', '1:18', '1:24'][i % 4],
        _material: ['Metal', 'Metal + Plastic', 'Resin', 'Diecast'][i % 4],
      });
    } else if (type === 'plak') {
      const artist = plakArtists[i % plakArtists.length];
      const album = plakAlbums[i % plakAlbums.length];
      const label = plakLabels[i % plakLabels.length];
      const format = plakFormats[i % plakFormats.length];
      const genre = plakGenres[i % plakGenres.length];
      const mockKatalogNo = `${['KAT', 'CAT', 'LBL', 'REC'][i % 4]}${String(1000 + i * 7).padStart(5, '0')}`;
      files.push({
        id: `mock_${type}_${i}`,
        name: `${artist} - ${album} (${year}).pdf`,
        category: cat,
        webViewLink: `https://drive.google.com/drive/folders/${CONFIG.FOLDERS[type] || ''}`,
        isMock: true,
        _code: mockKatalogNo,
        _katalogNo: mockKatalogNo,
        _ulke: cat === 'Yerli' ? 'Türkiye' : cat === 'Yabancı' ? 'ABD' : 'UK',
        _country: cat === 'Yerli' ? 'Türkiye' : cat === 'Yabancı' ? 'ABD' : 'UK',
        _year: String(year),
        _basimYili: String(year),
        _basimYeri: ['İstanbul', 'Ankara', 'İzmir', 'London', 'New York', 'Los Angeles', 'Berlin', 'Paris'][i % 8],
        _artist: artist,
        _album: album,
        _plakSirketi: label,
        _format: format,
        _genre: genre,
        _pressing: `${['First Press', 'Reissue', 'Remaster', 'Promo', 'Test Pressing'][i % 5]}`,
        _matrixNo: `${['A', 'B', 'C', 'D'][i % 4]}${String(10000 + i * 13).padStart(5, '0')}`,
        _condition: ['Mint (M)', 'Near Mint (NM)', 'Very Good+ (VG+)', 'Very Good (VG)', 'Good+ (G+)'][i % 5],
        _title: album,
        _subtitle: artist,
        _ozet: `${artist} — ${album} (${year}), ${label}, ${format}, ${genre}. ${['Mint', 'Near Mint', 'Very Good'][i % 3]} durumda.`,
      });
    } else {
      const stampTypes = ['Posta Pulu', 'Damga Pulu', 'Anma Pulu', 'Vergi Pulu', 'Harç Pulu', 'Konulu Pulu', 'Hatıra Pulu', 'Tematik Pulu', 'Resim Pulu', 'Adi Pulu', 'Resmi Pulu', 'Yetki Pulu', 'Gümrük Pulu', 'Blok', 'Minyatür', 'Perforasyonlu', 'Perforasyonsuz', 'Çapa', 'Kepçe', 'Hava Postası', 'Posta Havalesi', 'Ekspres', 'Kargo Pulu', 'Derleme', 'Emisyon'];
      const nominals = ['5 Kuruş', '10 Kuruş', '25 Kuruş', '50 Kuruş', '1 Lira', '5 Lira', '100 Lira', '500 Lira', '1000 Lira'];
      const mockKatalogNo = `MG${String(i).padStart(4, '0')}`;
      files.push({
        id: `mock_${type}_${i}`,
        name: `${cat} - ${theme} ${year} No.${String(i).padStart(4, '0')}.pdf`,
        category: cat,
        webViewLink: `https://drive.google.com/drive/folders/${CONFIG.FOLDERS[type] || ''}`,
        isMock: true,
        _code: mockKatalogNo,
        _katalogNo: mockKatalogNo,
        _ulke: cat,
        _country: cat,
        _year: String(year),
        _basimYili: String(year),
        _basimYeri: ['Ankara', 'İstanbul', 'Konya', 'İzmir', 'Bursa', 'London', 'Paris', 'Berlin'][i % 8],
        _nominal: nominals[i % nominals.length],
        _nominalDeger: nominals[i % nominals.length],
        _pulTipi: stampTypes[i % stampTypes.length],
        _durum: ['Damgalı', 'Damgasız', 'Damgalı · MNH', 'Damgasız · Mint'][i % 4],
        _title: `${theme} ${year}`,
        _subtitle: `${stampTypes[i % stampTypes.length]}`,
        _ozet: `${cat} menşeli, ${year} basımı ${theme} temalı ${stampTypes[i % stampTypes.length].toLowerCase()}.`,
      });
    }
  }
  return files;
}

// ─── GOOGLE DRIVE API ──────────────────────────────────────────────────────
async function fetchDriveFiles(folderId, noticeEl, type) {
  console.log(`[PULLUK] fetchDriveFiles(${folderId ? folderId.substring(0, 8) + '...' : 'null'}, ${type})`);
  if (!folderId) {
    console.log(`[PULLUK] fetchDriveFiles: no folderId, using mock`);
    if (noticeEl) {
      noticeEl.classList.remove('is-hidden');
      noticeEl.innerHTML = `
        <span class="api-notice-icon" aria-hidden="true">💡</span>
        <div class="api-notice-text">
          <b>Klasör ID Eksik</b>
          Bu koleksiyon için Google Drive klasör ID'si <code>app.js</code> içindeki <code>CONFIG.FOLDERS['${type}']</code> alanına tanımlanmamış. Örnek veriler gösteriliyor.
        </div>
      `;
    }
    return generateMockFiles(type);
  }

  const apiKey = CONFIG.GOOGLE_API_KEY.trim();
  if (!apiKey) {
    console.info(`[PULLUK] fetchDriveFiles: no API key, using mock`);
    return generateMockFiles(type);
  }

  if (noticeEl) noticeEl.classList.add('is-hidden');

  const baseUrl = 'https://www.googleapis.com/drive/v3/files';
  let allFiles = [];
  let pageToken = null;

  try {
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, size, description)',
        pageSize: 1000,
        key: apiKey,
        orderBy: 'name',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      let res;
      try {
        res = await fetch(`${baseUrl}?${params}`, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      console.log(`[PULLUK] fetchDriveFiles: response ${res.status} for ${type}`);
      if (!res.ok) throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
      const data = await res.json();

      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    console.log(`[PULLUK] fetchDriveFiles: total ${allFiles.length} files for ${type}`);
    return allFiles;
  } catch (err) {
    console.error(`[PULLUK] fetchDriveFiles: error for ${type}:`, err);
    if (noticeEl) {
      noticeEl.classList.remove('is-hidden');
      noticeEl.querySelector('.api-notice-text').innerHTML = `<b>⚠️ Bağlantı Hatası</b>Google Drive bağlantısı kurulamadı: ${err.message}. Demo veriler gösteriliyor.`;
    }
    return generateMockFiles(type);
  }
}

const BG_CLASSES = ['pdf-bg-1', 'pdf-bg-2', 'pdf-bg-3', 'pdf-bg-4', 'pdf-bg-5', 'pdf-bg-6'];

function getFileType(mimeType, name) {
  if (!mimeType) mimeType = '';
  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) return { icon: '📄', label: 'PDF' };
  if (mimeType === 'text/html' || name.endsWith('.html')) return { icon: '🌐', label: 'HTML' };
  if (mimeType.startsWith('image/')) return { icon: '🖼️', label: 'Görsel' };
  if (mimeType === 'application/vnd.google-apps.document') return { icon: '📝', label: 'Doküman' };
  if (mimeType === 'application/vnd.google-apps.folder') return { icon: '📁', label: 'Klasör' };
  return { icon: '🗒️', label: 'Dosya' };
}

function extractStampInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', country: '', year: '', katalogNo: '', ulke: '', basimYili: '', basimYeri: '', nominalDeger: '', pulTipi: '', ozet: '', durum: '' };
  if (!html) return EMPTY;

  // Strip <style> and <script> blocks before parsing
  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');

  let title = '';
  let subtitle = '';
  let image = '';
  let code = '';
  let country = '';
  let year = '';
  let nominalDeger = '';
  let pulTipi = '';
  let basimYeri = '';
  let ozet = '';
  let durum = '';

  // Collect ALL visible text from the page for pattern scanning
  const bodyText = doc.body ? doc.body.textContent || '' : '';
  const allText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const scanText = (bodyText + ' ' + allText).toLowerCase();

  // ── 0. TABLE KEY-VALUE EXTRACTION (broad mapping) ──
  const tableData = {};
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (rows) {
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
      if (key && val) tableData[key.toLowerCase().trim()] = val;
    }
  }
  // Also scan DOM table cells
  const cells = doc.querySelectorAll('td, th');
  for (let i = 0; i < cells.length; i++) {
    const t = cells[i].textContent.trim();
    const nextTd = cells[i].nextElementSibling;
    if (nextTd && t.length < 60) {
      tableData[t.toLowerCase().trim()] = nextTd.textContent.trim();
    }
  }

  // Generic table field resolver
  const findTableValue = (...keys) => {
    for (const k of keys) {
      const low = k.toLowerCase();
      for (const tk of Object.keys(tableData)) {
        if (tk.includes(low) || low.includes(tk)) return tableData[tk];
      }
    }
    return '';
  };

  // ── 1. KODEX (.kod element, then .collection-number, then <title>) ──
  const kodEl = doc.querySelector('.kod');
  if (kodEl) {
    code = kodEl.textContent.trim();
  } else {
    const codeEl2 = doc.querySelector('.collection-number');
    if (codeEl2) {
      code = codeEl2.textContent.trim();
    } else {
      const titleTag = doc.querySelector('title');
      if (titleTag) {
        const rawTitle = titleTag.textContent.trim();
        const codeMatch = rawTitle.match(/\b(M[GCKR]\w*\d+)\b/i);
        if (codeMatch) code = codeMatch[1].trim();
      }
    }
  }

  // ── 2. TITLE: <h1> first, then fallbacks ──
  const h1El = doc.querySelector('h1');
  if (h1El) {
    title = h1El.textContent.trim();
  }
  if (!title) {
    const titleSelectors = ['.title', '.name', 'h2', 'h3', '.stamp-title', '[itemprop="name"]'];
    for (const sel of titleSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (text && text.length > 1 && text.length < 200) { title = text; break; }
      }
    }
  }
  if (!title) {
    const titleTag = doc.querySelector('title');
    if (titleTag) {
      const rawTitle = titleTag.textContent.trim();
      const parts = rawTitle.split(/[·•|—–]/);
      if (parts.length >= 2) {
        title = parts.find(p => p.trim() && !/^MG[A-Z]?\d+$/i.test(p.trim()) && !/GÜVENTÜRK|KOLEKSİYON/i.test(p.trim())) || '';
        title = title.trim();
      } else if (rawTitle && !/GÜVENTÜRK|KOLEKSİYON/i.test(rawTitle)) {
        title = rawTitle;
      }
    }
  }

  // ── 3. SUBTITLE: .subtitle element ──
  const subEl = doc.querySelector('.subtitle, .sub, .description, .detail, .info');
  if (subEl) subtitle = subEl.textContent.trim();

  // ── 4. IMAGE: first <img> src ──
  const imgEl = doc.querySelector('img');
  if (imgEl) image = imgEl.getAttribute('src') || '';

  // ── Clean up title & subtitle ──
  const stripPatterns = str => str
    .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK/gi, '')
    .replace(/KOLEKSİYON(U)?/gi, '')
    .replace(/MG[A-Z]?\s*\d+/gi, '')
    .replace(/^[\s\d\-.:|•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  title = stripPatterns(title);
  subtitle = stripPatterns(subtitle);

  // ── 5. NOMINAL DEĞER: scan all visible text for currency patterns ──
  // Use \s+ instead of \b for Turkish chars (kuruş, etc.) — \b fails with non-ASCII
  const currencyPattern = /(?:^|\s|:)(\d+[.,]?\d*)\s+(kuruş|kurus|para|lira|₺|TL\b|sent|cente?|penny|pence|pfenning|groschen|shilling|franc|mark|rupi|yen|yuan|won|dinar|ruble|real|peso|riyal|cents?|dollars?|euro?)/i;
  // Try from title first
  if (title) {
    const cm = title.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  // Try from subtitle
  if (!nominalDeger && subtitle) {
    const cm = subtitle.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  // Try from table data
  if (!nominalDeger) {
    const tableNominal = findTableValue('nominal', 'değer', 'deger', 'value', 'bedel', 'kiymet', 'fiyat', 'tutar', 'birim', 'denomination', 'face value');
    if (tableNominal) {
      const cm = tableNominal.match(currencyPattern);
      if (cm) nominalDeger = cm[0].trim();
      else if (tableNominal.length < 40) nominalDeger = tableNominal.trim();
    }
  }
  // Try from <td>/<th> elements (table cells if they exist)
  if (!nominalDeger) {
    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = cell.textContent.trim();
      const cm = t.match(currencyPattern);
      if (cm && cm[0].length < 40) { nominalDeger = cm[0].trim(); break; }
    }
  }
  // Try from all text as last resort
  if (!nominalDeger) {
    const cm = allText.match(currencyPattern);
    if (cm) nominalDeger = cm[0].trim();
  }
  // Also try denomination-like patterns: "Değer: 5 Kuruş"
  if (!nominalDeger) {
    const denomMatch = allText.match(/(?:değer|deger|nominal|value|bedel|kiymet|fiyat|tutar|birim)[:\s]+([^,;\n]{3,40})/i);
    if (denomMatch) nominalDeger = denomMatch[1].trim();
  }
  // Fallback: scan div elements with class containing 'nominal' or 'value'
  if (!nominalDeger) {
    const divs = doc.querySelectorAll('div[class*="nominal"], div[class*="value"], span[class*="nominal"], span[class*="value"]');
    for (const div of divs) {
      const t = div.textContent.trim();
      const cm = t.match(currencyPattern);
      if (cm && cm[0].length < 40) { nominalDeger = cm[0].trim(); break; }
      else if (t.length < 40 && /kuruş|kurus|para|lira|TL/i.test(t)) { nominalDeger = t; break; }
    }
  }
  // Clean up nominal value: strip parenthetical content like "(G..." from "Değer 6 Kuruş (G..."
  if (nominalDeger) {
    nominalDeger = nominalDeger.replace(/\s*\([^)]*\)\s*$/, '').trim(); // remove (content)
    nominalDeger = nominalDeger.replace(/\s*\(.*$/, '').trim();          // remove (unclosed...
    // Also strip common prefixes like "Değer", "Değeri", "Nominal" if present
    nominalDeger = nominalDeger.replace(/^(değer|değeri|deger|nominal|bedel|kiymet|fiyat|tutar|birim)[:\s]+/i, '').trim();
  }

  // ── 6. ÜLKE: extract from text using known country keywords ──
  const countryInfo = STAMP_COUNTRIES.find(c => c.keywords.some(kw => scanText.includes(kw)));
  if (countryInfo) country = countryInfo.name;
  // Fallback: table data
  if (!country) {
    const tableCountry = findTableValue('ülke', 'ulke', 'country', 'menşe', 'mense', 'menşei', 'origin', 'devlet', 'state');
    if (tableCountry) country = extractCountryFromText(tableCountry) || tableCountry;
  }
  // Fallback: scan all table cells for country names
  if (!country) {
    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = cell.textContent.trim().toLowerCase();
      for (const c of STAMP_COUNTRIES) {
        if (c.keywords.some(kw => t.includes(kw))) { country = c.name; break; }
      }
      if (country) break;
    }
  }

  // ── 7. BASIM YILI: extract from text ──
  // Try title first for year (more reliable)
  if (title) {
    const tYear = title.match(/\b((?:18|19|20)\d{2})\b/);
    if (tYear) year = tYear[1];
  }
  // Fallback: table data
  if (!year) {
    const tableYear = findTableValue('yıl', 'yil', 'year', 'tarih', 'basım yılı', 'basim yili', 'yayın yılı', 'dönem', 'dönem', 'üretim yılı');
    if (tableYear) {
      const ym = tableYear.match(/\b((?:18|19|20)\d{2})\b/);
      if (ym) year = ym[1];
    }
  }
  // Fallback: scan all text
  if (!year) {
    const yearMatch = scanText.match(/\b((?:18|19|20)\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
  }

  // ── 8. PUL TİPİ: extract from text ──
  // First, check for "****" pattern which indicates Damga Pulu
  const asteriskDamga = allText.match(/\*{4,}/);
  if (asteriskDamga) {
    pulTipi = 'Damga Pulu';
  }
  // Check for "damga" keyword (with optional "fiscal" nearby)
  if (!pulTipi) {
    const damgaMatch = allText.match(/\b(fiscal\s+)?damga\b/i);
    if (damgaMatch) {
      pulTipi = 'Damga Pulu';
    }
  }
  const stampTypePatterns = [
    // çok kelimeli tipler önce
    /\b(hazır\s+antetli|ılk\s+gün|prime\s+cover|first\s+day|air\s*mail|posta\s+havalesi|kargo\s+pulu|posta\s+kutusu|posta\s+kasası)\b/i,
    // tek/kelimeli tipler: tam eşleşme (\b...\b)
    /\b(vergi\s+pulu|vergi\s+pul|harç\s+pulu|harç\s+pul|damga\s+pulu|damga\s+pul|posta\s+pulu|posta\s+pul|anma\s+pulu|anma\s+pul|konulu\s+pulu|konulu\s+pul|tematik\s+pulu|tematik\s+pul|hatıra\s+pulu|hatıra\s+pul|anı\s+pulu|anı\s+pul|resim\s+pulu|resim\s+pul|adi\s+pulu|adi\s+pul|tellaloğlu|davalık|mühürlü|derleme|emisyon|blok|souvenir|sheet|minyatür|minyatur|çapa|kepçe|perforasyon|perforasyonlu|perforasyonsuz|gümrük|gumruk|telegraph|telgraf|parsel|paket|hava\s+postası|hava\s+postasi|express|ekspres|resmi|resmî|resmi\s+pulu|resmi\s+pul|yetki|yetki\s+pulu|yetki\s+pul|resmî\s+pulu|resmi\s+pulu)\b/i,
    // İngilizce tipler
    /\b(commemorative|definitive|posta\s+pulu|posta\s+pul|revenue|cinderella|charity|charity\s+stamp|airmail|air\s+mail|postage|fiscal|official|semi-postal|semi\s+postal|postage\s+due|postage-due|registration|registered|express|special\s+delivery|parcel|package|newspaper|newspaper\s+stamp|telegraph|telegram)\b/i,
    // fallback: sadece "pul" kelimesi varsa tip bulamadık
    /\b(pul)\b/i
  ];
  for (const pat of stampTypePatterns) {
    const tm = scanText.match(pat);
    if (tm) { pulTipi = tm[1] || tm[0]; break; }
  }
  // Fallback: try subtitle
  if (!pulTipi && subtitle) {
    for (const pat of stampTypePatterns) {
      const tm = subtitle.toLowerCase().match(pat);
      if (tm) { pulTipi = tm[1] || tm[0]; break; }
    }
  }
  // Fallback: scan table cells
  if (!pulTipi) {
    const tableTip = findTableValue('pul tipi', 'tip', 'type', 'tür', 'tur', 'kategori', 'category', 'seri', 'konu', 'nominal değer', 'nominal');
    if (tableTip) {
      // Try to extract stamp type from the table value
      for (const pat of stampTypePatterns) {
        const tm = tableTip.toLowerCase().match(pat);
        if (tm) { pulTipi = tm[1] || tm[0]; break; }
      }
      // If no pattern matched, use the raw value if it looks like a stamp type
      if (!pulTipi && /^(posta|damga|vergi|harç|anma|konulu|tematik|hatıra|resim|adi|resmi|derleme|emisyon|blok)/i.test(tableTip)) {
        pulTipi = tableTip;
      }
    }
  }
  if (!pulTipi) {
    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = cell.textContent.trim();
      for (const pat of stampTypePatterns) {
        const tm = t.match(pat);
        if (tm) { pulTipi = tm[1] || tm[0]; break; }
      }
      if (pulTipi) break;
    }
  }
  // Normalize: ilk harfi büyük yap, Türkçe karakterleri düzelt
  if (pulTipi) {
    pulTipi = pulTipi.trim();
    // Standartlaştır: yaygın varyasyonları düzelte
    const normalized = pulTipi.toLowerCase()
      .replace(/posta\s+pul\b/, 'Posta Pulu')
      .replace(/damga\s+pul\b/, 'Damga Pulu')
      .replace(/vergi\s+pul\b/, 'Vergi Pulu')
      .replace(/harç\s+pul\b/, 'Harç Pulu')
      .replace(/harc\s+pul\b/, 'Harç Pulu')
      .replace(/anma\s+pul\b/, 'Anma Pulu')
      .replace(/konulu\s+pul\b/, 'Konulu Pulu')
      .replace(/tematik\s+pul\b/, 'Tematik Pulu')
      .replace(/hatıra\s+pul\b/, 'Hatıra Pulu')
      .replace(/anı\s+pul\b/, 'Anı Pulu')
      .replace(/resim\s+pul\b/, 'Resim Pulu')
      .replace(/adi\s+pul\b/, 'Adi Pulu')
      .replace(/resmi\s+pul\b/, 'Resmi Pulu')
      .replace(/resmî\s+pul\b/, 'Resmi Pulu')
      .replace(/yetki\s+pul\b/, 'Yetki Pulu')
      .replace(/gümrük\s+pul\b/, 'Gümrük Pulu')
      .replace(/gumruk\s+pul\b/, 'Gümrük Pulu')
      .replace(/posta\s+havalesi/, 'Posta Havalesi')
      .replace(/hava\s+postas[ıi]/, 'Hava Postası')
      .replace(/blok/, 'Blok')
      .replace(/souvenir/, 'Blok')
      .replace(/sheet/, 'Blok')
      .replace(/minyatür|minyatur/, 'Minyatür')
      .replace(/perforasyonlu/, 'Perforasyonlu')
      .replace(/perforasyonsuz/, 'Perforasyonsuz')
      .replace(/çapa/, 'Çapa')
      .replace(/kepçe/, 'Kepçe')
      .replace(/^pul$/, 'Pul')
      .replace(/^damga$/, 'Damga Pulu')
      .replace(/^posta$/, 'Posta Pulu')
      .replace(/^vergi$/, 'Vergi Pulu')
      .replace(/^harç$/, 'Harç Pulu')
      .replace(/^harc$/, 'Harç Pulu')
      .replace(/^anma$/, 'Anma Pulu')
      .replace(/^konulu$/, 'Konulu Pulu')
      .replace(/^tematik$/, 'Tematik Pulu')
      .replace(/^hatıra$/, 'Hatıra Pulu')
      .replace(/^anı$/, 'Anı Pulu')
      .replace(/^resim$/, 'Resim Pulu')
      .replace(/^adi$/, 'Adi Pulu')
      .replace(/^resmi$/, 'Resmi Pulu')
      .replace(/^yetki$/, 'Yetki Pulu')
      .replace(/^gümrük$/, 'Gümrük Pulu')
      .replace(/^gumruk$/, 'Gümrük Pulu')
      .replace(/^blok$/, 'Blok')
      .replace(/^souvenir$/, 'Blok')
      .replace(/^sheet$/, 'Blok')
      .replace(/^minyatür$/, 'Minyatür')
      .replace(/^minyatur$/, 'Minyatür');
    
    // İlk harf büyük, diğerleri küçük (Türkçe karakterlerle uyumlu)
    pulTipi = normalized.charAt(0).toLocaleUpperCase('tr') + normalized.slice(1).toLocaleLowerCase('tr');
  }

  // NOT: Artık tipleri "Damga pulu" tek etiketi altında TOPILAMIYORUZ
  // Her pul tipi kendi adıyla korunuyor (Posta Pulu, Damga Pulu, Vergi Pulu, Harç Pulu, Anma Pulu, vb.)

  // ── 9. BASIM YERİ: extract from table cells or text ──
  const basimYeriKeys = [
    'basım yeri', 'baskı yeri', 'bastığı yer', 'basıldığı yer', 'bas yeri',
    'basım şehri', 'baskı şehri', 'baski yeri', 'basim yeri',
    'place of printing', 'printed in', 'printing place', 'printing city',
    'city of issue', 'issue place', 'place of issue',
    'yayın yeri', 'yayin yeri', 'yayınevi',
    'basım bölgesi', 'basım merkezi', 'şehir', 'yer', 'location'
  ];
  // Method 1: Table data via findTableValue (broadest)
  basimYeri = findTableValue(...basimYeriKeys);
  // Method 2: isBasimYeriKey check for complex keys
  if (!basimYeri) {
    function isBasimYeriKey(text) {
      const t = text.toLowerCase().trim();
      return basimYeriKeys.some(k => t === k || t.startsWith(k + ':') || t.startsWith(k + ' :') || t.includes(k));
    }
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (rows) {
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
        if (key && val && isBasimYeriKey(key)) {
          basimYeri = val;
          break;
        }
      }
    }
  }
  // Method 3: DOMParser — scan table cells for key-value pairs
  if (!basimYeri) {
    const cells = doc.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      const t = cells[i].textContent.trim();
      const tLow = t.toLowerCase().trim();
      if (basimYeriKeys.some(k => tLow.includes(k))) {
        const nextTd = cells[i].nextElementSibling;
        if (nextTd) {
          basimYeri = nextTd.textContent.trim();
          break;
        }
      }
    }
  }
  // Method 4: key:value pattern in all text
  if (!basimYeri) {
    for (const key of basimYeriKeys) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[:\s]+([a-zA-ZçğıöşüÇĞİÖŞÜ\\s.,-]{2,60})', 'i');
      const cm = allText.match(regex);
      if (cm) { basimYeri = cm[1].trim(); break; }
    }
  }
  // Method 5: scan all visible text for standalone place names after known labels
  if (!basimYeri) {
    const bodyTextClean = (doc.body ? doc.body.textContent || '' : '').replace(/\s+/g, ' ');
    for (const key of basimYeriKeys) {
      const idx = bodyTextClean.toLowerCase().indexOf(key);
      if (idx >= 0) {
        const after = bodyTextClean.substring(idx + key.length).replace(/^[:\s]+/, '').trim();
        const wordMatch = after.match(/^([A-ZÇĞİÖŞÜa-zçğıöşü][A-ZÇĞİÖŞÜa-zçğıöşü\s.,-]{1,50})/);
        if (wordMatch) { basimYeri = wordMatch[1].trim(); break; }
      }
    }
  }

  // ── 10. ÖZET: description / meta / first <p> ──
  const descEl = doc.querySelector('meta[name="description"]');
  if (descEl) ozet = descEl.getAttribute('content') || '';
  if (!ozet) {
    const descSelectors = ['.summary', '.overview', '.description', '.detail-text', '.info-text', '.notlar', '.notes'];
    for (const sel of descSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (text && text.length > 3 && text.length < 300) { ozet = text; break; }
      }
    }
  }
  if (!ozet) {
    const pEls = doc.querySelectorAll('p');
    for (const p of pEls) {
      const t = p.textContent.trim();
      if (t && t.length > 10 && t.length < 300 && !/GÜVENTÜRK|KOLEKSİYON/i.test(t)) {
        ozet = t; break;
      }
    }
  }

  // ── 11. DURUM: damgalı/damgasız + mint/MNH/MLH ──
  // Table-based extraction via findTableValue
  durum = findTableValue('durum', 'condition', 'status', 'kalite', 'nitelik', 'stamped', 'cancel', 'mint', 'mnh', 'mlh', 'used', 'kullanılmış', 'damga durumu');
  // Fallback: direct table row scan
  if (!durum) {
    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = cell.textContent.trim().toLowerCase();
      if (/durum|condition|status|kalite|nitelik|stam?ped|cancel|mint|mnh|mlh|used|kullan[ıi]/.test(t)) {
        const nextTd = cell.nextElementSibling;
        if (nextTd && nextTd.textContent.trim()) {
          durum = nextTd.textContent.trim();
          break;
        }
      }
    }
  }
  // Text-based extraction
  if (!durum) {
    // Mint/MNH/MLH detection
    const mintMatch = scanText.match(/\b(mint\s*unused|mint\s*hinge|mint\s*no\s*hinge|mnh|mlh|mint|mn)\b/i);
    if (mintMatch) {
      const m = mintMatch[1].toUpperCase().trim();
      const mintMap = { 'MINT UNUSED': 'Mint', 'MINT HINGE': 'MNH', 'MINT NO HINGE': 'MLH', 'MNH': 'MNH', 'MLH': 'MLH', 'MINT': 'Mint', 'MN': 'Mint' };
      durum = mintMap[m] || m;
    }
  }
  if (!durum) {
    // Damgalı/Damgasız detection
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
  // Combine: "Damgalı · MNH" or just "Damgasız · Mint"
  // Already set — if both mint and damga detected above, combine them
  if (durum && !/damgal|damgas/.test(durum)) {
    // Only mint info, add damga status if found
    const isDamgali = /damgal[ıi]|cancel|used|kullan[ıi]lm[ıi]ş|postally/.test(scanText);
    const isDamgasiz = /damgas[ıi]z|uncancel|unused|kullan[ıi]lmam[ıi]ş/.test(scanText);
    if (isDamgali) durum = 'Damgalı · ' + durum;
    else if (isDamgasiz) durum = 'Damgasız · ' + durum;
  } else if (!durum) {
    // Neither found — try to set just damga status
    const isDamgali = /damgal[ıi]|cancel|used|kullan[ıi]lm[ıi]ş|postally/.test(scanText);
    const isDamgasiz = /damgas[ıi]z|uncancel|unused|kullan[ıi]lmam[ıi]ş/.test(scanText);
    if (isDamgali) durum = 'Damgalı';
    else if (isDamgasiz) durum = 'Damgasız';
  }

  // Normalize country name for consistent display
  const normalizedCountry = normalizeCountryName(country);

  return {
    title, subtitle, image, code, country: normalizedCountry || country, year,
    denomination: nominalDeger, typeInfo: pulTipi,
    katalogNo: code, ulke: normalizedCountry || country, basimYili: year, basimYeri,
    nominalDeger, pulTipi, ozet, durum
  };
}
// ─── PLAK (VINYL) EXTRACTOR ────────────────────────────────────────────────
function extractPlakInfoFromHtml(html) {
  const EMPTY = { title: '', subtitle: '', image: '', code: '', artist: '', album: '', plakSirketi: '', katalogNo: '', year: '', format: '', country: '', genre: '', pressing: '', matrixNo: '', condition: '' };
  if (!html) return EMPTY;

  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  const bodyText = doc.body ? doc.body.textContent || '' : '';
  const allText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const scanText = (bodyText + ' ' + allText).toLowerCase();

  let title = '', subtitle = '', image = '', code = '';
  let artist = '', album = '', plakSirketi = '', katalogNo = '', year = '', format = '', country = '';
  let genre = '', pressing = '', matrixNo = '', condition = '';

  // ── 1. TITLE: <h1> → .title → <title> ──
  const h1El = doc.querySelector('h1');
  if (h1El) title = h1El.textContent.trim();
  if (!title) {
    const sel = doc.querySelector('.title, .name, h2, h3');
    if (sel) title = sel.textContent.trim();
  }
  if (!title) {
    const tEl = doc.querySelector('title');
    if (tEl) title = tEl.textContent.trim();
  }

  // ── 2. IMAGE: first <img> ──
  const imgEl = doc.querySelector('img');
  if (imgEl) image = imgEl.getAttribute('src') || '';

  // ── 3. TABLE-BASED EXTRACTION (key: value in <tr>/<td>/<th>) ──
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  const tableData = {};
  if (rows) {
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
      if (key && val) tableData[key.toLowerCase().trim()] = val;
    }
  }
  // Also scan DOM table cells
  const cells = doc.querySelectorAll('td, th');
  for (let i = 0; i < cells.length; i++) {
    const t = cells[i].textContent.trim();
    const nextTd = cells[i].nextElementSibling;
    if (nextTd && t.length < 50) {
      tableData[t.toLowerCase().trim()] = nextTd.textContent.trim();
    }
  }

  // ── 4. MAP TABLE DATA TO PLAK FIELDS ──
  const findKey = (...keys) => {
    for (const k of keys) {
      const low = k.toLowerCase();
      for (const tk of Object.keys(tableData)) {
        if (tk.includes(low) || low.includes(tk)) return tableData[tk];
      }
    }
    return '';
  };

  artist = findKey('sanatçı', 'sanatci', 'artist', 'müzisyen', 'ses sanatçısı', 'group', 'grup', 'performer');
  album = findKey('albüm', 'album', 'plak adı', 'eser', 'konu', 'title', 'lp', 'ep');
  plakSirketi = findKey('plak şirketi', 'plak sirketi', 'şirket', 'sirket', 'label', 'record label', 'yayın', 'yayinevi', 'firma', 'şirketi');
  katalogNo = findKey('katalog', 'catalog', 'kat no', 'no', 'numara', 'katalog no', 'catalog no');
  year = findKey('yıl', 'yil', 'year', 'tarih', 'basım yılı', 'basim yili', 'yayın yılı', 'release year');
  format = findKey('format', 'tür', 'tur', 'tip', 'tipi', 'format:', 'plak formatı', 'çap', 'cap', 'rpm', 'devir', 'boyut');
  country = findKey('ülke', 'ulke', 'country', 'menşe', 'mense', 'menşei', 'origin', 'press country');
  genre = findKey('tür', 'tur', 'genre', 'style', 'müzik türü', 'muzik turu', 'kategori');
  pressing = findKey('basım', 'basim', 'pressing', 'press', 'reissue', 'remaster', 'baskı', 'baski', 'edition', 'sürüm', 'surum');
  matrixNo = findKey('matriks', 'matrix', 'runout', 'run-out', 'dead wax', 'katalog no', 'catalog no', 'matris');
  condition = findKey('durum', 'condition', 'grade', 'grading', 'kondisyon');

  // ── 5. FALLBACK: scan text for common vinyl patterns ──
  if (!year) {
    const yearMatch = scanText.match(/\b((?:19|20)\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
  }
  if (!format) {
    const fmtMatch = scanText.match(/\b(lp|ep|single|45\s*rpm|33\s*rpm|78\s*rpm|7["\u2033]|12["\u2033]|10["\u2033]|vinyl|plak|cd|kaset|cassette|box\s*set|picture\s*disc|colored\s*vinyl|coloured\s*vinyl|flexi|flexi\s*disc)\b/i);
    if (fmtMatch) format = fmtMatch[1];
  }
  if (!katalogNo) {
    const kodEl = doc.querySelector('.kod, .collection-number, .catalog');
    if (kodEl) katalogNo = kodEl.textContent.trim();
    if (!katalogNo) {
      const tEl = doc.querySelector('title');
      if (tEl) {
        const cm = tEl.textContent.match(/\b([A-Z]{2,5}[-\s]?\d{2,8})\b/);
        if (cm) katalogNo = cm[1];
      }
    }
  }

  // ── 6. SUBTITLE / ARTIST fallback from subtitle ──
  const subEl = doc.querySelector('.subtitle, .sub, .artist, .sanatçı, .sanatci');
  if (subEl) subtitle = subEl.textContent.trim();
  if (!artist && subtitle) artist = subtitle;

  // ── 7. ARTIST-ALBUM split from title ("Artist - Album" pattern) ──
  if (title && !artist) {
    const parts = title.split(/\s*[—–\-|]\s*/);
    if (parts.length >= 2) {
      artist = parts[0].trim();
      album = parts.slice(1).join(' — ').trim();
    }
  }
  if (!album && title) album = title;
  code = katalogNo;

  // ── 8. NORMALIZE EXTRACTED FIELDS ──
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

  // Label/Plak Şirketi normalization
  if (plakSirketi) {
    plakSirketi = plakSirketi
      .replace(/plak\s*şirketi\s*/gi, '')
      .replace(/plak\s*sirketi\s*/gi, '')
      .replace(/record\s*label\s*/gi, '')
      .replace(/şirket\s*/gi, '')
      .replace(/sirket\s*/gi, '')
      .replace(/yayın\s*/gi, '')
      .replace(/yayinevi\s*/gi, '')
      .replace(/firma\s*/gi, '')
      .trim();
    // Capitalize first letter of each word
    plakSirketi = plakSirketi.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
      'soundtrack': 'Soundtrack', 'ost': 'Soundtrack', 'world': 'World', 'dünya müziği': 'World'
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
      'poor': 'Poor (P)', 'p': 'Poor (P)'
    };
    condition = condMap[c] || condition.charAt(0).toUpperCase() + condition.slice(1);
  }

  // Cleanup
  artist = artist.replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '').replace(/KOLEKSİYON(U)?/gi, '').trim();
  album = album.replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '').replace(/KOLEKSİYON(U)?/gi, '').trim();

  return { title, subtitle, image, code, artist, album, plakSirketi, katalogNo, year, format, country, genre, pressing, matrixNo, condition };
}
const DB_NAME = 'PullukDB';
const DB_VERSION = 10; // v10: clear stale cache, fix country labels & mobile scroll
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORE_NAME = 'fileCache';

function initDB() {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('IDB init timeout')), 5000);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => { clearTimeout(timeoutId); reject(request.error); };
    request.onsuccess = () => { clearTimeout(timeoutId); resolve(request.result); };
    request.onupgradeneeded = (e) => {
      clearTimeout(timeoutId);
      const db = e.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
}

let dbPromise = initDB();

async function getFileFromCache(file) {
  if (file.isMock) return false;
  try {
    const dbPromiseWithTimeout = Promise.race([
      dbPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB init timeout')), 5000))
    ]);
    const db = await dbPromiseWithTimeout;
    const cached = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(file.id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const now = Date.now();
    const isExpired = cached && cached.cachedAt && (now - cached.cachedAt > CACHE_TTL_MS);
    if (cached && cached.modifiedTime === file.modifiedTime && !isExpired) {
      file._title = cached._title;
      file._subtitle = cached._subtitle;
      file._image = cached._image;
      file._code = cached._code;
      file._country = cached._country;
      file._year = cached._year;
      file._htmlContent = cached._htmlContent;
      file._katalogNo = cached._katalogNo;
      file._ulke = cached._ulke;
      file._basimYili = cached._basimYili;
      file._basimYeri = cached._basimYeri;
      file._nominalDeger = cached._nominalDeger;
      file._pulTipi = cached._pulTipi;
      file._ozet = cached._ozet;
      file._durum = cached._durum;
      file._artist = cached._artist;
      file._album = cached._album;
      file._plakSirketi = cached._plakSirketi;
      file._format = cached._format;
      file._genre = cached._genre;
      file._pressing = cached._pressing;
      file._matrixNo = cached._matrixNo;
      file._condition = cached._condition;
      file._brand = cached._brand;
      file._model = cached._model;
      file._scale = cached._scale;
      file._origin = cached._origin;
      file._series = cached._series;
      file._material = cached._material;
      file._modelYear = cached._modelYear;
      file._productionYear = cached._productionYear;
      return true;
    }
  } catch (e) {
    console.warn('IDB get error', e);
  }
  return false;
}

async function saveFileToCache(file) {
  if (file.isMock) return;
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = {
      id: file.id,
      modifiedTime: file.modifiedTime,
      cachedAt: Date.now(),
      _title: file._title,
      _subtitle: file._subtitle,
      _image: file._image,
      _code: file._code,
      _country: file._country,
      _year: file._year,
      _htmlContent: file._htmlContent,
      _katalogNo: file._katalogNo,
      _ulke: file._ulke,
      _basimYili: file._basimYili,
      _basimYeri: file._basimYeri,
      _nominalDeger: file._nominalDeger,
      _pulTipi: file._pulTipi,
      _ozet: file._ozet,
      _durum: file._durum,
      _artist: file._artist,
      _album: file._album,
      _plakSirketi: file._plakSirketi,
      _format: file._format,
      _genre: file._genre,
      _pressing: file._pressing,
      _matrixNo: file._matrixNo,
      _condition: file._condition,
      _brand: file._brand,
      _model: file._model,
      _scale: file._scale,
      _origin: file._origin,
      _series: file._series,
      _material: file._material,
      _modelYear: file._modelYear,
      _productionYear: file._productionYear
    };
    store.put(data);
  } catch (e) {
    console.warn('IDB put error', e);
  }
}

const previewQueue = [];
let isPreviewProcessing = false;
const PREVIEW_BATCH_SIZE = 3;

async function processPreviewQueue() {
  if (isPreviewProcessing || previewQueue.length === 0) return;
  isPreviewProcessing = true;
  console.log(`[PULLUK] processPreviewQueue: starting, ${previewQueue.length} items`);

  while (previewQueue.length > 0) {
    const batch = [];
    while (batch.length < PREVIEW_BATCH_SIZE && previewQueue.length > 0) {
      const item = previewQueue.shift();
      if (item) batch.push(item);
    }

    const results = await Promise.allSettled(batch.map(async (item) => {
      const { file, titleEl, subEl, imgEl, fallbackEl, codeEl, card, gallery } = item;
      const apiKey = CONFIG.GOOGLE_API_KEY.trim();

      if (file._title) {
        // Re-extract and normalize missing/outdated fields from cached htmlContent
        if (file._htmlContent) {
          const reExtracted = extractStampInfoFromHtml(file._htmlContent);
          let changed = false;
          // Always re-normalize country from htmlContent (may be stale in cache)
          if (reExtracted.country) {
            const normalized = normalizeCountryName(reExtracted.country);
            if (file._country !== normalized) { file._country = normalized; changed = true; }
            if (file._ulke !== normalized) { file._ulke = normalized; changed = true; }
          }
          if (!file._basimYeri && reExtracted.basimYeri) { file._basimYeri = reExtracted.basimYeri; changed = true; }
          if (!file._year && reExtracted.year) { file._year = reExtracted.year; changed = true; }
          if (!file._nominalDeger && reExtracted.nominalDeger) { file._nominalDeger = reExtracted.nominalDeger; changed = true; }
          if (!file._pulTipi && reExtracted.pulTipi) { file._pulTipi = reExtracted.pulTipi; changed = true; }
          if (!file._durum && reExtracted.durum) { file._durum = reExtracted.durum; changed = true; }
          if (!file._image && reExtracted.image) { file._image = reExtracted.image; changed = true; }
          if (!file._code && reExtracted.code) { file._code = reExtracted.code; changed = true; }
          if (!file._basimYili && reExtracted.basimYili) { file._basimYili = reExtracted.basimYili; changed = true; }
          if (!file._subtitle && reExtracted.subtitle) { file._subtitle = reExtracted.subtitle; changed = true; }
          if (changed) saveFileToCache(file);
        }
        // Plak-specific: extract from html if not yet done
        if (gallery && gallery.id === 'plak' && !file._artist && file._htmlContent) {
          const plakData = extractPlakInfoFromHtml(file._htmlContent);
          file._artist = plakData.artist;
          file._album = plakData.album;
          file._plakSirketi = plakData.plakSirketi;
          file._format = plakData.format;
          file._genre = plakData.genre;
          file._pressing = plakData.pressing;
          file._matrixNo = plakData.matrixNo;
          file._condition = plakData.condition;
          if (plakData.artist && !file._subtitle) file._subtitle = plakData.artist;
          if (plakData.album) file._title = plakData.album;
          if (plakData.katalogNo) file._katalogNo = plakData.katalogNo;
          if (plakData.year) file._year = plakData.year;
          saveFileToCache(file);
        }
        // Diecast-specific: extract from html if not yet done
        if (gallery && gallery.id === 'diecast' && (!file._brand || !file._scale) && file._htmlContent) {
          const diecastData = parseDiecastInfo(file, file._htmlContent);
          file._brand = diecastData.brand;
          file._model = diecastData.model;
          file._scale = diecastData.scale;
          file._year = diecastData.year;
          file._origin = diecastData.origin;
          file._series = diecastData.series;
          file._material = diecastData.material;
          if (diecastData.code) file._code = diecastData.code;
          if (diecastData.model) file._title = diecastData.model;
          saveFileToCache(file);
        }
        updateCardUI(item);
        return;
      }

      if (!file._title && await getFileFromCache(file)) {
        // Re-extract and normalize fields from cached htmlContent
        if (file._htmlContent) {
          const reExtracted = extractStampInfoFromHtml(file._htmlContent);
          let changed = false;
          // Always re-normalize country from htmlContent (may be stale in cache)
          if (reExtracted.country) {
            const normalized = normalizeCountryName(reExtracted.country);
            if (file._country !== normalized) { file._country = normalized; changed = true; }
            if (file._ulke !== normalized) { file._ulke = normalized; changed = true; }
          }
          if (!file._basimYeri && reExtracted.basimYeri) { file._basimYeri = reExtracted.basimYeri; changed = true; }
          if (!file._year && reExtracted.year) { file._year = reExtracted.year; changed = true; }
          if (!file._nominalDeger && reExtracted.nominalDeger) { file._nominalDeger = reExtracted.nominalDeger; changed = true; }
          if (!file._pulTipi && reExtracted.pulTipi) { file._pulTipi = reExtracted.pulTipi; changed = true; }
          if (!file._durum && reExtracted.durum) { file._durum = reExtracted.durum; changed = true; }
          if (!file._image && reExtracted.image) { file._image = reExtracted.image; changed = true; }
          if (!file._code && reExtracted.code) { file._code = reExtracted.code; changed = true; }
          if (!file._basimYili && reExtracted.basimYili) { file._basimYili = reExtracted.basimYili; changed = true; }
          if (!file._subtitle && reExtracted.subtitle) { file._subtitle = reExtracted.subtitle; changed = true; }
          if (changed) saveFileToCache(file);
        }
        // Plak-specific: extract from cached html if not yet done
        if (gallery && gallery.id === 'plak' && !file._artist && file._htmlContent) {
          const plakData = extractPlakInfoFromHtml(file._htmlContent);
          file._artist = plakData.artist;
          file._album = plakData.album;
          file._plakSirketi = plakData.plakSirketi;
          file._format = plakData.format;
          file._genre = plakData.genre;
          file._pressing = plakData.pressing;
          file._matrixNo = plakData.matrixNo;
          file._condition = plakData.condition;
          if (plakData.artist && !file._subtitle) file._subtitle = plakData.artist;
          if (plakData.album) file._title = plakData.album;
          if (plakData.katalogNo) file._katalogNo = plakData.katalogNo;
          if (plakData.year) file._year = plakData.year;
          saveFileToCache(file);
        }
        // Diecast-specific: extract from cached html if not yet done
        if (gallery && gallery.id === 'diecast' && (!file._brand || !file._scale) && file._htmlContent) {
          const diecastData = parseDiecastInfo(file, file._htmlContent);
          file._brand = diecastData.brand;
          file._model = diecastData.model;
          file._scale = diecastData.scale;
          file._year = diecastData.year;
          file._origin = diecastData.origin;
          file._series = diecastData.series;
          file._material = diecastData.material;
          file._modelYear = diecastData.modelYear;
          file._productionYear = diecastData.productionYear;
          if (diecastData.code) file._code = diecastData.code;
          if (diecastData.model) file._title = diecastData.model;
          saveFileToCache(file);
        }
        updateCardUI(item);
        if (gallery) gallery.checkAndExtractCategory(file, card);
        return;
      }

      try {
        const pc = new AbortController();
        const pt = setTimeout(() => pc.abort(), 20000);
        let res;
        try {
          const useProxy = window.location.protocol === 'http:';
          const mediaUrl = useProxy
            ? `/drive-proxy?fileId=${file.id}`
            : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
          res = await fetch(mediaUrl, { signal: pc.signal });
        } finally {
          clearTimeout(pt);
        }
        if (res.status === 429) {
          console.warn('[PULLUK] Rate limit hit for', file.name, '— re-queuing');
          previewQueue.push(item);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return;
        }
        if (!res.ok) throw new Error(`alt=media error: ${res.status} ${res.statusText}`);
        const html = await res.text();
        const extracted = extractStampInfoFromHtml(html);

        file._title = extracted.title || file.name.replace(/\.(html|htm|pdf)$/i, '');
        file._subtitle = extracted.subtitle;
        file._image = extracted.image;
        file._code = extracted.code;
        file._country = extracted.country;
        file._year = extracted.year;
        file._nominal = extracted.denomination;
        file._pulTipi = extracted.pulTipi;
        file._katalogNo = extracted.katalogNo;
        file._ulke = extracted.ulke;
        file._basimYili = extracted.basimYili;
        file._basimYeri = extracted.basimYeri;
        file._nominalDeger = extracted.nominalDeger;
        file._pulTipi = extracted.pulTipi;
        file._ozet = extracted.ozet;
        file._durum = extracted.durum;
        file._htmlContent = html;

        // Plak-specific extraction
        if (gallery && gallery.id === 'plak') {
          const plakData = extractPlakInfoFromHtml(html);
          file._artist = plakData.artist;
          file._album = plakData.album;
          file._plakSirketi = plakData.plakSirketi;
          file._format = plakData.format;
          file._genre = plakData.genre;
          file._pressing = plakData.pressing;
          file._matrixNo = plakData.matrixNo;
          file._condition = plakData.condition;
          // Override generic fields with plak-specific data
          if (plakData.artist && !file._subtitle) file._subtitle = plakData.artist;
          if (plakData.album) file._title = plakData.album;
          if (plakData.katalogNo) file._katalogNo = plakData.katalogNo;
          if (plakData.year) file._year = plakData.year;
        }

        // Diecast-specific extraction
        if (gallery && gallery.id === 'diecast') {
          const diecastData = parseDiecastInfo(file, html);
          file._brand = diecastData.brand;
          file._model = diecastData.model;
          file._scale = diecastData.scale;
          file._year = diecastData.year;
          file._origin = diecastData.origin;
          file._series = diecastData.series;
          file._material = diecastData.material;
          file._modelYear = diecastData.modelYear;
          file._productionYear = diecastData.productionYear;
          if (diecastData.code) file._code = diecastData.code;
          if (diecastData.model) file._title = diecastData.model;
        }

        saveFileToCache(file);
        updateCardUI(item);
        if (gallery) gallery.checkAndExtractCategory(file, card);
      } catch (err) {
        console.warn('[PULLUK] Preview extraction error for', file.name, err);
        if (titleEl) titleEl.textContent = file.name.replace(/\.(html|htm|pdf)$/i, '');
      }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isPreviewProcessing = false;
  console.log(`[PULLUK] processPreviewQueue: all items processed`);
}

function updateCardUI(item) {
  const { file, titleEl, subEl, imgEl, fallbackEl, codeEl, card, isDiecast, brandEl, yearEl, badgeBrandEl, badgeYearEl, badgeCodeEl, h3El, koleksiyonEl, ulkeEl, yilEl, nominalEl, tipiEl, durumEl, galleryId } = item;

  // Always normalize country for consistent display
  if (file._country) file._country = normalizeCountryName(file._country);
  if (file._ulke) file._ulke = normalizeCountryName(file._ulke);

  // Standard PDF card updates
  if (titleEl) titleEl.textContent = file._title;
  if (subEl) subEl.textContent = file._subtitle || '';
  if (codeEl) {
    const codeBadge = buildStampCodeBadge(file._code, file._country, file._year);
    if (codeBadge) {
      codeEl.textContent = codeBadge;
      codeEl.style.display = 'inline-block';
    } else {
      codeEl.style.display = 'none';
    }
  }
  if (imgEl && file._image) {
    imgEl.src = file._image;
    imgEl.style.display = 'block';
    if (fallbackEl) fallbackEl.style.display = 'none';
  }
  if (card) {
    card.setAttribute('aria-label', `${file._title || file.name} — görüntüle`);
    card.dataset.name = (file._title || file.name).toLowerCase();
  }

  // Update 5-field stamp card content
  if (!isDiecast && card) {
    const country = file._country || '';
    const year = file._year || '';
    const titleText = file._title || '';
    const subtitleText = file._subtitle || '';
    const fileNameNoExt = (file.name || '').replace(/\.(html|htm|pdf)$/i, '');

    // Dynamic values based on gallery type
    const isKarma = (galleryId === 'allother');
    const nominalValue = isKarma ? titleText : (file._nominal || file._nominalDeger || '');
    const tipiValue = isKarma ? subtitleText : (file._type || file._pulTipi || '');

    const abbrevCountry = normalizeCountryName(country);

    // Populate 5-field card elements
    if (koleksiyonEl) {
      const valEl = koleksiyonEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = fileNameNoExt || '—';
    }
    if (ulkeEl) {
      const valEl = ulkeEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = abbrevCountry || '—';
    }
    if (yilEl) {
      const valEl = yilEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = year || '—';
    }
    if (nominalEl) {
      const valEl = nominalEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = nominalValue || '—';
    }
    if (tipiEl) {
      const valEl = tipiEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = tipiValue || '—';
    }
    if (durumEl) {
      const valEl = durumEl.querySelector('.pdf-card-field__value');
      if (valEl) valEl.textContent = file._durum || '—';
    }
  }

  // Diecast-specific updates: re-parse brand/year/model/scale/origin/material/series from extracted HTML data
  if (isDiecast && card) {
    const diecastData = parseDiecastInfo(file, file._htmlContent);
    const { brand, model, scale, year, origin, series, material, code, modelYear, productionYear } = diecastData;

    // Corner floating badge
    if (brandEl) brandEl.textContent = brand;
    const cornerScaleEl = card.querySelector('.diecast-label__scale');
    if (cornerScaleEl) {
      if (scale) { cornerScaleEl.textContent = scale; cornerScaleEl.style.display = ''; }
      else { cornerScaleEl.style.display = 'none'; }
    }

    // Header Badges
    if (badgeBrandEl) badgeBrandEl.textContent = brand;
    const badgeScaleEl = card.querySelector('.diecast-badge--scale');
    if (badgeScaleEl) {
      if (scale) { badgeScaleEl.textContent = scale; badgeScaleEl.style.display = ''; }
      else { badgeScaleEl.style.display = 'none'; }
    }
    if (badgeYearEl) {
      const displayYear = modelYear || year;
      if (displayYear) { badgeYearEl.textContent = displayYear; badgeYearEl.style.display = ''; }
      else { badgeYearEl.style.display = 'none'; }
    }
    const badgeCodeElActual = badgeCodeEl || card.querySelector('.diecast-badge--code');
    if (badgeCodeElActual) {
      const codeVal = code || file._code;
      if (codeVal) { badgeCodeElActual.textContent = codeVal; badgeCodeElActual.style.display = ''; }
      else { badgeCodeElActual.style.display = 'none'; }
    }

    // Model heading
    if (h3El) h3El.textContent = model;

    // Detailed Collector Fields Grid
    const fieldCode = card.querySelector('.diecast-field--code .diecast-field__value');
    if (fieldCode) fieldCode.textContent = code || file._code || '—';

    const fieldScale = card.querySelector('.diecast-field--scale .diecast-field__value');
    if (fieldScale) fieldScale.textContent = scale || '—';

    const fieldBrand = card.querySelector('.diecast-field--brand .diecast-field__value');
    if (fieldBrand) fieldBrand.textContent = brand || '—';

    const fieldModelYear = card.querySelector('.diecast-field--model-year .diecast-field__value');
    if (fieldModelYear) fieldModelYear.textContent = modelYear || '—';

    const fieldYear = card.querySelector('.diecast-field--year .diecast-field__value');
    if (fieldYear) fieldYear.textContent = productionYear || year || '—';

    const fieldOrigin = card.querySelector('.diecast-field--origin .diecast-field__value');
    if (fieldOrigin) fieldOrigin.textContent = origin || '—';

    const fieldMaterial = card.querySelector('.diecast-field--material .diecast-field__value');
    if (fieldMaterial) fieldMaterial.textContent = material || '—';

    const fieldSeriesWrap = card.querySelector('.diecast-field--series');
    const fieldSeries = card.querySelector('.diecast-field--series .diecast-field__value');
    if (fieldSeriesWrap && fieldSeries) {
      if (series) {
        fieldSeries.textContent = series;
        fieldSeriesWrap.style.display = '';
      } else {
        fieldSeriesWrap.style.display = 'none';
      }
    }
  }

   // Plak-specific updates: update vinyl information from extracted HTML data
   if (galleryId === 'plak' && card) {
     // Calculate file name without extension for Koleksiyon No
     const fileNameNoExt = file.name.replace(/\.(html|htm|pdf)$/i, '');
     
     // Update title and subtitle if they were extracted
     if (titleEl) titleEl.textContent = file._title || '';
     if (subEl) subEl.textContent = file._subtitle || '';
     
     // Update image if available
     if (imgEl && file._image) {
       imgEl.src = file._image;
       imgEl.style.display = 'block';
       if (fallbackEl) fallbackEl.style.display = 'none';
     }
     
     // Update all plak-specific fields
     const plakFields = [
       { el: 'plak-field-title', value: file._album || '' },
       { el: 'plak-field-collection', value: fileNameNoExt || '' },
       { el: 'plak-field-artist', value: file._artist || '' },
       { el: 'plak-field-label', value: file._plakSirketi || '' },
       { el: 'plak-field-genre', value: file._genre || '' },
       { el: 'plak-field-katalog', value: file._katalogNo || '' },
       { el: 'plak-field-year', value: file._year || '' },
       { el: 'plak-field-format', value: file._format || '' },
       { el: 'plak-field-pressing', value: file._pressing || '' },
       { el: 'plak-field-matrix', value: file._matrixNo || '' }
     ];
     
     plakFields.forEach(field => {
       const fieldEl = card.querySelector(`.${field.el}`);
       if (fieldEl) {
         const valueEl = fieldEl.querySelector('.pdf-card-field__value');
         if (valueEl) {
           valueEl.textContent = field.value || '—';
         }
       }
     });
   }
 }

 // ─── GALLERY MANAGER ───────────────────────────────────────────────────────
class GalleryManager {
  constructor(id, folderId) {
    this.id = id; // 'galeri', 'diecast', 'plak'
    this.folderId = folderId;
    this.allFiles = [];
    this.filteredFiles = [];
    this.currentPage = 1;
    const pageSizes = { galeri: 6, diecast: 3, plak: 3, banknot: 6, allother: 6 };
    this.pageSize = pageSizes[this.id] || CONFIG.PAGE_SIZE;
    this.currentFilter = 'all';
    this.searchQuery = '';

    // DOM Elements
    const section = document.getElementById(this.id);
    if (!section) return;

    this.els = {
      notice: section.querySelector('.api-notice'),
      searchBox: section.querySelector('.search-box'),
      filterRow: section.querySelector('.filter-row'),
      grid: section.querySelector(this.id === 'diecast' ? '.diecast-grid' : '.pdf-grid'),
      meta: section.querySelector('.gallery-meta'),
      loading: section.querySelector('.gallery-loading'),
      empty: section.querySelector('.gallery-empty'),
      pagination: section.querySelector('.pagination-container')
    };

    if (this.els.searchBox) {
      this.els.searchBox.addEventListener('input', () => {
        this._userInteracted = true;
        this.searchQuery = this.els.searchBox.value;
        this.applyFilters();
      });
    }

    if (this.els.filterRow) {
      this.els.filterRow.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        this._userInteracted = true;
        this.els.filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.currentFilter = btn.dataset.filter;
        this.applyFilters();
      });
    }

    this.filterUpdateTimeout = null;
  }

  async load() {
    console.log(`[PULLUK] load() start for ${this.id}`);
    if (this.els.loading) this.els.loading.style.display = 'flex';

    // 1. Instant loading from precompiled collection data
    if (window.PULLUK_COLLECTION_DATA && window.PULLUK_COLLECTION_DATA[this.id]) {
      this.allFiles = window.PULLUK_COLLECTION_DATA[this.id].map(p => {
        const f = { ...p };
        // Normalize country on load
        if (f._country) f._country = normalizeCountryName(f._country);
        if (f._ulke) f._ulke = normalizeCountryName(f._ulke);
        return f;
      });
      this.updateFilterButtonsDynamically();
      this.filteredFiles = [...this.allFiles];
      this.renderGallery();
      const counterEl = document.querySelector(`.${this.id === 'galeri' ? 'pul' : this.id}-count-num`);
      if (counterEl) {
        counterEl.dataset.target = this.allFiles.length;
        counterEl.textContent = this.allFiles.length + '+';
      }
      if (this.els.loading) this.els.loading.style.display = 'none';
    }

    const hideTimeout = setTimeout(() => {
      if (this.els.loading) this.els.loading.style.display = 'none';
    }, 8000);

    try {
      const driveFiles = await fetchDriveFiles(this.folderId, this.els.notice, this.id);
      if (driveFiles && driveFiles.length > 0) {
        console.log(`[PULLUK] load() fetched ${driveFiles.length} files from Drive for ${this.id}`);
        const fileMap = new Map();
        const nameMap = new Map();
        this.allFiles.forEach(f => {
          fileMap.set(f.id, f);
          // Also index by normalized file name (without extension) to catch re-uploaded files
          const baseName = (f.name || '').replace(/\.html?$/i, '').trim();
          if (baseName) nameMap.set(baseName, f);
        });

        driveFiles.forEach(df => {
          const existingById = fileMap.get(df.id);
          const baseName = (df.name || '').replace(/\.html?$/i, '').trim();
          const existingByName = baseName ? nameMap.get(baseName) : null;
          const existing = existingById || existingByName;

          if (existing) {
            // Merge: keep precompiled fields, overlay Drive fields
            Object.assign(existing, df, {
              _title: existing._title || df._title,
              _image: existing._image || df._image,
              _code: existing._code || df._code
            });
            // If matched by name but not by id, update id to the new Drive id
            if (!existingById && existingByName) {
              fileMap.delete(existingByName.id);
              fileMap.set(df.id, existing);
            }
          } else {
            this.allFiles.push(df);
          }
        });

        const cachePromise = Promise.all(this.allFiles.map(file => getFileFromCache(file)));
        const cacheTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 3000));
        try { await Promise.race([cachePromise, cacheTimeout]); } catch (_e) { }

        this.updateFilterButtonsDynamically();
        this.filteredFiles = [...this.allFiles];
        this.renderGallery();
        console.log(`[PULLUK] load() renderGallery done for ${this.id}`);

        const counterEl = document.querySelector(`.${this.id === 'galeri' ? 'pul' : this.id}-count-num`);
        if (counterEl) {
          counterEl.dataset.target = this.allFiles.length;
          counterEl.textContent = this.allFiles.length + '+';
        }
      }
    } catch (err) {
      console.error(`[PULLUK] load() error for ${this.id}:`, err);
    } finally {
      clearTimeout(hideTimeout);
      if (this.els.loading) this.els.loading.style.display = 'none';
    }
  }

  checkAndExtractCategory(file, card) {
    const textToSearch = (file._title || '') + ' ' + (file._subtitle || '') + ' ' + file.name + ' ' + (file.description || '');
    const isDiecast = this.id === 'diecast';

    if (isDiecast) {
      // Try HTML table data first
      let brand = '';
      const tableData = file._htmlContent ? extractDiecastDataFromHtml(file._htmlContent) : {};
      brand = resolveDiecastBrand(tableData['Marka / Üretici'] || tableData['Marka / Seri'] || tableData['Marka'] || tableData['Üretici'] || '');
      // Fallback: search text sources
      if (!brand) {
        for (const b of DIECAST_BRANDS) {
          const brandRegex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i');
          if (brandRegex.test(textToSearch)) {
            brand = b;
            break;
          }
        }
      }
      if (brand) {
        file.category = DIECAST_BRAND_ALIASES[toEnUpper(brand)] || toEnUpper(brand);
        if (card) card.dataset.category = file.category.toLowerCase();
        this.updateFilterButtonsDynamically();
      }
    } else {
      // Extract country from text
      const country = extractCountryFromText(textToSearch);
      if (country) {
        file.category = country;
        if (card) card.dataset.category = file.category.toLowerCase();
        this.updateFilterButtonsDynamically();
      }
    }
  }

  extractCategories() {
    const catSet = new Set();
    const isDiecast = this.id === 'diecast';

    this.allFiles.forEach(file => {
      const textToSearch = (file._title || '') + ' ' + (file._subtitle || '') + ' ' + file.name + ' ' + (file.description || '');

      if (isDiecast) {
        // Try HTML table data first, then text sources
        let brand = '';
        const tableData = file._htmlContent ? extractDiecastDataFromHtml(file._htmlContent) : {};
        brand = resolveDiecastBrand(tableData['Marka / Üretici'] || tableData['Marka / Seri'] || tableData['Marka'] || tableData['Üretici'] || '');
        if (!brand) {
          for (const b of DIECAST_BRANDS) {
            const brandRegex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i');
            if (brandRegex.test(textToSearch)) {
              brand = b;
              break;
            }
          }
        }
        if (brand) {
          file.category = DIECAST_BRAND_ALIASES[toEnUpper(brand)] || toEnUpper(brand);
          catSet.add(file.category);
        } else if (!file.category && file.isMock) {
          // Fallback for mock data
          const parts = file.name.split(' ');
          if (parts.length > 0) {
            file.category = toEnUpper(parts[0]);
            catSet.add(file.category);
          }
        } else if (file.category) {
          catSet.add(file.category);
        }
      } else {
        // Extract country from text
        const country = extractCountryFromText(textToSearch);
        if (country) {
          file.category = country;
          catSet.add(file.category);
        } else if (!file.category && file.isMock) {
          const parts = file.name.split(' - ');
          if (parts.length > 1) {
            file.category = parts[0];
            catSet.add(file.category);
          }
        } else if (file.category) {
          catSet.add(file.category);
        }
      }
    });

    // Predefined country order for non-diecast galleries
    const countryOrder = STAMP_COUNTRIES.map(c => c.name);

    return Array.from(catSet).sort((a, b) => {
      if (!isDiecast) {
        const idxA = countryOrder.indexOf(a);
        const idxB = countryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }

  updateFilterButtonsDynamically() {
    if (this.filterUpdateTimeout) clearTimeout(this.filterUpdateTimeout);
    this.filterUpdateTimeout = setTimeout(() => {
      const categories = this.extractCategories();
      this.buildFilterButtons(categories);
    }, 500);
  }

  buildFilterButtons(categories) {
    if (!this.els.filterRow) return;

    const existingBtns = Array.from(this.els.filterRow.querySelectorAll('.filter-btn'));
    const existingTexts = existingBtns.map(b => b.textContent.trim());

    categories.forEach(cat => {
      if (existingTexts.includes(cat)) return;
      const catLower = cat.toLocaleLowerCase('tr');
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = catLower;
      btn.textContent = cat;
      if (this.currentFilter === catLower) {
        btn.classList.add('is-active');
      }

      // Find correct insertion point for sorting
      const buttons = Array.from(this.els.filterRow.querySelectorAll('.filter-btn'));
      let inserted = false;
      for (let i = 1; i < buttons.length; i++) { // Skip 0 'all'
        const numBtn = parseInt(buttons[i].textContent);
        const numCat = parseInt(cat);
        if (!isNaN(numBtn) && !isNaN(numCat) && numBtn > numCat) {
          this.els.filterRow.insertBefore(btn, buttons[i]);
          inserted = true;
          break;
        } else if (isNaN(numBtn) && buttons[i].textContent.localeCompare(cat) > 0) {
          this.els.filterRow.insertBefore(btn, buttons[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.els.filterRow.appendChild(btn);
      }
    });
  }

  applyFilters() {
    const q = this.searchQuery.toLowerCase();
    const cat = this.currentFilter;

    this.filteredFiles = this.allFiles.filter(file => {
      const nameMatch = (file._title || '').toLowerCase().includes(q) ||
        (file._subtitle || '').toLowerCase().includes(q) ||
        (file._code || '').toLowerCase().includes(q) ||
        (file._katalogNo || '').toLowerCase().includes(q) ||
        (file._ulke || '').toLowerCase().includes(q) ||
        (file._nominalDeger || '').toLowerCase().includes(q) ||
        (file._pulTipi || '').toLowerCase().includes(q) ||
        (file._basimYeri || '').toLowerCase().includes(q) ||
        (file._ozet || '').toLowerCase().includes(q) ||
        (file._artist || '').toLowerCase().includes(q) ||
        (file._album || '').toLowerCase().includes(q) ||
        (file._plakSirketi || '').toLowerCase().includes(q) ||
        (file._format || '').toLowerCase().includes(q) ||
        (file._genre || '').toLowerCase().includes(q) ||
        (file._pressing || '').toLowerCase().includes(q) ||
        (file._matrixNo || '').toLowerCase().includes(q) ||
        (file._condition || '').toLowerCase().includes(q) ||
        (file._brand || '').toLowerCase().includes(q) ||
        (file._scale || '').toLowerCase().includes(q) ||
        (file._origin || '').toLowerCase().includes(q) ||
        (file._series || '').toLowerCase().includes(q) ||
        (file._material || '').toLowerCase().includes(q) ||
        (file._model || '').toLowerCase().includes(q) ||
        file.name.toLowerCase().includes(q);
      const catMatch = cat === 'all' || (file.category || '').toLocaleLowerCase('tr') === cat;
      return nameMatch && catMatch;
    });

    this.currentPage = 1;
    this.renderGallery();
  }

  createPdfCard(file, index, galleryId) {
    const bgClass = BG_CLASSES[index % BG_CLASSES.length];
    const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const { icon, label } = getFileType(file.mimeType, file.name);

    const code = file._code || '';
    const katalogNo = file._katalogNo || code || '';
    const country = file._country || file._ulke || '';
    const year = file._year || file._basimYili || '';
    const ozet = file._ozet || '';
    const codeBadge = buildStampCodeBadge(code, country, year);

    // Abbreviate country for card display
    const abbrevCountry = normalizeCountryName(country);

    const initialTitle = file._title || (file.isMock ? file.name.replace(/\.(pdf|html|htm)$/i, '') : file.name.replace(/\.(html|htm|pdf)$/i, ''));
    const initialSub = file._subtitle || '';
    const hasImage = Boolean(file._image);

    // Dynamic labels based on gallery type
    const isKarma = (galleryId === 'allother');
    const L = {
      ulke: isKarma ? 'Üretim Yeri' : 'Ülke',
      yil: isKarma ? 'Üretim Yılı' : 'Basım Yılı',
      nominal: isKarma ? 'Parça Tanımı' : 'Nominal Değer',
      tipi: isKarma ? 'Açıklama' : 'Pul Tipi',
    };
    const nominalValue = isKarma ? initialTitle : (file._nominal || file._nominalDeger || '');
    const tipiValue = isKarma ? initialSub : (file._type || file._pulTipi || '');

    const card = document.createElement('div');
    card.className = 'pdf-card reveal';
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${initialTitle} — görüntüle`);
    card.dataset.name = initialTitle.toLowerCase();
    card.dataset.category = (file.category || '').toLowerCase();
    card.dataset.fileId = file.id || '';
    card.dataset.viewUrl = viewUrl;
    card.dataset.mimeType = file.mimeType || '';
    if (file.isMock) card.dataset.mock = '1';

    const fileNameNoExt = file.name.replace(/\.(html|htm|pdf)$/i, '');
    card.innerHTML = `
      <div class="pdf-card-thumb">
        <div class="pdf-icon-frame ${bgClass}">
          <img class="pdf-icon-img card-img-el" src="${hasImage ? file._image : ''}" alt="${initialTitle}" ${hasImage ? '' : 'style="display:none;"'} />
          <span class="pdf-icon-fallback card-fallback-el" ${hasImage ? 'style="display:none;"' : ''} aria-hidden="true">${icon}</span>
        </div>
      </div>
      <div class="pdf-card-main">
        <div class="pdf-card-info">
          <div class="pdf-card-field card-koleksiyon-el">
            <span class="pdf-card-field__label">Koleksiyon No</span>
            <span class="pdf-card-field__value">${fileNameNoExt || '—'}</span>
          </div>
          <div class="pdf-card-field card-ulke-el">
            <span class="pdf-card-field__label">${L.ulke}</span>
            <span class="pdf-card-field__value">${abbrevCountry || '—'}</span>
          </div>
          <div class="pdf-card-field card-yil-el">
            <span class="pdf-card-field__label">${L.yil}</span>
            <span class="pdf-card-field__value">${year || '—'}</span>
          </div>
          <div class="pdf-card-field card-nominal-el">
            <span class="pdf-card-field__label">${L.nominal}</span>
            <span class="pdf-card-field__value">${nominalValue || '—'}</span>
          </div>
          <div class="pdf-card-field card-tipi-el">
            <span class="pdf-card-field__label">${L.tipi}</span>
            <span class="pdf-card-field__value">${tipiValue || '—'}</span>
          </div>
          <div class="pdf-card-field card-durum-el">
            <span class="pdf-card-field__label">Durum</span>
            <span class="pdf-card-field__value">${file._durum || '—'}</span>
          </div>
        </div>
      </div>
      <div class="pdf-card-action">
        <span class="pdf-open-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </div>
    `;

    const titleEl = card.querySelector('.card-title-el');
    const subEl = card.querySelector('.card-sub-el');
    const imgEl = card.querySelector('.card-img-el');
    const fallbackEl = card.querySelector('.card-fallback-el');
    const codeEl = card.querySelector('.card-code-el');
    const koleksiyonEl = card.querySelector('.card-koleksiyon-el');
    const ulkeEl = card.querySelector('.card-ulke-el');
    const yilEl = card.querySelector('.card-yil-el');
    const nominalEl = card.querySelector('.card-nominal-el');
    const tipiEl = card.querySelector('.card-tipi-el');
    const durumEl = card.querySelector('.card-durum-el');

    if (!file.isMock && (!file._title || !file._image) && (file.mimeType === 'text/html' || file.name.endsWith('.html'))) {
      if (CONFIG.GOOGLE_API_KEY.trim()) {
        console.log(`[PULLUK] createPdfCard: pushing ${file.name} to previewQueue`);
        previewQueue.push({ file, titleEl, subEl, imgEl, fallbackEl, codeEl, card, gallery: this, koleksiyonEl, ulkeEl, yilEl, nominalEl, tipiEl, durumEl, galleryId });
        processPreviewQueue();
      }
    }

    const openCard = () => {
      if (file.isMock) {
        window.open(viewUrl, '_blank', 'noopener,noreferrer');
      } else {
        openViewer(file._title || 'Detay', file.id, viewUrl, file.mimeType, this);
      }
    };
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
    });

    return card;
  }

  // ─── PLAK CARD (Vinyl-specific) ─────────────────────────────────────────
  createPlakCard(file, index) {
    const bgClass = BG_CLASSES[index % BG_CLASSES.length];
    const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const { icon } = getFileType(file.mimeType, file.name);

    // Extract plak data from HTML if available (for non-mock files)
    let plakData = {};
    if (!file.isMock && file._htmlContent) {
      plakData = extractPlakInfoFromHtml(file._htmlContent);
    }

    const code = file._code || plakData.code || '';
    const katalogNo = file._katalogNo || plakData.katalogNo || code || '';
    const country = file._country || file._ulke || plakData.country || '';
    const year = file._year || file._basimYili || plakData.year || '';

    const initialTitle = file._title || plakData.title || (file.isMock ? file.name.replace(/\.(pdf|html|htm)$/i, '') : file.name.replace(/\.(html|htm|pdf)$/i, ''));
    const hasImage = Boolean(file._image || plakData.image);

    // Use extracted data with fallback to file object, then to title parsing
    let artist = file._artist || plakData.artist || '';
    let albumName = file._album || plakData.album || initialTitle;
    let plakSirketi = file._plakSirketi || plakData.plakSirketi || '';
    let formatInfo = file._format || plakData.format || '';
    let genre = file._genre || plakData.genre || '';
    let pressing = file._pressing || plakData.pressing || '';
    let matrixNo = file._matrixNo || plakData.matrixNo || '';

    // Fallback: split "Artist - Album" from title if extraction gave us nothing
    if (!artist && initialTitle) {
      const titleSplit = initialTitle.split(/\s*[—–\-|]\s*/);
      if (titleSplit.length >= 2) {
        artist = titleSplit[0].trim();
        albumName = titleSplit.slice(1).join(' — ').trim();
      }
    }
    if (!albumName) albumName = initialTitle;

    const fileNameNoExt = file.name.replace(/\.(html|htm|pdf)$/i, '');

    const card = document.createElement('div');
    card.className = 'pdf-card plak-card reveal';
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${initialTitle} — görüntüle`);
    card.dataset.name = initialTitle.toLowerCase();
    card.dataset.category = (file.category || '').toLowerCase();
    card.dataset.fileId = file.id || '';
    card.dataset.viewUrl = viewUrl;
    card.dataset.mimeType = file.mimeType || '';
    if (file.isMock) card.dataset.mock = '1';

    const imageSrc = hasImage ? (file._image || plakData.image) : '';

    card.innerHTML = `
      <div class="pdf-card-thumb">
        <div class="pdf-icon-frame plak-icon-frame ${bgClass}">
          <img class="pdf-icon-img card-img-el" src="${imageSrc}" alt="${initialTitle}" ${imageSrc ? '' : 'style="display:none;"'} />
          <span class="pdf-icon-fallback card-fallback-el" ${imageSrc ? 'style="display:none;"' : ''} aria-hidden="true">${icon}</span>
        </div>
      </div>
      <div class="pdf-card-main">
        <div class="pdf-card-info plak-card-info">
          <div class="pdf-card-field plak-field-title">
            <span class="pdf-card-field__label">Albüm / Plak</span>
            <span class="pdf-card-field__value pdf-card-title-value">${albumName || initialTitle || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-collection">
            <span class="pdf-card-field__label">Koleksiyon No</span>
            <span class="pdf-card-field__value">${fileNameNoExt || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-artist">
            <span class="pdf-card-field__label">Sanatçı</span>
            <span class="pdf-card-field__value">${artist || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-label">
            <span class="pdf-card-field__label">Plak Şirketi</span>
            <span class="pdf-card-field__value">${plakSirketi || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-genre">
            <span class="pdf-card-field__label">Tür</span>
            <span class="pdf-card-field__value">${genre || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-katalog">
            <span class="pdf-card-field__label">Katalog No</span>
            <span class="pdf-card-field__value">${katalogNo || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-year">
            <span class="pdf-card-field__label">Yıl</span>
            <span class="pdf-card-field__value">${year || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-format">
            <span class="pdf-card-field__label">Format</span>
            <span class="pdf-card-field__value">${formatInfo || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-pressing">
            <span class="pdf-card-field__label">Basım</span>
            <span class="pdf-card-field__value">${pressing || '—'}</span>
          </div>
          <div class="pdf-card-field plak-field-matrix">
            <span class="pdf-card-field__label">Matriks No</span>
            <span class="pdf-card-field__value">${matrixNo || '—'}</span>
          </div>
        </div>
      </div>
      <div class="pdf-card-action">
        <span class="pdf-open-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </div>
    `;

    const imgEl = card.querySelector('.card-img-el');
    const fallbackEl = card.querySelector('.card-fallback-el');
    const titleEl = card.querySelector('.plak-field-title .pdf-card-title-value');
    const subEl = card.querySelector('.plak-field-artist .pdf-card-field__value');

    // Queue for preview extraction if we don't have full data yet
    if (!file.isMock && (!file._artist || !file._image) && (file.mimeType === 'text/html' || file.name.endsWith('.html'))) {
      if (CONFIG.GOOGLE_API_KEY.trim()) {
        previewQueue.push({ file, titleEl, subEl, imgEl, fallbackEl, codeEl: null, card, gallery: this, koleksiyonEl: null, ulkeEl: null, yilEl: null, nominalEl: null, tipiEl: null, galleryId: 'plak' });
        processPreviewQueue();
      }
    }

    const openCard = () => {
      if (file.isMock) {
        window.open(viewUrl, '_blank', 'noopener,noreferrer');
      } else {
        openViewer(file._title || initialTitle || 'Detay', file.id, viewUrl, file.mimeType, this);
      }
    };
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
    });

    return card;
  }

  createDiecastCard(file, index) {
    const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const initialTitle = file._title || (file.isMock ? file.name.replace(/\.(pdf|html|htm|jpg|jpeg|png|webp)$/i, '') : file.name.replace(/\.(html|htm|pdf)$/i, ''));
    const hasImage = Boolean(file._image);

    const diecastData = parseDiecastInfo(file, file._htmlContent);
    const { brand, year, model, scale, origin, series, material, code, modelYear, productionYear } = diecastData;

    const card = document.createElement('div');
    card.className = 'diecast-card reveal';
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${brand} ${model}${year ? ' ' + year : ''} — görüntüle`);
    card.dataset.name = (model + ' ' + brand + ' ' + (code || '')).toLowerCase();
    card.dataset.category = (brand || file.category || '').toLowerCase();
    card.dataset.fileId = file.id || '';
    card.dataset.viewUrl = viewUrl;
    card.dataset.mimeType = file.mimeType || '';
    if (file.isMock) card.dataset.mock = '1';

    card.innerHTML = `
      <div class="diecast-label diecast-label--card">
        <span class="diecast-label__brand">${brand}</span>
        ${scale ? `<span class="diecast-label__scale">${scale}</span>` : ''}
      </div>
      <div class="diecast-card__image-wrap">
        <img class="diecast-card__image card-img-el" src="${hasImage ? file._image : ''}" alt="${brand} ${model}${year ? ' ' + year : ''}" ${hasImage ? '' : 'style="display:none;"'} />
        <div class="diecast-card__placeholder card-placeholder-el" ${hasImage ? 'style="display:none;"' : ''} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-4c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h2"/><path d="M5 17h14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
      </div>
      <div class="diecast-card__content">
        <div class="diecast-card__badges">
          <span class="diecast-badge diecast-badge--brand">${brand}</span>
          ${scale ? `<span class="diecast-badge diecast-badge--scale">${scale}</span>` : ''}
          ${year ? `<span class="diecast-badge diecast-badge--year">${year}</span>` : ''}
          ${code ? `<span class="diecast-badge diecast-badge--code">${code}</span>` : ''}
        </div>
        <h3 class="diecast-card__model">${model}</h3>
        <div class="diecast-card__fields">
          <div class="diecast-field diecast-field--code">
            <span class="diecast-field__label">Katalog No</span>
            <span class="diecast-field__value">${code || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--scale">
            <span class="diecast-field__label">Ölçek</span>
            <span class="diecast-field__value">${scale || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--brand">
            <span class="diecast-field__label">Marka</span>
            <span class="diecast-field__value">${brand || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--model-year">
            <span class="diecast-field__label">Model Yılı</span>
            <span class="diecast-field__value">${modelYear || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--year">
            <span class="diecast-field__label">Üretim Yılı</span>
            <span class="diecast-field__value">${productionYear || year || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--origin">
            <span class="diecast-field__label">Menşei</span>
            <span class="diecast-field__value">${origin || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--material">
            <span class="diecast-field__label">Malzeme</span>
            <span class="diecast-field__value">${material || '—'}</span>
          </div>
          <div class="diecast-field diecast-field--series diecast-field--full" ${series ? '' : 'style="display:none;"'}>
            <span class="diecast-field__label">Seri / Model No</span>
            <span class="diecast-field__value">${series || '—'}</span>
          </div>
        </div>
      </div>
    `;

    const imgEl = card.querySelector('.card-img-el');
    const placeholderEl = card.querySelector('.card-placeholder-el');
    const brandEl = card.querySelector('.diecast-label__brand');
    const badgeBrandEl = card.querySelector('.diecast-badge--brand');
    const badgeYearEl = card.querySelector('.diecast-badge--year');
    const badgeCodeEl = card.querySelector('.diecast-badge--code');
    const h3El = card.querySelector('.diecast-card__model');

    if (!file.isMock && (!file._title || !file._image) && (file.mimeType === 'text/html' || file.name.endsWith('.html'))) {
      if (CONFIG.GOOGLE_API_KEY.trim()) {
        previewQueue.push({ file, imgEl, fallbackEl: placeholderEl, card, gallery: this, isDiecast: true, brandEl, badgeBrandEl, badgeYearEl, badgeCodeEl, h3El });
        processPreviewQueue();
      }
    }

    const openCard = () => {
      if (file.isMock) {
        window.open(viewUrl, '_blank', 'noopener,noreferrer');
      } else {
        openViewer(file._title || initialTitle, file.id, viewUrl, file.mimeType, this);
      }
    };
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
    });

    return card;
  }

  renderGallery() {
    console.log(`[PULLUK] renderGallery() for ${this.id}, filteredFiles=${this.filteredFiles.length}`);
    if (this.els.loading) this.els.loading.style.display = 'none';
    if (!this.els.grid) {
      if (this.els.empty) this.els.empty.classList.add('is-visible');
      if (this.els.meta) this.els.meta.innerHTML = `<span>0</span> sonuç bulundu`;
      this.renderPagination(0);
      return;
    }
    const isDiecast = this.id === 'diecast';
    const isPlak = this.id === 'plak';
    const cardSelector = isDiecast ? '.diecast-card' : '.pdf-card';
    Array.from(this.els.grid.querySelectorAll(cardSelector)).forEach(c => c.remove());
    if (this.els.empty) this.els.empty.classList.remove('is-visible');

    if (this.filteredFiles.length === 0) {
      if (this.els.empty) this.els.empty.classList.add('is-visible');
      if (this.els.meta) this.els.meta.innerHTML = `<span>0</span> sonuç bulundu`;
      this.renderPagination(0);
      return;
    }

    const pageSize = this.pageSize || CONFIG.PAGE_SIZE;
    const totalPages = Math.ceil(this.filteredFiles.length / pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const slice = this.filteredFiles.slice(startIndex, endIndex);

    slice.forEach((file, i) => {
      const card = isDiecast
        ? this.createDiecastCard(file, startIndex + i)
        : isPlak
          ? this.createPlakCard(file, startIndex + i)
          : this.createPdfCard(file, startIndex + i, this.id);
      this.els.grid.appendChild(card);
    });

    const displayingEnd = Math.min(endIndex, this.filteredFiles.length);
    if (this.els.meta) this.els.meta.innerHTML = `<span>${startIndex + 1}-${displayingEnd}</span> / ${this.filteredFiles.length} dosya gösteriliyor`;

    this.els.grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    this.renderPagination(totalPages);

    // Scroll to gallery top only after user interaction (not initial load)
    if (this._didRender && !this._initialLoadDone) {
      this._initialLoadDone = true;
    } else if (this._didRender && this._userInteracted) {
      const section = document.getElementById(this.id);
      if (section) {
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '66');
        const top = section.getBoundingClientRect().top + window.scrollY - offset - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
    this._didRender = true;
  }

  renderPagination(totalPages) {
    if (!this.els.pagination) return;
    this.els.pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '❮';
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this._userInteracted = true;
        this.currentPage--;
        this.renderGallery();
      }
    });
    this.els.pagination.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === this.currentPage ? ' is-active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        if (this.currentPage !== i) {
          this._userInteracted = true;
          this.currentPage = i;
          this.renderGallery();
        }
      });
      this.els.pagination.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '❯';
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < totalPages) {
        this._userInteracted = true;
        this.currentPage++;
        this.renderGallery();
      }
    });
    this.els.pagination.appendChild(nextBtn);
  }
}

// ─── VIEWER MODAL ──────────────────────────────────────────────────────────
let viewerOpen = false;
let currentBlobUrl = null;
let currentFileHtml = null;

async function openViewer(title, fileId, viewUrl, mimeType, galleryInst) {
  const modal = document.getElementById('viewerModal');
  const frame = document.getElementById('viewerFrame');
  const titleEl = document.getElementById('viewerTitle');
  const collectionEl = document.getElementById('viewerCollection');
  const loading = document.getElementById('viewerLoading');

  const cachedFile = galleryInst ? galleryInst.allFiles.find(f => f.id === fileId) : null;
  const displayTitle = (cachedFile && cachedFile._title) || title || 'Detay';

  titleEl.textContent = displayTitle;
  const codeVal = (cachedFile && (cachedFile._code || cachedFile._katalogNo)) || '';
  collectionEl.textContent = codeVal;
  collectionEl.style.display = codeVal ? 'inline-block' : 'none';
  loading.classList.remove('is-hidden');
  frame.src = '';
  frame.removeAttribute('srcdoc');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  viewerOpen = true;

  let content = cachedFile && cachedFile._htmlContent;
  let loaded = false;

  const isHtml = (mimeType === 'text/html' || (cachedFile && cachedFile.name && cachedFile.name.endsWith('.html')));

  // If content is not in memory, try loading from /drive-proxy or /files/
  if (!content && isHtml) {
    if (window.location.protocol === 'http:') {
      try {
        const res = await fetch(`/drive-proxy?fileId=${fileId}`);
        if (res.ok) {
          content = await res.text();
          if (cachedFile) {
            cachedFile._htmlContent = content;
            saveFileToCache(cachedFile);
          }
        }
      } catch (err) {
        console.warn('[PULLUK] proxy fetch failed:', err);
      }
    }
  }

  // If still no content and API key exists, try alt=media as last resort
  if (!content && isHtml && CONFIG.GOOGLE_API_KEY.trim()) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${CONFIG.GOOGLE_API_KEY.trim()}`);
      if (res.ok) {
        content = await res.text();
        if (cachedFile) {
          cachedFile._htmlContent = content;
          saveFileToCache(cachedFile);
        }
      }
    } catch (err) { }
  }

  // Extract collection number if we now have content
  if (content && !codeVal) {
    const { code: collectionNumber } = extractStampInfoFromHtml(content);
    if (collectionNumber) {
      collectionEl.textContent = collectionNumber;
      collectionEl.style.display = 'inline-block';
    }
  }

  if (content) {
    currentFileHtml = content;
    const mime = mimeType || 'text/html';
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    currentBlobUrl = URL.createObjectURL(blob);
    frame.onload = () => loading.classList.add('is-hidden');
    frame.src = currentBlobUrl;
    loaded = true;
  }

  // If blob wasn't created, try loading directly into iframe
  if (!loaded && isHtml) {
    frame.onload = () => loading.classList.add('is-hidden');
    if (window.location.protocol === 'http:') {
      frame.src = `/drive-proxy?fileId=${fileId}`;
      loaded = true;
    } else {
      frame.src = `files/${fileId}.html`;
      loaded = true;
    }
  }

  if (!loaded && fileId && !isHtml) {
    currentFileHtml = null;
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    frame.onload = () => loading.classList.add('is-hidden');
    frame.src = embedUrl;
    loaded = true;
  }

  if (!loaded) {
    currentFileHtml = null;
    loading.classList.add('is-hidden');
    frame.srcdoc = `<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#aaa;flex-direction:column;gap:12px;background:#0B132B}</style>
      <p>&#9888; Dosya içeriği yüklenemedi. Ağ hatası veya kota aşımı olabilir.</p>
      <a href="${viewUrl}" target="_blank" style="color:#4FC3F7">Google Drive'da Aç</a>`;
  }
}

function closeViewer() {
  const modal = document.getElementById('viewerModal');
  const frame = document.getElementById('viewerFrame');
  frame.src = '';
  frame.removeAttribute('srcdoc');
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
  currentFileHtml = null;
  modal.hidden = true;
  document.body.style.overflow = '';
  viewerOpen = false;
}

function initViewer() {
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerBackdrop').addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && viewerOpen) closeViewer();
  });

  document.getElementById('viewerSaveBtn').addEventListener('click', () => {
    if (!currentFileHtml) {
      alert('Henüz dosya yüklenmedi, lütfen bekleyin.');
      return;
    }

    const printCSS = `
      <style id="pulluk-print">
        @page { margin: 0; size: auto; }
        html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: #0B132B !important; color: #F1F4F9 !important; margin: 0 !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; page-break-inside: avoid !important; break-inside: avoid !important; }
        button, nav, footer, .no-print, input[type="button"], input[type="submit"] { display: none !important; }
      </style>
      <script>
        window.addEventListener('load', function() {
          var h = document.body.scrollHeight || 1122;
          var pageH = 1056;
          var zoom = Math.min(1, pageH / h);
          document.documentElement.style.zoom = zoom;
          setTimeout(function() { window.print(); window.close(); }, 400);
        });
      <\/script>
    `;

    const html = currentFileHtml.includes('</head>')
      ? currentFileHtml.replace('</head>', printCSS + '</head>')
      : printCSS + currentFileHtml;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=900,height=700');
    if (!win) alert('Pop-up engelleyici aktif olabilir. Lütfen bu site için pop-up\'lara izin verin.');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
}

// ─── SCROLL REVEAL ─────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

function initReveal() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ─── THEME ─────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('pulluk_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'dark' ? 'KOYU' : 'AÇIK';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pulluk_theme', next);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = next === 'dark' ? 'KOYU' : 'AÇIK';
}

// ─── SMOOTH SCROLL ─────────────────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '66');
      const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
      const navLinks = document.getElementById('navLinks');
      const navToggle = document.getElementById('navToggle');
      if (navLinks) navLinks.classList.remove('is-open');
      if (navToggle) {
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

// ─── MOBILE NAV ────────────────────────────────────────────────────────────
function initMobileNav() {
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.addEventListener('click', e => {
    if (navLinks.classList.contains('is-open') &&
      !navLinks.contains(e.target) &&
      !navToggle.contains(e.target)) {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

// ─── COLLECTION CARDS CLICK ────────────────────────────────────────────────
function initCollectionCardLinks() {
  document.querySelectorAll('[data-scroll-to]').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.dataset.scrollTo;
      const target = document.getElementById(targetId);
      if (!target) return;
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target || el.textContent);
  if (isNaN(target)) return;
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value.toLocaleString('tr-TR') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCounters() {
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));
}

// ─── BACK TO TOP FIX ───────────────────────────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── PREVIEW CAROUSEL ─────────────────────────────────────────────────────
async function initPreviewCarousel() {
  const list = document.querySelector('.preview-images-list');
  const carousel = document.getElementById('previewCarousel');
  if (!list || !carousel) return;

  const imgs = carousel.querySelectorAll('.preview-image');
  const gridCount = imgs.length;

  // Strategy 1: Fetch images from Drive PREVIEW folder
  let allUrls = [];
  const previewFolderId = CONFIG.FOLDERS['preview'];
  const apiKey = CONFIG.GOOGLE_API_KEY.trim();

  if (previewFolderId && apiKey) {
    try {
      const params = new URLSearchParams({
        q: `'${previewFolderId}' in parents and trashed=false and (mimeType contains 'image/')`,
        fields: 'files(id,name,mimeType)',
        pageSize: 100,
        key: apiKey,
        orderBy: 'name',
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
      console.log(`[PULLUK] preview: Drive API status ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const files = data.files || [];
        console.log(`[PULLUK] preview: found ${files.length} files`, files.map(f => f.name));
        // Use lh3.googleusercontent.com for reliable public image loading
        allUrls = files.map(f => `https://lh3.googleusercontent.com/d/${f.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('[PULLUK] preview: Drive API error', res.status, err);
      }
    } catch (err) {
      console.warn('[PULLUK] preview: Drive fetch failed, falling back to HTML list', err);
    }
  } else {
    console.log('[PULLUK] preview: no Drive folder or API key, using hardcoded list');
  }

  // Strategy 2: Fallback to hardcoded HTML list
  if (allUrls.length === 0) {
    allUrls = Array.from(list.querySelectorAll('a'))
      .map(a => a.getAttribute('href'))
      .filter(Boolean);
    console.log(`[PULLUK] preview: using ${allUrls.length} hardcoded images`);
  }

  if (allUrls.length === 0) return;

  // Pick gridCount unique shuffled URLs (no duplicates)
  let shuffled = [...allUrls].sort(() => Math.random() - 0.5);
  const usedUrls = shuffled.slice(0, Math.min(gridCount, shuffled.length));
  const visibleSet = new Set(usedUrls);
  let hiddenUrls = allUrls.filter(u => !visibleSet.has(u));

  imgs.forEach((imgEl, i) => {
    imgEl.src = usedUrls[i];
  });

  // Click handler: swap clicked image with one from hidden pool
  imgs.forEach((imgEl) => {
    imgEl.addEventListener('click', () => {
      swapImage(imgEl);
    });
  });

  // Auto-rotate: swap one random image every 5 seconds
  setInterval(() => {
    const slot = Math.floor(Math.random() * imgs.length);
    swapImage(imgs[slot]);
  }, 5000);

  function swapImage(imgEl) {
    const oldUrl = imgEl.getAttribute('src');
    if (hiddenUrls.length === 0) {
      // Rebuild pool from all URLs not currently visible
      const currentSet = new Set(Array.from(imgs).map(e => e.getAttribute('src')));
      hiddenUrls = allUrls.filter(u => !currentSet.has(u));
      if (hiddenUrls.length === 0) return; // nothing to swap
    }
    const newIdx = Math.floor(Math.random() * hiddenUrls.length);
    const newUrl = hiddenUrls.splice(newIdx, 1)[0];
    // Add old URL back only if not already in hidden pool
    if (!hiddenUrls.includes(oldUrl)) {
      hiddenUrls.push(oldUrl);
    }
    imgEl.style.opacity = '0';
    setTimeout(() => { imgEl.src = newUrl; imgEl.style.opacity = '1'; }, 250);
  }
}

// ─── MAIN INIT ─────────────────────────────────────────────────────────────
async function init() {
  // Force scroll to top on page load (fixes mobile refresh jumping to last collection)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Clear stale localStorage cache entries for labels
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pulluk_file_') || key.startsWith('pulluk_label_') || key.startsWith('pulluk_card_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_e) { }

  // Theme & nav must init immediately (don't await preview)
  initTheme();
  initViewer();
  initMobileNav();
  initSmoothScroll();
  initCollectionCardLinks();
  initReveal();
  initCounters();
  initBackToTop();

  document.getElementById('themeBtn').addEventListener('click', toggleTheme);

  if (window.location.protocol === 'file:') {
    console.warn('[PULLUK] file:// protocol detected — alt=media requests may be blocked by CORS. Use a local server: python -m http.server 8080');
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ff6b35;color:#fff;padding:12px 20px;text-align:center;font-size:14px;font-weight:600;';
    banner.innerHTML = '⚠ Tarayıcıdan doğrudan açtınız — CORS hatası olabilir. Terminalden <code>python -m http.server 8080</code> çalıştırıp <a href="http://localhost:8080" style="color:#fff;text-decoration:underline">http://localhost:8080</a> adresini açın.';
    document.body.prepend(banner);
  }

  const galleries = [
    new GalleryManager('galeri', CONFIG.FOLDERS['galeri']),
    new GalleryManager('diecast', CONFIG.FOLDERS['diecast']),
    new GalleryManager('plak', CONFIG.FOLDERS['plak']),
    new GalleryManager('banknot', CONFIG.FOLDERS['banknot']),
    new GalleryManager('allother', CONFIG.FOLDERS['allother'])
  ];

  // Load galleries
  galleries.forEach(g => g.load());

  // Load preview carousel in background (non-blocking)
  initPreviewCarousel().catch(err => console.warn('[PULLUK] preview carousel init failed', err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
