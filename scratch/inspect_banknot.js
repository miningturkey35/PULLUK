const fs = require('fs');
const files = [
  ['1uGM_wyBrZaNsDX6wsfhupkl0Qaj8uE1s', 'MGB002'],
  ['1Ad9Qr5QcrksKR4Q8reH6DsN02TxVYAGG', 'MGB003'],
  ['1z3IEIG4UvWM44BsB73cQEU4U6td0Z3g6', 'MGB004'],
  ['1qtLA9X7-z8fZApZHcRqUmwblPsC8Ctn3', 'MGB001'],
];
for (const [id, name] of files) {
  const h = fs.readFileSync(require('path').join(__dirname, '..', 'files', id + '.html'), 'utf8');
  console.log('=== ' + name);
  const h1 = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const sub = h.match(/class=["'](?:sub|subtitle|lead)[^"']*["'][^>]*>([\s\S]*?)<\//i);
  console.log('H1:', h1 ? h1[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '(none)');
  console.log('SUB:', sub ? sub[1].replace(/<[^>]+>/g, ' ').trim() : '(none)');
  const meta = h.match(/<div[^>]*class="[^"]*meta-item[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
  for (const m of meta) {
    const l = (m.match(/meta-label[^>]*>([\s\S]*?)</i) || [])[1];
    const v = (m.match(/meta-value[^>]*>([\s\S]*?)</i) || [])[1];
    if (l && v) console.log('M| ' + l.replace(/<[^>]+>/g, '').trim() + ': ' + v.replace(/<[^>]+>/g, ' ').trim());
  }
  const trs = h.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const th = tr.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const td = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (th && td) console.log('T| ' + th[1].replace(/<[^>]+>/g, '').trim() + ': ' + td[1].replace(/<[^>]+>/g, ' ').trim());
  }
}
