/**
 * Общие цели комнаты. Открываются последовательно.
 * Кооперативные вехи: садоводы вместе сажают, ухаживают, собирают и открывают новое.
 */
export const TEAM_GOALS = [
  {
    id: 'plant30',
    text: 'Посадите 30 растений вместе',
    target: 30,
    event: 'plant',
    reward: { coins: 75, text: '+75 монет' }
  },
  {
    id: 'harvest20',
    text: 'Соберите 20 растений вместе',
    target: 20,
    event: 'harvest',
    reward: { coins: 120, text: '+120 монет' }
  },
  {
    id: 'water20',
    text: 'Полейте 20 растений вместе',
    target: 20,
    event: 'water',
    reward: { coins: 60, text: '+60 монет' }
  },
  {
    id: 'activity10',
    text: 'Поймайте 10 активностей вместе',
    target: 10,
    event: 'activity',
    reward: { coins: 60, text: '+60 монет' }
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
