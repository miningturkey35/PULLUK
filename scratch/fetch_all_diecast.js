const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg';

async function main() {
  const q = `'${FOLDER_ID}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=20&key=${API_KEY}&orderBy=name`;
  const res = await fetch(url);
  const data = await res.json();

  for (const f of data.files) {
    if (!f.name.endsWith('.html')) continue;
    console.log(`\n========== ${f.name} ==========`);
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`);
    const html = await contentRes.text();

    // Extract ALL table rows with both cells
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (rows) {
      console.log('--- ALL DATA ROWS ---');
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (cells && cells.length >= 2) {
          const key = cells[0].replace(/<[^>]+>/g, '').trim();
          const val = cells[1].replace(/<[^>]+>/g, '').trim();
          if (key) console.log(`  "${key}" => "${val}"`);
        }
      }
    }

    // Also extract title, h1, h2, subtitle, kod
    const titleMatch = html.match(/<title>(.*?)<\/title>/s);
    const kodMatch = html.match(/class="kod"[^>]*>([\s\S]*?)<\//);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const h2Match = html.match(/<h2[^>]*class="title"[^>]*>([\s\S]*?)<\/h2>/);
    const subMatch = html.match(/class="subtitle"[^>]*>([\s\S]*?)<\//);

    console.log('--- ELEMENTS ---');
    console.log('  title:', titleMatch ? titleMatch[1].trim() : '(none)');
    console.log('  .kod:', kodMatch ? kodMatch[1].trim() : '(none)');
    console.log('  h1:', h1Match ? h1Match[1].trim().substring(0, 80) : '(none)');
    console.log('  h2.title:', h2Match ? h2Match[1].trim() : '(none)');
    console.log('  .subtitle:', subMatch ? subMatch[1].trim() : '(none)');
  }
}

main().catch(console.error);
