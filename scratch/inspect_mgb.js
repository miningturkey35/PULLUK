const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'files', '1qtLA9X7-z8fZApZHcRqUmwblPsC8Ctn3.html'), 'utf8');
const noBase64 = content.replace(/data:image\/[^;]+;base64,[^"']+/g, 'IMG_BASE64');
const noStyle = noBase64.replace(/<style[\s\S]*?<\/style>/gi, '');
console.log(noStyle.slice(0, 3000));
