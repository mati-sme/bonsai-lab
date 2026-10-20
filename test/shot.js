// Quick screenshots: node test/shot.js [outdir]  (loads index.html over file://)
const { chromium } = require('playwright-core');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [{ n: 'desk', o: { viewport: { width: 1280, height: 720 } } }, { n: 'phone', o: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } }]) {
    const ctx = await browser.newContext(vp.o); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL + '?speed=4'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.n}-home.png` });
    await page.click('#btnGo', { force: true }); await page.waitForTimeout(300);
    await page.evaluate(() => { const b = window.__bl; b.C.buyPrinter(b.run, 1, 'kestrel'); b.run.money += 600; b.C.buyPrinter(b.run, 2, 'rainbow'); });
    for (let i = 0; i < 40; i++) { await page.evaluate(() => { const b = window.__bl; b.C.botThink(b.run, { noBuy: true }); }); await page.waitForTimeout(100); }
    await page.evaluate(() => { const b = window.__bl; b.closeSheet(); b.closeAlert(); b.meta.tut.assigned = true; const o = b.run.inbox[0]; if (o) b.selectOrder(o.id); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${vp.n}-run.png` });
    await page.evaluate(() => { const b = window.__bl; b.selectOrder(null); b.C.forceProblem(b.run, 0, 'clog') || b.C.forceProblem(b.run, 1, 'clog'); b.openAlert(b.run.printers[0].problem ? 0 : 1); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${vp.n}-alert.png` });
    console.log(vp.n, 'errors:', errs);
    await ctx.close();
  }
  await browser.close();
})();
