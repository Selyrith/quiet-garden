import { createEmptyGarden, computeState } from './garden.js';
import { MAX_ACTIVITIES, SPAWN_MIN_MS, SPAWN_MAX_MS, createActivity, pickSpawn } from './activities.js';
import { createDefaultUpgrades } from '../shared/upgrades.js';
import { TOTAL_PLANTS } from '../shared/plants.js';
import { createGoalsState, serializeGoals } from './goals.js';
import { createTeamState, serializeTeam } from '../shared/team-goals.js';
import { tickWorld } from './world.js';
import { createPetState, updatePetMovement, getPetState } from './pet-system.js';
import { buildPlayerEntry, buildPlayerList } from '../shared/room-players.js';

export const rooms = new Map();
export const socketRoom = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  } while (rooms.has(code));
  return code;
}

export function createRoom(code) {
  const room = {
    players: new Map(),
    hostId: null,
    garden: createEmptyGarden(),
    coins: 0,
    collection: new Set(),
    inventory: { 0: 3, 15: 2 },
    activities: new Map(),
    upgrades: createDefaultUpgrades(),
    goals: createGoalsState(),
    roles: new Map(),
    team: createTeamState(),
    incomeBonusPermanent: 0,
    maxActivitiesBonus: 0,
    upgradeDiscount: 0,
    gardenRowsBonus: 0,
    lastWeather: null,
    tickTimer: null,
    spawnTimer: null,
    playerJobs: new Map(),
    tree: { level: 0, progress: 0, nextLevelAt: 50 },
    signpostMessage: "Добро пожаловать в наш сад!",
    lastActivityAt: Date.now(),
    pet: createPetState()
  };
  return room;
}

export function getTeamGrowthBonus(room) {
  if (room.team?.teamBuff && room.team.teamBuff.expiresAt > Date.now()) {
    return room.team.teamBuff.growth;
  }
  return 0;
}

export function serializeGarden(garden, now = Date.now(), growthBonus = 0, phaseGrowthMult = 1) {
  const out = [];
  garden.forEach((tile, key) => {
    const { stage, progress } = computeState(tile, now, growthBonus, phaseGrowthMult);
    out.push({ 
      key, stage, progress,
      seed: tile?.seed ?? null, 
      mutationIndex: tile?.mutationIndex ?? null,
      wetUntil: tile?.wateredUntil ?? 0 
    });
  });
  return out;
}

export function serializeActivities(room) {
  return Array.from(room.activities.values());
}

export function broadcastPlayerList(io, code, room) {
  io.to(code).emit('player-list', {
    players: serializePlayers(room),
    hostId: room.hostId || null,
  });
}

/**
 * Публичный список игроков комнаты: ник, позиция, флаг хоста.
 * Хост всегда идёт первым.
 */
export function serializePlayers(room) {
  const entries = Array.from(room.players.entries()).map(([pid, p]) => buildPlayerEntry({
    playerId: pid,
    nickname: p?.nickname,
    tileKey: `${p?.x ?? 1},${p?.y ?? 1}`,
    gender: p?.gender || 'male',
    isHost: room.hostId === pid,
  }));
  return buildPlayerList(entries);
}

export function broadcastCoins(io, code, room) {
  io.to(code).emit('coins-updated', { coins: room.coins, tree: room.tree });
}

export function broadcastInventory(io, code, room) {
  io.to(code).emit('inventory-updated', { inventory: room.inventory });
}

export function broadcastCollection(io, code, room) {
  io.to(code).emit('collection-updated', { seeds: Array.from(room.collection), total: TOTAL_PLANTS });
}

export function broadcastProgress(io, code, room) {
  const now = Date.now();
  const bonus = getTeamGrowthBonus(room);
  const phaseMult = (room.world && room.world.phase && room.world.phase.growthMult) || 1;
  const progress = [];
  room.garden.forEach((tile, key) => {
    if (!tile) return;
    const { stage, progress: p } = computeState(tile, now, bonus, phaseMult);
    if (stage < 3) progress.push({ key, progress: p });
  });
  io.to(code).emit('progress-updates', { progress });
}

export function broadcastUpgrades(io, code, room) {
  io.to(code).emit('upgrades-updated', { upgrades: { ...room.upgrades }, coins: room.coins });
}

export function broadcastGoals(io, code, room) {
  io.to(code).emit('goals-updated', { goals: serializeGoals(room) });
}

export function broadcastTeam(io, code, room) {
  io.to(code).emit('team-updated', { team: serializeTeam(room.team) });
}

export function broadcastRoles(io, code, room) {
  io.to(code).emit('roles-updated', { roles: Object.fromEntries(room.roles) });
}

export function broadcastPetState(io, code, room) {
  io.to(code).emit('pet-state-updated', { pet: getPetState(room) });
}

export function startRoomTick(io, code, room) {
  const lastStages = new Map();
  let petMoveCounter = 0;
  room.tickTimer = setInterval(() => {
    const r = rooms.get(code);
    if (!r) return;
    tickWorld(io, code, r);
    const now = Date.now();
    updatePetMovement(r, now);
    const bonus = getTeamGrowthBonus(r);
    const phaseMult = (r.world && r.world.phase && r.world.phase.growthMult) || 1;
    for (const [id, activity] of r.activities) {
      if (activity.expiresAt <= now) {
        r.activities.delete(id);
        io.to(code).emit('activity-removed', { activityId: id });
      }
    }
    const updates = [];
    r.garden.forEach((tile, key) => {
      if (!tile) return;
      const { stage } = computeState(tile, now, bonus, phaseMult);
      const prev = lastStages.get(key);
      if (prev !== stage) {
        lastStages.set(key, stage);
        updates.push({ key, stage, seed: tile.seed });
      }
    });
    if (updates.length > 0) io.to(code).emit('stage-updates', { updates });
    if (r.players.size > 0) broadcastProgress(io, code, r);

    // Питомец двигается — рассылаем его состояние каждые несколько тиков (каждые ~10 секунд)
    petMoveCounter++;
    if (r.pet.stage === 'walking' && petMoveCounter % 5 === 0) {
      broadcastPetState(io, code, r);
    }
  }, 2000);
}

export function scheduleSpawn(io, code, room) {
  const isOfflineReturn = room.lastActivityAt && (Date.now() - room.lastActivityAt > 5 * 60 * 1000);
  const delay = isOfflineReturn
    ? 15000
    : SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
  room.lastActivityAt = Date.now();
  room.spawnTimer = setTimeout(() => {
    const r = rooms.get(code);
    if (!r) return;
    // Слоты активностей = 1 + floor(игроков/2) — кооп-события не воруются
    const max = 1 + Math.floor(r.players.size / 2) + (r.maxActivitiesBonus || 0);
    if (r.players.size > 0 && r.activities.size < max) {
      const teamBonus = getTeamGrowthBonus(r);
      const phaseMult = (r.world && r.world.phase && r.world.phase.growthMult) || 1;
      const spawn = pickSpawn(r.garden, r.activities, teamBonus, phaseMult);
      if (spawn) {
        const activity = createActivity(spawn.type, spawn.tileX, spawn.tileY);
        if (activity) {
          r.activities.set(activity.id, activity);
          io.to(code).emit('activity-spawned', { activity });
        }
      }
    }
    r.lastActivityAt = Date.now();
    scheduleSpawn(io, code, r);
  }, delay);
}

export function stopRoomTimers(room) {
  if (room.tickTimer) { clearInterval(room.tickTimer); room.tickTimer = null; }
  if (room.spawnTimer) { clearTimeout(room.spawnTimer); room.spawnTimer = null; }
}
