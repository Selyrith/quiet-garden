// Игровой баланс. Единственное место для тюнинга.
export const MAX_PLAYERS = 4;
export const ACTION_DURATION = { plant: 4000, water: 2000, harvest: 3000 };
export const SPAWN_MIN_MS = 60000;
export const SPAWN_MAX_MS = 120000;
export const MAX_ACTIVITIES = 1;
export const ROOM_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
export const ROOM_UNLOAD_MS = 60 * 60 * 1000;
export const SAVE_INTERVAL_MS = 30000;
export const WATER_BOOST_PER_SEC = 0.3;
export const HARVEST_MUTATION_RETURN_CHANCE = 0.35;
export const TREE_NEXT_LEVEL_MULT = 1.5;

// Seed selling: recoup 35% of seed cost when selling back to shop
export const SEED_SELL_BACK_RATIO = 0.35;

// Upgrade cost: base 100 coins, 1.45^n scaling, maxLevel 8
export const UPGRADE_BASE_COST = 100;
export const UPGROWTH_MULT = 1.45;
export const UPGRADE_MAX_LEVEL = 8;

// Team tree: 50·1.35^n progression, reward every level
export const TREE_BASE_XP = 50;
export const TREE_GROWTH_MULT = 1.35;
export const TREE_START_LEVEL = 0;
export const TREE_START_NEXT_LEVEL = 50;

export function getNextTreeLevelAt(current) {
  return Math.floor(current * TREE_GROWTH_MULT);
}

export function getSeedSellPrice(baseValue = 6) {
  return Math.max(2, Math.round(baseValue * SEED_SELL_BACK_RATIO));
}

export function getSynergyNeighborReward(harvestPrice = 10) {
  // Small flat bonus to the helping neighbor when co-op synergy triggers.
  // Keeps cooperation tangible without inflating economy too fast.
  return Math.max(1, Math.round(harvestPrice * 0.10));
}

// gardenRowsBonus: expand to include adjacent-plot bonuses
export const ADJACENT_BONUS_MULT = 0.15; // 15% extra for adjacent watered plots
export const MIN_ADJACENT_FOR_BONUS = 1;
