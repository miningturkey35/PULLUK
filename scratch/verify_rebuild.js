const { execSync } = require('child_process');
const fs = require('fs');

function parse(content) {
  const eq = content.indexOf('=');
  let json = content.substring(eq + 1);
  while (json.length > 0 && '; \r\n'.includes(json[json.length - 1])) json = json.slice(0, -1);
  return JSON.parse(json);
}

const oldData = parse(execSync('git show HEAD:data/collection_data.js', { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8', cwd: require('path').join(__dirname, '..') }));
const newData = parse(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'collection_data.js'), 'utf8'));

for (const sec of Object.keys(newData)) {
  const o = oldData[sec] || [];
  const n = newData[sec] || [];
  const oNames = new Set(o.map(e => e.name));
  const nNames = new Set(n.map(e => e.name));
  const added = [...nNames].filter(x => !oNames.has(x));
  const removed = [...oNames].filter(x => !nNames.has(x));
  if (added.length || removed.length || o.length !== n.length) {
    console.log(`${sec}: ${o.length} -> ${n.length} | added: [${added.join(', ')}] | removed: [${removed.join(', ')}]`);
  }
}

const find = (d, sec, name) => (d[sec] || []).find(e => e.name === name);
for (const [sec, name] of [['basilsanat', 'MGP003.html'], ['plak', 'MGV002.html'], ['plak', 'MGV003.html'], ['basilsanat', 'MGP034.html']]) {
  const e = find(newData, sec, name);
  if (!e) { console.log(`MISSING ${sec}/${name}`); continue; }
  const { id, name: n2, mimeType, modifiedTime, webViewLink, ...fields } = e;
  const trimmed = {};
  for (const [k, v] of Object.entries(fields)) trimmed[k] = typeof v === 'string' && v.length > 70 ? v.slice(0, 70) + `...(${v.length})` : v;
  console.log(`\n${sec}/${name}: ${JSON.stringify(trimmed, null, 1)}`);
}

console.log('\nold allother:', (oldData.allother || []).map(e => `${e.name} [${e.mimeType}]`).join(' | '));
console.log('new allother:', (newData.allother || []).map(e => `${e.name} [${e.mimeType}]`).join(' | '));
console.log('galeri MG0050 count old/new:', (oldData.galeri || []).filter(e => e.name === 'MG0050.html').length, '/', (newData.galeri || []).filter(e => e.name === 'MG0050.html').length);
