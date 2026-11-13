import Phaser from 'phaser';
import { getAllSeeds, getSeedsByRarity, getPlant, TOTAL_PLANTS } from '../../shared/plants.js';
import { CHAPTERS } from '../../shared/chapters.js';
import { PlantDetailOverlay } from './PlantDetailOverlay.js';
import { setupSearchRow } from './book/BookSearchRow.js';
import { setupRarityTabs } from './book/BookRarityTabs.js';
import { renderGrid, chapterPerPage } from './book/BookGrid.js';
import { DS } from './DesignSystem.js';
import { openOverlay, color, drawInnerFrame, drawVineCorners } from './ui-kit.js';

/**
 * Книга растений — тот же скелет, что у остальных окон.
 *
 * Было: книга сама рисовала затемнение (0.85 против общих 0.55), сама лепила
 * крестик в другом цвете, сама строила обложку на весь экран и держала
 * собственные координаты «половины книги» (-W/4). Из-за этого её шапка
 * разъезжалась, а вкладки редкости уезжали под обложку.
 *
 * Стало: затемнение, виньетка, крестик и закрытие по тапу — из ui-kit
 * (режим `bare`: панель книга рисует сама, киту остаётся обвязка). Тело кита
 * становится локальной системой координат фолианта: (0,0) — центр переплёта.
 * Все привязки вёрстки книга объявляет полями (pageTop/pageLeftX/pageW/
 * gridTop/tabsY/searchY/rarityY), и по ним же её проверяют тесты.
 */

// Переплёт и бумага — производные от токенов DS, без «своих» оттенков.
const COVER = color(DS.colors.garden.soilDark);        // Rich Soil — кожа
const COVER_EDGE = color(DS.colors.garden.soilLight);  // Earth — тиснение
const PAPER = color(DS.colors.bg.primary);             // Sunlit Cream — страница
const INK = DS.colors.text.primary;
const INK_SOFT = DS.colors.text.muted;

/** Ширина, с которой книга раскрывается на разворот (планшет/десктоп). */
const SPREAD_MIN_WIDTH = 720;
/** Поле бумаги внутри переплёта. */
const PAGE_PAD = 16;
/** Ширина корешка на развороте. */
const SPINE_W = 26;

export class BookOverlay extends Phaser.GameObjects.Container {
  constructor(scene, collection) {
    super(scene, 0, 0);

    this.scene = scene;
    this.collection = collection;

    this.activeChapter = null;
    this.activeRarity = 'all';
    this.searchQuery = '';
    this.page = 0;
    this.totalPages = 1;
    this.viewMode = 'plants';
    this.detailOpen = false;
    this.searchInput = null;
    this.searchDestroy = null;
    this.isAnimating = false;
    this._destroyed = false;

    try {
      scene.add.existing(this);
      this.setDepth(DS.overlay.book);

      this.measure();
      this.attachKit();
      this.buildCover();
      this.buildHeader();
      this.buildViewTabs();
      this.buildPager();
      this.buildUI();
      this.renderPage();
    } catch (e) {
      console.error('[BookOverlay] Ошибка:', e);
      scene.add.text(scene.scale.width / 2, scene.scale.height / 2, 'КНИГА УПАЛА:\n' + e.message, {
        fontSize: '13px', color: '#ff5555', backgroundColor: '#000000cc',
        padding: { x: 10, y: 10 }, align: 'center', wordWrap: { width: scene.scale.width - 40 },
      }).setOrigin(0.5).setDepth(DS.overlay.fatal).setScrollFactor(0);
    }
  }

  // --- вёрстка ---------------------------------------------------------------

