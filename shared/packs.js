import { RARITIES } from './plants.js';

const PLANTS_PER_RARITY = 60;

export const PACKS = {
  basic: { 
    id: 'basic', 
    name: 'Обычный пак', 
    desc: '3 семени', 
    price: 50, 
    count: 3, 
    weights: { common: 90, uncommon: 10 } 
  },
  rare: { 
    id: 'rare', 
    name: 'Редкий пак', 
    desc: '3 семени', 
    price: 200, 
    count: 3, 
    weights: { uncommon: 50, rare: 40, epic: 10 } 
  },
  legendary: { 
    id: 'legendary', 
    name: 'Легендарный пак', 
    desc: '1 семя', 
    price: 600, 
    count: 1, 
    weights: { epic: 80, legendary: 20 } 
  }
};

export function rollPack(packId, randomFn = Math.random) {
  const pack = PACKS[packId];
  if (!pack) return [];

  const seeds = [];
  
  // Создаем взвешенный список редкостей для этого пака
  const pool = [];
  for (const [rarityId, weight] of Object.entries(pack.weights)) {
    const rIdx = RARITIES.findIndex(r => r.id === rarityId);
    if (rIdx !== -1) {
      for (let i = 0; i < weight; i++) pool.push(rIdx);
    }
  }

  for (let i = 0; i < pack.count; i++) {
    const rarityIdx = pool[Math.floor(randomFn() * pool.length)];
    const base = rarityIdx * PLANTS_PER_RARITY;
    const offset = Math.floor(randomFn() * PLANTS_PER_RARITY);
    seeds.push(base + offset);
  }

  return seeds;
}
