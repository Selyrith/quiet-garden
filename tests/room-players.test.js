import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findSpawnTile,
  buildPlayerEntry,
  buildPlayerList,
} from '../shared/room-players.js';

test('первый игрок встаёт на клетку 1,1', () => {
  assert.equal(findSpawnTile([]), '1,1');
});

test('второй игрок встаёт на свободную клетку рядом', () => {
  const spawn = findSpawnTile(['1,1']);
  assert.notEqual(spawn, '1,1');
  assert.ok(/^\d+,\d+$/.test(spawn));
});

test('занятые клетки не выдаются повторно', () => {
  const taken = ['1,1', '2,1', '1,2'];
  const spawn = findSpawnTile(taken);
  assert.ok(!taken.includes(spawn));
});

test('запись игрока содержит ник, координаты и флаг хоста', () => {
  const entry = buildPlayerEntry({
    playerId: 'p1',
    nickname: 'Хост',
    tileKey: '1,1',
    gender: 'male',
    isHost: true,
  });
  assert.equal(entry.id, 'p1');
  assert.equal(entry.nickname, 'Хост');
  assert.equal(entry.x, 1);
  assert.equal(entry.y, 1);
  assert.equal(entry.isHost, true);
});

test('без ника подставляется безопасная заглушка', () => {
  const entry = buildPlayerEntry({
    playerId: 'p1',
    nickname: '   ',
    tileKey: '3,4',
    gender: 'male',
  });
  assert.equal(entry.nickname, 'Игрок');
  assert.equal(entry.isHost, false);
});

test('список игроков содержит ники и отмечает хоста', () => {
  const list = buildPlayerList([
    { id: 'p1', nickname: 'Хост', x: 1, y: 1, isHost: true },
    { id: 'p2', nickname: 'Друг', x: 2, y: 1, isHost: false },
  ]);
  assert.equal(list.length, 2);
  assert.equal(list[0].nickname, 'Хост');
  assert.equal(list[0].isHost, true);
  assert.equal(list[1].isHost, false);
});

test('в списке игроков первый — хост, если хост назначен', () => {
  const list = buildPlayerList([
    { id: 'p2', nickname: 'Друг', x: 2, y: 1, isHost: false },
    { id: 'p1', nickname: 'Хост', x: 1, y: 1, isHost: true },
  ]);
  assert.equal(list[0].id, 'p1');
});
