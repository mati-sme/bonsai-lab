/* Bonsai Lab - UI controller: game loop, input, HUD, sheets, problem chat bubbles, maps, saving. */
(function (root) {
'use strict';
const BL = root.BL, D = BL.Data, C = BL.Core, R = BL.Render, S = BL.Sfx, M = BL.Maps, PF = BL.Platform;
const $ = (id) => document.getElementById(id);
const el = M.el;
const qs = new URLSearchParams(root.location.search);
const URL_SPEED = Math.max(0.1, Math.min(200, parseFloat(qs.get('speed')) || 1));
const SPEEDS = [1, 2, 3];

let meta = null, mode = 'home', sel = null, paused = false, speedIdx = 0, tNow = 0, lastFrame = 0, hudTimer = 0, saveTimer = 0;
let W = 0, H = 0, DPR = 1, view = { vx: 0, vy: 0, vw: 100, vh: 100 };
let pending = [], sheet = null, alertPi = -1, homeTab = 'lab', resSel = null, labSel = null, upSel = null, ordersSig = '', hintTxt = '';
const cv = $('cv'), ctx = cv.getContext('2d');
const run = () => meta && meta.run;

/* ---------- save ---------- */
function load() {
  let m = null;
  try { const raw = PF.storage.get(D.SAVE_KEY); if (raw) m = JSON.parse(raw); } catch (e) { m = null; }
  meta = C.fixMeta(m);
  if (meta.run && (meta.run.over || meta.run.v !== 1)) meta.run = null;
  S.setMuted(meta.settings.mute);
}
function save() {
  if (!meta) return;
  const r = meta.run;
  let ev = null;
  if (r) { ev = r.events; r.events = []; }
  PF.storage.set(D.SAVE_KEY, JSON.stringify(meta));
  if (r) r.events = ev;
}

/* ---------- layout ---------- */
function resize() {
  DPR = Math.min(2, root.devicePixelRatio || 1);
  W = root.innerWidth; H = root.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const wide = W > H * 1.15 && W >= 700;
  document.body.classList.toggle('wide', wide);
  document.body.classList.toggle('short', H < 560);
  computeView();
  ordersSig = '';
}
function computeView() {
  if (mode === 'run') {
    const tb = $('topbar').getBoundingClientRect(), tr = $('tray').getBoundingClientRect();
    if (document.body.classList.contains('wide')) view = { vx: 6, vy: tb.bottom + 2, vw: tr.left - 12, vh: H - tb.bottom - 8 };
    else view = { vx: 4, vy: tb.bottom + 2, vw: W - 8, vh: tr.top - tb.bottom - 6 };
  } else {
    const top = document.querySelector('.hometop').getBoundingClientRect().bottom;
    let bottom = H - 70;
    if (homeTab === 'lab') { const c = document.querySelector('.home-card').getBoundingClientRect(); bottom = c.top - 6; }
    view = { vx: 6, vy: top, vw: W - 12, vh: Math.max(120, bottom - top) };
  }
}

/* ---------- loop ---------- */
function frame(ts) {
  const dt = Math.min(0.1, lastFrame ? (ts - lastFrame) / 1000 : 0.016);
  lastFrame = ts; tNow += dt;
  const r = run();
  if (mode === 'run' && r) {
    if (!r.over && !paused) C.tick(r, dt * URL_SPEED * SPEEDS[speedIdx]);
    if (r.events.length) drainEvents(r);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const selection = mode === 'run' && sel != null ? selectionFor(r) : null;
  R.draw(ctx, { time: tNow, dt, view, run: mode === 'run' ? r : null, lab: meta.lab, selection, W, H });
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.12; if (mode === 'run' && r) { updateHud(r); renderOrders(r); refreshSheet(); refreshAlert(); updateHint(r); } }
  saveTimer -= dt;
  if (saveTimer <= 0) { saveTimer = 3; if (mode === 'run') save(); }
  requestAnimationFrame(frame);
}
function selectionFor(r) {
  const o = r.inbox.find((x) => x.id === sel);
  if (!o) { sel = null; return null; }
  return r.printers.map((p, i) => {
    if (!p) return { ok: false, short: '＋ empty' };
    const c = C.canAssign(r, o, i);
    if (c.ok) return c;
    return { ok: false, short: c.why.startsWith('Needs') ? 'needs 🌈' : c.why === 'Queue full' ? 'queue full' : '✖' };
  });
}

/* ---------- events from the sim ---------- */
function drainEvents(r) {
  const evs = r.events.splice(0);
  for (const e of evs) {
    switch (e.k) {
      case 'order': S.play('order'); break;
      case 'assign': S.play('assign'); break;
      case 'done': S.play('done'); R.floatAt('printer', e.pi, `${'★'.repeat(Math.round(e.stars))}`, '#ffd84a'); break;
      case 'paid': S.play('coin'); R.floatAt('printer', e.pi, `+$${e.pay}${e.late ? ' ⏰' : ''}${e.tip ? ' 💖' : ''}${e.low ? ' 😕' : ''}`, e.low ? '#ffb0a0' : '#9dff9d'); meta.tut.collected = true; break;
      case 'problem':
        S.play('alert');
        if (!isModalOpen()) openAlert(e.pi);
        else if (alertPi >= 0) { if (alertPi !== e.pi && !pending.includes(e.pi)) pending.push(e.pi); updatePending(); }
        else toast(`${D.PROBLEMS[e.type].icon} ${pname(r, e.pi)} needs help!`, 'Tap its red bubble');
        break;
      case 'autofix': R.floatAt('printer', e.pi, '♨️ auto-fixed', '#ffe08a'); toast('♨️ ' + e.msg); break;
      case 'fix': S.play('fix'); break;
      case 'serviced': R.floatAt('printer', e.pi, '🧽 100%', '#9ff0ff'); break;
      case 'rent': S.play('rent'); toast(`🏠 Rent paid: $${e.amt}`, r.rentDue >= r.len ? 'Last one! Now push for the expo 🎪' : 'Next one in 2:30'); break;
      case 'rentwarn': S.play('error'); toast(`⚠️ Rent $${e.amt} due!`, 'You have 25 s to find the money'); break;
      case 'expired': toast(`😞 A customer left`, e.name); break;
      case 'delivery': toast('🚚 Spare nozzle arrived', '🔩 +1 in stock'); break;
      case 'catin': S.play('meow'); break;
      case 'cat': R.floatAt('cat', 0, `😻 +$${e.gain}`, '#ffd0e0'); S.play('meow'); break;
      case 'end': onSeasonEnd(r); break;
    }
  }
}
const pname = (r, i) => (r.printers[i] ? `${D.PRINTERS[r.printers[i].type].name} #${i + 1}` : 'Slot ' + (i + 1));
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const money = (n) => '$' + Math.floor(n);

/* ---------- HUD ---------- */
function updateHud(r) {
  $('hMoney').textContent = Math.floor(r.money);
  $('hRating').textContent = r.rating.toFixed(1);
  $('hTime').textContent = fmtT(r.len - r.t);
  $('hTimeBar').style.width = (100 * r.t / r.len).toFixed(1) + '%';
  const chip = $('hRentChip');
  if (r.rentDue >= r.len && r.grace <= 0) { $('hRent').textContent = 'paid'; $('hRentT').textContent = '✔'; chip.classList.remove('warn', 'due'); }
  else if (r.grace > 0) { $('hRent').textContent = money(C.nextRent(r)); $('hRentT').textContent = '⚠️ ' + fmtT(r.grace); chip.classList.add('warn', 'due'); }
  else {
    const left = r.rentDue - r.t, amt = C.nextRent(r);
    $('hRent').textContent = money(amt); $('hRentT').textContent = fmtT(left);
    chip.classList.toggle('due', r.money < amt);
    chip.classList.toggle('warn', left < 20 && r.money < amt);
  }
  $('speedTxt').textContent = SPEEDS[speedIdx] * (URL_SPEED !== 1 ? URL_SPEED : 1) + '×';
  $('btnPause').textContent = paused ? '▶️' : '⏸️';
  $('pausedBadge').classList.toggle('hidden', !paused);
  // inventory strip
  const parts = [];
  for (const m of D.MAT_ORDER) parts.push(`<span data-shop="1" class="${r.fil[m] < 250 && r.printers.some((p) => p && p.queue.some((q) => q.mat === m)) ? 'low' : ''}"><i style="background:${D.MATS[m].color}"></i>${m} ${(r.fil[m] / 1000).toFixed(1)}</span>`);
  if (r.fil.MYS > 1 || r.scrap > 1) parts.push(`<span data-shop="1"><i style="background:conic-gradient(#f66,#fd6,#6f6,#6df,#a6f,#f66)"></i>${(r.fil.MYS / 1000).toFixed(1)}${r.scrap > 1 ? ` ♻️${Math.round(r.scrap)}g` : ''}</span>`);
  parts.push(`<span data-shop="1">🔩 ${r.spares}${r.deliveries.length ? ' 🚚' : ''}</span>`);
  const html = parts.join('');
  if ($('inv')._h !== html) { $('inv').innerHTML = html; $('inv')._h = html; }
  $('ordCount').textContent = `${r.inbox.length}/${C.inboxMax(r)}`;
  $('dotUps').classList.toggle('hidden', !D.UPGRADES.some((u) => C.upgradeState(r, u.id) === 'buy'));
}
function matTag(m) { return `<span class="tag" style="background:${D.MATS[m].color}">${m}</span>`; }
function cdots(cols) { return `<span class="cdots">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`; }
function renderOrders(r) {
  const box = $('orders');
  const sig = r.inbox.map((o) => o.id).join(',') + '|' + sel + '|' + r.printers.map((p) => p ? p.type + p.queue.length : '-').join('') + '|' + Object.keys(r.ups).length;
  if (sig !== ordersSig) {
    ordersSig = sig;
    box.innerHTML = '';
    if (!r.inbox.length) box.appendChild(el('div', 'empty', '☕ No orders right now. New customers are on their way…'));
    for (const o of r.inbox) {
      const any = r.printers.some((p, i) => p && C.canAssign(r, o, i).ok);
      const multiOk = r.printers.some((p) => p && D.PRINTERS[p.type].colors >= o.nc);
      const b = el('button', 'ocard' + (o.id === sel ? ' sel' : '') + (any ? '' : ' cant'));
      b.dataset.id = o.id;
      b.innerHTML = `<div class="top"><span class="oi">${o.icon}</span><span class="on">${o.name}</span></div>
        <div class="row">${matTag(o.mat)}${cdots(o.colors)}<span class="qtag">${o.q}★</span>${o.any ? '<span class="any">any colour</span>' : ''}</div>
        <div class="money"><span>⏱ ${o.work}s</span><b>$${o.pay}</b></div>
        ${multiOk ? '' : '<div class="row"><small>🌈 needs multi-colour</small></div>'}
        <i class="wait"></i>`;
      b.addEventListener('click', () => {
        S.play('select');
        sel = sel === o.id ? null : o.id;
        ordersSig = '';
      });
      box.appendChild(b);
    }
  }
  // live waiting bars
  for (const c of box.querySelectorAll('.ocard')) {
    const o = r.inbox.find((x) => x.id === +c.dataset.id); if (!o) continue;
    const f = Math.max(0, (o.expires - r.t) / (o.expires - o.arrive));
    const w = c.querySelector('.wait'); w.style.width = (f * 100).toFixed(1) + '%'; w.classList.toggle('low', f < 0.3);
  }
}

/* ---------- tutorial hints ---------- */
function updateHint(r) {
  let t = '';
  const tut = meta.tut;
  if (!tut.done && meta.seasons === 0) {
    if (sel != null) t = '👆 Now tap a glowing printer';
    else if (!tut.assigned) t = r.inbox.length ? (document.body.classList.contains('wide') ? '👉 Tap an order card' : '👇 Tap an order card') : '☕ Waiting for the first customer…';
    else if (r.printers.some((p) => p && p.plate) && !tut.collected) t = '✔ Tap the finished printer to deliver & get paid';
    else if (!tut.collected) t = '⏳ Printing… watch the layers stack up!';
    else if (!tut.tips) { tut.tips = r.t; }
    if (tut.tips && r.t - tut.tips < 10) t = '🛒 Supplies = spools · 🛠️ Upgrades = better printers';
    if (tut.tips && r.t - tut.tips >= 10) tut.done = true;
  }
  if (!t && !meta.tut.bought && r.printers.some((p) => !p) && r.money >= D.PRINTERS.kestrel.cost && sel == null) t = '➕ You can afford another printer! Tap a ＋ slot';
  if (r.printers.filter(Boolean).length > 1) meta.tut.bought = true;
  if (r.grace > 0) t = `⚠️ Rent due! Deliver prints to raise ${money(C.nextRent(r))}`;
  if (t !== hintTxt) { hintTxt = t; $('hint').textContent = t; $('hint').classList.toggle('hidden', !t); }
  $('hint').style.top = 'auto'; $('hint').style.bottom = Math.round(H - (view.vy + view.vh) + 6) + 'px';
}

/* ---------- input ---------- */
let down = null;
cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; S.unlock(); });
cv.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved < 14) tapAt(e.clientX, e.clientY);
});
function tapAt(x, y) {
  if (mode !== 'run') return;
  const r = run(); if (!r || r.over) return;
  const h = R.hitTest(x, y);
  if (!h) { if (sel != null) { sel = null; ordersSig = ''; } return; }
  if (h.kind === 'cat') { const res = C.petCat(r); if (res.ok) drainEvents(r); return; }
  if (h.kind === 'printer') return tapPrinter(h.i);
  if (h.kind === 'slot') { if (sel != null) toast('➕ Empty slot', 'Buy a printer here first'); return openSheet('slot', h.i); }
  if (h.kind === 'recycler') { S.play('tap'); return toast('♻️ Scrap recycler', `${Math.round(r.scrap)} g scrap → 🌈 ${Math.round(r.fil.MYS)} g mystery PLA`); }
  if (h.kind === 'shelf') return openSheet('shop');
}
function tapPrinter(i) {
  const r = run(), p = r.printers[i];
  if (sel != null) {
    const res = C.assign(r, sel, i);
    if (res.ok) {
      meta.tut.assigned = true;
      if (res.warn && res.warn.length) toast('⚠️ ' + res.warn[0]);
      sel = null; ordersSig = ''; drainEvents(r);
    } else { S.play('error'); toast('🚫 ' + res.msg); }
    return;
  }
  if (p.problem) return openAlert(i);
  if (p.plate) { C.collect(r, i); drainEvents(r); return; }
  openSheet('printer', i);
}
$('btnPause').addEventListener('click', () => { paused = !paused; S.play('tap'); updateHud(run()); });
$('btnSpeed').addEventListener('click', () => { speedIdx = (speedIdx + 1) % SPEEDS.length; S.play('tap'); updateHud(run()); });
$('btnShop').addEventListener('click', () => openSheet('shop'));
$('btnUps').addEventListener('click', () => openSheet('ups'));
$('btnHelp').addEventListener('click', () => openSheet('help'));
$('inv').addEventListener('click', (e) => { if (e.target.closest('[data-shop]')) openSheet('shop'); });

