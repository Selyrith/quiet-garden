/**
 * Простая ретрансляция эмоций. Никакой логики на сервере — только broadcast.
 *
 * ФИКС: раньше в broadcast уходил socket.id, а клиент сравнивал с auth.playerId.
 * Свои эмоции не атрибутировались правильным игрокам. Теперь — как везде в проекте.
 */
export const VALID_EMOTES = ['😊', '😮', '🌸', '👋', '💚', '🎉'];

export function handleEmote(io, socket, room, code, data) {
  const { emote } = data || {};
  if (!VALID_EMOTES.includes(emote)) return;
  const pid = socket.handshake.auth.playerId || socket.id;
  io.to(code).emit('emote-shown', { playerId: pid, emote });
}
