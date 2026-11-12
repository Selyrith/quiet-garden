import { getDailyKey, getDailyQuests, createGoalsState, STREAK_MULTIPLIERS, getSeasonInfo } from '../shared/goals.js';

export function getPlayerGoals(room, playerId) {
  if (!room.playerGoals) room.playerGoals = new Map();
  if (!room.playerGoals.has(playerId)) {
    room.playerGoals.set(playerId, createGoalsState());
  }
  return room.playerGoals.get(playerId);
}

export function ensureDaily(room, playerId) {
  const goals = getPlayerGoals(room, playerId);
  const today = getDailyKey();
  if (goals.lastDailyKey !== today) {
    goals.lastDailyKey = today;
    goals.dailyClaimed = false;
    goals.dailyActions = 0;  // сброс действий при смене дня
  }
  if (!goals.lastSeenAt) goals.lastSeenAt = 0;
  return { date: today, claimed: !!goals.dailyClaimed };
}

export function claimDaily(room, playerId) {
  ensureDaily(room, playerId);
  const goals = getPlayerGoals(room, playerId);
  const today = getDailyKey();
  
  if (goals.lastClaimDate === today) return { ok: false, reason: 'Уже получено сегодня' };
  if (goals.dailyActions < 1) return { ok: false, reason: 'Сначала полейте или посадите растение' };

  let diffDays = 1;
  if (goals.lastClaimDate) {
    const prev = new Date(goals.lastClaimDate);
    const now = new Date(today);
    diffDays = Math.round((now - prev) / (1000 * 60 * 60 * 24));
  }

  if (diffDays === 1) {
    goals.streakCount = (goals.streakCount || 0) + 1;
  } else if (diffDays === 2 && (goals.streakFreezes || 0) > 0) {
    goals.streakFreezes--;
    goals.streakCount = (goals.streakCount || 0) + 1;
  } else if (diffDays > 1) {
    goals.streakCount = 1;
    goals.streakFreezes = 1;
  } else {
    goals.streakCount = 1;
  }

  goals.lastClaimDate = today;
  goals.lastDailyKey = today;
  goals.dailyClaimed = true;
  goals.dailyActions = 0;
  
  const mult = STREAK_MULTIPLIERS[(goals.streakCount - 1) % 7];
  const season = getSeasonInfo();
  
  let coins = 50;
  let seedBonus = 0;
  if (season.id === 'coins') coins = 70;
  if (season.id === 'seeds') seedBonus = 2;
  
  coins = Math.floor(coins * mult);
  
  return { ok: true, coins, seedBonus, streak: goals.streakCount, mult, season };
}

export function ensureQuests(room, playerId) {
  const goals = getPlayerGoals(room, playerId);
  const today = getDailyKey();
  if (goals.questsDate !== today) {
    goals.questsDate = today;
    goals.quests = getDailyQuests();
  }
}

export function trackEvent(room, playerId, event, amount = 1) {
  const goals = getPlayerGoals(room, playerId);
  ensureQuests(room, playerId);

  if (event === 'plant') {
    goals.plantTotal = (goals.plantTotal || 0) + amount;
    goals.dailyActions = (goals.dailyActions || 0) + amount;
  }
  if (event === 'water') {
    goals.waterTotal = (goals.waterTotal || 0) + amount;
    goals.dailyActions = (goals.dailyActions || 0) + amount;
  }
  if (event === 'harvest') goals.harvestTotal = (goals.harvestTotal || 0) + amount;
  if (event === 'activity') goals.activityTotal = (goals.activityTotal || 0) + amount;
  if (event === 'upgrade') goals.upgradeTotal = (goals.upgradeTotal || 0) + amount;
  if (event === 'newSpecies') {
    // ВАЖНО: раньше здесь стояло goals.speciesCount += amount, и этот счётчик
    // расходился с room.collection.size, по которому считает дерево прогресса
    // и который показывает UI. Игрок видел «25 видов» в книге, а узел дерева
    // требовал «25» по другой цифре — награда не удалась.
    // Теперь поддерживаем оба: локальный счётчик и, если комната доступна,
    // синхронизируем его с реальным размером коллекции комнаты.
    goals.speciesCount = (goals.speciesCount || 0) + amount;
    if (room && room.collection && typeof room.collection.size === 'number') {
      // берём максимум: коллекция — источник истины, локальный счётчик
      // мог быть создан до появления collection
      goals.speciesCount = Math.max(goals.speciesCount, room.collection.size);
    }
  }

  for (const q of goals.quests) {
    if (q.claimed) continue;
    if (q.event !== event) continue;
    q.progress = Math.min(q.target, (q.progress || 0) + amount);
  }
}

export function serializeGoals(room, playerId) {
  const goals = getPlayerGoals(room, playerId);
  ensureQuests(room, playerId);
  
  const streakCount = goals.streakCount || 0;
  const mult = STREAK_MULTIPLIERS[Math.max(0, (streakCount || 1) - 1) % 7];
  const season = getSeasonInfo();
  
  return {
    daily: { date: goals.lastDailyKey, claimed: !!goals.dailyClaimed },
    streak: {
      count: streakCount,
      freezes: goals.streakFreezes ?? 1,
      multiplier: mult,
      dailyActions: goals.dailyActions || 0,
      season
    },
    quests: goals.quests || [],
    treeClaimed: goals.treeClaimed || [],
    totals: {
      harvest: goals.harvestTotal || 0,
      plant: goals.plantTotal || 0,
      activity: goals.activityTotal || 0,
      upgrade: goals.upgradeTotal || 0,
      // Коллекция комнаты — источник истины; локальный счётчик мог отстать.
      speciesCount: Math.max(
        goals.speciesCount || 0,
        room.collection ? room.collection.size : 0
      )
    }
  };
}

export { createGoalsState };
