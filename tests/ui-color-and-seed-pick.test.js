import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI = path.join(ROOT, 'src/ui');

/**
 * Две реальные поломки, найденные при тестировании:
 *
 *  1. «В выборе ролей нет описания». Токены палитры UI.* — ЧИСЛА (0x5c4a3a),
 *     а Phaser для свойства Text `color` ждёт CSS-строку ('#5c4a3a').
 *     Число 6048314 не парсится как цвет -> текст рисуется невидимым.
 *     Лечение: UI.css.* — строковые двойники, и `color:` берёт только их.
 *
 *  2. «Инвентарь есть, но семя не выбрать». В createSeedSlot обработчик
 *     pointerdown вызывал this.update(inventory, seedId), но `inventory` —
 *     параметр ДРУГОЙ функции (update). В ES-модуле это ReferenceError:
 *     тап по семени падал, selectedSeedId не выставлялся, онбординг
 *     (шаг 1 ждёт выбора семени) не продвигался.
 */

const files = [];
for (const dir of [UI, path.join(ROOT, 'src/scenes')]) {
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.js')) files.push(path.join(dir, f));
  }
}

const NUMERIC_TOKENS = ['textDark', 'textMuted', 'textSecondary', 'textLight',
  'woodHi', 'woodDark', 'woodMid', 'parchment', 'error', 'gold', 'goldHi', 'leaf'];

test('в color: не передаются числовые токены палитры', () => {
  const offenders = [];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/\bcolor\s*:/.test(line)) continue;
      for (const t of NUMERIC_TOKENS) {
        // color: UI.textDark  (но НЕ UI.css.textDark)
        const re = new RegExp(`color\\s*:\\s*UI\\.${t}\\b`);
        if (re.test(line)) offenders.push(`${path.basename(file)}:${i + 1} ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `числовые токены в color:\n${offenders.join('\n')}`);
});

test('UI.css содержит строковый двойник для каждого токена', async () => {
  const { UI: theme } = await import('../src/ui/ui-theme.js');
  assert.ok(theme.css && typeof theme.css === 'object', 'UI.css должен существовать');
  for (const t of NUMERIC_TOKENS) {
    if (theme[t] === undefined) continue;
    assert.match(theme.css[t], /^#[0-9a-f]{6}$/i, `UI.css.${t} должен быть CSS-строкой`);
  }
});

test('обработчик слота инвентаря не ссылается на чужую область видимости', () => {
  const src = fs.readFileSync(path.join(UI, 'InventoryBar.js'), 'utf8');

  const start = src.indexOf('createSeedSlot(');
  assert.ok(start > 0, 'createSeedSlot должен существовать');
  const body = src.slice(start);

  // Голый `inventory` (без this.) — это ReferenceError в ES-модуле.
  const bare = body.match(/(?<!\.)\binventory\b/g);
  assert.equal(bare, null, 'в createSeedSlot нельзя использовать `inventory` без this.');

  assert.match(body, /this\.inventory/, 'должен использоваться this.inventory');
});

test('update() сохраняет инвентарь на экземпляре', () => {
  const src = fs.readFileSync(path.join(UI, 'InventoryBar.js'), 'utf8');
  const updateStart = src.indexOf('  update(inventory, activeSeedId)');
  assert.ok(updateStart > 0, 'update должен существовать');
  const body = src.slice(updateStart, updateStart + 700);
  assert.match(body, /this\.inventory\s*=\s*inventory/, 'update должен кэшировать инвентарь');
});

test('онбординг продвигается при выборе семени', () => {
  const src = fs.readFileSync(path.join(UI, 'InventoryBar.js'), 'utf8');
  assert.match(
    src,
    /onboarding[\s\S]{0,200}?step\s*===\s*1[\s\S]{0,200}?next\(\)/,
    'шаг 1 онбординга должен завершаться выбором семени'
  );
});