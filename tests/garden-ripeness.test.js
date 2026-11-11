import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeState, getStage, harvestTile } from '../server/garden.js';

const GROW_SECONDS = 180;
const PHASES = [0.65, 0.95, 1.10, 1.15];

function tile(ageSeconds) {
  return {
    seed: 0,
    plantedAt: Date.now() - ageSeconds * 1000,
    wateredUntil: 0,
    waterBoostDuration: 60000,
    growSeconds: GROW_SECONDS,
    mutationIndex: null
  };
}

/**
 * Регрессия на баг: «когда собираю созревшее растение, пишет "растение ещё не
 * созрело", тыкаю второй раз и собирается».
 *
 * Тик комнаты (stage-updates), initial-state и прогресс-бар считают стадию с
 * множителем фазы мира (PHASES growthMult: утро 1.10, день 1.15, вечер 0.95,
 * ночь 0.65). А проверка при сборе — applyTileEffect и harvestTile — считала её
 * БЕЗ фазы. В фазах с growthMult > 1 растение выглядит созревшим в UI раньше,
 * чем сервер разрешает сбор: первый тап упирается в отказ, второй (спустя
 * ACTION_DURATION.harvest = 3000 мс) проходит.
 */
test('стадия при сборе совпадает со стадией, которую видит клиент', () => {
  for (const phaseMult of PHASES) {
    for (let age = 0; age <= 400; age++) {
      const t = tile(age);
      const now = Date.now();

      const uiStage = computeState(t, now, 0, phaseMult).stage;
      const harvestStage = getStage(t, now, 0, phaseMult);

      if (uiStage === 3) {
        assert.equal(
          harvestStage, 3,
          `фаза ${phaseMult}, возраст ${age}с: UI показывает "созрело" (stage 3), ` +
            `а проверка при сборе даёт stage ${harvestStage} → отказ "ещё не созрело"`
        );
      }
    }
  }
});

test('harvestTile принимает то, что UI уже показал созревшим (все фазы)', () => {
  for (const phaseMult of PHASES) {
    for (let age = 0; age <= 400; age++) {
      const garden = new Map([['0,0', tile(age)]]);
      const accepted = harvestTile(garden, '0,0', 0, phaseMult).ok;
      const uiStage = computeState(tile(age), Date.now(), 0, phaseMult).stage;
      if (uiStage === 3) {
        assert.ok(accepted, `фаза ${phaseMult}, возраст ${age}с: UI "созрело", harvestTile отказал`);
      }
    }
  }
});

test('созревшее по UI растение собирается с первого тапа (день/утро)', () => {
  // Самые узкие места бага: фазы с growthMult > 1.
  for (const phaseMult of [1.10, 1.15]) {
    for (const age of [166, 170, 175, 179]) {
      const t = tile(age);
      const now = Date.now();
      assert.equal(computeState(t, now, 0, phaseMult).stage, 3, `фаза ${phaseMult}, ${age}с: UI должен считать созревшим`);
      assert.equal(getStage(t, now, 0, phaseMult), 3, `фаза ${phaseMult}, ${age}с: сервер должен разрешить сбор`);
      assert.equal(harvestTile(new Map([['0,0', t]]), '0,0', 0, phaseMult).ok, true,
        `фаза ${phaseMult}, ${age}с: сбор должен пройти с первого раза`);
    }
  }
});

test('растение не созревает раньше срока ни в одной фазе', () => {
  for (const phaseMult of PHASES) {
    const young = computeState(tile(30), Date.now(), 0, phaseMult).stage;
    assert.ok(young < 3, `фаза ${phaseMult}: растение в 30с уже "созрело"`);
  }
});