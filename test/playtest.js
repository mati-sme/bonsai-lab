// New-player playtest: a fresh profile, real mouse clicks only, following the on-screen pointer/hints.
// Usage: node playtest.js 1920x1080 [seconds]
const { chromium } = require('playwright-core');
const [w, h] = (process.argv[2] || '1920x1080').split('x').map(Number);
const SECS = +(process.argv[3] || 150);
const tag = `${w}x${h}`;
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, hasTouch: w < 600 });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1);
  const log = []; const note = (s) => { log.push(`${T()}s  ${s}`); };
  await p.goto('file://' + __dirname + '/../index.html');
  await p.waitForFunction(() => window.__bl && window.__bl.mode === 'run', null, { timeout: 8000 });
  note('landed in gameplay (mode=run, tutorial=' + (await p.evaluate(() => !!window.__bl.run.tut)) + ')');
  let shot = 0; const snap = async (why) => { const f = `out/play-${tag}-${String(++shot).padStart(2, '0')}.png`; await p.screenshot({ path: f }); note(`screenshot ${f} (${why})`); };
  await snap('first frame');
  const seen = {};
  const once = async (k, why) => { if (!seen[k]) { seen[k] = 1; note(why); await snap(why); } };
  const click = async (x, y) => { if (w < 600) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
  while ((Date.now() - t0) / 1000 < SECS) {
    await p.waitForTimeout(350);
    const st = await p.evaluate(() => {
      const B = window.__bl, r = B.run, vis = (id) => { const e = document.getElementById(id); return e && !e.classList.contains('hidden') && e.offsetParent !== null; };
      const ptr = document.getElementById('pointer');
      const q = (s) => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
      return {
        mode: B.mode, over: r && r.over, done: r ? r.stats.done : 0, fixed: r ? r.stats.fixed : 0, money: r ? Math.round(r.money) : 0, printers: r ? r.printers.filter(Boolean).length : 0,
        goal: B.meta.goal, tutDone: B.meta.tut.done, hint: document.getElementById('hint').textContent,
        alert: vis('alert') || !document.getElementById('alert').classList.contains('hidden') ? q('#aOpts .opt.best:not([disabled])') || q('#aOpts .opt:not([disabled])') : null,
        goalPop: !document.getElementById('goalPop').classList.contains('hidden'),
        sheetBuy: q('.sheet .btn.go:not([disabled])'), sheetOpen: !document.getElementById('sheet').classList.contains('hidden'), sheetClose: q('#sheetCard [data-close]'),
        ptr: ptr.classList.contains('hidden') ? null : [+ptr.dataset.x, +ptr.dataset.y],
        plate: r ? r.printers.findIndex((x) => x && x.plate) : -1, idle: r ? r.printers.findIndex((x) => x && !x.queue.length && !x.plate && !x.problem) : -1,
        prob: r ? r.printers.findIndex((x) => x && x.problem) : -1, hits: window.BL.Render.hits.printers.map((h) => h && [h.x + h.w / 2, h.y + h.h / 2]),
        card: q('#orders .ocard'), sumOpen: !document.getElementById('summary').classList.contains('hidden'),
      };
    });
    if (st.done >= 1) await once('d1', `first delivery (money $${st.money})`);
    if (st.goal >= 1) await once('g1', 'first goal completed');
    if (st.alert) { await once('al', 'first problem popup'); await click(...st.alert); note('chose a fix in the popup'); continue; }
    if (st.goalPop) await once('gp', 'goal popup showing');
    if (st.sumOpen) { await once('sum', 'season summary'); break; }
    if (st.sheetBuy) { await once('buy', 'printer shop with highlighted buy'); await click(...st.sheetBuy); note('bought a printer'); continue; }
    if (st.sheetOpen && st.sheetClose) { await click(...st.sheetClose); continue; }
    if (st.printers >= 2) await once('p2', `second printer, tutorial done=${st.tutDone}`);
    if (st.ptr) { await click(st.ptr[0], st.ptr[1] + 4); continue; }
    // after the tutorial: play like a simple human
    if (st.tutDone) {
      if (st.plate >= 0 && st.hits[st.plate]) { await click(...st.hits[st.plate]); continue; }
      if (st.prob >= 0 && st.hits[st.prob]) { await click(...st.hits[st.prob]); continue; }
      if (st.idle >= 0 && st.card && st.hits[st.idle]) { await click(...st.card); await p.waitForTimeout(150); await click(...st.hits[st.idle]); continue; }
    }
  }
  await snap('end');
  const fin = await p.evaluate(() => { const r = window.__bl.run; return { goal: window.__bl.meta.goal, done: r.stats.done, fixed: r.stats.fixed, money: Math.round(r.money), printers: r.printers.filter(Boolean).length, portal: window.__portalLog || null }; });
  note('final ' + JSON.stringify(fin));
  console.log(log.join('\n'));
  console.log('console errors/warnings:', errs.length ? errs : 'none');
  require('fs').writeFileSync(`out/play-${tag}.log`, log.join('\n') + '\nerrors: ' + JSON.stringify(errs) + '\n');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
