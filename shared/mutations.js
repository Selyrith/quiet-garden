import { makeRng } from './plants.js';

export const MUTATION_COUNT = 100;

// Базовые префиксы для названий
const PREFIXES = ['Альфа', 'Бета', 'Гамма', 'Дельта', 'Эпсилон', 'Дзета', 'Эта', 'Тета', 'Йота', 'Каппа'];

export function getMutation(plantSeed, index) {
  if (index < 0 || index >= MUTATION_COUNT) return null;
  const rng = makeRng(plantSeed * 1000 + index);
  
  // Определяем тип мутации (0-19 цвет, 20-39 размер, 40-59 форма, 60-99 спец)
  const typeRoll = rng();
  let type, color, mult, name;

  const p1 = PREFIXES[Math.floor(rng() * PREFIXES.length)];
  const p2 = index + 1;

  if (typeRoll < 0.2) {
    type = 'color';
    color = Math.floor(rng() * 360);
    mult = 1.2 + rng() * 0.3;
    name = `${p1}-${p2} (Оттенок)`;
  } else if (typeRoll < 0.4) {
    type = 'size';
    color = Math.floor(rng() * 360);
    mult = 1.3 + rng() * 0.4;
    name = `${p1}-${p2} (Гигант)`;
  } else if (typeRoll < 0.6) {
    type = 'glow';
    color = 280 + Math.floor(rng() * 80); // Фиолетовые оттенки
    mult = 1.5 + rng() * 0.5;
    name = `${p1}-${p2} (Свет)`;
  } else if (typeRoll < 0.9) {
    type = 'gold';
    color = 45 + Math.floor(rng() * 15); // Золотые оттенки
    mult = 2.0 + rng() * 1.0;
    name = `${p1}-${p2} (Золото)`;
  } else {
    type = 'rainbow';
    color = 0; // Спец. флаг
    mult = 5.0 + rng() * 5.0;
    name = `${p1}-${p2} (Радуга)`;
  }

  return {
    id: index,
    name,
    type,
    hue: color,
    mult,
    seed: plantSeed
  };
}

export function getRandomMutation(world, luckBonus = 0) {
  // Шанс выпадения мутации (5% базово)
  const chance = 0.05 + luckBonus;
  if (Math.random() > chance) return null;

  // В зависимости от погоды, мы можем сдвигать пул индексов
  // (например, ночью чаще выпадают светящиеся, днем - золотые)
  let index = Math.floor(Math.random() * MUTATION_COUNT);
  
  // Простая эвристика для привязки к миру
  if (world.phase.id === 'night') {
    index = 40 + Math.floor(Math.random() * 20); // Светящиеся (40-59)
  } else if (world.weather.id === 'sunny') {
    index = 60 + Math.floor(Math.random() * 30); // Золотые (60-89)
  }

  return index;
}
