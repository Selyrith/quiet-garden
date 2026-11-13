import Phaser from 'phaser';
import { getAllSeeds, getSeedsByRarity, getPlant, TOTAL_PLANTS } from '../../../shared/plants.js';
import { CHAPTERS } from '../../../shared/chapters.js';
import { drawPixelPlant } from '../PixelArt.js';

export function renderGrid(book, allSeeds) {
  console.log('[renderGrid] called viewMode=', book?.viewMode, 'activeChapter=', book?.activeChapter, 'page=', book?.page, 'seedsLen=', allSeeds?.length);

  if (book && book.gridContainer) {
    book.gridContainer.removeAll(true);
  }

  if (!book || !allSeeds || !allSeeds.length) {
    console.log('[renderGrid] early return — no data');
    return;
  }

  // Если активна глава — рендерим только seeds этой главы
  if (book.activeChapter) {
    const chapter = CHAPTERS.find(c => c.id === book.activeChapter);
    if (chapter) {
      return renderChapterSeeds(book, chapter.seeds);
    }
    // Глава не найдена — сбрасываем на список
    book.activeChapter = null;
  }

  // Если режим глав — показываем список глав
  if (book.viewMode === 'chapters') {
    return renderChapterList(book);
  }

  // Режим «Все растения» — рендерим сетку
  const page = (typeof book.page === 'number' && !isNaN(book.page)) ? book.page : 0;
  const startIdx = page * 32;
  const pageSeeds = allSeeds.slice(startIdx, startIdx + 32);

  const W = book.bookW;
  const H = book.bookH;

  // Зона для сетки (оставляем место для заголовка сверху и пейджера снизу)
  const gridTop = -H / 2 + 100;
  const gridBottom = H / 2 - 60;
  const availableH = gridBottom - gridTop;

  const colsPerPage = 4; // 4 колонки
  const rows = 4;        // 4 ряда
  const gap = 10;

  const cardSize = Math.min(
    Math.floor((availableH - (rows - 1) * gap) / rows),
    Math.floor((W / 2 - 60 - (colsPerPage - 1) * gap) / colsPerPage),
    100
  );

  const totalW = colsPerPage * cardSize + (colsPerPage - 1) * gap;
  const totalH = rows * cardSize + (rows - 1) * gap;

  // Центры левой и правой страницы
  const leftCenterX = -W / 4;
  const rightCenterX = W / 4;
  const centerY = gridTop + availableH / 2;

  // Если страницы не получилось (последние страницы могут быть частичными), не пустим пустые карточки
  const actualCount = pageSeeds.length > 0 ? pageSeeds.length : 0;

  pageSeeds.forEach((seed, idx) => {
    const isLeftPage = idx < 16;
    const localIdx = isLeftPage ? idx : idx - 16;

    const row = Math.floor(localIdx / colsPerPage);
    const col = localIdx % colsPerPage;

    const startX = (isLeftPage ? leftCenterX : rightCenterX) - totalW / 2 + cardSize / 2;
    const startY = centerY - totalH / 2 + cardSize / 2;

    const cx = startX + col * (cardSize + gap);
    const cy = startY + row * (cardSize + gap);

    const plant = getPlant(seed);
    const unlocked = book.collection.has(seed);

    const card = book.scene.add.container(cx, cy);

    // Фон карточки
    const bgCard = book.scene.add.graphics();
    bgCard.fillStyle(unlocked ? 0xf5e6c8 : 0xe0d0b0, 1);
    bgCard.fillRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, 6);
    bgCard.lineStyle(2, unlocked ? plant.rarity.color : 0x8d6e63, 1);
    bgCard.strokeRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, 6);
    card.add(bgCard);

    if (unlocked) {
      const g = book.scene.add.graphics();
      g.setPosition(0, cardSize / 2 - 6);
      drawPixelPlant(g, plant, cardSize / 100, 0, null);
      card.add(g);

      // Бейдж мутации — единый цвет
      let mutCount = 0;
      for (const id of book.collection) {
        if (typeof id === 'string' && id.startsWith(`mut_${seed}_`)) mutCount++;
      }
      if (mutCount > 0) {
        const bR = 9;
        const bx = cardSize / 2 - bR - 2;
        const by = -cardSize / 2 + bR + 2;
        const badgeBg = book.scene.add.circle(bx, by, bR, 0xe8c55a).setStrokeStyle(1.5, 0xfcf8f0);
        card.add(badgeBg);
        card.add(book.scene.add.text(bx, by, `${mutCount}`, {
          fontSize: '10px', color: '#fcf8f0', fontStyle: 'bold'
        }).setOrigin(0.5));
      }
    } else {
      card.add(book.scene.add.text(0, 0, '?', {
        fontSize: `${Math.floor(cardSize * 0.4)}px`, color: '#8a7a66', fontStyle: 'bold'
      }).setOrigin(0.5));
    }

    card.setInteractive(
      new Phaser.Geom.Rectangle(-cardSize / 2, -cardSize / 2, cardSize, cardSize),
      Phaser.Geom.Rectangle.Contains
    );
    card.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      book.openDetail(seed);
    });

    book.gridContainer.add(card);
  });

  // Если карточек нет — подсказка
  if (actualCount === 0) {
    book.gridContainer.add(book.scene.add.text(0, 0, 'Ничего не найдено...', {
      fontSize: '18px', color: '#8a7a66', fontStyle: 'italic', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5));
  }
}

