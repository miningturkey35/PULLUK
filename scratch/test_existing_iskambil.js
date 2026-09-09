const fs = require('fs');

// Emulate DOMParser using simple parsing or check getTdByTh
function testExistingExtractor(filename) {
  const html = fs.readFileSync(filename, 'utf8');

  // Let's inspect getTdByTh logic from app.js:
  // const thNorm = th.textContent.trim().toLowerCase()
  //   .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
  //   .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g');
  
  const ths = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRegex.exec(html)) !== null) {
    const thM = m[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const tdM = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (thM && tdM) {
      ths.push({
        rawTh: thM[1].trim(),
        rawTd: tdM[1].trim()
      });
    }
  }

  const getTdByTh = (...thTexts) => {
    for (const item of ths) {
      const thNorm = item.rawTh.toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
        .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g');
      for (const target of thTexts) {
        const tNorm = target.toLowerCase()
          .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
          .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g');
        if (thNorm === tNorm || thNorm.startsWith(tNorm) || tNorm.startsWith(thNorm)) {
          return item.rawTd;
        }
      }
    }
    return '';
  };

  const marka = getTdByTh('marka / uretici', 'marka / yetici', 'marka', 'manufacturer', 'brand');
  const deste = getTdByTh('deste / pattern', 'deste', 'pattern', 'deck');
  const durum = getTdByTh('genel durum', 'durum', 'condition');
  console.log(filename, { marka, deste, durum });
}

testExistingExtractor('scratch/MGK001.html');
testExistingExtractor('scratch/MGK002.html');
testExistingExtractor('scratch/MGK003.html');
