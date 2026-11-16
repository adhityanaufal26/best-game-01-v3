// shots.js — deterministic screenshot scenes for ?shot=<scene>.
// Each scene builds a fixed game state (seeded, no wall clock) and sets
// window.__shotReady when the frame is painted, so a headless browser can
// capture exactly the same image every run.
import { TOWERS, TOWER_ORDER, PLOTS } from './config.js';

export function applyShot(world, scene) {
  if (!scene) return false;
  world.audio.muted = true;
  if (scene === 'title') {
    world.screen = 'title';
    world.time = 3.2;
    world.bestScore = 4850;
    return true;
  }
  if (scene === 'play') {
    world.screen = 'playing';
    world.time = 42;
    world.wave = 5;
    world.betweenWaves = false;
    world.gold = 342;
    world.lives = 17;
    world.score = 2840;
    world.kills = 87;
    world.banner = 'WAVE 5 / 12 — Shard Guards raise their shields.';
    world.bannerT = 99;
    // A dense, legible mid-wave battlefield.
    const layout = [
      ['lance', 1, 1], ['prism', 2, 2], ['mortar', 3, 1], ['gale', 4, 2],
      ['obelisk', 5, 1], ['lance', 6, 3], ['prism', 7, 2], ['mortar', 8, 3],
      ['gale', 9, 1], ['lance', 10, 2], ['prism', 11, 1], ['mortar', 12, 2],
      ['gale', 13, 3], ['obelisk', 14, 1], ['lance', 15, 2], ['prism', 16, 1],
      ['mortar', 17, 2], ['gale', 18, 1],
    ];
    for (const [kind, plot, level] of layout) {
      const t = { kind, plot, x: 0, y: 0, level, cooldown: 0, angle: -0.6, pulse: 0.6 };
      world.towers.push(t);
    }
    // Place towers on their plots.
    for (const t of world.towers) { t.x = PLOTS[t.plot][0]; t.y = PLOTS[t.plot][1]; }
    const kinds = ['mote', 'mote', 'skitter', 'wisp', 'brute', 'shield', 'skitter', 'mote', 'wisp', 'healer', 'splitter', 'brute', 'mote', 'skitter', 'wraith', 'mote', 'shield', 'wisp'];
    kinds.forEach((kind, i) => {
      const e = world.spawnEnemy(kind);
      e.dist = 120 + i * 62;
      e.hp = e.maxHp;
    });
    world.enemies = world.enemies.filter((e) => e.alive);
    // Some live projectiles + particles for action.
    for (let i = 0; i < 8; i++) {
      world.burst(300 + i * 90, 280 + (i % 3) * 90, ['#7fe7ff', '#b78cff', '#ffd166'][i % 3], 6, 120);
    }
    world.selectedTower = world.towers[2];
    return true;
  }
  if (scene === 'boss') {
    world.screen = 'playing';
    world.time = 58;
    world.wave = 12;
    world.betweenWaves = false;
    world.gold = 510;
    world.lives = 12;
    world.score = 9120;
    world.kills = 312;
    world.banner = 'WAVE 12 / 12 — THE VOID SOVEREIGN AWAKENS.';
    world.bannerT = 99;
    const layout = [
      ['lance', 0, 3], ['prism', 1, 3], ['mortar', 2, 3], ['gale', 3, 2],
      ['obelisk', 4, 3], ['lance', 5, 3], ['prism', 6, 2], ['mortar', 7, 3],
      ['gale', 8, 2], ['lance', 9, 3], ['prism', 10, 2], ['mortar', 11, 3],
      ['obelisk', 13, 2], ['lance', 14, 3], ['prism', 15, 2], ['mortar', 16, 3],
    ];
    for (const [kind, plot, level] of layout) {
      world.towers.push({ kind, plot, x: PLOTS[plot][0], y: PLOTS[plot][1], level, cooldown: 0, angle: 0.4, pulse: 0.8 });
    }
    const boss = world.spawnEnemy('boss');
    boss.dist = 700;
    boss.hp = Math.round(boss.maxHp * 0.62);
    const escort = ['wisp', 'healer', 'brute', 'wisp', 'shield', 'wraith', 'wisp', 'healer'];
    escort.forEach((kind, i) => {
      const e = world.spawnEnemy(kind);
      e.dist = 620 + i * 40;
      e.hp = e.maxHp;
    });
    for (let i = 0; i < 10; i++) world.burst(560 + i * 40, 300 + (i % 2) * 60, '#ff2e63', 5, 140);
    return true;
  }
  if (scene === 'victory') {
    world.screen = 'victory';
    world.time = 12;
    world.victoryStars = 3;
    world.score = 12480;
    world.kills = 348;
    world.leaks = 0;
    world.earned = 2840;
    world.playTime = 14 * 60 + 32;
    world.stats.built = 18;
    world.wave = 12;
    return true;
  }
  return false;
}