function renderChapterList(book) {
  const scene = book.scene;
  const W = book.bookW;
  const H = book.bookH;

  const colsPerPage = 1; // по 1 колонке на страницу
  const rows = 5;        // 5 строк
  const gap = 12;

  // Вычисляем размеры карточки от ширины половины книги (одной страницы)
  const pageW = W / 2 - 40; // отступы по краям страницы
  const rectW = Math.min(pageW, 220);
  const rectH = 50; // чуть тоньше, чтобы 5 штук влезли по высоте

  // Центры левой и правой страницы
  const leftCenterX = -W / 4;
  const rightCenterX = W / 4;

  // Общая высота сетки для центрирования
  const totalH = rows * rectH + (rows - 1) * gap;
  const startY = -totalH / 2 + rectH / 2 + 20; // +20 — сдвиг вниз под заголовок

  CHAPTERS.forEach((ch, idx) => {
    const owned = ch.seeds.filter(s => book.collection.has(s)).length;
    const complete = ch.seeds.every(s => book.collection.has(s));

    const isLeftPage = idx < 5;
    const localIdx = isLeftPage ? idx : idx - 5;

    const cx = (isLeftPage ? leftCenterX : rightCenterX);
    const cy = startY + localIdx * (rectH + gap);

    const rect = scene.add.container(cx, cy);

    // Фон
    const bg = scene.add.graphics();
    bg.fillStyle(0xf5e6c8, 1);
    bg.fillRoundedRect(-rectW / 2, -rectH / 2, rectW, rectH, 8);
    if (complete) {
      bg.lineStyle(3, 0xe8c55a, 1);
    } else {
      bg.lineStyle(2, ch.color, 1);
    }
    bg.strokeRoundedRect(-rectW / 2, -rectH / 2, rectW, rectH, 8);
    rect.add(bg);

    // Иконка
    rect.add(scene.add.text(-rectW / 2 + 12, 0, ch.icon, {
      fontSize: '20px'
    }).setOrigin(0, 0.5));

    // Название
    rect.add(scene.add.text(-rectW / 2 + 40, -8, ch.name, {
      fontSize: '13px', color: '#5d4037', fontStyle: 'bold', fontFamily: 'Nunito, Georgia, serif',
      wordWrap: { width: rectW - 50 }
    }).setOrigin(0, 0.5));

    // Прогресс X/8
    rect.add(scene.add.text(-rectW / 2 + 40, 12, `${owned} / ${ch.seeds.length}`, {
      fontSize: '11px', color: complete ? '#c9a884' : '#8d6e63', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0, 0.5));

    // Клик — открываем главу
    const hit = scene.add.rectangle(0, 0, rectW, rectH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      book.activeChapter = ch.id;
      book.viewMode = 'plants';
      book.page = 0;
      book.renderPage();
    });
    rect.add(hit);

    book.gridContainer.add(rect);
  });
}

