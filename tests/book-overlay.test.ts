import { describe, it, afterEach, expect } from 'vitest';
import { bootScene, step } from './harness.js';
import { BookOverlay } from '../src/ui/BookOverlay.js';

/**
 * Книга должна реально открываться и быть видимой на экране телефона.
 *
 * Регрессия, которую ловит тест: после перевода книги на общий скелет
 * (ui-kit, режим bare) она могла падать в конструкторе — и тогда по тапу
 * «Книга растений» просто ничего не происходило.
 */

async function openBook(width, height, seeds = []) {
  const handle = await bootScene(width, height);
  const { scene } = handle;
  scene.showToast = () => {};
  scene.hideSignpost = () => {};
  scene.showSignpost = () => {};
  scene.roomCode = 'TEST01';
  scene.sound = { uiClick: () => {}, error: () => {} };

  const book = new BookOverlay(scene, new Set(seeds));
  step(handle.game, 20);
  return { ...handle, book };
}

describe('BookOverlay', () => {
  let game;

  afterEach(() => {
    try { game?.destroy(true); } catch {}
    game = undefined;
  });

  it('открывается на телефоне и умещается в экран', async () => {
    const ctx = await openBook(390, 844);
    game = ctx.game;
    const { book, scene } = ctx;

    expect(book).toBeTruthy();
    expect(book.spread).toBe(false);

    // Контент книги собран и виден.
    expect(book.ui.body.list.length).toBeGreaterThan(8);
    expect(book.ui.body.alpha).toBeGreaterThan(0.9);

    // Обложка целиком в пределах экрана.
    const { panelX, panelY, panelW, panelH } = book.ui;
    expect(panelX).toBeGreaterThanOrEqual(0);
    expect(panelY).toBeGreaterThanOrEqual(0);
    expect(panelX + panelW).toBeLessThanOrEqual(scene.cameras.main.width);
    expect(panelY + panelH).toBeLessThanOrEqual(scene.cameras.main.height);

    // Сетка построена, её верх выше низа страницы, страница не микроскопическая.
    expect(book.gridContainer.list.length).toBeGreaterThan(0);
    expect(book.gridTop).toBeLessThan(book.pageBottom);
    expect(book.pageW).toBeGreaterThan(100);
  });

  it('на широком экране включает разворот, на узком — одна страница', async () => {
    const wide = await openBook(1024, 768);
    expect(wide.book.spread).toBe(true);
    wide.game.destroy(true);

    const narrow = await openBook(320, 568);
    expect(narrow.book.spread).toBe(false);
    narrow.game.destroy(true);
  });

  it('строит карточки для открытого растения', async () => {
    const { getAllSeeds } = await import('../shared/plants.js');
    const first = getAllSeeds()[0];
    const ctx = await openBook(390, 844, [first]);
    game = ctx.game;

    expect(ctx.book.collection.size).toBe(1);
    expect(ctx.book.gridContainer.list.length).toBeGreaterThan(0);
  });
});