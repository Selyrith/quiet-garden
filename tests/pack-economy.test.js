import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKS, rollPack, getPackFairHarvestValue, getPackFairPrice, validatePackEconomy
} from '../shared/packs.js';
import { getSeedSellPrice, getGardenRowIncomeBonus } from '../shared/balance.js';
import { getPlant, RARITIES } from '../shared/plants.js';

/**
 * Экономика паков не должна быть убыточной.
 *
 * До правки цены 50/200/600 давали ROI −78…−90% при перепродаже и
 * −35…−71% даже при полном выращивании — игрок терял монеты за вход,
 * что и создавало «death spiral» (см. DESIGN_RESEARCH_BRIEF.md §2).
 */
test('each pack is not a loss: harvest value covers its price', () => {
  for (const id of Object.keys(PACKS)) {
    const res = validatePackEconomy(id);
    assert.ok(res.ok, `${id}: ${res.reason}`);
  }
});

test('pack price is derived from its real content, not a magic number', () => {
  for (const id of Object.keys(PACKS)) {
    const fair = getPackFairPrice(id);
    assert.ok(fair > 0, `${id}: fair price must be positive`);
    assert.equal(fair % 10, 0, `${id}: fair price should round to tens`);
    // Цена в каталоге и «справедливая» цена не должны расходиться больше
    // чем на один шаг округления (иначе каталог врёт игроку).
    assert.ok(
      Math.abs(PACKS[id].price - fair) <= 10,
      `${id}: catalog price ${PACKS[id].price} drifts from fair ${fair}`
    );
  }
});

test('selling seeds can never be more profitable than growing them', () => {
  for (const id of Object.keys(PACKS)) {
    const pack = PACKS[id];
    const totalWeight = Object.values(pack.weights).reduce((s, w) => s + w, 0);
    let sellBackPerSeed = 0;
    for (const [rarityId, weight] of Object.entries(pack.weights)) {
      const idx = RARITIES.findIndex((r) => r.id === rarityId);
      let sum = 0;
      for (let s = idx * 60; s < (idx + 1) * 60; s++) {
        sum += getSeedSellPrice(getPlant(s).price);
      }
      sellBackPerSeed += (weight / totalWeight) * (sum / 60);
    }
    const harvestValue = getPackFairHarvestValue(id);
    assert.ok(
      sellBackPerSeed * pack.count < harvestValue,
      `${id}: sell-back ${(sellBackPerSeed * pack.count).toFixed(1)} must stay below harvest ${harvestValue.toFixed(1)}`
    );
  }
});

test('rollPack returns exactly pack.count seeds from the declared rarities', () => {
  for (const [id, pack] of Object.entries(PACKS)) {
    const seeds = rollPack(id, () => 0.999);
    assert.equal(seeds.length, pack.count, `${id}: count`);
    for (const seed of seeds) {
      assert.ok(seed >= 0 && seed < 300, `${id}: seed ${seed} out of range`);
      // редкость должна попадать в объявленные веса пака
      const rarity = RARITIES[Math.floor(seed / 60)];
      assert.ok(
        Object.prototype.hasOwnProperty.call(pack.weights, rarity.id),
        `${id}: rolled rarity ${rarity.id} is not declared in weights`
      );
    }
  }
});

test('rollPack returns empty for an unknown pack instead of throwing', () => {
  assert.deepEqual(rollPack('nope'), []);
});

/**
 * gardenRowsBonus раньше писался в награду за «15 активностей»,
 * но никто его не читал — игрок получал пустую награду.
 */
test('garden row bonus now grants a real, capped income bonus', () => {
  assert.equal(getGardenRowIncomeBonus(0), 0);
  assert.equal(getGardenRowIncomeBonus(1), 0.05);
  assert.equal(getGardenRowIncomeBonus(3), 0.15);
  // потолок защищает экономику от бесконечного роста
  assert.equal(getGardenRowIncomeBonus(100), 0.30);
  assert.equal(getGardenRowIncomeBonus(-4), 0);
  assert.equal(getGardenRowIncomeBonus(undefined), 0);
});