import { CARDS, DECK, WORLD, createTowers } from './data.js';
import { createAIState, decideAIAction } from './ai.js';
import { getLevel } from './levels.js';
import { visualAimPoint } from './sprites.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class RoyalGame {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.nextId = 1;
    this.reset();
  }

  reset(levelId = this.levelId || 1) {
    this.status = 'idle';
    this.levelId = Number(levelId) || 1;
    this.level = getLevel(this.levelId);
    this.timeLeft = 180;
    this.elapsed = 0;
    this.overtime = false;
    this.doubleElixir = false;
    this.elixir = { player: 5, enemy: 5 };
    this.towers = createTowers();
    this.units = [];
    this.projectiles = [];
    this.effects = [];
    this.texts = [];
    this.pendingSpells = [];
    this.crowns = { player: 0, enemy: 0 };
    this.hands = { player: [], enemy: [] };
    this.queues = { player: [], enemy: [] };
    for (const side of ['player', 'enemy']) {
      const deck = shuffle(DECK);
      this.hands[side] = deck.slice(0, 4);
      this.queues[side] = deck.slice(4);
    }
    this.autoPlay = this.autoPlay || { player: false, enemy: true };
    this.aiStates = { player: createAIState(this.level), enemy: createAIState(this.level) };
    this.aiPlans = { player: '观察局势', enemy: '观察局势' };
    this.winner = null;
    this.endReason = '';
    this.log = [{ text: `第 ${this.level.id} 关 · ${this.level.name}`, side: 'system', t: 0 }];
    const newStats = () => ({ cards: 0, damage: 0, towerDamage: 0, elixir: 0, elixirWasted: 0, towers: 0, laneDamage: [0, 0], cardsById: {} });
    this.stats = { player: newStats(), enemy: newStats() };
    this.battleMark = Math.random() * 1000;
  }

  start(levelId = this.levelId || 1) {
    this.reset(levelId);
    this.status = 'playing';
    this.addLog(`${this.level.name} · 对战开始！`, 'system');
    this.onEvent({ type: 'start' });
  }

  togglePause() {
    if (this.status === 'playing') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'playing';
  }

  addLog(text, side = 'system') {
    this.log.unshift({ text, side, t: this.elapsed });
    this.log = this.log.slice(0, 7);
  }

  getEntity(id) {
    return this.units.find((u) => u.id === id && u.hp > 0) || this.towers.find((t) => t.id === id && t.hp > 0);
  }

  getNextCard(side) { return this.queues[side][0]; }

  canDeploy(side, cardId, x, y) {
    const card = CARDS[cardId];
    if (!card) return { ok: false, reason: '未知卡牌' };
    if (this.status !== 'playing') return { ok: false, reason: '对战尚未开始' };
    if (x < 12 || x > 348 || y < 20 || y > 625) return { ok: false, reason: '超出竞技场范围' };
    if (card.type === 'spell') return { ok: true };
    if (y > WORLD.riverTop - 4 && y < WORLD.riverBottom + 4) return { ok: false, reason: '不能部署在河道中' };
    let valid = side === 'player' ? y >= 355 : y <= 290;
    const enemySide = side === 'player' ? 'enemy' : 'player';
    const lane = x < 180 ? 0 : 1;
    const princess = this.towers.find((t) => t.side === enemySide && t.kind === 'princess' && t.lane === lane);
    if (princess?.hp <= 0) {
      const inLane = side === 'player' ? x < 175 : x > 185;
      const forward = side === 'player' ? y >= 195 && y < 355 : y <= 450 && y > 290;
      if (inLane && forward) valid = true;
    }
    if (!valid) return { ok: false, reason: '只能部署在己方区域' };
    return { ok: true };
  }

  useCard(side, handIndex, x, y) {
    const cardId = this.hands[side][handIndex];
    const card = CARDS[cardId];
    if (!card) return false;
    if (this.elixir[side] + 0.001 < card.cost) {
      if (side === 'player') this.onEvent({ type: 'error', message: '圣水不足' });
      return false;
    }
    const allowed = this.canDeploy(side, cardId, x, y);
    if (!allowed.ok) {
      if (side === 'player') this.onEvent({ type: 'error', message: allowed.reason });
      return false;
    }
    this.elixir[side] -= card.cost;
    this.stats[side].cards++;
    this.stats[side].elixir += card.cost;
    this.stats[side].cardsById[cardId] = (this.stats[side].cardsById[cardId] || 0) + 1;
    if (card.type === 'spell') {
      this.pendingSpells.push({ cardId, side, x, y, delay: 0.42 });
      this.effects.push({ type: 'fireball', x, y, t: 0, duration: 0.85, side });
      this.onEvent({ type: 'fireball' });
    } else {
      this.spawnCardUnits(card, side, x, y);
      this.effects.push({ type: 'deploy', x, y, t: 0, duration: 0.5, color: side === 'player' ? '#51a8ff' : '#ff596d' });
      this.onEvent({ type: 'deploy' });
    }
    this.queues[side].push(cardId);
    this.hands[side][handIndex] = this.queues[side].shift();
    this.addLog(`${side === 'player' ? '你' : '对手'}部署了${card.name}`, side);
    return true;
  }

  spawnCardUnits(card, side, x, y) {
    for (let i = 0; i < card.count; i++) {
      let ox = 0, oy = 0;
      if (card.count === 2) ox = i === 0 ? -11 : 11;
      else if (card.count > 2) {
        const angle = (i / card.count) * Math.PI * 2;
        const ring = card.count > 8 ? 20 : 13;
        ox = Math.cos(angle) * ring; oy = Math.sin(angle) * ring * 0.65;
      }
      this.spawnUnit(card.id, side, clamp(x + ox, 15, 345), clamp(y + oy, 20, 620));
    }
  }

  spawnUnit(cardId, side, x, y, summoned = false) {
    const c = CARDS[cardId];
    const unit = {
      id: `unit-${this.nextId++}`, cardId, side, x, y, hp: c.hp, maxHp: c.hp,
      radius: c.radius, range: c.range, speed: c.speed * 0.65, damage: c.damage,
      cooldown: Math.random() * 0.25, deployLeft: summoned ? 0.25 : 0.8,
      targetId: null, retarget: Math.random() * 0.2, chargeTime: 0, charging: false,
      summonTimer: 6.5, facing: side === 'player' ? -1 : 1, walk: Math.random() * 6,
      attackAngle: side === 'player' ? -Math.PI / 2 : Math.PI / 2,
      summoned, flash: 0,
    };
    this.units.push(unit);
    return unit;
  }

  findTarget(unit) {
    const enemies = this.towers.filter((t) => t.side !== unit.side && t.hp > 0);
    const card = CARDS[unit.cardId];
    if (!card.buildingOnly) {
      let closest = null, best = card.sight;
      for (const other of this.units) {
        if (other.side === unit.side || other.hp <= 0 || other.deployLeft > 0.35) continue;
        const d = dist(unit, other);
        if (d < best) { best = d; closest = other; }
      }
      if (closest) return closest;
    }
    return enemies.sort((a, b) => dist(unit, a) - dist(unit, b))[0] || null;
  }

  waypointFor(unit, goal) {
    const crossing = (unit.y > WORLD.riverBottom && goal.y < WORLD.riverTop) || (unit.y < WORLD.riverTop && goal.y > WORLD.riverBottom);
    if (!crossing) return goal;
    let bridge = WORLD.bridges[0];
    if (Math.abs(unit.x - WORLD.bridges[1]) < Math.abs(unit.x - WORLD.bridges[0])) bridge = WORLD.bridges[1];
    const ownY = unit.side === 'player' ? WORLD.riverBottom + 13 : WORLD.riverTop - 13;
    const farY = unit.side === 'player' ? WORLD.riverTop - 13 : WORLD.riverBottom + 13;
    if (Math.abs(unit.x - bridge) > 7 || (unit.side === 'player' ? unit.y > ownY + 5 : unit.y < ownY - 5)) return { x: bridge, y: ownY };
    return { x: bridge, y: farY };
  }

  updateUnit(unit, dt) {
    unit.cooldown -= dt; unit.flash = Math.max(0, unit.flash - dt); unit.retarget -= dt;
    if (unit.deployLeft > 0) { unit.deployLeft -= dt; return; }
    const card = CARDS[unit.cardId];
    if (card.summon) {
      unit.summonTimer -= dt;
      if (unit.summonTimer <= 0) {
        unit.summonTimer = 7;
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI * 2 / 3;
          this.spawnUnit('skeletons', unit.side, unit.x + Math.cos(a) * 16, unit.y + Math.sin(a) * 12, true);
        }
        this.effects.push({ type: 'summon', x: unit.x, y: unit.y, t: 0, duration: 0.6 });
      }
    }
    let target = this.getEntity(unit.targetId);
    const lostTarget = target && !target.kind && dist(unit, target) > card.sight * 1.2;
    const shouldScan = target?.kind && !card.buildingOnly;
    if (!target || lostTarget || (unit.retarget <= 0 && shouldScan)) {
      target = this.findTarget(unit);
      unit.targetId = target?.id || null;
    }
    if (unit.retarget <= 0) unit.retarget = 0.5 + Math.random() * 0.2;
    if (!target) return;
    const d = dist(unit, target);
    if (d <= unit.range + target.radius) {
      unit.facing = target.y < unit.y ? -1 : 1;
      const origin = visualAimPoint(unit), aim = visualAimPoint(target);
      unit.attackAngle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
      if (unit.cooldown <= 0) this.unitAttack(unit, target, card);
      else { unit.chargeTime = 0; unit.charging = false; }
      return;
    }
    const waypoint = this.waypointFor(unit, target);
    const dx = waypoint.x - unit.x, dy = waypoint.y - unit.y;
    const length = Math.hypot(dx, dy) || 1;
    let speed = unit.speed;
    if (card.charge) {
      unit.chargeTime += dt;
      if (unit.chargeTime > 1.5) { unit.charging = true; speed *= 1.75; }
    }
    unit.x += (dx / length) * speed * dt;
    unit.y += (dy / length) * speed * dt;
    unit.x = clamp(unit.x, 12, 348); unit.y = clamp(unit.y, 22, 622);
    unit.facing = dy < 0 ? -1 : 1;
    unit.walk += dt * speed * 0.12;
  }

  unitAttack(unit, target, card) {
    unit.cooldown = card.hitSpeed;
    const damage = unit.charging ? card.damage * 2 : card.damage;
    const origin = visualAimPoint(unit), aim = visualAimPoint(target);
    const angle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
    if (unit.charging) this.effects.push({ type: 'charge', x: aim.x, y: aim.y, angle, t: 0, duration: 0.35 });
    unit.charging = false; unit.chargeTime = 0;
    if (card.projectile) {
      this.projectiles.push({ id: `p-${this.nextId++}`, type: card.projectile, side: unit.side, x: origin.x, y: origin.y, angle, targetId: target.id, speed: card.projectile === 'arrow' ? 520 : 230, damage, splash: card.splash || 0, hp: 1 });
      this.onEvent({ type: 'arrow' });
    } else {
      this.damage(target, damage, unit.side);
      this.effects.push({ type: 'slash', x: aim.x, y: aim.y, angle, t: 0, duration: 0.24, side: unit.side });
      this.onEvent({ type: 'hit' });
    }
  }

  updateTower(tower, dt) {
    if (tower.hp <= 0) return;
    tower.cooldown -= dt;
    tower.attackAnim = Math.max(0, (tower.attackAnim || 0) - dt);
    if (tower.kind === 'king' && !tower.active) { tower.targetId = null; return; }
    let target = null, best = tower.range;
    for (const unit of this.units) {
      if (unit.side === tower.side || unit.hp <= 0 || unit.deployLeft > 0.25) continue;
      const d = dist(tower, unit);
      if (d < best) { best = d; target = unit; }
    }
    tower.targetId = target?.id || null;
    if (target) {
      const aim = visualAimPoint(target);
      tower.angle = Math.atan2(aim.y - (tower.y - 15), aim.x - tower.x);
    }
    if (target && tower.cooldown <= 0) {
      tower.cooldown = tower.hitSpeed;
      tower.attackAnim = tower.kind === 'king' ? 0.42 : 0.3;
      const aim = visualAimPoint(target);
      tower.angle = Math.atan2(aim.y - (tower.y - 15), aim.x - tower.x);
      this.projectiles.push({ id: `p-${this.nextId++}`, type: tower.kind === 'king' ? 'cannon' : 'arrow', side: tower.side, x: tower.x, y: tower.y - 15, angle: tower.angle, targetId: target.id, speed: tower.kind === 'king' ? 300 : 560, damage: tower.damage, splash: tower.kind === 'king' ? 10 : 0 });
      this.onEvent({ type: 'arrow' });
    }
  }

  updateProjectile(p, dt) {
    const target = this.getEntity(p.targetId);
    if (!target) { p.hp = 0; return; }
    const aim = visualAimPoint(target);
    const dx = aim.x - p.x, dy = aim.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.angle = Math.atan2(dy, dx);
    if (d <= p.speed * dt + 1.5) {
      p.x = aim.x; p.y = aim.y;
      if (p.splash) {
        for (const unit of [...this.units]) {
          if (unit.side !== p.side && unit.hp > 0 && dist(unit, target) <= p.splash + unit.radius) this.damage(unit, p.damage, p.side);
        }
      } else this.damage(target, p.damage, p.side);
      const type = p.type === 'magic' ? 'magicHit' : p.type === 'cannon' ? 'cannonHit' : p.type === 'arrow' ? 'arrowHit' : 'hit';
      const duration = p.type === 'arrow' ? 0.18 : p.type === 'magic' ? 0.38 : 0.32;
      this.effects.push({ type, x: aim.x, y: aim.y, angle: p.angle, t: 0, duration, color: p.type === 'magic' ? '#b779ff' : '#fff3c4' });
      p.hp = 0;
      return;
    }
    p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt;
  }

  damage(target, amount, sourceSide) {
    if (!target || target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - amount);
    target.flash = 0.12;
    const dealt = Math.min(amount, target.hp + amount);
    this.stats[sourceSide].damage += dealt;
    if (target.kind) {
      this.stats[sourceSide].towerDamage += dealt;
      const lane = target.lane ?? (target.x < WORLD.width / 2 ? 0 : 1);
      this.stats[sourceSide].laneDamage[lane] += dealt;
    }
    if (target.kind === 'king') target.active = true;
    if (target.hp <= 0) {
      if (target.kind) this.destroyTower(target, sourceSide);
      else this.effects.push({ type: 'death', x: target.x, y: target.y, t: 0, duration: 0.45, color: CARDS[target.cardId]?.color || '#f3e7c2' });
    }
  }

  destroyTower(tower, sourceSide) {
    const scorer = tower.side === 'player' ? 'enemy' : 'player';
    this.crowns[scorer] = tower.kind === 'king' ? 3 : Math.min(2, this.crowns[scorer] + 1);
    this.stats[scorer].towers++;
    this.effects.push({ type: 'towerBreak', x: tower.x, y: tower.y, t: 0, duration: 1.2, side: tower.side });
    this.texts.push({ text: '皇家塔被摧毁！', x: tower.x, y: tower.y - 35, t: 0, duration: 1.4, color: '#ffd35c' });
    this.onEvent({ type: 'tower' });
    this.addLog(`${tower.side === 'player' ? '己方' : '敌方'}${tower.kind === 'king' ? '国王塔' : '公主塔'}被摧毁！`, scorer);
    const king = this.towers.find((t) => t.side === tower.side && t.kind === 'king');
    if (king) king.active = true;
    if (tower.kind === 'king') this.finish(scorer, '国王塔摧毁');
    else if (this.overtime) this.finish(scorer, '加时赛突然死亡');
  }

  castFireball(spell) {
    const card = CARDS.fireball;
    for (const unit of [...this.units]) {
      if (unit.side !== spell.side && unit.hp > 0 && dist(unit, spell) <= card.radius + unit.radius) {
        this.damage(unit, card.damage, spell.side);
        this.texts.push({ text: `-${card.damage}`, x: unit.x, y: unit.y - 15, t: 0, duration: 0.7, color: '#ffdf9b' });
      }
    }
    for (const tower of [...this.towers]) {
      if (tower.side !== spell.side && tower.hp > 0 && dist(tower, spell) <= card.radius + tower.radius) this.damage(tower, card.towerDamage, spell.side);
    }
    this.effects.push({ type: 'explosion', x: spell.x, y: spell.y, t: 0, duration: 0.65 });
  }

  updateAI(dt, side = 'enemy') {
    const state = this.aiStates[side];
    state.timer -= dt;
    if (state.timer > 0) return;
    const action = decideAIAction(this, side, state);
    const [minReaction, maxReaction] = this.level.reaction;
    state.timer = minReaction + Math.random() * (maxReaction - minReaction);
    if (!action) return;
    if (this.useCard(side, action.handIndex, action.x, action.y)) {
      state.lastCard = action.cardId;
      state.plan = action.tactic;
      this.aiPlans[side] = action.tactic;
    }
  }

  separateUnits() {
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i]; if (a.hp <= 0) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j]; if (b.hp <= 0) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || .1;
        const min = (a.radius + b.radius) * .58;
        if (d < min) {
          const push = (min - d) * .06;
          a.x -= dx / d * push; a.y -= dy / d * push;
          b.x += dx / d * push; b.y += dy / d * push;
        }
      }
    }
  }

  finish(winner, reason) {
    if (this.status === 'ended') return;
    this.status = 'ended'; this.winner = winner; this.endReason = reason;
    this.onEvent({ type: winner === 'player' ? 'win' : winner === 'enemy' ? 'lose' : 'tower' });
    this.addLog(winner === 'draw' ? '势均力敌，平局！' : `${winner === 'player' ? '你' : '对手'}赢得对战！`, 'system');
  }

  checkTimer(dt) {
    this.timeLeft -= dt; this.elapsed += dt;
    if (!this.doubleElixir && this.elapsed >= 120 && !this.overtime) {
      this.doubleElixir = true;
      this.addLog('双倍圣水时间！', 'system');
      this.texts.push({ text: '双倍圣水！', x: 180, y: 320, t: 0, duration: 2, color: '#e890ff' });
    }
    if (this.timeLeft > 0) return;
    if (!this.overtime) {
      if (this.crowns.player !== this.crowns.enemy) {
        this.finish(this.crowns.player > this.crowns.enemy ? 'player' : 'enemy', '三冠争夺战结束');
      } else {
        this.overtime = true; this.doubleElixir = true; this.timeLeft = 60;
        this.addLog('加时赛：下一座塔决定胜负！', 'system');
        this.texts.push({ text: '突然死亡', x: 180, y: 320, t: 0, duration: 2, color: '#ffd35c' });
      }
    } else {
      const ratio = (side) => {
        const towers = this.towers.filter((t) => t.side === side);
        return towers.reduce((s, t) => s + t.hp / t.maxHp, 0);
      };
      const p = ratio('player'), e = ratio('enemy');
      this.finish(Math.abs(p - e) < .001 ? 'draw' : p > e ? 'player' : 'enemy', '皇家塔剩余生命值决胜');
    }
  }

  update(dt) {
    if (this.status !== 'playing') return;
    dt = Math.min(dt, 0.05);
    this.checkTimer(dt);
    if (this.status !== 'playing') return;
    const regen = dt / (this.doubleElixir ? 1.4 : 2.8);
    for (const side of ['player', 'enemy']) {
      const before = this.elixir[side];
      this.elixir[side] = Math.min(10, before + regen);
      this.stats[side].elixirWasted += Math.max(0, before + regen - 10);
    }
    const firstSide = Math.floor(this.battleMark) % 2 ? 'player' : 'enemy';
    const secondSide = firstSide === 'player' ? 'enemy' : 'player';
    if (this.autoPlay[firstSide]) this.updateAI(dt, firstSide);
    if (this.autoPlay[secondSide]) this.updateAI(dt, secondSide);
    for (const spell of [...this.pendingSpells]) {
      spell.delay -= dt;
      if (spell.delay <= 0) { this.castFireball(spell); this.pendingSpells.splice(this.pendingSpells.indexOf(spell), 1); }
    }
    for (const tower of this.towers) this.updateTower(tower, dt);
    for (const unit of [...this.units]) if (unit.hp > 0) this.updateUnit(unit, dt);
    for (const p of this.projectiles) if (p.hp > 0) this.updateProjectile(p, dt);
    this.separateUnits();
    this.units = this.units.filter((u) => u.hp > 0);
    this.projectiles = this.projectiles.filter((p) => p.hp > 0);
    for (const effect of this.effects) effect.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.duration);
    for (const text of this.texts) { text.t += dt; text.y -= dt * 12; }
    this.texts = this.texts.filter((t) => t.t < t.duration);
  }
}
