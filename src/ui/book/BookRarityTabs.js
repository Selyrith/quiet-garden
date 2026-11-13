import { DS } from '../DesignSystem.js';

/**
 * Фильтр редкости на правой странице книги — ряд «перьев-закладок».
 *
 * Раньше вкладки рисовались в точке y = -H/2 (верх книги) и уезжали под
 * обложку. Теперь позиция приходит из привязок книги: над правой страницей,
 * под строкой поиска. Активная — тёмно-зелёная с золотой каймой.
 */

export const RARITY_TABS = [
  { id: 'all',       label: 'Все' },
  { id: 'common',    label: 'Обыч.' },
  { id: 'uncommon',  label: 'Необ.' },
  { id: 'rare',      label: 'Редк.' },
  { id: 'epic',      label: 'Эпик.' },
  { id: 'legendary', label: 'Лег.' },
];

export function setupRarityTabs(book) {
  const scene = book.scene;

  const gap = 4;
  const tabH = 24;
  const x0 = book.rarityX ?? book.pageLeftX;
  const y = book.rarityY ?? (book.pageTop + 42);
  const availableW = book.pageW;
  const tabW = Math.min(52, Math.floor((availableW - (RARITY_TABS.length - 1) * gap) / RARITY_TABS.length));

  const buttons = new Map();

  RARITY_TABS.forEach((tab, i) => {
    const x = x0 + i * (tabW + gap);
    const c = scene.add.container(x, y);

    const bg = scene.add.graphics();
    const drawBg = (active) => {
      bg.clear();
      bg.fillStyle(active ? 0x4a7c59 : 0xe4d4b5, 1);
      bg.fillRoundedRect(0, 0, tabW, tabH, 6);
      bg.lineStyle(1.2, active ? 0xe8c55a : 0xcbb896, 1);
      bg.strokeRoundedRect(0, 0, tabW, tabH, 6);
    };
    drawBg(book.activeRarity === tab.id);
    c.add(bg);

    const text = scene.add.text(tabW / 2, tabH / 2, tab.label, {
      fontSize: '9px',
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: book.activeRarity === tab.id ? '#f7ecd5' : '#6b5a44',
    }).setOrigin(0.5);
    c.add(text);

    const hit = scene.add.rectangle(tabW / 2, tabH / 2, tabW, Math.max(tabH, 40), 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      if (book.activeRarity === tab.id) return;
      book.activeRarity = tab.id;
      book.page = 0;
      book.renderPage();
    });
    c.add(hit);

    // Обновляем цвет подписи вместе с фоном.
    const wrappedDraw = (active) => {
      drawBg(active);
      text.setColor(active ? '#f7ecd5' : '#6b5a44');
    };
    buttons.set(tab.id, { container: c, bg, text, drawBg: wrappedDraw });
    book.bookContainer.add(c);
  });

  return buttons;
}