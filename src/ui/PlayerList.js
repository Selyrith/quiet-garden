import { getRole } from '../../shared/roles.js';

/**
 * Форматирует список игроков для HUD.
 *
 * Показывает ник, иконку роли и корону у хоста (создателя сада).
 * Принимает как новый формат (объекты с никнеймом), так и старый
 * (массив id) — на случай, если сервер прислал неполные данные.
 */
export function formatPlayerList(players, myPlayerId) {
  const list = Array.isArray(players) ? players : [];
  if (list.length === 0) return '';

  const parts = list.map((entry) => {
    const pid = typeof entry === 'string' ? entry : entry?.id;
    const nickname = (typeof entry === 'object' && entry?.nickname) || 'Игрок';
    const isHost = typeof entry === 'object' && !!entry?.isHost;
    const roleId = typeof entry === 'object' ? entry?.roleId : null;
    const role = roleId ? getRole(roleId) : null;
    const icon = role ? role.icon : '👤';
    const crown = isHost ? '👑' : '';
    const me = pid === myPlayerId ? ' (Вы)' : '';
    return `${crown}${icon} ${nickname}${me}`;
  });

  return parts.join('  ·  ');
}

/**
 * Находит игроков, которые были в комнате, но больше в ней нет.
 *
 * Нужен, чтобы убрать аватар вышедшего игрока — иначе он остаётся
 * висеть на грядке как призрак.
 *
 * @param {Array} previousIds id игроков на прошлом шаге
 * @param {Array} currentIds id игроков сейчас
 * @returns {string[]} id ушедших игроков
 */
export function findRemovedPlayers(previousIds = [], currentIds = []) {
  const prev = (previousIds || []).map((p) => (typeof p === 'string' ? p : p?.id)).filter(Boolean);
  const curr = new Set((currentIds || []).map((p) => (typeof p === 'string' ? p : p?.id)).filter(Boolean));

  // Пустой текущий список — скорее всего сбой данных, удалять всех нельзя.
  if (curr.size === 0) return [];

  return prev.filter((id) => !curr.has(id));
}

export function updatePlayerList(textObj, players, roles, myPlayerId) {
  if (!textObj) return;
  const list = Array.isArray(players) ? players : [];
  const withRoles = list.map((entry) => {
    if (typeof entry === 'string') return entry;
    const pid = entry?.id;
    return { ...entry, roleId: roles?.[pid] || entry?.roleId || null };
  });
  textObj.setText(formatPlayerList(withRoles, myPlayerId));
}
