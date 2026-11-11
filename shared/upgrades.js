export const UPGRADES = [
  { id: 'growth', name: 'Скорость роста', icon: '⚡', perLevel: 0.05, maxLevel: 10, unit: '−' },
  { id: 'luck',   name: 'Удача',          icon: '🍀', perLevel: 0.03, maxLevel: 10, unit: '+' },
  { id: 'income', name: 'Доход',          icon: '💰', perLevel: 0.05, maxLevel: 10, unit: '+' }
];

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}

export function getUpgradeCost(id, currentLevel) {
  const base = 100;
  return Math.floor(base * Math.pow(1.7, currentLevel));
}

export function createDefaultUpgrades() {
  return { growth: 0, luck: 0, income: 0 };
}

export function getGrowthBonus(upgrades) {
  const u = getUpgrade('growth');
  return (upgrades?.growth || 0) * u.perLevel;
}

export function getLuckBonus(upgrades) {
  const u = getUpgrade('luck');
  return (upgrades?.luck || 0) * u.perLevel;
}

export function getIncomeBonus(upgrades) {
  const u = getUpgrade('income');
  return (upgrades?.income || 0) * u.perLevel;
}
