import { RARITIES, getPlant } from './plants.js';

const PLANTS_PER_RARITY = 60;

/**
 * Печати (паки) семян.
 *
 * Экономическое правило Quiet Garden: пак НЕ должен быть убыточным.
 * Ранние цены (50/200/600) давали ROI −78%…−90% при перепродаже и
 * −35%…−71% даже при полном выращивании и сборе урожая — игрок,
 * открывший пак, терял монеты просто за вход в сад, что и создавало
 * «death spiral» (см. DESIGN_RESEARCH_BRIEF.md §2).
 *
 * Принцип: цена пака = справедливая стоимость содержимого (по урожаю)
 * с небольшим бонусом за азарт. Перепродажа семян даёт ~35% от цены,
 * поэтому она никогда не должна быть выгоднее выращивания — иначе
 * пак превращается в «банкомат».
 */
export const PACKS = {
  basic: {
    id: 'basic',
    name: 'Обычный пак',
    desc: '3 семени обычных и необычных видов',
    price: 30,
    count: 3,
    weights: { common: 90, uncommon: 10 },
    // Множитель к справедливой цене содержимого. 1.0 = «честно».
    priceMult: 0.9
  },
  rare: {
    id: 'rare',
    name: 'Редкий пак',
    desc: '3 семени: необычные, редкие, немного эпических',
    price: 120,
    count: 3,
    weights: { uncommon: 50, rare: 40, epic: 10 },
    priceMult: 0.95
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарный пак',
    desc: '1 семя эпического или легендарного вида',
    price: 160,
    count: 1,
    weights: { epic: 80, legendary: 20 },
    priceMult: 1.0
  }
};

function rarityIndexOf(rarityId) {
  return RARITIES.findIndex((r) => r.id === rarityId);
}

/**
 * Разыгрывает содержимое пака.
 * @param {string} packId
 * @param {() => number} randomFn
 * @returns {number[]} seed id
 */
export function rollPack(packId, randomFn = Math.random) {
  const pack = PACKS[packId];
  if (!pack) return [];

  const pool = [];
  for (const [rarityId, weight] of Object.entries(pack.weights)) {
    const rIdx = rarityIndexOf(rarityId);
    if (rIdx === -1) continue;
    for (let i = 0; i < weight; i++) pool.push(rIdx);
  }
  if (pool.length === 0) return [];

  const seeds = [];
  for (let i = 0; i < pack.count; i++) {
    const rarityIdx = pool[Math.floor(randomFn() * pool.length)];
    const base = rarityIdx * PLANTS_PER_RARITY;
    const offset = Math.floor(randomFn() * PLANTS_PER_RARITY);
    seeds.push(base + offset);
  }
  return seeds;
}

/** Средняя цена урожая (harvest price) одного вида внутри редкости. */
export function averageHarvestPriceForRarity(rarityId) {
  const idx = rarityIndexOf(rarityId);
  if (idx === -1) return 0;
  let sum = 0;
  let n = 0;
  for (let s = idx * PLANTS_PER_RARITY; s < (idx + 1) * PLANTS_PER_RARITY; s++) {
    sum += getPlant(s).price;
    n++;
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Справедливая стоимость содержимого пака по урожаю:
 * сумма (вес редкости × средний урожай этой редкости) × количество.
 */
export function getPackFairHarvestValue(packId) {
  const pack = PACKS[packId];
  if (!pack) return 0;
  const totalWeight = Object.values(pack.weights).reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) return 0;

  let perSeed = 0;
  for (const [rarityId, weight] of Object.entries(pack.weights)) {
    perSeed += (weight / totalWeight) * averageHarvestPriceForRarity(rarityId);
  }
  return perSeed * pack.count;
}

/**
 * Рекомендуемая (справедливая) цена пака. Округляется до «красивых» 10.
 */
export function getPackFairPrice(packId) {
  const pack = PACKS[packId];
  if (!pack) return 0;
  const fair = getPackFairHarvestValue(packId) * (pack.priceMult ?? 1);
  return Math.max(10, Math.round(fair / 10) * 10);
}

/**
 * Проверка экономической вменяемости пака.
 * Возвращает { ok, reason } — используется тестами и тюнингом.
 */
export function validatePackEconomy(packId) {
  const pack = PACKS[packId];
  if (!pack) return { ok: false, reason: 'Неизвестный пак' };

  const fair = getPackFairHarvestValue(packId);
  // Правило: полное выращивание и сбор урожая должен окупать пак.
  if (fair < pack.price) {
    return {
      ok: false,
      reason: `Пак «${pack.name}» убыточен: содержимое ${fair.toFixed(1)} < цена ${pack.price}`
    };
  }
  // Правило: прибыль не должна быть абсурдной (иначе пак — дойная корова).
  if (fair > pack.price * 2) {
    return {
      ok: false,
      reason: `Пак «${pack.name}» слишком выгоден: содержимое ${fair.toFixed(1)} > 2× цены ${pack.price}`
    };
  }
  return { ok: true, reason: 'ok' };
}