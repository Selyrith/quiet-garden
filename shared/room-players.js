/**
 * Общие помощники для игроков в комнате.
 * Используются и сервером, и клиентом.
 */

/** Размер сетки грядок. */
export const GRID_SIZE = 8;

/**
 * Находит свободную клетку для спавна игрока.
 * Первый игрок получает (1,1) — «вход» в сад.
 * Следующие получают соседние свободные клетки, чтобы не накладываться.
 */
export function findSpawnTile(occupied = []) {
  const taken = new Set(occupied);
  if (!taken.has('1,1')) return '1,1';

  // Кандидаты рядом со входом — компактная группа в углу сада.
  const candidates = [];
  for (let radius = 1; radius < GRID_SIZE; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = 1 + dx;
        const y = 1 + dy;
        if (x < 1 || y < 1 || x > GRID_SIZE || y > GRID_SIZE) continue;
        candidates.push(`${x},${y}`);
      }
    }
    // Берём первый свободный на этом кольце.
    for (const key of candidates) {
      if (!taken.has(key)) return key;
    }
  }

  // Крайний случай: все клетки заняты — ищем любую свободную.
  for (let x = 1; x <= GRID_SIZE; x++) {
    for (let y = 1; y <= GRID_SIZE; y++) {
      const key = `${x},${y}`;
      if (!taken.has(key)) return key;
    }
  }
  return '1,1';
}

/**
 * Собирает публичную запись об игроке для клиента.
 */
export function buildPlayerEntry({
  playerId,
  nickname,
  tileKey = '1,1',
  gender = 'male',
  isHost = false,
} = {}) {
  const [x, y] = String(tileKey).split(',').map(Number);
  const cleanNick = (typeof nickname === 'string' ? nickname.trim() : '') || 'Игрок';
  return {
    id: playerId,
    nickname: cleanNick,
    x: Number.isFinite(x) ? x : 1,
    y: Number.isFinite(y) ? y : 1,
    gender: gender || 'male',
    isHost: !!isHost,
  };
}

/**
 * Список игроков комнаты: хост всегда первым, остальные — в порядке прихода.
 */
export function buildPlayerList(entries = []) {
  const list = [...entries];
  const hostIndex = list.findIndex((p) => p && p.isHost);
  if (hostIndex > 0) {
    const [host] = list.splice(hostIndex, 1);
    list.unshift(host);
  }
  return list;
}
