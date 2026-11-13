import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE_NODES } from '../shared/goals.js';
import { applyTreeNodeEffect } from '../server/goals-handlers.js';

/**
 * Награды дерева прогресса — ДАННЫЕ, а не цепочка if-ов.
 *
 * Раньше `reward` был строкой для UI, а фактическая награда применялась
 * отдельной веткой `if (nodeId === '...')`. Новый узел без ветки выглядел
 * рабочим и не давал ничего. Теперь каждый узел обязан нести `effect`,
 * и сервер применяет его универсально.
 */

function freshRoom() {
  return {
    coins: 0,
    incomeBonusPermanent: 0,
    maxActivitiesBonus: 0,
    upgradeDiscount: 0,
    gardenRowsBonus: 0,
  };
}

test('every tree node declares an effect (no reward without a payout)', () => {
  for (const node of TREE_NODES) {
    assert.ok(
      node.effect && typeof node.effect === 'object',
      `${node.id} must declare an effect object`
    );
    assert.ok(
      Object.keys(node.effect).length > 0,
      `${node.id} effect must not be empty`
    );
  }
});

test('every declared effect key is one the server actually applies', () => {
  const applied = new Set([
    'coins', 'incomeBonusPermanent', 'maxActivitiesBonus',
    'upgradeDiscount', 'gardenRowsBonus'
  ]);
  for (const node of TREE_NODES) {
    for (const key of Object.keys(node.effect)) {
      assert.ok(applied.has(key), `${node.id}: unknown effect "${key}"`);
    }
  }
});

test('effect strings and payouts agree (UI never over-promises)', () => {
  // «+50 монет» должен действительно давать 50 монет.
  const first = TREE_NODES.find((n) => n.id === 'first');
  assert.match(first.reward, /\+50 монет/);
  assert.equal(first.effect.coins, 50);
});

test('coins reward is applied to the room', () => {
  const room = freshRoom();
  const node = TREE_NODES.find((n) => n.id === 'first');
  applyTreeNodeEffect(room, node);
  assert.equal(room.coins, 50);
});

test('income / activities / discount / rows rewards are applied', () => {
  const room = freshRoom();
  applyTreeNodeEffect(room, TREE_NODES.find((n) => n.id === 'ten'));
  applyTreeNodeEffect(room, TREE_NODES.find((n) => n.id === 'twenty5'));
  applyTreeNodeEffect(room, TREE_NODES.find((n) => n.id === 'fifty'));
  applyTreeNodeEffect(room, TREE_NODES.find((n) => n.id === 'activity15'));

  assert.equal(room.incomeBonusPermanent, 0.20);
  assert.equal(room.maxActivitiesBonus, 1);
  assert.equal(room.upgradeDiscount, 0.10);
  assert.equal(room.gardenRowsBonus, 1);
});

test('upgradeDiscount takes the maximum, never a sum', () => {
  const room = freshRoom();
  const node = TREE_NODES.find((n) => n.id === 'fifty');
  applyTreeNodeEffect(room, node);
  applyTreeNodeEffect(room, node);
  // повторное применение не должно сложиться в 0.2 — это ломало бы цены
  assert.equal(room.upgradeDiscount, 0.10);
});

test('a node without an effect is a safe no-op', () => {
  const room = freshRoom();
  applyTreeNodeEffect(room, { id: 'ghost', effect: null });
  assert.deepEqual(room, freshRoom());
});

test('an unknown effect key does not crash and does not apply', () => {
  const room = freshRoom();
  const err = console.error;
  let logged = '';
  console.error = (...a) => { logged += a.join(' '); };
  try {
    applyTreeNodeEffect(room, { id: 'weird', effect: { notARealField: 5 } });
  } finally {
    console.error = err;
  }
  assert.equal(room.coins, 0);
  assert.match(logged, /неизвестный эффект/, 'must surface, not silently ignore');
});