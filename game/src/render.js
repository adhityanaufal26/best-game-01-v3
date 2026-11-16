// render.js — all canvas drawing: aurora sky, fjord path, towers, enemies,
// projectiles, particles, HUD, and the title / victory / defeat screens.
import { VIEW_W, VIEW_H, HUD_H, PATH, PLOTS, TOWERS, TOWER_ORDER, ENEMIES, MAX_WAVES, START_LIVES } from './config.js';

export class BastionRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    const rng = (s) => { let a = s; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const r = rng(777);
    for (let i = 0; i < 160; i++) this.stars.push({ x: r() * VIEW_W, y: r() * 420, s: 0.5 + r() * 1.6, tw: r() * Math.PI * 2 });
  }

  draw(world, mouse) {
    const c = this.ctx;
    c.save();
    if (world.shake > 0.5) {
      c.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawSky(c, world);
    this.drawField(c, world);
    this.drawPath(c);
    this.drawPlots(c, world, mouse);
    this.drawTowers(c, world, mouse);
    this.drawEnemies(c, world);
    this.drawProjectiles(c, world);
    this.drawParticles(c, world);
    this.drawFloaters(c, world);
    c.restore();
    if (world.screen === 'title') this.drawTitle(c, world);
    else if (world.screen === 'victory') this.drawVictory(c, world);
    else if (world.screen === 'defeat') this.drawDefeat(c, world);
    else this.drawHud(c, world, mouse);
    if (world.paused && world.screen === 'playing') this.drawPaused(c);
  }

  drawSky(c, world) {
    const g = c.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0a0a2e');
    g.addColorStop(0.45, '#12123f');
    g.addColorStop(0.75, '#1a1445');
    g.addColorStop(1, '#0b1030');
    c.fillStyle = g;
    c.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    // Stars
    for (const s of this.stars) {
      const a = 0.35 + 0.55 * Math.abs(Math.sin(world.time * 0.7 + s.tw));
      c.fillStyle = `rgba(220,235,255,${a.toFixed(2)})`;
      c.fillRect(s.x, s.y, s.s, s.s);
    }
    // Moon
    const mg = c.createRadialGradient(1140, 84, 6, 1140, 84, 60);
    mg.addColorStop(0, 'rgba(240,245,255,0.95)');
    mg.addColorStop(0.35, 'rgba(200,220,255,0.45)');
    mg.addColorStop(1, 'rgba(200,220,255,0)');
    c.fillStyle = mg;
    c.beginPath(); c.arc(1140, 84, 60, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#eef3ff';
    c.beginPath(); c.arc(1140, 84, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(180,195,230,0.6)';
    c.beginPath(); c.arc(1132, 78, 6, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(1150, 92, 4, 0, Math.PI * 2); c.fill();
    // Aurora ribbons
    const t = world.time * 0.22 + world.auroraPhase;
    for (let band = 0; band < 3; band++) {
      const baseY = 40 + band * 46;
      const hue = band === 0 ? '90,255,170' : band === 1 ? '170,120,255' : '80,220,255';
      c.beginPath();
      for (let x = -20; x <= VIEW_W + 20; x += 16) {
        const y = baseY + Math.sin(x * 0.006 + t + band * 1.7) * 26 + Math.sin(x * 0.013 - t * 0.7) * 10;
        if (x === -20) c.moveTo(x, y); else c.lineTo(x, y);
      }
      for (let x = VIEW_W + 20; x >= -20; x -= 16) {
        const y = baseY + 58 + Math.sin(x * 0.006 + t + band * 1.7) * 26 + Math.sin(x * 0.013 - t * 0.7) * 10;
        c.lineTo(x, y);
      }
      c.closePath();
      const ag = c.createLinearGradient(0, baseY, 0, baseY + 60);
      ag.addColorStop(0, `rgba(${hue},0)`);
      ag.addColorStop(0.5, `rgba(${hue},0.42)`);
      ag.addColorStop(1, `rgba(${hue},0)`);
      c.fillStyle = ag;
      c.fill();
    }
  }

  drawField(c, world) {
    // Snowfield with soft violet tint and pine silhouettes at the edges.
    const g = c.createLinearGradient(0, 60, 0, VIEW_H);
    g.addColorStop(0, '#1c2148');
    g.addColorStop(1, '#141a38');
    c.fillStyle = g;
    c.fillRect(0, 64, VIEW_W, VIEW_H - 64);
    c.fillStyle = '#0d1230';
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 150 + (i % 2) * 40;
      this.pine(c, x, 700, 26 + (i % 3) * 8);
      this.pine(c, x + 70, 96, 20 + (i % 2) * 6);
    }
    // Faint snow sparkle
    c.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 173) % VIEW_W) + Math.sin(world.time * 0.4 + i) * 6;
      const y = 90 + ((i * 97) % 540);
      c.fillRect(x, y, 2, 2);
    }
  }

  pine(c, x, y, h) {
    c.fillStyle = '#0a1a24';
    c.beginPath();
    c.moveTo(x, y - h); c.lineTo(x - h * 0.45, y); c.lineTo(x + h * 0.45, y);
    c.closePath(); c.fill();
    c.fillRect(x - 2, y, 4, 8);
  }

  drawPath(c) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#3a2f5a';
    c.lineWidth = 46;
    c.beginPath();
    PATH.forEach((p, i) => { if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); });
    c.stroke();
    c.strokeStyle = '#57457e';
    c.lineWidth = 38;
    c.beginPath();
    PATH.forEach((p, i) => { if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); });
    c.stroke();
    c.strokeStyle = 'rgba(255,214,102,0.35)';
    c.lineWidth = 2;
    c.setLineDash([14, 18]);
    c.beginPath();
    PATH.forEach((p, i) => { if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); });
    c.stroke();
    c.setLineDash([]);
    // Bastion gate at the end of the road
    c.fillStyle = '#ffd166';
    c.font = 'bold 15px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.fillText('✦ THE LAST LIGHT ✦', 1160, 632);
  }

  drawPlots(c, world, mouse) {
    for (let i = 0; i < PLOTS.length; i++) {
      const [x, y] = PLOTS[i];
      const occupied = world.towerAtPlot(i);
      const hovered = world.hoverPlot === i && !occupied;
      c.beginPath();
      c.arc(x, y, 26, 0, Math.PI * 2);
      c.fillStyle = hovered ? 'rgba(140,255,210,0.30)' : 'rgba(140,170,255,0.13)';
      c.fill();
      c.strokeStyle = hovered ? '#8affd1' : 'rgba(160,180,255,0.45)';
      c.lineWidth = hovered ? 2.5 : 1.5;
      c.setLineDash(hovered ? [] : [6, 5]);
      c.stroke();
      c.setLineDash([]);
      if (!occupied) {
        c.fillStyle = 'rgba(200,220,255,0.5)';
        c.font = 'bold 18px "Segoe UI", sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('+', x, y + 1);
        c.textBaseline = 'alphabetic';
      }
    }
    // Range preview for the tower type being placed / selected tower
    let rx = -1, ry = -1, rr = 0, rc = '#7fe7ff';
    if (world.hoverPlot >= 0 && !world.towerAtPlot(world.hoverPlot) && world.screen === 'playing') {
      const s = TOWERS[world.selectedKind];
      rx = PLOTS[world.hoverPlot][0]; ry = PLOTS[world.hoverPlot][1]; rr = s.range; rc = s.color;
    } else if (world.selectedTower) {
      const s = world.towerStats(world.selectedTower);
      rx = world.selectedTower.x; ry = world.selectedTower.y; rr = s.range; rc = s.color;
    }
    if (rx >= 0) {
      c.beginPath(); c.arc(rx, ry, rr, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
      c.strokeStyle = rc; c.globalAlpha = 0.5; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
    }
  }

  drawTowers(c, world, mouse) {
    for (const t of world.towers) {
      const s = world.towerStats(t);
      const pulse = 1 + t.pulse * 0.18;
      // Glow base
      const g = c.createRadialGradient(t.x, t.y, 4, t.x, t.y, 40);
      g.addColorStop(0, s.glow + '55');
      g.addColorStop(1, s.glow + '00');
      c.fillStyle = g;
      c.beginPath(); c.arc(t.x, t.y, 40, 0, Math.PI * 2); c.fill();
      // Pedestal
      c.fillStyle = '#232a52';
      c.strokeStyle = s.color; c.lineWidth = 2;
      c.beginPath(); c.arc(t.x, t.y, 20, 0, Math.PI * 2); c.fill(); c.stroke();
      // Barrel / crystal aimed at last target
      c.save();
      c.translate(t.x, t.y);
      c.rotate(t.angle);
      c.fillStyle = s.color;
      if (t.kind === 'obelisk') {
        c.fillRect(-4, -26, 8, 26);
      } else if (t.kind === 'mortar') {
        c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill();
        c.fillRect(0, -6, 24, 12);
      } else {
        c.beginPath(); c.moveTo(26, 0); c.lineTo(-10, -8); c.lineTo(-10, 8); c.closePath(); c.fill();
      }
      c.restore();
      // Core crystal
      c.fillStyle = s.color;
      c.beginPath();
      const r = 9 * pulse;
      c.moveTo(t.x, t.y - r); c.lineTo(t.x + r * 0.7, t.y); c.lineTo(t.x, t.y + r); c.lineTo(t.x - r * 0.7, t.y);
      c.closePath(); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(t.x, t.y, 3, 0, Math.PI * 2); c.fill();
      // Level pips
      for (let i = 0; i < t.level; i++) {
        c.fillStyle = '#ffe066';
        c.beginPath(); c.arc(t.x - 10 + i * 10, t.y + 27, 3.5, 0, Math.PI * 2); c.fill();
      }
      if (s.aura) {
        c.beginPath(); c.arc(t.x, t.y, s.auraR * (0.9 + 0.1 * Math.sin(world.time * 3)), 0, Math.PI * 2);
        c.strokeStyle = s.color + '44'; c.lineWidth = 1.5; c.stroke();
      }
      if (world.selectedTower === t) {
        c.beginPath(); c.arc(t.x, t.y, 30, 0, Math.PI * 2);
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
      }
    }
  }

  drawEnemies(c, world) {
    for (const e of world.enemies) {
      const bob = Math.sin(e.wob) * 2;
      const x = e.x, y = e.y + bob;
      // Shadow
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.ellipse(x, e.y + e.r + 4, e.r * 0.9, 4, 0, 0, Math.PI * 2); c.fill();
      // Glow
      const g = c.createRadialGradient(x, y, 2, x, y, e.r + 14);
      g.addColorStop(0, e.def.color + '66');
      g.addColorStop(1, e.def.color + '00');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, e.r + 14, 0, Math.PI * 2); c.fill();
      // Body
      c.fillStyle = e.flash > 0 ? '#ffffff' : e.def.color;
      c.beginPath(); c.arc(x, y, e.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2; c.stroke();
      // Face: eyes toward travel direction
      const ex = Math.cos(e.angle), ey = Math.sin(e.angle);
      const px = -ey, py = ex;
      c.fillStyle = '#1a0b1e';
      c.beginPath(); c.arc(x + ex * 5 + px * 5, y + ey * 5 + py * 5 - 2, 2.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + ex * 5 - px * 5, y + ey * 5 - py * 5 - 2, 2.6, 0, Math.PI * 2); c.fill();
      if (e.def.boss) {
        // Crown spikes + skull brow
        c.strokeStyle = '#ffd166'; c.lineWidth = 3;
        for (let i = -2; i <= 2; i++) {
          c.beginPath();
          c.moveTo(x + i * 10, y - e.r + 4);
          c.lineTo(x + i * 10, y - e.r - 12);
          c.stroke();
        }
        c.fillStyle = '#ff2e63';
        c.font = 'bold 13px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.fillText('VOID SOVEREIGN', x, y - e.r - 20);
      }
      if (e.def.armor) {
        c.strokeStyle = '#dfe9ff'; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, e.r + 4, -0.6, 0.6); c.stroke();
        c.beginPath(); c.arc(x, y, e.r + 4, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
      }
      // HP bar
      const w = e.def.boss ? 90 : 34;
      const frac = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(x - w / 2, y - e.r - 12, w, 5);
      c.fillStyle = frac > 0.5 ? '#7dff9e' : frac > 0.25 ? '#ffd166' : '#ff5a5a';
      c.fillRect(x - w / 2, y - e.r - 12, w * frac, 5);
      if (e.slowT > 0) {
        c.fillStyle = '#7fe7ff';
        c.font = 'bold 10px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.fillText('❄', x, y - e.r - 16);
      }
    }
  }

  drawProjectiles(c, world) {
    for (const p of world.projectiles) {
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.kind === 'mortar' ? 7 : 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(p.x, p.y, 2, 0, Math.PI * 2); c.fill();
    }
    // Prism beams (short-lived particle entries with .beam)
    for (const pt of world.particles) {
      if (!pt.beam) continue;
      const a = Math.max(0, 1 - pt.t / pt.life);
      c.strokeStyle = pt.color;
      c.globalAlpha = a;
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(pt.beam.x, pt.beam.y); c.lineTo(pt.x, pt.y); c.stroke();
      c.globalAlpha = 1;
    }
  }

  drawParticles(c, world) {
    for (const pt of world.particles) {
      if (pt.beam) continue;
      const a = Math.max(0, 1 - pt.t / pt.life);
      c.globalAlpha = a;
      c.fillStyle = pt.color;
      c.beginPath(); c.arc(pt.x, pt.y, pt.size * a + 0.5, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  drawFloaters(c, world) {
    c.textAlign = 'center';
    c.font = 'bold 15px "Segoe UI", sans-serif';
    for (const f of world.floaters) {
      const a = Math.max(0, 1 - f.t / f.life);
      c.globalAlpha = a;
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y);
      c.globalAlpha = 1;
    }
  }

  drawHud(c, world, mouse) {
    // Top bar
    c.fillStyle = 'rgba(8,10,32,0.88)';
    c.fillRect(0, 0, VIEW_W, HUD_H);
    c.strokeStyle = 'rgba(140,170,255,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, HUD_H); c.lineTo(VIEW_W, HUD_H); c.stroke();
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#b78cff';
    c.font = 'bold 20px "Segoe UI", sans-serif';
    c.fillText('✦ AURORA BASTION', 16, 26);
    c.fillStyle = 'rgba(200,220,255,0.75)';
    c.font = '13px "Segoe UI", sans-serif';
    c.fillText('Hold the Last Light', 16, 46);

    const chip = (x, label, value, color) => {
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath(); c.roundRect(x, 10, 118, 44, 8); c.fill();
      c.fillStyle = 'rgba(200,220,255,0.7)';
      c.font = '11px "Segoe UI", sans-serif';
      c.fillText(label, x + 10, 26);
      c.fillStyle = color;
      c.font = 'bold 18px "Segoe UI", sans-serif';
      c.fillText(String(value), x + 10, 47);
    };
    chip(300, 'LIGHT (LIVES)', `${world.lives} / ${START_LIVES}`, world.lives <= 5 ? '#ff7070' : '#7dff9e');
    chip(428, 'GOLD', world.gold, '#ffd166');
    chip(556, 'WAVE', `${Math.max(1, world.wave)} / ${MAX_WAVES}`, '#7fe7ff');
    chip(684, 'SCORE', world.score, '#b78cff');
    chip(812, 'KILLS', world.kills, '#8affd1');

    // Wave / next-wave button
    const bx = 960, by = 10, bw = 150, bh = 44;
    const ready = world.betweenWaves && world.screen === 'playing';
    c.fillStyle = ready ? '#2ee6a8' : 'rgba(255,255,255,0.12)';
    c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.fill();
    c.fillStyle = ready ? '#06281c' : 'rgba(220,230,255,0.6)';
    c.font = 'bold 13px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.fillText(ready ? `▶ START WAVE ${world.wave + 1}` : `WAVE ${Math.max(1, world.wave)} RUNNING`, bx + bw / 2, by + 29);
    c.textAlign = 'left';
    // Pause + mute
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.roundRect(1120, 10, 70, 44, 8); c.fill();
    c.fillStyle = '#dfe9ff'; c.font = 'bold 13px "Segoe UI", sans-serif'; c.textAlign = 'center';
    c.fillText(world.paused ? 'RESUME' : 'PAUSE', 1155, 38);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.roundRect(1200, 10, 64, 44, 8); c.fill();
    c.fillStyle = '#dfe9ff';
    c.fillText('SOUND', 1232, 38);
    c.textAlign = 'left';

    // Banner
    if (world.bannerT > 0 && world.banner) {
      const a = Math.min(1, world.bannerT);
      c.globalAlpha = a;
      c.fillStyle = 'rgba(8,10,32,0.75)';
      c.beginPath(); c.roundRect(340, 84, 600, 40, 10); c.fill();
      c.fillStyle = '#ffe066';
      c.font = 'bold 17px "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.fillText(world.banner, 640, 110);
      c.textAlign = 'left';
      c.globalAlpha = 1;
    }

    // Boss health bar
    const boss = world.enemies.find((e) => e.def.boss && e.alive);
    if (boss) {
      c.fillStyle = 'rgba(8,10,32,0.8)';
      c.beginPath(); c.roundRect(390, 130, 500, 26, 8); c.fill();
      c.fillStyle = '#ff2e63';
      c.beginPath(); c.roundRect(396, 136, 488 * Math.max(0, boss.hp / boss.maxHp), 14, 6); c.fill();
      c.fillStyle = '#ffffff';
      c.font = 'bold 13px "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.fillText(`VOID SOVEREIGN — ${Math.max(0, Math.ceil(boss.hp))} HP`, 640, 147);
      c.textAlign = 'left';
    }

    this.drawBuildBar(c, world, mouse);
    this.drawSelectedPanel(c, world);
  }

  drawBuildBar(c, world, mouse) {
    const y = VIEW_H - 72;
    c.fillStyle = 'rgba(8,10,32,0.88)';
    c.fillRect(0, y, VIEW_W, 72);
    c.strokeStyle = 'rgba(140,170,255,0.35)';
    c.beginPath(); c.moveTo(0, y); c.lineTo(VIEW_W, y); c.stroke();
    let x = 16;
    for (const kind of TOWER_ORDER) {
      const def = TOWERS[kind];
      const w = 200, h = 56;
      const sel = world.selectedKind === kind;
      const afford = world.gold >= def.cost;
      c.fillStyle = sel ? 'rgba(140,170,255,0.30)' : 'rgba(255,255,255,0.07)';
      c.beginPath(); c.roundRect(x, y + 8, w, h, 9); c.fill();
      c.strokeStyle = sel ? def.color : 'rgba(160,180,255,0.35)';
      c.lineWidth = sel ? 2.5 : 1.5;
      c.beginPath(); c.roundRect(x, y + 8, w, h, 9); c.stroke();
      // Tower icon
      c.fillStyle = def.color;
      c.beginPath();
      c.moveTo(x + 24, y + 22); c.lineTo(x + 32, y + 36); c.lineTo(x + 24, y + 50); c.lineTo(x + 16, y + 36);
      c.closePath(); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(x + 24, y + 36, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = afford ? '#ffffff' : '#ff9090';
      c.font = 'bold 14px "Segoe UI", sans-serif';
      c.textAlign = 'left';
      c.fillText(`${def.key}  ${def.name}`, x + 42, y + 30);
      c.fillStyle = 'rgba(200,220,255,0.8)';
      c.font = '12px "Segoe UI", sans-serif';
      c.fillText(def.desc, x + 42, y + 48);
      c.fillStyle = '#ffd166';
      c.font = 'bold 14px "Segoe UI", sans-serif';
      c.textAlign = 'right';
      c.fillText(`${def.cost}g`, x + w - 10, y + 30);
      c.textAlign = 'left';
      x += w + 12;
    }
  }

  drawSelectedPanel(c, world) {
    const t = world.selectedTower;
    if (!t || world.screen !== 'playing') return;
    const def = TOWERS[t.kind];
    const s = world.towerStats(t);
    const cost = world.upgradeCost(t);
    const x = 16, y = 84, w = 250, h = 132;
    c.fillStyle = 'rgba(8,10,32,0.92)';
    c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill();
    c.strokeStyle = def.color; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, h, 10); c.stroke();
    c.fillStyle = def.color;
    c.font = 'bold 16px "Segoe UI", sans-serif';
    c.fillText(`${def.name} — LV ${t.level}`, x + 14, y + 26);
    c.fillStyle = '#dfe9ff';
    c.font = '13px "Segoe UI", sans-serif';
    c.fillText(`Damage ${s.damage}   Range ${Math.round(s.range)}`, x + 14, y + 50);
    c.fillText(`Rate ${s.rate}/s${s.splash ? `   Splash ${s.splash}` : ''}${s.aura ? `   Aura ${s.auraDps}/s` : ''}${s.chains ? `   Chains ${s.chains}` : ''}`, x + 14, y + 70);
    if (cost !== null) {
      c.fillStyle = world.gold >= cost ? '#2ee6a8' : '#ff9090';
      c.beginPath(); c.roundRect(x + 14, y + 80, 150, 26, 6); c.fill();
      c.fillStyle = '#06281c';
      c.font = 'bold 13px "Segoe UI", sans-serif';
      c.fillText(`U — UPGRADE (${cost}g)`, x + 24, y + 98);
    } else {
      c.fillStyle = '#ffe066';
      c.font = 'bold 13px "Segoe UI", sans-serif';
      c.fillText('★ MAX LEVEL ★', x + 14, y + 98);
    }
    c.fillStyle = 'rgba(200,220,255,0.8)';
    c.font = '12px "Segoe UI", sans-serif';
    c.fillText('Right-click: sell (70% refund)', x + 14, y + 122);
  }

  drawPaused(c) {
    c.fillStyle = 'rgba(5,6,20,0.55)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = '#ffffff';
    c.font = 'bold 44px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
    c.fillStyle = 'rgba(220,230,255,0.85)';
    c.font = '17px "Segoe UI", sans-serif';
    c.fillText('Press P or click RESUME to continue', VIEW_W / 2, VIEW_H / 2 + 26);
    c.textAlign = 'left';
  }

  drawTitle(c, world) {
    c.fillStyle = 'rgba(5,6,20,0.45)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    // Title glow
    const g = c.createRadialGradient(640, 250, 10, 640, 250, 420);
    g.addColorStop(0, 'rgba(140,90,255,0.25)');
    g.addColorStop(1, 'rgba(140,90,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.textAlign = 'center';
    c.fillStyle = '#8affd1';
    c.font = 'bold 22px "Segoe UI", sans-serif';
    c.fillText('✦  A TOWER DEFENSE UNDER THE NORTHERN LIGHTS  ✦', 640, 150);
    c.fillStyle = '#ffffff';
    c.font = 'bold 84px "Segoe UI", sans-serif';
    c.shadowColor = '#8a4dff'; c.shadowBlur = 34;
    c.fillText('AURORA', 640, 250);
    c.fillText('BASTION', 640, 335);
    c.shadowBlur = 0;
    c.fillStyle = '#cfe0ff';
    c.font = '19px "Segoe UI", sans-serif';
    c.fillText('The void horde marches on the Last Light. Build five kinds of aurora towers,', 640, 385);
    c.fillText('upgrade them, and survive all 12 waves — including the Void Sovereign.', 640, 412);
    // Start button
    const pulse = 1 + Math.sin(world.time * 4) * 0.04;
    c.save();
    c.translate(640, 480); c.scale(pulse, pulse);
    c.fillStyle = '#2ee6a8';
    c.beginPath(); c.roundRect(-150, -28, 300, 56, 12); c.fill();
    c.fillStyle = '#06281c';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('▶  PLAY NOW', 0, 8);
    c.restore();
    c.fillStyle = 'rgba(220,230,255,0.9)';
    c.font = '15px "Segoe UI", sans-serif';
    c.fillText('Click a tower card, then a glowing + plot to build  •  1–5 select  •  U upgrade  •  Space starts a wave', 640, 560);
    c.fillText('5 tower types  •  9 enemy kinds  •  12 waves + boss  •  Upgrades, economy, music & sound', 640, 588);
    c.fillStyle = '#ffd166';
    c.font = 'bold 15px "Segoe UI", sans-serif';
    c.fillText('Best score: ' + (world.bestScore || 0) + '   •   Survive with all 20 Light for 3 stars', 640, 630);
    c.textAlign = 'left';
  }

  drawVictory(c, world) {
    c.fillStyle = 'rgba(5,20,14,0.62)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.textAlign = 'center';
    c.fillStyle = '#8affd1';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('✦  THE AURORA HOLDS  ✦', 640, 130);
    c.fillStyle = '#ffffff';
    c.font = 'bold 72px "Segoe UI", sans-serif';
    c.shadowColor = '#2ee6a8'; c.shadowBlur = 30;
    c.fillText('VICTORY!', 640, 215);
    c.shadowBlur = 0;
    // Stars
    for (let i = 0; i < 3; i++) {
      const x = 640 + (i - 1) * 90;
      const lit = i < world.victoryStars;
      c.font = '64px "Segoe UI", sans-serif';
      c.fillStyle = lit ? '#ffd166' : 'rgba(255,255,255,0.25)';
      c.fillText('★', x, 300);
    }
    c.fillStyle = '#ffe066';
    c.font = 'bold 20px "Segoe UI", sans-serif';
    c.fillText(world.victoryStars === 3 ? 'PERFECT DEFENSE — no Light lost!' : world.victoryStars === 2 ? 'A hard-fought dawn.' : 'The Bastion stands — barely.', 640, 345);
    // Stats
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.roundRect(390, 375, 500, 130, 12); c.fill();
    c.fillStyle = '#dfe9ff';
    c.font = '18px "Segoe UI", sans-serif';
    const mins = Math.floor(world.playTime / 60);
    const secs = Math.floor(world.playTime % 60);
    c.fillText(`FINAL SCORE   ${world.score}`, 640, 410);
    c.fillText(`Waves cleared   12 / 12      Kills   ${world.kills}      Leaks   ${world.leaks}`, 640, 442);
    c.fillText(`Gold earned   ${world.earned}      Towers built   ${world.stats.built}      Time   ${mins}:${String(secs).padStart(2, '0')}`, 640, 474);
    // Play again
    const pulse = 1 + Math.sin(world.time * 4) * 0.04;
    c.save();
    c.translate(640, 570); c.scale(pulse, pulse);
    c.fillStyle = '#2ee6a8';
    c.beginPath(); c.roundRect(-150, -28, 300, 56, 12); c.fill();
    c.fillStyle = '#06281c';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('↻  PLAY AGAIN', 0, 8);
    c.restore();
    c.fillStyle = 'rgba(220,230,255,0.85)';
    c.font = '15px "Segoe UI", sans-serif';
    c.fillText('Press R or click PLAY AGAIN to defend the Bastion once more', 640, 640);
    c.textAlign = 'left';
  }

  drawDefeat(c, world) {
    c.fillStyle = 'rgba(24,4,10,0.66)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.textAlign = 'center';
    c.fillStyle = '#ff7070';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('✦  THE LIGHT GOES OUT  ✦', 640, 150);
    c.fillStyle = '#ffffff';
    c.font = 'bold 72px "Segoe UI", sans-serif';
    c.shadowColor = '#ff2e63'; c.shadowBlur = 30;
    c.fillText('DEFEAT', 640, 235);
    c.shadowBlur = 0;
    c.fillStyle = '#ffd9d9';
    c.font = '19px "Segoe UI", sans-serif';
    c.fillText(`The horde broke through on wave ${Math.max(1, world.wave)} of ${MAX_WAVES}. The aurora fades… but the Bastion can rise again.`, 640, 290);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.roundRect(390, 330, 500, 110, 12); c.fill();
    c.fillStyle = '#dfe9ff';
    c.font = '18px "Segoe UI", sans-serif';
    c.fillText(`SCORE   ${world.score}      KILLS   ${world.kills}      WAVES CLEARED   ${Math.max(0, world.wave - 1)}`, 640, 368);
    c.fillText(`Gold earned   ${world.earned}      Towers built   ${world.stats.built}`, 640, 402);
    const pulse = 1 + Math.sin(world.time * 4) * 0.04;
    c.save();
    c.translate(640, 520); c.scale(pulse, pulse);
    c.fillStyle = '#ff5a5a';
    c.beginPath(); c.roundRect(-150, -28, 300, 56, 12); c.fill();
    c.fillStyle = '#ffffff';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('↻  TRY AGAIN', 0, 8);
    c.restore();
    c.fillStyle = 'rgba(220,230,255,0.85)';
    c.font = '15px "Segoe UI", sans-serif';
    c.fillText('Press R or click TRY AGAIN — tip: mix Frost Lances with a Star Mortar for crowds', 640, 590);
    c.textAlign = 'left';
  }
}
