/* Bonsai Lab - platform hook layer. Nothing external is loaded today: everything falls back to localStorage and no-ops.
 *
 * TODO(CrazyGames): load https://sdk.crazygames.com/crazygames-sdk-v3.js in a portal build (see Deep Buddies' tools/build-portals.sh
 *   + js/portal-boot.js for the pattern), then in init(): await window.CrazyGames.SDK.init();
 *   loadingStart/Stop -> SDK.game.loadingStart()/loadingStop(); gameplayStart/Stop -> SDK.game.gameplayStart()/gameplayStop();
 *   happy -> SDK.game.happytime(); storage -> SDK.data.getItem/setItem (cloud saves).
 * TODO(YouTube Playables): load https://www.youtube.com/game_api/v1 in a Playables build, then
 *   firstFrame -> ytgame.game.firstFrameReady(); ready -> ytgame.game.gameReady();
 *   storage -> ytgame.game.saveData(str) / loadData(); audio -> ytgame.system.onAudioEnabledChange(cb); pause -> ytgame.system.onPause/onResume.
 * The game only ever calls the functions below, so a portal build just swaps this file. */
(function (root) {
'use strict';
const backend = root.PLATFORM_BACKEND || 'local';
const Platform = {
  backend,
  init() { return Promise.resolve(); },
  loadingStart() {}, loadingStop() {},
  firstFrame() {}, ready() {},
  gameplayStart() {}, gameplayStop() {},
  happy() {},
  onPause(cb) { document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); }); },
  storage: {
    get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove(k) { try { root.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  },
};
root.BL = root.BL || {};
root.BL.Platform = Platform;
})(window);
