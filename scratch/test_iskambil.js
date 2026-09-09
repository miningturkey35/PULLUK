const fs = require('fs');

// Let's implement regex-based testing identical to DOMParser logic or load HTML
function testIskambil(filename) {
  const html = fs.readFileSync(filename, 'utf8');
  
  // Clean text
  const clean = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
  const norm = s => (s || '').trim().toLowerCase()
    .replace(/[\u0430-\u044f]/g, c => ({ 'а':'a', 'е':'e', 'о':'o', 'р':'p', 'с':'c', 'у':'y', 'х':'x' })[c] || c)
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g');

  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  const kv = {};
  while ((m = trRegex.exec(html)) !== null) {
    const row = m[1];
    const th = (row.match(/<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1];
    const td = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/i) || [])[1];
    if (th && td) {
      kv[norm(clean(th))] = clean(td);
    }
  }

  const findVal = (...keys) => {
    for (const k of keys) {
      const nk = norm(k);
      for (const [rowK, rowV] of Object.entries(kv)) {
        if (rowK === nk || rowK.startsWith(nk) || nk.startsWith(rowK)) return rowV;
      }
    }
    return '';
  };

  const marka = findVal('marka / uretici', 'marka / yetici', 'marka', 'brand', 'manufacturer');
  const deste = findVal('deste / pattern', 'deste', 'pattern', 'deck');
  const basimYili = findVal('uretim yili', 'yil', 'year');
  const ulke = findVal('uretim yeri', 'mensei', 'mense', 'yer', 'country');
  const durum = findVal('deste durumu', 'kart durumu', 'kutu durumu', 'genel durum', 'durum', 'condition');

  console.log(filename, { marka, deste, basimYili, ulke, durum });
}

testIskambil('scratch/MGK001.html');
testIskambil('scratch/MGK002.html');
testIskambil('scratch/MGK003.html');
