const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES_DIR = path.join(ROOT, 'files');
const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDERS = {
  'galeri': '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8',
  'diecast': '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg',
  'plak': '13FPeN7gTD3SjbUB6ENIfaJ4OVa6rYqd0',
  'banknot': '1ffJ9xKTsrKpaM3OcJ0fRU4ggcRRmKBdL',
  'allother': '1mmPvVEreFr0cbXjX3Ds21FOsZI9cRaH0'
};

function extractAllInfo(fileId, fileName, galleryType, html) {
  const data = {
    id: fileId,
    name: fileName,
    mimeType: 'text/html',
    _title: '',
    _subtitle: '',
    _image: '',
    _code: '',
    _country: '',
    _year: '',
    _nominalDeger: '',
    _pulTipi: '',
    _durum: 'Çil (Mint)',
    _katalogNo: ''
  };

  // Image extraction (first img src)
  const imgMatch = html.match(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+|[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i);
  if (imgMatch) data._image = imgMatch[1];

  // Code extraction
  const codeMatch = html.match(/class=["'](?:coll-num|kod|collection-number|code)[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
                    html.match(/<title[^>]*>\s*([A-Z0-9]+)/i);
  if (codeMatch) data._code = codeMatch[1].replace(/<[^>]+>/g, '').trim();
  if (!data._code) {
    const fnm = fileName.match(/^([A-Z0-9]+)/i);
    if (fnm) data._code = fnm[1].toUpperCase();
  }

  // H1, H2, and Subtitle
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const subMatch = html.match(/class=["'](?:sub|subtitle|lead)[^"']*["'][^>]*>([\s\S]*?)<\//i);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  let rawH1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  let rawH2 = h2Match ? h2Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  let rawSub = subMatch ? subMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  let rawTitleTag = titleTagMatch ? titleTagMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Extract all table data and meta-grid items
  const kv = {};

  // 1. Table rows
  const trs = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const tr of trs) {
    const th = (tr.match(/<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1];
    const td = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/i) || [])[1];
    const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (th && td) {
      kv[th.replace(/<[^>]+>/g, '').trim().toLowerCase()] = td.replace(/<[^>]+>/g, ' ').trim();
    } else if (tds.length >= 2) {
      const k = tds[0].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const v = tds[1].replace(/<[^>]+>/g, ' ').trim();
      kv[k] = v;
    }
  }

  // 2. Meta-item divs (used in Banknot etc.)
  const metaItems = html.match(/<div[^>]*class=["'][^"']*meta-item[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi) || [];
  for (const item of metaItems) {
    const lbl = (item.match(/class=["'][^"']*meta-label[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1];
    const val = (item.match(/class=["'][^"']*meta-value[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1];
    if (lbl && val) {
      kv[lbl.replace(/<[^>]+>/g, '').trim().toLowerCase()] = val.replace(/<[^>]+>/g, ' ').trim();
    }
  }

  const find = (...keys) => {
    for (const k of keys) {
      const lk = k.toLowerCase();
      for (const [key, val] of Object.entries(kv)) {
        if (key.includes(lk) || lk.includes(key)) return val;
      }
    }
    return '';
  };

  // Country
  data._country = find('ülke', 'ulke', 'menşei', 'country') || '';
  if (!data._country) {
    const textLow = html.toLowerCase();
    // Check more specific terms first to avoid false matches
    // e.g. 'Osmanlıca' (Ottoman Turkish language) should not match 'Osmanlı'
    if (textLow.includes('türkiye cumhuriyeti') || textLow.includes('t.c.')) data._country = 'Türkiye Cumhuriyeti';
    else if (textLow.includes('birleşik krallık') || textLow.includes('united kingdom') || textLow.includes('ingiltere')) data._country = 'Birleşik Krallık';
    else if (textLow.includes('osmanlı') || textLow.includes('ottoman')) data._country = 'Osmanlı İmp.';
  }

  // Year
  data._year = find('basım yılı', 'yıl', 'dolaşım yılı', 'üretim yılı', 'tarih', 'year') || '';
  if (!data._year) {
    const ym = html.match(/\b((?:18|19|20)\d{2})\b/);
    if (ym) data._year = ym[1];
  } else {
    const ym = data._year.match(/\b((?:18|19|20)\d{2})\b/);
    if (ym) data._year = ym[1];
  }

  data._nominalDeger = find('nominal değer', 'nominal', 'değer') || '';
  data._pulTipi = find('pul tipi', 'tipi', 'tür', 'emisyon') || '';
  data._durum = find('durum', 'kondisyon', 'condition') || 'Çil (Mint)';
  data._katalogNo = find('katalog no', 'katalog', 'katalog numarası') || data._code;

  // Build clean title
  let chosenTitle = '';
  if (rawH1 && !rawH1.toLowerCase().includes('mert güventürk koleksiyonu')) {
    chosenTitle = rawH1;
  } else if (rawH2 && !rawH2.toLowerCase().includes('mert güventürk koleksiyonu')) {
    chosenTitle = rawH2;
  } else if (rawTitleTag) {
    const cleanedTag = rawTitleTag
      .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
      .replace(/^MG[A-Z0-9]+\s*[—–\-|·]\s*/i, '')
      .replace(/[—–\-|·]\s*$/, '')
      .trim();
    if (cleanedTag) chosenTitle = cleanedTag;
  }

  // Fallback for stamps if title is still empty
  if (!chosenTitle) {
    const konu = find('konu / tasarım', 'konu', 'tanım');
    if (konu && konu.length < 50) chosenTitle = konu;
    else if (data._nominalDeger && data._country) chosenTitle = `${data._country} — ${data._nominalDeger}`;
    else if (data._code) chosenTitle = `${data._code} Koleksiyon Pulu`;
    else chosenTitle = fileName.replace(/\.html$/i, '');
  }

  data._title = chosenTitle;
  data._subtitle = rawSub;

  // Specific types:
  if (galleryType === 'diecast') {
    data._brand = find('marka', 'üretici', 'brand') || '';
    data._model = rawH2 || find('araç', 'model', 'model adı') || data._title || fileName.replace(/\.html$/i, '');
    data._scale = find('ölçek', 'scale') || '1:64';
    data._origin = find('menşei', 'üretim yeri') || '';
    data._series = find('seri', 'model no', 'katalog no') || '';
    data._material = find('malzeme', 'gövde') || 'Diecast Metal';
    if (!data._brand) {
      if (html.toLowerCase().includes('corgi')) data._brand = 'CORGI';
      else if (html.toLowerCase().includes('matchbox')) data._brand = 'MATCHBOX';
      else if (html.toLowerCase().includes('hot wheels')) data._brand = 'HOT WHEELS';
      else if (html.toLowerCase().includes('remco')) data._brand = 'REMCO';
      else if (html.toLowerCase().includes('göztepe') || html.toLowerCase().includes('gözgöz')) data._brand = 'GÖZGÖZ';
      else data._brand = 'DIE-CAST';
    }
    data._title = data._model;
  } else if (galleryType === 'plak') {
    data._artist = find('sanatçı', 'sanatci', 'artist', 'grup') || 'Iron Maiden';
    data._album = find('albüm', 'album', 'plak adı') || 'Piece of Mind';
    data._plakSirketi = find('etiket', 'label', 'şirket', 'plak şirketi') || 'EMI';
    data._format = find('format', 'tip') || '12" LP, 33⅓ RPM';
    data._genre = find('tür', 'genre', 'tarz') || 'Heavy Metal';
    data._pressing = find('basım', 'pressing', 'baskı') || 'İlk Basım';
    data._matrixNo = find('matriks', 'matrix', 'runout') || 'EMA 800 A-1 / B-2';
    data._year = data._year || '1983';
    data._title = data._album;
    data._subtitle = data._artist;
  } else if (galleryType === 'banknot') {
    data._title = '50.000 Türk Lirası';
    data._nominalDeger = '50.000 TL';
    data._pulTipi = find('emisyon / seri', 'emisyon') || 'E7 Emisyon Grubu — I. Seri';
    data._country = 'Türkiye Cumhuriyeti';
    data._year = data._year || '1989';
  } else if (galleryType === 'allother') {
    if (fileName.includes('MGD001')) {
      data._title = 'Akhenaten & Nefertiti Papirüs';
      data._subtitle = 'Modern Hatıralık El Boyaması Papirüs';
      data._country = 'Mısır';
      data._year = 'Modern';
      data._nominalDeger = 'Papirüs Eser';
      data._pulTipi = 'El Boyaması Hatıralık';
    } else if (fileName.includes('MGD002')) {
      data._title = 'U2 360° Tour İstanbul Bileti';
      data._subtitle = 'Konser Bileti · Atatürk Olimpiyat Stadyumu';
      data._country = 'Türkiye';
      data._year = '2010';
      data._nominalDeger = 'Konser Bileti';
      data._pulTipi = 'Hatıra Bileti';
    }
  }

  return data;
}

async function run() {
  console.log('Fetching files list from Google Drive...');
  const result = {};

  for (const [galleryType, folderId] of Object.entries(FOLDERS)) {
    const q = `'${folderId}' in parents and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&pageSize=1000&key=${API_KEY}&orderBy=name`);
    const d = await res.json();
    const files = d.files || [];
    result[galleryType] = [];

    for (const file of files) {
      const filePath = path.join(FILES_DIR, `${file.id}.html`);
      let html = '';
      if (fs.existsSync(filePath)) {
        html = fs.readFileSync(filePath, 'utf8');
      }

      const parsed = extractAllInfo(file.id, file.name, galleryType, html);
      parsed.webViewLink = file.webViewLink;
      parsed.modifiedTime = file.modifiedTime;
      result[galleryType].push(parsed);
      console.log(`[${galleryType}] ${file.name}: title="${parsed._title}", country="${parsed._country}", year="${parsed._year}", img=${Boolean(parsed._image)}`);
    }
  }

  // Write JS file
  const jsContent = `/* PULLUK Precompiled Collection Data */\nwindow.PULLUK_COLLECTION_DATA = ${JSON.stringify(result, null, 2)};\n`;
  fs.writeFileSync(path.join(DATA_DIR, 'collection_data.js'), jsContent, 'utf8');
  console.log('Saved data/collection_data.js');

  // Also write JSON
  fs.writeFileSync(path.join(DATA_DIR, 'collection_data.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log('Saved data/collection_data.json');
}

run().catch(console.error);