function renderChapterSeeds(book, chapterSeeds) {
  const scene = book.scene;

  // Переопределяем seeds на seeds этой главы
  const pageSeeds = chapterSeeds;

  const W = book.bookW;
  const H = book.bookH;

  const gridTop = -H / 2 + 100;
  const gridBottom = H / 2 - 60;
  const availableH = gridBottom - gridTop;

  const colsPerPage = 4;
  const rows = 4;
  const gap = 10;

  const cardSize = Math.min(
    Math.floor((availableH - (rows - 1) * gap) / rows),
    Math.floor((W / 2 - 60 - (colsPerPage - 1) * gap) / colsPerPage),
    100
  );

  const totalW = colsPerPage * cardSize + (colsPerPage - 1) * gap;
  const totalH = rows * cardSize + (rows - 1) * gap;

  const leftCenterX = -W / 4;
  const rightCenterX = W / 4;
  const centerY = gridTop + availableH / 2;

  pageSeeds.forEach((seed, idx) => {
    const isLeftPage = idx < 16;
    const localIdx = isLeftPage ? idx : idx - 16;

    const row = Math.floor(localIdx / colsPerPage);
    const col = localIdx % colsPerPage;

    const startX = (isLeftPage ? leftCenterX : rightCenterX) - totalW / 2 + cardSize / 2;
    const startY = centerY - totalH / 2 + cardSize / 2;

    const cx = startX + col * (cardSize + gap);
    const cy = startY + row * (cardSize + gap);

    const plant = getPlant(seed);
    const unlocked = book.collection.has(seed);

    const card = scene.add.container(cx, cy);

    const bgCard = scene.add.graphics();
    bgCard.fillStyle(unlocked ? 0xf5e6c8 : 0xe0d0b0, 1);
    bgCard.fillRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, 6);
    bgCard.lineStyle(2, unlocked ? plant.rarity.color : 0x8d6e63, 1);
    bgCard.strokeRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, 6);
    card.add(bgCard);

    if (unlocked) {
      const g = scene.add.graphics();
      g.setPosition(0, cardSize / 2 - 6);
      drawPixelPlant(g, plant, cardSize / 100, 0, null);
      card.add(g);

      let mutCount = 0;
      for (const id of book.collection) {
        if (typeof id === 'string' && id.startsWith(`mut_${seed}_`)) mutCount++;
      }
      if (mutCount > 0) {
        const bR = 9;
        const bx = cardSize / 2 - bR - 2;
        const by = -cardSize / 2 + bR + 2;
        const badgeBg = scene.add.circle(bx, by, bR, 0xe8c55a).setStrokeStyle(1.5, 0xfcf8f0);
        card.add(badgeBg);
        card.add(scene.add.text(bx, by, `${mutCount}`, {
          fontSize: '10px', color: '#fcf8f0', fontStyle: 'bold'
        }).setOrigin(0.5));
      }
    } else {
      card.add(scene.add.text(0, 0, '?', {
        fontSize: `${Math.floor(cardSize * 0.4)}px`, color: '#8a7a66', fontStyle: 'bold'
      }).setOrigin(0.5));
    }

    card.setInteractive(
      new Phaser.Geom.Rectangle(-cardSize / 2, -cardSize / 2, cardSize, cardSize),
      Phaser.Geom.Rectangle.Contains
    );
    card.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      book.openDetail(seed);
    });

    book.gridContainer.add(card);
  });

  if (pageSeeds.length === 0) {
    book.gridContainer.add(scene.add.text(0, 0, 'Ничего не найдено...', {
      fontSize: '18px', color: '#8a7a66', fontStyle: 'italic', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5));
  }
}
