// Screens of the first-season tutorial at CrazyGames iframe sizes (DPR 1) + phones.
const { chromium } = require('playwright-core');
const sizes = (process.argv[2] || '1920x1080,1216x684,907x510,800x450,390x844,844x390').split(',');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const sz of sizes) {
    const [w, h] = sz.split('x').map(Number);
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 });
    const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    await p.goto('file://' + __dirname + '/../index.html'); await p.waitForTimeout(1200);
    await p.click('.ocard', { force: true }); await p.waitForTimeout(300);
    await p.screenshot({ path: `/tmp/v/sz-${sz}.png` });
    if (process.argv[3]) { await p.evaluate(() => { const r = window.__bl.run; window.__bl.C.forceProblem(r, 0, 'clog') || (window.__bl.C.assign(r, r.inbox[0].id, 0), window.__bl.C.forceProblem(r, 0, 'clog')); }); await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/v/sz-${sz}-alert.png` }); }
    console.log(sz, errs.length ? errs : 'ok');
    await p.close();
  }
  await b.close();
})();
