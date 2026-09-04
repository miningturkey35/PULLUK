const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg';

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

function parseDiecastItem(file, html) {
  const table = html ? extractDiecastDataFromHtml(html) : {};

  // Katalog Kodu
  const codeMatch = html ? html.match(/class="kod"[^>]*>([\s\S]*?)<\//i) : null;
  const rawCode = (codeMatch ? codeMatch[1].replace(/<[^>]+>/g, '').trim() : '') || table['Katalog Kodu'] || table['Katalog No'] || file.name.replace(/\.\w+$/, '');

  // Brand
  let brand = table['Marka / Üretici'] || table['Marka / Seri'] || table['Marka'] || table['Üretici'] || '';
  if (brand.includes('(')) {
    // e.g. Matchbox (Mattel) -> MATCHBOX
    brand = brand.split('(')[0].trim();
  }
  if (brand.toLowerCase().includes('lesney')) brand = 'MATCHBOX / LESNEY';
  if (!brand) brand = 'DIE-CAST';

  // Model
  let model = table['Araç'] || table['Model'] || table['Model / Casting'] || table['Model Adı'] || '';
  if (!model) model = file.name.replace(/\.\w+$/, '');

  // Scale
  let scale = table['Ölçek (yaklaşık)'] || table['Ölçek'] || table['Scale'] || '';
  if (!scale) {
    const sm = (html || '').match(/1:\d+/);
    if (sm) scale = sm[0];
    else scale = '1:64';
  }

  // Year / Period
  let year = table['Üretim Yılı'] || table['Dönem'] || table['Üretim Yılı (yaklaşık)'] || table['Yıl'] || '';
  if (year.length > 25) {
    const ym = year.match(/\b(19|20)\d{2}\b/);
    if (ym) year = ym[0];
  }

  // Origin / Menşei
  let origin = table['Menşei'] || table['Üretim Yeri'] || '';
  origin = origin.replace(/Made in\s*/i, '').replace(/İngiltere\s*\((.*?)\)/i, 'İngiltere').trim();

  // Series / Casting
  let series = table['Seri / Numara'] || table['Seri'] || table['Model No.'] || table['Model Kodu'] || table['Seri / Tip'] || '';
  if (series.length > 30) series = series.substring(0, 30) + '…';

  // Material
  let material = table['Malzeme'] || table['Gövde'] || 'Diecast Metal';
  if (material.toLowerCase().includes('metal') || material.toLowerCase().includes('die-cast') || material.toLowerCase().includes('diecast')) {
    material = 'Diecast Metal';
  }

  // Livery / Extra
  let extra = table['Livery'] || table['Renk'] || table['Durum'] || '';
  if (extra.length > 28) extra = extra.substring(0, 28) + '…';

  return { code: rawCode, brand: brand.toUpperCase(), model, scale, year, origin, series, material, extra };
}

async function main() {
  const q = `'${FOLDER_ID}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&key=${API_KEY}&orderBy=name`;
  const res = await fetch(url);
  const data = await res.json();
  for (const f of data.files) {
    const cRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`);
    const h = await cRes.text();
    const item = parseDiecastItem(f, h);
    console.log(item);
  }
}

main().catch(console.error);
