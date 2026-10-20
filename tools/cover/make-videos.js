// Silent ~18 s preview videos (1080p 16:9 and 1080x1620 2:3): opens on the cover art, a short crossfade, then a real
// first season played from a fresh profile (the in-game tutorial: first order, delivery + goal, the "Hey, I have this
// issue!" clog, buying a second printer).
// Frame-exact virtual clock (same approach as Deep Buddies): per frame the game is stepped by exactly 1/30 s
// (__bl.manual + __bl.step), page timers run from a virtual queue and CSS animations are stepped by 1/30 s, so the
// video plays at true game speed however slow the capture is. No cursor is ever drawn; no audio track (-an).
//   node tools/cover/make-videos.js <outdir>      ONLY=landscape|portrait to make one
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { chromium } = require(path.join(__dirname, '../../test/node_modules/playwright-core'));
const ROOT = path.resolve(__dirname, '../..'), OUT = process.argv[2] || path.join(__dirname, 'out');
const FPS = 30, SECS = 18, COVER_F = 36, FADE_F = 10;
fs.mkdirSync(OUT, { recursive: true });

async function video(browser, name, vw, vh, dpr, mobile) {
  const fd = `/tmp/bl-vid-${name}`; fs.rmSync(fd, { recursive: true, force: true }); fs.mkdirSync(fd, { recursive: true });
  const OW = Math.round(vw * dpr), OH = Math.round(vh * dpr);
  // cover frames (gently animated: drifting leaves, the toolhead moving) at the exact output size
  const cp = await browser.newPage({ viewport: { width: OW, height: OH }, deviceScaleFactor: 1 });
  await cp.goto('file://' + path.join(__dirname, `cover.html?w=${OW}&h=${OH}&t=1.2`)); await cp.waitForFunction(() => window.coverReady);
  for (let i = 0; i < COVER_F; i++) { await cp.evaluate((t) => window.drawCover(t), 1.2 + i / FPS); await cp.screenshot({ path: path.join(fd, `c${String(i).padStart(4, '0')}.png`) }); }
  await cp.close();

  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => {
    const rs = window.setTimeout, rc = window.clearTimeout, ri = window.setInterval, rci = window.clearInterval;
    const q = new Map(), anim = new Map(); let on = false, now = 0, id = 1e6;
    const add = (fn, ms, iv, a) => { const i = id++; q.set(i, { id: i, at: now + Math.max(0, +ms || 0), iv, fn: () => (typeof fn === 'function' ? fn(...a) : 0) }); return i; };
    window.setTimeout = (fn, ms, ...a) => (on ? add(fn, ms, 0, a) : rs(fn, ms, ...a));
    window.setInterval = (fn, ms, ...a) => (on ? add(fn, ms, Math.max(4, +ms || 0), a) : ri(fn, ms, ...a));
    window.clearTimeout = (i) => { q.delete(i); rc(i); }; window.clearInterval = (i) => { q.delete(i); rci(i); };
    window.__vt = {
      start() { on = true; },
      advance(ms) {
        const end = now + ms;
        for (let guard = 0; guard < 500; guard++) {
          let b = null; for (const t of q.values()) if (t.at <= end && (!b || t.at < b.at)) b = t;
          if (!b) break; now = b.at; if (b.iv) b.at += b.iv; else q.delete(b.id);
          try { b.fn(); } catch (e) { console.error(e); }
        }
        now = end;
        for (const a of document.getAnimations()) {
          if (!anim.has(a)) anim.set(a, +a.currentTime || 0); else anim.set(a, anim.get(a) + ms);
          if (a.playState !== 'finished') { a.pause(); a.currentTime = anim.get(a); }
        }
      },
    };
  });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html?speed=4'));
  await page.waitForFunction(() => window.__bl && window.__bl.mode === 'run' && !document.getElementById('boot'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    const B = window.__bl; window.__vt.start(); B.manual(true);
    const $ = (s) => document.querySelector(s), vis = (e) => e && e.offsetParent !== null && !e.disabled;
    const ctr = (e) => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    let wait = 0;
    // a "player" that follows the on-screen tutorial: taps where the pointer points, picks the highlighted fix
    window.__bot = setInterval(() => {
      if (wait-- > 0) return;
      const r = B.run; if (!r || r.over) return;
      const opt = $('#aOpts .opt.best') || $('#aOpts .opt:not([disabled])');
      if (!$('#alert').classList.contains('hidden')) { if (!window.__seenAlert) { window.__seenAlert = 1; wait = 6; return; } r.spares = Math.max(r.spares, 1); const o2 = $('#aOpts .opt.best') || $('#aOpts .opt:not([disabled])'); if (o2) { o2.click(); wait = 2; } return; }
      const buy = $('.sheet .btn.go'); if (vis(buy)) { buy.click(); wait = 2; return; }
      if (!$('#sheet').classList.contains('hidden')) { const x = $('#sheetCard [data-close]'); if (x) x.click(); return; }
      const ptr = $('#pointer');
      if (!ptr.classList.contains('hidden')) {
        const x = +ptr.dataset.x, y = +ptr.dataset.y, card = document.elementFromPoint(x, y);
        if (card && card.closest('.ocard')) card.closest('.ocard').click(); else B.tapAt(x, y);
        wait = 1; return;
      }
      const hits = window.BL.Render.hits.printers;
      const pl = r.printers.findIndex((p) => p && p.plate); if (pl >= 0 && hits[pl]) { B.tapPrinter(pl); return; }
      const idle = r.printers.findIndex((p) => p && !p.queue.length && !p.plate && !p.problem);
      const c = $('#orders .ocard'); if (idle >= 0 && c) { c.click(); B.tapPrinter(idle); wait = 1; }
    }, 300);
  });
  const GAME_F = SECS * FPS - COVER_F + FADE_F;
  for (let i = 0; i < GAME_F; i++) {
    await page.evaluate((dt) => { window.__vt.advance(dt * 1000); window.__bl.step(dt); }, 1 / FPS);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(fd, `g${String(i).padStart(4, '0')}.png`), Buffer.from(shot.data, 'base64'));
  }
  const info = await page.evaluate(() => { const r = window.__bl.run; return { done: r.stats.done, fixed: r.stats.fixed, printers: r.printers.filter(Boolean).length, goal: window.__bl.meta.goal }; });
  await ctx.close();
  // cover, crossfade (cover -> first game frames), gameplay
  execFileSync('python3', ['-c', `
from PIL import Image
fd='${fd}'; W,H=${OW},${OH}; C=${COVER_F}; F=${FADE_F}
n=0
def put(im):
  global n; im.convert('RGB').resize((W,H), Image.LANCZOS).save(fd+'/f%04d.png'%n); n+=1
import os
for i in range(C-F): put(Image.open(fd+'/c%04d.png'%i))
for i in range(F):
  a=(i+1)/(F+1); put(Image.blend(Image.open(fd+'/c%04d.png'%(C-F+i)).convert('RGB').resize((W,H)), Image.open(fd+'/g%04d.png'%i).convert('RGB').resize((W,H)), a))
g=sorted(x for x in os.listdir(fd) if x.startswith('g'))
for x in g[F:]: put(Image.open(fd+'/'+x))
print(n)
`]);
  const out = path.join(OUT, `preview-${name}-${OW}x${OH}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fd, 'f%04d.png'), '-vf', 'format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', out]);
  fs.copyFileSync(path.join(fd, 'f0000.png'), path.join(OUT, `preview-${name}-first-frame.png`));
  console.log('video', out, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB', JSON.stringify(info), 'errors', errs.length, errs.slice(0, 3));
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const only = process.env.ONLY;
  if (!only || only === 'landscape') await video(browser, 'landscape', 1280, 720, 1.5, false);
  if (!only || only === 'portrait') await video(browser, 'portrait', 720, 1080, 1.5, true);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
