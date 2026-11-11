import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNickname } from '../shared/player.js';

test('введённый ник важнее старого ника в профиле', () => {
  assert.equal(resolveNickname('Старый', 'Новый'), 'Новый');
});

test('если введённого ника нет — берём ник из профиля', () => {
  assert.equal(resolveNickname('ИзПрофиля', ''), 'ИзПрофиля');
  assert.equal(resolveNickname('ИзПрофиля', '   '), 'ИзПрофиля');
});

test('невалидный введённый ник игнорируется, используется профиль', () => {
  assert.equal(resolveNickname('ИзПрофиля', 'Я'), 'ИзПрофиля');
});

test('если нет ни того, ни другого — заглушка с id', () => {
  assert.equal(resolveNickname('', '', 'p_ab12cd'), 'Игрок_ab12cd');
});

test('одинаковые ники не считаются конфликтом', () => {
  assert.equal(resolveNickname('Один', 'Один'), 'Один');
});
