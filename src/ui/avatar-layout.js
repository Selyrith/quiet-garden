/**
 * Геометрия аватара — единственный источник правды для клиента.
 *
 * Почему отдельный модуль: позиция «стояния» на грядке считалась в четырёх
 * местах как хардкод `y - 20`, а размер/обводка задавались прямо в
 * PlayerAvatar. Разъезд этих чисел и давал «телепорт выше грядки».
 */

/** Размер тайла по умолчанию (GameScene.tileSize). */
export const AVATAR_DEFAULT_TILE_SIZE = 42;

/** Доля размера тайла, которую занимает аватар. */
const AVATAR_TILE_RATIO = 0.8;

/** Насколько аватар приподнят над центром грядки (доля тайла). */
const STAND_OFFSET_RATIO = -0.2;

/**
 * Размер и вертикальные смещения аватара под конкретный размер тайла.
 *
 * @param {number} tileSize размер грядки в пикселях
 * @returns {{size: number, standOffsetY: number, shadowY: number, shadowWidth: number, shadowHeight: number}}
 */
export function avatarLayout(tileSize = AVATAR_DEFAULT_TILE_SIZE) {
  const size = Math.round(tileSize * AVATAR_TILE_RATIO);

  return {
    size,
    standOffsetY: Math.round(tileSize * STAND_OFFSET_RATIO),
    shadowY: Math.round(size * 0.36),
    shadowWidth: Math.round(size * 0.55),
    shadowHeight: Math.round(size * 0.16)
  };
}

/**
 * Мировая позиция аватара, стоящего на грядке.
 *
 * @param {{x: number, y: number}} tileCenter центр грядки в мировых координатах
 * @param {number} tileSize размер грядки в пикселях
 * @returns {{x: number, y: number}}
 */
export function avatarStandPosition(tileCenter, tileSize = AVATAR_DEFAULT_TILE_SIZE) {
  const layout = avatarLayout(tileSize);
  return { x: tileCenter.x, y: tileCenter.y + layout.standOffsetY };
}