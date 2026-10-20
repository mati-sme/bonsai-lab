// Close-up of the printers for art review: node test/zoom.js
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  await page.click('#btnGo', { force: true }); await page.waitForTimeout(200);
  await page.evaluate(() => {
    const B = window.__bl, r = B.run, C = B.C; r.money = 5000; B.meta.tut.done = true;
    C.buyPrinter(r, 1, 'kestrel'); C.buyPrinter(r, 2, 'rainbow');
    const mk = (tpl, colors, mat) => { const t = B.D.ORDERS.find((o) => o.id === tpl); const o = { id: r.nextId++, tpl, name: t.name, icon: t.icon, mat: mat || t.mat, nc: colors.length, q: 2, any: false, shape: t.shape, work: t.work, g: t.g, pay: 50, colors, arrive: 0, deadline: 999, expires: 999 }; return o; };
    r.printers[0].queue.push(mk('vase', ['#2FA8A0'], 'PLA')); r.printers[0].status = 'printing'; r.printers[0].prog = r.printers[0].queue[0].work * 0.6;
    r.printers[1].queue.push(mk('bracket', ['#E0473C'], 'PLA')); r.printers[1].status = 'printing'; r.printers[1].prog = r.printers[1].queue[0].work * 0.7;
    r.printers[2].queue.push(mk('figure', ['#FF8000', '#F4EFE6', '#2B2B2E', '#3D7BD9'])); r.printers[2].status = 'printing'; r.printers[2].prog = r.printers[2].queue[0].work * 0.8;
    
  });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => { const h = window.__bl.R.hits.printers; const xs = h.filter(Boolean); const x0 = Math.min(...xs.map((r) => r.x)), y0 = Math.min(...xs.map((r) => r.y)), x1 = Math.max(...xs.map((r) => r.x + r.w)), y1 = Math.max(...xs.map((r) => r.y + r.h)); return { x: x0 - 20, y: y0 - 40, width: x1 - x0 + 40, height: y1 - y0 + 70 }; });
  await page.screenshot({ path: path.join(__dirname, 'shots/zoom-printers.png'), clip: box });
  await page.evaluate(() => { const B = window.__bl, r = B.run; B.C.forceProblem(r, 0, 'adhesion'); B.C.forceProblem(r, 1, 'clog'); r.printers[2].plate = { order: r.printers[2].queue.shift(), stars: 4, pay: 120 }; r.printers[2].status = 'done'; B.closeAlert(); });
  await page.waitForTimeout(300); await page.evaluate(() => window.__bl.closeAlert()); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(__dirname, 'shots/zoom-problems.png'), clip: box });
  await b.close();
})();
