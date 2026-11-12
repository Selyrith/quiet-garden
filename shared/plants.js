import { generateLore } from './plant-lore.js';

export const TOTAL_PLANTS = 300;
export const RARITIES = [
  { id: 'common', name: 'Обычное', color: 0xa5d6a7, weight: 750, priceMult: 1, growMult: 1.0 },
  { id: 'uncommon', name: 'Необычное', color: 0x81c784, weight: 180, priceMult: 2.5, growMult: 1.2 },
  { id: 'rare', name: 'Редкое', color: 0x4fc3f7, weight: 50, priceMult: 6, growMult: 1.5 },
  { id: 'epic', name: 'Эпическое', color: 0xba68c8, weight: 15, priceMult: 15, growMult: 1.9 },
  { id: 'legendary', name: 'Легендарное', color: 0xffd54f, weight: 5, priceMult: 40, growMult: 2.4 }
];

const PLANTS_PER_RARITY = 60;
const NAME_PREFIX = ['Тихий', 'Лунный', 'Солнечный', 'Мшистый', 'Росистый', 'Ветреный', 'Сонный', 'Медовый', 'Хрустальный', 'Бархатный', 'Дикий', 'Нежный', 'Забытый', 'Утренний', 'Вечерний', 'Звёздный', 'Туманный', 'Изумрудный'];
const NAME_ROOT = ['клевер', 'папоротник', 'колокольчик', 'мак', 'ирис', 'лаванда', 'ромашка', 'мята', 'пион', 'одуванчик', 'василёк', 'лютик', 'незабудка', 'фиалка', 'тюльпан', 'нарцисс', 'гиацинт', 'лилия', 'орхидея', 'кактус', 'гриб', 'древень', 'кристалл', 'сфера'];

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRarityForSeed(seed) {
  const idx = Math.floor(seed / PLANTS_PER_RARITY);
  return RARITIES[Math.min(RARITIES.length - 1, Math.max(0, idx))];
}

const _plantCache = new Map();
// Архетипы внешнего вида. Обычные цветы чаще, экзотика реже.
const ARCHETYPES = ['flower', 'flower', 'flower', 'fern', 'cactus', 'tree', 'mushroom', 'crystal', 'orb'];

export function getPlant(seed) {
  const safeSeed = ((seed % TOTAL_PLANTS) + TOTAL_PLANTS) % TOTAL_PLANTS;
  if (_plantCache.has(safeSeed)) return _plantCache.get(safeSeed);

  const rarity = getRarityForSeed(safeSeed);
  const rng = makeRng(safeSeed + 1000);

  const baseGrow = 60 + Math.floor(rng() * 60);
  // Базовая цена: 6–11 монет за обычное растение.
  // Старый диапазон 3–6 делал базовый пак (50 монет) убыточным:
  // 3 семени ≈ 15 монет урожая при цене пака 50.
  const basePrice = 6 + Math.floor(rng() * 6);
  const growSeconds = Math.round(baseGrow * rarity.growMult);
  const price = Math.round(basePrice * rarity.priceMult);

  // Выбираем визуальный архетип
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];

  const hue = Math.floor(rng() * 360);
  const visual = {
    type: archetype,
    hue, 
    stemWidth: 3 + Math.floor(rng() * 3),
    stemHeight: 35 + Math.floor(rng() * 25),
    stemCurve: (rng() - 0.5) * 20,
    leafCount: 3 + Math.floor(rng() * 5),
    leafSize: 6 + Math.floor(rng() * 6),
    petalCount: 5 + Math.floor(rng() * 7),
    petalLength: 8 + Math.floor(rng() * 8),
    centerSize: 3 + Math.floor(rng() * 3)
  };

  // Для дерева крона должна быть массивнее
  if (archetype === 'tree') visual.petalLength += 5;
  // Для гриба ножка должна быть короче
  if (archetype === 'mushroom') visual.stemHeight *= 0.6;
  // Для кристалла стебель отсутствует, он растет от земли
  if (archetype === 'crystal') visual.stemHeight *= 1.2;

  const prefixIdx = Math.floor(safeSeed / 20);
  const rootIdx = safeSeed % NAME_ROOT.length;
  
  // Кастомные названия под архетипы
  let rootName = NAME_ROOT[rootIdx];
  if (archetype === 'cactus') rootName = 'кактус';
  if (archetype === 'tree') rootName = 'древень';
  if (archetype === 'mushroom') rootName = 'гриб';
  if (archetype === 'crystal') rootName = 'кристалл';
  if (archetype === 'orb') rootName = 'сфера';
  if (archetype === 'fern') rootName = 'папоротник';

  const name = `${NAME_PREFIX[prefixIdx % NAME_PREFIX.length]} ${rootName}`;

  const lore = generateLore(safeSeed, rarity);
  const plant = { seed: safeSeed, name, rarity, growSeconds, price, visual, lore };
  _plantCache.set(safeSeed, plant);
  return plant;
}

export function pickRandomSeed(randomFn = Math.random, luckBonus = 0) {
  const adjusted = RARITIES.map((r, i) => Math.max(0.1, r.weight * (1 + luckBonus * i)));
  const totalWeight = adjusted.reduce((s, w) => s + w, 0);
  let roll = randomFn() * totalWeight;
  let rarityIdx = 0;
  for (let i = 0; i < adjusted.length; i++) {
    roll -= adjusted[i];
    if (roll <= 0) { rarityIdx = i; break; }
  }
  return rarityIdx * PLANTS_PER_RARITY + Math.floor(randomFn() * PLANTS_PER_RARITY);
}

export function getAllSeeds() {
  return Array.from({ length: TOTAL_PLANTS }, (_, i) => i);
}

export function getSeedsByRarity(rarityId) {
  const rarityIdx = RARITIES.findIndex(r => r.id === rarityId);
  if (rarityIdx === -1) return [];
  const start = rarityIdx * PLANTS_PER_RARITY;
  return Array.from({ length: PLANTS_PER_RARITY }, (_, i) => start + i);
}
