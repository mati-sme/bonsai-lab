// Progression sim: node sim/campaign.js [players]
// Plays whole careers: season after season with the bot, spends Reputation on research (cheapest first), counts the seasons
// until all research is done and until the Workshop unlocks, then plays Workshop seasons. Includes the goal chain.
require('../js/data.js'); const BL = require('../js/core.js'); const C = BL.Core, D = BL.Data;
const N = +process.argv[2] || 12;
function career(seed, every) {
  const meta = C.newMeta(); const out = { reps: [], allRes: 0, workshop: 0, ws: [] };
  for (let season = 1; season <= 16; season++) {
    const run = C.newRun(meta, seed * 100 + season, { tutorial: season === 1 });
    let k = 0;
    while (!run.over) { C.tick(run, 0.5); if (++k % every === 0) { C.botThink(run); C.checkGoals(meta, run); } }
    C.applyResult(meta, run); while (C.checkGoals(meta, null)) { /* meta goals */ }
    if (meta.lab === 0) out.reps.push(run.result.rep + (run.result.reason === 'rent' ? '!' : '')); else out.ws.push(run.result.rep + (run.result.reason === 'rent' ? '!' : '') + '/$' + run.result.money);
    for (;;) { // buy research, cheapest first
      const can = D.RESEARCH.filter((n) => C.researchState(meta, n.id) === 'buy').sort((a, b) => a.cost - b.cost);
      if (!can.length) break; C.buyResearch(meta, can[0].id); while (C.checkGoals(meta, null)) { /* */ }
    }
    if (!out.allRes && meta.lab === 0 && D.RESEARCH.every((n) => meta.research[n.id])) out.allRes = season;
    if (!out.workshop && meta.lab === 0 && C.labState(meta, 1) === 'buy' && out.allRes) { out.workshop = season; C.moveLab(meta); while (C.checkGoals(meta, null)) { /* */ } }
    if (meta.lab === 1 && out.ws.length >= 4) break;
  }
  return out;
}
for (const [name, every] of [['bot', 2], ['casual bot', 8]]) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(career(i + 1, every));
  const m = (f) => (rs.reduce((a, r) => a + f(r), 0) / rs.length).toFixed(1);
  console.log(`== ${name}: all research by season ${m((r) => r.allRes || 17)}, Workshop by season ${m((r) => r.workshop || 17)} (${rs.filter((r) => r.workshop).length}/${N} got there in 16)`);
  for (const r of rs.slice(0, 4)) console.log('  garage rep per season:', r.reps.join(' '), '| workshop:', r.ws.join(' '));
}
