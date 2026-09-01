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

    // Extract key parts
    const titleMatch = html.match(/<title>(.*?)<\/title>/s);
    const kodMatch = html.match(/class="kod"[^>]*>(.*?)<\//s);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
    const h2Match = html.match(/<h2[^>]*class="title"[^>]*>(.*?)<\/h2>/s);
    const subMatch = html.match(/class="subtitle"[^>]*>(.*?)<\//s);

    console.log('title:', titleMatch ? titleMatch[1].trim() : '(none)');
    console.log('.kod:', kodMatch ? kodMatch[1].trim() : '(none)');
    console.log('h1:', h1Match ? h1Match[1].trim().substring(0, 100) : '(none)');
    console.log('h2.title:', h2Match ? h2Match[1].trim() : '(none)');
    console.log('.subtitle:', subMatch ? subMatch[1].trim() : '(none)');

    // Extract data table rows
    const rows = html.match(/<tr[^>]*>(.*?)<\/tr>/gs);
    if (rows) {
      console.log('--- Data rows ---');
      rows.slice(0, 10).forEach(r => {
        const cells = r.match(/<td[^>]*>(.*?)<\/td>/gs);
        if (cells && cells.length >= 2) {
          const key = cells[0].replace(/<[^>]+>/g, '').trim();
          const val = cells[1].replace(/<[^>]+>/g, '').trim();
          if (key) console.log(`  ${key}: ${val}`);
        }
      });
    }

    // Find all images
    const imgs = html.match(/src="(https:\/\/[^"]+)"/g);
    if (imgs) {
      console.log(`Images: ${imgs.length}`);
      imgs.slice(0, 3).forEach(img => console.log('  ' + img.substring(0, 100)));
    }
  }
}

main().catch(console.error);
