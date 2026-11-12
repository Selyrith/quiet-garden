import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  trackEvent, serializeGoals, getPlayerGoals, ensureQuests
} from '../server/goals.js';

/**
 * Счётчик «открытых видов» должен быть ОДНИМ числом.
 *
 * Раньше trackEvent писал в goals.speciesCount, а книга/tree/UI читали
 * room.collection.size — две цифры расходились, и узел дерева «25 видов»
 * не открывался, хотя книга показывала 25.
 */

test('newSpecies event keeps goals.speciesCount in sync with room collection', () => {
  const room = { playerGoals: new Map(), collection: new Set([1, 2, 3]) };
  const pid = 'p1';
  ensureQuests(room, pid);

  trackEvent(room, pid, 'newSpecies', 3);

  const goals = getPlayerGoals(room, pid);
  const wire = serializeGoals(room, pid);

  assert.equal(goals.speciesCount, 3);
  assert.equal(wire.totals.speciesCount, 3, 'serialize must agree with the counter');
});

test('speciesCount never lags behind a collection that grew elsewhere', () => {
  const room = { playerGoals: new Map(), collection: new Set([1, 2]) };
  const pid = 'p1';
  ensureQuests(room, pid);

  trackEvent(room, pid, 'newSpecies', 2);
  assert.equal(serializeGoals(room, pid).totals.speciesCount, 2);

  // другой игрок открыл ещё виды в той же комнате
  room.collection.add(7);
  room.collection.add(9);

  assert.equal(
    serializeGoals(room, pid).totals.speciesCount, 4,
    'collection is the source of truth and must win over a stale local counter'
  );
});

test('a speciesCount that is somehow ahead is not silently truncated', () => {
  const room = { playerGoals: new Map(), collection: new Set([1]) };
  const pid = 'p1';
  ensureQuests(room, pid);
  const goals = getPlayerGoals(room, pid);
  goals.speciesCount = 10; // намеренно «в будущем»

  assert.equal(
    serializeGoals(room, pid).totals.speciesCount, 10,
    'max() must not lose a legitimate larger count'
  );
});

test('newSpecies quests actually progress when the event fires', () => {
  const room = { playerGoals: new Map(), collection: new Set() };
  const pid = 'p1';
  ensureQuests(room, pid);
  const goals = getPlayerGoals(room, pid);
  // подменяем пул на квест про виды, чтобы проверить прогресс детерминированно
  goals.quests = [{ id: 'newspecies', text: 'Открой 3 новых вида', target: 3, reward: 40, event: 'newSpecies', progress: 0, claimed: false }];

  trackEvent(room, pid, 'newSpecies', 1);
  trackEvent(room, pid, 'newSpecies', 1);
  assert.equal(goals.quests[0].progress, 2);

  trackEvent(room, pid, 'newSpecies', 1);
  assert.equal(goals.quests[0].progress, 3);
});

test('other events never move a newSpecies quest', () => {
  const room = { playerGoals: new Map(), collection: new Set() };
  const pid = 'p1';
  ensureQuests(room, pid);
  const goals = getPlayerGoals(room, pid);
  goals.quests = [{ id: 'newspecies', target: 3, reward: 40, event: 'newSpecies', progress: 0, claimed: false }];

  trackEvent(room, pid, 'harvest', 5);
  assert.equal(goals.quests[0].progress, 0);
});