/* ---------- toast ---------- */
let toastT = 0;
function toast(a, b) {
  const t = $('toast');
  if (!$('summary').classList.contains('hidden')) return;
  t.style.top = (mode === 'run' ? view.vy + 6 : 76) + 'px'; t.innerHTML = a + (b ? `<small>${b}</small>` : '');
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1900);
}
const isModalOpen = () => !$('sheet').classList.contains('hidden') || !$('alert').classList.contains('hidden') || !$('summary').classList.contains('hidden');

/* ---------- sheets ---------- */
function openSheet(kind, arg) {
  S.play('tap');
  sheet = { kind, arg, sig: '' };
  $('sheet').classList.remove('hidden');
  refreshSheet(true);
}
function closeSheet() { sheet = null; $('sheet').classList.add('hidden'); upSel = null; }
$('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
function head(icon, title) { return `<h2>${icon} ${title}<button class="round small x" data-close>✖</button></h2>`; }
function wireClose(card) { card.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet)); }
function sheetSig() {
  const r = run();
  if (!sheet) return '';
  if (sheet.kind === 'printer') {
    const p = r && r.printers[sheet.arg]; if (!p) return 'x';
    return [p.status, p.queue.map((q) => q.id).join(','), !!p.problem, p.busy > 0, !!p.plate, Math.round(p.maint / 5), r.money >= 15, p.ups].join('|');
  }
  if (sheet.kind === 'shop') return D.MAT_ORDER.map((m) => r.money >= C.spoolPrice(r, m)).join('') + r.spares + r.deliveries.length + Math.round(r.fil.MYS / 100) + (r.money >= 12);
  if (sheet.kind === 'ups') return D.UPGRADES.map((u) => C.upgradeState(r, u.id)).join('') + upSel;
  if (sheet.kind === 'slot') return D.PRINTER_ORDER.map((t) => r.money >= D.PRINTERS[t].cost).join('') + !!r.printers[sheet.arg];
  return sheet.kind;
}
function refreshSheet(force) {
  if (!sheet || mode !== 'run') return;
  const r = run();
  const sig = sheetSig();
  const card = $('sheetCard');
  if (force || sig !== sheet.sig) {
    sheet.sig = sig;
    const k = sheet.kind;
    if (k === 'printer') renderPrinterSheet(card, r, sheet.arg);
    else if (k === 'shop') renderShop(card, r);
    else if (k === 'ups') renderUpsSheet(card, r);
    else if (k === 'slot') renderSlotSheet(card, r, sheet.arg);
    else if (k === 'help') { card.innerHTML = head('❓', 'How to play') + helpHtml(); wireClose(card); }
    wireClose(card);
  }
  // live bits
  if (sheet.kind === 'printer') {
    const p = r.printers[sheet.arg]; if (!p) return;
    const pb = card.querySelector('[data-live=prog]');
    if (pb && p.queue[0]) pb.style.width = (100 * p.prog / p.queue[0].work).toFixed(1) + '%';
    const mt = card.querySelector('[data-live=maint]');
    if (mt) { mt.style.width = p.maint.toFixed(0) + '%'; mt.className = p.maint < 30 ? 'low' : p.maint < 60 ? 'mid' : ''; }
    const st = card.querySelector('[data-live=status]'); if (st) st.textContent = statusText(r, p);
  }
}
function statusText(r, p) {
  if (p.problem) return `${D.PROBLEMS[p.problem.type].icon} ${D.PROBLEMS[p.problem.type].title}`;
  if (p.busy > 0) return `${p.busyWhat} ${Math.ceil(p.busy)} s`;
  if (p.plate) return `✔ Finished: ${p.plate.order.name} ${p.plate.stars}★`;
  if (p.status === 'printing') { const o = p.queue[0]; return `🖨️ Printing ${Math.round(100 * p.prog / o.work)}% · ${Math.ceil((o.work - p.prog) / C.speedOf(r, p, o))} s left`; }
  return '😴 Idle: tap an order, then this printer';
}
function renderPrinterSheet(card, r, i) {
  const p = r.printers[i]; if (!p) { closeSheet(); return; }
  const T = D.PRINTERS[p.type];
  card.innerHTML = head(T.icon, pname(r, i)) + `<div class="pinfo"><span data-icon></span><div>
    <div><b data-live="status"></b></div>
    <div class="stats"><span>⚡ ${(C.speedOf(r, p, null)).toFixed(2)}×</span><span>✨ ${C.qualityOf(r, p).toFixed(1)}★</span><span>🎨 ${T.colors} colour${T.colors > 1 ? 's' : ''}</span><span>${C.enclosed(r, p) ? '🧊 enclosed' : '🌬️ open frame'}</span>${p.ups ? '<span>🔋 UPS</span>' : ''}${p.glue ? `<span>🧴 glue ×${p.glue}</span>` : ''}</div></div></div>
    <h3>🧽 Maintenance</h3><div class="meter"><i data-live="maint"></i></div>
    <p class="small">Worn printers break more often. Service when it gets yellow.</p>
    <div class="row2" id="psBtns"></div>
    <h3>📋 Queue (${p.queue.length}/${C.maxQueue(r)})</h3><div class="qlist" id="psQueue"></div>`;
  card.querySelector('[data-icon]').appendChild(R.printerIcon(p.type, 84));
  const btns = card.querySelector('#psBtns');
  if (p.problem) { const b = el('button', 'btn danger', `${D.PROBLEMS[p.problem.type].icon} Fix the issue`); b.onclick = () => { closeSheet(); openAlert(i); }; btns.appendChild(b); }
  if (p.plate) { const b = el('button', 'btn green', `✔ Deliver · $${p.plate.pay}`); b.onclick = () => { C.collect(r, i); drainEvents(r); refreshSheet(true); }; btns.appendChild(b); }
  const kit = r.ups.kit;
  const sv = el('button', 'btn alt', `🧽 Service <small>${kit ? 'free' : '$15'} · ${kit ? 4 : 8} s</small>`);
  sv.disabled = !!(p.problem || p.busy > 0 || p.plate || (!kit && r.money < 15) || p.maint > 97);
  sv.onclick = () => { const res = C.service(r, i); if (res.ok) { S.play('fix'); refreshSheet(true); } else toast(res.msg); };
  btns.appendChild(sv);
  const q = card.querySelector('#psQueue');
  if (!p.queue.length) q.appendChild(el('div', 'small', 'Nothing queued. Pick an order from the tray, then tap this printer.'));
  p.queue.forEach((o, k) => {
    const it = el('div', 'qitem', `<span class="qi">${o.icon}</span><div class="grow"><b>${o.name}</b> ${matTag(o.mat)} ${cdots(o.colors)}<br><small>$${o.pay} · ${o.q}★ · due ${fmtT(o.deadline - r.t)}</small>${k === 0 ? '<div class="pbar"><i data-live="prog"></i></div>' : ''}</div>`);
    if (k > 0) { const x = el('button', 'round small', '↩️'); x.title = 'Back to orders'; x.onclick = () => { C.unqueue(r, i, k); ordersSig = ''; refreshSheet(true); }; it.appendChild(x); }
    q.appendChild(it);
  });
}
function renderShop(card, r) {
  card.innerHTML = head('🛒', 'Supplies') + '<p class="small">Spools come from the maker shop next door: instant. Nozzles ship in 30 s.</p><div class="shopgrid" id="shopG"></div>';
  const g = card.querySelector('#shopG');
  for (const m of D.MAT_ORDER) {
    const c = C.spoolPrice(r, m);
    const it = el('div', 'shopitem', `<div class="si"><i style="width:26px;height:26px;border-radius:50%;background:${D.MATS[m].color};border:4px solid #3a3a40;display:inline-block"></i><b>${m}</b></div><small>${D.MATS[m].note}</small><small>In stock: <b>${(r.fil[m] / 1000).toFixed(2)} kg</b></small>`);
    const b = el('button', 'btn', `+1 kg · $${c}`); b.disabled = r.money < c; b.dataset.buy = m;
    b.onclick = () => { const res = C.buySpool(r, m); if (res.ok) { S.play('buy'); drainEvents(r); refreshSheet(true); } };
    it.appendChild(b); g.appendChild(it);
  }
  const nz = el('div', 'shopitem', `<div class="si">🔩<b>Spare nozzle</b></div><small>Swap a clogged nozzle in 4 s instead of waiting.</small><small>In stock: <b>${r.spares}</b>${r.deliveries.length ? ` · 🚚 ${r.deliveries.length} coming` : ''}</small>`);
  const nb = el('button', 'btn', 'Order · $12'); nb.disabled = r.money < 12; nb.onclick = () => { if (C.buyNozzle(r).ok) { S.play('buy'); refreshSheet(true); } };
  nz.appendChild(nb); g.appendChild(nz);
  g.appendChild(el('div', 'shopitem', `<div class="si">🌈<b>Mystery PLA</b></div><small>${D.MATS.MYS.note}.</small><small>Recycled: <b>${Math.round(r.fil.MYS)} g</b> · scrap waiting ${Math.round(r.scrap)} g</small>`));
}
function renderSlotSheet(card, r, i) {
  if (r.printers[i]) { closeSheet(); return; }
  card.innerHTML = head('➕', `Printer for slot ${i + 1}`) + '<p class="small">Your garage has room for ' + r.slots + ' printers. No endless helpers here: pick wisely, then upgrade.</p><div class="pbuy" id="pbG"></div>';
  const g = card.querySelector('#pbG');
  for (const t of D.PRINTER_ORDER) {
    const T = D.PRINTERS[t];
    const it = el('div', 'shopitem', `<div class="si">${T.icon}<b>${T.name}</b></div>`);
    it.appendChild(R.printerIcon(t, 92));
    it.appendChild(el('small', '', T.blurb));
    it.appendChild(el('div', 'stats', `<span>⚡${T.speed}×</span><span>✨${T.q}★</span><span>🎨${T.colors}</span><span>${T.enclosed ? '🧊' : '🌬️'}</span>`));
    const b = el('button', 'btn', `Buy · $${T.cost}`); b.disabled = r.money < T.cost; b.dataset.type = t;
    b.onclick = () => { const res = C.buyPrinter(r, i, t); if (res.ok) { S.play('buy'); closeSheet(); toast(`${T.icon} ${T.name} installed!`); ordersSig = ''; } };
    it.appendChild(b); g.appendChild(it);
  }
}
function renderUpsSheet(card, r) {
  card.innerHTML = head('🛠️', `Upgrades <span class="chip" style="font-size:14px">💵 ${Math.floor(r.money)}</span>`) + '<p class="small">Make every printer better for this season. Tap a node.</p><div class="mapwrap inrun" id="upMap"></div><div id="upInfo"></div>';
  const wrap = card.querySelector('#upMap');
  requestAnimationFrame(() => {
    M.renderMap(wrap, {
      nodes: D.UPGRADES, kind: 'up', state: (id) => C.upgradeState(r, id),
      badge: (id, st) => st === 'owned' ? '✔' : '$' + D.UPGRADES.find((u) => u.id === id).cost,
      onSelect: (id) => { upSel = id; S.play('tap'); showUpInfo(card, r); wrap.querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.id === id)); },
    });
    if (upSel) wrap.querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.id === upSel));
  });
  showUpInfo(card, r);
}
function showUpInfo(card, r) {
  const box = card.querySelector('#upInfo'); box.innerHTML = '';
  if (!upSel) { box.appendChild(el('div', 'nodeinfo', '<span class="big">👆</span><div class="txt">Tap a node to see what it does.</div>')); return; }
  const u = D.UPGRADES.find((x) => x.id === upSel), st = C.upgradeState(r, u.id);
  const ni = el('div', 'nodeinfo', `<span class="big">${u.icon}</span><div class="txt"><b>${u.name}</b>${u.desc}</div>`);
  if (!u.root) {
    const b = el('button', 'btn', st === 'owned' ? '✔ Owned' : st === 'locked' ? '🔒 Locked' : `Buy · $${u.cost}`);
    b.disabled = st !== 'buy';
    b.onclick = () => { if (C.buyUpgrade(r, u.id).ok) { S.play('buy'); toast(`${u.icon} ${u.name}!`); sheet.sig = ''; refreshSheet(true); } };
    ni.appendChild(b);
  }
  box.appendChild(ni);
}
function helpHtml() {
  return `<p>🧾 <b>Orders</b> pop up in the tray. Tap one, then tap a glowing printer to queue it. The green bar is how long the customer will wait.</p>
  <p>🖨️ <b>Printers</b> print on their own. Watch the layers stack up! When a ✔ bubble appears, tap the printer to deliver and get paid.</p>
  <p>💬 <b>"Hey, I have this issue!"</b> Printers clog, snap belts, lose their print, string, warp, go offline or run out of filament. Pick a fix: spend money, spare parts or time.</p>
  <p>🎨 Multi-colour jobs need the 🌈 Rainbow printer. 🧊 ABS wants a closed printer. ⭐ Quality must reach the order's ★ bar or the customer pays half.</p>
  <p>🧽 Printers wear down. Service them before they break. ♻️ Failed prints become scrap, the recycler turns it into 🌈 mystery PLA for "any colour" orders.</p>
  <p>🏠 Rent comes every 2:30. Can't pay within 25 s? Season over. Make it to 🎪 the expo for a big ⭐ Reputation bonus.</p>
  <p>🔬 Spend Reputation on Research between seasons. 🗺️ Earn enough in one lab to move up to the Workshop (prestige).</p>
  <p>🐈 If Miso the cat strolls by, give her a pat.</p>`;
}

