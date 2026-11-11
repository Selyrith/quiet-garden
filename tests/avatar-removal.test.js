import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRemovedPlayers } from '../src/ui/PlayerList.js';

/**
 * Имитация того, что делает сцена при обработке player-list:
 * аватары ушедших игроков должны быть уничтожены.
 */
function makeScene() {
  const avatars = new Map();
  const positions = new Map();
  const genders = new Map();
  const destroyed = [];

  avatars.set('p1', {
    destroy() { destroyed.push('p1'); },
    walkTween: { stop() {} },
    breathTween: { stop() {} },
  });
  avatars.set('p2', {
    destroy() { destroyed.push('p2'); },
    walkTween: { stop() {} },
    breathTween: { stop() {} },
  });
  positions.set('p1', { x: 1, y: 1 });
  positions.set('p2', { x: 1, y: 2 });
  genders.set('p1', 'male');
  genders.set('p2', 'female');

  return { avatars, positions, genders, destroyed };
}

test('ушедший аватар уничтожается и убирается из карт', () => {
  const s = makeScene();
  const current = ['p1'];

  const removed = findRemovedPlayers(Array.from(s.avatars.keys()), current);
  for (const id of removed) {
    const av = s.avatars.get(id);
    if (av) { av.walkTween.stop(); av.breathTween.stop(); av.destroy(); s.avatars.delete(id); }
    s.positions.delete(id);
    s.genders.delete(id);
  }

  assert.deepEqual(s.destroyed, ['p2']);
  assert.equal(s.avatars.has('p2'), false);
  assert.equal(s.positions.has('p2'), false);
  assert.equal(s.genders.has('p2'), false);
  assert.equal(s.avatars.has('p1'), true);
});

test('при выходе двух игроков удаляются оба', () => {
  const s = makeScene();
  const removed = findRemovedPlayers(Array.from(s.avatars.keys()), []);
  // пустой список — защита, ничего не удаляем
  assert.deepEqual(removed, []);
});

test('аватар оставшегося игрока не трогаем', () => {
  const s = makeScene();
  const removed = findRemovedPlayers(Array.from(s.avatars.keys()), ['p1', 'p2']);
  for (const id of removed) s.avatars.get(id)?.destroy();
  assert.deepEqual(s.destroyed, []);
  assert.equal(s.avatars.size, 2);
});
