// Four 1920x1080 store screenshots of the real game (1280x720 viewport at 1.5x so the UI reads well as a thumbnail).
//   node tools/cover/make-screens.js <outdir>
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, '../../test/node_modules/playwright-core'));
const ROOT = path.resolve(__dirname, '../..'), OUT = process.argv[2] || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [];
  const fresh = async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForFunction(() => window.__bl && window.__bl.mode === 'run'); await p.waitForTimeout(900);
    return { ctx, p };
  };
  const shot = async (p, n, what) => { const f = path.join(OUT, `screenshot-${n}-${what}.png`); await p.screenshot({ path: f }); console.log(f); };
  // 1: the first seconds: a customer order, the tutorial hand, the first goal
  let { ctx, p } = await fresh();
  await p.locator('.ocard').first().click(); await p.waitForTimeout(700);
  await shot(p, 1, 'first-order');
  await ctx.close();
  // a lab a few minutes into a season: 3 printers, upgrades, booth table + banner
  ({ ctx, p } = await fresh());
  await p.evaluate(() => {
    const B = window.__bl, r = B.run; B.meta.tut.done = true; r.tut = false;
    r.money += 1100; B.C.buyPrinter(r, 1, 'kestrel'); B.C.buyPrinter(r, 2, 'rainbow');
    for (const u of ['hotend', 'nozzle', 'drybox', 'table', 'banner']) { try { B.C.buyUpgrade(r, u); } catch (e) {} }
    for (let k = 0; k < 400; k++) { B.C.tick(r, 0.5); B.C.botThink(r, { noBuy: true }); for (const p of r.printers) if (p && p.problem) B.C.fix(r, r.printers.indexOf(p), B.C.problemOptions(r, r.printers.indexOf(p)).find((o) => o.ok).id); }
    while (r.inbox.length < 4) B.C.spawnOrder(r);
    r.cat.on = true; r.cat.p = 0.62; r.cat.lane = 0.25; r.cat.dir = 1;
    B.setPaused(false);
  });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const B = window.__bl, r = B.run; for (const [i, pr] of r.printers.entries()) if (pr && !pr.queue.length) { const o = r.inbox.find((x) => B.C.canAssign(r, x, i).ok); if (o) B.C.assign(r, o.id, i); } window.__bl.closeAlert(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('goalPop').classList.add('hidden'));
  await shot(p, 2, 'busy-lab');
  // 3: "Hey, I have this issue!"
  await p.evaluate(() => { const B = window.__bl, r = B.run; const i = r.printers.findIndex((x) => x && x.queue.length && !x.problem); B.C.forceProblem(r, i >= 0 ? i : 1, 'adhesion'); });
  await p.waitForTimeout(1300);
  await shot(p, 3, 'issue-popup');
  await p.evaluate(() => window.__bl.closeAlert());
  // 4: the upgrade map
  await p.click('#btnUps'); await p.waitForTimeout(800);
  await p.evaluate(() => { const m = document.querySelector('#sheetCard .mapwrap'); if (m) m.scrollTop = m.scrollHeight; }); await p.waitForTimeout(200);
  await shot(p, 4, 'upgrades');
  await ctx.close();
  await b.close();
  console.log('errors:', errs.length ? errs : 'none');
})();
