import express from 'express';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  rooms, socketRoom, generateRoomCode, createRoom,
  serializeGarden, serializeActivities, serializePlayers,
  broadcastPlayerList, broadcastRoles,
  startRoomTick, scheduleSpawn, stopRoomTimers,
  getTeamGrowthBonus
} from './rooms.js';
import { createEmptyGarden, getStage } from './garden.js';
import { getPetState } from './pet-system.js';
import { TOTAL_PLANTS } from '../shared/plants.js';
import { MAX_PLAYERS, SAVE_INTERVAL_MS, ROOM_UNLOAD_MS } from '../shared/balance.js';
import { setupGoalsHandlers } from './goals-handlers.js';
import { serializeGoals, ensureDaily, getPlayerGoals } from './goals.js';
import { serializeTeam } from '../shared/team-goals.js';
import { getWorldState, serializeWorld } from '../shared/world.js';
import { handleEmote } from './emotes.js';
import { handleQuickMessage } from './quick-chat.js';
import { ROLES } from '../shared/roles.js';
import { saveRooms, loadRooms, loadSingleRoom } from './save.js';
import {
  handleTileAction, handleActivityAction, handleUpgradeBuy, handleBuyPack, handleSetMessage,
  handlePetAnswer, handleSellSeed
} from './handlers.js';
import {
  getProfile, createProfile, updateProfile, addToCollection, addCoins,
  addInventory, incrementStat, setProfileData, getAllProfiles
} from './player-profiles.js';
import { resolveNickname, isValidNickname } from '../shared/player.js';
import { startKeepAliveFromEnv } from './keep-alive.js';
import { findSpawnTile } from '../shared/room-players.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = Number(process.env.PORT) || 3002;

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const HAS_DIST = fs.existsSync(path.join(DIST_DIR, 'index.html'));

// Health-check для платформ деплоя (Render/Koyeb/Northflank пингуют /health)
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), rooms: rooms.size });
});

// В проде отдаём собранный клиент (dist/) как корень сайта.
// В dev (когда dist нет) — исходный index.html, который открывает Vite.
if (HAS_DIST) {
  app.use(express.static(DIST_DIR, { index: false }));
  app.get('/', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
} else {
  app.use(express.static(ROOT_DIR));
  app.get('/', (req, res) => res.sendFile(path.join(ROOT_DIR, 'index.html')));
}

// Дополнительные статические каталоги (аудио, иконки, манифест)
app.use('/src', express.static(path.join(ROOT_DIR, 'src')));
app.use('/public', express.static(path.join(ROOT_DIR, 'public')));
app.use('/icons', express.static(path.join(ROOT_DIR, 'public', 'icons')));
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));

// Загружаем активные комнаты при старте — НЕ запускаем тики сразу
// (они стартуют при первом join-room, см. строки 94-95)
const savedRooms = loadRooms(createRoom, createEmptyGarden);
for (const [code, room] of savedRooms.entries()) {
  rooms.set(code, room);
  // startRoomTick/scheduleSpawn НЕ вызываем здесь — только при join-room
}

setInterval(() => saveRooms(rooms), SAVE_INTERVAL_MS);
process.on('SIGINT', () => { saveRooms(rooms); process.exit(); });
process.on('SIGTERM', () => { saveRooms(rooms); process.exit(); });
// Ошибка в одном обработчике не должна ронять весь сервер —
// иначе один сбой в profile-set уронил бы игру целиком.
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
  saveRooms(rooms);
});
process.on('unhandledRejection', (err) => {
  console.error('[fatal] unhandledRejection:', err);
  saveRooms(rooms);
});