  /**
   * Размеры фолианта и полосы шапки — в координатах экрана (тело кита стоит
   * в (0,0), поэтому локальные и мировые координаты совпадают, и вёрстку
   * можно сверять с прямоугольниками объектов напрямую).
   *
   * Полосы шапки считаются СВЕРХУ ВНИЗ и объявлены полями: заголовок →
   * счётчик → вкладки → поиск → фильтр редкости.
   */
  measure() {
    const cam = this.scene.cameras.main;

    this.spread = cam.width >= SPREAD_MIN_WIDTH;
    this.bookW = Math.min(cam.width - 44, 880);
    this.bookH = Math.min(cam.height - 44, 620);
    this.coverW = this.bookW + 20;
    this.coverH = this.bookH + 20;
    this.coverX = (cam.width - this.coverW) / 2;
    this.coverY = (cam.height - this.coverH) / 2;
    this.coverCx = cam.width / 2;
    this.coverCy = cam.height / 2;

    const paperW = this.bookW - PAGE_PAD * 2;
    const spineW = this.spread ? SPINE_W : 0;

    this.pageTop = this.coverY + 10 + PAGE_PAD;
    this.pageBottom = this.coverY + this.coverH - 10 - PAGE_PAD;
    this.pageW = this.spread ? (paperW - spineW) / 2 : paperW;
    this.pageLeftX = this.coverX + 10 + PAGE_PAD;
    this.pageRightX = this.spread ? this.pageLeftX + this.pageW + spineW : this.pageLeftX;

    // Шапка: заголовок → счётчик → вкладки → поиск → фильтр редкости.
    this.tabsY = this.pageTop + 58;
    this.searchY = this.pageTop + 98;
    this.rarityY = this.pageTop + 132;
    this.gridTop = this.pageTop + 162;
    this.gridBottom = this.pageBottom - 36;

    // Поиск и фильтр редкости живут на правой странице разворота.
    this.tabsX = this.pageLeftX;
    this.searchX = this.spread ? this.pageRightX : this.pageLeftX;
    this.rarityX = this.searchX;

    // Метрики сетки: сколько карточек влезает в страницу.
    this.cols = 4;
    this.cardGap = 10;
    const gridH = this.gridBottom - this.gridTop;
    const byWidth = Math.floor((this.pageW - (this.cols - 1) * this.cardGap) / this.cols);
    let rows = Math.max(1, Math.floor((gridH + this.cardGap) / (byWidth + this.cardGap)));
    this.cardSize = Math.max(28, Math.min(byWidth, Math.floor((gridH - (rows - 1) * this.cardGap) / rows)));
    rows = Math.max(1, Math.floor((gridH + this.cardGap) / (this.cardSize + this.cardGap)));
    this.rows = rows;
    this.perPage = this.cols * rows * (this.spread ? 2 : 1);
  }

  /** Общий скелет: затемнение, виньетка, крестик, закрытие по тапу. */
  attachKit() {
    this.ui = openOverlay(this.scene, {
      bare: true,
      depth: DS.overlay.book,
      container: this,
      maxW: this.coverW,
      maxH: this.coverH,
      widthRatio: 1,
      heightRatio: 1,
      padding: 0,
      closeOnScrim: true,
      onClose: () => this.destroy(),
    });

    // Тело кита — холст книги. Оно уже стоит в (0,0), а размеры книги
    // посчитаны в экранных координатах: пересчёт на каждом шаге не нужен.
    this.bookContainer = this.ui.body;
  }

