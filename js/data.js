/* Bonsai Lab - static game data (orders, printers, materials, problems, upgrade/research/lab maps).
 * Classic script: everything hangs off window.BL so the game opens straight from file:// (no modules, no build). */
(function (root) {
'use strict';
const BL = root.BL = root.BL || {};

const PAPAYA = '#FF8000';
const COLORS = ['#FF8000', '#F4EFE6', '#2B2B2E', '#2FA8A0', '#E0473C', '#F2C230', '#3D7BD9', '#6BB34A', '#F08BB0', '#8E6BD1'];

/* Filament materials. price = per 1 kg spool. warpOpen: extra trouble on open-frame printers. */
const MATS = {
  PLA:  { id: 'PLA',  name: 'PLA',  price: 20, color: '#7FC97F', speed: 1.0, clog: 1.0, string: 0.6, adh: 1.0, note: 'Easy, prints on anything' },
  PETG: { id: 'PETG', name: 'PETG', price: 24, color: '#5DADE2', speed: 0.9, clog: 1.0, string: 1.8, adh: 0.8, note: 'Tough, likes to string' },
  TPU:  { id: 'TPU',  name: 'TPU',  price: 32, color: '#C39BD3', speed: 0.6, clog: 2.2, string: 1.4, adh: 0.6, note: 'Bendy, slow, clogs. Single colour only' },
  ABS:  { id: 'ABS',  name: 'ABS',  price: 26, color: '#F0B27A', speed: 1.0, clog: 1.0, string: 0.8, adh: 1.4, enclosed: true, note: 'Heat-proof. Warps without an enclosure' },
  MYS:  { id: 'MYS',  name: 'Mystery', price: 0, color: '#d6a2e8', speed: 1.0, clog: 1.5, string: 0.8, adh: 1.0, note: 'Recycled PLA in a surprise colour. Any-colour PLA orders use it first' },
};
const MAT_ORDER = ['PLA', 'PETG', 'TPU', 'ABS'];

/* Printer models - toy versions of real machines. */
const PRINTERS = {
  sprout:  { id: 'sprout',  name: 'Sprout',  look: 'slinger', speed: 1.0, colors: 1, enclosed: false, q: 3.5, cost: 160, icon: '🌱',
             blurb: 'Open-frame bed-slinger. Cheap, cheerful, a bit slow.', body: '#e9e2d4', accent: PAPAYA },
  kestrel: { id: 'kestrel', name: 'Kestrel', look: 'box',     speed: 1.75, colors: 1, enclosed: true, q: 4.0, cost: 180, icon: '🦅',
             blurb: 'Fast closed-frame CoreXY. Handles ABS, warps less.', body: '#3a3a40', accent: PAPAYA },
  rainbow: { id: 'rainbow', name: 'Rainbow', look: 'ams',     speed: 1.25, colors: 4, enclosed: false, q: 4.0, cost: 230, icon: '🌈',
             blurb: 'Bed-slinger with a 4-spool colour changer. Multi-colour jobs!', body: '#f2ede4', accent: PAPAYA },
};
const PRINTER_ORDER = ['sprout', 'kestrel', 'rainbow'];

/* Order templates. work = seconds on a speed-1 printer, q = quality bar in stars, nc = colour count,
 * any = customer is fine with any colour (mystery filament OK), lab = minimum lab level. */
const ORDERS = [
  { id: 'stand',   name: 'Phone stand',        icon: '📱', mat: 'PLA',  nc: 1, q: 2,   work: 38,  g: 60,  pay: 42,  shape: 'wedge', w: 3 },
  { id: 'clips',   name: 'Cable clips ×20',    icon: '🔌', mat: 'PLA',  nc: 1, q: 1,   work: 24,  g: 30,  pay: 26,  shape: 'flat',  w: 3, any: true },
  { id: 'keys',    name: 'Keychains ×10',      icon: '🔑', mat: 'PLA',  nc: 1, q: 2,   work: 30,  g: 40,  pay: 34,  shape: 'flat',  w: 3, any: true },
  { id: 'helmet',  name: 'Cosplay helmet piece', icon: '🪖', mat: 'PLA', nc: 1, q: 3,  work: 110, g: 420, pay: 135, shape: 'dome',  w: 1.5 },
  { id: 'figure',  name: 'Multi-colour figurine', icon: '🧸', mat: 'PLA', nc: 4, q: 3.5, work: 85, g: 120, pay: 150, shape: 'fig',  w: 2 },
  { id: 'gears',   name: 'Gear set',           icon: '⚙️', mat: 'PETG', nc: 1, q: 3,   work: 48,  g: 90,  pay: 58,  shape: 'gear',  w: 2.5 },
  { id: 'vase',    name: 'Spiral vase',        icon: '🏺', mat: 'PETG', nc: 1, q: 3,   work: 55,  g: 110, pay: 62,  shape: 'vase',  w: 2 },
  { id: 'case',    name: 'Phone case',         icon: '📲', mat: 'TPU',  nc: 1, q: 3,   work: 44,  g: 40,  pay: 64,  shape: 'flat',  w: 2 },
  { id: 'bumper',  name: 'Drone bumpers',      icon: '🛸', mat: 'TPU',  nc: 1, q: 2,   work: 34,  g: 35,  pay: 48,  shape: 'ring',  w: 1.5 },
  { id: 'vent',    name: 'Car vent clip',      icon: '🚗', mat: 'ABS',  nc: 1, q: 2.5, work: 36,  g: 45,  pay: 50,  shape: 'wedge', w: 2 },
  { id: 'bracket', name: 'Engine-bay bracket', icon: '🔧', mat: 'ABS',  nc: 1, q: 3.5, work: 70,  g: 140, pay: 104, shape: 'box',   w: 1.5 },
  { id: 'insert',  name: 'Board-game inserts', icon: '🎲', mat: 'PLA',  nc: 2, q: 2,   work: 62,  g: 200, pay: 82,  shape: 'box',   w: 2 },
  { id: 'pot',     name: 'Bonsai pot',         icon: '🪴', mat: 'PETG', nc: 1, q: 2,   work: 40,  g: 90,  pay: 46,  shape: 'pot',   w: 2.5 },
  { id: 'litho',   name: 'Lithophane lamp',    icon: '🏮', mat: 'PLA',  nc: 1, q: 4,   work: 58,  g: 70,  pay: 74,  shape: 'cyl',   w: 1.5 },
  { id: 'sign',    name: 'Café logo sign',     icon: '☕', mat: 'PLA',  nc: 3, q: 3,   work: 56,  g: 110, pay: 98,  shape: 'flat',  w: 2 },
  { id: 'fidget',  name: 'Fidget toys',        icon: '🌀', mat: 'PLA',  nc: 1, q: 2,   work: 30,  g: 50,  pay: 36,  shape: 'gear',  w: 2.5, any: true },
  { id: 'picase',  name: 'Raspberry Pi case',  icon: '🍓', mat: 'ABS',  nc: 1, q: 3,   work: 50,  g: 80,  pay: 70,  shape: 'box',   w: 1.5 },
  { id: 'insole',  name: 'Running insoles',    icon: '👟', mat: 'TPU',  nc: 1, q: 3,   work: 56,  g: 70,  pay: 78,  shape: 'flat',  w: 1.2 },
  { id: 'chess',   name: 'Chess set',          icon: '♟️', mat: 'PLA',  nc: 2, q: 4,   work: 100, g: 260, pay: 155, shape: 'fig',   w: 1.2 },
  { id: 'racecar', name: 'Papaya race-car model', icon: '🏎️', mat: 'PLA', nc: 4, q: 4, work: 95, g: 150, pay: 185, shape: 'wedge', w: 1.2 },
  { id: 'knob',    name: 'Replacement knob',   icon: '🎛️', mat: 'PETG', nc: 1, q: 2,   work: 26,  g: 20,  pay: 30,  shape: 'cyl',   w: 2.5 },
  // Workshop (lab 1+) orders: bigger, pickier, better paid
  { id: 'drone',   name: 'Racing-drone frame', icon: '🚁', mat: 'ABS',  nc: 1, q: 4,   work: 90,  g: 160, pay: 165, shape: 'ring',  w: 1.6, lab: 1 },
  { id: 'topo',    name: 'Topographic map',    icon: '🗺️', mat: 'PLA',  nc: 4, q: 4,   work: 130, g: 300, pay: 260, shape: 'flat',  w: 1.4, lab: 1 },
  { id: 'proto',   name: 'Prototype batch',    icon: '📦', mat: 'PETG', nc: 1, q: 3.5, work: 120, g: 380, pay: 205, shape: 'box',   w: 1.6, lab: 1 },
  { id: 'arch',    name: 'Architect model',    icon: '🏛️', mat: 'PLA',  nc: 2, q: 4.5, work: 115, g: 240, pay: 240, shape: 'box',   w: 1.2, lab: 1 },
  { id: 'grip',    name: 'Bike grips',         icon: '🚲', mat: 'TPU',  nc: 1, q: 3.5, work: 60,  g: 90,  pay: 110, shape: 'cyl',   w: 1.4, lab: 1 },
];

/* Printer problems. Each has distinct fixes. stop:false = printer keeps going while you decide. */
const PROBLEMS = {
  clog:     { id: 'clog', icon: '🧱', title: 'Clogged nozzle', say: 'Hey, I have this issue! My nozzle is clogged, nothing comes out 😖', stop: true },
  axis:     { id: 'axis', icon: '⚙️', title: 'X/Y axis broke', say: 'Hey, I have this issue! My belt snapped and the toolhead is stuck 😵', stop: true },
  adhesion: { id: 'adhesion', icon: '🍝', title: 'Print came loose', say: 'Hey, I have this issue! The print let go of my bed… spaghetti everywhere 🍝', stop: true },
  string:   { id: 'string', icon: '🕸️', title: 'Stringing', say: 'Hey, I have this issue! I\'m making cobwebs, the filament is wet 🕸️', stop: false },
  warp:     { id: 'warp', icon: '🥴', title: 'Warping', say: 'Hey, I have this issue! My corners are curling up off the bed 🥴', stop: false },
  power:    { id: 'power', icon: '🔌', title: 'Power drop / offline', say: 'Hey, I have this issue! Power blipped and I lost Wi-Fi. I\'m offline 🔌', stop: true },
  runout:   { id: 'runout', icon: '🧵', title: 'Out of filament', say: 'Hey, I have this issue! I ran out of filament 🧵', stop: true },
};

/* In-run upgrade map (bought with money, resets every season). x/y = grid position on the map. */
const UPGRADES = [
  { id: 'garage',   name: 'Your garage',      icon: '🏠', x: 1.5, y: 0, cost: 0, root: true, desc: 'Every upgrade here lasts for this season.' },
  { id: 'hotend',   name: 'Fast hotends',     icon: '🔥', x: 0, y: 1, cost: 70,  req: 'garage', desc: 'All printers print 25% faster.' },
  { id: 'hotend2',  name: 'Pro hotends',      icon: '☄️', x: 0, y: 2, cost: 150, req: 'hotend', desc: 'Another +25% print speed.' },
  { id: 'flyer',    name: 'Marketing flyers', icon: '📣', x: 0, y: 3, cost: 90,  req: 'hotend2', desc: 'Orders arrive 30% more often and pay 10% more.' },
  { id: 'hardened', name: 'Hardened nozzles', icon: '🔩', x: 1.5, y: 1, cost: 50,  req: 'garage', desc: 'Clogs happen 60% less often. Great for TPU & mystery filament.' },
  { id: 'pei',      name: 'Textured PEI plates', icon: '🧇', x: 1.5, y: 2, cost: 60, req: 'hardened', desc: 'Prints let go of the bed half as often.' },
  { id: 'kit',      name: 'Service kit',      icon: '🧰', x: 1.5, y: 3, cost: 70,  req: 'pei', desc: 'Servicing is free and twice as fast. Printers wear 35% slower.' },
  { id: 'drybox',   name: 'Filament dry box', icon: '📦', x: 3, y: 1, cost: 55,  req: 'garage', desc: 'Stringing happens 60% less often.' },
  { id: 'enclose',  name: 'Enclosure kits',   icon: '🧊', x: 3, y: 2, cost: 90,  req: 'drybox', desc: 'Open-frame printers get a cosy box: ABS prints properly, less warping.' },
  { id: 'calib',    name: 'Calibration day',  icon: '📐', x: 3, y: 3, cost: 100, req: 'enclose', desc: 'All printers +0.5★ quality.' },
  { id: 'board',    name: 'Bigger order board', icon: '📋', x: 3, y: 0, cost: 40, req: 'garage', desc: '+2 order slots and customers wait 40% longer.', small: true },
];

/* Research map (bought with Reputation ⭐, persists between seasons, resets when you move lab). */
const RESEARCH = [
  { id: 'lab',     name: 'Lab notebook',     icon: '📓', x: 1.5, y: 0, cost: 0, root: true, desc: 'Research stays with you between seasons.' },
  // materials
  { id: 'bulk',    name: 'Bulk spools',      icon: '🧵', x: 0, y: 1, cost: 3, req: 'lab',  branch: 'mat', desc: 'Filament is 25% cheaper.' },
  { id: 'dryer',   name: 'Filament dryer',   icon: '♨️', x: 0, y: 2, cost: 5, req: 'bulk', branch: 'mat', desc: 'Stringing & warping are fixed instantly for free.' },
  { id: 'recpro',  name: 'Recycler Pro',     icon: '♻️', x: 0, y: 3, cost: 6, req: 'dryer', branch: 'mat', desc: 'Scrap recycler works 2× faster and wastes less.' },
  { id: 'supplier', name: 'Supplier deal',   icon: '🤝', x: 0, y: 4, cost: 9, req: 'recpro', branch: 'mat', desc: 'Start each season with +1 spool of every material and +$60.' },
  // automation
  { id: 'spares',  name: 'Spare nozzle stock', icon: '🔩', x: 1.5, y: 1, cost: 3, req: 'lab', branch: 'auto', desc: 'Start each season with 2 spare nozzles.' },
  { id: 'swap',    name: 'Auto plate swap',  icon: '🔄', x: 1.5, y: 2, cost: 5, req: 'spares', branch: 'auto', desc: 'Finished prints are delivered automatically and the next job starts.' },
  { id: 'ups',     name: 'Power-loss recovery', icon: '🔋', x: 1.5, y: 3, cost: 6, req: 'swap', branch: 'auto', desc: 'Power drops never lose progress and reboot in 4 s.' },
  { id: 'sched',   name: 'Smart scheduler',  icon: '🗓️', x: 1.5, y: 4, cost: 9, req: 'ups', branch: 'auto', desc: 'Printer queues hold 4 jobs and customers wait longer.' },
  // quality
  { id: 'autocal', name: 'Auto calibration', icon: '📏', x: 3, y: 1, cost: 4, req: 'lab', branch: 'q', desc: 'All printers +0.5★ quality.' },
  { id: 'camera',  name: 'AI camera',        icon: '📷', x: 3, y: 2, cost: 6, req: 'autocal', branch: 'q', desc: 'Catches spaghetti early: a failed print keeps 70% of its progress.' },
  { id: 'lidar',   name: 'Lidar first layer', icon: '🔦', x: 3, y: 3, cost: 7, req: 'camera', branch: 'q', desc: 'Bed-adhesion failures happen 60% less.' },
  { id: 'expo',    name: 'Expo showcase',    icon: '🏆', x: 3, y: 4, cost: 10, req: 'lidar', branch: 'q', desc: '+50% Reputation at the end of each season.' },
];

/* Lab (prestige) map. */
const LABS = [
  { id: 0, name: 'Garage',   icon: '🏠', slots: 3, repMul: 1,   rentMul: 1,    startMoney: 170, start: ['sprout'],
    desc: 'Three printer slots on a wobbly workbench. Where every maker starts.' },
  { id: 1, name: 'Workshop', icon: '🏭', slots: 4, repMul: 1.5, rentMul: 3.5, startMoney: 260, start: ['sprout', 'kestrel'], need: 100,
    desc: '4 printer slots, starts with a Kestrel, bigger & better-paid orders, ×1.5 Reputation. Rent is a lot higher.' },
  { id: 2, name: 'Factory',  icon: '🏗️', slots: 6, repMul: 2, rentMul: 1.8, startMoney: 400, start: ['sprout', 'kestrel', 'rainbow'], need: 150, soon: true,
    desc: 'Coming in a future update: print farm, staff-free automation lines.' },
];
const PERKS = [
  { id: 'catbed', name: 'Cat bed',      icon: '🐈', cost: 1, desc: 'Miso the cat visits twice as often. Petting gives +$15.' },
  { id: 'sign',   name: 'Shop sign',    icon: '🪧', cost: 2, desc: 'Start every season at 3.5★ rating.' },
  { id: 'coffee', name: 'Coffee machine', icon: '☕', cost: 3, desc: 'You work faster: fixes and services take 25% less time.' },
];

const RENT = { every: 150, base: [60, 130, 240, 300, 360], power: 0.06 };
const SEASON = 600;

BL.Data = { PAPAYA, COLORS, MATS, MAT_ORDER, PRINTERS, PRINTER_ORDER, ORDERS, PROBLEMS, UPGRADES, RESEARCH, LABS, PERKS, RENT, SEASON,
  SAVE_KEY: 'bonsailab.save.v1', VERSION: '0.1.0' };
})(typeof window !== 'undefined' ? window : globalThis);
