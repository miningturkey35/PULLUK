const fs = require('fs');
const path = require('path');

function check(f) {
  const c = fs.readFileSync(path.join(__dirname, '..', 'files', f), 'utf8');
  const h1 = (c.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const h2 = (c.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || '';
  const sub = (c.match(/class=["'](?:sub|subtitle|lead|desc)[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || '';
  const title = (c.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  console.log(f, '=> H1:', h1.replace(/<[^>]+>/g, '').trim(), '| H2:', h2.replace(/<[^>]+>/g, '').trim(), '| Sub:', sub.replace(/<[^>]+>/g, '').trim(), '| Title:', title.trim());
}

['MG0001.html', 'MG0002.html', 'MG0003.html', 'MGC001.html', 'MGM002.html', 'MGM003.html', 'MGR001.html', 'MGZ001.html'].forEach(check);
