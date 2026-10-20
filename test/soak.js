// Soak test: a whole season driven by the real requestAnimationFrame loop at ?speed=20 with a light bot (no manual ticks).
// node test/soak.js   -> checks no errors, season ends via the normal UI path, reports average frame time.
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html') + '?speed=20');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  await page.click('#btnGo', { force: true });
  await page.evaluate(() => {
    window.__ft = []; let last = performance.now();
    const f = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
    window.__bot = setInterval(() => { const B = window.__bl; if (B.run && !B.run.over) { B.C.botThink(B.run); } }, 400);
  });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 120000 });
  const r = await page.evaluate(() => ({ res: window.__bl.meta.history[0], ft: window.__ft.slice(10).reduce((a, x) => a + x, 0) / (window.__ft.length - 10) }));
  console.log('season:', JSON.stringify(r.res), 'avg frame ms:', r.ft.toFixed(1), 'errors:', errors.length ? errors : 'none');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})();
