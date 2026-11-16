// main.js — entry point: wires input to the world, runs the fixed-step loop,
// handles clicks on HUD buttons, build bar, plots and towers, and drives
// the deterministic ?shot= screenshot scenes.
import { VIEW_W, VIEW_H, TOWERS, TOWER_ORDER, PLOTS, MAX_WAVES } from './config.js';
import { BastionWorld } from './world.js';
import { BastionRenderer } from './render.js';
import { AuroraAudio } from './audio.js';
import { GameInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const audio = new AuroraAudio();
const world = new BastionWorld(audio);
window.__bastion = world;
const renderer = new BastionRenderer(canvas);

try {
  world.bestScore = parseInt(localStorage.getItem('aurora-bastion-best') || '0', 10) || 0;
} catch (e) { world.bestScore = 0; }

function saveBest() {
  if (world.score > world.bestScore) {
    world.bestScore = world.score;
    try { localStorage.setItem('aurora-bastion-best', String(world.bestScore)); } catch (e) { /* private mode */ }
  }
}

const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
let shotMode = false;
if (shotScene) {
  shotMode = applyShot(world, shotScene);
  if (shotMode) {
    // Paint one deterministic frame, then signal readiness.
    world.update(0.016);
    renderer.draw(world, { x: 640, y: 360, inside: false });
    window.__shotReady = true;
  }
}

function inRect(x, y, rx, ry, rw, rh) { return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh; }

function handleClick(x, y, rightClick) {
  audio.ensure();
  if (shotMode) return;
  if (world.screen === 'title') {
    if (inRect(x, y, 490, 452, 300, 56)) world.startGame();
    return;
  }
  if (world.screen === 'victory' || world.screen === 'defeat') {
    if (inRect(x, y, 490, 542, 300, 56) || inRect(x, y, 490, 492, 300, 56)) {
      saveBest();
      world.startGame();
    }
    return;
  }
  if (world.screen !== 'playing') return;

  // HUD buttons
  if (inRect(x, y, 960, 10, 150, 44)) { world.startWave(); return; }
  if (inRect(x, y, 1120, 10, 70, 44)) { world.paused = !world.paused; return; }
  if (inRect(x, y, 1200, 10, 64, 44)) { audio.toggleMute(); return; }

  // Build bar cards
  if (y >= VIEW_H - 72) {
    let cx = 16;
    for (const kind of TOWER_ORDER) {
      if (inRect(x, y, cx, VIEW_H - 64, 200, 56)) {
        world.selectedKind = kind;
        world.selectedTower = null;
        audio.blip(660, 0.06, 'sine', 0.12);
        return;
      }
      cx += 212;
    }
    return;
  }

  // Selected-tower upgrade button
  if (world.selectedTower) {
    const t = world.selectedTower;
    const cost = world.upgradeCost(t);
    if (cost !== null && inRect(x, y, 30, 164, 150, 26)) { world.upgradeTower(t); return; }
  }

  // Plots / towers on the field
  const plot = world.nearestPlot(x, y, 34);
  if (plot >= 0) {
    const existing = world.towerAtPlot(plot);
    if (rightClick && existing) { world.sellTower(existing); return; }
    if (existing) {
      world.selectedTower = existing;
      audio.blip(520, 0.06, 'sine', 0.1);
      return;
    }
    world.selectedTower = null;
    world.buildTower(plot);
    return;
  }
  // Clicked a tower not exactly on a plot centre
  for (const t of world.towers) {
    if (Math.hypot(t.x - x, t.y - y) < 30) {
      if (rightClick) world.sellTower(t);
      else world.selectedTower = t;
      return;
    }
  }
  world.selectedTower = null;
}

function handleHover(x, y) {
  if (world.screen !== 'playing') { world.hoverPlot = -1; return; }
  world.hoverPlot = world.nearestPlot(x, y, 34);
}

function handleKey(key) {
  audio.ensure();
  if (shotMode) return;
  if (key === 'm') { audio.toggleMute(); return; }
  if (world.screen === 'title' && (key === 'enter' || key === ' ')) { world.startGame(); return; }
  if ((world.screen === 'victory' || world.screen === 'defeat') && (key === 'r' || key === 'enter' || key === ' ')) {
    saveBest();
    world.startGame();
    return;
  }
  if (world.screen !== 'playing') return;
  if (key === ' ') { world.startWave(); return; }
  if (key === 'p' || key === 'escape') { world.paused = !world.paused; return; }
  if (key === 'u' && world.selectedTower) { world.upgradeTower(world.selectedTower); return; }
  for (const kind of TOWER_ORDER) {
    if (key === TOWERS[kind].key) { world.selectedKind = kind; world.selectedTower = null; return; }
  }
}

new GameInput(canvas, handleClick, handleHover, handleKey);

// Save the best score when a run ends.
const _win = world.winGame.bind(world);
world.winGame = () => { _win(); saveBest(); };
const _lose = world.loseGame.bind(world);
world.loseGame = () => { _lose(); saveBest(); };

// Fixed-step loop (60 Hz simulation, render every frame).
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    acc += dt;
    while (acc >= 1 / 60) { world.update(1 / 60); acc -= 1 / 60; }
    renderer.draw(world, { x: -1, y: -1, inside: false });
  }
  requestAnimationFrame(frame);
}
if (!shotMode) requestAnimationFrame(frame);
