/**
 * Логика входа: как обрабатывается код комнаты из ссылки и ник игрока.
 */

/**
 * Нужно ли автоматически входить в комнату?
 *
 * Нет: даже если в ссылке есть код, сначала игрок должен ввести ник.
 * Раньше при переходе по ссылке сразу кидало в сад, и присоединившийся
 * оставался анонимным («Игрок»), а его не было видно рядом с хостом.
 */
export function shouldAutoJoin(params = {}) {
  return false;
}

/**
 * Обязателен ли ник для входа.
 */
export function needsNickname(nickname) {
  const clean = (typeof nickname === 'string' ? nickname.trim() : '') || '';
  return clean.length < 2;
}

/**
 * Нормализует код комнаты: uppercase + trim.
 */
export function normalizeRoomCode(code) {
  return (typeof code === 'string' ? code.trim() : '').toUpperCase();
}

/**
 * Достаточно ли кода комнаты, чтобы считать его валидным.
 */
export function isValidRoomCode(code) {
  const clean = normalizeRoomCode(code);
  return clean.length >= 4 && clean.length <= 6;
}
