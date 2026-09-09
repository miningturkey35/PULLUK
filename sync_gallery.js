#!/usr/bin/env node
/**
 * sync_gallery.js — Fetches new HTML files from Google Drive galeri folder,
 * extracts metadata, and appends them to data/collection_data.js.
 *
 * Usage: node sync_gallery.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const GALERI_FOLDER_ID = '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8';
const DATA_FILE = path.join(__dirname, 'data', 'collection_data.js');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60000 }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractMetadata(html) {
  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  let title = '', subtitle = '', image = '', code = '', country = '', year = '';
  let nominalDeger = '', pulTipi = '', durum = '';

  // Extract via regex (no DOMParser in Node)
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();

  const subMatch = cleanHtml.match(/<div\s+class="subtitle"[^>]*>([\s\S]*?)<\/div>/i);
  if (subMatch) subtitle = subMatch[1].replace(/<[^>]+>/g, '').trim();

  const imgMatch = cleanHtml.match(/<img\s+src="(data:image\/[^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  const kodMatch = cleanHtml.match(/<div\s+class="coll-num"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="kod"[^>]*>([\s\S]*?)<\/div>/i)
    || cleanHtml.match(/<div\s+class="collection-number"[^>]*>([\s\S]*?)<\/div>/i);
  if (kodMatch) code = kodMatch[1].replace(/<[^>]+>/g, '').trim();

  // Extract year from title
  const yearMatch = title.match(/\b(1[89]\d{2}|20[012]\d)\b/);
  if (yearMatch) year = yearMatch[1];

  // Extract nominal from title or subtitle
  const nomMatch = (title + ' ' + subtitle).match(/(\d+[.,]?\d*)\s*(kuruş|kurus|lira|TL|₺)/i);
  if (nomMatch) nominalDeger = nomMatch[0].trim();

  // Table extraction for extra fields
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const tableData = {};
  for (const row of rows) {
    const ths = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
    const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (ths.length && tds.length) {
      const k = ths[0].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const v = tds[0].replace(/<[^>]+>/g, '').trim();
      if (k && v) tableData[k] = v;
    }
  }

  if (!country && tableData['ülke']) country = tableData['ülke'];
  if (!country && tableData['country']) country = tableData['country'];
  if (!pulTipi && tableData['pul tipi']) pulTipi = tableData['pul tipi'];
  if (!durum && tableData['durum']) durum = tableData['durum'];

  return { title, subtitle, image, code, country, year, nominalDeger, pulTipi, durum };
}

function stripPatterns(str) {
  return str
    .replace(/MERT\s+GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK\s+KOLEKSİYONU/gi, '')
    .replace(/GÜVENTÜRK/gi, '')
    .replace(/KOLEKSİYON(U)?/gi, '')
    .replace(/MG[A-Z]?\s*\d+/gi, '')
    .replace(/^[\s\d\-.:|•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== PULLUK Gallery Sync ===\n');

  // 1. List all files in Drive galeri folder
  console.log('1. Listing Drive files...');
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${GALERI_FOLDER_ID}'+in+parents+and+mimeType='text/html'+and+trashed=false&fields=files(id,name,modifiedTime,size)&pageSize=200&key=${API_KEY}&orderBy=name`;
  const listRes = await fetchUrl(listUrl);
  if (listRes.status !== 200) {
    console.error('Drive API error:', listRes.status, listRes.body.substring(0, 300));
    process.exit(1);
  }
  const driveFiles = JSON.parse(listRes.body).files;
  console.log(`   Found ${driveFiles.length} HTML files in Drive\n`);

  // 2. Read existing collection_data.js
  console.log('2. Reading collection_data.js...');
  const content = fs.readFileSync(DATA_FILE, 'utf8');
  const eqIdx = content.indexOf('=');
  let jsonStr = content.substring(eqIdx + 1);
  while (jsonStr.length > 0 && '; \r\n'.includes(jsonStr[jsonStr.length - 1])) {
    jsonStr = jsonStr.substring(0, jsonStr.length - 1);
  }
  const data = JSON.parse(jsonStr);
  const existingIds = new Set(data.galeri.map(f => f.id));
  const existingCodes = new Set(data.galeri.map(f => f._code).filter(Boolean));
  console.log(`   Current gallery entries: ${data.galeri.length}\n`);

  // 3. Find new files
  const newFiles = driveFiles.filter(f => !existingIds.has(f.id));
  console.log(`3. New files to add: ${newFiles.length}`);
  if (newFiles.length === 0) {
    console.log('   Nothing to do!');
    return;
  }
  newFiles.forEach(f => console.log(`   - ${f.name} (${f.id})`));
  console.log('');

  // 4. Fetch and extract metadata for each new file
  console.log('4. Fetching metadata from Drive...');
  let added = 0;
  for (const file of newFiles) {
    try {
      console.log(`   Fetching ${file.name}...`);
      const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
      const mediaRes = await fetchUrl(mediaUrl);
      if (mediaRes.status !== 200) {
        console.log(`   ⚠ ${file.name}: HTTP ${mediaRes.status} — skipping`);
        continue;
      }
      const html = mediaRes.body;
      const meta = extractMetadata(html);

      // Determine code from filename or extracted
      const codeMatch = file.name.match(/(MG\d+)/i);
      const code = meta.code || (codeMatch ? codeMatch[1].toUpperCase() : file.name.replace('.html', '').toUpperCase());

      // Skip if code already exists
      if (existingCodes.has(code)) {
        console.log(`   ⚠ ${file.name}: code ${code} already exists — skipping`);
        continue;
      }

      // Clean title
      let cleanTitle = stripPatterns(meta.title);
      let cleanSubtitle = stripPatterns(meta.subtitle);

      const entry = {
        id: file.id,
        name: file.name,
        mimeType: 'text/html',
        _title: cleanTitle || file.name.replace('.html', ''),
        _subtitle: cleanSubtitle || '',
        _image: meta.image || '',
        _code: code,
        _country: meta.country || 'Türkiye Cumhuriyeti',
        _year: meta.year || '',
        _nominalDeger: meta.nominalDeger || '',
        _pulTipi: meta.pulTipi || 'Posta Pulu',
        _durum: meta.durum || '',
        _katalogNo: code,
        webViewLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
        modifiedTime: file.modifiedTime || new Date().toISOString()
      };

      data.galeri.push(entry);
      existingCodes.add(code);
      added++;
      console.log(`   ✓ ${file.name}: "${cleanTitle}" [${code}]`);
    } catch (err) {
      console.error(`   ✗ ${file.name}: ${err.message}`);
    }
  }

  if (added === 0) {
    console.log('\n   No new entries added.');
    return;
  }

  // 5. Write back to collection_data.js
  console.log(`\n5. Writing ${added} new entries to collection_data.js...`);
  const prefix = content.substring(0, eqIdx + 1); // "window.PULLUK_COLLECTION_DATA ="
  const newJson = JSON.stringify(data);
  const newContent = prefix + newJson + ';\n';
  fs.writeFileSync(DATA_FILE, newContent, 'utf8');
  console.log(`   ✓ Done! Gallery now has ${data.galeri.length} entries.\n`);
  console.log('   Run "git add data/collection_data.js && git commit && git push" to deploy.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