  buildCover() {
    const scene = this.scene;
    const warm = color(DS.colors.text.secondary);

    // Щит: в bare-режиме скелет не рисует панель, и без него тап по странице
    // проваливался бы в затемнение и закрывал книгу.
    this.shield = scene.add.rectangle(this.coverCx, this.coverCy, this.coverW, this.coverH, 0x000000, 0.001)
      .setInteractive();
    this.bookContainer.add(this.shield);

    // Тёплая многослойная тень, как у панелей кита (не чёрная).
    const shadow = scene.add.graphics();
    shadow.fillStyle(warm, 0.06);
    shadow.fillRoundedRect(this.coverX + 2, this.coverY + 14, this.coverW, this.coverH, DS.radius.xl + 6);
    shadow.fillStyle(warm, 0.10);
    shadow.fillRoundedRect(this.coverX - 3, this.coverY + 7, this.coverW, this.coverH, DS.radius.xl + 3);
    shadow.fillStyle(warm, 0.14);
    shadow.fillRoundedRect(this.coverX - 8, this.coverY + 2, this.coverW, this.coverH, DS.radius.xl);
    this.bookContainer.add(shadow);

    // Кожаный переплёт + тиснение общей рамкой кита.
    const cover = scene.add.graphics();
    cover.fillStyle(COVER, 1);
    cover.fillRoundedRect(this.coverX, this.coverY, this.coverW, this.coverH, DS.radius.xl);
    cover.lineStyle(3, COVER_EDGE, 1);
    cover.strokeRoundedRect(this.coverX, this.coverY, this.coverW, this.coverH, DS.radius.xl);
    drawInnerFrame(cover, this.coverX, this.coverY, this.coverW, this.coverH, DS.radius.xl, 8);
    // Лоза по верхним углам переплёта — книга тоже «растёт в саду».
    drawVineCorners(cover, this.coverX, this.coverY, this.coverW, this.coverH, DS.radius.xl);

    // Латунные уголки-заклёпки: четыре точки, как на настоящем фолианте.
    const studR = 3.4;
    for (const [sx, sy] of [
      [this.coverX + 14, this.coverY + 14],
      [this.coverX + this.coverW - 14, this.coverY + 14],
      [this.coverX + 14, this.coverY + this.coverH - 14],
      [this.coverX + this.coverW - 14, this.coverY + this.coverH - 14],
    ]) {
      cover.fillStyle(0x2C1B10, 0.9);
      cover.fillCircle(sx, sy + 1, studR + 1.2);
      cover.fillStyle(0xE8C55A, 1);
      cover.fillCircle(sx, sy, studR);
      cover.fillStyle(0xFFF3B0, 0.85);
      cover.fillCircle(sx - studR * 0.3, sy - studR * 0.35, studR * 0.45);
    }
    this.bookContainer.add(cover);

    // Бумага: на развороте — две страницы и корешок, иначе — одна страница.
    const pages = scene.add.graphics();
    const paperH = this.pageBottom - this.pageTop;

    pages.fillStyle(PAPER, 1);
    if (this.spread) {
      pages.fillRoundedRect(this.pageLeftX, this.pageTop, this.pageW, paperH, { tl: 10, bl: 10, tr: 0, br: 0 });
      pages.fillRoundedRect(this.pageRightX, this.pageTop, this.pageW, paperH, { tl: 0, bl: 0, tr: 10, br: 10 });

      const spineX = this.pageLeftX + this.pageW;
      pages.fillStyle(COVER, 1);
      pages.fillRect(spineX, this.pageTop, this.pageRightX - spineX, paperH);
      // Тень у сгиба с обеих сторон корешка.
      pages.fillStyle(color(DS.colors.text.primary), 0.10);
      pages.fillRect(spineX - 14, this.pageTop, 14, paperH);
      pages.fillRect(this.pageRightX, this.pageTop, 14, paperH);
    } else {
      pages.fillRoundedRect(this.pageLeftX, this.pageTop, this.pageW, paperH, 10);
      // Сгиб одностраничной книги — левая кромка (там же центр переплёта).
      pages.fillStyle(color(DS.colors.text.primary), 0.07);
      pages.fillRect(this.pageLeftX, this.pageTop, 16, paperH);
    }
    this.bookContainer.add(pages);
  }

  buildHeader() {
    const scene = this.scene;

    this.title = scene.add.text(this.pageLeftX + 6, this.pageTop + 14, '📖 Книга растений', {
      fontSize: `${DS.font.size.lg}px`,
      fontFamily: DS.font.family.title,
      color: INK,
    }).setOrigin(0, 0);

    this.counterText = scene.add.text(this.pageLeftX + 6, this.pageTop + 40, '', {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      color: INK_SOFT,
    }).setOrigin(0, 0);

    this.bookContainer.add([this.title, this.counterText]);
  }

