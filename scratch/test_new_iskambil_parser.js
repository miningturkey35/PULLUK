const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function testWithHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  let title = '', subtitle = '', image = '', code = '';
  let marka = '', deste = '', basimYili = '', ulke = '', durum = '', kartSayisi = '', boyut = '', indeks = '', ozet = '';

  const codeEl = doc.querySelector('.coll-num, .col-num, .kod');
  if (codeEl) code = codeEl.textContent.trim();

  const h1 = doc.querySelector('h1');
  if (h1) title = h1.textContent.trim();
  if (!title) {
    const titleEl = doc.querySelector('title');
    if (titleEl) title = titleEl.textContent.trim();
  }

  const subEl = doc.querySelector('.subtitle');
  if (subEl) subtitle = subEl.textContent.trim();

  const heroImg = doc.querySelector('.hero img');
  if (heroImg) image = heroImg.getAttribute('src') || '';
  if (!image) {
    const anyImg = doc.querySelector('img');
    if (anyImg) image = anyImg.getAttribute('src') || '';
  }

  const tableData = {};
  const normalizeKey = (str) => {
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
  };

  const rows = doc.querySelectorAll('tr');
  for (const row of rows) {
    const th = row.querySelector('th');
    const tds = row.querySelectorAll('td');
    let k = '', v = '';
    if (th && tds.length >= 1) {
      k = normalizeKey(th.textContent);
      v = tds[0].textContent.trim();
    } else if (tds.length >= 2) {
      k = normalizeKey(tds[0].textContent);
      v = tds[1].textContent.trim();
    }
    if (k && v) {
      tableData[k] = v;
    }
  }

  const markaRaw = tableData['marka uretici'] || tableData['marka yetici'] || tableData['marka'] || tableData['manufacturer'] || tableData['brand'] || '';
  if (markaRaw) {
    marka = markaRaw.split('·')[0].trim();
  }

  const desteRaw = tableData['deste pattern'] || tableData['pattern'] || tableData['deste'] || tableData['deck'] || '';
  if (desteRaw) {
    if (/rider back/i.test(desteRaw)) {
      deste = 'Rider Back';
    } else if (/skat rekord/i.test(desteRaw)) {
      deste = 'SKAT Rekord';
    } else {
      deste = desteRaw.split('·')[0].trim();
    }
  }

  const desteDurumu = tableData['deste durumu'] || '';
  const kartDurumu = tableData['kart durumu'] || '';
  const kutuDurumu = tableData['kutu durumu'] || '';
  const genelDurum = tableData['genel durum'] || tableData['durum'] || tableData['condition'] || '';

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

  const yerRaw = tableData['uretim yeri'] || tableData['mense'] || tableData['yer'] || tableData['ulke'] || tableData['country'] || '';
  if (/almanya|germany|deutschland|darmstadt/i.test(yerRaw)) {
    ulke = 'Almanya';
  } else if (/abd|usa|united states|kentucky|erlanger/i.test(yerRaw)) {
    ulke = 'ABD';
  } else if (/avusturya|austria/i.test(yerRaw)) {
    ulke = 'Avusturya';
  } else if (/fransa|france/i.test(yerRaw)) {
    ulke = 'Fransa';
  } else if (/italya|italy/i.test(yerRaw)) {
    ulke = 'İtalya';
  } else if (/ingiltere|england|uk|britain/i.test(yerRaw)) {
    ulke = 'Birleşik Krallık';
  } else if (yerRaw) {
    ulke = yerRaw.split('·')[0].split(',')[0].trim();
  }

  const yilRaw = tableData['uretim yili'] || tableData['basim yili'] || tableData['yil'] || tableData['year'] || '';
  const yMatch = yilRaw.match(/\b((?:18|19|20)\d{2})\b/);
  if (yMatch) {
    basimYili = yMatch[1];
  } else if (/1970/i.test(yilRaw)) {
    basimYili = '1970';
  } else if (yilRaw) {
    basimYili = yilRaw.split('(')[0].trim();
  }

  kartSayisi = tableData['kart sayisi'] || tableData['card count'] || '';
  boyut = tableData['boyut'] || tableData['size'] || '';
  indeks = tableData['i ndeks'] || tableData['indeks'] || tableData['indis'] || tableData['index'] || '';

  const noteEl = doc.querySelector('.note p, .note');
  if (noteEl) ozet = noteEl.textContent.trim();

  return {
    code, title, subtitle, marka, deste, basimYili, ulke, durum, kartSayisi, boyut, indeks, hasImage: Boolean(image)
  };
}

['MGK001', 'MGK002', 'MGK003'].forEach(id => {
  const html = fs.readFileSync('files/' + id + '.html', 'utf8');
  console.log('Parsed', id, testWithHtml(html));
});
