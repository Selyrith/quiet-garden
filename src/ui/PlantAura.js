import { bakeTexture } from './BakeTexture.js';
import { DS } from './DesignSystem.js';

/**
 * Магия растений: ореол и искры.
 *
 * Идея: обычные растения — просто красивые, а редкие и выше «светятся».
 * Это единственный сигнал редкости, который виден с одного взгляда на сад
 * (в книге редкость видна по рамке, а на грядке — по свечению).
 *
 * Реализация намеренно дешёвая: одна общая текстура ореола (тинтуется цветом
 * редкости) + до трёх искр-звёзд на растение с медленными твинами. Никаких
 * шейдеров и постобработки — работает и в Canvas, и на слабых телефонах.
 */

export const AURA = {
  glow: 'fx-plant-glow',
  sparkle: 'fx-sparkle',
};

/** Цвета ореола по редкости. */
export const RARITY_AURA = {
  common: null,
  uncommon: 0xBFE3A8,
  rare: 0x9FD8FF,
  epic: 0xE5B7FF,
  legendary: 0xFFE27A,
};

/** Запекает текстуры ореола и искры (идемпотентно). */
export function bakeAuraTextures(scene) {
  // Ореол: три концентрических круга с падающей альфой — мягкое свечение
  // без размытия (blur на мобильных дорог).
  bakeTexture(scene, AURA.glow, 96, 96, (g) => {
    const c = 48;
    g.fillStyle(0xffffff, 0.10);
    g.fillCircle(c, c, 46);
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(c, c, 34);
    g.fillStyle(0xffffff, 0.22);
    g.fillCircle(c, c, 22);
    g.fillStyle(0xffffff, 0.30);
    g.fillCircle(c, c, 12);
  });

  // Искра: четырёхлучевая звезда.
  bakeTexture(scene, AURA.sparkle, 32, 32, (g) => {
    const c = 16;
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(c, 1, c - 3.2, c, c + 3.2, c);
    g.fillTriangle(c, 31, c - 3.2, c, c + 3.2, c);
    g.fillTriangle(1, c, c, c - 3.2, c, c + 3.2);
    g.fillTriangle(31, c, c, c - 3.2, c, c + 3.2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 3.4);
  });
}

/**
 * Создаёт ореол для грядки.
 *
 * В сцене грядка рисуется «плоско»: растения и тени — отдельные объекты с
 * абсолютными координатами (см. GameScene.createTile), поэтому ореол живёт
 * так же, а не внутри контейнера.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x центр грядки
 * @param {number} baseY низ растения (точка крепления)
 * @param {number} size размер грядки
 */
export function createPlantAura(scene, x, baseY, size) {
  const glowY = () => baseYRef - size * 0.35;

  let baseYRef = baseY;

  const glow = scene.add.image(x, glowY(), AURA.glow)
    .setDisplaySize(size * 1.55, size * 1.55)
    .setBlendMode('ADD')
    .setVisible(false)
    .setAlpha(0.75)
    .setDepth(7);

  const sparks = [];
  for (let i = 0; i < 3; i++) {
    const sp = scene.add.image(x, baseYRef - size * 0.45, AURA.sparkle)
      .setDisplaySize(6 + i * 2, 6 + i * 2)
      .setBlendMode('ADD')
      .setVisible(false)
      .setAlpha(0.9)
      .setDepth(9);
    sparks.push(sp);
  }

  let rarityId = null;

  return {
    glow,
    sparks,

    /** Переставить ореол (после ресайза/сдвига сетки). */
    setPosition(nextX, nextBaseY) {
      baseYRef = nextBaseY;
      glow.setPosition(nextX, baseYRef - size * 0.35);
      for (let i = 0; i < sparks.length; i++) {
        const a = (Math.PI * 2 / sparks.length) * i;
        sparks[i].setPosition(
          nextX + Math.cos(a) * size * (0.34 + i * 0.06),
          baseYRef - size * 0.35 + Math.sin(a) * size * (0.34 + i * 0.06),
        );
      }
    },

    /**
     * Настроить ореол под растение.
     * @param {string|null} nextRarityId редкость (common…legendary)
     * @param {number} stage стадия роста (-1…3)
     */
    apply(nextRarityId, stage) {
      const changed = nextRarityId !== rarityId;
      rarityId = nextRarityId;

      const tint = RARITY_AURA[rarityId] || null;
      // Магическое растение светится с кустика; обычное — никогда
      // (иначе сад превращается в новогоднюю гирлянду).
      const intense = stage >= 3;

      glow.setVisible(!!tint && stage >= 0);
      if (tint) {
        glow.setTint(tint);
        glow.setAlpha(intense ? 0.95 : 0.5);
        glow.setScale(intense ? 1.18 : 0.88);
      }

      for (let i = 0; i < sparks.length; i++) {
        const sp = sparks[i];
        const show = !!tint && intense;
        sp.setVisible(show);
        if (!show) {
          scene.tweens.killTweensOf(sp);
          continue;
        }
        sp.setTint(tint);
        if (changed) {
          scene.tweens.killTweensOf(sp);
          scene.tweens.add({
            targets: sp,
            alpha: { from: 0.25, to: 1 },
            scale: { from: 0.7, to: 1.3 },
            duration: 900 + i * 220,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          scene.tweens.add({
            targets: sp,
            angle: 360,
            duration: 5200 + i * 1400,
            repeat: -1,
            ease: 'Linear',
          });
        }
      }
    },

    /** Спрятать всё (грядка опустела). */
    hide() {
      rarityId = null;
      glow.setVisible(false);
      for (const sp of sparks) {
        sp.setVisible(false);
        scene.tweens.killTweensOf(sp);
      }
    },

    destroy() {
      for (const sp of sparks) scene.tweens.killTweensOf(sp);
      glow.destroy();
      for (const sp of sparks) sp.destroy();
    },
  };
}

/** Цвет редкости в виде числа — удобно для tint. */
export function rarityAuraColor(rarityId) {
  return RARITY_AURA[rarityId] || DS.colors.brand.secondary;
}