/**
 * Питомец в саду — совместная механика для пары.
 *
 * Жизненный цикл:
 *  1. Яйцо (icon) — оба партнёра отвечают на ежедневные вопросы
 *  2. Через 3 дня ответов (оба каждый день) — питомец вылупляется
 *  3. Питомец ходит по саду, виден обоим
 *
 * День считается календарным (UTC дата). Если хотя бы один партнёр
 * не ответил в день — день не засчитывается.
 */

import { getRandomPet } from '../shared/pets.js';

const QUESTIONS_PER_DAY = 1;
const DAYS_TO_HATCH = 3;

export function createPetState() {
  return {
    stage: 'egg',        // 'egg' | 'hatching' | 'walking'
    petId: null,
    petEmoji: null,
    petName: null,
    petColor: null,
    daysAnswered: 0,
    lastQuestionDay: null, // YYYY-MM-DD UTC string
    answers: new Map(),    // playerId -> { day, answerIndex, answeredAt }
    hatchTime: null
  };
}

function todayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export function getPetQuestion(room) {
  const now = Date.now();
  const today = todayKey(now);

  // Если день сменился, сбрасываем ответы и даём новый вопрос
  if (room.pet.lastQuestionDay !== today) {
    room.pet.lastQuestionDay = today;
    room.pet.answers.clear();
  }

  const dayIndex = Math.floor(now / (10 * 60 * 1000)) % 10; // 10 вопросов, cyclic
  const question = {
    day: today,
    q: getQuestion(dayIndex),
    options: getOptions(dayIndex)
  };
  return question;
}

function getQuestion(idx) {
  const qs = [
    'Что вам больше нравится в нашем саду?',
    'Какое время дня лучше всего для посиделок?',
    'Какой цвет у вашего любимого цветка?',
    'Что бы вы хотели посадить следующим?',
    'Какую погоду вы любите больше всего?',
    'Какое время года вам ближе?',
    'Что вы делаете первым, когда заходите в сад?',
    'Какой звук сада вам нравится?',
    'Какое растение в саде самое красивое?',
    'Что бы вы пожелали своему питомцу?'
  ];
  return qs[idx % qs.length];
}

function getOptions(idx) {
  const opts = [
    ['Цветы', 'Трава', 'Небо', 'Тишина'],
    ['Утро', 'День', 'Вечер', 'Ночь'],
    ['Красный', 'Синий', 'Жёлтый', 'Фиолетовый'],
    ['Дерево', 'Куст', 'Цветок', 'Траву'],
    ['Солнце', 'Дождь', 'Облака', 'Туман'],
    ['Весна', 'Лето', 'Осень', 'Зима'],
    ['Поливаете', 'Смотрите на растения', 'Сидите', 'Идёте к питомцу'],
    ['Пение птиц', 'Шорох листьев', 'Шум дождя', 'Тишина'],
    ['Белое', 'Красное', 'Синее', 'Золотое'],
    ['Счастья', 'Долгой жизни', 'Вкусного корма', 'Много игр']
  ];
  return opts[idx % opts.length];
}

export function answerPetQuestion(room, playerId, answerText) {
  if (room.pet.stage !== 'egg') return { ok: false, reason: 'Питомец уже вылупился' };

  const today = todayKey();
  if (room.pet.lastQuestionDay !== today) {
    // Новый день — сбрасываем
    room.pet.lastQuestionDay = today;
    room.pet.answers.clear();
    room.pet.answers.set(playerId, { day: today, answerText, answeredAt: Date.now() });
    return { ok: true, dayCount: room.pet.daysAnswered + 1, newDay: true };
  }

  const prev = room.pet.answers.get(playerId);
  if (prev && prev.day === today) {
    return { ok: false, reason: 'Вы уже ответили сегодня' };
  }

  room.pet.answers.set(playerId, { day: today, answerText, answeredAt: Date.now() });

  // Проверяем, ответили оба
  const playerCount = room.players.size;
  const answeredToday = room.pet.answers.size;
  if (answeredToday >= playerCount && playerCount >= 2) {
    // Оба ответили — засчитываем день
    room.pet.daysAnswered += 1;
    // НЕ очищаем answers — они нужны, чтобы при перезаходе игрока
    // его ответ оставался виден. Очистка происходит автоматически в getPetQuestion()
    // при смене дня.

    if (room.pet.daysAnswered >= DAYS_TO_HATCH) {
      hatchPet(room);
      return { ok: true, hatched: true, pet: room.pet };
    }

    return { ok: true, dayCount: room.pet.daysAnswered, hatched: false };
  }

  return { ok: true, dayCount: room.pet.daysAnswered, hatched: false };
}

function hatchPet(room) {
  const pet = getRandomPet();
  room.pet.stage = 'walking';
  room.pet.petId = pet.id;
  room.pet.petEmoji = pet.emoji;
  room.pet.petName = pet.name;
  room.pet.petColor = pet.color;
  room.pet.hatchTime = Date.now();
  room.pet.petX = 4;
  room.pet.petY = 4;
  room.pet.petDir = 1;
  room.pet.lastMove = Date.now();
}

export function getPetState(room) {
  return {
    stage: room.pet.stage,
    petId: room.pet.petId,
    petEmoji: room.pet.petEmoji,
    petName: room.pet.petName,
    petColor: room.pet.petColor,
    daysAnswered: room.pet.daysAnswered,
    hatchTime: room.pet.hatchTime,
    petX: room.pet.petX,
    petY: room.pet.petY,
    answers: room.pet.answers ? Array.from(room.pet.answers.entries()) : []
  };
}

/**
 * Двигает питомца случайно по саду (раз в несколько секунд).
 * Вызывается из room tick.
 */
export function updatePetMovement(room, now) {
  if (room.pet.stage !== 'walking') return;

  const moveInterval = 5000; // каждые 5 секунд
  if (now - (room.pet.lastMove || 0) < moveInterval) return;

  room.pet.lastMove = now;

  // Случайное смещение на 1 клетку
  const dx = Math.random() < 0.5 ? -1 : 1;
  const dy = Math.random() < 0.5 ? -1 : 1;
  const newX = Math.max(0, Math.min(7, (room.pet.petX || 4) + dx));
  const newY = Math.max(0, Math.min(7, (room.pet.petY || 4) + dy));

  room.pet.petX = newX;
  room.pet.petY = newY;
  room.pet.petDir = dx > 0 ? 1 : -1;
}
