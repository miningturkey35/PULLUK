const fs = require('fs');

['MGK001', 'MGK002', 'MGK003'].forEach(name => {
  const html = fs.readFileSync(`scratch/${name}.html`, 'utf8');
  const imgM = html.match(/class=["'][^"']*\bhero\b[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i)
    || html.match(/<img[^>]+src=["']([^"']+)["']/i);
  console.log(name, 'img found:', Boolean(imgM), 'len:', imgM ? imgM[1].length : 0);
});
