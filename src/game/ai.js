import { CARDS, WORLD } from './data.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const otherSide = (side) => side === 'player' ? 'enemy' : 'player';
const laneOf = (x) => x < WORLD.width / 2 ? 0 : 1;
const progress = (unit, side) => side === 'enemy' ? unit.y : WORLD.height - unit.y;
const inOwnHalf = (unit, side) => side === 'enemy' ? unit.y < WORLD.riverTop : unit.y > WORLD.riverBottom;

export function createAIState(profile) {
  const [minReaction, maxReaction] = profile.reaction;
  return { timer: minReaction + Math.random() * (maxReaction - minReaction), pushLane: Math.random() < 0.5 ? 0 : 1, plan: '观察局势', lastCard: null, profile };
}

function deployment(side, cardId, lane, kind = 'attack', anchor = null) {
  const x = WORLD.bridges[lane];
  let y = side === 'enemy' ? 238 : 402;
  if (kind === 'defense' && anchor) {
    if (cardId === 'archers' || cardId === 'witch') y = side === 'enemy' ? anchor.y - 88 : anchor.y + 88;
    else if (cardId === 'prince') y = side === 'enemy' ? anchor.y - 58 : anchor.y + 58;
    else y = side === 'enemy' ? anchor.y - 24 : anchor.y + 24;
    y = clamp(y, side === 'enemy' ? 195 : 360, side === 'enemy' ? 280 : 455);
  }
  if (kind === 'support' && anchor) {
    y = inOwnHalf(anchor, side) ? (side === 'enemy' ? anchor.y - 58 : anchor.y + 58) : y;
    y = clamp(y, side === 'enemy' ? 205 : 365, side === 'enemy' ? 275 : 450);
  }
  return { x, y };
}

function chooseLane(game, side, state) {
  const opponent = otherSide(side);
  const scores = [0, 1].map((lane) => {
    const tower = game.towers.find((t) => t.side === opponent && t.kind === 'princess' && t.lane === lane);
    let score = tower ? (1 - tower.hp / tower.maxHp) * 150 : 70;
    for (const unit of game.units) {
      if (unit.hp <= 0 || laneOf(unit.x) !== lane) continue;
      const card = CARDS[unit.cardId];
      const power = (unit.hp / unit.maxHp) * (card.buildingOnly ? 25 : 12);
      if (unit.side === side && progress(unit, side) > 200) score += power;
      if (unit.side === opponent && inOwnHalf(unit, opponent)) score -= power;
    }
    if (state.pushLane === lane) score += state.profile.style === 'split' ? -24 : 5;
    return score;
  });
  return scores[1] > scores[0] ? 1 : 0;
}

function bestFireball(game, side, defensive) {
  const handIndex = game.hands[side].indexOf('fireball');
  if (handIndex < 0 || game.elixir[side] < CARDS.fireball.cost) return null;
  const opponent = otherSide(side);
  const candidates = game.units.filter((unit) => unit.side === opponent && unit.hp > 0);
  let best = null;
  for (const target of candidates) {
    if (game.pendingSpells.some((spell) => spell.side === side && distance(spell, target) < CARDS.fireball.radius)) continue;
    const card = CARDS[target.cardId];
    const aim = {
      x: clamp(target.x, 20, 340),
      y: clamp(target.y + (target.facing || 0) * target.speed * 0.24, 25, 620),
    };
    const hits = candidates.filter((unit) => distance(unit, aim) <= CARDS.fireball.radius + unit.radius);
    const effectiveDamage = hits.reduce((sum, unit) => sum + Math.min(unit.hp, CARDS.fireball.damage), 0);
    const resourceValue = hits.reduce((sum, unit) => sum + (unit.summoned ? 0 : CARDS[unit.cardId].cost / CARDS[unit.cardId].count), 0);
    const kills = hits.filter((unit) => !unit.summoned && unit.hp <= CARDS.fireball.damage).length;
    const tower = game.towers.find((t) => t.side === opponent && t.hp > 0 && distance(t, aim) <= CARDS.fireball.radius + t.radius);
    let score = effectiveDamage / 45 + resourceValue * 17 + kills * 14 + hits.length * 4;
    if (defensive) score += 24;
    if (tower) score += tower.hp <= CARDS.fireball.towerDamage ? 220 : 7;
    const worthwhile = resourceValue >= 2.8 || (hits.length >= 4 && effectiveDamage >= 600) || tower?.hp <= CARDS.fireball.towerDamage;
    if (worthwhile && (!best || score > best.score)) best = { handIndex, x: aim.x, y: aim.y, cardId: 'fireball', tactic: tower?.hp <= CARDS.fireball.towerDamage ? '法术斩杀' : defensive ? '法术解场' : '惩罚密集站位', score };
  }
  if (!best && !defensive) {
    const tower = game.towers.find((t) => t.side === opponent && t.hp > 0 && t.hp <= CARDS.fireball.towerDamage);
    if (tower) best = { handIndex, x: tower.x, y: tower.y, cardId: 'fireball', tactic: '法术斩杀', score: 220 };
  }
  return best && best.score >= (defensive ? 65 : 78) ? best : null;
}

