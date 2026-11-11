import { UNIFIED } from '../ui-unified.js';

export const RARITY_TABS = [
  { id: 'all',       name: 'Все',   },
  { id: 'common',    name: 'Обыч.', },
  { id: 'uncommon',  name: 'Необ.', },
  { id: 'rare',      name: 'Редк.', },
  { id: 'epic',      name: 'Эпик.', },
  { id: 'legendary', name: 'Лег.',  },
];

export function setupRarityTabs(book) {
  const scene = book.scene;

  const W = book.bookW;
  const H = book.bookH;

  // Адаптивные размеры: 6 вкладок должны влезать в ширину книги
  const maxTabsWidth = W - 40;
  const gap = 4;
  const tabW = Math.min(44, Math.floor((maxTabsWidth - (RARITY_TABS.length - 1) * gap) / RARITY_TABS.length));
  const tabH = 24;

  const totalW = RARITY_TABS.length * tabW + (RARITY_TABS.length - 1) * gap;
  const startX = -totalW / 2 + tabW / 2;
  const tabY = -H / 2;

  const buttons = new Map();

  RARITY_TABS.forEach((tab, i) => {
    const x = startX + i * (tabW + gap);

    const container = scene.add.container(x, tabY);

    const bg = scene.add.graphics();

    const drawBg = (isActive) => {
      bg.clear();

      // Фон закладки — единый цвет при активной, secondary при неактивной
      bg.fillStyle(isActive ? UNIFIED.color : UNIFIED.secondary, 1);
      bg.fillRoundedRect(-tabW / 2, -tabH, tabW, tabH + 10, { tl: 6, tr: 6, bl: 0, br: 0 });

      // Обводка
      bg.lineStyle(1.5, 0x5d4037, 1);
      bg.lineBetween(-tabW / 2, -tabH + 6, -tabW / 2, 5);
      bg.lineBetween(tabW / 2, -tabH + 6, tabW / 2, 5);
      bg.beginPath();
      bg.arc(0, -tabH + 6, tabW / 2, Math.PI, 0, false);
      bg.strokePath();

      // Блик для активной
      if (isActive) {
        bg.fillStyle(0xffffff, 0.2);
        bg.fillRoundedRect(-tabW / 2, -tabH, tabW, tabH + 10, { tl: 6, tr: 6, bl: 0, br: 0 });
      }
    };

    drawBg(book.activeRarity === tab.id);

    const textColor = book.activeRarity === tab.id ? '#ffffff' : '#ffffff';
    const text = scene.add.text(0, -tabH / 2, tab.name, {
      fontSize: '12px', color: textColor, fontStyle: 'bold', fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Клик
    const hit = scene.add.rectangle(0, -tabH / 2, tabW, tabH, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      if (book.activeRarity === tab.id) return;
      book.activeRarity = tab.id;
      book.page = 0;
      book.animatePageTurn('left', () => {
        book.renderPage();
      });
    });

    container.add(hit);
    book.bookContainer.add(container);

    buttons.set(tab.id, { container, bg, text, drawBg });
  });

  return buttons;
}
