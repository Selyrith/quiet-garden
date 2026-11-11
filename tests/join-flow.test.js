import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoJoin, needsNickname } from '../src/join-flow.js';

test('без кода комнаты в ссылке авто-входа нет', () => {
  assert.equal(shouldAutoJoin({ room: '' }), false);
  assert.equal(shouldAutoJoin({ room: null }), false);
  assert.equal(shouldAutoJoin({ room: undefined }), false);
});

test('с кодом комнаты авто-вход тоже не делается — сначала спрашиваем ник', () => {
  assert.equal(shouldAutoJoin({ room: 'ABC123' }), false);
});

test('ник обязателен для входа в комнату', () => {
  assert.equal(needsNickname(''), true);
  assert.equal(needsNickname('  '), true);
  assert.equal(needsNickname('Я'), true);
  assert.equal(needsNickname('Яна'), false);
});

test('валидный ник проходит проверку', () => {
  assert.equal(needsNickname('Садовник'), false);
  assert.equal(needsNickname('Иван_2'), false);
});
