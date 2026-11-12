import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAM_GOALS, createTeamState } from '../shared/team-goals.js';
import { trackTeamEvent } from '../server/team-goals.js';

test('extended team goals include plant and water cooperation milestones', () => {
  const events = TEAM_GOALS.map(g => g.event);
  assert.ok(events.includes('plant'), 'should include a plant team goal');
  assert.ok(events.includes('water'), 'should include a water team goal');
  assert.ok(TEAM_GOALS.length >= 6, 'should have more cooperative goals');
});

test('plant team goal progresses via trackTeamEvent', () => {
  const room = { team: createTeamState(), coins: 0, upgradeDiscount: 0 };
  const plantIdx = TEAM_GOALS.findIndex(g => g.event === 'plant');
  assert.ok(plantIdx >= 0, 'plant goal must exist');
  room.team.currentIndex = plantIdx;
  room.team.progress = 0;
  const res = trackTeamEvent(room, 'plant', 1);
  assert.ok(res);
  assert.equal(room.team.progress, 1);
});
