/**
 * Ежедневные награды, квесты дня, дерево прогресса.
 * Детерминированно по дате (UTC YYYY-MM-DD).
 */

export const DAILY_REWARD = { coins: 50, seedHint: 'редкое' };

// Множители для 7-дневного цикла стрика
export const STREAK_MULTIPLIERS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 3.0];

export const SEASONS = [
  { id: 'seeds', name: 'Неделя семян', icon: '🌱', color: '#81c784' },
  { id: 'coins', name: 'Неделя монет', icon: '🪙', color: '#fbbf24' },
  { id: 'growth', name: 'Неделя роста', icon: '⚡', color: '#4fc3f7' },
  { id: 'cosmetics', name: 'Неделя красоты', icon: '🌸', color: '#ba68c8' }
];

export const QUEST_POOL = [
  { id: 'harvest5',   text: 'Собери 5 растений',           target: 5,  reward: 30, event: 'harvest' },
  { id: 'water10',    text: 'Полей 10 раз',                target: 10, reward: 20, event: 'water' },
  { id: 'activity3',  text: 'Поймай 3 активности',         target: 3,  reward: 25, event: 'activity' },
  { id: 'newspecies', text: 'Открой 3 новых вида',         target: 3,  reward: 40, event: 'newSpecies' },
  { id: 'upgrade1',   text: 'Купи 1 улучшение',            target: 1,  reward: 30, event: 'upgrade' },
  { id: 'plant8',     text: 'Посади 8 растений',           target: 8,  reward: 25, event: 'plant' }
];

/**
 * Узлы дерева прогресса.
 *
 * `reward` — человекочитаемая строка для UI.
 * `effect` — ДЕКЛАРАТИВНОЕ описание награды; применяется сервером
 *            универсально (см. applyTreeNodeEffect в server/goals-handlers.js).
 *
 * Раньше награды применялись цепочкой `if (nodeId === '...')`, а `reward`
 * был просто строкой для показа. Любой новый узел без ветки в этой цепочке
 * выглядел рабочим, но не давал ничего — и обнаружить это можно было только
 * вручную. Теперь награда — данные, и «награда без эффекта» невозможна.
 */
export const TREE_NODES = [
  { id: 'first',   text: 'Первый цветок',          reward: '+50 монет',     check: 'harvestTotal',  target: 1,
    effect: { coins: 50 } },
  { id: 'ten',     text: '10 растений собрано',    reward: '+20% доход',    check: 'harvestTotal',  target: 10,
    effect: { incomeBonusPermanent: 0.20 } },
  { id: 'twenty5', text: '25 видов открыто',       reward: '+1 активность', check: 'speciesCount',  target: 25,
    effect: { maxActivitiesBonus: 1 } },
  { id: 'fifty',   text: '50 растений собрано',    reward: '−10% цены',     check: 'harvestTotal',  target: 50,
    effect: { upgradeDiscount: 0.10 } },
  { id: 'activity15', text: '15 активностей',      reward: '+1 ряд грядок', check: 'activityTotal', target: 15,
    effect: { gardenRowsBonus: 1 } }
];

function dateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyKey() {
  return dateKey();
}

export function getSeasonInfo(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek);
  return SEASONS[week % SEASONS.length];
}

/**
 * Детерминированно возвращает 3 квеста дня для конкретной даты.
 */
export function getDailyQuests(d = new Date()) {
  const key = dateKey(d);
  const seed = hashString(key);
  const indices = [];
  let s = seed;
  while (indices.length < 3) {
    s = (s * 1103515245 + 12345) >>> 0;
    const idx = s % QUEST_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.map((i) => {
    const q = QUEST_POOL[i];
    return { ...q, progress: 0, claimed: false };
  });
}

export function createGoalsState() {
  return {
    lastDailyKey: null,
    lastClaimDate: null,
    streakCount: 0,
    streakFreezes: 1,
    dailyActions: 0,
    harvestTotal: 0,
    plantTotal: 0,
    waterTotal: 0,
    activityTotal: 0,
    upgradeTotal: 0,
    questsDate: null,
    quests: [],
    treeClaimed: [],
    lastSeenAt: 0
  };
}

export function getQuestById(id) {
  return QUEST_POOL.find((q) => q.id === id) || null;
}

export function getTreeNodeById(id) {
  return TREE_NODES.find((n) => n.id === id) || null;
}
