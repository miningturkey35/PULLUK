const fs = require('fs');

['MGK001', 'MGK002', 'MGK003'].forEach(name => {
  const content = fs.readFileSync(`scratch/${name}.html`, 'utf8');
  console.log(`\n================== ${name} ==================`);
  // Look for headings, badges, classes
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const mainTitle = content.match(/class=["'][^"']*\bmain-title\b[^"']*["'][^>]*>([\s\S]*?)<\//i);
  const code = content.match(/class=["'][^"']*\b(?:col-num|coll-num|kod)\b[^"']*["'][^>]*>([\s\S]*?)<\//i);
  const subtitle = content.match(/class=["'][^"']*\bsubtitle\b[^"']*["'][^>]*>([\s\S]*?)<\//i);
  console.log('Title:', h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : (mainTitle ? mainTitle[1].replace(/<[^>]+>/g, '').trim() : 'NONE'));
  console.log('Code:', code ? code[1].replace(/<[^>]+>/g, '').trim() : 'NONE');
  console.log('Subtitle:', subtitle ? subtitle[1].replace(/<[^>]+>/g, '').trim() : 'NONE');

  // Extract all table rows (th/td and td/td)
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  const rows = [];
  while ((m = trRegex.exec(content)) !== null) {
    const row = m[1];
    const th = (row.match(/<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1];
    const tds = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(x => x[1]);
    if (th && tds.length > 0) {
      rows.push(th.replace(/<[^>]+>/g, '').trim() + ' ===> ' + tds[0].replace(/<[^>]+>/g, '').trim());
    } else if (tds.length >= 2) {
      rows.push(tds[0].replace(/<[^>]+>/g, '').trim() + ' ===> ' + tds[1].replace(/<[^>]+>/g, '').trim());
    }
  }
  console.log('Rows (first 15):');
  console.log(rows.slice(0, 15).join('\n'));
});
