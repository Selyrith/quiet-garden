import { getRole } from '../../shared/roles.js';

export function updatePlayerList(textObj, players, roles, myPlayerId) {
  if (!textObj) return;
  const parts = (players || []).map((pid) => {
    const roleId = roles[pid];
    const role = roleId ? getRole(roleId) : null;
    const icon = role ? role.icon : '👤';
    const isMe = pid === myPlayerId;
    return `${icon}${isMe ? ' Вы' : ' Друг'}`;
  });
  textObj.setText(parts.join('  ·  '));
}
