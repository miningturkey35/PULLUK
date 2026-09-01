// Fix invisible garbage characters in app.js between initBackToTop and MAIN INIT
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'app.js');

let content = fs.readFileSync(appPath, 'latin1'); // latin1 preserves all bytes

// Find the boundary: after initBackToTop closing brace, before MAIN INIT comment
const marker1 = 'function initBackToTop() {';
const idx1 = content.lastIndexOf(marker1);
const marker2 = '// \u2500\u2500\u2500 MAIN INIT';
const idx2 = content.indexOf(marker2);

if (idx1 === -1 || idx2 === -1) {
  console.log('ERROR: Could not find markers. idx1=' + idx1 + ' idx2=' + idx2);
  process.exit(1);
}

// Find the closing brace of initBackToTop after its definition
let braceCount = 0;
let braceStart = content.indexOf('{', idx1);
let funcEnd = -1;
for (let i = braceStart; i < idx2; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      funcEnd = i;
      break;
    }
  }
}

if (funcEnd === -1) {
  console.log('ERROR: Could not find closing brace');
  process.exit(1);
}

const funcText = content.substring(idx1, funcEnd + 1);
const cleanSection = funcText + '\r\n\r\n' + marker2 + content.substring(idx2 + marker2.length);

// Verify no stray characters
const hasGarbage = /heroStampPool|rotateHeroStamps|startHeroStampRotation|extractFirstImageSrc|resolveHeroImgSrc|loadHeroStampImages/.test(cleanSection);
if (hasGarbage) {
  console.log('WARNING: Still has hero references!');
}

fs.writeFileSync(appPath, cleanSection, 'utf8');
console.log('SUCCESS: app.js fixed! Removed ' + (idx2 - funcEnd - 1) + ' bytes of garbage.');
console.log('Function ends at byte ' + funcEnd + ', MAIN INIT starts at byte ' + idx2);