/* ---------- problem chat bubble ---------- */
function openAlert(i) {
  const r = run(); if (!r) return;
  const p = r.printers[i]; if (!p || !p.problem) return;
  if (sheet) closeSheet();
  alertPi = i;
  const pr = D.PROBLEMS[p.problem.type];
  const card = $('alertCard');
  let say = pr.say;
  if (p.problem.type === 'runout') say = `Hey, I have this issue! I ran out of ${p.problem.mat} 🧵`;
  if (p.problem.retry) say = 'Hey, I have this issue! That cold pull didn\'t work, still clogged 😖';
  if (p.problem.type === 'adhesion') say += p.problem.keep ? ` The camera caught it early, ${Math.round(p.problem.keep * 100)}% saved.` : p.problem.lost ? ` ${p.problem.lost} g went to the scrap bin ♻️` : '';
  card.innerHTML = `<div class="chat"><span data-icon></span><div class="bub"><div class="who">${pname(r, i)}</div>${say}</div></div>
    <div class="atitle">${pr.icon} ${pr.title}</div><div class="opts" id="aOpts"></div>
    <div class="pending hidden" id="aPending"></div>
    <button class="btn alt later" id="aLater">⏳ Later</button>`;
  card.querySelector('[data-icon]').appendChild(R.printerIcon(p.type, 64));
  const box = card.querySelector('#aOpts');
  for (const o of C.problemOptions(r, i)) {
    const b = el('button', 'opt', `<span class="oi">${o.icon}</span><span><b>${o.label}</b><small>${o.sub}</small></span>`);
    b.disabled = !o.ok; b.dataset.opt = o.id;
    b.onclick = () => {
      const res = C.fix(r, i, o.id);
      if (res.ok) { R.floatAt('printer', i, '🔧 on it!', '#ffe08a'); closeAlert(true); drainEvents(r); } else { S.play('error'); toast(res.msg || 'Not possible'); }
    };
    box.appendChild(b);
  }
  card.querySelector('#aLater').onclick = () => closeAlert(true);
  $('alert').classList.remove('hidden');
  card._sig = alertSig(r, i);
  pending = pending.filter((x) => x !== i);
  updatePending();
}
function updatePending() {
  const r = run(), box = $('aPending'); if (!box || !r) return;
  pending = pending.filter((x) => r.printers[x] && r.printers[x].problem && x !== alertPi);
  box.classList.toggle('hidden', !pending.length);
  box.textContent = pending.length ? `🔔 ${pending.map((x) => pname(r, x)).join(', ')} also need${pending.length > 1 ? '' : 's'} help` : '';
}
function alertSig(r, i) { const p = r.printers[i]; return p && p.problem ? p.problem.type + C.problemOptions(r, i).map((o) => o.ok).join('') : ''; }
function closeAlert(next) {
  alertPi = -1; $('alert').classList.add('hidden');
  const r = run();
  if (next && r && !r.over) { pending = pending.filter((x) => r.printers[x] && r.printers[x].problem); if (pending.length) { const pi = pending.shift(); setTimeout(() => { if (!isModalOpen()) openAlert(pi); }, 250); } }
}
function refreshAlert() {
  if (alertPi < 0) return;
  const r = run(), p = r && r.printers[alertPi];
  if (!p || !p.problem) return closeAlert();
  if ($('alertCard')._sig !== alertSig(r, alertPi)) openAlert(alertPi);
}
$('alert').addEventListener('click', (e) => { if (e.target.id === 'alert') closeAlert(); });

