import { QUICK_MESSAGES } from '../shared/quick-messages.js';

export function handleQuickMessage(io, socket, room, code, data) {
  const { text } = data || {};
  if (typeof text !== 'string') return;
  if (!QUICK_MESSAGES.includes(text)) return;
  const pid = socket.handshake.auth.playerId || socket.id;
  io.to(code).emit('quick-message-shown', { playerId: pid, text });
}