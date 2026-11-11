/**
 * Общие цели комнаты. Открываются последовательно.
 */
export const TEAM_GOALS = [
  {
    id: 'harvest20',
    text: 'Соберите 20 растений вместе',
    target: 20,
    event: 'harvest',
    reward: { coins: 100, text: '+100 монет' }
  },
  {
    id: 'activity10',
    text: 'Поймайте 10 активностей вместе',
    target: 10,
    event: 'activity',
    reward: { coins: 50, text: '+50 монет' }
  },
  {
    id: 'species30',
    text: 'Откройте 30 видов растений',
    target: 30,
    event: 'newSpecies',
    reward: { coins: 200, text: '+200 монет' }
  },
  {
    id: 'upgrade5',
    text: 'Купите 5 улучшений вместе',
    target: 5,
    event: 'upgrade',
    reward: { coins: 0, discount: 0.20, text: '−20% цены улучшений' }
  }
];

export function createTeamState() {
  return {
    currentIndex: 0,
    progress: 0,
    claimed: [],
    dailyVisitors: [],
    teamBuff: null
  };
}

export function getCurrentGoal(team) {
  if (!team || team.currentIndex >= TEAM_GOALS.length) return null;
  return TEAM_GOALS[team.currentIndex];
}

export function serializeTeam(team) {
  const current = getCurrentGoal(team);
  const isBuffActive = team.teamBuff && team.teamBuff.expiresAt > Date.now();
  return {
    currentIndex: team.currentIndex,
    total: TEAM_GOALS.length,
    goal: current,
    progress: team.progress,
    completed: team.currentIndex >= TEAM_GOALS.length,
    dailyVisitorsCount: team.dailyVisitors ? team.dailyVisitors.length : 0,
    teamBuff: isBuffActive ? team.teamBuff : null
  };
}
