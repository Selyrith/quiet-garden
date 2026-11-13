import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { MUTATION_COUNT, getMutation } from '../../shared/mutations.js';
import { drawPixelPlant, drawOutlinedPlant } from './PixelArt.js';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createEmptyState,
  color,
} from './ui-kit.js';

/**
 * Мутации растения — «коллекционный альбом образцов».
 *
 * Было: тёмные квадраты 0x1c2833 на пергаментной панели (выглядело как
 * техническая сетка), подписи «Стр. 1 / 5» без стрелок-подсказок и
 * перекрывающиеся клики. Стало: плитки-образцы в бумажной палитре,
 * открытые светятся золотом, закрытые — с силуэтом «?».
 */
export class MutationsOverlay extends Phaser.GameObjects.Container {
  constructor(scene, plantSeed, collection) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.detail);
    this.scene = scene;
    this.plantSeed = plantSeed;
    this.collection = collection;
    this.page = 0;
    this._destroyed = false;

    const plant = getPlant(plantSeed);
    this.plant = plant;

    // 20 образцов на страницу: 5 в ряд.
    this.perPage = 20;
    this.cols = 5;
    this.totalPages = Math.ceil(MUTATION_COUNT / this.perPage);

    this.ui = openOverlay(scene, {
      title: `✨ Мутации · ${plant.name}`,
      subtitle: 'Соберите все оттенки одного вида',
      depth: DS.overlay.detail,
      maxW: 420,
      maxH: 560,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const scene = this.scene;
    const C = this.ui.content;
    this.ui.body.removeAll(true);

    const found = this.countFound();

    // Счётчик прогресса.
    const counter = scene.add.text(C.left, C.top, `Открыто ${found} из ${MUTATION_COUNT}`, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.muted,
    }).setOrigin(0, 0);
    this.ui.body.add(counter);

    const gridTop = C.top + 24;
    const gap = 8;
    const tileW = (C.width - (this.cols - 1) * gap) / this.cols;
    const tileH = tileW + 16;
    const rows = Math.ceil(this.perPage / this.cols);
    const gridH = rows * tileH + (rows - 1) * gap;

    const startIndex = this.page * this.perPage;
    const endIndex = Math.min(startIndex + this.perPage, MUTATION_COUNT);

    for (let i = startIndex; i < endIndex; i++) {
      const local = i - startIndex;
      const row = Math.floor(local / this.cols);
      const col = local % this.cols;
      const x = C.left + col * (tileW + gap);
      const y = gridTop + row * (tileH + gap);

      const mutId = `mut_${this.plantSeed}_${i}`;
      const unlocked = this.collection.has(mutId);
      const mut = getMutation(this.plantSeed, i);

      this.ui.body.add(this.buildTile(x, y, tileW, tileH, i, mut, unlocked));
    }

    // Навигация.
    const navY = Math.min(gridTop + gridH + 20, C.bottom - 22);
    this.navY = navY;

    if (this.totalPages > 1) {
      this.buildNav(C, navY);
    }

    if (found === 0) {
      const prompt = createEmptyState(scene, C.left + C.width / 2, navY - 70, C.width - 20, {
        icon: '🌫️',
        title: 'Ни один оттенок ещё не найден',
        hint: 'Редкие мутации появляются при сборе урожая — чем выше удача, тем чаще.',
      });
      this.ui.body.add(prompt);
    }
  }

  buildTile(x, y, w, h, index, mut, unlocked) {
    const scene = this.scene;
    const c = scene.add.container(x, y);
    const r = 8;

    // Плитка-образец: пергамент, у открытых — золотая кайма.
    const g = scene.add.graphics();
    g.fillStyle(unlocked ? 0xf7ecd5 : 0xe9dfc9, 1);
    g.fillRoundedRect(0, 0, w, h, r);
    g.lineStyle(unlocked ? 2 : 1.2, unlocked ? 0xe8c55a : 0xcdbb9b, 1);
    g.strokeRoundedRect(0, 0, w, h, r);
    if (unlocked) {
      g.fillStyle(0xe8c55a, 0.13);
      g.fillRoundedRect(0, 0, w, h, r);
    }
    c.add(g);

    const artSize = h - 20;
    if (unlocked && mut) {
      const art = scene.add.graphics();
      art.setPosition(w / 2, artSize - 2);
      drawOutlinedPlant(art, this.plant, artSize / 100, index);
      c.add(art);

      const name = scene.add.text(w / 2, h - 9, `×${mut.mult.toFixed(1)}`, {
        fontSize: '9px',
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: '#6b5a44',
      }).setOrigin(0.5);
      c.add(name);
    } else {
      const q = scene.add.text(w / 2, h / 2 - 2, '?', {
        fontSize: `${Math.floor(w * 0.42)}px`,
        fontFamily: DS.font.family.title,
        color: '#b9a888',
      }).setOrigin(0.5);
      c.add(q);
    }

    const hit = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: unlocked });
    hit.on('pointerdown', () => {
      if (unlocked && mut) {
        this.scene.showToast?.(`${mut.name}\nБонус к цене: ×${mut.mult.toFixed(1)}`);
      } else {
        this.scene.showToast?.('Этот оттенок ещё не найден');
      }
    });
    c.add(hit);

    return c;
  }

  buildNav(C, y) {
    const scene = this.scene;
    const makeArrow = (dx) => {
      const c = scene.add.container(C.left + C.width / 2 + dx, y);
      const g = scene.add.graphics();
      g.fillStyle(color(DS.colors.bg.secondary), 1);
      g.fillCircle(0, 0, 17);
      g.lineStyle(1.5, color(DS.colors.ui.border), 1);
      g.strokeCircle(0, 0, 17);
      const t = scene.add.text(0, -1, dx < 0 ? '◀' : '▶', {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        color: DS.colors.text.secondary,
      }).setOrigin(0.5);
      const hit = scene.add.circle(0, 0, 24, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      c.add([g, t, hit]);
      this.ui.body.add(c);
      return { c, hit };
    };

    const prev = makeArrow(-58);
    const next = makeArrow(58);

    const pageText = scene.add.text(C.left + C.width / 2, y, `${this.page + 1} / ${this.totalPages}`, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.secondary,
    }).setOrigin(0.5);
    this.ui.body.add(pageText);

    prev.c.setAlpha(this.page > 0 ? 1 : 0.35);
    next.c.setAlpha(this.page < this.totalPages - 1 ? 1 : 0.35);

    prev.hit.on('pointerdown', () => {
      if (this.page > 0) { this.page--; this.render(); }
    });
    next.hit.on('pointerdown', () => {
      if (this.page < this.totalPages - 1) { this.page++; this.render(); }
    });
  }

  countFound() {
    let found = 0;
    for (let i = 0; i < MUTATION_COUNT; i++) {
      if (this.collection.has(`mut_${this.plantSeed}_${i}`)) found++;
    }
    return found;
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();
    try { super.destroy(fromScene); } catch {}
  }
}