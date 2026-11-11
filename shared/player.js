/**
 * Профили игроков — уникальный ник + личный прогресс.
 * Сохраняется отдельно от комнат, чтобы игрок мог заходить под своим ником
 * и видеть свои открытые растения, инвентарь и достижения.
 */

export const DEFAULT_AVATAR_EMOJI = '👤';

export function createPlayerProfile(playerId, nickname) {
  return {
    playerId,
    nickname,
    avatarEmoji: DEFAULT_AVATAR_EMOJI,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    // Личная colección открытых видов растений
    collection: [],
    // Личный инвентарь семян
    inventory: {},
    // Монеты (личные)
    coins: 0,
    // Достижения / статистика
    stats: {
      plantsPlanted: 0,
      plantsHarvested: 0,
      daysVisited: 0,
      totalVisitTime: 0
    },
    // Любимые растения
    favoritePlants: []
  };
}

export function isValidNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return false;
  const trimmed = nickname.trim();
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Zа-яА-ЯёЁ0-9 _-]+$/.test(trimmed);
}
