const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg';

async function main() {
  const q = `'${FOLDER_ID}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,description,size)&pageSize=20&key=${API_KEY}&orderBy=name`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.files) {
    console.log(`Found ${data.files.length} files:\n`);
    for (const f of data.files) {
      const cRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`);
      const h = await cRes.text();
      console.log(`\n=== FILE: ${f.name} ===`);
      const m = h.match(/<table[\s\S]*?<\/table>/i);
      if (m) console.log(m[0]);
    }
  } else {
    console.log('Error:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
