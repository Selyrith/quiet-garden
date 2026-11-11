export const CHAPTERS = [
  { id: 'meadow', name: 'Лесная поляна', icon: '🌿', color: 0x8bc34a, seeds: [] },
  { id: 'garden', name: 'Старый сад', icon: '🌹', color: 0xe91e63, seeds: [] },
  { id: 'moon', name: 'Лунная роща', icon: '🌙', color: 0x7986cb, seeds: [] },
  { id: 'mushroom', name: 'Грибная низина', icon: '🍄', color: 0xff7043, seeds: [] },
  { id: 'crystal', name: 'Кристальный грот', icon: '💎', color: 0x4fc3f7, seeds: [] },
  { id: 'autumn', name: 'Осенний склон', icon: '🍂', color: 0xffa726, seeds: [] },
  { id: 'river', name: 'Речной берег', icon: '🌊', color: 0x26c6da, seeds: [] },
  { id: 'desert', name: 'Тихий песок', icon: '🏜️', color: 0xffcc80, seeds: [] },
  { id: 'highland', name: 'Ветреные холмы', icon: '🌾', color: 0xaed581, seeds: [] },
  { id: 'dream', name: 'Сонный туман', icon: '☁️', color: 0xb39ddb, seeds: [] },
];

// Распределяем все 300 растений по 30 штук в каждую главу
const PLANTS_PER_CHAPTER = 30;
CHAPTERS.forEach((ch, index) => {
  const start = index * PLANTS_PER_CHAPTER;
  const end = start + PLANTS_PER_CHAPTER;
  for (let i = start; i < end; i++) {
    ch.seeds.push(i);
  }
});

export function getChapterProgress(collection) {
  return CHAPTERS.map(ch => ({
    ...ch,
    owned: ch.seeds.filter(s => collection.has(s)).length,
    total: ch.seeds.length,
    complete: ch.seeds.every(s => collection.has(s)),
  }));
}

export function getChapterBySeed(seed) {
  return CHAPTERS.find(c => c.seeds.includes(seed));
}