// Remove garbage lines between initBackToTop and MAIN INIT
const fs = require('fs');
const appPath = __dirname + '/../app.js';
let c = fs.readFileSync(appPath, 'utf8');

// Find the garbage section between initBackToTop closing and MAIN INIT
const before = '  });\r\n}\r\n';
const after = '// \u2500\u2500\u2500 MAIN INIT';

const beforeIdx = c.lastIndexOf(before);
const afterIdx = c.indexOf(after, beforeIdx);

if (beforeIdx !== -1 && afterIdx !== -1 && afterIdx > beforeIdx) {
  const clean = before + '\r\n' + after;
  c = c.substring(0, beforeIdx) + clean + c.substring(afterIdx + after.length);
  fs.writeFileSync(appPath, c, 'utf8');
  console.log('Fixed! Removed ' + (afterIdx - beforeIdx - before.length) + ' bytes of garbage');
} else {
  console.log('Could not find boundaries:', beforeIdx, afterIdx);
}
