const https = require('https');

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8'; // galeri

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data.substring(0, 500) }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== TEST 1: Drive API v3 — files.list ===');
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType)&pageSize=100&key=${API_KEY}&orderBy=name`;
  const listRes = await fetchJson(listUrl);
  console.log('Status:', listRes.status);
  if (listRes.data && listRes.data.files) {
    console.log('Total files:', listRes.data.files.length);
    // Find files NOT in collection_data.js (new files)
    const knownNames = ['MG0001.html','MG0002.html','MG0003.html','MG0004.html','MG0005.html',
      'MG0006.html','MG0007.html','MG0008.html','MG0009.html','MG0010.html','MG0011.html',
      'MG0012.html','MG0013.html','MG0014.html','MG0015.html','MG0016.html','MG0017.html',
      'MG0018.html','MG0019.html','MG0020.html','MG0021.html','MG0022.html','MG0023.html',
      'MG0024.html','MG0025.html','MG0026.html','MG0027.html','MG0028.html','MG0029.html',
      'MG0030.html','MG0031.html','MG0032.html','MG0033.html','MG0034.html','MG0035.html',
      'MG0036.html','MG0037.html','MG0038.html','MG0039.html','MG0040.html','MG0041.html',
      'MG0042.html','MG0043.html','MG0044.html','MG0045.html','MG0046.html','MG0047.html','MG0048.html'];
    const newFiles = listRes.data.files.filter(f => !knownNames.includes(f.name));
    console.log('New files (not in collection_data.js):', newFiles.length);
    newFiles.forEach(f => console.log(`  ${f.name} (${f.id.substring(0,12)}...)`));
  } else {
    console.log('Raw:', JSON.stringify(listRes).substring(0, 500));
  }

  console.log('\n=== TEST 2: alt=media for a NEW file ===');
  if (listRes.data && listRes.data.files) {
    const knownNames = ['MG0001.html','MG0002.html','MG0003.html','MG0004.html','MG0005.html',
      'MG0006.html','MG0007.html','MG0008.html','MG0009.html','MG0010.html','MG0011.html',
      'MG0012.html','MG0013.html','MG0014.html','MG0015.html','MG0016.html','MG0017.html',
      'MG0018.html','MG0019.html','MG0020.html','MG0021.html','MG0022.html','MG0023.html',
      'MG0024.html','MG0025.html','MG0026.html','MG0027.html','MG0028.html','MG0029.html',
      'MG0030.html','MG0031.html','MG0032.html','MG0033.html','MG0034.html','MG0035.html',
      'MG0036.html','MG0037.html','MG0038.html','MG0039.html','MG0040.html','MG0041.html',
      'MG0042.html','MG0043.html','MG0044.html','MG0045.html','MG0046.html','MG0047.html','MG0048.html'];
    const newFile = listRes.data.files.find(f => !knownNames.includes(f.name));
    if (newFile) {
      console.log(`Testing alt=media for: ${newFile.name}`);
      const mediaUrl = `https://www.googleapis.com/drive/v3/files/${newFile.id}?alt=media&key=${API_KEY}`;
      const mediaRes = await fetchJson(mediaUrl);
      console.log('Status:', mediaRes.status);
      if (mediaRes.raw) {
        console.log('Response:', mediaRes.raw.substring(0, 300));
      } else if (mediaRes.data) {
        console.log('Is JSON (error?):', JSON.stringify(mediaRes.data).substring(0, 300));
      }
    } else {
      console.log('No new files found');
    }
  }

  console.log('\n=== TEST 3: API key validity ===');
  const testUrl = `https://www.googleapis.com/drive/v3/about?key=${API_KEY}&fields=user`;
  const aboutRes = await fetchJson(testUrl);
  console.log('Status:', aboutRes.status);
  if (aboutRes.data) console.log('Response:', JSON.stringify(aboutRes.data).substring(0, 300));
}

main().catch(console.error);
