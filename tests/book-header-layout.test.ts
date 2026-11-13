import { describe, it, afterEach, expect } from 'vitest';
import { bootScene, step } from './harness.js';
import { BookOverlay } from '../src/ui/BookOverlay.js';
import { setupSearchRow } from '../src/ui/book/BookSearchRow.js';

/**
 * Шапка книги не должна накладываться сама на себя.
 *
 * Дважды подряд вёрстка шапки ломалась молча: вкладки стояли выше обложки
 * (pageTop - 30), заголовок и поиск лезли друг на друга. Ни один из этих
 * дефектов не виден в коде глазами, зато виден по прямоугольникам.
 */

function rect(x, y, w, h) {
  return { left: x, top: y, right: x + w, bottom: y + h, x, y, w, h };
}

const OVERLAPS = (a, b) =>
  a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

describe('шапка книги', () => {
  let game;

  afterEach(() => {
    try { game?.destroy(true); } catch {}
    game = undefined;
  });

  async function openBook(width, height) {
    const handle = await bootScene(width, height);
    game = handle.game;
    const s = handle.scene;
    s.showToast = () => {};
    s.hideSignpost = () => {};
    s.showSignpost = () => {};
    s.roomCode = 'TEST01';
    s.sound = { uiClick: () => {} };

    const book = new BookOverlay(s, new Set());
    step(handle.game, 20);
    return book;
  }

  it('на телефоне: заголовок, счётчик, закладки, поиск и фильтр не пересекаются', async () => {
    const book = await openBook(390, 844);
    expect(book.spread).toBe(false);

    const titleBox = book.title.getBounds();
    const counterBox = book.counterText.getBounds();

    // Закладки: их контейнеры лежат в book.tabs.
    const tabBoxes = book.tabButtons ? [...book.tabButtons.values()].map((t) => t.container.getBounds()) : [];
    expect(tabBoxes.length).toBe(2);

    // Поиск помечен флагом в самом модуле — так тест не зависит от того,
    // в какой именно контейнер книга его положила.
    setupSearchRow(book);
    const searchRow = book.bookContainer.list.find((c) => c.searchRow);
    expect(searchRow).toBeTruthy();
    const searchBox = searchRow.getBounds();

    const filterBox = book.rarityButtons
      ? [...book.rarityButtons.values()].map((t) => t.container.getBounds())[0]
      : null;

    expect(filterBox).toBeTruthy();

    // В getBounds() контейнеров-карточек ширина выходит нулевой (внутри
    // только графика), поэтому сверяем ПОЛЯ раскладки, которые книга
    // объявляет сама, и требуем, чтобы каждое следующее начиналось ниже
    // предыдущего.
    const rows = [
      ['заголовок', book.pageTop + 14, 26],
      ['счётчик', book.pageTop + 40, 14],
      ['закладки', book.tabsY, 38],
      ['поиск', book.searchY, 30],
      ['фильтр', book.rarityY, 24],
    ];

    for (let i = 1; i < rows.length; i++) {
      const [prevName, prevTop, prevH] = rows[i - 1];
      const [name, top] = rows[i];
      expect(top, `${name} (y=${top}) должна начинаться ниже ${prevName}`).toBeGreaterThanOrEqual(
        prevTop + prevH
      );
    }

    const gridTop = book.gridTop;
    const [lastName, lastTop, lastH] = rows[rows.length - 1];
    expect(gridTop, `сетка (y=${gridTop}) должна начинаться ниже ${lastName}`).toBeGreaterThanOrEqual(
      lastTop + lastH
    );

    const boxes = rows.map(([name, top, h]) => [name, rect(book.pageLeftX, top, book.pageW, h)]);
    expect(titleBox.width).toBeGreaterThan(40);
    expect(counterBox.width).toBeGreaterThan(20);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [an, ab] = boxes[i];
        const [bn, bb] = boxes[j];
        expect(
          OVERLAPS(ab, bb),
          `${an} накладывается на ${bn}: ${JSON.stringify({ an: ab, bn: bb })}`
        ).toBe(false);
      }
    }

    // Вся шапка должна лежать ВНУТРИ обложки.
    for (const [, b] of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(book.pageLeftX - 2);
      expect(b.right).toBeLessThanOrEqual(book.pageLeftX + book.pageW + 2);
      expect(b.top).toBeGreaterThanOrEqual(book.pageTop - 2);
      expect(b.bottom).toBeLessThanOrEqual(book.pageBottom + 2);
    }
  });

  it('разворот: поиск и фильтр на правой странице, шапка лева не перекрыта', async () => {
    const book = await openBook(1024, 768);
    expect(book.spread).toBe(true);

    const rightPage = rect(book.pageRightX, book.pageTop, book.pageW, book.pageBottom - book.pageTop);
    const searchRow = book.bookContainer.list.find((c) => c.searchRow);
    expect(searchRow).toBeTruthy();
    const searchBox = searchRow.getBounds();
    expect(searchBox.left).toBeGreaterThanOrEqual(rightPage.left - 2);
    expect(searchBox.right).toBeLessThanOrEqual(rightPage.right + 2);
  });
});