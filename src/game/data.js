export const WORLD = { width: 360, height: 640, riverTop: 305, riverBottom: 345, bridges: [82, 278] };

export const CARDS = {
  knight: {
    id: 'knight', name: '骑士', rarity: '普通', cost: 3, type: 'troop', role: '坚韧近战',
    description: '生命值较高，擅长阻挡敌军并保护后排。', hp: 1450, damage: 167, hitSpeed: 1.1,
    speed: 40, range: 19, sight: 105, radius: 12, count: 1, color: '#e7b44c', level: 9,
  },
  archers: {
    id: 'archers', name: '弓箭手', rarity: '普通', cost: 3, type: 'troop', role: '双人远程',
    description: '两名射手从远处齐射，适合在坦克身后输出。', hp: 265, damage: 91, hitSpeed: 0.9,
    speed: 43, range: 112, sight: 135, radius: 8, count: 2, color: '#ec74aa', level: 9, projectile: 'arrow',
  },
  giant: {
    id: 'giant', name: '巨人', rarity: '稀有', cost: 5, type: 'troop', role: '攻城坦克',
    description: '只攻击建筑，用庞大身躯为友军吸收伤害。', hp: 3275, damage: 211, hitSpeed: 1.5,
    speed: 29, range: 22, sight: 90, radius: 16, count: 1, color: '#dc9b63', level: 9, buildingOnly: true,
  },
  fireball: {
    id: 'fireball', name: '火球', rarity: '稀有', cost: 4, type: 'spell', role: '范围法术',
    description: '对范围内敌军造成高额伤害，对皇家塔伤害较低。', damage: 650, towerDamage: 230,
    radius: 52, color: '#ff7a38', level: 9,
  },
  skeletons: {
    id: 'skeletons', name: '骷髅军团', rarity: '史诗', cost: 3, type: 'troop', role: '人海围攻',
    description: '召唤十二只小骷髅，迅速包围高伤害单体敌人。', hp: 81, damage: 81, hitSpeed: 1,
    speed: 55, range: 13, sight: 85, radius: 5.5, count: 12, color: '#c9b8ec', level: 9,
  },
  prince: {
    id: 'prince', name: '王子', rarity: '史诗', cost: 5, type: 'troop', role: '冲锋突袭',
    description: '持续移动后发起冲锋，首次攻击造成双倍伤害。', hp: 1610, damage: 260, hitSpeed: 1.4,
    speed: 49, range: 21, sight: 105, radius: 13, count: 1, color: '#aa8fd8', level: 9, charge: true,
  },
  witch: {
    id: 'witch', name: '女巫', rarity: '史诗', cost: 5, type: 'troop', role: '召唤法师',
    description: '发射范围魔法，并周期性召唤骷髅助战。', hp: 720, damage: 128, hitSpeed: 1.1,
    speed: 40, range: 105, sight: 130, radius: 10, count: 1, color: '#8b69ce', level: 9,
    projectile: 'magic', splash: 25, summon: true,
  },
  hog: {
    id: 'hog', name: '野猪骑士', rarity: '稀有', cost: 4, type: 'troop', role: '快速攻城',
    description: '跳过河道直扑建筑，移动迅速但会忽略部队。', hp: 1450, damage: 264, hitSpeed: 1.6,
    speed: 67, range: 20, sight: 90, radius: 12, count: 1, color: '#d57d55', level: 9, buildingOnly: true,
  },
};

export const DECK = ['knight', 'archers', 'giant', 'fireball', 'skeletons', 'prince', 'witch', 'hog'];

export const RARITY_COLORS = {
  普通: '#79b9d4', 稀有: '#e9a54b', 史诗: '#b377db',
};

export function createTowers() {
  return [
    { id: 'enemy-king', side: 'enemy', kind: 'king', x: 180, y: 58, radius: 30, hp: 6000, maxHp: 6000, range: 155, damage: 109, hitSpeed: 1, cooldown: 0, active: false, level: 9 },
    { id: 'enemy-left', side: 'enemy', kind: 'princess', lane: 0, x: 82, y: 151, radius: 24, hp: 3800, maxHp: 3800, range: 145, damage: 90, hitSpeed: 0.8, cooldown: 0, active: true, level: 9 },
    { id: 'enemy-right', side: 'enemy', kind: 'princess', lane: 1, x: 278, y: 151, radius: 24, hp: 3800, maxHp: 3800, range: 145, damage: 90, hitSpeed: 0.8, cooldown: 0, active: true, level: 9 },
    { id: 'player-left', side: 'player', kind: 'princess', lane: 0, x: 82, y: 489, radius: 24, hp: 3800, maxHp: 3800, range: 145, damage: 90, hitSpeed: 0.8, cooldown: 0, active: true, level: 9 },
    { id: 'player-right', side: 'player', kind: 'princess', lane: 1, x: 278, y: 489, radius: 24, hp: 3800, maxHp: 3800, range: 145, damage: 90, hitSpeed: 0.8, cooldown: 0, active: true, level: 9 },
    { id: 'player-king', side: 'player', kind: 'king', x: 180, y: 582, radius: 30, hp: 6000, maxHp: 6000, range: 155, damage: 109, hitSpeed: 1, cooldown: 0, active: false, level: 9 },
  ];
}
