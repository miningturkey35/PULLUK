const fs = require('fs');

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\u0435/g, 'e')
    .replace(/\u0430/g, 'a')
    .replace(/\u043e/g, 'o')
    .replace(/\u0440/g, 'p')
    .replace(/\u0441/g, 'c')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const items = [
  { id: '1kAnGL5g5FF3ySlCTS-wEtH6tGcDXRzyn', name: 'MGK001.html', file: 'files/MGK001.html' },
  { id: '1ocbG1KKXJ7yZ2GBC44BQHxCNNBG6xKbU', name: 'MGK002.html', file: 'files/MGK002.html' },
  { id: '1pJKNTglrEGFzn0XMJ_psCV8oREioAeLh', name: 'MGK003.html', file: 'files/MGK003.html' }
];

const compiled = items.map(item => {
  const html = fs.readFileSync(item.file, 'utf8');

  // Hero Image
  const imgM = html.match(/class=["'][^"']*\bhero\b[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i)
    || html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const image = imgM ? imgM[1] : '';

  // Title / Subtitle / Code
  const codeM = html.match(/class=["']coll-num["'][^>]*>([^<]+)</i);
  const code = codeM ? codeM[1].trim() : item.name.replace(/\.html$/i, '');

  const h1M = html.match(/<h1>([^<]+)<\/h1>/i);
  const titleM = html.match(/<title>([^<]+)<\/title>/i);
  let title = h1M ? h1M[1].trim() : (titleM ? titleM[1].trim() : code);
  
  // Refine title to match specific deck naming
  if (item.name.includes('MGK001')) {
    title = 'Bicycle Rider Back (Kırmızı)';
  } else if (item.name.includes('MGK002')) {
    title = 'Bicycle Rider Back (Mavi)';
  } else if (item.name.includes('MGK003')) {
    title = 'Berliner Spielkarten Set (2×55 + 1×32)';
  }

  const subM = html.match(/class=["']subtitle["'][^>]*>([^<]+)</i);
  const subtitle = subM ? subM[1].trim() : '';

  // Rows
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const map = {};
  rows.forEach(r => {
    const thM = r.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const tdM = r.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (thM && tdM) {
      const k = normalizeKey(thM[1].replace(/<[^>]+>/g, ''));
      const v = cleanText(tdM[1].replace(/<[^>]+>/g, ''));
      map[k] = v;
    }
  });

  // Marka:
  let markaRaw = map['marka uretici'] || map['marka'] || '';
  let marka = markaRaw.split('·')[0].trim();
  if (!marka) marka = 'Bicycle';

  // Deste:
  let deste = '';
  if (item.name.includes('MGK001') || item.name.includes('MGK002')) {
    deste = 'Rider Back';
  } else if (item.name.includes('MGK003')) {
    deste = 'SKAT Rekord';
  } else {
    deste = map['deste pattern'] || map['deste'] || map['pattern'] || '';
  }

  // Durum:
  let durum = 'Açılmış';
  const desteDurumu = map['deste durumu'] || '';
  if (/kapali|kapalı|mühürlü/i.test(desteDurumu)) {
    durum = 'Kapalı';
  } else if (/acil|açıl/i.test(desteDurumu)) {
    durum = 'Açılmış';
  }

  // Menşe / Üretim Yeri:
  let ulke = 'ABD';
  const yer = map['uretim yeri'] || map['mense'] || '';
  if (/almanya|germany|deutschland|darmstadt/i.test(yer)) {
    ulke = 'Almanya';
  } else if (/abd|usa|united states|kentucky/i.test(yer)) {
    ulke = 'ABD';
  }

  // Üretim Yılı:
  let yil = '';
  const yText = map['uretim yili'] || '';
  const yMatch = yText.match(/\b((?:18|19|20)\d{2})\b/);
  if (yMatch) {
    yil = yMatch[1];
  } else if (item.name.includes('MGK003')) {
    yil = '1970';
  }

  // Kart Sayısı, Boyut, İndeks
  const kartSayisi = map['kart sayisi'] || '';
  const boyut = map['boyut'] || '';
  const indeks = map['i ndeks'] || map['indeks'] || map['indis'] || '';

  // Özet
  let ozet = '';
  const noteM = html.match(/class=["']note["'][^>]*>([\s\S]*?)<\/div>/i);
  if (noteM) {
    ozet = cleanText(noteM[1].replace(/<[^>]+>/g, ''));
  }

  return {
    id: item.id,
    name: item.name,
    mimeType: 'text/html',
    modifiedTime: '2026-09-09T00:00:00.000Z',
    category: marka,
    _title: title,
    _subtitle: subtitle,
    _code: code,
    _katalogNo: code,
    _marka: marka,
    _deste: deste,
    _durum: durum,
    _ulke: ulke,
    _country: ulke,
    _year: yil,
    _basimYili: yil,
    _kartSayisi: kartSayisi,
    _boyut: boyut,
    _indeks: indeks,
    _ozet: ozet,
    _image: image
  };
});

compiled.forEach(c => {
  console.log(c.name, {
    _code: c._code,
    _title: c._title,
    _marka: c._marka,
    _deste: c._deste,
    _durum: c._durum,
    _ulke: c._ulke,
    _year: c._year,
    hasImage: Boolean(c._image),
    imgLen: c._image ? c._image.length : 0
  });
});

fs.writeFileSync('scratch/iskambil_compiled.json', JSON.stringify(compiled, null, 2), 'utf8');
console.log('Saved to scratch/iskambil_compiled.json');
