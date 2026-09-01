const API_KEY = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const FOLDER_ID = '1SDvXKhh92xPO1Jd-wZccqDdxGy8Ghygg';

async function main() {
  const q = `'${FOLDER_ID}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,description,size)&pageSize=20&key=${API_KEY}&orderBy=name`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.files) {
    console.log(`Found ${data.files.length} files:\n`);
    data.files.forEach((f, i) => {
      console.log(`${i+1}. name: ${f.name}`);
      console.log(`   mimeType: ${f.mimeType}`);
      console.log(`   description: ${(f.description || '(none)').substring(0, 120)}`);
      console.log(`   size: ${f.size || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('Error:', JSON.stringify(data, null, 2));
  }

  // Also fetch content of first HTML file to see structure
  const htmlFile = data.files ? data.files.find(f => f.mimeType === 'text/html' || f.name.endsWith('.html')) : null;
  if (htmlFile) {
    console.log(`\n--- Content of first HTML file: ${htmlFile.name} ---`);
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${htmlFile.id}?alt=media&key=${API_KEY}`);
    const html = await contentRes.text();
    console.log(html.substring(0, 2000));
  } else {
    console.log('\nNo HTML files found. Checking first file content...');
    if (data.files && data.files.length > 0) {
      const f = data.files[0];
      console.log(`First file: ${f.name} (${f.mimeType})`);
      if (f.mimeType === 'text/html' || f.name.endsWith('.html') || f.mimeType === 'image/jpeg' || f.mimeType === 'image/png') {
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`);
        if (f.mimeType.startsWith('image/')) {
          console.log('(Binary image - cannot display as text)');
        } else {
          const html = await contentRes.text();
          console.log(html.substring(0, 2000));
        }
      }
    }
  }
}

main().catch(console.error);
