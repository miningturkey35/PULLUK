const fs = require('fs');
const path = require('path');
const { extractAllInfo, FOLDERS, API_KEY, ROOT, DATA_DIR } = require('./generate_collection_data');

const FILES_DIR = path.join(ROOT, 'files');

async function run() {
  const folderId = FOLDERS['banknot'];
  const q = `'${folderId}' in parents and trashed=false`;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&pageSize=1000&key=${API_KEY}&orderBy=name`);
  const d = await res.json();
  const files = d.files || [];

  const jsonPath = path.join(DATA_DIR, 'collection_data.json');
  const all = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  all.banknot = [];

  for (const file of files) {
    const filePath = path.join(FILES_DIR, `${file.id}.html`);
    let html = '';
    if (fs.existsSync(filePath)) html = fs.readFileSync(filePath, 'utf8');
    else console.warn(`Missing local file for ${file.name} (${file.id}) — run download_all.js first`);

    const parsed = extractAllInfo(file.id, file.name, 'banknot', html);
    parsed.webViewLink = file.webViewLink;
    parsed.modifiedTime = file.modifiedTime;
    all.banknot.push(parsed);
    console.log(`[banknot] ${file.name}: title="${parsed._title}", sub="${parsed._subtitle}", year="${parsed._year}", nominal="${parsed._nominalDeger}", durum="${parsed._durum}", katalog="${parsed._katalogNo}", img=${Boolean(parsed._image)}`);
  }

  const jsContent = `/* PULLUK Precompiled Collection Data */\nwindow.PULLUK_COLLECTION_DATA = ${JSON.stringify(all, null, 2)};\n`;
  fs.writeFileSync(path.join(DATA_DIR, 'collection_data.js'), jsContent, 'utf8');
  console.log('Saved data/collection_data.js');
  fs.writeFileSync(jsonPath, JSON.stringify(all, null, 2), 'utf8');
  console.log('Saved data/collection_data.json');
}

run().catch(console.error);
