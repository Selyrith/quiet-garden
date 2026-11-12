import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAM_GOALS, createTeamState, serializeTeam, COOP_EVENT_CREDIT
} from '../shared/team-goals.js';
import { trackTeamEvent } from '../server/team-goals.js';

/**
 * Кооперативные цели не должны наказывать за «не то» действие.
 *
 * Раньше trackTeamEvent молча отбрасывал любое событие, не совпадающее
 * с goal.event: 50 сборов урожая при цели «посадите 30» давали 0 прогресса.
 * Игрок не понимал, почему шкала стоит, — это противоречит cozy-принципу
 * «никаких скрытых наказаний» (DESIGN_RESEARCH_BRIEF.md §3).
 */

function freshRoom() {
  return { team: createTeamState(), coins: 0, upgradeDiscount: 0 };
}

test('off-goal coop actions still advance the team goal (partial credit)', () => {
  const room = freshRoom();
  const goal = TEAM_GOALS[room.team.currentIndex];
  assert.ok(goal, 'must start with a goal');

  // find an event that is NOT the current goal event
  const other = ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade']
    .find((e) => e !== goal.event);

  const res = trackTeamEvent(room, other, 1);
  assert.ok(res, 'off-goal event must be accepted, not dropped');
  assert.equal(res.completed, false);
  assert.ok(Math.abs(res.credited - COOP_EVENT_CREDIT) < 1e-9,
    `off-goal credit should be ${COOP_EVENT_CREDIT}, got ${res.credited}`);
  assert.ok(Math.abs(room.team.progress - COOP_EVENT_CREDIT) < 1e-9,
    'progress must actually move');
});

test('the featured event still gets full weight', () => {
  const room = freshRoom();
  const goal = TEAM_GOALS[room.team.currentIndex];
  const res = trackTeamEvent(room, goal.event, 1);
  assert.equal(res.credited, 1);
  assert.equal(room.team.progress, 1);
});

test('non-coop events never move the goal', () => {
  const room = freshRoom();
  const res = trackTeamEvent(room, 'sellSeed', 1);
  assert.equal(res, null);
  assert.equal(room.team.progress, 0);
});

test('a full bar of off-goal actions eventually completes the goal', () => {
  const room = freshRoom();
  const goal = TEAM_GOALS[room.team.currentIndex];
  const other = ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade']
    .find((e) => e !== goal.event);

  let completed = null;
  let guard = 0;
  while (!completed && guard++ < 500) {
    const r = trackTeamEvent(room, other, 1);
    if (r && r.completed) completed = r;
  }
  assert.ok(completed, 'off-goal actions must be able to finish the goal');
  assert.equal(completed.goal.id, goal.id);
  // следующая цель открыта, прогресс сброшен
  assert.equal(room.team.progress, 0);
  assert.equal(room.team.currentIndex, 1);
});

test('mixed goal + off-goal actions finish faster than off-goal alone', () => {
  const goalFirst = (() => {
    const room = freshRoom();
    const goal = TEAM_GOALS[room.team.currentIndex];
    const other = ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade']
      .find((e) => e !== goal.event);
    let n = 0;
    while (room.team.currentIndex === 0 && n < 500) {
      trackTeamEvent(room, n % 2 === 0 ? goal.event : other, 1);
      n++;
    }
    return n;
  })();

  const offOnly = (() => {
    const room = freshRoom();
    const goal = TEAM_GOALS[room.team.currentIndex];
    const other = ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade']
      .find((e) => e !== goal.event);
    let n = 0;
    while (room.team.currentIndex === 0 && n < 500) { trackTeamEvent(room, other, 1); n++; }
    return n;
  })();

  assert.ok(goalFirst < offOnly, `mixing should be faster (${goalFirst} vs ${offOnly})`);
});

test('serializeTeam reports integer progress so the HUD never lies', () => {
  const room = freshRoom();
  const goal = TEAM_GOALS[room.team.currentIndex];
  const other = ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade']
    .find((e) => e !== goal.event);

  trackTeamEvent(room, other, 1); // progress = 1/3
  const wire = serializeTeam(room.team);
  assert.equal(wire.progress, 0, 'floor(0.333) must be 0');
  assert.equal(Number.isInteger(wire.progress), true);

  trackTeamEvent(room, other, 1); // 2/3
  trackTeamEvent(room, other, 1); // 1.0 -> completes, resets
  const after = serializeTeam(room.team);
  assert.equal(Number.isInteger(after.progress), true);
});

test('every declared team goal uses a known coop event', () => {
  for (const g of TEAM_GOALS) {
    assert.ok(
      ['plant', 'water', 'harvest', 'activity', 'newSpecies', 'upgrade'].includes(g.event),
      `${g.id} uses unknown event "${g.event}"`
    );
  }
});