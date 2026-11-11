import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPlayerList } from '../src/ui/PlayerList.js';

test('список игроков показывает ники', () => {
  const text = formatPlayerList([
    { id: 'p1', nickname: 'Хост', isHost: true },
    { id: 'p2', nickname: 'Друг', isHost: false },
  ], 'p1');
  assert.match(text, /Хост/);
  assert.match(text, /Друг/);
});

test('хост помечен короной', () => {
  const text = formatPlayerList([
    { id: 'p1', nickname: 'Хост', isHost: true },
    { id: 'p2', nickname: 'Друг', isHost: false },
  ], 'p1');
  assert.match(text, /👑/);
});

test('свой игрок помечен как «Вы»', () => {
  const text = formatPlayerList([
    { id: 'p1', nickname: 'Хост', isHost: true },
    { id: 'p2', nickname: 'Друг', isHost: false },
  ], 'p1');
  assert.match(text, /Вы/);
});

test('чужие игроки без пометки «Вы»', () => {
  const text = formatPlayerList([
    { id: 'p1', nickname: 'Хост', isHost: true },
    { id: 'p2', nickname: 'Друг', isHost: false },
  ], 'p2');
  const parts = text.split('  ·  ');
  assert.equal(parts.length, 2);
  // p1 — чужой игрок, пометки «(Вы)» у него быть не должно
  assert.ok(!parts[0].includes('Вы'));
  // а у себя (p2) — должна быть
  assert.ok(parts[1].includes('Вы'));
});

test('без списка игроков — пустая строка', () => {
  assert.equal(formatPlayerList([], 'p1'), '');
});

test('игрок без ника получает заглушку', () => {
  const text = formatPlayerList([{ id: 'p1', isHost: false }], 'p1');
  assert.match(text, /Игрок/);
});

test('список из одних id (старый формат) не ломает вывод', () => {
  const text = formatPlayerList(['p1', 'p2'], 'p1');
  assert.equal(typeof text, 'string');
  assert.ok(text.length > 0);
});
