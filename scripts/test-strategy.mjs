import assert from 'node:assert/strict';
import { RoyalGame } from '../src/game/engine.js';
import { CARDS, createTowers } from '../src/game/data.js';
import { LEVELS, getLevel, recordCampaignResult } from '../src/game/levels.js';
import { createAIState, decideAIAction } from '../src/game/ai.js';
import { visualAimPoint } from '../src/game/sprites.js';

assert.equal(LEVELS.length, 10);
assert.deepEqual(LEVELS.map((level) => level.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.equal(new Set(LEVELS.map((level) => level.style)).size, 10);
assert.ok(LEVELS[9].reaction[0] < LEVELS[0].reaction[0]);
assert.equal(getLevel(99).id, 1);
for (const tower of createTowers()) assert.ok(['king', 'princess'].includes(tower.kind), `${tower.id} must have a tower kind`);

const chargeGame = new RoyalGame();
chargeGame.start();
chargeGame.autoPlay.enemy = false;
const prince = chargeGame.spawnUnit('prince', 'player', 82, 400);
const knight = chargeGame.spawnUnit('knight', 'enemy', 82, 370);
prince.deployLeft = 0;
knight.deployLeft = 0;
prince.targetId = knight.id;
prince.cooldown = 0;
prince.charging = true;
prince.chargeTime = 2;
chargeGame.updateUnit(prince, 0.025);
assert.equal(knight.hp, CARDS.knight.hp - CARDS.prince.damage * 2, 'charging first hit must deal double damage');

for (const [name, towerId, expectedAngle] of [
  ['upward', 'enemy-left', -Math.PI / 2],
  ['left', 'enemy-left', Math.PI],
  ['right', 'enemy-right', 0],
]) {
  const hogGame = new RoyalGame();
  hogGame.start();
  const target = hogGame.towers.find((tower) => tower.id === towerId);
  const x = name === 'left' ? target.x + 20 : name === 'right' ? target.x - 20 : target.x;
  const y = target.y + (name === 'upward' ? 40 : 0);
  const hog = hogGame.spawnUnit('hog', 'player', x, y);
  if (name !== 'upward') hog.y += visualAimPoint(target).y - visualAimPoint(hog).y;
  hog.deployLeft = 0;
  hog.cooldown = 0;
  hogGame.updateUnit(hog, 0.025);
  assert.ok(Math.abs(hog.attackAngle - expectedAngle) < 1e-9, `hog rider must aim ${name} toward its target`);
  const origin = visualAimPoint(hog), aim = visualAimPoint(target);
  const visualAngle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
  assert.ok(Math.abs(hog.attackAngle - visualAngle) < 1e-9, 'lance direction must use visual body positions rather than ground positions');
}

const targetGame = new RoyalGame();
targetGame.start();
const archer = targetGame.spawnUnit('archers', 'player', 82, 400);
const original = targetGame.spawnUnit('knight', 'enemy', 70, 335);
const closer = targetGame.spawnUnit('hog', 'enemy', 85, 375);
archer.deployLeft = 0;
archer.targetId = original.id;
archer.retarget = 0;
targetGame.updateUnit(archer, 0.025);
assert.equal(archer.targetId, original.id, 'a visible unit target should remain sticky');

const defenseGame = new RoyalGame();
defenseGame.start(10);
defenseGame.autoPlay.enemy = false;
defenseGame.elixir.enemy = 10;
defenseGame.hands.enemy = ['witch', 'knight', 'archers', 'hog'];
for (let i = 0; i < 6; i++) defenseGame.spawnUnit('skeletons', 'player', 82 + (i % 3) * 6, 270 + Math.floor(i / 3) * 8);
const defense = decideAIAction(defenseGame, 'enemy', defenseGame.aiStates.enemy);
assert.equal(defense.cardId, 'witch', 'AI should answer a deep swarm with splash damage');
assert.ok(defense.y <= 290, 'enemy defense must be deployed in its own half');

const spellGame = new RoyalGame();
spellGame.start(4);
spellGame.autoPlay.enemy = false;
spellGame.elixir.enemy = 10;
spellGame.hands.enemy = ['fireball', 'knight', 'giant', 'hog'];
spellGame.spawnCardUnits(CARDS.archers, 'player', 82, 280);
const spell = decideAIAction(spellGame, 'enemy', spellGame.aiStates.enemy);
assert.equal(spell.cardId, 'fireball', 'AI should fireball two valuable ranged units');

const patienceGame = new RoyalGame();
patienceGame.start(2);
patienceGame.autoPlay.enemy = false;
patienceGame.elixir.enemy = 5;
patienceGame.hands.enemy = ['hog', 'knight', 'archers', 'witch'];
assert.equal(decideAIAction(patienceGame, 'enemy', patienceGame.aiStates.enemy), null, 'AI should save elixir for a planned attack');

const statsGame = new RoyalGame();
statsGame.start();
const rightTower = statsGame.towers.find((tower) => tower.id === 'player-right');
statsGame.damage(rightTower, 100, 'enemy');
assert.equal(statsGame.stats.enemy.towerDamage, 100);
assert.equal(statsGame.stats.enemy.laneDamage[1], 100);
assert.equal(statsGame.stats.enemy.laneDamage[0], 0);

const initialCampaign = { unlocked: 1, stars: {} };
const wonCampaign = recordCampaignResult(initialCampaign, { levelId: 1, winner: 'player', crowns: { player: 3 } });
assert.equal(wonCampaign.unlocked, 2, 'winning must unlock the next level');
assert.equal(wonCampaign.stars[1], 3);
const replayedCampaign = recordCampaignResult(wonCampaign, { levelId: 1, winner: 'player', crowns: { player: 1 } });
assert.equal(replayedCampaign.stars[1], 3, 'replays must preserve the best crown record');
const lostCampaign = recordCampaignResult(replayedCampaign, { levelId: 2, winner: 'enemy', crowns: { player: 0 } });
assert.equal(lostCampaign.unlocked, 2, 'a loss must not unlock another level');
const finalCampaign = recordCampaignResult({ unlocked: 10, stars: {} }, { levelId: 10, winner: 'player', crowns: { player: 3 } });
assert.equal(finalCampaign.unlocked, 10, 'campaign unlock must be capped at level ten');

console.log(JSON.stringify({ result: 'PASS', levels: 10, checks: ['level configuration', 'tower types', 'charge damage', 'sticky targeting', 'deep swarm defense', 'valuable fireball', 'elixir planning', 'lane damage stats', 'campaign unlocks and best crowns'] }, null, 2));
