const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDERS = {
  'galeri': '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8',
  'diecast': '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg',
  'plak': '13FPeN7gTD3SjbUB6ENIfaJ4OVa6rYqd0',
  'banknot': '1ffJ9xKTsrKpaM3OcJ0fRU4ggcRRmKBdL',
  'allother': '1mmPvVEreFr0cbXjX3Ds21FOsZI9cRaH0',
  'legoverse': '1cJpRJ_B7wbHOJ69oYzI6JYWQdbabkLx4'
};

const FILES_DIR = path.join(__dirname, '..', 'files');
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

function downloadFile(fileId, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
    return Promise.resolve(fs.statSync(destPath).size);
  }

  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
    https.get(url, { timeout: 30000 }, (res) => {
      const handleRedirect = (loc) => {
        https.get(loc, { timeout: 30000 }, (res2) => {
          if (res2.statusCode >= 300 && res2.statusCode < 400 && res2.headers.location) {
            handleRedirect(res2.headers.location);
            return;
          }
          if (res2.statusCode !== 200) {
            return reject(new Error(`Status ${res2.statusCode}`));
          }
          const fileStream = fs.createWriteStream(destPath);
          res2.pipe(fileStream);
          fileStream.on('finish', () => resolve(fs.statSync(destPath).size));
          fileStream.on('error', reject);
        }).on('error', reject);
      };

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        handleRedirect(res.headers.location);
      } else if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => resolve(fs.statSync(destPath).size));
        fileStream.on('error', reject);
      } else {
        reject(new Error(`Initial status ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching file list from Drive API...');
  const allFilesMap = {};

  for (const [folderKey, folderId] of Object.entries(FOLDERS)) {
    const q = `'${folderId}' in parents and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&pageSize=1000&key=${API_KEY}&orderBy=name`);
    const data = await res.json();
    allFilesMap[folderKey] = data.files || [];
    console.log(`Folder ${folderKey}: ${allFilesMap[folderKey].length} files`);
  }

  let totalDownloaded = 0;
  for (const [folderKey, files] of Object.entries(allFilesMap)) {
    console.log(`Downloading ${folderKey}...`);
    for (const file of files) {
      const dest = path.join(FILES_DIR, `${file.id}.html`);
      try {
        const sz = await downloadFile(file.id, dest);
        totalDownloaded++;
        console.log(`[${totalDownloaded}] Saved ${file.name} (${file.id}) - ${sz} bytes`);
      } catch (err) {
        console.error(`Failed to download ${file.name} (${file.id}):`, err.message);
      }
      // Small delay between requests to prevent aggressive rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`Finished downloading. Total files in files/: ${fs.readdirSync(FILES_DIR).length}`);
}

main().catch(console.error);
