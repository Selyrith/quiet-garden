import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOM_EXPIRE_MS } from '../shared/balance.js';
import { createPetState } from './pet-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const SAVE_FILE = path.join(DATA_DIR, 'rooms.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveRooms(rooms) {
  try {
    let diskRooms = {};
    if (fs.existsSync(SAVE_FILE)) {
      try {
        diskRooms = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      } catch (e) {
        console.warn('[save] Битый rooms.json — начинаем с пустого');
        diskRooms = {};
      }
    }
    const now = Date.now();
    for (const code of Object.keys(diskRooms)) {
      if (now - (diskRooms[code].savedAt || 0) > ROOM_EXPIRE_MS) delete diskRooms[code];
    }
    for (const [code, room] of rooms.entries()) {
      diskRooms[code] = {
        coins: room.coins,
        collection: Array.from(room.collection || []),
        inventory: room.inventory || {},
        upgrades: room.upgrades,
        garden: Array.from(room.garden.entries()).map(([key, tile]) => {
          if (!tile) return [key, null];
          return [key, {
            seed: tile.seed,
            plantedAt: tile.plantedAt,
            wateredUntil: tile.wateredUntil,
            waterBoostDuration: tile.waterBoostDuration,
            growSeconds: tile.growSeconds,
            mutationIndex: tile.mutationIndex ?? null
          }];
        }),
        roles: Array.from(room.roles ? room.roles.entries() : []),
        team: room.team,
        tree: room.tree || { level: 0, progress: 0, nextLevelAt: 50 },
        signpostMessage: room.signpostMessage || "",
        playerGoals: room.playerGoals ? Array.from(room.playerGoals.entries()) : [],
        pet: room.pet ? {
          stage: room.pet.stage,
          petId: room.pet.petId,
          petEmoji: room.pet.petEmoji,
          petName: room.pet.petName,
          petColor: room.pet.petColor,
          daysAnswered: room.pet.daysAnswered,
          lastQuestionDay: room.pet.lastQuestionDay,
          hatchTime: room.pet.hatchTime,
          petX: room.pet.petX,
          petY: room.pet.petY,
          answers: room.pet.answers ? Array.from(room.pet.answers.entries()) : []
        } : null,
        lastWeather: room.lastWeather,
        incomeBonusPermanent: room.incomeBonusPermanent,
        maxActivitiesBonus: room.maxActivitiesBonus,
        upgradeDiscount: room.upgradeDiscount,
        gardenRowsBonus: room.gardenRowsBonus,
        lastActivityAt: room.lastActivityAt || 0,
        savedAt: now
      };
    }
    fs.writeFileSync(SAVE_FILE, JSON.stringify(diskRooms, null, 2), 'utf8');
    console.log(`[save] ${rooms.size} в памяти, ${Object.keys(diskRooms).length} на диске.`);
  } catch (err) {
    console.error('[save] Ошибка сохранения:', err);
  }
}

function hydrateRoom(code, data, createRoomFn, createEmptyGardenFn) {
  const room = createRoomFn(code);
  room.coins = data.coins || 0;
  
  // ФИКС: очищаем старые сломанные мутации (mut_XXX_undefined)
  const validCollection = new Set();
  for (const item of (data.collection || [])) {
    if (typeof item === 'string' && item.endsWith('_undefined')) continue;
    validCollection.add(item);
  }
  room.collection = validCollection;

  room.inventory = data.inventory || {};
  room.upgrades = data.upgrades || { growth: 0, luck: 0, income: 0 };
  
  room.garden = createEmptyGardenFn();
  if (data.garden) {
    for (const [key, tile] of data.garden) {
      if (tile) room.garden.set(key, tile);
    }
  }
  
  room.roles = new Map(data.roles || []);
  room.team = data.team || { currentIndex: 0, progress: 0, claimed: [] };
  room.tree = data.tree || { level: 0, progress: 0, nextLevelAt: 50 };
  room.signpostMessage = data.signpostMessage || "";
  room.playerGoals = Array.isArray(data.playerGoals) ? new Map(data.playerGoals) : new Map();
  if (data.pet) {
    room.pet = {
      stage: data.pet.stage || 'egg',
      petId: data.pet.petId || null,
      petEmoji: data.pet.petEmoji || null,
      petName: data.pet.petName || null,
      petColor: data.pet.petColor || null,
      daysAnswered: data.pet.daysAnswered || 0,
      lastQuestionDay: data.pet.lastQuestionDay || null,
      answers: new Map((data.pet.answers || []).map(([k, v]) => [k, v])),
      hatchTime: data.pet.hatchTime || null,
      petX: data.pet.petX ?? 4,
      petY: data.pet.petY ?? 4
    };
  } else {
    room.pet = createPetState();
  }
  room.lastWeather = data.lastWeather || 'sunny';
  room.incomeBonusPermanent = data.incomeBonusPermanent || 0;
  room.maxActivitiesBonus = data.maxActivitiesBonus || 0;
  room.upgradeDiscount = data.upgradeDiscount || 0;
  room.gardenRowsBonus = data.gardenRowsBonus || 0;
  room.lastActivityAt = data.lastActivityAt || 0;
  
  return room;
}

export function loadRooms(createRoomFn, createEmptyGardenFn) {
  try {
    if (!fs.existsSync(SAVE_FILE)) return new Map();
    const raw = fs.readFileSync(SAVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const result = new Map();
    const now = Date.now();

    for (const [code, data] of Object.entries(parsed)) {
      if (now - data.savedAt > ROOM_EXPIRE_MS) continue;
      try {
        result.set(code, hydrateRoom(code, data, createRoomFn, createEmptyGardenFn));
      } catch (e) {
        console.error(`[save] Пропущена биткая комната ${code}:`, e.message);
      }
    }

    console.log(`[save] Загружено ${result.size} комнат.`);
    return result;
  } catch (err) {
    console.error('[save] Ошибка загрузки:', err);
    return new Map();
  }
}

export function loadSingleRoom(code, createRoomFn, createEmptyGardenFn) {
  try {
    if (!fs.existsSync(SAVE_FILE)) return null;
    const raw = fs.readFileSync(SAVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const data = parsed[code];
    if (!data) return null;

    const now = Date.now();
    if (now - data.savedAt > ROOM_EXPIRE_MS) return null;

    console.log(`[save] Динамически загружена комната ${code}`);
    return hydrateRoom(code, data, createRoomFn, createEmptyGardenFn);
  } catch (err) {
    return null;
  }
}
