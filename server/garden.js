import { getPlant, pickRandomSeed } from '../shared/plants.js';
import { WATER_BOOST_PER_SEC } from '../shared/balance.js';

export const STAGES = 4;

export function createEmptyGarden() {
  const garden = new Map();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) garden.set(`${x},${y}`, null);
  }
  return garden;
}

export function plantTile(garden, key, options = {}) {
  const opts = (options && typeof options === 'object') ? options : { seed: options };
  const seed = opts.seed == null ? pickRandomSeed(Math.random, opts.luckBonus || 0) : opts.seed;
  const plant = getPlant(seed);
  const growSeconds = Math.max(15, plant.growSeconds * (1 - (opts.growthBonus || 0)));
  
  garden.set(key, {
    seed,
    plantedAt: Date.now(),
    wateredUntil: 0,
    waterBoostDuration: 60000,
    growSeconds,
    mutationIndex: opts.mutationIndex ?? null
  });
  
  return { seed, mutationIndex: opts.mutationIndex ?? null };
}

export function waterTile(garden, key, duration = 60000) {
  const tile = garden.get(key);
  if (!tile) return false;
  const now = Date.now();
  const prevUntil = tile.wateredUntil || 0;

  if (prevUntil > now) {
    const prevStart = prevUntil - (tile.waterBoostDuration || 60000);
    tile.wateredUntil = Math.max(prevUntil, now + duration);
    tile.waterBoostDuration = tile.wateredUntil - prevStart;
  } else {
    tile.wateredUntil = now + duration;
    tile.waterBoostDuration = duration;
  }
  return true;
}

export function harvestTile(garden, key, bonus = 0, phaseGrowthMult = 1) {
  const tile = garden.get(key);
  if (!tile) return { ok: false, price: 0, seed: null, mutationIndex: null };
  if (getStage(tile, Date.now(), bonus, phaseGrowthMult) !== 3) {
    return { ok: false, price: 0, seed: null, mutationIndex: null };
  }
  const plant = getPlant(tile.seed);
  garden.set(key, null);
  return { 
    ok: true, 
    price: plant.price, 
    seed: tile.seed, 
    mutationIndex: tile.mutationIndex ?? null 
  };
}

export function computeState(tile, now = Date.now(), globalGrowthBonus = 0, phaseGrowthMult = 1) {
  if (!tile) return { stage: -1, progress: 0 };
  const elapsed = (now - tile.plantedAt) / 1000;
  let effective = elapsed;
  
  if (tile.wateredUntil > tile.plantedAt) {
    const dur = tile.waterBoostDuration || 60000;
    const start = Math.max(0, (tile.wateredUntil - dur - tile.plantedAt) / 1000);
    const end = Math.min(elapsed, (tile.wateredUntil - tile.plantedAt) / 1000);
    const boosted = Math.max(0, end - start);
    effective = elapsed + boosted * WATER_BOOST_PER_SEC;
  }
  
  // Порядок важен: сначала глобальный бонус команды, затем фазовый множитель —
  // ровно один раз, как видят UI и тик комнаты.
  effective *= (1 + globalGrowthBonus) * Math.max(0.3, phaseGrowthMult);

  const perStage = tile.growSeconds / 3;
  const sf = Math.min(3, effective / perStage);
  const stage = Math.min(3, Math.floor(sf));
  const progress = stage >= 3 ? 1 : sf - stage;
  return { stage, progress };
}

export function getStage(tile, now = Date.now(), globalGrowthBonus = 0, phaseGrowthMult = 1) {
  return computeState(tile, now, globalGrowthBonus, phaseGrowthMult).stage;
}
