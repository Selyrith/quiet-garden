import { getCurrentGoal } from '../shared/team-goals.js';

export function trackTeamEvent(room, event, amount = 1) {
  if (!room.team) return null;
  const goal = getCurrentGoal(room.team);
  if (!goal) return null;
  if (goal.event !== event) return null;

  room.team.progress = Math.min(goal.target, room.team.progress + amount);

  if (room.team.progress >= goal.target) {
    const reward = goal.reward;
    room.team.currentIndex += 1;
    room.team.progress = 0;
    room.team.claimed.push(goal.id);

    if (reward.coins) room.coins += reward.coins;
    if (reward.discount) {
      room.upgradeDiscount = Math.max(room.upgradeDiscount || 0, reward.discount);
    }

    return { completed: true, goal, reward };
  }
  
  return { completed: false, goal };
}