function threatGroups(game, side) {
  const groups = [[], []];
  for (const unit of game.units) {
    if (unit.side === side || unit.hp <= 0) continue;
    const approaching = side === 'enemy' ? unit.y < WORLD.riverBottom + 38 : unit.y > WORLD.riverTop - 38;
    if (approaching) groups[laneOf(unit.x)].push(unit);
  }
  return groups.map((units, lane) => {
    const power = units.reduce((sum, unit) => {
      const card = CARDS[unit.cardId];
      return sum + unit.hp / 16 + card.damage / card.hitSpeed * 2.2 + (card.buildingOnly ? 85 : 0);
    }, 0);
    const depth = (unit) => side === 'enemy' ? WORLD.riverTop - unit.y : unit.y - WORLD.riverBottom;
    const lead = [...units].sort((a, b) => depth(b) - depth(a))[0];
    return { lane, units, lead, depth: lead ? depth(lead) : 0, power: power + (lead ? depth(lead) / 5 : 0) };
  }).filter((group) => group.units.length).sort((a, b) => b.power - a.power);
}

function defenseScore(cardId, group) {
  const units = group.units;
  const buildingCount = units.filter((unit) => CARDS[unit.cardId].buildingOnly).length;
  const swarm = units.filter((unit) => unit.cardId === 'skeletons').length / 6;
  const tanks = units.filter((unit) => unit.maxHp >= 1400).length;
  const ranged = units.filter((unit) => CARDS[unit.cardId].range >= 80).length;
  const splash = units.filter((unit) => CARDS[unit.cardId].splash).length;
  const scores = {
    skeletons: 22 + buildingCount * 95 + tanks * 35 - ranged * 30 - splash * 90 - swarm * 30,
    knight: 42 + ranged * 24 + buildingCount * 15 - swarm * 32,
    archers: 38 + swarm * 72 + tanks * 12 + buildingCount * 12 - splash * 10,
    witch: 42 + swarm * 115 + (units.length >= 4 ? 65 : 0) + tanks * 8,
    prince: 24 + buildingCount * 52 + tanks * 34 - swarm * 68,
    giant: -75,
    hog: -90,
  };
  return (scores[cardId] ?? -100) - CARDS[cardId].cost * 1.5;
}

function bestDefense(game, side, group) {
  const choices = game.hands[side].map((cardId, handIndex) => ({ cardId, handIndex }))
    .filter(({ cardId }) => CARDS[cardId].type === 'troop' && CARDS[cardId].cost <= game.elixir[side])
    .map((choice) => ({ ...choice, score: defenseScore(choice.cardId, group) }))
    .sort((a, b) => b.score - a.score);
  const best = choices[0];
  if (!best || (best.score < 0 && group.depth < 40)) return null;
  const point = deployment(side, best.cardId, group.lane, 'defense', group.lead);
  return { ...best, ...point, tactic: CARDS[best.cardId].buildingOnly ? '紧急拦截' : `${CARDS[best.cardId].name}克制防守` };
}

