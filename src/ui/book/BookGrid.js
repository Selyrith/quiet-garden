import Phaser from 'phaser';
import { getPlant } from '../../../shared/plants.js';
import { CHAPTERS } from '../../../shared/chapters.js';
import { drawPixelPlant } from '../PixelArt.js';
import { DS } from '../DesignSystem.js';
import { color } from '../ui-kit.js';

/**
 * Содержимое страниц книги: сетка растений и список глав.
 *
 * Раньше модуль сам считал «половину книги» (-W/4, W/2 - 60) и рисовал две
 * страницы вслепую: на телефоне книга была одностраничной, а карточки уезжали
 * за переплёт. Теперь все координаты приходят из привязок книги (pageLeftX /
 * pageRightX / pageW / gridTop / gridBottom), а модуль только раскладывает
 * карточки по слотам страниц.
 */

const PAPER = color(DS.colors.bg.primary);
const PAPER_LOCKED = color(DS.colors.bg.secondary);
const BORDER = color(DS.colors.ui.border);
const GOLD = color(DS.colors.brand.secondary);
const CARD_RADIUS = 8;

/** Строк глав на странице, столбцов — по числу страниц разворота. */
const CHAPTER_ROWS = 5;
const CHAPTER_H = 54;
const CHAPTER_GAP = 12;

/** Сколько глав влезает в один «разворот» книги. */
export function chapterPerPage(book) {
  return CHAPTER_ROWS * (book.spread ? 2 : 1);
}

function pageOrigins(book) {
  return book.spread ? [book.pageLeftX, book.pageRightX] : [book.pageLeftX];
}

function addEmptyState(book, text) {
  book.gridContainer.add(book.scene.add.text(0, (book.gridTop + book.gridBottom) / 2, text, {
    fontSize: `${DS.font.size.base}px`,
    fontFamily: DS.font.family.base,
    fontStyle: 'italic',
    color: DS.colors.text.muted,
  }).setOrigin(0.5));
}

/**
 * Точка входа: book уже знает свои размеры, модуль рисует страницу.
 * @param {object} book
 * @param {string[]} seeds — отфильтрованные семена (в режиме глав не нужны)
 */
export function renderGrid(book, seeds) {
  const grid = book.gridContainer;
  if (!grid) return;
  grid.removeAll(true);

  if (book.activeChapter) {
    const chapter = CHAPTERS.find((c) => c.id === book.activeChapter);
    if (chapter) return renderCards(book, chapter.seeds);
    book.activeChapter = null;
  }

  if (book.viewMode === 'chapters') return renderChapterList(book);

  if (!seeds || !seeds.length) {
    addEmptyState(book, 'Ничего не найдено…');
    return;
  }

  const page = Number.isFinite(book.page) ? Math.max(0, book.page) : 0;
  const perPage = Math.max(1, book.perPage || 16);
  renderCards(book, seeds.slice(page * perPage, page * perPage + perPage));
}

/** Квадратные карточки-гербарий, по слоту на страницу. */
function renderCards(book, seeds) {
  if (!seeds.length) {
    addEmptyState(book, 'Ничего не найдено…');
    return;
  }

  const cols = book.cols || 4;
  const rows = book.rows || 4;
  const gap = book.cardGap || 10;
  const size = book.cardSize || 64;
  const perPage = cols * rows;

  const gridW = cols * size + (cols - 1) * gap;
  const gridH = rows * size + (rows - 1) * gap;
  const blockTop = book.gridTop + Math.max(0, (book.gridBottom - book.gridTop - gridH) / 2);

  pageOrigins(book).forEach((originX, pageIdx) => {
    const pageSeeds = seeds.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
    const startX = originX + (book.pageW - gridW) / 2 + size / 2;
    const startY = blockTop + size / 2;

    pageSeeds.forEach((seed, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = buildPlantCard(book, startX + col * (size + gap), startY + row * (size + gap), size, seed);
      book.gridContainer.add(card);
    });
  });
}

