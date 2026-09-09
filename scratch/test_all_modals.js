const { spawn } = require('child_process');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--user-data-dir=C:\\Users\\mertg\\AppData\\Local\\Temp\\edge_test_profile_2',
    'http://localhost:8080/'
  ]);

  try {
    let pageTab = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const listRes = await fetch('http://127.0.0.1:9224/json/list');
        const tabs = await listRes.json();
        pageTab = tabs.find(t => t.url.includes('localhost:8080'));
        if (pageTab) break;
      } catch (e) {}
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

    await send('Runtime.enable');
    await send('Page.enable');

    await new Promise(r => setTimeout(r, 4000));

    // Test each collection card click
    const collections = ['#galeri .pdf-card', '#diecast .diecast-card', '#plak .plak-card', '#banknot .pdf-card', '#allother .pdf-card'];

    for (const selector of collections) {
      const testRes = await send('Runtime.evaluate', {
        expression: `(async () => {
          const card = document.querySelector('${selector}');
          if (!card) return { status: 'card not found' };
          card.click();
          await new Promise(r => setTimeout(r, 500));
          const modal = document.getElementById('viewerModal');
          const frame = document.getElementById('viewerFrame');
          const title = document.getElementById('viewerTitle')?.textContent;
          const code = document.getElementById('viewerCollection')?.textContent;
          const res = {
            title,
            code,
            modalOpen: !modal.hidden,
            hasSrc: Boolean(frame.src),
            src: frame.src ? frame.src.substring(0, 60) : ''
          };
          closeViewer();
          return res;
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log(`[TEST ${selector}]:`, testRes.result.value);
    }

  } finally {
    proc.kill();
  }
}

run().catch(console.error);
