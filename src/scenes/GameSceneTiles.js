import { getPlant } from '../../shared/plants.js';
import { plantTileColor } from '../../shared/sprite-renderer.js';

const STAGE_SCALES = [0.4, 0.65, 0.85, 1.05];

function getScaleForStageProgress(stage, progress) {
  if (stage < 0) return 0;
  if (stage >= 3) return STAGE_SCALES[3];
  const p = Math.max(0, Math.min(1, progress));
  const current = STAGE_SCALES[stage];
  const next = STAGE_SCALES[stage + 1];
  return current + (next - current) * p;
}

export const GameSceneTiles = {
  tickTiles(delta) {
    const lerp = 1 - Math.pow(0.001, delta / 1000); 
    for (const [, tile] of this.tiles) {
      if (tile.plantImage && tile.stage >= 0) {
        if (tile.targetScale && Math.abs(tile.currentScale - tile.targetScale) > 0.001) {
          tile.currentScale += (tile.targetScale - tile.currentScale) * lerp;
          tile.plantImage.setScale(tile.currentScale);
        }
        if (tile.shadowImage && tile.targetShadowScale && Math.abs(tile.currentShadowScale - tile.targetShadowScale) > 0.01) {
          tile.currentShadowScale += (tile.targetShadowScale - tile.currentShadowScale) * lerp;
          tile.shadowImage.setScale(tile.currentShadowScale);
        }
      }
    }
  },

  updateTile(key, stage, progress = 0, seed = null, instant = false, mutationIndex = null) {
    const tile = this.tiles.get(key);
    if (!tile) return;

    if (tile.stage !== stage && stage !== -1 && !instant) {
      progress = 0; 
    }

    const prevStage = tile.stage;
    const prevSeed = tile.seed;
    tile.stage = stage;
    tile.progress = progress;
    tile.seed = seed;
    tile.mutationIndex = mutationIndex ?? null;

    // Client-side garden cache (used by Phase 5 passive-care feedback tracking).
    if (this.gardenCache) {
      this.gardenCache.set(key, {
        stage, progress, seed, mutationIndex: tile.mutationIndex,
        maturedAt: stage === 3 && prevStage !== 3 ? Date.now() : undefined
      });
    }

    if (tile.grassGfx) tile.grassGfx.setVisible(stage === -1);
    if (tile.decorSprite) tile.decorSprite.setVisible(stage === -1);

    if (tile.rect) {
      if (stage === 3 && seed !== null) {
        const plant = getPlant(seed);
        tile.rect.setStrokeStyle(2, plantTileColor(plant), 0.6);
      } else {
        // Тёплая коричневая рамка (cozy palette)
        tile.rect.setStrokeStyle(2, 0x5d4037);
      }
    }

    // Тень теперь создается один раз в createTile() как Image (shadowImage)
    if (tile.shadowImage) {
      if (stage >= 0) {
        tile.shadowImage.setVisible(true);
        tile.shadowImage.setPosition(tile.rect.x, tile.rect.y + this.tileSize * 0.35);
        const sp = stage === 3 ? 1 : (stage + progress) / 3;
        tile.targetShadowScale = Math.max(0.1, sp);
        if (instant) {
          tile.currentShadowScale = tile.targetShadowScale;
          tile.shadowImage.setScale(tile.currentShadowScale);
        }
      } else {
        tile.shadowImage.setVisible(false);
      }
    }

    if (tile.plantImage) {
      // Видимость: показываем только когда посажено (stage >= 0)
      tile.plantImage.setVisible(stage >= 0);
      
      if (prevStage !== stage || prevSeed !== seed || instant) {
        // Вместо отрисовки через Graphics просто меняем текстуру
        if (stage >= 0 && seed !== null) {
          tile.plantImage.setTexture('plant_' + seed);
          tile.plantImage.setVisible(true);
        } else {
          tile.plantImage.setVisible(false);
        }
      }

      if (stage >= 0 && seed !== null) {
        const plant = getPlant(seed);
        let rarityMult = 1.0;
        if (plant.rarity.id === 'uncommon') rarityMult = 1.1;
        if (plant.rarity.id === 'rare') rarityMult = 1.2;
        if (plant.rarity.id === 'epic') rarityMult = 1.3;
        if (plant.rarity.id === 'legendary') rarityMult = 1.45;

        const baseScale = (this.tileSize / 64) * rarityMult; // 64x64 текстура -> 42/64 = 0.65 базовый масштаб
        const stageFactor = getScaleForStageProgress(stage, progress);
        tile.targetScale = baseScale * stageFactor;

        if (instant) {
          tile.currentScale = tile.targetScale;
          tile.plantImage.setScale(tile.currentScale);
        } else if (prevStage === -1) {
          // Посадили новое растение — плавно растим от нуля (лиerp в tickTiles доделает)
          tile.currentScale = tile.targetScale * 0.15;
          tile.plantImage.setScale(tile.currentScale);
          // Гелиотропный импульс при посадке
          this.tweens.add({
            targets: tile.plantImage,
            scale: { from: tile.currentScale * 0.7, to: tile.currentScale * 1.15 },
            duration: 200,
            yoyo: true, ease: 'Sine.easeOut',
            onComplete: () => {
              tile.plantImage.setScale(tile.currentScale);
            }
          });
        } else if (prevStage !== stage && prevStage >= 0) {
          // Растение переросло на новую стадию — мягкий импульс роста
          this.tweens.add({
            targets: tile.plantImage,
            scale: { from: tile.currentScale * 0.92, to: tile.currentScale * 1.08 },
            duration: 300,
            yoyo: true, ease: 'Sine.easeOut',
            onComplete: () => {
              tile.plantImage.setScale(tile.currentScale);
            }
          });
        }

        if (stage === 3 && !tile.swayTween && !instant) {
          tile.swayTween = this.tweens.add({
            targets: tile.plantImage,
            angle: { from: -3, to: 3 },
            duration: 2000 + Math.random() * 1000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
        } else if (stage < 3 && tile.swayTween) {
          tile.swayTween.stop();
          tile.swayTween = null;
          tile.plantImage.angle = 0;
        }
      } else {
        tile.plantImage.setScale(1);
        tile.plantImage.angle = 0;
        if (tile.swayTween) { tile.swayTween.stop(); tile.swayTween = null; }
      }
    }

    if (tile.barBg && tile.bar) {
      const showBar = stage >= 0 && stage < 3;
      tile.barBg.setVisible(showBar);
      tile.bar.setVisible(showBar);
      if (showBar) {
        const barW = this.tileSize - 12;
        tile.bar.width = barW * Math.max(0, Math.min(1, progress));
      }
    }

    if (!instant && stage === 3 && prevStage !== 3) {
      if (tile.bloomFX) { try { tile.bloomFX.destroy(); } catch {} tile.bloomFX = null; }
      const bloomY = tile.rect.y + this.tileSize * 0.35 - (50 * (this.tileSize / 45));
      const ring = this.add.circle(tile.rect.x, bloomY, this.tileSize * 0.35, 0xffd54f, 0.7).setDepth(6);
      tile.bloomFX = ring;
      this.tweens.add({
        targets: ring, scale: { from: 1, to: 2.5 }, alpha: 0, duration: 600, ease: 'Cubic.easeOut',
        onComplete: () => { if (tile.bloomFX === ring) tile.bloomFX = null; ring.destroy(); }
      });
    }
    if (stage !== 3 && tile.bloomFX) { try { tile.bloomFX.destroy(); } catch {} tile.bloomFX = null; }

    // Ready badge: пульсирующий кружок над созревшим растением + мягкое свечение/искры
    if (stage === 3 && !tile.readyBadge) {
      const badge = this.add.circle(tile.rect.x, tile.rect.y - 30, 6, 0xffd54f, 1).setDepth(10).setStrokeStyle(1.5, 0xffffff);
      this.tweens.add({ targets: badge, scale: { from: 0.8, to: 1.2 }, duration: 800, yoyo: true, repeat: -1 });
      tile.readyBadge = badge;

      // Мягкое свечение грядки (ADD blend, без тяжёлых шейдеров)
      const glow = this.add.circle(tile.rect.x, tile.rect.y + this.tileSize * 0.1, this.tileSize * 0.32, 0xfff3b0, 0.35)
        .setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
      tile.readyGlow = glow;
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.18, to: 0.5 },
        scale: { from: 0.9, to: 1.15 },
        duration: 1200 + Math.random() * 600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      // Лёгкие партиклы «искры» над спелым растением (редкие, чтобы не шумно)
      if (this.time && this.add && this.add.particles && this.textures.exists('spark_particle')) {
        try {
          const sparkle = this.add.particles(tile.rect.x, tile.rect.y - 8, 'spark_particle', {
            speed: { min: 6, max: 16 },
            scale: { start: 0.25, end: 0 },
            lifespan: 900,
            frequency: 900,
            quantity: 1,
            blendMode: 'ADD',
            tint: [0xfff3b0, 0xffffff, 0xffd54f]
          }).setDepth(9);
          tile.readySparkle = sparkle;
        } catch {}
      }
    } else if (stage < 3 && tile.readyBadge) {
      this.tweens.killTweensOf(tile.readyBadge);
      tile.readyBadge.destroy();
      tile.readyBadge = null;
      if (tile.readyGlow) {
        this.tweens.killTweensOf(tile.readyGlow);
        tile.readyGlow.destroy();
        tile.readyGlow = null;
      }
      if (tile.readySparkle) {
        try { tile.readySparkle.destroy(); } catch {}
        tile.readySparkle = null;
      }
    }
  },

  setProgress(key, progress) {
    const tile = this.tiles.get(key);
    if (!tile || tile.stage < 0 || tile.stage >= 3 || tile.seed === null) return;
    tile.progress = progress;

    if (tile.bar && tile.stage >= 0 && tile.stage < 3) {
      const barW = this.tileSize - 12;
      tile.bar.width = barW * Math.max(0, Math.min(1, progress));
    }

    if (tile.plantImage) {
      const plant = getPlant(tile.seed);
      let rarityMult = 1.0;
      if (plant.rarity.id === 'uncommon') rarityMult = 1.1;
      if (plant.rarity.id === 'rare') rarityMult = 1.2;
      if (plant.rarity.id === 'epic') rarityMult = 1.3;
      if (plant.rarity.id === 'legendary') rarityMult = 1.45;

      const baseScale = (this.tileSize / 64) * rarityMult; // 64x64 текстура
      const stageFactor = getScaleForStageProgress(tile.stage, progress);
      tile.targetScale = baseScale * stageFactor;

      if (tile.shadowImage) {
        tile.targetShadowScale = Math.max(0.1, (tile.stage + progress) / 3);
      }
    }
  },

  refreshWetVisuals() {
    const now = Date.now();
    for (const [, tile] of this.tiles) {
      if (!tile.wetOverlay) continue;
      const isWet = tile.wetUntil > now;
      if (isWet && !tile.wetOverlay.visible) {
        if (tile.wetTween) tile.wetTween.stop();
        tile.wetOverlay.setVisible(true).setAlpha(0);
        tile.wetTween = this.tweens.add({ targets: tile.wetOverlay, alpha: 1, duration: 200, onComplete: () => { tile.wetTween = null; } });
      } else if (!isWet && tile.wetOverlay.visible && tile.wetOverlay.alpha > 0) {
        if (tile.wetTween) tile.wetTween.stop();
        tile.wetTween = this.tweens.add({
          targets: tile.wetOverlay, alpha: 0, duration: 400,
          onComplete: () => { tile.wetTween = null; if (tile.wetUntil <= Date.now()) tile.wetOverlay.setVisible(false); }
        });
      }
    }
  },

  markTileWet(key, duration) {
    const tile = this.tiles.get(key);
    if (!tile) return;
    tile.wetUntil = Date.now() + duration;
  },

  flashTile(key, color = 0xffffff) {
    const tile = this.tiles.get(key);
    if (!tile || !tile.rect) return;
    const flash = this.add.rectangle(tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height, color, 0.45).setDepth(6);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
  },

  spawnParticles(key, color = 0xffffff) {
    const tile = this.tiles.get(key);
    if (!tile || !tile.rect) return;
    
    // Используем партикл эмиттер вместо создания объектов (оптимизация для мобилок)
    if (this.sparkEmitter) {
      this.sparkEmitter.particleTint = color;
      this.sparkEmitter.emitParticleAt(tile.rect.x, tile.rect.y, 8);
    }
  },

  spawnCoinPopup(key, amount) {
    const tile = this.tiles.get(key);
    if (!tile || !tile.rect) return;
    const text = this.add.text(tile.rect.x, tile.rect.y - this.tileSize * 0.3, `+${amount}`, {
      fontSize: '18px', color: '#ffd54f', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(250);
    this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
  }
};