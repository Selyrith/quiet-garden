import { escapeHtml } from '../escapeHtml.js';
import { DS } from '../DesignSystem.js';

/**
 * Строка поиска в правой странице книги.
 *
 * Было: широкая плашка во всю левую страницу с координатой от -W/4 —
 * после левого выравнивания книги она оказалась вне страницы.
 * Стало: аккуратное поле под вкладками редкости, с лупой и крестиком очистки.
 */
export function setupSearchRow(book) {
  const scene = book.scene;

  const w = book.pageW;
  const h = 30;
  const x = book.searchX ?? book.pageLeftX;
  const y = book.searchY ?? (book.pageTop + 8);

  const c = scene.add.container(x, y);
  c.searchRow = true;

  const bg = scene.add.graphics();
  bg.fillStyle(0xf9f1de, 1);
  bg.fillRoundedRect(0, 0, w, h, 8);
  bg.lineStyle(1.2, 0xcdbb9b, 1);
  bg.strokeRoundedRect(0, 0, w, h, 8);
  c.add(bg);

  const label = scene.add.text(12, h / 2, book.searchQuery ? `🔍 ${book.searchQuery}` : '🔍 Поиск по названию', {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: DS.font.family.base,
    color: book.searchQuery ? '#4a3423' : '#a3906f',
  }).setOrigin(0, 0.5);
  c.add(label);

  // Крестик очистки держим ВНУТРИ страницы: тач-таргет 34×34 с центром в 20px
  // от правой кромки — правый край не выходит за поле.
  const clearX = w - 20;
  const clear = scene.add.text(clearX, h / 2, '✕', {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: DS.font.family.base,
    color: '#8a7a66',
  }).setOrigin(0.5);
  clear.setVisible(!!book.searchQuery);
  const clearHit = scene.add.rectangle(clearX, h / 2, 34, 34, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  c.add([clear, clearHit]);

  const hit = scene.add.rectangle(w / 2, h / 2, w, Math.max(h, 42), 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  c.add(hit);

  const applyQuery = (q) => {
    book.searchQuery = q;
    book.page = 0;
    book.renderPage();
    label.setText(q ? `🔍 ${q}` : '🔍 Поиск по названию');
    label.setColor(q ? '#4a3423' : '#a3906f');
    clear.setVisible(!!q);
  };

  let searchDom = null;
  let searchBlocker = null;

  const openSearchEditor = () => {
    if (searchDom) return;
    const cam = scene.cameras.main;
    const screenW = cam.width;
    const screenH = cam.height;
    const panelW = Math.min(340, screenW - 40);

    const html = `
      <div class="note-editor" style="width:${panelW}px">
        <div class="note-title">🔍 Поиск растения</div>
        <input type="text" id="searchInput" maxlength="40"
          value="${escapeHtml(book.searchQuery || '')}"
          placeholder="Название растения..." autofocus />
        <div class="note-btns">
          <button id="searchSave" class="note-btn note-btn-save">Найти</button>
          <button id="searchCancel" class="note-btn note-btn-cancel">Отмена</button>
        </div>
      </div>
    `;

    let el;
    try {
      el = scene.add.dom(screenW / 2, screenH / 2).createFromHTML(html).setDepth(2000).setScrollFactor(0);
    } catch {
      const q = window.prompt('Поиск растения:', book.searchQuery || '');
      if (q !== null) applyQuery(q.trim().toLowerCase());
      return;
    }
    searchDom = el;

    const input = el.node.querySelector('#searchInput');
    const saveBtn = el.node.querySelector('#searchSave');
    const cancelBtn = el.node.querySelector('#searchCancel');

    const commit = () => {
      const val = input ? input.value.trim().toLowerCase() : '';
      applyQuery(val);
      destroySearchDom();
    };
    const abort = () => destroySearchDom();

    if (saveBtn) saveBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); commit(); });
    if (cancelBtn) cancelBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); abort(); });
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); commit(); }
        if (e.key === 'Escape') { e.stopPropagation(); abort(); }
      });
      setTimeout(() => { try { input.focus(); } catch {} }, 60);
    }

    searchBlocker = scene.add.rectangle(screenW / 2, screenH / 2, screenW, screenH, 0x231912, 0.45)
      .setDepth(1999).setScrollFactor(0).setInteractive();
    searchBlocker.on('pointerdown', (e) => {
      e.stopPropagation();
      abort();
    });
  };

  const destroySearchDom = () => {
    if (searchDom) {
      try { searchDom.destroy(); } catch {}
      searchDom = null;
    }
    if (searchBlocker) {
      try { searchBlocker.destroy(); } catch {}
      searchBlocker = null;
    }
  };

  hit.on('pointerdown', () => openSearchEditor());

  clearHit.on('pointerdown', (pointer, lx, ly, event) => {
    event?.stopPropagation?.();
    applyQuery('');
  });

  book.bookContainer.add(c);

  return { searchInput: null, searchDom: null, destroySearchDom };
}