/* ---------- season flow ---------- */
function startSeason(fresh) {
  S.unlock();
  if (fresh || !meta.run) meta.run = C.newRun(meta, 0);
  mode = 'run'; sel = null; paused = false; ordersSig = ''; hintTxt = '';
  $('home').classList.add('hidden'); $('hud').classList.remove('hidden'); $('summary').classList.add('hidden');
  closeSheet(); closeAlert();
  computeView(); save();
  PF.gameplayStart();
}
function onSeasonEnd(r) {
  PF.gameplayStop();
  closeSheet(); closeAlert(); sel = null;
  const res = C.applyResult(meta, r);
  save();
  S.play('end');
  if (res.rep >= 20) PF.happy();
  const exp = res.reason === 'expo';
  const nextLab = D.LABS[meta.lab + 1];
  const canMove = nextLab && C.labState(meta, meta.lab + 1) === 'buy';
  $('sumCard').innerHTML = `<h2>${exp ? '🎪 Expo day!' : '🏚️ Evicted!'}</h2>
    <p>${exp ? 'You made it through the season and showed your best prints at the maker expo.' : 'The rent was due and the piggy bank was empty. The landlord wants the garage back.'}</p>
    <div class="small">Reputation earned</div><div class="bigrep">+${res.rep} ⭐</div>
    <div class="sumgrid"><span>📦 ${res.done} delivered</span><span>✨ ${res.avg}★ average</span><span>💵 $${res.money} left</span><span>⭐ ${res.rating} rating</span>
    <span>🔧 ${res.fixed}/${res.problems} issues fixed</span><span>🏠 $${res.rentPaid} rent paid</span><span>⏰ ${res.late} late</span><span>😞 ${res.lost} missed</span></div>
    ${canMove ? `<p><b>🗺️ You can move to the ${nextLab.name}!</b> Check the Labs map.</p>` : (nextLab && !nextLab.soon ? `<p class="small">🗺️ ${nextLab.name}: ${meta.labRep}/${nextLab.need} ⭐ earned in this lab</p>` : '')}
    <div class="row2"><button class="btn alt" id="sumRes">🔬 Research</button><button class="btn" id="sumNext">▶️ Next season</button></div>`;
  $('summary').classList.remove('hidden');
  $('sumRes').onclick = () => goHome(canMove ? 'labs' : 'research');
  $('sumNext').onclick = () => startSeason(true);
}
function goHome(tab) {
  mode = 'home';
  if (meta.run && meta.run.over) meta.run = null;
  $('summary').classList.add('hidden'); $('hud').classList.add('hidden'); $('home').classList.remove('hidden');
  closeSheet(); closeAlert();
  showTab(tab || 'lab');
  save();
}

