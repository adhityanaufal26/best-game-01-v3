// world.js — game state, wave spawning, combat, economy, particles, screen shake.
// Pure simulation: rendering lives in render.js, audio in audio.js.
import { PATH, PLOTS, TOWERS, TOWER_ORDER, ENEMIES, WAVES, START_GOLD, START_LIVES, MAX_WAVES, waveHpMult, waveGoldBonus } from './config.js';
import { makeRng } from './random.js';

export function pathLength() {
  let len = 0;
  for (let i = 1; i < PATH.length; i++) {
    len += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
  }
  return len;
}

export function pointAt(dist) {
  let d = dist;
  for (let i = 1; i < PATH.length; i++) {
    const seg = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return {
        x: PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * t,
        y: PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * t,
        angle: Math.atan2(PATH[i][1] - PATH[i - 1][1], PATH[i][0] - PATH[i - 1][0]),
      };
    }
    d -= seg;
  }
  const last = PATH[PATH.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

export class BastionWorld {
  constructor(audio) {
    this.audio = audio;
    this.reset();
  }

  reset() {
    this.rng = makeRng(20261117);
    this.screen = 'title'; // title | playing | victory | defeat
    this.paused = false;
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.score = 0;
    this.wave = 0;
    this.kills = 0;
    this.leaks = 0;
    this.earned = 0;
    this.spent = 0;
    this.time = 0;
    this.waveTime = 0;
    this.betweenWaves = true;
    this.waveTimer = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.shakeT = 0;
    this.selectedKind = 'lance';
    this.selectedTower = null;
    this.hoverPlot = -1;
    this.banner = '';
    this.bannerT = 0;
    this.bossSpawned = false;
    this.victoryStars = 0;
    this.playTime = 0;
    this.stats = { shots: 0, built: 0, upgraded: 0 };
    this.auroraPhase = this.rng() * Math.PI * 2;
  }

  startGame() {
    this.reset();
    this.screen = 'playing';
    this.banner = 'WAVE 1 INCOMING — build your bastion!';
    this.bannerT = 3;
    this.audio.ensure();
    this.audio.horn();
  }

  startWave() {
    if (!this.betweenWaves || this.screen !== 'playing') return;
    this.wave++;
    const def = WAVES[this.wave - 1];
    this.spawnQueue = [];
    for (const [kind, count, gap] of def.groups) {
      for (let i = 0; i < count; i++) this.spawnQueue.push({ kind, gap });
    }
    this.spawnTimer = 0.4;
    this.betweenWaves = false;
    this.waveTime = 0;
    this.banner = `WAVE ${this.wave} / ${MAX_WAVES} — ${def.intro}`;
    this.bannerT = 3;
    if (this.wave === MAX_WAVES) this.audio.bossHorn(); else this.audio.horn();
  }

  spawnEnemy(kind) {
    const def = ENEMIES[kind];
    const hp = Math.round(def.hp * waveHpMult(this.wave));
    const e = {
      kind, def, hp, maxHp: hp,
      dist: -20 - this.rng() * 30,
      speed: def.speed * (0.92 + this.rng() * 0.16),
      slowT: 0, slowF: 1, r: def.r,
      x: -40, y: 150, angle: 0,
      wob: this.rng() * Math.PI * 2,
      flash: 0, healT: 0, splitDone: false,
      alive: true,
    };
    this.enemies.push(e);
    if (def.boss) this.bossSpawned = true;
    return e;
  }

  nearestPlot(x, y, maxD) {
    let best = -1; let bestD = maxD;
    for (let i = 0; i < PLOTS.length; i++) {
      const d = Math.hypot(PLOTS[i][0] - x, PLOTS[i][1] - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  towerAtPlot(i) { return this.towers.find((t) => t.plot === i) || null; }

  buildTower(plotIdx) {
    if (this.screen !== 'playing' || this.paused) return false;
    if (this.towerAtPlot(plotIdx)) return false;
    const def = TOWERS[this.selectedKind];
    if (this.gold < def.cost) { this.floatText(PLOTS[plotIdx][0], PLOTS[plotIdx][1] - 30, 'NOT ENOUGH GOLD', '#ff8080'); return false; }
    this.gold -= def.cost;
    this.spent += def.cost;
    const t = {
      kind: this.selectedKind, plot: plotIdx,
      x: PLOTS[plotIdx][0], y: PLOTS[plotIdx][1],
      level: 1, cooldown: 0, angle: -Math.PI / 2, pulse: 0,
    };
    this.towers.push(t);
    this.stats.built++;
    this.audio.build();
    this.burst(t.x, t.y, def.color, 26, 160);
    this.floatText(t.x, t.y - 34, def.name.toUpperCase(), def.color);
    return true;
  }

  upgradeCost(t) {
    const def = TOWERS[t.kind];
    if (t.level === 1) return def.upgrade.cost;
    if (t.level === 2) return def.upgrade2.cost;
    return null;
  }

  upgradeTower(t) {
    const cost = this.upgradeCost(t);
    if (cost === null || this.gold < cost) return false;
    this.gold -= cost;
    this.spent += cost;
    t.level++;
    this.stats.upgraded++;
    this.audio.upgrade();
    this.burst(t.x, t.y, TOWERS[t.kind].color, 34, 220);
    this.floatText(t.x, t.y - 34, `LEVEL ${t.level}!`, '#ffe066');
    return true;
  }

  sellTower(t) {
    const def = TOWERS[t.kind];
    const refund = Math.floor(def.cost * 0.7) + (t.level > 1 ? Math.floor(def.upgrade.cost * 0.5) : 0) + (t.level > 2 ? Math.floor(def.upgrade2.cost * 0.5) : 0);
    this.gold += refund;
    this.towers = this.towers.filter((o) => o !== t);
    this.selectedTower = null;
    this.audio.coin();
    this.floatText(t.x, t.y - 30, `+${refund} GOLD`, '#ffe066');
  }

  towerStats(t) {
    const def = TOWERS[t.kind];
    const s = { ...def };
    if (t.level >= 2) Object.assign(s, def.upgrade);
    if (t.level >= 3) Object.assign(s, def.upgrade2);
    return s;
  }

  floatText(x, y, text, color) {
    this.floaters.push({ x, y, text, color, t: 0, life: 1.4 });
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = speed * (0.3 + this.rng() * 0.7);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: 0.4 + this.rng() * 0.5, size: 2 + this.rng() * 3.5, color,
      });
    }
  }

  addShake(amount) { this.shake = Math.min(14, this.shake + amount); }

  damageEnemy(e, dmg, source) {
    if (!e.alive) return;
    const armor = e.def.armor || 0;
    const dealt = Math.max(1, Math.round(dmg - armor * 0.35));
    e.hp -= dealt;
    e.flash = 0.12;
    if (e.hp <= 0) this.killEnemy(e, source);
  }

  killEnemy(e, source) {
    if (!e.alive) return;
    e.alive = false;
    this.kills++;
    this.score += e.def.score;
    this.gold += e.def.gold;
    this.earned += e.def.gold;
    this.audio.coin();
    this.burst(e.x, e.y, e.def.color, e.def.boss ? 90 : 18, e.def.boss ? 320 : 170);
    this.floatText(e.x, e.y - 18, `+${e.def.gold}`, '#ffe066');
    if (e.def.boss) {
      this.addShake(14);
      this.audio.boom();
      this.burst(e.x, e.y, '#ffffff', 60, 380);
    }
    if (e.def.splits && !e.splitDone) {
      e.splitDone = true;
      for (let i = 0; i < e.def.splits; i++) {
        const child = this.spawnEnemy('mote');
        child.dist = e.dist - 12 - i * 10;
        child.hp = Math.round(child.hp * 0.7);
        child.maxHp = child.hp;
      }
    }
    if (source === 'aura') this.score += 0;
  }

  update(dt) {
    if (this.screen !== 'playing' || this.paused) return;
    this.time += dt;
    this.playTime += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.shake > 0) { this.shake *= Math.pow(0.02, dt); if (this.shake < 0.3) this.shake = 0; }

    // Spawning
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift();
        this.spawnEnemy(next.kind);
        this.spawnTimer = next.gap;
      }
    } else if (!this.betweenWaves && this.enemies.length === 0) {
      // Wave cleared
      const bonus = waveGoldBonus(this.wave);
      this.gold += bonus;
      this.earned += bonus;
      this.floatText(640, 300, `WAVE ${this.wave} CLEARED  +${bonus} GOLD`, '#8affd1');
      this.audio.victory();
      if (this.wave >= MAX_WAVES) { this.winGame(); return; }
      this.betweenWaves = true;
      this.waveTimer = 0;
      this.banner = `WAVE ${this.wave} CLEARED — press SPACE for wave ${this.wave + 1}`;
      this.bannerT = 4;
    }

    if (this.betweenWaves) this.waveTimer += dt;

    // Enemies move
    const totalLen = pathLength();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
      e.dist += e.speed * e.slowF * dt;
      const p = pointAt(e.dist);
      e.x = p.x; e.y = p.y; e.angle = p.angle;
      e.wob += dt * 6;
      if (e.flash > 0) e.flash -= dt;
      if (e.def.heals) {
        e.healT -= dt;
        if (e.healT <= 0) {
          e.healT = 2.2;
          for (const o of this.enemies) {
            if (o.alive && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 110 && o.hp < o.maxHp) {
              o.hp = Math.min(o.maxHp, o.hp + e.def.heals);
              this.particles.push({ x: o.x, y: o.y - 10, vx: 0, vy: -30, t: 0, life: 0.6, size: 3, color: '#ff6b9d' });
            }
          }
        }
      }
      if (e.dist >= totalLen) {
        e.alive = false;
        this.lives -= e.def.dmg;
        this.leaks++;
        this.audio.leak();
        this.addShake(8);
        this.floatText(1240, 660, `-${e.def.dmg} LIGHT`, '#ff8080');
        this.burst(e.x, e.y, '#ff4040', 24, 200);
        if (this.lives <= 0) { this.lives = 0; this.loseGame(); return; }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    // Towers fire
    for (const t of this.towers) {
      const s = this.towerStats(t);
      t.cooldown -= dt;
      t.pulse = Math.max(0, t.pulse - dt * 4);
      if (s.aura) {
        for (const e of this.enemies) {
          if (Math.hypot(e.x - t.x, e.y - t.y) < s.auraR) {
            e.hp -= s.auraDps * dt;
            e.flash = Math.max(e.flash, 0.05);
            if (this.rng() < dt * 8) this.particles.push({ x: e.x + (this.rng() - 0.5) * 20, y: e.y + (this.rng() - 0.5) * 20, vx: 0, vy: -40, t: 0, life: 0.4, size: 2.5, color: s.color });
            if (e.hp <= 0) this.killEnemy(e, 'aura');
          }
        }
        continue;
      }
      if (t.cooldown > 0) continue;
      let target = null; let bestDist = Infinity;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= s.range && e.dist > 0) {
          if (e.dist > bestDist || target === null) { target = e; bestDist = e.dist; }
        }
      }
      if (!target) continue;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      t.cooldown = 1 / s.rate;
      t.pulse = 1;
      this.stats.shots++;
      this.audio.shoot(t.kind);
      if (t.kind === 'prism') {
        // Instant chain beam: hit target + nearest chain neighbours.
        let current = target;
        const hitSet = new Set();
        const chainCount = s.chains || 3;
        for (let c = 0; c < chainCount && current; c++) {
          this.damageEnemy(current, s.damage, 'prism');
          hitSet.add(current);
          this.particles.push({ x: current.x, y: current.y, vx: 0, vy: 0, t: 0, life: 0.18, size: 4, color: s.color, beam: { x: t.x, y: t.y } });
          let next = null; let nd = 130;
          for (const e of this.enemies) {
            if (!hitSet.has(e) && e.alive) {
              const d = Math.hypot(e.x - current.x, e.y - current.y);
              if (d < nd) { nd = d; next = e; }
            }
          }
          current = next;
        }
      } else {
        this.projectiles.push({
          x: t.x, y: t.y, target, kind: t.kind,
          speed: s.projSpeed, damage: s.damage, splash: s.splash || 0,
          slow: s.slow || 0, slowSecs: s.slowSecs || 0, color: s.color, t: 0,
        });
      }
    }

    // Projectiles
    for (const p of this.projectiles) {
      p.t += dt;
      if (!p.target || !p.target.alive) { p.dead = true; continue; }
      const dx = p.target.x - p.x; const dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) {
        if (p.splash) {
          this.audio.boom();
          this.burst(p.target.x, p.target.y, '#ffd166', 22, 200);
          this.addShake(3);
          for (const e of this.enemies) {
            if (e.alive && Math.hypot(e.x - p.target.x, e.y - p.target.y) <= p.splash) this.damageEnemy(e, p.damage, 'mortar');
          }
        } else {
          this.damageEnemy(p.target, p.damage, p.kind);
          if (p.slow && p.target.alive) { p.target.slowF = 1 - p.slow; p.target.slowT = p.slowSecs; }
          this.burst(p.target.x, p.target.y, p.color, 5, 90);
        }
        p.dead = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      if (p.t > 3) p.dead = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // Particles + floaters
    for (const pt of this.particles) {
      pt.t += dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const f of this.floaters) { f.t += dt; f.y -= 28 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < f.life);
  }

  winGame() {
    this.screen = 'victory';
    const lost = START_LIVES - this.lives;
    this.victoryStars = lost === 0 ? 3 : lost <= 5 ? 2 : 1;
    this.score += this.lives * 50 + this.gold;
    this.audio.victory();
  }

  loseGame() {
    this.screen = 'defeat';
    this.audio.defeat();
  }
}
