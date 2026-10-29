import { CARDS, WORLD } from './data.js';
import { TinySwords } from './sprites.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function circle(ctx, x, y, r, color) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function line(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}
function healthBar(ctx, entity, width, yOffset) {
  if (entity.hp <= 0) return;
  const x = entity.x - width / 2, y = entity.y + yOffset;
  roundRect(ctx, x - 1, y - 1, width + 2, 7, 3, '#142038dd');
  const ratio = Math.max(0, entity.hp / entity.maxHp);
  const color = entity.side === 'player' ? '#36a9ff' : '#f04f64';
  roundRect(ctx, x, y, width * ratio, 5, 2, color);
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(x + 1, y + 1, Math.max(0, width * ratio - 2), 1);
}
function drawTowerLayer(ctx, image, dx, dy, w, h, anchor, ox = 0, oy = 0, rotation = 0, scaleY = 1) {
  const ax = dx + anchor[0] / 512 * w, ay = dy + anchor[1] / 512 * h;
  ctx.save();
  ctx.translate(ax + ox, ay + oy); ctx.rotate(rotation); ctx.scale(1, scaleY); ctx.translate(-ax, -ay);
  ctx.drawImage(image, dx, dy, w, h);
  ctx.restore();
}

export class ArenaRenderer {
  constructor() {
    this.sprites = new TinySwords();
    this.walkStates = new Map();
    this.decor = [];
    let seed = 19;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 115; i++) {
      const y = rand() * 640;
      if (y > 295 && y < 355) continue;
      this.decor.push({ x: 8 + rand() * 344, y, type: rand() > .88 ? 'flower' : rand() > .72 ? 'stone' : 'grass', s: .6 + rand() * .8, tint: rand() });
    }
  }

  draw(ctx, game, selectedCard = null, pointer = null, emote = null) {
    const time = performance.now() / 1000;
    ctx.clearRect(0, 0, 360, 640);
    this.drawArena(ctx, time);
    if (selectedCard && game.status === 'playing') this.drawDeployment(ctx, game, selectedCard, pointer);
    const towers = [...game.towers].sort((a, b) => a.y - b.y);
    const units = [...game.units].sort((a, b) => a.y - b.y);
    const entities = [...towers.map((e) => ({ e, tower: true })), ...units.map((e) => ({ e, tower: false }))].sort((a, b) => a.e.y - b.e.y);
    for (const item of entities) {
      if (item.tower) this.drawTower(ctx, item.e, time);
      else this.drawUnit(ctx, item.e, time);
    }
    for (const p of game.projectiles) this.drawProjectile(ctx, p);
    for (const effect of game.effects) this.drawEffect(ctx, effect);
    for (const text of game.texts) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (text.duration - text.t) * 2);
      ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#18203a'; ctx.strokeText(text.text, text.x, text.y);
      ctx.fillStyle = text.color; ctx.fillText(text.text, text.x, text.y); ctx.restore();
    }
    if (emote && emote.t > 0) this.drawEmote(ctx, emote);
    if (game.status === 'paused') {
      ctx.fillStyle = '#09112688'; ctx.fillRect(0, 0, 360, 640);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 25px system-ui'; ctx.fillText('对战已暂停', 180, 310);
    }
  }

  drawArena(ctx, time) {
    const luxArena = this.sprites.arena();
    if (luxArena) {
      ctx.fillStyle = '#789d55'; ctx.fillRect(0, 0, 360, 640);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(luxArena, 0, 0, 360, 640);
      ctx.save(); ctx.globalAlpha = .16; ctx.strokeStyle = '#e5ffff'; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const x = ((i * 47 + time * 11) % 410) - 25, y = 312 + (i % 4) * 7;
        if (WORLD.bridges.some((bridge) => Math.abs(x - bridge) < 29)) continue;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y - 1.5, x + 14, y); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    const grass = ctx.createLinearGradient(0, 0, 360, 640);
    grass.addColorStop(0, '#679d4b'); grass.addColorStop(.5, '#72a951'); grass.addColorStop(1, '#5c9745');
    ctx.fillStyle = grass; ctx.fillRect(0, 0, 360, 640);
    for (let x = 0; x < 360; x += 45) { ctx.fillStyle = x % 90 === 0 ? '#b4df7a0c' : '#234d2409'; ctx.fillRect(x, 0, 45, 640); }
    for (let y = 0; y < 640; y += 40) { ctx.fillStyle = y % 80 === 0 ? '#d5ee9a09' : '#264c2508'; ctx.fillRect(0, y, 360, 40); }
    ctx.save(); ctx.strokeStyle = '#b6b27b35'; ctx.lineWidth = 31; ctx.lineCap = 'round';
    for (const x of WORLD.bridges) {
      ctx.beginPath(); ctx.moveTo(x, 75); ctx.lineTo(x, 565); ctx.stroke();
      ctx.strokeStyle = '#d6c68b20'; ctx.lineWidth = 23; ctx.stroke(); ctx.strokeStyle = '#b6b27b35'; ctx.lineWidth = 31;
    }
    ctx.restore();
    for (const d of this.decor) {
      if (d.type === 'grass') {
        line(ctx, d.x, d.y + 2, d.x - 1.5 * d.s, d.y - 2 * d.s, d.tint > .5 ? '#3d7c3b66' : '#a2c86655', 1);
        line(ctx, d.x + 1, d.y + 2, d.x + 2.5 * d.s, d.y - 1.5 * d.s, '#467f3c55', 1);
      } else if (d.type === 'stone') ellipse(ctx, d.x, d.y, 2.5 * d.s, 1.4 * d.s, '#d5d3aa44');
      else { circle(ctx, d.x, d.y, 1.6, d.tint > .5 ? '#fff0a9aa' : '#e7b6d5aa'); circle(ctx, d.x, d.y, .6, '#f6cb4c'); }
    }
    ctx.fillStyle = '#3a6e53'; ctx.fillRect(0, 299, 360, 8); ctx.fillRect(0, 344, 360, 8);
    ctx.fillStyle = '#a5bc75'; ctx.fillRect(0, 301, 360, 4); ctx.fillRect(0, 345, 360, 4);
    const river = ctx.createLinearGradient(0, 305, 0, 345);
    river.addColorStop(0, '#3c9ac0'); river.addColorStop(.5, '#52b8d3'); river.addColorStop(1, '#3286b1');
    ctx.fillStyle = river; ctx.fillRect(0, 305, 360, 40);
    ctx.save(); ctx.globalAlpha = .32; ctx.strokeStyle = '#d4f7fa'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 43 + time * 13) % 410) - 25, y = 311 + (i % 4) * 8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y - 2, x + 15, y); ctx.stroke();
    }
    ctx.restore();
    for (const x of WORLD.bridges) this.drawBridge(ctx, x);
    ctx.fillStyle = '#244f3280'; ctx.fillRect(0, 0, 5, 640); ctx.fillRect(355, 0, 5, 640);
  }

  drawBridge(ctx, x) {
    ctx.save();
    ellipse(ctx, x + 2, 337, 28, 8, '#183b4355');
    roundRect(ctx, x - 23, 301, 46, 46, 3, '#86633d');
    for (let y = 303; y < 346; y += 7) {
      roundRect(ctx, x - 21, y, 42, 6, 1, y % 14 === 3 ? '#c29a5e' : '#b28a51', '#765331', .6);
      line(ctx, x - 17, y + 1, x + 15, y + 1, '#dfba7955', .7);
    }
    line(ctx, x - 24, 301, x - 24, 347, '#654b32', 3); line(ctx, x + 24, 301, x + 24, 347, '#654b32', 3);
    for (const y of [303, 322, 344]) {
      roundRect(ctx, x - 27, y - 3, 6, 8, 1, '#7c5a36'); roundRect(ctx, x + 21, y - 3, 6, 8, 1, '#7c5a36');
      circle(ctx, x - 24, y - 3, 2.6, '#d2ad6e'); circle(ctx, x + 24, y - 3, 2.6, '#d2ad6e');
    }
    ctx.restore();
  }

  drawDeployment(ctx, game, cardId, pointer) {
    const card = CARDS[cardId];
    ctx.save();
    if (card.type === 'spell') {
      ctx.fillStyle = '#ff9b4920'; ctx.fillRect(0, 0, 360, 640);
    } else {
      ctx.fillStyle = '#45aaff20'; ctx.fillRect(5, 350, 350, 285);
      for (const lane of [0, 1]) {
        const p = game.towers.find((t) => t.side === 'enemy' && t.kind === 'princess' && t.lane === lane);
        if (p?.hp <= 0) ctx.fillRect(lane === 0 ? 5 : 180, 195, 175, 155);
      }
    }
    if (pointer) {
      const allowed = game.canDeploy('player', cardId, pointer.x, pointer.y).ok;
      ctx.strokeStyle = allowed ? '#d7f6ff' : '#ff9aa4'; ctx.fillStyle = allowed ? '#6dc9ff30' : '#ff546b25'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, card.type === 'spell' ? card.radius : 22, 0, TAU); ctx.fill(); ctx.stroke();
      if (allowed) { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(pointer.x, pointer.y, card.type === 'spell' ? card.radius + 5 : 27, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  drawTower(ctx, t, time) {
    const blue = t.side === 'player';
    const main = blue ? '#3994d0' : '#d84c59', dark = blue ? '#1e5f98' : '#94333f', light = blue ? '#74c8ef' : '#ff8990';
    ctx.save();
    if (t.hp <= 0) {
      ellipse(ctx, t.x, t.y + 15, t.radius + 9, 10, '#25472c55');
      for (let i = 0; i < 8; i++) {
        const a = i * 2.4, r = 5 + (i % 3) * 7;
        ctx.save(); ctx.translate(t.x + Math.cos(a) * r, t.y + Math.sin(a) * 5); ctx.rotate(a);
        roundRect(ctx, -6, -4, 12, 8, 1, i % 2 ? '#a6a28c' : '#7d8278', '#585e58'); ctx.restore();
      }
      ctx.restore(); return;
    }
    const luxBuilding = this.sprites.luxBuilding(t.side, t.kind);
    const partBase = luxBuilding ? this.sprites.luxBuildingPart(t.side, t.kind, 'base') : null;
    const partPerson = luxBuilding ? this.sprites.luxBuildingPart(t.side, t.kind, 'person') : null;
    const partCannon = luxBuilding && t.kind === 'king' ? this.sprites.luxBuildingPart(t.side, t.kind, 'cannon') : null;
    const animated = Boolean(partBase && partPerson && (t.kind !== 'king' || partCannon));
    const building = partBase || luxBuilding || this.sprites.building(t.side, t.kind);
    if (building) {
      const w = luxBuilding ? (t.kind === 'king' ? 90 : 78) : (t.kind === 'king' ? 82 : 39);
      const h = luxBuilding ? w : (t.kind === 'king' ? 66 : 78);
      const dx = Math.round(t.x - w / 2), dy = Math.round(t.y + (luxBuilding ? 22 : 25) - h);
      ellipse(ctx, t.x + 2, t.y + 21, t.radius + 7, 9, '#183a3455');
      ctx.imageSmoothingEnabled = Boolean(luxBuilding);
      if (t.flash > 0) { ctx.filter = 'brightness(2)'; t.flash = 0; }
      ctx.drawImage(building, dx, dy, w, h);
      if (animated) {
        const king = t.kind === 'king';
        const attack = Math.min(1, (t.attackAnim || 0) / (king ? .42 : .3));
        const angle = t.angle || (t.side === 'player' ? -Math.PI / 2 : Math.PI / 2);
        const aimX = Math.cos(angle), aimY = Math.sin(angle);
        const aiming = t.targetId ? 1 : 0;
        const breathe = Math.sin(time * 2.2 + t.x * .03) * .45;
        drawTowerLayer(ctx, partPerson, dx, dy, w, h, king ? [243, 184] : [255, 164],
          aimX * (attack * 1.5 + aiming * .22), breathe + aimY * attack * .8,
          aimX * (attack * .065 + aiming * .012), 1 + Math.sin(time * 2.2 + t.x * .03) * .008 - attack * .025);
        if (king) {
          drawTowerLayer(ctx, partCannon, dx, dy, w, h, [286, 151], -aimX * attack * 2.5, -aimY * attack * 1.5, -aimX * attack * .018);
        } else if (attack > .55) {
          ctx.globalAlpha = attack * .7;
          circle(ctx, t.x + aimX * 8, t.y - 38 + aimY * 3, 2.2, '#fff1b8');
          ctx.globalAlpha = 1;
        }
      }
      ctx.filter = 'none';
      if (t.kind === 'king' && !t.active) {
        circle(ctx, t.x + 25, dy + 7, 8, '#26364caa');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Z', t.x + 25, dy + 10);
      }
      healthBar(ctx, t, t.kind === 'king' ? 61 : 48, dy - 9 - t.y);
      ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#172038'; ctx.lineWidth = 2;
      ctx.strokeText(`${Math.ceil(t.hp)}`, t.x, dy - 1); ctx.fillText(`${Math.ceil(t.hp)}`, t.x, dy - 1);
      const badgeX = t.x - (t.kind === 'king' ? 37 : 29);
      circle(ctx, badgeX, dy - 6, 7, '#4e5a70');
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui'; ctx.fillText('9', badgeX, dy - 3);
      ctx.restore(); return;
    }
    if (t.flash > 0) { ctx.globalAlpha = .75; t.flash = 0; }
    ellipse(ctx, t.x + 3, t.y + 20, t.radius + 8, 10, '#183a3455');
    const r = t.radius, y = t.y;
    roundRect(ctx, t.x - r, y - 2, r * 2, 26, 4, '#8c938c', '#58645f', 1.2);
    for (let i = -r + 5; i < r - 3; i += 10) line(ctx, t.x + i, y + 3, t.x + i, y + 20, '#6f777255', .8);
    roundRect(ctx, t.x - r - 3, y - 9, r * 2 + 6, 13, 3, '#c4c5ad', '#777e77');
    roundRect(ctx, t.x - r + 3, y - 30, r * 2 - 6, 24, 5, main, dark, 1.2);
    ctx.fillStyle = light; ctx.fillRect(t.x - r + 6, y - 27, 4, 17);
    if (t.kind === 'king') {
      roundRect(ctx, t.x - 16, y - 24, 32, 20, 4, '#e5d5a4', '#9b895e');
      roundRect(ctx, t.x - 5, y - 17, 10, 13, 4, '#344254');
      circle(ctx, t.x, y - 30, 8, '#e6ba55');
      ctx.beginPath(); ctx.moveTo(t.x - 10, y - 34); ctx.lineTo(t.x - 9, y - 45); ctx.lineTo(t.x - 3, y - 38); ctx.lineTo(t.x, y - 48); ctx.lineTo(t.x + 4, y - 38); ctx.lineTo(t.x + 10, y - 45); ctx.lineTo(t.x + 9, y - 33); ctx.closePath(); ctx.fillStyle = '#ffd965'; ctx.fill(); ctx.strokeStyle = '#b8832e'; ctx.stroke();
      const angle = t.angle || (t.side === 'player' ? -Math.PI / 2 : Math.PI / 2);
      line(ctx, t.x, y - 21, t.x + Math.cos(angle) * 24, y - 21 + Math.sin(angle) * 24, '#343f4c', 7);
      circle(ctx, t.x, y - 21, 7, '#596774');
      if (!t.active) { circle(ctx, t.x + 21, y - 35, 8, '#26364caa'); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Z', t.x + 21, y - 32); }
    } else {
      ellipse(ctx, t.x, y - 29, r - 4, 8, light);
      roundRect(ctx, t.x - r + 1, y - 34, r * 2 - 2, 9, 3, main, dark);
      for (const dx of [-r + 3, -7, 7, r - 9]) roundRect(ctx, t.x + dx, y - 42, 7, 12, 2, main, dark);
      circle(ctx, t.x, y - 35, 6, '#f0d080');
      line(ctx, t.x, y - 39, t.x, y - 52, '#6d5336', 2);
      ctx.beginPath(); ctx.moveTo(t.x + 1, y - 51); ctx.lineTo(t.x + 15, y - 47); ctx.lineTo(t.x + 1, y - 43); ctx.closePath(); ctx.fillStyle = main; ctx.fill();
    }
    healthBar(ctx, t, t.kind === 'king' ? 61 : 51, -63);
    ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#172038'; ctx.lineWidth = 2;
    const hp = Math.ceil(t.hp); ctx.strokeText(`${hp}`, t.x, y - 55); ctx.fillText(`${hp}`, t.x, y - 55);
    circle(ctx, t.x - (t.kind === 'king' ? 37 : 31), y - 60, 7, '#4e5a70');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui'; ctx.fillText('9', t.x - (t.kind === 'king' ? 37 : 31), y - 57);
    ctx.restore();
  }

  drawUnit(ctx, u, time) {
    const c = CARDS[u.cardId], blue = u.side === 'player';
    const team = blue ? '#2b9ce6' : '#df4258', teamDark = blue ? '#1767a4' : '#982f45';
    const previousWalk = this.walkStates.get(u.id);
    const moving = previousWalk !== undefined && previousWalk !== u.walk;
    this.walkStates.set(u.id, u.walk);
    const attacking = u.deployLeft <= 0 && u.cooldown > c.hitSpeed - Math.min(.42, c.hitSpeed * .5);
    const action = attacking ? 'attack' : moving ? 'run' : 'idle';
    const sprite = this.sprites.unit(u.cardId, u.side, action) || this.sprites.unit(u.cardId, u.side, 'idle');
    const x = u.x, y = u.y;
    ctx.save();
    if (u.deployLeft > 0) ctx.globalAlpha = Math.max(.25, 1 - u.deployLeft / .9);
    ellipse(ctx, x + 1, u.y + u.radius * .65, u.radius * 1.05, u.radius * .42, '#153b3155');
    ellipse(ctx, x, u.y + 2, u.radius + 3, (u.radius + 3) * .55, blue ? '#4db6ff24' : '#ff637024');
    if (u.charging) { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, u.radius + 5 + Math.sin(time * 12) * 2, 0, TAU); ctx.stroke(); }
    if (sprite) {
      const seed = Number(u.id.replace(/\D/g, '')) || 0;
      const frame = Math.floor(time * sprite.fps + seed) % sprite.frames;
      const baseline = u.y + u.radius * .7 + 4;
      ctx.imageSmoothingEnabled = sprite.smooth;
      if (u.flash > 0) ctx.filter = 'brightness(2.2) saturate(.35)';
      if (u.cardId === 'hog' && action === 'attack') this.drawHogAttack(ctx, u, sprite, frame, baseline);
      else ctx.drawImage(sprite.image, frame * sprite.frameWidth, 0, sprite.frameWidth, sprite.frameHeight, Math.round(x - sprite.height / 2), Math.round(baseline - sprite.height), sprite.height, sprite.height);
      ctx.filter = 'none';
    } else {
      if (u.cardId === 'knight') this.drawKnight(ctx, x, y, team, teamDark, u.facing);
      else if (u.cardId === 'archers') this.drawArcher(ctx, x, y, team, u.facing);
      else if (u.cardId === 'giant') this.drawGiant(ctx, x, y, team);
      else if (u.cardId === 'skeletons') this.drawSkeleton(ctx, x, y, team);
      else if (u.cardId === 'prince') this.drawPrince(ctx, x, y, team, teamDark, u.facing);
      else if (u.cardId === 'witch') this.drawWitch(ctx, x, y, team, time);
      else if (u.cardId === 'hog') this.drawHog(ctx, x, y, team);
    }
    healthBar(ctx, u, Math.max(18, u.radius * 2.2), sprite ? u.radius * .7 + 4 - sprite.height - 7 : -u.radius * 2.25 - 8);
    ctx.restore();
  }

  drawHogAttack(ctx, unit, sprite, frame, baseline) {
    const scale = sprite.height / sprite.frameHeight;
    const dx = Math.round(unit.x - sprite.height / 2), dy = Math.round(baseline - sprite.height);
    const sourceX = frame * sprite.frameWidth;
    ctx.drawImage(sprite.image, sourceX + 135, 110, 65, 95, dx + 135 * scale, dy + 110 * scale, 65 * scale, 95 * scale);
    const handX = dx + 184 * scale, handY = dy + 169 * scale;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(unit.attackAngle || 0);
    const shaftLength = 108 * scale, tipLength = 13 * scale;
    line(ctx, -8 * scale, 0, shaftLength, 0, '#263942', Math.max(1.4, 3.4 * scale));
    line(ctx, -7 * scale, -.6 * scale, shaftLength, -.6 * scale, '#b8c8c8', Math.max(.7, 1.25 * scale));
    ctx.beginPath();
    ctx.moveTo(shaftLength + tipLength, 0);
    ctx.lineTo(shaftLength - 2 * scale, -5 * scale);
    ctx.lineTo(shaftLength + 2 * scale, 0);
    ctx.lineTo(shaftLength - 2 * scale, 5 * scale);
    ctx.closePath(); ctx.fillStyle = '#dce9e7'; ctx.fill(); ctx.strokeStyle = '#40565c'; ctx.lineWidth = 1; ctx.stroke();
    circle(ctx, 0, 0, Math.max(1.5, 4 * scale), '#edb184');
    ctx.restore();
  }

  drawKnight(ctx, x, y, team, dark) {
    line(ctx, x - 5, y + 7, x - 6, y + 14, '#4d4039', 4); line(ctx, x + 5, y + 7, x + 6, y + 14, '#4d4039', 4);
    roundRect(ctx, x - 9, y - 7, 18, 18, 5, '#b9c5ce', '#62717e');
    roundRect(ctx, x - 8, y - 3, 16, 7, 2, team);
    circle(ctx, x, y - 12, 9, '#f0bc8a');
    ctx.beginPath(); ctx.arc(x, y - 14, 9, Math.PI, TAU); ctx.lineTo(x + 7, y - 10); ctx.lineTo(x + 3, y - 18); ctx.lineTo(x - 2, y - 10); ctx.lineTo(x - 7, y - 17); ctx.closePath(); ctx.fillStyle = '#f1cf55'; ctx.fill();
    roundRect(ctx, x - 10, y - 14, 20, 6, 2, '#aab8c4', '#647482');
    line(ctx, x - 6, y - 11, x + 6, y - 11, dark, 2);
    line(ctx, x + 8, y + 4, x + 16, y - 12, '#e9f0f1', 3); line(ctx, x + 11, y - 1, x + 16, y + 2, '#d8b255', 2);
    ellipse(ctx, x - 11, y + 1, 6, 9, team); ellipse(ctx, x - 11, y + 1, 3, 5, '#d8e0df');
  }

  drawArcher(ctx, x, y, team) {
    line(ctx, x - 3, y + 7, x - 4, y + 13, '#67453b', 2.5); line(ctx, x + 3, y + 7, x + 4, y + 13, '#67453b', 2.5);
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x - 8, y + 9); ctx.lineTo(x + 8, y + 9); ctx.closePath(); ctx.fillStyle = team; ctx.fill();
    circle(ctx, x, y - 11, 7, '#f2bd91');
    ctx.beginPath(); ctx.arc(x, y - 13, 8, Math.PI * .85, Math.PI * 2.1); ctx.lineTo(x + 6, y - 5); ctx.lineTo(x + 1, y - 9); ctx.closePath(); ctx.fillStyle = '#ed76ac'; ctx.fill();
    circle(ctx, x - 2, y - 11, .8, '#333'); circle(ctx, x + 2, y - 11, .8, '#333');
    ctx.beginPath(); ctx.arc(x + 8, y, 8, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = '#8b562e'; ctx.lineWidth = 1.5; ctx.stroke();
    line(ctx, x + 8, y - 8, x + 8, y + 8, '#e6d6ab', .8); line(ctx, x + 3, y, x + 15, y, '#e8d6a1', 1);
  }

  drawGiant(ctx, x, y, team) {
    line(ctx, x - 7, y + 9, x - 8, y + 17, '#6a4937', 6); line(ctx, x + 7, y + 9, x + 8, y + 17, '#6a4937', 6);
    ellipse(ctx, x, y, 15, 17, '#d7a06d');
    roundRect(ctx, x - 13, y + 1, 26, 11, 4, team);
    circle(ctx, x, y - 16, 11, '#e6b17f');
    ctx.beginPath(); ctx.arc(x, y - 12, 10, 0, Math.PI); ctx.lineTo(x - 8, y - 7); ctx.quadraticCurveTo(x, y + 1, x + 8, y - 7); ctx.closePath(); ctx.fillStyle = '#a85e34'; ctx.fill();
    circle(ctx, x - 4, y - 18, 1, '#392d2b'); circle(ctx, x + 4, y - 18, 1, '#392d2b');
    circle(ctx, x - 17, y + 2, 7, '#e6b17f'); circle(ctx, x + 17, y + 2, 7, '#e6b17f');
  }

  drawSkeleton(ctx, x, y, team) {
    line(ctx, x - 3, y + 5, x - 4, y + 11, '#e9e3cf', 2); line(ctx, x + 3, y + 5, x + 4, y + 11, '#e9e3cf', 2);
    line(ctx, x, y - 3, x, y + 6, '#e9e3cf', 3); line(ctx, x - 5, y, x + 5, y, '#e9e3cf', 2);
    circle(ctx, x, y - 7, 6, '#f0ead9');
    circle(ctx, x - 2.3, y - 8, 1.7, '#34313c'); circle(ctx, x + 2.3, y - 8, 1.7, '#34313c');
    line(ctx, x - 2, y - 4, x + 2, y - 4, '#8e877b', 1);
    line(ctx, x + 5, y + 2, x + 10, y - 6, '#c9d2d6', 1.5); circle(ctx, x - 6, y + 1, 3.5, team);
  }

  drawPrince(ctx, x, y, team, dark) {
    ellipse(ctx, x, y + 4, 14, 10, '#e5e6df');
    circle(ctx, x + 9, y - 3, 7, '#f2f0e6');
    line(ctx, x - 8, y + 9, x - 9, y + 16, '#b8b9b4', 4); line(ctx, x + 7, y + 9, x + 8, y + 16, '#b8b9b4', 4);
    circle(ctx, x + 11, y - 4, 1.2, '#242a34');
    roundRect(ctx, x - 6, y - 12, 13, 14, 4, team, dark);
    circle(ctx, x, y - 17, 7, '#b9c5cf');
    ctx.beginPath(); ctx.moveTo(x - 7, y - 18); ctx.lineTo(x, y - 28); ctx.lineTo(x + 7, y - 18); ctx.closePath(); ctx.fillStyle = '#9a79cb'; ctx.fill();
    line(ctx, x + 5, y - 9, x + 23, y - 21, '#d7b361', 3); ctx.beginPath(); ctx.moveTo(x + 23, y - 21); ctx.lineTo(x + 17, y - 21); ctx.lineTo(x + 22, y - 15); ctx.closePath(); ctx.fillStyle = '#e9edf0'; ctx.fill();
  }

  drawWitch(ctx, x, y, team, time) {
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x - 10, y + 13); ctx.lineTo(x + 10, y + 13); ctx.closePath(); ctx.fillStyle = '#563a83'; ctx.fill();
    roundRect(ctx, x - 8, y, 16, 7, 2, team);
    circle(ctx, x, y - 13, 7, '#c6a2c8');
    ctx.beginPath(); ctx.arc(x, y - 14, 8, Math.PI, TAU); ctx.lineTo(x + 8, y - 6); ctx.lineTo(x + 3, y - 11); ctx.lineTo(x - 6, y - 7); ctx.closePath(); ctx.fillStyle = '#312944'; ctx.fill();
    circle(ctx, x - 2, y - 13, 1, '#f16dff'); circle(ctx, x + 2, y - 13, 1, '#f16dff');
    line(ctx, x + 8, y + 8, x + 12, y - 17, '#60432e', 2);
    circle(ctx, x + 12, y - 20, 4 + Math.sin(time * 4) * .5, '#c65bff'); circle(ctx, x + 12, y - 20, 2, '#f1c4ff');
  }

  drawHog(ctx, x, y, team) {
    ellipse(ctx, x, y + 3, 15, 9, '#a96b4d');
    circle(ctx, x + 11, y, 8, '#bd7a57'); ellipse(ctx, x + 15, y + 2, 5, 4, '#db9b76');
    circle(ctx, x + 14, y + 1, .8, '#4e3028'); circle(ctx, x + 17, y + 1, .8, '#4e3028');
    line(ctx, x - 8, y + 8, x - 9, y + 14, '#593e34', 4); line(ctx, x + 7, y + 8, x + 8, y + 14, '#593e34', 4);
    roundRect(ctx, x - 7, y - 12, 14, 14, 4, team);
    circle(ctx, x, y - 16, 7, '#c88c68');
    ctx.beginPath(); ctx.arc(x, y - 18, 7, Math.PI, TAU); ctx.fillStyle = '#3d2d2c'; ctx.fill();
    line(ctx, x + 5, y - 8, x + 12, y - 16, '#6d4931', 3); roundRect(ctx, x + 9, y - 20, 8, 6, 2, '#737d82');
  }

  drawProjectile(ctx, p) {
    const angle = p.angle || 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    if (p.type === 'arrow') {
      ctx.globalAlpha = .2; line(ctx, -23, 0, -5, 0, '#fff4cf', 3);
      ctx.globalAlpha = 1; line(ctx, -12, 0, -1, 0, '#f4e5b7', 1.5);
      line(ctx, -11, 0, -8, -3, '#d8e6ed', 1); line(ctx, -11, 0, -8, 3, '#d8e6ed', 1);
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(-3, -2.4); ctx.lineTo(-2, 0); ctx.lineTo(-3, 2.4); ctx.closePath(); ctx.fillStyle = '#f4f8fa'; ctx.fill();
    } else if (p.type === 'magic') {
      for (let i = 3; i > 0; i--) circle(ctx, -i * 5, 0, 1.5 + (3 - i), `rgba(168,92,255,${.08 + (3 - i) * .07})`);
      ctx.shadowColor = '#c26dff'; ctx.shadowBlur = 9;
      circle(ctx, 0, 0, 5, '#a85cff66'); circle(ctx, 0, 0, 2.8, '#f2ccff');
    } else {
      for (let i = 3; i > 0; i--) circle(ctx, -i * 5, 0, 2 + i * .6, `rgba(63,70,72,${.08 + (3 - i) * .05})`);
      circle(ctx, 0, 0, 4.5, '#252e37'); circle(ctx, -1.2, -1.3, 1.3, '#aeb8bc');
    }
    ctx.restore();
  }

  drawEffect(ctx, e) {
    const p = Math.min(1, e.t / e.duration), fade = 1 - p;
    ctx.save();
    if (e.type === 'deploy' || e.type === 'summon') {
      ctx.globalAlpha = fade; ctx.strokeStyle = e.color || '#d99aff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, 8 + p * 30, 4 + p * 15, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) circle(ctx, e.x + Math.cos(i) * p * 25, e.y - p * 20 + Math.sin(i) * 8, 2, e.color || '#d99aff');
    } else if (e.type === 'slash' || e.type === 'charge') {
      ctx.translate(e.x, e.y); ctx.rotate(e.angle || 0);
      ctx.globalAlpha = fade; ctx.strokeStyle = e.type === 'charge' ? '#ffd75e' : '#fff4ce'; ctx.lineCap = 'round';
      ctx.lineWidth = 4 - p * 2; ctx.beginPath(); ctx.arc(0, 0, 8 + p * 15, -1.15 + p * .4, 1.05 + p * .4); ctx.stroke();
      ctx.globalAlpha = fade * .55; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 12 + p * 17, -1 + p * .4, .85 + p * .4); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = -.8 + i * .55; line(ctx, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * (7 + p * 8), Math.sin(a) * (7 + p * 8), '#fff8dc', 1.3); }
    } else if (e.type === 'arrowHit') {
      ctx.globalAlpha = Math.min(1, fade * 1.7);
      this.drawProjectile(ctx, { type: 'arrow', x: e.x, y: e.y, angle: e.angle });
      ctx.globalAlpha = fade; ctx.strokeStyle = '#fff4c4'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 2 + p * 8, 0, TAU); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = e.angle + Math.PI + (i - 2) * .38; line(ctx, e.x + Math.cos(a) * 2, e.y + Math.sin(a) * 2, e.x + Math.cos(a) * (5 + p * 9), e.y + Math.sin(a) * (5 + p * 9), '#ffe9a6', 1.4); }
    } else if (e.type === 'magicHit') {
      ctx.globalAlpha = fade; circle(ctx, e.x, e.y, 8 * fade + 2, '#f0c8ff');
      ctx.strokeStyle = '#c178ff'; ctx.lineWidth = 3 * fade + .5; ctx.beginPath(); ctx.arc(e.x, e.y, 4 + p * 24, 0, TAU); ctx.stroke();
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9; circle(ctx, e.x + Math.cos(a) * p * 25, e.y + Math.sin(a) * p * 18, 2.4 * fade, i % 2 ? '#e6b2ff' : '#9b55ed'); }
    } else if (e.type === 'cannonHit') {
      ctx.globalAlpha = fade; circle(ctx, e.x, e.y, 10 * fade + 2, '#ffe0a0');
      ctx.strokeStyle = '#e9b76e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, 4 + p * 19, 0, TAU); ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7; circle(ctx, e.x + Math.cos(a) * p * 17, e.y + Math.sin(a) * p * 12 - p * 5, 3 + p * 3, `rgba(70,75,74,${fade * .55})`); }
    } else if (e.type === 'hit' || e.type === 'death') {
      ctx.globalAlpha = fade;
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7; circle(ctx, e.x + Math.cos(a) * p * 18, e.y + Math.sin(a) * p * 13, 2.2 * fade, e.color || '#fff'); }
    } else if (e.type === 'fireball') {
      if (p < .52) {
        const q = p / .52, fy = e.y - 170 * (1 - q);
        const grad = ctx.createRadialGradient(e.x, fy, 1, e.x, fy, 17); grad.addColorStop(0, '#fff5a8'); grad.addColorStop(.35, '#ffad32'); grad.addColorStop(1, '#ee432000');
        circle(ctx, e.x, fy, 18, grad); circle(ctx, e.x, fy, 8, '#ffcf4d');
      }
    } else if (e.type === 'explosion') {
      const grad = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 55 * p + 5);
      grad.addColorStop(0, `rgba(255,245,170,${fade})`); grad.addColorStop(.35, `rgba(255,133,35,${fade})`); grad.addColorStop(1, 'rgba(80,40,30,0)');
      circle(ctx, e.x, e.y, 60 * p + 5, grad);
      ctx.globalAlpha = fade * .5; circle(ctx, e.x, e.y - p * 16, 22 + p * 25, '#4c4644');
    } else if (e.type === 'towerBreak') {
      ctx.globalAlpha = fade;
      for (let i = 0; i < 16; i++) { const a = i * 2.1; circle(ctx, e.x + Math.cos(a) * p * 45, e.y + Math.sin(a) * p * 30 - p * 20, 4 * fade + 1, i % 2 ? '#d4c49e' : '#737d78'); }
      ctx.globalAlpha = fade * .6; circle(ctx, e.x, e.y - p * 25, 12 + p * 30, '#514c48');
    }
    ctx.restore();
  }

  drawEmote(ctx, emote) {
    const x = emote.side === 'player' ? 225 : 135, y = emote.side === 'player' ? 558 : 90;
    ctx.save(); ctx.globalAlpha = Math.min(1, emote.t * 2);
    roundRect(ctx, x - 27, y - 27, 54, 46, 12, '#f7f3e8', '#c6b98e', 2);
    ctx.beginPath(); ctx.moveTo(x - 6, y + 17); ctx.lineTo(x - 15, y + 28); ctx.lineTo(x + 4, y + 18); ctx.closePath(); ctx.fillStyle = '#f7f3e8'; ctx.fill();
    ctx.font = '26px system-ui'; ctx.textAlign = 'center'; ctx.fillText(emote.emoji, x, y + 8); ctx.restore();
  }
}
