/* Bonsai Lab - tiny WebAudio synth. No audio files: every sound is a few oscillators. */
(function (root) {
'use strict';
let ac = null, master = null, muted = false;
function ensure() {
  if (muted) return null;
  if (!ac) {
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, dur, type, vol, delay, slide) {
  const a = ensure(); if (!a) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
const S = {
  tap: () => tone(660, 0.06, 'triangle', 0.15),
  select: () => { tone(520, 0.07, 'triangle', 0.18); tone(780, 0.08, 'triangle', 0.15, 0.05); },
  assign: () => { tone(392, 0.08, 'square', 0.08); tone(523, 0.1, 'square', 0.08, 0.06); },
  coin: () => { tone(988, 0.08, 'square', 0.1); tone(1319, 0.22, 'square', 0.1, 0.07); },
  done: () => { tone(523, 0.12, 'triangle', 0.2); tone(659, 0.12, 'triangle', 0.2, 0.1); tone(784, 0.25, 'triangle', 0.2, 0.2); },
  alert: () => { tone(880, 0.14, 'sawtooth', 0.09); tone(622, 0.22, 'sawtooth', 0.09, 0.15); },
  fix: () => { tone(300, 0.05, 'square', 0.1); tone(450, 0.05, 'square', 0.1, 0.07); tone(600, 0.1, 'square', 0.1, 0.14); },
  error: () => tone(160, 0.2, 'sawtooth', 0.12, 0, 110),
  rent: () => { tone(1200, 0.05, 'square', 0.1); tone(1600, 0.3, 'triangle', 0.15, 0.06); },
  buy: () => { tone(700, 0.06, 'triangle', 0.15); tone(1050, 0.12, 'triangle', 0.15, 0.06); },
  meow: () => { tone(700, 0.35, 'sine', 0.2, 0, 1100); tone(900, 0.25, 'sine', 0.12, 0.3, 500); },
  order: () => tone(1046, 0.09, 'sine', 0.12),
  end: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.13)); },
};
root.BL.Sfx = { play: (n) => { try { if (!muted && S[n]) S[n](); } catch (e) { /* audio is optional */ } }, setMuted: (m) => { muted = !!m; }, get muted() { return muted; }, unlock: ensure };
})(window);