function buildPlantCard(book, cx, cy, size, seed) {
  const scene = book.scene;
  const plant = getPlant(seed);
  const unlocked = book.collection.has(seed);

  const card = scene.add.container(cx, cy);

  const bg = scene.add.graphics();
  bg.fillStyle(unlocked ? PAPER : PAPER_LOCKED, 1);
  bg.fillRoundedRect(-size / 2, -size / 2, size, size, CARD_RADIUS);
  bg.lineStyle(unlocked ? 2 : 1.2, unlocked ? plant.rarity.color : BORDER, 1);
  bg.strokeRoundedRect(-size / 2, -size / 2, size, size, CARD_RADIUS);
  card.add(bg);

  if (unlocked) {
    const art = scene.add.graphics();
    art.setPosition(0, size / 2 - 6);
    drawPixelPlant(art, plant, size / 100, 0, null);
    card.add(art);

    const mutCount = countMutations(book, seed);
    if (mutCount > 0) {
      const r = 9;
      const bx = size / 2 - r - 2;
      const by = -size / 2 + r + 2;
      const badge = scene.add.circle(bx, by, r, GOLD).setStrokeStyle(1.5, color(DS.colors.bg.elevated));
      card.add(badge);
      card.add(scene.add.text(bx, by, `${mutCount}`, {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: DS.colors.text.inverse,
      }).setOrigin(0.5));
    }
  } else {
    card.add(scene.add.text(0, 0, '?', {
      fontSize: `${Math.max(12, Math.floor(size * 0.4))}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.muted,
    }).setOrigin(0.5));
  }

  card.setInteractive(
    new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
    Phaser.Geom.Rectangle.Contains
  );
  card.on('pointerdown', (pointer, lx, ly, event) => {
    event?.stopPropagation?.();
    book.scene.sound?.uiClick?.();
    book.openDetail(seed);
  });

  return card;
}

function countMutations(book, seed) {
  let n = 0;
  for (const id of book.collection) {
    if (typeof id === 'string' && id.startsWith(`mut_${seed}_`)) n++;
  }
  return n;
}

/** Список глав — по строке на страницу, как оглавление. */
function renderChapterList(book) {
  const origins = pageOrigins(book);
  const perPage = CHAPTER_ROWS * origins.length;
  const page = Number.isFinite(book.page) ? Math.max(0, book.page) : 0;
  const list = CHAPTERS.slice(page * perPage, page * perPage + perPage);

  if (!list.length) {
    addEmptyState(book, 'Глав пока нет');
    return;
  }

  const cardW = Math.min(book.pageW - 24, 300);
  const blockH = CHAPTER_ROWS * CHAPTER_H + (CHAPTER_ROWS - 1) * CHAPTER_GAP;
  const blockTop = book.gridTop + Math.max(0, (book.gridBottom - book.gridTop - blockH) / 2);

  list.forEach((chapter, i) => {
    const pageIdx = Math.floor(i / CHAPTER_ROWS);
    const row = i % CHAPTER_ROWS;
    const originX = origins[pageIdx] ?? origins[0];
    const cx = originX + book.pageW / 2;
    const cy = blockTop + row * (CHAPTER_H + CHAPTER_GAP) + CHAPTER_H / 2;
    book.gridContainer.add(buildChapterCard(book, cx, cy, cardW, CHAPTER_H, chapter));
  });
}

function buildChapterCard(book, cx, cy, w, h, chapter) {
  const scene = book.scene;
  const owned = chapter.seeds.filter((s) => book.collection.has(s)).length;
  const complete = owned === chapter.seeds.length;

  const card = scene.add.container(cx, cy);

  const bg = scene.add.graphics();
  bg.fillStyle(PAPER, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, CARD_RADIUS);
  bg.lineStyle(complete ? 2.5 : 1.5, complete ? GOLD : BORDER, 1);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, CARD_RADIUS);
  card.add(bg);

  card.add(scene.add.text(-w / 2 + 12, 0, chapter.icon, {
    fontSize: `${DS.font.size.lg}px`,
  }).setOrigin(0, 0.5));

  card.add(scene.add.text(-w / 2 + 44, -9, chapter.name, {
    fontSize: `${DS.font.size.sm}px`,
    fontFamily: DS.font.family.base,
    fontStyle: 'bold',
    color: DS.colors.text.primary,
    wordWrap: { width: w - 56 },
  }).setOrigin(0, 0.5));

  card.add(scene.add.text(-w / 2 + 44, 12, `${owned} / ${chapter.seeds.length}`, {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: DS.font.family.base,
    color: complete ? DS.colors.brand.dark : DS.colors.text.muted,
  }).setOrigin(0, 0.5));

  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', (pointer, lx, ly, event) => {
    event?.stopPropagation?.();
    book.scene.sound?.uiClick?.();
    book.activeChapter = chapter.id;
    book.viewMode = 'plants';
    book.page = 0;
    book.renderPage();
  });
  card.add(hit);

  return card;
}
