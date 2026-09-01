const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'app.js');

let content = fs.readFileSync(appPath, 'latin1');

// Find markers using simple text
const idx1 = content.lastIndexOf('function initBackToTop');
if (idx1 === -1) { console.log('ERROR: initBackToTop not found'); process.exit(1); }

// Find MAIN INIT comment by searching for just the text
const idx2 = content.indexOf('MAIN INIT');
if (idx2 === -1) { console.log('ERROR: MAIN INIT not found'); process.exit(1); }

// Find closing brace of initBackToTop
let braceCount = 0;
let braceStart = content.indexOf('{', idx1);
let funcEnd = -1;
for (let i = braceStart; i < idx2; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) { funcEnd = i; break; }
  }
}

if (funcEnd === -1) { console.log('ERROR: closing brace not found'); process.exit(1); }

console.log('initBackToTop ends at index', funcEnd);
console.log('MAIN INIT starts at index', idx2);
console.log('Garbage bytes:', idx2 - funcEnd - 1);

// Show what's between them
const garbage = content.substring(funcEnd + 1, idx2);
console.log('Garbage hex:', Buffer.from(garbage, 'latin1').toString('hex'));

// Rebuild: keep everything before garbage + clean transition + everything from MAIN INIT onwards
const cleaned = content.substring(0, funcEnd + 1) + '\r\n\r\n' + content.substring(idx2);

fs.writeFileSync(appPath, cleaned, 'latin1');
console.log('SUCCESS: app.js fixed!');
console.log('Old size:', content.length, 'New size:', cleaned.length);
