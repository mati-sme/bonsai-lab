// Render the three CrazyGames cover sizes from cover.html (code-drawn art, opaque PNG, title only).
//   node tools/cover/make-covers.js <outdir>
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, '../../test/node_modules/playwright-core'));
const OUT = process.argv[2] || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  for (const [w, h] of [[1920, 1080], [800, 1200], [800, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto('file://' + path.join(__dirname, `cover.html?w=${w}&h=${h}&t=1.2`)); await p.waitForFunction(() => window.coverReady);
    const f = path.join(OUT, `cover-${w}x${h}.png`); await p.screenshot({ path: f, omitBackground: false });
    console.log(f, errs.length ? errs : 'ok'); await p.close();
  }
  await b.close();
})();
