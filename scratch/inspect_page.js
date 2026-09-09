const { spawn } = require('child_process');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\Users\\mertg\\AppData\\Local\\Temp\\edge_test_profile',
    'http://localhost:8080/'
  ]);

  try {
    let pageTab = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const listRes = await fetch('http://127.0.0.1:9223/json/list');
        const tabs = await listRes.json();
        pageTab = tabs.find(t => t.url.includes('localhost:8080'));
        if (pageTab) break;
      } catch (e) {}
    }

    if (!pageTab) {
      console.error('Page tab not found');
      return;
    }

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params = {}) {
      const msgId = id++;
      return new Promise((resolve) => {
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.addEventListener('message', (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
      } else if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
      }
    });

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Waiting 8 seconds for page to run and load...');
    await new Promise(r => setTimeout(r, 8000));

    // Check DOM state
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          galeriCards: document.querySelectorAll('#galeri .pdf-card').length,
          diecastCards: document.querySelectorAll('#diecast .diecast-card').length,
          plakCards: document.querySelectorAll('#plak .pdf-card').length,
          banknotCards: document.querySelectorAll('#banknot .pdf-card').length,
          allotherCards: document.querySelectorAll('#allother .pdf-card').length,
          firstGaleriCardTitle: document.querySelector('#galeri .pdf-card .pdf-card-title-value, #galeri .pdf-card .card-koleksiyon-el')?.textContent,
          firstDiecastModel: document.querySelector('#diecast .diecast-card__model')?.textContent,
          firstPlakArtist: document.querySelector('#plak .plak-field-artist .pdf-card-field__value')?.textContent,
          firstBanknotField: document.querySelector('#banknot .pdf-card .pdf-card-field__value')?.textContent,
        };
      })()`,
      returnByValue: true
    });

    console.log('DOM Evaluation:', evalRes.result.value);

    // Test clicking the first card
    console.log('Clicking first card in galeri...');
    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('#galeri .pdf-card');
        if (card) { card.click(); return 'clicked'; }
        return 'no card';
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);

    await new Promise(r => setTimeout(r, 3000));

    // Check modal state
    const modalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('viewerModal');
        const frame = document.getElementById('viewerFrame');
        return {
          modalHidden: modal ? modal.hidden : null,
          frameSrc: frame ? frame.src : null,
          frameSrcdoc: frame ? frame.srcdoc : null,
        };
      })()`,
      returnByValue: true
    });
    console.log('Modal state:', modalRes.result.value);

  } finally {
    proc.kill();
  }
}

run().catch(console.error);
