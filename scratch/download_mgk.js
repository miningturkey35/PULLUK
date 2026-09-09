const https = require('https');
const fs = require('fs');
const path = require('path');

const key = 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs';
const items = [
  { id: '1kAnGL5g5FF3ySlCTS-wEtH6tGcDXRzyn', name: 'MGK001' },
  { id: '1ocbG1KKXJ7yZ2GBC44BQHxCNNBG6xKbU', name: 'MGK002' },
  { id: '1pJKNTglrEGFzn0XMJ_psCV8oREioAeLh', name: 'MGK003' }
];

let done = 0;
items.forEach(item => {
  const url = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media&key=${key}`;
  https.get(url, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      const p1 = path.join(__dirname, '..', 'files', `${item.id}.html`);
      const p2 = path.join(__dirname, '..', 'files', `${item.name}.html`);
      const p3 = path.join(__dirname, `${item.name}.html`);
      fs.writeFileSync(p1, body, 'utf8');
      fs.writeFileSync(p2, body, 'utf8');
      fs.writeFileSync(p3, body, 'utf8');
      console.log(`Saved ${item.name} (${body.length} bytes)`);
      done++;
      if (done === items.length) {
        console.log('All files saved!');
      }
    });
  });
});
