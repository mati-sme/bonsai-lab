// Balance sim: node sim/sim.js [seasons] [lab]   - runs the bot through full seasons and prints the economy.
require('../js/data.js'); const BL = require('../js/core.js'); const C = BL.Core;
const N = +process.argv[2] || 20, lab = +process.argv[3] || 0;
const variants = { 'bot': {}, 'no-buy bot': { noBuy: true } };
for (const [name, opts] of Object.entries(variants)) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    const meta = C.newMeta(); meta.lab = lab;
    if (process.env.RES) for (const id of process.env.RES.split(',')) meta.research[id] = true;
    const run = C.newRun(meta, 1000 + i);
    let k = 0;
    while (!run.over) { C.tick(run, 0.5); if (++k % 2 === 0) C.botThink(run, opts); }
    rows.push({ ...run.result, t: Math.round(run.t), printers: run.printers.filter(Boolean).map((p) => p.type[0]).join(''), ups: Object.keys(run.ups).length - 1, byType: run.stats.byType });
  }
  const avg = (f) => (rows.reduce((a, r) => a + f(r), 0) / rows.length).toFixed(1);
  console.log(`== ${name} (lab ${lab}) over ${N} seasons`);
  console.log(`evicted ${rows.filter((r) => r.reason === 'rent').length}/${N}  rep ${avg((r) => r.rep)}  done ${avg((r) => r.done)}  avg★ ${avg((r) => r.avg)}  money ${avg((r) => r.money)}  rating ${avg((r) => r.rating)}`);
  console.log(`late ${avg((r) => r.late)} failed ${avg((r) => r.failed)} lost ${avg((r) => r.lost)} problems ${avg((r) => r.problems)} rent ${avg((r) => r.rentPaid)} earned ${avg((r) => r.earned)} upgrades ${avg((r) => r.ups)}`);
  console.log('sample:', JSON.stringify(rows.slice(0, 3).map((r) => ({ rep: r.rep, done: r.done, money: r.money, pr: r.printers, end: r.reason, t: r.t, bt: r.byType }))));
}
