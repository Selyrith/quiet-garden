import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant, drawOutlinedPlant } from './PixelArt.js';
import { MutationsOverlay } from './MutationsOverlay.js';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createButton,
  createPill,
  createScrollArea,
  sectionHeader,
  color,
} from './ui-kit.js';

/**
 * Карточка растения — «страница гербария».
 *
 * Было: панель с крестиком, у которого подпись стояла на 12px ниже центра
 * тач-зоны, и кнопкой из трёх отдельных объектов разной глубины. Описание,
 * среда обитания и легенда шли сплошным текстом без иерархии.
 *
 * Стало: скелет кита, «гербарный лист» с образцом растения, печатью
 * редкости, сроками и ценой в двух чипах, и три аккуратные секции текста.
 */
export class PlantDetailOverlay extends Phaser.GameObjects.Container {
  constructor(scene, seed, collection) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.detail);
    this.scene = scene;
    this.seed = seed;
    this.collection = collection;
    this._destroyed = false;

    const plant = getPlant(seed);
    const unlocked = collection.has(seed);
    this.plant = plant;
    this.unlocked = unlocked;

    let mutCount = 0;
    if (unlocked) {
      for (const id of collection) {
        if (typeof id === 'string' && id.startsWith(`mut_${seed}_`)) mutCount++;
      }
    }
    this.mutCount = mutCount;

    this.ui = openOverlay(scene, {
      title: unlocked ? plant.name : 'Неизвестное растение',
      subtitle: unlocked ? plant.rarity.name : 'Ещё не открыто',
      depth: DS.overlay.detail,
      maxW: 420,
      maxH: 640,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const scene = this.scene;
    const C = this.ui.content;
    const plant = this.plant;
    const unlocked = this.unlocked;

    this.ui.body.removeAll(true);

    // --- Образец: круглая «лупа» гербария с растением ---
    const sampleH = 132;
    const sampleY = C.top + 4;
    const sampleCard = scene.add.graphics();
    sampleCard.fillStyle(color(DS.colors.bg.secondary), 1);
    sampleCard.fillRoundedRect(C.left, sampleY, C.width, sampleH, DS.radius.lg);
    sampleCard.lineStyle(1.5, color(DS.colors.ui.border), 1);
    sampleCard.strokeRoundedRect(C.left, sampleY, C.width, sampleH, DS.radius.lg);
    this.ui.body.add(sampleCard);

    const discX = C.left + 74;
    const discY = sampleY + sampleH / 2;
    const discR = 46;
    const disc = scene.add.circle(discX, discY, discR, color(DS.colors.bg.elevated), 1)
      .setStrokeStyle(2, unlocked ? plant.rarity.color : color(DS.colors.ui.border), 1);
    this.ui.body.add(disc);

    if (unlocked) {
      const art = scene.add.graphics();
      art.setPosition(discX, discY + discR - 6);
      drawOutlinedPlant(art, plant, discR * 1.9 / 100, null);
      this.ui.body.add(art);
    } else {
      const q = scene.add.text(discX, discY, '?', {
        fontSize: '42px',
        fontFamily: DS.font.family.title,
        color: DS.colors.text.muted,
      }).setOrigin(0.5);
      this.ui.body.add(q);
    }

    // Справа от лупы — редкость, время роста, цена.
    const infoX = discX + discR + 18;
    let iy = sampleY + 18;

    if (unlocked) {
      const rarity = plant.rarity;
      const rarityPill = scene.add.text(infoX, iy, rarity.name.toUpperCase(), {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: `#${rarity.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0, 0);
      this.ui.body.add(rarityPill);
      iy += 20;

      const nameText = scene.add.text(infoX, iy, plant.name, {
        fontSize: `${DS.font.size.md}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: DS.colors.text.primary,
        wordWrap: { width: C.right - infoX - 8 },
      }).setOrigin(0, 0);
      this.ui.body.add(nameText);
      iy += nameText.height + 8;
    } else {
      const hint = scene.add.text(infoX, iy, 'Посадите семя и соберите урожай — карточка заполнится сама.', {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        color: DS.colors.text.secondary,
        wordWrap: { width: C.right - infoX - 8 },
      }).setOrigin(0, 0);
      this.ui.body.add(hint);
      iy += hint.height + 8;
    }

    if (unlocked) {
      // Два чипа: время роста и цена.
      const chipY = iy + 8;
      const timePill = createPill(scene, infoX + 42, chipY, 84, 26, `⏱ ${plant.growSeconds}с`, {
        fill: DS.colors.bg.elevated,
        border: DS.colors.ui.border,
        color: DS.colors.text.secondary,
        fontSize: DS.font.size.xs,
      });
      this.ui.body.add(timePill);

      const pricePill = createPill(scene, infoX + 42 + 92, chipY, 84, 26, `🪙 ${plant.price}`, {
        fill: DS.colors.bg.elevated,
        border: DS.colors.ui.border,
        color: DS.colors.text.secondary,
        fontSize: DS.font.size.xs,
      });
      this.ui.body.add(pricePill);
    }

    // --- Текст: описание / среда / легенда ---
    let y = sampleY + sampleH + 14;
    const bottomReserve = (this.mutCount > 0 || !unlocked) ? 70 : 16;
    const scroll = createScrollArea(scene, this.ui.body, {
      left: C.left,
      right: C.right,
      top: y,
      bottom: C.bottom - bottomReserve,
      width: C.width,
    });
    this.scroll = scroll;

    const lore = plant.lore || {};
    let ly = 0;

    const addSection = (icon, title, body) => {
      if (!body) return;
      ly += sectionHeader(scene, scroll.view, 0, ly, C.width, `${title}`);
      const t = scene.add.text(0, ly, body, {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        color: DS.colors.text.secondary,
        wordWrap: { width: C.width },
        lineSpacing: 3,
      }).setOrigin(0, 0);
      scroll.view.add(t);
      ly += t.height + 14;
    };

    if (unlocked) {
      addSection('📖', 'Описание', lore.description);
      addSection('🌿', 'Среда обитания', lore.habitat);
      addSection('🌙', 'Легенда', lore.legend);
      if (!lore.description && !lore.habitat && !lore.legend) {
        const empty = scene.add.text(0, 0, 'У этого вида ещё нет записей в книге мифов.', {
          fontSize: `${DS.font.size.sm}px`,
          fontFamily: DS.font.family.base,
          color: DS.colors.text.muted,
          fontStyle: 'italic',
          wordWrap: { width: C.width },
        }).setOrigin(0, 0);
        scroll.view.add(empty);
        ly += empty.height + 14;
      }
      if (lore.rarityNote) {
        const note = scene.add.text(0, ly, lore.rarityNote, {
          fontSize: `${DS.font.size.xs}px`,
          fontFamily: DS.font.family.base,
          color: DS.colors.text.muted,
          fontStyle: 'italic',
          wordWrap: { width: C.width },
        }).setOrigin(0, 0);
        scroll.view.add(note);
        ly += note.height + 8;
      }
    } else {
      const how = scene.add.text(0, 0,
        'Каждое новое растение попадает в книгу, когда вы вырастите его впервые. Пока вид не открыт, в записи видна только тень.', {
          fontSize: `${DS.font.size.sm}px`,
          fontFamily: DS.font.family.base,
          color: DS.colors.text.secondary,
          wordWrap: { width: C.width },
          lineSpacing: 3,
        }).setOrigin(0, 0);
      scroll.view.add(how);
      ly += how.height + 10;
    }

    scroll.refresh();

    // --- Нижнее действие ---
    const buttonW = C.width;
    const buttonH = 48;
    const buttonY = C.bottom - 6 - buttonH / 2;

    if (!unlocked) {
      const got = createButton(scene, C.left + C.width / 2, buttonY, buttonW, buttonH, 'Понятно', () => this.destroy(), {
        variant: 'primary',
        fontSize: DS.font.size.base,
      });
      this.ui.body.add(got);
    } else if (this.mutCount > 0) {
      const openMutations = createButton(scene, C.left + C.width / 2, buttonY, buttonW, buttonH,
        `✨ Мутации: ${this.mutCount}`, () => {
          this.destroy();
          new MutationsOverlay(this.scene, this.seed, this.collection);
        }, {
          variant: 'primary',
          fontSize: DS.font.size.base,
        });
      this.ui.body.add(openMutations);
    }
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scroll && this.scroll.destroy?.();
    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();
    try { super.destroy(fromScene); } catch {}
  }
}