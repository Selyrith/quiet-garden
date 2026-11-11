/**
 * Роли игрока. Пассивные бонусы.
 */
export const ROLES = [
  {
    id: 'gardener',
    name: 'Садовник',
    icon: '🌿',
    desc: '+10% к скорости роста всех растений',
    color: 0x8bc34a
  },
  {
    id: 'waterer',
    name: 'Поливальщик',
    icon: '💧',
    desc: 'Полив длится +50% (90 сек вместо 60)',
    color: 0x4fc3f7
  },
  {
    id: 'harvester',
    name: 'Собиратель',
    icon: '🌸',
    desc: '+20% монет от сбора урожая',
    color: 0xff80ab
  }
];

export function getRole(id) {
  return ROLES.find((r) => r.id === id) || ROLES[0];
}

/**
 * Возвращает общий множитель бонусов от всех игроков в комнате.
 */
export function aggregateRoleBonuses(playersRoles) {
  const result = { growth: 0, waterDuration: 0, income: 0 };
  if (!playersRoles) return result;
  for (const roleId of Object.values(playersRoles)) {
    if (roleId === 'gardener') result.growth += 0.10;
    if (roleId === 'waterer') result.waterDuration += 0.50;
    if (roleId === 'harvester') result.income += 0.20;
  }
  return result;
}