function bestCounterPush(game, side, state) {
  const attackers = game.units.filter((unit) => unit.side === side && unit.hp > unit.maxHp * 0.3 && !unit.summoned && unit.cardId !== 'skeletons' && progress(unit, side) > 125);
  if (!attackers.length) return null;
  const tank = attackers.sort((a, b) => {
    const aScore = (CARDS[a.cardId].buildingOnly ? 500 : 0) + a.hp + progress(a, side);
    const bScore = (CARDS[b.cardId].buildingOnly ? 500 : 0) + b.hp + progress(b, side);
    return bScore - aScore;
  })[0];
  const lane = laneOf(tank.x);
  const supportIds = tank.cardId === 'witch' ? ['archers'] : ['archers', 'witch'];
  const handIndex = game.hands[side].findIndex((id) => supportIds.includes(id) && CARDS[id].cost <= game.elixir[side]);
  if (handIndex < 0) return null;
  const cardId = game.hands[side][handIndex];
  const point = deployment(side, cardId, lane, 'support', tank);
  return { handIndex, cardId, ...point, tactic: `${CARDS[tank.cardId].name}掩护反击` };
}

function bestOpening(game, side, state) {
  const lane = chooseLane(game, side, state);
  state.pushLane = lane;
  const hand = game.hands[side];
  const elixir = game.elixir[side];
  const hasSupport = hand.some((id) => id === 'archers' || id === 'witch');
  const styleBonus = {
    raider: { hog: 45, giant: -12 }, swarm: { witch: 42, archers: 8 },
    spells: { witch: 12, archers: 12 }, counter: { giant: -10, hog: -8 },
    charge: { prince: 48 }, siege: { giant: 35, witch: 12 },
    master: { giant: 8, hog: 8, prince: 5 }, champion: { giant: 10, hog: 10, prince: 10, witch: 6 },
  }[state.profile.style] || {};
  const plans = [
    { id: 'giant', reserve: hasSupport ? 7.5 : 8.5, score: 92, tactic: '巨人蓄费推进' },
    { id: 'hog', reserve: 6.5, score: 80, tactic: '野猪弱侧突袭' },
    { id: 'prince', reserve: 7, score: 68, tactic: '王子冲锋施压' },
    { id: 'knight', reserve: hasSupport ? 8 : 9.2, score: 65, tactic: '骑士组织推进' },
    { id: 'witch', reserve: 9, score: 58, tactic: '女巫沉底累积兵力' },
    { id: 'archers', reserve: 9.2, score: 52, tactic: '远程沉底观察' },
    { id: 'skeletons', reserve: 9.8, score: 12, tactic: '圣水防溢出' },
  ].map((plan) => ({ ...plan, reserve: plan.reserve + state.profile.reserveBonus, score: plan.score + (styleBonus[plan.id] || 0) }));
  const options = plans.filter((plan) => hand.includes(plan.id) && (elixir >= plan.reserve || elixir >= 9.75) && CARDS[plan.id].cost <= elixir)
    .sort((a, b) => b.score - a.score);
  if (!options.length) return null;
  const plan = options[0];
  const point = deployment(side, plan.id, lane);
  return { handIndex: hand.indexOf(plan.id), cardId: plan.id, ...point, tactic: plan.tactic };
}

