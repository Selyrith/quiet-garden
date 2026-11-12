import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSeedSellPrice, SEED_SELL_BACK_RATIO } from '../shared/balance.js';

test('seed sell-back price is fair and never drains below floor', () => {
  assert.ok(SEED_SELL_BACK_RATIO > 0 && SEED_SELL_BACK_RATIO < 1);
  assert.equal(getSeedSellPrice(), 2); // default/common seed base -> safe floor
  assert.equal(getSeedSellPrice(10), 4); // 35% of 10 rounded
  assert.ok(getSeedSellPrice(1) >= 2);
});
