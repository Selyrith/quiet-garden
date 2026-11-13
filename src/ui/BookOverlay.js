import Phaser from 'phaser';
import { getAllSeeds, getSeedsByRarity, getPlant, TOTAL_PLANTS } from '../../shared/plants.js';
import { CHAPTERS } from '../../shared/chapters.js';
import { PlantDetailOverlay } from './PlantDetailOverlay.js';
import { setupSearchRow } from './book/BookSearchRow.js';
import { setupRarityTabs } from './book/BookRarityTabs.js';
import { renderGrid } from './book/BookGrid.js';
import { UNIFIED } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { UI } from './ui-theme.js';

export class BookOverlay extends Phaser.GameObjects.Container {
  constructor(scene, collection) {
    const cam = scene.cameras.main;
    try {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.book);
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

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    this.bookW = Math.min(cam.width * 0.95, 900);
    this.bookH = Math.min(cam.height * 0.85, 600);

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.85).setOrigin(0).setInteractive();
    this.add(this.bg);

    this.bookContainer = scene.add.container(cam.width / 2, cam.height / 2);
    this.add(this.bookContainer);

    this.buildBookBase();
    this.buildUI();
    this.renderPage();

    this.once('destroy', () => { this.scene.showSignpost?.(); });
    } catch (e) {
    console.error('[BookOverlay] Ошибка:', e);
    scene.add.text(scene.scale.width / 2, scene.scale.height / 2, 'КНИГА УПАЛА:\n' + e.message, {
      fontSize: '13px', color: '#ff5555', backgroundColor: '#000000cc',
      padding: { x: 10, y: 10 }, align: 'center', wordWrap: { width: scene.scale.width - 40 }
    }).setOrigin(0.5).setDepth(DS.overlay.fatal).setScrollFactor(0);
    }
  }

  buildBookBase() {
    const scene = this.scene;
    const W = this.bookW;
    const H = this.bookH;

    this.shield = scene.add.rectangle(0, 0, W + 40, H + 60, 0x000000, 0.001).setInteractive();
    this.shield.on('pointerdown', (p, x, y, e) => e.stopPropagation());
    this.bookContainer.add(this.shield);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.6);
    shadow.fillRoundedRect(-W/2 + 10, -H/2 + 10, W, H, 20);
    this.bookContainer.add(shadow);

    const cover = scene.add.graphics();
    cover.fillStyle(0x2c1b10, 1);
    cover.fillRoundedRect(-W/2 - 10, -H/2 - 10, W + 20, H + 20, 20);
    cover.lineStyle(4, 0x5d4037, 1);
    cover.strokeRoundedRect(-W/2 - 10, -H/2 - 10, W + 20, H + 20, 20);
    this.bookContainer.add(cover);

    const leftPage = scene.add.graphics();
    leftPage.fillStyle(0xf5e6c8, 1);
    leftPage.fillRoundedRect(-W/2, -H/2, W/2 - 10, H, { tl: 12, bl: 12, tr: 0, br: 0 });
    leftPage.fillStyle(0x000000, 0.08);
    leftPage.fillRect(-30, -H/2, 20, H);
    this.bookContainer.add(leftPage);

    const rightPage = scene.add.graphics();
    rightPage.fillStyle(0xf5e6c8, 1);
    rightPage.fillRoundedRect(10, -H/2, W/2 - 10, H, { tl: 0, bl: 0, tr: 12, br: 12 });
    rightPage.fillStyle(0x000000, 0.08);
    rightPage.fillRect(10, -H/2, 20, H);
    this.bookContainer.add(rightPage);

    const spine = scene.add.graphics();
    spine.fillStyle(0x2c1b10, 1);
    spine.fillRect(-10, -H/2, 20, H);
    this.bookContainer.add(spine);

    const ribbon = scene.add.graphics();
    ribbon.fillStyle(0xc62828, 1);
    ribbon.fillRect(0, H/2 - 10, 12, 40);
    ribbon.fillTriangle(0, H/2 + 30, 12, H/2 + 30, 6, H/2 + 40);
    this.bookContainer.add(ribbon);

    let unlocked = 0;
    for (const seed of getAllSeeds()) if (this.collection.has(seed)) unlocked++;

    this.title = scene.add.text(-W/4, -H/2 + 30, `📖 Книга Растений`, {
      fontSize: '24px', color: '#3e2723', fontStyle: 'bold', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5);

    this.counterText = scene.add.text(-W/4, -H/2 + 60, `Открыто: ${unlocked} из ${TOTAL_PLANTS}`, {
      fontSize: '15px', color: '#8d6e63', fontStyle: 'italic', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5);

    this.bookContainer.add([this.title, this.counterText]);

    const tabY = -H/2 - 26;
    const tabW = 120;
    const tabGap = 8;
    const leftTabX = -W/2 + 20 + tabW / 2;
    const rightTabX = -W/2 + 20 + tabW + tabGap + tabW / 2;

    this.chaptersHit = scene.add.rectangle(leftTabX, tabY, tabW, 40, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.chaptersBtn = scene.add.text(leftTabX, tabY, '🌿 Главы', {
      fontSize: `${DS.font.size.base}px`, color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5);
    this.chaptersHit.on('pointerdown', () => { this.viewMode = 'chapters'; this.activeChapter = null; this.page = 0; this.renderPage(); });

    this.plantsHit = scene.add.rectangle(rightTabX, tabY, tabW, 40, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.plantsBtn = scene.add.text(rightTabX, tabY, '📖 Растения', {
      fontSize: `${DS.font.size.base}px`, color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5);
    this.plantsHit.on('pointerdown', () => { this.viewMode = 'plants'; this.activeChapter = null; this.page = 0; this.renderPage(); });

    this.bookContainer.add([this.chaptersHit, this.chaptersBtn, this.plantsHit, this.plantsBtn]);

    const closePad = 18;
    // Use book container coordinates (book is centered at 0,0 in bookContainer)
    const closeX = this.bookW / 2 - closePad - 22;
    const closeY = -this.bookH / 2 + closePad + 22;
    this.closeHit = scene.add.rectangle(closeX, closeY, 46, 46, UNIFIED.color).setInteractive({ useHandCursor: true });
    this.closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    this.closeBg = scene.add.circle(closeX, closeY, 23, UNIFIED.colorLo, 0.95);
    this.closeBg.setStrokeStyle(2, UNIFIED.colorHi);
    this.closeBtn = scene.add.text(closeX, closeY, '✕', {
      fontSize: '26px', color: '#3e2723', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.closeHit.on('pointerdown', () => this.destroy());
    this.bookContainer.add([this.closeHit, this.closeBg, this.closeBtn]);

    const pagerY = H/2 - 25;
    this.prevBtn = scene.add.text(-W/4, pagerY, '◀', { fontSize: '28px', color: '#8d6e63' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn = scene.add.text(W/4, pagerY, '▶', { fontSize: '28px', color: '#8d6e63' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pageText = scene.add.text(0, pagerY, '', { fontSize: '16px', color: '#5d4037', fontFamily: 'Nunito, Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);

    this.prevBtn.on('pointerdown', () => this.changePage(-1));
    this.nextBtn.on('pointerdown', () => this.changePage(1));
    this.bookContainer.add([this.prevBtn, this.nextBtn, this.pageText]);
  }

  buildUI() {
    this.gridContainer = this.scene.add.container(0, 0);
    this.bookContainer.add(this.gridContainer);

    const searchUI = setupSearchRow(this);
    this.searchInput = searchUI.searchInput;
    this.searchDom = searchUI.searchDom;
    this.searchDestroy = searchUI.destroySearchDom;

    this.rarityButtons = setupRarityTabs(this);
  }

  updateRarityTabs() {
    for (const [id, btn] of this.rarityButtons) {
      btn.drawBg(id === this.activeRarity);
    }
  }

  changePage(delta) {
    if (this.isAnimating) return;
    const newPage = this.page + delta;
    if (newPage < 0 || newPage >= this.totalPages) return;
    
    this.animatePageTurn(delta > 0 ? 'right' : 'left', () => {
      this.page = newPage;
      this.renderPage();
    });
  }

  animatePageTurn(direction, onComplete) {
    this.isAnimating = true;
    const scene = this.scene;
    const W = this.bookW;
    const H = this.bookH;

    const pageAnim = scene.add.graphics();
    pageAnim.fillStyle(0xf5e6c8, 1);
    const rectW = W/2 - 10;
    pageAnim.fillRect(0, -H/2, rectW, H);
    pageAnim.fillStyle(0x000000, 0.1);
    pageAnim.fillRect(0, -H/2, 20, H);
    
    this.bookContainer.add(pageAnim);

    const startX = direction === 'right' ? 10 : -10 - rectW;
    const endX = direction === 'right' ? -10 - rectW : 10;
    pageAnim.x = startX;

    scene.tweens.add({
      targets: pageAnim,
      x: endX,
      scaleX: 0,
      duration: 300,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        if (pageAnim.scaleX < 0.5) {
          pageAnim.clear();
          pageAnim.fillStyle(0xe8d5b7, 1);
          pageAnim.fillRect(0, -H/2, rectW, H);
          pageAnim.fillStyle(0x000000, 0.15);
          pageAnim.fillRect(0, -H/2, 20, H);
        }
      },
      onComplete: () => {
        pageAnim.destroy();
        this.isAnimating = false;
        if (onComplete) onComplete();
      }
    });
  }

  filterSeeds() {
    let seeds = this.activeRarity === 'all'
      ? getAllSeeds()
      : getSeedsByRarity(this.activeRarity);

    if (this.searchQuery) {
      seeds = seeds.filter(s => getPlant(s).name.toLowerCase().includes(this.searchQuery));
    }
    return seeds;
  }

  renderPage() {
    const W = this.bookW;
    const H = this.bookH;

    this.chaptersHit.fillColor = this.viewMode === 'chapters' ? 0x8bc34a : 0x000000;
    this.chaptersHit.fillAlpha = this.viewMode === 'chapters' ? 0.25 : 0.001;
    this.chaptersBtn.setColor(this.viewMode === 'chapters' ? '#2e7d32' : '#5d4037');
    this.plantsHit.fillColor = this.viewMode === 'plants' ? UNIFIED.color : 0x000000;
    this.plantsHit.fillAlpha = this.viewMode === 'plants' ? 0.25 : 0.001;
    this.plantsBtn.setColor(this.viewMode === 'plants' ? '#0277bd' : '#5d4037');

    if (this.activeChapter) {
      const ch = CHAPTERS.find(c => c.id === this.activeChapter);
      if (ch) {
        const owned = ch.seeds.filter(s => this.collection.has(s)).length;
        this.title.setText(`${ch.icon} ${ch.name}`);
        this.counterText.setText(`Открыто: ${owned} из ${ch.seeds.length}`);
      }
    } else if (this.viewMode === 'chapters') {
      let unlocked = 0;
      for (const seed of getAllSeeds()) if (this.collection.has(seed)) unlocked++;
      this.title.setText('📖 Главы');
      this.counterText.setText(`Открыто: ${unlocked} из ${TOTAL_PLANTS}`);
    } else {
      let unlocked = 0;
      for (const seed of getAllSeeds()) if (this.collection.has(seed)) unlocked++;
      this.title.setText('📖 Книга Растений');
      this.counterText.setText(`Открыто: ${unlocked} из ${TOTAL_PLANTS}`);
    }

    let seeds = this.filterSeeds();
    if (this.activeChapter) {
      const ch = CHAPTERS.find(c => c.id === this.activeChapter);
      if (ch) seeds = ch.seeds;
    }
    this.totalPages = Math.max(1, Math.ceil(seeds.length / 32));
    if (this.page >= this.totalPages) this.page = this.totalPages - 1;
    if (this.page < 0) this.page = 0;

    this.updateRarityTabs();

    if (typeof this.page !== 'number' || isNaN(this.page)) this.page = 0;
    if (typeof this.totalPages !== 'number' || isNaN(this.totalPages)) this.totalPages = Math.max(1, Math.ceil(seeds.length / 32));

    renderGrid(this, seeds);

    const showPager = this.viewMode === 'plants' && this.totalPages > 1;
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
    if (this.searchDestroy) { try { this.searchDestroy(); } catch {} this.searchDestroy = null; }
    super.destroy(fromScene);
  }
}