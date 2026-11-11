import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRemovedPlayers } from '../src/ui/PlayerList.js';

test('найдены игроки, которых больше нет в списке', () => {
  const removed = findRemovedPlayers(
    ['p1', 'p2', 'p3'],
    ['p1', 'p3']
  );
  assert.deepEqual(removed, ['p2']);
});

test('если никто не ушёл — пустой список', () => {
  const removed = findRemovedPlayers(['p1', 'p2'], ['p1', 'p2']);
  assert.deepEqual(removed, []);
});

test('ушедшие определяются при любом порядке', () => {
  const removed = findRemovedPlayers(['p1', 'p2'], ['p2']);
  assert.deepEqual(removed, ['p1']);
});

test('список поддерживает объекты с id', () => {
  const removed = findRemovedPlayers(
    [{ id: 'p1' }, { id: 'p2' }],
    [{ id: 'p1' }]
  );
  assert.deepEqual(removed, ['p2']);
});

test('пустой новый список не удаляет всех (защита от глюка)', () => {
  const removed = findRemovedPlayers(['p1', 'p2'], []);
  assert.deepEqual(removed, []);
});
