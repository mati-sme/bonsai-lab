const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1104, height: 1200 } });
  p.on('console', (m) => console.log(m.type(), m.text())); p.on('pageerror', (e) => console.log('ERR', e.message));
  for (const s of [72, 24]) {
    await p.goto('file://' + __dirname + '/../tools/icon-sheet.html?s=' + s); await p.waitForFunction(() => document.title === 'done');
    await p.locator('#c').screenshot({ path: process.argv[2] + '-' + s + '.png' });
  }
  await b.close();
})();