// The AI receives only public battlefield information plus its own hand and elixir.
export function decideAIAction(game, side, state) {
  const groups = threatGroups(game, side);
  const urgent = groups.length > 0;
  const fireball = bestFireball(game, side, urgent);
  if (fireball && fireball.score >= (urgent ? 65 : 95) + state.profile.spellCaution) return fireball;
  if (urgent) {
    const defense = bestDefense(game, side, groups[0]);
    if (defense) return defense;
    if (game.elixir[side] < 3) return null;
  }
  const opening = bestOpening(game, side, state);
  if (!urgent && opening?.cardId === 'giant') return opening;
  const savingGiant = game.hands[side].includes('giant') && !['raider', 'charge'].includes(state.profile.style);
  if (!urgent && savingGiant) return null;
  const counterPush = state.profile.counterPush ? bestCounterPush(game, side, state) : null;
  if (counterPush && (!urgent || game.elixir[side] >= 7)) return counterPush;
  if (urgent && game.elixir[side] < 8) return null;
  return opening;
}

export function getTacticalAdvice(game) {
  if (game.status === 'idle') return '先观察起手，沉底组织推进；不要一次花光圣水。';
  if (game.status === 'ended') return '查看战后复盘，下一场尝试保留克制牌。';
  const hand = game.hands.player;
  const elixir = game.elixir.player;
  const threats = game.units.filter((unit) => unit.side === 'enemy' && unit.y > WORLD.riverBottom - 20 && unit.hp > 0);
  const swarm = threats.filter((unit) => unit.cardId === 'skeletons');
  const building = threats.find((unit) => CARDS[unit.cardId].buildingOnly);
  if (swarm.length >= 3 && hand.includes('witch') && elixir >= 5) return '敌方人海逼近：女巫的范围魔法与召唤物能有效拖延。';
  if (building && hand.includes('skeletons') && elixir >= 3) return `${CARDS[building.cardId].name}只打建筑：用骷髅军团在己方半场围住它。`;
  if (building && hand.includes('prince') && elixir >= 5) return `用王子拦截${CARDS[building.cardId].name}，保留后排组织反击。`;
  if (threats.length && hand.includes('knight') && elixir >= 3) return '骑士适合在己方塔前吸收伤害，让皇家塔协助解场。';
  const tank = game.units.find((unit) => unit.side === 'player' && (CARDS[unit.cardId].buildingOnly || unit.cardId === 'knight') && unit.hp > unit.maxHp * 0.35);
  if (tank && hand.includes('archers') && elixir >= 3) return `${CARDS[tank.cardId].name}仍在场上：弓箭手跟进，组成防守反击。`;
  if (tank && hand.includes('witch') && elixir >= 5) return `${CARDS[tank.cardId].name}正在承伤：女巫跟进可清理拦截人海。`;
  const enemies = game.units.filter((unit) => unit.side === 'enemy' && unit.hp > 0);
  if (hand.includes('fireball') && elixir >= 4 && enemies.some((unit) => enemies.filter((other) => distance(unit, other) < 48).length >= 3)) return '敌方站位密集：火球命中多个高价值目标才划算。';
  if (elixir < 3) return '圣水不足：暂缓出牌，利用皇家塔防守并等待反击机会。';
  if (elixir >= 9) return '圣水即将溢出：在一路沉底部署，仍要保留解场费用。';
  return '不要两边平均用力；根据塔血和敌方兵力，集中突破较弱一路。';
}

export function getResultInsight(game) {
  const stats = game.stats.player;
  if (stats.elixirWasted >= 8) return `本场溢出约 ${Math.floor(stats.elixirWasted)} 点圣水。接近 10 点时先沉底部署，避免资源浪费。`;
  if (game.winner === 'enemy' && stats.towerDamage < 500) return '进攻未能持续：先用骑士或骷髅完成防守，再给存活前排补上远程。';
  if (game.winner === 'enemy' && game.crowns.enemy > game.crowns.player) return '试着保留骷髅军团针对攻城单位，不要把它单独送入敌方半场。';
  if (game.winner === 'player' && stats.elixirWasted < 3) return '圣水利用很稳健。继续通过防守积累兵力，再集中一路反击。';
  return '坦克在前、远程在后；火球等待密集目标，能明显提高每次出牌的价值。';
}
