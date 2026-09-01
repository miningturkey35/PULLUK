// Read app.js, remove hero stamp section, write back
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');
const originalLength = content.length;

// 1. Remove entire hero stamp section (from comment to just before MAIN INIT)
const heroStart = content.indexOf('// ─── HERO STAMP IMAGES');
const heroEnd = content.indexOf('// ─── MAIN INIT');
if (heroStart !== -1 && heroEnd !== -1) {
  content = content.substring(0, heroStart) + content.substring(heroEnd);
  console.log('Removed hero stamp section (' + (heroEnd - heroStart) + ' chars)');
} else {
  console.log('Could not find hero section boundaries:', heroStart, heroEnd);
}

// 2. Remove loadHeroStampImages() call from init()
content = content.replace(/\s*\/\/ Load featured stamp images.*\n\s*loadHeroStampImages\(\);\s*\n/g, '\n');

// 3. Remove any remaining hero references
content = content.replace(/\s*heroStampPool\s*=\s*\[\];\s*/g, '');
content = content.replace(/\s*heroStampOffset\s*=\s*0;\s*/g, '');

// Write back
fs.writeFileSync(appPath, content, 'utf8');
console.log('app.js: ' + originalLength + ' -> ' + content.length + ' chars');
