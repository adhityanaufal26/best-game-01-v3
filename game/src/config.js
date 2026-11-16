// config.js — all tuning for Aurora Bastion: map path, towers, enemies, waves.
// Palette: deep indigo night, aurora green/violet ribbons, ice-blue towers,
// ember-orange void enemies. Nothing here copies any other game.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;
export const FIELD_TOP = 78;
export const FIELD_BOTTOM = 640;
export const START_GOLD = 260;
export const START_LIVES = 20;
export const MAX_WAVES = 12;

// Serpentine road the void horde marches along (x, y) waypoints.
export const PATH = [
  [-40, 150], [300, 150], [300, 300], [980, 300], [980, 450],
  [220, 450], [220, 580], [1040, 580], [1040, 690], [1320, 690],
];

// Build plots: open snowfields where towers may stand (x, y, radius).
export const PLOTS = [
  [150, 230], [430, 210], [620, 210], [830, 210], [1080, 210],
  [150, 380], [420, 380], [640, 380], [860, 380], [1100, 380],
  [120, 520], [360, 530], [560, 530], [760, 530], [920, 530],
  [420, 640], [640, 640], [860, 640], [1180, 620], [90, 120],
];

// Tower catalogue. kind: lance=fast single, prism=chain, mortar=AoE,
// gale=rapid spray, obelisk=slow aura. cost is level-1 price.
export const TOWERS = {
  lance: {
    name: 'Frost Lance', key: '1', cost: 60, color: '#7fe7ff', glow: '#38b6ff',
    range: 150, rate: 1.9, damage: 14, projSpeed: 620, slow: 0.25, slowSecs: 0.9,
    desc: 'Fast ice bolt. Chills foes.',
    upgrade: { cost: 55, damage: 26, range: 165, rate: 2.3 },
    upgrade2: { cost: 110, damage: 48, range: 185, rate: 2.9 },
  },
  prism: {
    name: 'Aurora Prism', key: '2', cost: 110, color: '#b78cff', glow: '#8a4dff',
    range: 170, rate: 0.85, damage: 22, chains: 3, projSpeed: 900,
    desc: 'Aurora beam chains to foes.',
    upgrade: { cost: 100, damage: 38, chains: 4, range: 185, rate: 1.0 },
    upgrade2: { cost: 190, damage: 66, chains: 6, range: 205, rate: 1.2 },
  },
  mortar: {
    name: 'Star Mortar', key: '3', cost: 140, color: '#ffd166', glow: '#ff9a3c',
    range: 200, rate: 0.55, damage: 42, splash: 70, projSpeed: 420,
    desc: 'Lobbed star-shells burst.',
    upgrade: { cost: 130, damage: 78, splash: 90, range: 215, rate: 0.65 },
    upgrade2: { cost: 240, damage: 140, splash: 115, range: 235, rate: 0.8 },
  },
  gale: {
    name: 'Gale Harp', key: '4', cost: 80, color: '#8affd1', glow: '#2ee6a8',
    range: 130, rate: 4.2, damage: 6, projSpeed: 700,
    desc: 'A rapid storm of notes.',
    upgrade: { cost: 75, damage: 11, range: 145, rate: 5.0 },
    upgrade2: { cost: 150, damage: 20, range: 160, rate: 6.2 },
  },
  obelisk: {
    name: 'Rune Obelisk', key: '5', cost: 170, color: '#ff7ad9', glow: '#d6339c',
    range: 120, rate: 0.5, damage: 8, aura: true, auraDps: 16, auraR: 130,
    desc: 'A rune that burns nearby.',
    upgrade: { cost: 160, auraDps: 34, auraR: 150, damage: 14, range: 135 },
    upgrade2: { cost: 300, auraDps: 68, auraR: 175, damage: 26, range: 150 },
  },
};
export const TOWER_ORDER = ['lance', 'prism', 'mortar', 'gale', 'obelisk'];

