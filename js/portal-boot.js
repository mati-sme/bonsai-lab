/* portal-boot.js - used only by portal builds (tools/portal-build.py rewrites index.html to load it).
 * 1) init the portal SDK (so the CrazyGames data module is ready before the game reads its save),
 * 2) report loadingStart, load the game's scripts in their original order,
 * 3) after the first two frames, report loadingStop. gameplayStart comes later, from the game, once the player is playing. */
(function () {
  'use strict';
  const P = window.BL.Platform, list = window.__GAME_SCRIPTS || [];
  const load = (src) => new Promise((res) => {
    const el = document.createElement('script');
    el.src = src; el.async = false; el.onload = res;
    el.onerror = () => { console.error('Could not load ' + src); res(); };
    document.body.appendChild(el);
  });
  P.init()
    .then(() => { P.loading(true); return list.reduce((p, s) => p.then(() => load(s)), Promise.resolve()); })
    .then(() => window.BL.ready || null)
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    .then(() => { P.loading(false); window.__portalReadyMs = Math.round(performance.now()); });
})();
