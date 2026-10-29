import assert from 'node:assert/strict';
import { RoyalGame } from '../src/game/engine.js';
import { CARDS } from '../src/game/data.js';
import { visualAimPoint } from '../src/game/sprites.js';

const game = new RoyalGame();
game.start();
assert.equal(game.status, 'playing');
assert.equal(game.hands.player.length, 4);
assert.equal(game.queues.player.length, 4);
assert.equal(game.elixir.player, 5);

game.hands.player[0] = 'knight';
const before = game.elixir.player;
assert.equal(game.useCard('player', 0, 180, 320), false, 'river deployment must fail');
assert.equal(game.elixir.player, before);
assert.equal(game.useCard('player', 0, 82, 430), true, 'own-side deployment must succeed');
assert.ok(game.elixir.player < before - 2.9);
assert.equal(game.units.filter((u) => u.side === 'player').length, 1);
assert.equal(game.hands.player.length, 4);

game.hands.player[0] = 'fireball';
game.elixir.player = 10;
const enemy = game.spawnUnit('skeletons', 'enemy', 82, 180);
assert.equal(game.useCard('player', 0, 82, 180), true, 'spell can target enemy half');
for (let i = 0; i < 20; i++) game.update(.025);
assert.equal(enemy.hp, 0, 'fireball must damage units in radius');

const arrowGame = new RoyalGame();
arrowGame.start();
const archer = arrowGame.spawnUnit('archers', 'player', 82, 430);
const arrowTarget = arrowGame.spawnUnit('knight', 'enemy', 112, 320);
archer.deployLeft = 0;
archer.cooldown = 0;
archer.targetId = arrowTarget.id;
arrowGame.updateUnit(archer, 0.025);
const arrow = arrowGame.projectiles[0];
const archerOrigin = visualAimPoint(archer);
assert.equal(arrow.x, archerOrigin.x, 'arrow must start at the archer body');
assert.equal(arrow.y, archerOrigin.y, 'arrow must not start at the archer feet');
arrowTarget.x += 12;
const aimAfterMove = visualAimPoint(arrowTarget);
const expectedAngle = Math.atan2(aimAfterMove.y - arrow.y, aimAfterMove.x - arrow.x);
const distanceBefore = Math.hypot(aimAfterMove.x - arrow.x, aimAfterMove.y - arrow.y);
arrowGame.updateProjectile(arrow, 0.025);
assert.equal(arrow.angle, expectedAngle, 'arrow sprite must rotate toward its moving target');
assert.ok(arrow.speed >= 500, 'arrow flight must be fast enough to avoid a floating appearance');
assert.ok(Math.hypot(aimAfterMove.x - arrow.x, aimAfterMove.y - arrow.y) < distanceBefore, 'arrow must travel toward the target body');
for (let i = 0; i < 100 && arrow.hp > 0; i++) arrowGame.updateProjectile(arrow, 0.025);
const arrowImpact = arrowGame.effects.find((effect) => effect.type === 'arrowHit');
assert.deepEqual({ x: arrowImpact.x, y: arrowImpact.y }, visualAimPoint(arrowTarget), 'impact effect must land on the target body');
assert.equal(arrowImpact.angle, arrow.angle, 'the arrow impact must preserve its flight direction');
assert.equal(arrow.x, arrowImpact.x, 'arrow must reach the exact horizontal impact point');
assert.equal(arrow.y, arrowImpact.y, 'arrow must reach the exact vertical impact point');
assert.equal(arrowTarget.hp, CARDS.knight.hp - CARDS.archers.damage, 'arrow impact must still deal damage once');

const meleeGame = new RoyalGame();
meleeGame.start();
const meleeAttacker = meleeGame.spawnUnit('knight', 'player', 82, 430);
const meleeTarget = meleeGame.spawnUnit('knight', 'enemy', 82, 405);
meleeAttacker.deployLeft = 0;
meleeAttacker.cooldown = 0;
meleeAttacker.targetId = meleeTarget.id;
meleeGame.updateUnit(meleeAttacker, 0.025);
const slash = meleeGame.effects.find((effect) => effect.type === 'slash');
assert.deepEqual({ x: slash.x, y: slash.y }, visualAimPoint(meleeTarget), 'melee slash must land on the target body');
assert.ok(Number.isFinite(slash.angle), 'melee slash must have an attack direction');

const simulation = new RoyalGame();
simulation.start();
let playerThink = 0;
let steps = 0;
while (simulation.status === 'playing' && steps < 14000) {
  playerThink -= .025;
  if (playerThink <= 0) {
    playerThink = .8;
    const playable = simulation.hands.player.map((id, i) => ({ id, i })).filter((c) => CARDS[c.id].cost <= simulation.elixir.player);
    if (playable.length && simulation.elixir.player > 4) {
      const choice = playable[Math.floor(Math.random() * playable.length)];
      const x = Math.random() < .5 ? 82 : 278;
      simulation.useCard('player', choice.i, x, CARDS[choice.id].type === 'spell' ? 180 : 420);
    }
  }
  simulation.update(.025);
  steps++;
}
assert.equal(simulation.status, 'ended', 'full battle must reach a result');
assert.ok(simulation.elapsed > 0, 'battle timer must advance');
assert.ok(['player', 'enemy', 'draw'].includes(simulation.winner));
assert.ok(simulation.crowns.player >= 0 && simulation.crowns.player <= 3);
assert.ok(simulation.crowns.enemy >= 0 && simulation.crowns.enemy <= 3);
console.log(JSON.stringify({ result: 'PASS', simulatedSeconds: simulation.elapsed.toFixed(1), winner: simulation.winner, crowns: simulation.crowns, cardsPlayed: simulation.stats.player.cards + simulation.stats.enemy.cards, steps }, null, 2));
