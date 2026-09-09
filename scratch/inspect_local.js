const fs = require('fs');
const path = require('path');

function inspectFile(fileId, label) {
  const content = fs.readFileSync(path.join(__dirname, '..', 'files', fileId + '.html'), 'utf8');
  console.log('=== ' + label + ' ===');
  const title = (content.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const h1 = (content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const sub = (content.match(/class=["'](?:sub|subtitle)[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || '';
  const code = (content.match(/class=["'](?:coll-num|kod|code|collection-number)[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || '';
  console.log('Title tag:', title.trim());
  console.log('H1:', h1.replace(/<[^>]+>/g, '').trim());
  console.log('Subtitle:', sub.replace(/<[^>]+>/g, '').trim());
  console.log('Code:', code.replace(/<[^>]+>/g, '').trim());

  // Look for label / value patterns
  const labels = content.match(/class=["'](?:label|field-label|key|spec-label|info-label)[^"']*["'][^>]*>([\s\S]*?)<\//gi);
  if (labels) {
    console.log('Labels found:', labels.slice(0, 10).map(l => l.replace(/<[^>]+>/g, '').trim()));
  }

  // Look for dl / dt / dd or tables
  const trs = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (trs) {
    console.log('TR rows:', trs.slice(0, 6).map(r => r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  }

  const dts = content.match(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi);
  if (dts) {
    console.log('DT/DD:', dts.slice(0, 6).map(r => r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  }
}

inspectFile('1qtLA9X7-z8fZApZHcRqUmwblPsC8Ctn3', 'BANKNOT MGB001');
inspectFile('1qMeVr3blSJv48CE_fB1WWYq6eDNtESwJ', 'ALLOTHER MGD001');
inspectFile('1Mf77OdrwWul3PC1Gr9zLi_yAdiu_jcQC', 'ALLOTHER MGD002');
