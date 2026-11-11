export const DAY_MS = 10 * 60 * 1000;
export const SEASON_MS = 30 * 60 * 1000;
export const WEATHER_MS = 4 * 60 * 1000;

export const PHASES = [
  { id: 'morning', name: 'Утро',  icon: '🌅', growthMult: 1.10, tint: 0xfff0d0, tintAlpha: 0.0 },
  { id: 'day',     name: 'День',  icon: '☀️', growthMult: 1.15, tint: 0xffffff, tintAlpha: 0.0 },
  { id: 'evening', name: 'Вечер', icon: '🌇', growthMult: 0.95, tint: 0xff9050, tintAlpha: 0.18 },
  { id: 'night',   name: 'Ночь',  icon: '🌙', growthMult: 0.65, tint: 0x1a1a4a, tintAlpha: 0.35 }
];

export const WEATHERS = [
  { id: 'sunny',  name: 'Солнечно', icon: '☀️', growthMult: 1.10 },
  { id: 'cloudy', name: 'Облачно',  icon: '☁️', growthMult: 1.00 },
  { id: 'rain',   name: 'Дождь',    icon: '🌧️', growthMult: 1.00 },
  { id: 'fog',    name: 'Туман',    icon: '🌫️', growthMult: 0.88 }
];

export const SEASONS = [
  { id: 'spring', name: 'Весна', icon: '🌸', tint: 0xffd6e8, tintAlpha: 0.10, luckBonus: 0.10 },
  { id: 'summer', name: 'Лето',  icon: '🌻', tint: 0xfff4b0, tintAlpha: 0.10, incomeBonus: 0.10 },
  { id: 'autumn', name: 'Осень', icon: '🍂', tint: 0xffc890, tintAlpha: 0.12, growthBonus: 0.10 },
  { id: 'winter', name: 'Зима',  icon: '❄️', tint: 0xc8e6ff, tintAlpha: 0.15, growthBonus: -0.10, priceBonus: 0.20 }
];

export function getWorldState(now = Date.now()) {
  const dayProgress = (now % DAY_MS) / DAY_MS;
  const phaseIdx = Math.floor(dayProgress * 4) % 4;
  const seasonIdx = Math.floor(now / SEASON_MS) % 4;
  const weatherIdx = Math.floor(now / WEATHER_MS) % 4;
  return {
    phase: PHASES[phaseIdx],
    season: SEASONS[seasonIdx],
    weather: WEATHERS[weatherIdx],
    dayProgress,
    now
  };
}

export function getGrowthMultiplier(world) {
  let mult = world.phase.growthMult * world.weather.growthMult;
  if (world.season.growthBonus) mult += world.season.growthBonus;
  return Math.max(0.3, mult);
}

export function serializeWorld(world) {
  return {
    phase: { id: world.phase.id, name: world.phase.name, icon: world.phase.icon,
             tint: world.phase.tint, tintAlpha: world.phase.tintAlpha },
    weather: { id: world.weather.id, name: world.weather.name, icon: world.weather.icon },
    season: { id: world.season.id, name: world.season.name, icon: world.season.icon,
              tint: world.season.tint, tintAlpha: world.season.tintAlpha },
    growthMult: getGrowthMultiplier(world)
  };
}