// Enemy kinds. hp scales with wave via waveHpMult in world.js.
export const ENEMIES = {
  mote:    { name: 'Ember Mote',   hp: 34,  speed: 62,  gold: 6,  dmg: 1, r: 11, color: '#ff8a3c', score: 10 },
  skitter: { name: 'Skitter',      hp: 26,  speed: 118, gold: 7,  dmg: 1, r: 10, color: '#ffb347', score: 15 },
  wisp:    { name: 'Void Wisp',    hp: 48,  speed: 96,  gold: 9,  dmg: 1, r: 12, color: '#c77dff', score: 20 },
  brute:   { name: 'Cinder Brute', hp: 170, speed: 44,  gold: 14, dmg: 2, r: 18, color: '#ff5a3c', score: 30 },
  shield:  { name: 'Shard Guard',  hp: 130, speed: 54,  gold: 12, dmg: 1, r: 14, color: '#9db4ff', armor: 6, score: 25 },
  healer:  { name: 'Kindle Witch', hp: 90,  speed: 58,  gold: 16, dmg: 1, r: 13, color: '#ff6b9d', heals: 14, score: 40 },
  splitter:{ name: 'Splinter',     hp: 60,  speed: 78,  gold: 8,  dmg: 1, r: 13, color: '#ffcf5c', splits: 2, score: 25 },
  wraith:  { name: 'Frost Wraith', hp: 220, speed: 70,  gold: 20, dmg: 2, r: 15, color: '#7fe7ff', score: 50 },
  boss:    { name: 'VOID SOVEREIGN', hp: 5200, speed: 34, gold: 400, dmg: 10, r: 34, color: '#ff2e63', score: 1000, boss: true },
};

// Wave table: 12 waves, each a list of [kind, count, gapSeconds].
// Wave 6 and 12 carry mini-boss / boss. Composition escalates every wave.
export const WAVES = [
  { intro: 'The embers stir.', groups: [['mote', 10, 0.9]] },
  { intro: 'Skitters ride the wind.', groups: [['mote', 8, 0.8], ['skitter', 8, 0.7]] },
  { intro: 'Wisps drift through the dark.', groups: [['mote', 10, 0.7], ['wisp', 8, 0.9], ['skitter', 6, 0.6]] },
  { intro: 'Something heavy approaches.', groups: [['brute', 4, 1.4], ['mote', 12, 0.6], ['skitter', 8, 0.6]] },
  { intro: 'Shard Guards raise their shields.', groups: [['shield', 6, 1.1], ['wisp', 10, 0.8], ['mote', 10, 0.5]] },
  { intro: 'The Kindles mend the horde.', groups: [['healer', 5, 1.3], ['brute', 6, 1.2], ['skitter', 12, 0.5]] },
  { intro: 'Splinters crack apart.', groups: [['splitter', 10, 0.9], ['shield', 6, 1.0], ['wisp', 10, 0.7]] },
  { intro: 'Wraiths freeze the road.', groups: [['wraith', 6, 1.2], ['brute', 6, 1.1], ['skitter', 14, 0.45]] },
  { intro: 'The horde doubles its fury.', groups: [['mote', 18, 0.4], ['shield', 8, 0.9], ['healer', 6, 1.1], ['wraith', 5, 1.0]] },
  { intro: 'Cinder Brutes in force.', groups: [['brute', 12, 0.9], ['splitter', 10, 0.7], ['wisp', 12, 0.6], ['healer', 5, 1.0]] },
  { intro: 'The night itself marches.', groups: [['wraith', 10, 0.9], ['shield', 10, 0.8], ['brute', 8, 0.9], ['skitter', 16, 0.4]] },
  { intro: 'THE VOID SOVEREIGN AWAKENS.', groups: [['boss', 1, 0.1], ['wisp', 10, 1.0], ['healer', 6, 1.2], ['brute', 8, 1.0]] },
];

export function waveHpMult(wave) { return 1 + (wave - 1) * 0.28 + Math.max(0, wave - 6) * 0.12; }
export function waveGoldBonus(wave) { return 40 + wave * 12; }
