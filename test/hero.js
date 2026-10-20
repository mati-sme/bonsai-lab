// Curated screenshots for sharing: node test/hero.js [outdir]
const { chromium } = require('playwright-core');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
async function scene(page) {
  await page.evaluate(() => {
    const B = window.__bl, r = B.run, C = B.C; r.money = 900; B.meta.tut.done = true; B.meta.tut.bought = true;
    C.buyPrinter(r, 1, 'kestrel'); C.buyPrinter(r, 2, 'rainbow'); C.buyUpgrade(r, 'hardened'); r.money = 412; r.t = 205; r.rentIdx = 1; r.rentDue = 300; r.rating = 4.2;
    const mk = (tpl, colors) => { const t = B.D.ORDERS.find((o) => o.id === tpl); return { id: r.nextId++, tpl, name: t.name, icon: t.icon, mat: t.mat, nc: colors.length, q: t.q, any: !!t.any, shape: t.shape, work: t.work, g: t.g, pay: Math.round(t.pay * 1.3), colors, arrive: r.t, deadline: r.t + 300, expires: r.t + 50 }; };
    const p0 = r.printers[0], p1 = r.printers[1], p2 = r.printers[2];
    p0.queue = [mk('vase', ['#2FA8A0']), mk('knob', ['#F2C230'])]; p0.status = 'printing'; p0.prog = p0.queue[0].work * 0.55; p0.maint = 64;
    p1.queue = [mk('picase', ['#E0473C'])]; p1.status = 'printing'; p1.prog = p1.queue[0].work * 0.4;
    p2.queue = [mk('racecar', ['#FF8000', '#F4EFE6', '#2B2B2E', '#3D7BD9'])]; p2.status = 'printing'; p2.prog = p2.queue[0].work * 0.75;
    r.inbox = [mk('figure', ['#F08BB0', '#F4EFE6', '#6BB34A', '#8E6BD1']), mk('stand', ['#FF8000']), mk('case', ['#3D7BD9']), mk('gears', ['#2B2B2E']), mk('pot', ['#E0473C'])];
    r.inbox.forEach((o, i) => { o.expires = r.t + 20 + i * 9; o.arrive = r.t - 10; });
    C.forceProblem(r, 1, 'clog'); r.events.length = 0; r.fil.MYS = 640; r.scrap = 120;
    r.cat.on = true; r.cat.p = 0.42; r.cat.dir = 1; r.cat.lane = 0.1; r.cat.next = 9999;
    r.firstIssueAt = 1e9; r.problemsSeen = 5;
  });
}
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [{ n: 'desktop', o: { viewport: { width: 1280, height: 720 } } }, { n: 'phone', o: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } }]) {
    const page = await (await b.newContext(vp.o)).newPage();
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/hero-${vp.n}-home.png` });
    await page.click('#btnGo', { force: true }); await page.waitForTimeout(200);
    await scene(page);
    await page.waitForTimeout(150); await page.evaluate(() => window.__bl.closeAlert());
    await page.evaluate(() => { const B = window.__bl; B.selectOrder(B.run.inbox[0].id); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/hero-${vp.n}-garage.png` });
    await page.evaluate(() => { const B = window.__bl; B.selectOrder(null); B.openAlert(1); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/hero-${vp.n}-issue.png` });
  }
  await b.close();
})();
