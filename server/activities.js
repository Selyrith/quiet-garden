import { getStage, waterTile } from './garden.js';
import { MAX_ACTIVITIES, SPAWN_MIN_MS, SPAWN_MAX_MS } from '../shared/balance.js';
import { getGrowthMultiplier } from '../shared/world.js';

export { MAX_ACTIVITIES, SPAWN_MIN_MS, SPAWN_MAX_MS };

export const ACTIVITY_CONFIG = {
  weed:      { duration: [60000, 90000], reward: 5 },
  dew:       { duration: [60000, 90000], reward: 0 },
  crow:      { duration: [60000, 90000], reward: 10 },
  butterfly: { duration: [60000, 90000], reward: 1 }
};

let nextId = 1;

export function createActivity(type, tileX, tileY) {
  const cfg = ACTIVITY_CONFIG[type];
  if (!cfg) return null;
  const now = Date.now();
  const dur = cfg.duration[0] + Math.random() * (cfg.duration[1] - cfg.duration[0]);
  return {
    id: `a_${nextId++}_${now}`,
    type,
    tileX,
    tileY,
    createdAt: now,
    expiresAt: now + dur
  };
}

export function pickSpawn(garden, activities, teamBonus = 0, phaseGrowthMult = 1) {
  const occupied = new Set();
  activities.forEach((a) => occupied.add(`${a.tileX},${a.tileY}`));

  const empty = [];
  const growing = [];
  const ripe = [];

  garden.forEach((tile, key) => {
    if (occupied.has(key)) return;
    // Используем phaseMult/teamBonus как в тике комнаты
    const stage = getStage(tile, Date.now(), teamBonus, phaseGrowthMult);
    if (stage === -1) empty.push(key);
    else if (stage >= 0 && stage < 3) growing.push(key);
    else if (stage === 3) ripe.push(key);
  });

  const candidates = [];
  if (empty.length > 0) candidates.push({ type: 'weed', keys: empty });
  if (growing.length > 0) candidates.push({ type: 'dew', keys: growing });
  if (ripe.length > 0) candidates.push({ type: 'crow', keys: ripe });
  const all = [...empty, ...growing, ...ripe];
  if (all.length > 0) candidates.push({ type: 'butterfly', keys: all });

  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const key = chosen.keys[Math.floor(Math.random() * chosen.keys.length)];
  const [x, y] = key.split(',').map(Number);
  return { type: chosen.type, tileX: x, tileY: y };
}

export function applyActivityEffect(room, activity, teamBonus = 0, phaseGrowthMult = 1) {
  const now = Date.now();
  const result = { coins: 0, message: '', affectedTiles: [] };

  switch (activity.type) {
    case 'weed':
      result.coins = 5;
      result.message = 'Сорняк убран! +5 🪙';
      break;

    case 'crow':
      result.coins = 10;
      result.message = 'Ворона отпугнута! +10 🪙';
      break;

    case 'butterfly':
      result.coins = 1;
      result.message = 'Бабочка! +1 🪙, рост ускорен';
      room.garden.forEach((tile, key) => {
        if (!tile) return;
        const stage = getStage(tile, now, teamBonus, phaseGrowthMult);
        if (stage >= 0 && stage < 3) {
          waterTile(room.garden, key, 30000);
          result.affectedTiles.push(key);
        }
      });
      break;

    case 'dew':
      result.message = 'Роса собрана! Соседи ускорены';
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = activity.tileX + dx;
          const ny = activity.tileY + dy;
          if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
          const key = `${nx},${ny}`;
          const tile = room.garden.get(key);
          if (!tile) continue;
          const stage = getStage(tile, now, teamBonus, phaseGrowthMult);
          if (stage >= 0 && stage < 3) {
            waterTile(room.garden, key, 60000);
            result.affectedTiles.push(key);
          }
        }
      }
      break;
  }

  return result;
}
