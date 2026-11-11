import { ACTIVITY_TYPES } from '../../shared/activities.js';

/**
 * Управляет отображением активностей на поле.
 */
export class ActivityLayer {
  constructor(scene, tileSize, tiles) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.tiles = tiles;
    this.sprites = new Map();
  }

  add(activity) {
    const cfg = ACTIVITY_TYPES[activity.type];
    if (!cfg) return;
    const tile = this.tiles.get(`${activity.tileX},${activity.tileY}`);
    if (!tile) return;

    if (this.sprites.has(activity.id)) {
      const old = this.sprites.get(activity.id);
      this.scene.tweens.killTweensOf(old.container);
      if (old.container) old.container.destroy();
      this.sprites.delete(activity.id);
    }

    const container = this.scene.add
      .container(tile.rect.x, tile.rect.y - this.tileSize * 0.35)
      .setDepth(60);

    const bg = this.scene.add.circle(0, 0, this.tileSize * 0.26, 0x000000, 0.55);
    const icon = this.scene.add
      .text(0, 0, cfg.emoji, { fontSize: `${Math.floor(this.tileSize * 0.34)}px` })
      .setOrigin(0.5);
    container.add([bg, icon]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      if (this.scene && typeof this.scene.handleTileTap === 'function') {
        this.scene.handleTileTap(activity.tileX, activity.tileY);
      }
    });

    this.scene.tweens.add({
      targets: container,
      scale: 1.18,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.sprites.set(activity.id, {
      container,
      tileKey: `${activity.tileX},${activity.tileY}`
    });
  }

  remove(id) {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    this.scene.tweens.killTweensOf(sprite.container);
    this.scene.tweens.add({
      targets: sprite.container,
      alpha: 0,
      scale: 0.4,
      duration: 280,
      onComplete: () => { if (sprite.container) sprite.container.destroy(); }
    });
    this.sprites.delete(id);
  }

  findByTile(tileKey) {
    for (const [id, sprite] of this.sprites) {
      if (sprite.tileKey === tileKey) return id;
    }
    return null;
  }

  clear() {
    for (const [, sprite] of this.sprites) {
      this.scene.tweens.killTweensOf(sprite.container);
      if (sprite.container) sprite.container.destroy();
    }
    this.sprites.clear();
  }

  get count() {
    return this.sprites.size;
  }
}
