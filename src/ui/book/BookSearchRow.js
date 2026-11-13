import { escapeHtml } from '../escapeHtml.js';

export function setupSearchRow(book) {
  const scene = book.scene;
  const W = book.bookW;
  const H = book.bookH;

  const x = -W / 4;
  const y = -H / 2 + 100;
  const btnW = W / 2 - 60;
  const btnH = 36;

  const bg = scene.add.graphics();
  bg.fillStyle(0xf5e6c8, 1);
  bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 8);
  bg.lineStyle(2, 0x8d6e63, 1);
  bg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 8);
  book.bookContainer.add(bg);

  const label = scene.add.text(x, y, book.searchQuery ? `🔍 ${book.searchQuery}` : '🔍 Поиск...', {
    fontSize: '14px', color: '#3e2723', fontFamily: 'Nunito, Georgia, serif', fontStyle: 'bold'
  }).setOrigin(0.5);
  book.bookContainer.add(label);

  const clearBtn = scene.add.text(x + btnW / 2 - 16, y, '⌫', {
    fontSize: '16px', color: '#8d6e63', fontStyle: 'bold'
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  clearBtn.setVisible(!!book.searchQuery);
  book.bookContainer.add(clearBtn);

  const hit = scene.add.rectangle(x, y, btnW, btnH, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  book.bookContainer.add(hit);

  const applyQuery = (q) => {
    book.searchQuery = q;
    book.page = 0;
    book.renderPage();
    label.setText(q ? `🔍 ${q}` : '🔍 Поиск...');
    clearBtn.setVisible(!!q);
  };

  let searchDom = null;
  let searchBlocker = null;

  const openSearchEditor = () => {
    if (searchDom) return;
    const cam = scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const panelW = Math.min(340, w - 40);
    const px = w / 2;
    const py = h / 2;

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
      el = scene.add.dom(px, py).createFromHTML(html).setDepth(500).setScrollFactor(0);
    } catch (e) {
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
    }

    // Блокировка кликов вне оверлея
    searchBlocker = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0)
      .setDepth(499).setScrollFactor(0).setInteractive();
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

  hit.on('pointerdown', () => {
    openSearchEditor();
  });

  clearBtn.on('pointerdown', (pointer, localX, localY, event) => {
    if (event) event.stopPropagation();
    applyQuery('');
  });

  return { searchInput: null, searchDom: null, destroySearchDom };
}