  /** Переключатель «Главы / Растения» — две закладки над страницей. */
  buildViewTabs() {
    const scene = this.scene;
    const gap = 8;
    const tabW = Math.floor((this.pageW - gap) / 2);
    const tabH = 30;
    const hitH = 36;

    const defs = [
      { id: 'chapters', label: '🌿 Главы' },
      { id: 'plants', label: '📖 Растения' },
    ];

    this.tabButtons = new Map();

    defs.forEach((def, i) => {
      const c = scene.add.container(this.tabsX + i * (tabW + gap), this.tabsY);

      const bg = scene.add.graphics();
      const text = scene.add.text(tabW / 2, tabH / 2, def.label, {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: INK,
      }).setOrigin(0.5);

      const drawBg = (active) => {
        bg.clear();
        bg.fillStyle(active ? color(DS.colors.brand.primary) : color(DS.colors.bg.secondary), 1);
        bg.fillRoundedRect(0, 0, tabW, tabH, 7);
        bg.lineStyle(1.2, active ? color(DS.colors.brand.secondary) : color(DS.colors.ui.border), 1);
        bg.strokeRoundedRect(0, 0, tabW, tabH, 7);
        text.setColor(active ? DS.colors.text.inverse : INK);
      };
      drawBg(false);
      c.add([bg, text]);

      const hit = scene.add.rectangle(tabW / 2, tabH / 2, tabW, hitH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation?.();
        if (this.viewMode === def.id && !this.activeChapter) return;
        this.viewMode = def.id;
        this.activeChapter = null;
        this.page = 0;
        this.scene.sound?.uiClick?.();
        this.renderPage();
      });
      c.add(hit);

      this.tabButtons.set(def.id, { container: c, bg, text, drawBg });
      this.bookContainer.add(c);
    });
  }

  buildPager() {
    const scene = this.scene;
    const y = this.pageBottom - 14;
    const rightEdge = this.spread ? this.pageRightX + this.pageW : this.pageLeftX + this.pageW;
    const style = {
      fontSize: `${DS.font.size.lg}px`,
      fontFamily: DS.font.family.base,
      color: INK_SOFT,
    };

    this.prevBtn = scene.add.text(this.pageLeftX + 22, y, '◀', style)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn = scene.add.text(rightEdge - 22, y, '▶', style)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pageText = scene.add.text(this.coverCx, y, '', {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.secondary,
    }).setOrigin(0.5);

    this.prevBtn.on('pointerdown', () => this.changePage(-1));
    this.nextBtn.on('pointerdown', () => this.changePage(1));

    this.bookContainer.add([this.prevBtn, this.nextBtn, this.pageText]);
  }

  buildUI() {
    this.gridContainer = this.scene.add.container(0, 0);
    this.bookContainer.add(this.gridContainer);

    const searchUI = setupSearchRow(this);
    this.searchInput = searchUI.searchInput;
    this.searchDestroy = searchUI.destroySearchDom;

    this.rarityButtons = setupRarityTabs(this);
  }

  // --- состояние -------------------------------------------------------------

  updateViewTabs() {
    if (!this.tabButtons) return;
    for (const [id, btn] of this.tabButtons) {
      btn.drawBg(this.viewMode === id && !this.activeChapter);
    }
  }

  updateRarityTabs() {
    if (!this.rarityButtons) return;
    for (const [id, btn] of this.rarityButtons) {
      btn.drawBg(id === this.activeRarity);
    }
  }

  countUnlocked() {
    let unlocked = 0;
    for (const seed of getAllSeeds()) if (this.collection.has(seed)) unlocked++;
    return unlocked;
  }

  filterSeeds() {
    let seeds = this.activeRarity === 'all'
      ? getAllSeeds()
      : getSeedsByRarity(this.activeRarity);

    if (this.searchQuery) {
      seeds = seeds.filter((s) => getPlant(s).name.toLowerCase().includes(this.searchQuery));
    }
    return seeds;
  }

  changePage(delta) {
    if (this.isAnimating) return;
    const newPage = this.page + delta;
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.scene.sound?.uiClick?.();

    this.animatePageTurn(delta > 0 ? 'right' : 'left', () => {
      this.page = newPage;
      this.renderPage();
    });
  }

  animatePageTurn(direction, onComplete) {
    this.isAnimating = true;
    const scene = this.scene;
    const paperH = this.pageBottom - this.pageTop;

    // Лист ходит вокруг корешка: на развороте это кромка правой страницы,
    // у одностраничной книги — её центр (середина переплёта).
    const pageAnim = scene.add.graphics();
    pageAnim.fillStyle(PAPER, 1);
    if (this.spread) {
      pageAnim.fillRect(0, this.pageTop, this.pageW, paperH);
      pageAnim.fillStyle(color(DS.colors.text.primary), 0.10);
      pageAnim.fillRect(0, this.pageTop, 18, paperH);
      pageAnim.setPosition(this.pageRightX, 0);
    } else {
      pageAnim.fillRect(-this.pageW / 2, this.pageTop, this.pageW, paperH);
      pageAnim.fillStyle(color(DS.colors.text.primary), 0.10);
      pageAnim.fillRect(-this.pageW / 2, this.pageTop, 18, paperH);
      pageAnim.setPosition(this.pageLeftX + this.pageW / 2, 0);
    }
    pageAnim.scaleX = direction === 'right' ? 1 : 0;
    this.bookContainer.add(pageAnim);

    scene.tweens.add({
      targets: pageAnim,
      scaleX: direction === 'right' ? 0 : 1,
      duration: DS.motion.slow,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        pageAnim.destroy();
        this.isAnimating = false;
        if (onComplete) onComplete();
      },
    });
  }

  renderPage() {
    const unlocked = this.countUnlocked();

    let seeds = this.filterSeeds();
    let titleText = '📖 Книга растений';
    let counterLabel = `Открыто: ${unlocked} из ${TOTAL_PLANTS}`;

    if (this.activeChapter) {
      const chapter = CHAPTERS.find((c) => c.id === this.activeChapter);
      if (chapter) {
        seeds = chapter.seeds;
        const owned = chapter.seeds.filter((s) => this.collection.has(s)).length;
        titleText = `${chapter.icon} ${chapter.name}`;
        counterLabel = `Открыто: ${owned} из ${chapter.seeds.length}`;
      }
    } else if (this.viewMode === 'chapters') {
      titleText = '🌿 Главы';
    }

    this.title.setText(titleText);
    this.counterText.setText(counterLabel);

    const isChapterList = this.viewMode === 'chapters' && !this.activeChapter;
    const items = isChapterList ? CHAPTERS : seeds;
    const perPage = Math.max(1, isChapterList ? chapterPerPage(this) : this.perPage);

    this.totalPages = Math.max(1, Math.ceil(items.length / perPage));
    this.page = Math.min(Math.max(0, Number.isFinite(this.page) ? this.page : 0), this.totalPages - 1);

    this.updateViewTabs();
    this.updateRarityTabs();
    renderGrid(this, items);

    const showPager = this.totalPages > 1;
    this.prevBtn.setVisible(showPager);
    this.nextBtn.setVisible(showPager);
    this.pageText.setVisible(showPager);

    if (showPager) {
      this.pageText.setText(`Стр. ${this.page + 1} из ${this.totalPages}`);
      this.prevBtn.setAlpha(this.page > 0 ? 1 : 0.3);
      this.nextBtn.setAlpha(this.page < this.totalPages - 1 ? 1 : 0.3);
    }
  }

  openDetail(seed) {
    if (this.detailOpen) return;
    this.detailOpen = true;
    const detail = new PlantDetailOverlay(this.scene, seed, this.collection);
    detail.once('destroy', () => { this.detailOpen = false; });
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this.searchDestroy) {
      try { this.searchDestroy(); } catch {}
      this.searchDestroy = null;
    }

    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();

    try { super.destroy(fromScene); } catch {}
  }
}
