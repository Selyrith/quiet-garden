import { getCurrentGoal, COOP_EVENTS, COOP_EVENT_CREDIT } from '../shared/team-goals.js';

/**
 * Учитывает кооперативное действие в прогрессе общей цели комнаты.
 *
 * Поведение (важно для cozy-дизайна):
 *  - «Целевое» событие (goal.event) даёт полный вес (1.0).
 *  - Любое ДРУГОЕ кооперативное действие даёт частичный вес
 *    (COOP_EVENT_CREDIT, по умолчанию 0.34). Раньше такие действия
 *    молча выбрасывались: игрок, собирая урожай, пока цель просит
 *    «посадить 30», не получал НИЧЕГО и не понимал почему —
 *    это ломает базовый принцип cozy («никаких скрытых наказаний»).
 *
 * Прогресс — дробное число; UI округляет его вниз при показе.
 */
export function trackTeamEvent(room, event, amount = 1) {
  if (!room.team) return null;
  const goal = getCurrentGoal(room.team);
  if (!goal) return null;

  const isCoopEvent = COOP_EVENTS.has(event);
  if (!isCoopEvent) return null;

  // Целевое событие — полный вес; иначе частичный, но не ноль.
  const credit = event === goal.event ? 1 : COOP_EVENT_CREDIT;
  const delta = amount * credit;

  room.team.progress = Math.min(goal.target, room.team.progress + delta);

  if (room.team.progress >= goal.target - 1e-9) {
    const reward = goal.reward;
    room.team.currentIndex += 1;
    room.team.progress = 0;
    room.team.claimed.push(goal.id);

    if (reward.coins) room.coins += reward.coins;
    if (reward.discount) {
      room.upgradeDiscount = Math.max(room.upgradeDiscount || 0, reward.discount);
    }

    return { completed: true, goal, reward, credited: delta };
  }

  return { completed: false, goal, credited: delta };
}
