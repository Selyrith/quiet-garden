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

/**
 * Определяет, какой ник использовать игроку.
 *
 * Приоритет: введённый сейчас ник важнее старого ника из профиля.
 * Иначе игрок, заходивший раньше под одним ником, не смог бы сменить
 * имя при входе — и в списке оставался бы старый.
 *
 * @param {string} profileNick ник из профиля
 * @param {string} inputNick ник, введённый игроком сейчас
 * @param {string} playerId для заглушки, если ников нет
 */
export function resolveNickname(profileNick, inputNick, playerId = '') {
  const input = typeof inputNick === 'string' ? inputNick.trim() : '';
  if (input && isValidNickname(input)) return input;

  const saved = typeof profileNick === 'string' ? profileNick.trim() : '';
  if (saved) return saved;

  const suffix = String(playerId || '').slice(-6);
  return suffix ? `Игрок_${suffix}` : 'Игрок';
}