io.on('connection', (socket) => {
  const getPlayerId = () => socket.handshake.auth.playerId || socket.id;
  const pid = getPlayerId();

  // Любой обработчик сокета оборачиваем: ошибка в одном не должна
  // ронять сервер и отключать всех игроков.
  const on = (event, handler) => {
    socket.on(event, (...args) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[socket] Ошибка в обработчике "${event}":`, err);
      }
    });
  };

  // Создаём/загружаем профиль игрока при подключении.
  // Введённый ник важнее сохранённого — игрок может сменить имя при входе.
  const handshakeNick = socket.handshake.auth.nickname || '';
  const existingProfile = getProfile(pid);
  const nickname = resolveNickname(existingProfile?.nickname, handshakeNick, pid);
  const profile = existingProfile || createProfile(pid, nickname);

  setupGoalsHandlers(io, socket, { rooms, socketRoom });

  on('join-room', (payload = {}) => {
    if (socketRoom.has(pid)) leaveCurrentRoom(socket);

    const requested = (payload.roomCode || '').toUpperCase().trim();
    let code, room;

    if (!requested) {
      // Создание новой комнаты
      code = generateRoomCode();
      room = createRoom(code);
      rooms.set(code, room);
      startRoomTick(io, code, room);
      scheduleSpawn(io, code, room);
    } else {
      code = requested;
      room = rooms.get(code);
      
      // Если комнаты нет в памяти, пробуем загрузить из файла (динамическая загрузка)
      if (!room) {
        room = loadSingleRoom(code, createRoom, createEmptyGarden);
        if (room) {
          rooms.set(code, room);
          startRoomTick(io, code, room);
          scheduleSpawn(io, code, room);
        }
      }

      if (!room) {
        socket.emit('room-error', { message: 'Сад не найден или истёк срок хранения (7 дней)' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        socket.emit('room-error', { message: 'Сад заполнен (макс 4)' });
        return;
      }
      if (!room.tickTimer) startRoomTick(io, code, room);
      if (!room.spawnTimer) scheduleSpawn(io, code, room);
    }

    socket.join(code);
    socketRoom.set(pid, code);

    // Хост — первый игрок в комнате (создатель сада).
    if (!room.hostId) room.hostId = pid;

    // Ник в комнате: введённый игроком (или из профиля).
    const roomNick = resolveNickname(profile.nickname, handshakeNick, pid);

    // Каждого ставим на свою свободную клетку, иначе аватары
    // накладываются друг на друга и присоединившегося не видно.
    const occupied = Array.from(room.players.values()).map((p) => `${p.x},${p.y}`);
    const [spawnX, spawnY] = findSpawnTile(occupied).split(',').map(Number);
    room.players.set(pid, {
      x: spawnX,
      y: spawnY,
      gender: 'male',
      nickname: roomNick,
    });

    const world = getWorldState();
    socket.emit('room-code', { roomCode: code });
    ensureDaily(room, pid);
    
    // P2: "Пока вас не было" — вычисляем дельту с последнего визита
    const goals = getPlayerGoals(room, pid);
    const now = Date.now();
    const lastSeen = goals.lastSeenAt || 0;
    const awayMs = lastSeen > 0 ? (now - lastSeen) : 0;
    let readyCount = 0;
    let growingCount = 0;
    const teamBonus = getTeamGrowthBonus(room);
    const phaseMult = world.phase.growthMult;
    room.garden.forEach((tile) => {
      if (!tile) return;
      const stage = getStage(tile, now, teamBonus, phaseMult);
      if (stage === 3) readyCount++;
      else if (stage >= 0) growingCount++;
    });
    goals.lastSeenAt = now;
    const sinceLastSeen = awayMs > 5 * 60 * 1000
      ? { ms: awayMs, readyCount, growingCount }
      : null;

    socket.emit('initial-state', {
      garden: serializeGarden(room.garden, Date.now(), getTeamGrowthBonus(room), (getWorldState().phase && getWorldState().phase.growthMult) || 1),
      coins: room.coins,
      collection: Array.from(room.collection),
      inventory: room.inventory || {},
      activities: serializeActivities(room),
      upgrades: { ...room.upgrades },
      goals: serializeGoals(room, pid),
      roles: Object.fromEntries(room.roles),
      players: Array.from(room.players.keys()),
      playerList: serializePlayers(room),
      hostId: room.hostId || null,
      playerPositions: Array.from(room.players.entries()).map(([id, p]) => ({ id, x: p.x, y: p.y, gender: p.gender || 'male' })),
      activeJobs: Array.from(room.playerJobs.entries()).map(([id, j]) => ({
        playerId: id, action: j.action, endsAt: j.endsAt,
        remaining: Math.max(0, j.endsAt - Date.now()), tileKey: j.tileKey,
      })),
      team: serializeTeam(room.team),
      world: serializeWorld(world),
      totalPlants: TOTAL_PLANTS,
      tree: room.tree || { level: 0, progress: 0, nextLevelAt: 50 },
      signpostMessage: room.signpostMessage || "",
      pet: room.pet ? getPetState(room) : null,
      sinceLastSeen,
      // Профиль игрока
      profile: {
        nickname: profile.nickname,
        avatarEmoji: profile.avatarEmoji,
        collection: profile.collection || [],
        inventory: profile.inventory || {},
        coins: profile.coins || 0,
        stats: profile.stats || {}
      }
    });
    broadcastPlayerList(io, code, room);
  });

  on('gender-set', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (!room.players.has(pid)) return;
    const { gender } = data || {};
    if (gender !== 'male' && gender !== 'female') return;
    const player = room.players.get(pid);
    if (player) player.gender = gender;
    io.to(code).emit('gender-updated', { playerId: pid, gender });
  });

  on('role-set', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (!room.players.has(pid)) return;
    const { roleId } = data || {};
    if (typeof roleId !== 'string') return;
    if (!ROLES.find((r) => r.id === roleId)) return;
    room.roles.set(pid, roleId);
    broadcastRoles(io, code, room);
  });

  on('emote', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleEmote(io, socket, room, code, data);
  });

  on('quick-message', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleQuickMessage(io, socket, room, code, data);
  });

  on('tile-action', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleTileAction(io, socket, room, code, data);
  });

  on('activity-action', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleActivityAction(io, socket, room, code, data);
  });

  on('upgrade-buy', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleUpgradeBuy(io, socket, room, code, data);
  });

  on('buy-pack', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleBuyPack(io, socket, room, code, data);
  });

  on('sell-seed', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleSellSeed(io, socket, room, code, data);
  });

  on('set-message', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handleSetMessage(io, socket, room, code, data);
  });

  on('pet-answer', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    handlePetAnswer(io, socket, room, code, data);
  });

  on('profile-set', (data) => {
    if (!data || typeof data !== 'object') return;
    const updates = {};
    if (typeof data.nickname === 'string' && isValidNickname(data.nickname)) {
      // Проверка уникальности ника
      const existing = getAllProfiles().find(([id, p]) => id !== pid && p.nickname === data.nickname.trim());
      if (existing) {
        socket.emit('profile-error', { message: 'Этот ник уже занят' });
        return;
      }
      updates.nickname = data.nickname.trim();
    }
    if (typeof data.avatarEmoji === 'string' && data.avatarEmoji.length <= 2) {
      updates.avatarEmoji = data.avatarEmoji;
    }
    if (Object.keys(updates).length > 0) {
      const profile = updateProfile(pid, updates);
      if (profile) {
        // Ник меняется и в комнате — иначе в списке игроков остаётся старый.
        const code = socketRoom.get(pid);
        if (code) {
          const room = rooms.get(code);
          const player = room?.players.get(pid);
          if (room && player) {
            player.nickname = profile.nickname;
            broadcastPlayerList(io, code, room);
          }
        }
        socket.emit('profile-updated', { nickname: profile.nickname, avatarEmoji: profile.avatarEmoji });
      }
    }
  });

  on('profile-request', () => {
    const profile = getProfile(pid);
    if (profile) {
      socket.emit('profile-data', {
        nickname: profile.nickname,
        avatarEmoji: profile.avatarEmoji,
        collection: profile.collection || [],
        inventory: profile.inventory || {},
        coins: profile.coins || 0,
        stats: profile.stats || {},
        createdAt: profile.createdAt,
        lastSeenAt: profile.lastSeenAt
      });
    }
  });

  on('leave-room', () => {
    const code = leaveCurrentRoom(socket);
    if (code) socket.emit('left-room', { code });
  });

  on('disconnect', () => leaveCurrentRoom(socket));
});

function leaveCurrentRoom(socket) {
  const pid = socket.handshake.auth.playerId || socket.id;
  const code = socketRoom.get(pid);
  if (!code) return null;
  const room = rooms.get(code);
  socketRoom.delete(pid);
  socket.leave(code);
  if (!room) return code;
  
  room.players.delete(pid);
  if (room.roles) room.roles.delete(pid);
  const job = room.playerJobs?.get(pid);
  if (job && job.timeoutId) clearTimeout(job.timeoutId);
  room.playerJobs?.delete(pid);
  broadcastPlayerList(io, code, room);
  broadcastRoles(io, code, room);
  
  if (room.players.size === 0) {
    // Останавливаем таймеры для экономии ресурсов Termux.
    stopRoomTimers(room);
    
    setTimeout(() => {
      const r = rooms.get(code);
      if (r && r.players.size === 0) {
        saveRooms(rooms); // принудительно сохраняем перед выгрузкой
        rooms.delete(code);
        console.log(`[room] Комната ${code} выгружена из памяти (сохранена на диск).`);
      }
    }, ROOM_UNLOAD_MS); 
  }
  return code;
}

server.listen(PORT, () => {
  console.log(`Quiet Garden server running on http://localhost:${PORT}`);

  // Keep-alive: пингуем собственный публичный адрес, чтобы Render
  // не усыплял free-сервис. Работает, только если адрес публичный.
  const keepAlive = startKeepAliveFromEnv();
  if (keepAlive) {
    console.log('[keep-alive] Включён — сервис не уснёт после 15 минут простоя.');
  }
});
