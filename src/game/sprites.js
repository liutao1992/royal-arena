const UNIT_TYPES = {
  knight: 'warrior', giant: 'warrior', archers: 'archer',
  skeletons: 'pawn', prince: 'lancer', hog: 'lancer', witch: 'monk',
};

const ANIMATIONS = {
  warrior: { frame: 192, idle: 8, run: 6, attack: 4, height: 46, fps: 9 },
  archer: { frame: 192, idle: 6, run: 4, attack: 8, height: 43, fps: 10 },
  lancer: { frame: 320, idle: 12, run: 6, attack: 3, height: 63, fps: 10 },
  monk: { frame: 192, idle: 6, run: 4, attack: 11, height: 45, fps: 10 },
  pawn: { frame: 192, idle: 8, run: 6, attack: 4, height: 34, fps: 10 },
};

// Keep every battle unit on the same animated Tiny Swords set.
const LUX_UNITS = {};
const CARD_SCALE = { giant: 1.28, hog: .9, skeletons: .88 };
const sideName = (side) => side === 'player' ? 'blue' : 'red';

function unitHeight(cardId) {
  if (LUX_UNITS[cardId]) return LUX_UNITS[cardId].height;
  const config = ANIMATIONS[UNIT_TYPES[cardId]];
  return config ? config.height * 2.2 * (CARD_SCALE[cardId] || 1) : 0;
}

export function visualAimPoint(entity) {
  if (entity.kind) return { x: entity.x, y: entity.y - (entity.kind === 'king' ? 12 : 18) };
  const height = unitHeight(entity.cardId);
  if (!height) return { x: entity.x, y: entity.y - 6 };
  return { x: entity.x, y: entity.y + (entity.radius || 0) * .7 + 4 - height * .52 };
}

export class TinySwords {
  constructor() {
    this.images = new Map();
    for (const side of ['blue', 'red']) {
      for (const type of Object.keys(ANIMATIONS)) {
        for (const action of ['idle', 'run', 'attack']) this.load(`tiny-swords/${side}/${type}-${action}.png`);
      }
      this.load(`tiny-swords/${side}/tower.png`);
      this.load(`tiny-swords/${side}/castle.png`);
      for (const cardId of Object.keys(LUX_UNITS)) {
        for (const action of ['idle', 'run', 'attack']) this.load(`lux3d/${side}/${cardId}-${action}.png`);
      }
      this.load(`lux3d/${side}/tower.png`);
      this.load(`lux3d/${side}/castle.png`);
      for (const kind of ['tower', 'castle']) {
        this.load(`lux3d/${side}/${kind}-base.png`);
        this.load(`lux3d/${side}/${kind}-person.png`);
      }
      this.load(`lux3d/${side}/castle-cannon.png`);
    }
    this.load('tiny-swords/blue/arrow.png');
    this.load('tiny-swords/explosion.png');
    this.load('lux3d/arena.png');
  }

  load(path) {
    const image = new Image();
    image.src = `/assets/${path}`;
    this.images.set(path, image);
  }

  ready(path) {
    const image = this.images.get(path);
    return image?.complete && image.naturalWidth ? image : null;
  }

  unit(cardId, side, action) {
    const lux = LUX_UNITS[cardId];
    if (lux) {
      const image = this.ready(`lux3d/${sideName(side)}/${cardId}-${action}.png`);
      if (image) return { image, frameWidth: lux.frame, frameHeight: lux.frame, frames: lux[action], height: lux.height, fps: lux.fps, smooth: true };
    }
    const type = UNIT_TYPES[cardId];
    if (!type) return null;
    const config = ANIMATIONS[type];
    const frames = config[action] || config.idle;
    const image = this.ready(`tiny-swords/${sideName(side)}/${type}-${action}.png`);
    if (!image) return null;
    return { image, frameWidth: config.frame, frameHeight: config.frame, frames, height: config.height * 2.2 * (CARD_SCALE[cardId] || 1), fps: config.fps, smooth: false };
  }

  luxBuilding(side, kind) {
    return this.ready(`lux3d/${sideName(side)}/${kind === 'king' ? 'castle' : 'tower'}.png`);
  }

  luxBuildingPart(side, kind, part) {
    return this.ready(`lux3d/${sideName(side)}/${kind === 'king' ? 'castle' : 'tower'}-${part}.png`);
  }

  building(side, kind) {
    return this.ready(`tiny-swords/${sideName(side)}/${kind === 'king' ? 'castle' : 'tower'}.png`);
  }

  arena() {
    return this.ready('lux3d/arena.png');
  }

  effect(name) {
    return this.ready(`tiny-swords/${name}`);
  }
}