/* ---------- home ---------- */
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { S.play('tap'); showTab(b.dataset.tab); }));
function showTab(t) {
  homeTab = t;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  for (const id of ['lab', 'research', 'labs', 'more']) $('tab-' + id).classList.toggle('hidden', id !== t);
  renderHome();
  computeView();
}
function renderHome() {
  $('repTxt').textContent = meta.rep;
  $('trophyChip').classList.toggle('hidden', !meta.trophies && meta.lab === 0);
  $('trophyTxt').textContent = meta.trophies;
  $('btnMute').textContent = meta.settings.mute ? '🔇' : '🔊';
  const L = D.LABS[meta.lab];
  $('labLine').innerHTML = `${L.icon} ${L.name} · ${L.slots} printer slots${meta.lab ? ` · ×${L.repMul} ⭐` : ''}`;
  $('btnGo').firstChild.textContent = meta.run ? '▶️ Continue season' : '▶️ Start season';
  $('goSub').textContent = meta.run ? `${fmtT(meta.run.len - meta.run.t)} left until the expo` : '~10 min · rent every 2:30 · expo at the end';
  $('records').innerHTML = meta.seasons ? `<span>🗓️ ${meta.seasons} season${meta.seasons > 1 ? 's' : ''}</span><span>🏅 best +${meta.best.rep}⭐</span><span>📦 best ${meta.best.orders}</span><span>⭐ lifetime ${meta.lifetimeRep}</span>` : '<span>👋 First day in the garage!</span>';
  $('dotRes').classList.toggle('hidden', !D.RESEARCH.some((n) => C.researchState(meta, n.id) === 'buy'));
  $('dotLabs').classList.toggle('hidden', !(D.LABS[meta.lab + 1] && C.labState(meta, meta.lab + 1) === 'buy'));
  if (homeTab === 'research') renderResearch();
  if (homeTab === 'labs') renderLabs();
  if (homeTab === 'more') renderMore();
}
function renderResearch() {
  const wrap = $('resMap');
  requestAnimationFrame(() => {
    M.renderMap(wrap, {
      nodes: D.RESEARCH, kind: 'res', state: (id) => C.researchState(meta, id),
      badge: (id, st) => st === 'owned' ? '✔' : D.RESEARCH.find((n) => n.id === id).cost + '⭐',
      onSelect: (id) => { resSel = id; S.play('tap'); renderResearchInfo(); wrap.querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.id === id)); },
    });
    if (resSel) wrap.querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.id === resSel));
  });
  renderResearchInfo();
}
function renderResearchInfo() {
  let box = $('resInfo');
  if (!box) { box = el('div', ''); box.id = 'resInfo'; $('tab-research').appendChild(box); }
  box.innerHTML = '';
  const n = D.RESEARCH.find((x) => x.id === (resSel || 'lab'));
  const st = C.researchState(meta, n.id);
  const ni = el('div', 'nodeinfo', `<span class="big">${n.icon}</span><div class="txt"><b>${n.name}</b>${n.desc}${n.root ? `<br><small>Tap a node · you have ${meta.rep} ⭐</small>` : ''}</div>`);
  if (!n.root) {
    const b = el('button', 'btn', st === 'owned' ? '✔ Done' : st === 'locked' ? '🔒 Locked' : `Research · ${n.cost}⭐`);
    b.disabled = st !== 'buy'; b.id = 'btnResearch';
    b.onclick = () => { if (C.buyResearch(meta, n.id).ok) { S.play('buy'); toast(`${n.icon} ${n.name} researched!`); save(); renderHome(); } };
    ni.appendChild(b);
  }
  box.appendChild(ni);
}
const LAB_NODES = () => [
  { id: 'L0', x: 1, y: 0, icon: D.LABS[0].icon, name: D.LABS[0].name, root: true },
  { id: 'L1', x: 1, y: 1.4, icon: D.LABS[1].icon, name: D.LABS[1].name, req: 'L0' },
  { id: 'catbed', x: 0, y: 2.4, icon: D.PERKS[0].icon, name: D.PERKS[0].name, req: 'L1', small: true },
  { id: 'sign', x: 1, y: 2.6, icon: D.PERKS[1].icon, name: D.PERKS[1].name, req: 'L1', small: true },
  { id: 'coffee', x: 2, y: 2.4, icon: D.PERKS[2].icon, name: D.PERKS[2].name, req: 'L1', small: true },
  { id: 'L2', x: 1, y: 3.9, icon: D.LABS[2].icon, name: D.LABS[2].name, req: 'L1' },
];
function labNodeState(id) {
  if (id[0] === 'L') return C.labState(meta, +id[1]);
  const pk = D.PERKS.find((x) => x.id === id);
  if (meta.perks[id]) return 'owned';
  if (meta.lab < 1) return 'locked';
  return meta.trophies >= pk.cost ? 'buy' : 'poor';
}
function renderLabs() {
  const wrap = $('labMap');
  $('labsSub').textContent = meta.lab === 0 ? `Earn ${D.LABS[1].need} ⭐ in the Garage (${meta.labRep}/${D.LABS[1].need}) to move to the Workshop.` : `Trophies 🏆 buy lab perks. Factory coming in a later update.`;
  requestAnimationFrame(() => {
    M.renderMap(wrap, {
      nodes: LAB_NODES(), kind: 'labs', state: labNodeState,
      badge: (id, st) => {
        if (id[0] === 'L') { const L = D.LABS[+id[1]]; return st === 'here' ? '📍 here' : st === 'done' ? '✔' : L.soon ? 'soon' : `${meta.labRep}/${L.need}⭐`; }
        return st === 'owned' ? '✔' : D.PERKS.find((x) => x.id === id).cost + '🏆';
      },
      onSelect: (id) => { labSel = id; S.play('tap'); renderLabInfo(); wrap.querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.id === id)); },
    });
  });
  renderLabInfo();
}
function renderLabInfo() {
  let box = $('labInfo');
  if (!box) { box = el('div', ''); box.id = 'labInfo'; $('tab-labs').appendChild(box); }
  box.innerHTML = '';
  const id = labSel || ('L' + Math.min(meta.lab + 1, 2));
  const st = labNodeState(id);
  if (id[0] === 'L') {
    const L = D.LABS[+id[1]];
    const ni = el('div', 'nodeinfo', `<span class="big">${L.icon}</span><div class="txt"><b>${L.name}${st === 'here' ? ' 📍' : ''}</b>${L.desc}${L.need && st !== 'here' && st !== 'done' && !L.soon ? `<br><small>Moving resets Research & ⭐ but gives 🏆 ${C.trophiesFor(meta)} trophies.</small>` : ''}</div>`);
    if (+id[1] === meta.lab + 1) {
      const b = el('button', 'btn', L.soon ? '🚧 Soon' : st === 'buy' ? `🚚 Move!` : `${meta.labRep}/${L.need}⭐`);
      b.disabled = st !== 'buy'; b.id = 'btnMove';
      b.onclick = () => confirmMove(L);
      ni.appendChild(b);
    }
    box.appendChild(ni);
  } else {
    const pk = D.PERKS.find((x) => x.id === id);
    const ni = el('div', 'nodeinfo', `<span class="big">${pk.icon}</span><div class="txt"><b>${pk.name}</b>${pk.desc}${meta.lab < 1 ? '<br><small>Unlocks in the Workshop.</small>' : ''}</div>`);
    const b = el('button', 'btn', st === 'owned' ? '✔' : `${pk.cost}🏆`); b.disabled = st !== 'buy';
    b.onclick = () => { if (C.buyPerk(meta, id).ok) { S.play('buy'); save(); renderHome(); } };
    ni.appendChild(b); box.appendChild(ni);
  }
}
function confirmMove(L) {
  sheet = { kind: 'confirm' };
  const card = $('sheetCard');
  card.innerHTML = head(L.icon, `Move to the ${L.name}?`) + `<p>${L.desc}</p><p>📦 You pack up and start fresh: <b>Research and ⭐ Reputation reset</b>. You keep your 🏆 trophies and gain <b>${C.trophiesFor(meta)} more</b>.</p><div class="row2"><button class="btn alt" data-close>Not yet</button><button class="btn" id="btnMoveYes">🚚 Let's move!</button></div>`;
  wireClose(card);
  $('sheet').classList.remove('hidden');
  $('btnMoveYes').onclick = () => {
    const res = C.moveLab(meta);
    closeSheet();
    if (res.ok) { S.play('end'); PF.happy(); save(); labSel = null; resSel = null; toast(`${L.icon} Welcome to the ${L.name}!`, `🏆 +${res.trophies} trophies`); showTab('lab'); }
  };
}
function renderMore() {
  $('helpCard').innerHTML = `<h2>❓ How to play</h2>${helpHtml()}
    <h2>🔊 Sound</h2><div class="row2"><button class="btn alt" id="mMute">${meta.settings.mute ? '🔇 Sound off' : '🔊 Sound on'}</button></div>
    <h2>💾 Save</h2><p class="small">Saved on this device automatically (also mid-season).</p>
    <div class="row2"><button class="btn danger" id="mReset">🗑️ Reset everything</button></div>
    <p class="small">Bonsai Lab v${D.VERSION} · made with Canvas + WebAudio, no downloads. Add <code>?speed=10</code> to the URL for a fast debug season.</p>`;
  $('mMute').onclick = toggleMute;
  $('mReset').onclick = () => {
    if ($('mReset').dataset.sure) { PF.storage.remove(D.SAVE_KEY); meta = C.newMeta(); save(); toast('🗑️ Fresh start'); renderHome(); return; }
    $('mReset').dataset.sure = '1'; $('mReset').textContent = '⚠️ Tap again to wipe';
  };
}
function toggleMute() { meta.settings.mute = !meta.settings.mute; S.setMuted(meta.settings.mute); save(); renderHome(); }
$('btnMute').addEventListener('click', toggleMute);
$('btnGo').addEventListener('click', () => startSeason(false));

/* ---------- boot ---------- */
root.addEventListener('resize', () => { resize(); if (mode === 'home') renderHome(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'run' && run() && !run().over) paused = true; save(); } });
root.addEventListener('pagehide', save);
PF.loadingStart();
PF.init().then(() => {
  load();
  resize();
  showTab('lab');
  PF.loadingStop();
  requestAnimationFrame((t) => { lastFrame = t; PF.firstFrame(); PF.ready(); requestAnimationFrame(frame); });
});

/* test / debug handle */
root.__bl = {
  get meta() { return meta; }, set meta(m) { meta = m; }, get run() { return run(); }, get mode() { return mode; }, get sel() { return sel; },
  C, D, R, startSeason, goHome, showTab, openAlert, closeAlert, openSheet, closeSheet, tapAt, tapPrinter, save, load, renderHome,
  setPaused: (v) => { paused = v; }, selectOrder: (id) => { sel = id; ordersSig = ''; }, get view() { return view; },
};
})(window);
