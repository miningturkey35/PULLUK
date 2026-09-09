const fs = require('fs');

['MGK001', 'MGK002', 'MGK003'].forEach(id => {
  const html = fs.readFileSync('files/' + id + '.html', 'utf8');
  const titleM = html.match(/<title>([^<]+)<\/title>/i);
  const h1M = html.match(/<h1>([^<]+)<\/h1>/i);
  const subM = html.match(/class=["']subtitle["'][^>]*>([^<]+)</i);
  const codeM = html.match(/class=["']coll-num["'][^>]*>([^<]+)</i);
  console.log(id, {
    title: titleM ? titleM[1].trim() : '',
    h1: h1M ? h1M[1].trim() : '',
    sub: subM ? subM[1].trim() : '',
    code: codeM ? codeM[1].trim() : ''
  });
});
