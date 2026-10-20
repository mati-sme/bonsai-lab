// Default autoplay policy (no override flag): WebAudio must stay untouched until the first gesture (no console warnings), then run.
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html')); await p.waitForTimeout(1500);
  console.log('before gesture ctx:', await p.evaluate(() => window.__bl.S.ctx && window.__bl.S.ctx.state));
  await p.locator('.ocard').first().click(); await p.waitForTimeout(1500);
  console.log('after click ctx:', await p.evaluate(() => window.__bl.S.ctx && window.__bl.S.ctx.state + ' t=' + window.__bl.S.ctx.currentTime.toFixed(2)), 'errors:', errs.length ? errs : 'none');
  await b.close();
})();
