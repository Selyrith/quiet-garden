import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * РЕГРЕССИЯ: «вкладка с яйцом питомца открывается, но там ничего нет».
 *
 * Причина оказалась не в самой модалке, а в DOM-слое Phaser:
 *
 *  1. Phaser добавляет свой DOM-контейнер в родителя РАНЬШЕ, чем canvas
 *     (Game.js: CreateDOMContainer -> AddToDOM(canvas)). Без z-index слой
 *     с полем ввода оказывается ПОД непрозрачным canvas: окно выглядит
 *     пустым, а <input> не видно.
 *  2. domPointerEvents по умолчанию 'none' — контейнер не пропускает
 *     события, поэтому поле ввода не получает тап даже когда видно.
 *
 * Оба места проверяем статически: поднять Phaser в Node нельзя, а
 * поведение слоёв однозначно определяется этими двумя настройками.
 */

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

test('DOM-слой Phaser поднят над canvas (иначе окно с вводом выглядит пустым)', () => {
  assert.match(
    html,
    /#game-container\s*>\s*div\s*\{[^}]*z-index/,
    'DOM-контейнер Phaser должен иметь z-index выше canvas'
  );
  assert.match(
    html,
    /#game-container\s*>\s*canvas\s*\{[^}]*z-index/,
    'canvas должен лежать ниже DOM-слоя'
  );
});

test('DOM-слой Phaser получает pointer-events (иначе поле ввода не нажимается)', () => {
  assert.match(
    main,
    /dom:\s*\{[^}]*pointerEvents:\s*'auto'/,
    "dom.pointerEvents должен быть 'auto' — по умолчанию Phaser ставит 'none'"
  );
  assert.match(main, /dom:\s*\{[^}]*createContainer:\s*true/, 'DOM-контейнер должен быть включён');
});

test('модалка питомца помещается на низком экране', () => {
  const scene = fs.readFileSync(path.join(ROOT, 'src/scenes/GameScene.js'), 'utf8');
  // Панель должна считаться от высоты экрана, а не быть жёстко 440.
  assert.match(
    scene,
    /panelH\s*=\s*Math\.min\(\s*\d+\s*,\s*h\s*-\s*\d+\s*\)/,
    'высота модалки должна подстраиваться под экран'
  );
});