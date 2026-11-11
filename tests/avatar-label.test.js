import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAvatarLabel } from '../src/ui/PlayerAvatar.js';

test('подпись аватара содержит ник', () => {
  assert.equal(formatAvatarLabel('Вася', false), 'Вася');
});

test('у хоста над аватаром корона', () => {
  assert.equal(formatAvatarLabel('Вася', true), '👑 Вася');
});

test('без ника подпись не показывается', () => {
  assert.equal(formatAvatarLabel('', false), '');
  assert.equal(formatAvatarLabel('   ', false), '');
  assert.equal(formatAvatarLabel(null, true), '');
});
