const fs = require('fs');

const collectionJsonPath = 'data/collection_data.json';
const collectionJsPath = 'data/collection_data.js';

const data = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf8'));
const iskambilCompiled = JSON.parse(fs.readFileSync('scratch/iskambil_compiled.json', 'utf8'));

// Attach iskambil
data.iskambil = iskambilCompiled;

// Verify basilsanat MGP002 has image and all fields
if (data.basilsanat) {
  const mgp002 = data.basilsanat.find(b => b.name && b.name.includes('MGP002'));
  if (mgp002) {
    console.log('MGP002 verification:', {
      name: mgp002.name,
      _code: mgp002._code,
      _title: mgp002._title,
      _tur: mgp002._tur,
      _yazar: mgp002._yazar,
      _yayinevi: mgp002._yayinevi,
      _basimYili: mgp002._basimYili,
      _durum: mgp002._durum,
      hasImage: Boolean(mgp002._image),
      imgLen: mgp002._image ? mgp002._image.length : 0
    });
  } else {
    console.warn('MGP002 not found in basilsanat!');
  }
}

// Write collection_data.json
fs.writeFileSync(collectionJsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Updated data/collection_data.json successfully');

// Write collection_data.js
const jsContent = `/* PULLUK Precompiled Collection Data */\nwindow.PULLUK_COLLECTION_DATA = ${JSON.stringify(data)};\n`;
fs.writeFileSync(collectionJsPath, jsContent, 'utf8');
console.log('Updated data/collection_data.js successfully');
