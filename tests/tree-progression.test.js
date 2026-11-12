import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE_START_NEXT_LEVEL, getNextTreeLevelAt } from '../shared/balance.js';

test('tree progression uses gentle 1.35x scaling from 50', () => {
  assert.equal(TREE_START_NEXT_LEVEL, 50);
  assert.equal(getNextTreeLevelAt(50), 67);
  assert.equal(getNextTreeLevelAt(67), 90);
  assert.equal(getNextTreeLevelAt(90), 121);
});
