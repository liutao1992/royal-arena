import { writeFileSync } from 'node:fs';
import { RoyalGame } from '../src/game/engine.js';
import { CARDS } from '../src/game/data.js';
import { LEVELS } from '../src/game/levels.js';

const matchesPerLevel = Number(process.argv[2] || 10);
let seed = Number(process.argv[3] || 20261028);
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const results = [];
for (const level of LEVELS) {
  for (let match = 0; match < matchesPerLevel; match++) {
    const game = new RoyalGame();
    game.start(level.id);
    game.autoPlay.player = true;
    let steps = 0;
    while (game.status === 'playing' && steps < 11000) {
      game.update(0.025);
      steps++;
    }
    results.push({
      level: level.id,
      winner: game.winner,
      elapsed: Number(game.elapsed.toFixed(2)),
      crowns: game.crowns,
      cards: game.stats.player.cards + game.stats.enemy.cards,
      playerCards: game.stats.player.cards,
      enemyCards: game.stats.enemy.cards,
      playerDamage: Math.round(game.stats.player.damage),
      enemyDamage: Math.round(game.stats.enemy.damage),
      playerTowerDamage: Math.round(game.stats.player.towerDamage),
      enemyTowerDamage: Math.round(game.stats.enemy.towerDamage),
      wasted: Number((game.stats.player.elixirWasted + game.stats.enemy.elixirWasted).toFixed(1)),
      doubleElixir: game.doubleElixir,
      overtime: game.overtime,
      endReason: game.endReason,
      cardsById: Object.fromEntries(Object.keys(CARDS).map((id) => [id, (game.stats.player.cardsById[id] || 0) + (game.stats.enemy.cardsById[id] || 0)])),
    });
  }
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const summarize = (items) => ({
  matches: items.length,
  medianSeconds: Number(median(items.map((r) => r.elapsed)).toFixed(1)),
  averageSeconds: Number(average(items.map((r) => r.elapsed)).toFixed(1)),
  under45s: items.filter((r) => r.elapsed < 45).length,
  reachedDoubleElixir: items.filter((r) => r.doubleElixir).length,
  overtimes: items.filter((r) => r.overtime).length,
  draws: items.filter((r) => r.winner === 'draw').length,
  playerWins: items.filter((r) => r.winner === 'player').length,
  averageCards: Number(average(items.map((r) => r.cards)).toFixed(1)),
  averageWastedElixir: Number(average(items.map((r) => r.wasted)).toFixed(1)),
  averageCrowns: Number(average(items.map((r) => r.crowns.player + r.crowns.enemy)).toFixed(2)),
});
const summary = {
  overall: summarize(results),
  levels: Object.fromEntries(LEVELS.map((level) => [level.id, summarize(results.filter((r) => r.level === level.id))])),
  cardUsage: Object.fromEntries(Object.keys(CARDS).map((id) => [id, results.reduce((sum, result) => sum + result.cardsById[id], 0)])),
};
writeFileSync(new URL('../balance-report.json', import.meta.url), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
