export const LEVELS = [
  {
    id: 1, name: '绿茵试炼', opponent: '见习骑士', title: '基础攻防', style: 'balanced', reaction: [1.3, 1.75], reserveBonus: 1.2, counterPush: false, spellCaution: 30,
    briefing: '对手会组织基础推进。练习在皇家塔前防守，不要一次花光圣水。', lesson: '骑士承伤，弓箭手输出',
  },
  {
    id: 2, name: '疾风渡口', opponent: '渡口斥候', title: '攻城拦截', style: 'raider', reaction: [1.2, 1.6], reserveBonus: 0.9, counterPush: false, spellCaution: 25,
    briefing: '野猪骑士会突击较弱一路。留住骷髅军团，等它过河后再包围。', lesson: '识别攻城单位并留费',
  },
  {
    id: 3, name: '骷髅荒原', opponent: '荒原术士', title: '范围克制', style: 'swarm', reaction: [1.1, 1.5], reserveBonus: 0.7, counterPush: true, spellCaution: 20,
    briefing: '女巫与人海会持续累积兵力。用女巫或火球处理集群，避免单体硬扛。', lesson: '范围伤害克制人海',
  },
  {
    id: 4, name: '烈焰高地', opponent: '烈焰法师', title: '站位博弈', style: 'spells', reaction: [1.0, 1.4], reserveBonus: 0.5, counterPush: true, spellCaution: 5,
    briefing: '对手会惩罚密集后排。分散投入兵力，并用火球反制它的推进组合。', lesson: '避免高价值部队扎堆',
  },
  {
    id: 5, name: '铁壁堡垒', opponent: '堡垒守卫', title: '防守反击', style: 'counter', reaction: [0.95, 1.3], reserveBonus: 0.5, counterPush: true, spellCaution: 10,
    briefing: '对手擅长蓄费防守，再利用存活部队反击。换路施压，别持续送入重兵。', lesson: '识别防线强弱并换路',
  },
  {
    id: 6, name: '雷霆长桥', opponent: '雷霆公爵', title: '冲锋破解', style: 'charge', reaction: [0.85, 1.2], reserveBonus: 0.2, counterPush: true, spellCaution: 5,
    briefing: '王子的冲锋首击伤害极高。用低费部队打断节奏，再集中火力解场。', lesson: '人海克制高伤单体',
  },
  {
    id: 7, name: '双线迷阵', opponent: '双子将军', title: '分路调度', style: 'split', reaction: [0.8, 1.1], reserveBonus: 0.1, counterPush: true, spellCaution: 0,
    briefing: '对手会交替向两路施压。判断主攻方向，不要为每个小单位付出过多圣水。', lesson: '塔可以分担防守压力',
  },
  {
    id: 8, name: '巨影王庭', opponent: '王庭统帅', title: '组合推进', style: 'siege', reaction: [0.72, 1.0], reserveBonus: 0, counterPush: true, spellCaution: 0,
    briefing: '巨人会掩护女巫与弓箭手推进。先切后排，或用人海快速围住巨人。', lesson: '拆解坦克与后排组合',
  },
  {
    id: 9, name: '宗师回廊', opponent: '竞技场宗师', title: '资源博弈', style: 'master', reaction: [0.65, 0.9], reserveBonus: 0, counterPush: true, spellCaution: -5,
    briefing: '对手会计算解场价值、组织反击并攻击残血塔。每次出牌都要考虑后续费用。', lesson: '用更低成本完成防守',
  },
  {
    id: 10, name: '皇冠之巅', opponent: '皇家冠军', title: '终极决战', style: 'champion', reaction: [0.55, 0.8], reserveBonus: 0, counterPush: true, spellCaution: -10,
    briefing: '冠军掌握全部战术，会在双倍圣水加强攻势。保持冷静，用克制与反击夺取皇冠。', lesson: '综合运用全部战术',
  },
];

export const getLevel = (id) => LEVELS.find((level) => level.id === Number(id)) || LEVELS[0];

export function loadCampaign() {
  try {
    const saved = JSON.parse(localStorage.getItem('royal-arena-campaign') || '{}');
    return { unlocked: Math.max(1, Math.min(10, Number(saved.unlocked) || 1)), stars: saved.stars || {} };
  } catch {
    return { unlocked: 1, stars: {} };
  }
}

export function recordCampaignResult(campaign, game) {
  const earned = game.winner === 'player' ? game.crowns.player : 0;
  return {
    unlocked: game.winner === 'player' ? Math.min(10, Math.max(campaign.unlocked, game.levelId + 1)) : campaign.unlocked,
    stars: { ...campaign.stars, [game.levelId]: Math.max(campaign.stars[game.levelId] || 0, earned) },
  };
}

export function saveCampaign(campaign) {
  try { localStorage.setItem('royal-arena-campaign', JSON.stringify(campaign)); } catch { /* Storage may be disabled. */ }
}
